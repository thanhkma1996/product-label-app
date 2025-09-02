(function () {
  "use strict";

  // Configuration - Multiple endpoints for fallback
  const API_ENDPOINTS = [
    "/apps/doproductlabel/labels", // App Proxy (works when no password protection)
    "https://belkin-cope-susan-strap.trycloudflare.com/apps/doproductlabel/labels", // Direct API (bypasses password protection)
  ];

  const LABEL_STYLES = {
    position: "absolute",
    zIndex: 1000,
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
    minWidth: "60px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
    pointerEvents: "none",
  };

  function normalizeProductId(id) {
    // Handle null/undefined
    if (id === null || id === undefined) {
      return null;
    }

    // Convert to string and trim whitespace
    let normalized = id.toString().trim();

    // Handle empty string
    if (normalized === "") {
      return null;
    }

    // Handle special cases
    if (
      normalized === "null" ||
      normalized === "undefined" ||
      normalized === "NaN"
    ) {
      return null;
    }

    if (normalized.startsWith("gid://shopify/Product/")) {
      const productId = normalized.split("/").pop();
      return productId;
    }

    // Handle other GID formats if needed
    if (normalized.includes("://") && normalized.includes("/")) {
      const parts = normalized.split("/");
      const lastPart = parts[parts.length - 1];
      if (lastPart && !isNaN(lastPart)) {
        return lastPart;
      }
    }

    return normalized;
  }

  function getCurrentProductId() {
    // Try to get product ID from various sources
    let productId = null;
    let productHandle = null;

    // Get numeric product ID from product form (most reliable)
    const formInput = document.querySelector('input[name="product-id"]');
    if (formInput && formInput.value) {
      productId = formInput.value;
    }

    if (productId) {
      return productId;
    } else if (productHandle) {
      return productHandle;
    }

    console.warn("DO Label: No product ID or handle found");
    return null;
  }

  function getCurrentProduct() {
    // Try to get product information from various sources
    const product = {};

    // Get product ID
    product.id = getCurrentProductId();

    // Get compare at price (original price)
    const compareAtPriceElement =
      document.querySelector("[data-compare-price]") ||
      document.querySelector(".price__compare") ||
      document.querySelector(".product__price--compare") ||
      document.querySelector(".product-single__price--compare") ||
      document.querySelector("[data-product-compare-price]");

    if (compareAtPriceElement) {
      const comparePriceText =
        compareAtPriceElement.textContent || compareAtPriceElement.innerText;
      if (comparePriceText) {
        // Extract price from text (remove currency symbols and extra text)
        const priceMatch = comparePriceText.match(/[\d,]+\.?\d*/);
        if (priceMatch) {
          product.compareAtPrice = priceMatch[0].replace(/,/g, "");
        }
      }
    }

    return product;
  }

  function createLabelElement(label) {
    const labelEl = document.createElement("div");
    labelEl.className = "do-product-label";
    labelEl.textContent = label.text;

    // Apply base styles
    Object.assign(labelEl.style, LABEL_STYLES);

    // Apply background color with validation
    if (label.background) {
      // Check if it's a valid color
      const isValidColor = /^#([A-Fa-f0-9]{3,6})$|^rgba?\(|^hsla?\(/.test(
        label.background,
      );

      if (isValidColor) {
        labelEl.style.backgroundColor = label.background;
      } else {
        const tempDiv = document.createElement("div");
        tempDiv.style.color = label.background;
        document.body.appendChild(tempDiv);
        const computedColor = getComputedStyle(tempDiv).color;
        document.body.removeChild(tempDiv);

        if (computedColor !== "rgba(0, 0, 0, 0)") {
          labelEl.style.backgroundColor = computedColor;
        } else {
          labelEl.style.backgroundColor = "#ff0000";
        }
      }
    } else {
      labelEl.style.backgroundColor = "#ff0000";
    }

    // Position the label
    switch (label.position || "top-left") {
      case "top-left":
        labelEl.style.top = "10px";
        labelEl.style.left = "10px";
        break;
      case "top-center":
        labelEl.style.top = "10px";
        labelEl.style.left = "50%";
        labelEl.style.transform = "translateX(-50%)";
        break;
      case "top-right":
        labelEl.style.top = "10px";
        labelEl.style.right = "10px";
        break;
      case "bottom-left":
        labelEl.style.bottom = "10px";
        labelEl.style.left = "10px";
        break;
      case "bottom-center":
        labelEl.style.bottom = "10px";
        labelEl.style.left = "50%";
        labelEl.style.transform = "translateX(-50%)";
        break;
      case "bottom-right":
        labelEl.style.bottom = "10px";
        labelEl.style.right = "10px";
        break;
      default:
        // Fallback to top-left if position is not recognized
        labelEl.style.top = "10px";
        labelEl.style.left = "10px";
        break;
    }

    return labelEl;
  }

  function normalizeProductIdsToArray(productIds) {
    // Case 1: Already an array
    if (Array.isArray(productIds)) {
      const filtered = productIds.filter((id) => id != null); // Filter out null/undefined values
      return filtered;
    }

    // Case 2: JSON string
    if (typeof productIds === "string") {
      // Handle empty or invalid JSON strings
      if (productIds.trim() === "" || productIds === "[]") {
        return null;
      }

      try {
        const parsed = JSON.parse(productIds);

        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((id) => id != null);
          return filtered;
        } else if (parsed != null) {
          return [parsed];
        }
        return null;
      } catch {
        // Treat as single product ID string if JSON parsing fails
        const result = productIds.trim() ? [productIds.trim()] : null;
        return result;
      }
    }

    // Case 3: Number or other primitive
    if (productIds != null && productIds !== "") {
      return [productIds];
    }

    return null;
  }

  function checkSpecificProductCondition(label, normalizedProductId) {
    // Validate productIds exists and is not empty
    if (
      !label.productIds ||
      label.productIds === "" ||
      label.productIds === "[]" ||
      label.productIds === "null" ||
      label.productIds === "undefined"
    ) {
      console.warn(
        `DO Label: Label "${label.text}" - specific condition but no productIds specified`,
      );
      return false;
    }

    // Convert productIds to array for consistent processing
    const productIdsArray = normalizeProductIdsToArray(label.productIds);

    if (!productIdsArray || productIdsArray.length === 0) {
      console.warn(
        `DO Label: Label "${label.text}" - productIds array is empty after normalization`,
      );
      return false;
    }

    // Check if current product ID is in the list
    let matchFound = false;

    for (let i = 0; i < productIdsArray.length; i++) {
      const id = productIdsArray[i];
      const normalizedId = normalizeProductId(id);

      // Try exact match first
      if (normalizedId === normalizedProductId) {
        matchFound = true;
        break;
      }

      // Try string comparison if types don't match
      if (normalizedId.toString() === normalizedProductId.toString()) {
        matchFound = true;
        break;
      }

      // Try numeric comparison if both are numbers
      if (!isNaN(normalizedId) && !isNaN(normalizedProductId)) {
        if (parseInt(normalizedId) === parseInt(normalizedProductId)) {
          matchFound = true;
          break;
        }
      }

      // Try Shopify GID comparison
      if (
        normalizedId.startsWith("gid://shopify/Product/") ||
        normalizedProductId.startsWith("gid://shopify/Product/")
      ) {
        const id1 = normalizeProductId(normalizedId);
        const id2 = normalizeProductId(normalizedProductId);
        if (id1 === id2) {
          matchFound = true;
          break;
        }
      }
    }

    return matchFound;
  }

  function shouldShowLabel(label, productId) {
    // Validate input parameters
    if (!label || typeof label !== "object") {
      console.warn("DO Label: Invalid label object provided");
      return false;
    }

    // Early return if label is inactive
    if (label.active === false) {
      return false;
    }

    // Normalize product ID for consistent comparison
    const normalizedProductId = normalizeProductId(productId);
    if (!normalizedProductId) {
      console.warn(
        `DO Label: Product ID is null or undefined for label "${label.text}"`,
      );
      return false;
    }

    // CONDITION 1: Show on all products (default behavior)
    if (
      !label.condition ||
      label.condition === "all" ||
      label.condition === ""
    ) {
      return true;
    }

    // CONDITION 2: Show only on specific products
    if (label.condition === "specific") {
      const result = checkSpecificProductCondition(label, normalizedProductId);
      return result;
    }

    // CONDITION 3: Show based on rule-based conditions
    if (label.condition === "rule_based" && label.ruleType) {
      // Special Price Rule
      if (label.ruleType === "special_price" && label.ruleConfig) {
        const product = getCurrentProduct();
        if (!product || !product.compareAtPrice) {
          return false; // No compare price, don't show label
        }

        const comparePrice = parseFloat(product.compareAtPrice);
        const fromPrice = parseFloat(label.ruleConfig.from) || 0;
        const toPrice = parseFloat(label.ruleConfig.to) || 999999;

        // Check if product price is within the specified range
        if (comparePrice < fromPrice || comparePrice > toPrice) {
          return false; // Price outside range, don't show label
        }

        return true; // Price within range, show label
      }

      // New Arrival Rule - Note: This won't work perfectly on frontend
      // because we can't get product creation date from frontend
      if (label.ruleType === "new_arrival" && label.ruleConfig) {
        console.warn(
          "DO Label: New arrival rule is not fully supported on frontend due to missing product creation date",
        );
        // For now, we'll show the label but this is not ideal
        // In the future, we could implement a product sync mechanism
        return true;
      }
    }

    // CONDITION 4: Show only on specific products with rule-based conditions
    if (
      label.condition === "specific" &&
      label.ruleType &&
      label.ruleType !== "specific"
    ) {
      // Special Price Rule for specific products
      if (label.ruleType === "special_price" && label.ruleConfig) {
        const product = getCurrentProduct();
        if (!product || !product.compareAtPrice) {
          return false; // No compare price, don't show label
        }

        const comparePrice = parseFloat(product.compareAtPrice);
        const fromPrice = parseFloat(label.ruleConfig.from) || 0;
        const toPrice = parseFloat(label.ruleConfig.to) || 999999;

        // Check if product price is within the specified range
        if (comparePrice < fromPrice || comparePrice > toPrice) {
          return false; // Price outside range, don't show label
        }

        return true; // Price within range, show label
      }

      // New Arrival Rule for specific products - Same limitation as above
      if (label.ruleType === "new_arrival" && label.ruleConfig) {
        console.warn(
          "DO Label: New arrival rule is not fully supported on frontend due to missing product creation date",
        );
        return true;
      }
    }

    return false; // Default: don't show label if no conditions match
  }

  function injectLabels(labels, productId) {
    // Find product image container with more comprehensive selectors
    const productImageContainer =
      // Dawn theme
      document.querySelector(".product__media-list .product__media-item") ||
      document.querySelector(".product__media-list") ||
      document.querySelector(".product__media-container") ||
      document.querySelector(".product__media-item") ||
      // Debut theme
      document.querySelector(".product-single__media") ||
      document.querySelector(".product-single__photo") ||
      // Other common themes
      document.querySelector(".product__image-container") ||
      document.querySelector("[data-product-image]") ||
      document.querySelector(".product__photo") ||
      document.querySelector(".product-image") ||
      // Fallback to main product container
      document.querySelector(".product__media") ||
      document.querySelector(".product-single") ||
      document.querySelector("[data-product-container]");

    if (!productImageContainer) {
      return;
    }

    // Set container to relative positioning if needed
    const containerPosition = getComputedStyle(productImageContainer).position;

    if (containerPosition === "static") {
      productImageContainer.style.position = "relative";
    }

    productImageContainer
      .querySelectorAll(".do-product-label")
      .forEach((el) => el.remove());

    labels.forEach((label) => {
      if (shouldShowLabel(label, productId)) {
        const labelEl = createLabelElement(label);
        productImageContainer.appendChild(labelEl);
      }
    });
  }

  async function fetchLabels() {
    // Try each endpoint until one works
    for (const endpoint of API_ENDPOINTS) {
      try {
        const response = await fetch(endpoint);
        if (response.ok) {
          const labels = await response.json();
          return labels;
        }
      } catch {
        // Silent fail
      }
    }

    return [];
  }

  // Main execution for product pages
  function initProductLabels() {
    // Check if we're on a product page
    const onProductPage =
      /\/products\//.test(window.location.pathname) || !!getCurrentProductId();

    if (!onProductPage) {
      return; // Not a product page, exit early
    }

    // Fetch and inject labels
    (async () => {
      const labels = await fetchLabels();
      if (!labels || labels.length === 0) {
        return;
      }

      const productId = getCurrentProductId();
      if (productId) {
        injectLabels(labels, productId);
      }
    })();
  }

  // Run when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initProductLabels);
  } else {
    initProductLabels();
  }

  // Also run on page changes (for SPA themes)
  if (typeof window !== "undefined" && window.Shopify && window.Shopify.on) {
    window.Shopify.on("section:load", initProductLabels);
  }
})();
