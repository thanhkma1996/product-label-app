(function () {
  "use strict";

  // Configuration - Multiple endpoints for fallback
  const API_ENDPOINTS = [
    "/apps/doproductlabel/labels", // App Proxy (works when no password protection)
    "https://page-fast-smile-printed.trycloudflare.com/apps/doproductlabel/labels", // Direct API (bypasses password protection)
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

    console.log("DO Label Product: getCurrentProduct called");

    // Get product ID
    product.id = getCurrentProductId();
    console.log(
      "DO Label Product: getCurrentProduct - product ID:",
      product.id,
    );

    // Get compare at price (original price)
    const compareAtPriceElement =
      document.querySelector("[data-compare-price]") ||
      document.querySelector(".price__compare") ||
      document.querySelector(".product__price--compare") ||
      document.querySelector(".product-single__price--compare") ||
      document.querySelector("[data-product-compare-price]");

    console.log(
      "DO Label Product: getCurrentProduct - compareAtPriceElement found:",
      compareAtPriceElement,
    );

    if (compareAtPriceElement) {
      const comparePriceText =
        compareAtPriceElement.textContent || compareAtPriceElement.innerText;
      console.log(
        "DO Label Product: getCurrentProduct - comparePriceText:",
        comparePriceText,
      );

      if (comparePriceText) {
        // Extract price from text (remove currency symbols and extra text)
        const priceMatch = comparePriceText.match(/[\d,]+\.?\d*/);
        console.log(
          "DO Label Product: getCurrentProduct - priceMatch:",
          priceMatch,
        );

        if (priceMatch) {
          product.compareAtPrice = priceMatch[0].replace(/,/g, "");
          console.log(
            "DO Label Product: getCurrentProduct - extracted price:",
            product.compareAtPrice,
          );
        }
      }
    } else {
      console.log(
        "DO Label Product: getCurrentProduct - no compare price element found",
      );
      console.log(
        "DO Label Product: getCurrentProduct - available price elements:",
        {
          dataComparePrice: document.querySelector("[data-compare-price]"),
          priceCompare: document.querySelector(".price__compare"),
          productPriceCompare: document.querySelector(
            ".product__price--compare",
          ),
          productSinglePriceCompare: document.querySelector(
            ".product-single__price--compare",
          ),
          dataProductComparePrice: document.querySelector(
            "[data-product-compare-price]",
          ),
        },
      );
    }

    console.log(
      "DO Label Product: getCurrentProduct - returning product:",
      product,
    );
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
    console.log(
      `DO Label Product: shouldShowLabel called for label "${label.text}" and product ${productId}`,
    );

    // Validate input parameters
    if (!label || typeof label !== "object") {
      console.warn("DO Label Product: Invalid label object provided");
      return false;
    }

    // Early return if label is inactive
    if (label.active === false) {
      console.log(
        `DO Label Product: Label "${label.text}" is inactive, not showing`,
      );
      return false;
    }

    // Normalize product ID for consistent comparison
    const normalizedProductId = normalizeProductId(productId);
    if (!normalizedProductId) {
      console.warn(
        `DO Label Product: Product ID is null or undefined for label "${label.text}"`,
      );
      return false;
    }

    console.log(
      `DO Label Product: Label "${label.text}" - condition: ${label.condition}, ruleType: ${label.ruleType}`,
    );

    // Debug: Log full label object for rule_based labels
    if (label.condition === "rule_based") {
      console.log(
        `DO Label Product: Full label object for rule_based label "${label.text}":`,
        {
          id: label.id,
          text: label.text,
          condition: label.condition,
          ruleType: label.ruleType,
          ruleConfig: label.ruleConfig,
          active: label.active,
        },
      );
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
      console.log(
        `DO Label Product: Label "${label.text}" - checking rule-based condition`,
      );

      // Special Price Rule
      if (label.ruleType === "special_price" && label.ruleConfig) {
        console.log(
          `DO Label Product: Label "${label.text}" - checking special price rule`,
        );
        console.log(
          `DO Label Product: Label "${label.text}" - ruleConfig:`,
          label.ruleConfig,
        );

        const product = getCurrentProduct();
        console.log(
          `DO Label Product: Label "${label.text}" - product data:`,
          product,
        );

        if (!product || !product.compareAtPrice) {
          console.log(
            `DO Label Product: Label "${label.text}" - no compare price, not showing`,
          );
          return false; // No compare price, don't show label
        }

        const comparePrice = parseFloat(product.compareAtPrice);
        const fromPrice = parseFloat(label.ruleConfig.from) || 0;
        const toPrice = parseFloat(label.ruleConfig.to) || 999999;

        console.log(
          `DO Label Product: Label "${label.text}" - price check: ${comparePrice} between ${fromPrice} and ${toPrice}`,
        );
        console.log(
          `DO Label Product: Label "${label.text}" - price comparison details:`,
          {
            comparePrice: comparePrice,
            fromPrice: fromPrice,
            toPrice: toPrice,
            isInRange: comparePrice >= fromPrice && comparePrice <= toPrice,
            rawComparePrice: product.compareAtPrice,
            rawRuleConfig: label.ruleConfig,
          },
        );

        // Check if product price is within the specified range
        if (comparePrice < fromPrice || comparePrice > toPrice) {
          console.log(
            `DO Label Product: Label "${label.text}" - price outside range, not showing`,
          );
          return false; // Price outside range, don't show label
        }

        console.log(
          `DO Label Product: Label "${label.text}" - price in range, showing`,
        );
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
    console.log("DO Label Product: injectLabels called with labels:", labels);
    console.log("DO Label Product: injectLabels - productId:", productId);

    // Debug: Log each label structure in detail
    if (labels && Array.isArray(labels)) {
      console.log(
        `DO Label Product: Total labels to process: ${labels.length}`,
      );
      labels.forEach((label, index) => {
        console.log(`DO Label Product: Label ${index + 1} details:`, {
          id: label.id,
          text: label.text,
          condition: label.condition,
          ruleType: label.ruleType,
          ruleConfig: label.ruleConfig,
          active: label.active,
          productIds: label.productIds,
          background: label.background,
          position: label.position,
        });
      });
    }

    // Find product image container with more comprehensive selectors
    // Priority: Look for specific media item containers first
    const selectors = [
      ".product__media-item",
      ".product__media-list .product__media-item",
      ".product__media-list",
      ".product__media-container",
      ".product-single__media",
      ".product-single__photo",
      ".product__image-container",
      "[data-product-image]",
      ".product__photo",
      ".product-image",
      ".product__media",
      ".product-single",
      "[data-product-container]",
    ];

    let productImageContainer = null;
    let selectedSelector = null;

    // Try each selector and log which one is found
    console.log("DO Label Product: Checking all available containers:");
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log(
          `DO Label Product: Found container with selector "${selector}":`,
          {
            element: element,
            tagName: element.tagName,
            className: element.className,
            id: element.id,
            hasImages: element.querySelectorAll("img").length,
          },
        );
        if (!productImageContainer) {
          productImageContainer = element;
          selectedSelector = selector;
        }
      } else {
        console.log(
          `DO Label Product: No container found with selector "${selector}"`,
        );
      }
    }

    console.log(
      `DO Label Product: Selected container with selector "${selectedSelector}":`,
      productImageContainer,
    );

    // Force use product__media-item if available, even if other containers were found first
    const preferredMediaItem = document.querySelector(".product__media-item");
    if (preferredMediaItem) {
      console.log(
        "DO Label Product: Found preferred .product__media-item, using it instead:",
        preferredMediaItem,
      );
      productImageContainer = preferredMediaItem;
      selectedSelector = ".product__media-item";
    }

    console.log(
      "DO Label Product: injectLabels - final productImageContainer:",
      productImageContainer,
    );
    console.log(
      "DO Label Product: injectLabels - final selectedSelector:",
      selectedSelector,
    );

    if (!productImageContainer) {
      console.log(
        "DO Label Product: injectLabels - no product image container found, returning",
      );
      return;
    }

    // Debug: Log container details
    console.log("DO Label Product: injectLabels - container details:", {
      tagName: productImageContainer.tagName,
      className: productImageContainer.className,
      id: productImageContainer.id,
      position: getComputedStyle(productImageContainer).position,
      hasImages: productImageContainer.querySelectorAll("img").length,
    });

    // Set container to relative positioning if needed
    const containerPosition = getComputedStyle(productImageContainer).position;

    if (containerPosition === "static") {
      productImageContainer.style.position = "relative";
      console.log(
        "DO Label Product: injectLabels - set container position to relative",
      );
    }

    // Remove existing labels
    const existingLabels =
      productImageContainer.querySelectorAll(".do-product-label");
    if (existingLabels.length > 0) {
      console.log(
        `DO Label Product: injectLabels - removing ${existingLabels.length} existing labels`,
      );
      existingLabels.forEach((el) => el.remove());
    }

    let labelsAdded = 0;
    labels.forEach((label) => {
      console.log(
        `DO Label Product: injectLabels - checking label:`,
        label.text,
      );

      if (shouldShowLabel(label, productId)) {
        console.log(
          `DO Label Product: injectLabels - adding label:`,
          label.text,
        );
        const labelEl = createLabelElement(label);
        productImageContainer.appendChild(labelEl);
        labelsAdded++;
      } else {
        console.log(
          `DO Label Product: injectLabels - label not shown:`,
          label.text,
        );
      }
    });

    console.log(`DO Label Product: injectLabels - added ${labelsAdded} labels`);
  }

  async function fetchLabels() {
    console.log("DO Label Product: fetchLabels called");
    console.log("DO Label Product: API endpoints to try:", API_ENDPOINTS);

    // Try each endpoint until one works
    for (const endpoint of API_ENDPOINTS) {
      try {
        console.log(`DO Label Product: Trying endpoint: ${endpoint}`);
        const response = await fetch(endpoint);
        console.log(
          `DO Label Product: Endpoint ${endpoint} response status:`,
          response.status,
        );

        if (response.ok) {
          const labels = await response.json();
          console.log(
            `DO Label Product: Successfully fetched labels from ${endpoint}:`,
            labels,
          );

          // Debug: Log each label structure
          if (labels && Array.isArray(labels)) {
            console.log(
              `DO Label Product: Total labels fetched: ${labels.length}`,
            );
            labels.forEach((label, index) => {
              console.log(`DO Label Product: Label ${index + 1} structure:`, {
                id: label.id,
                text: label.text,
                condition: label.condition,
                ruleType: label.ruleType,
                ruleConfig: label.ruleConfig,
                active: label.active,
                productIds: label.productIds,
                background: label.background,
                position: label.position,
              });
            });
          }

          return labels;
        } else {
          console.log(
            `DO Label Product: Endpoint ${endpoint} failed with status:`,
            response.status,
          );
        }
      } catch (error) {
        console.error(
          `DO Label Product: Error fetching from ${endpoint}:`,
          error,
        );
      }
    }

    console.log(
      "DO Label Product: All endpoints failed, returning empty array",
    );
    return [];
  }

  // Debug helper function to analyze product page structure
  function debugProductPageStructure() {
    console.log("=== DO Label Product: Product Page Structure Analysis ===");

    // Check URL
    console.log("URL Analysis:", {
      href: window.location.href,
      pathname: window.location.pathname,
      isProductPage: /\/products\//.test(window.location.pathname),
    });

    // Check product ID detection
    const productId = getCurrentProductId();
    console.log("Product ID Detection:", {
      productId: productId,
      hasProductId: !!productId,
    });

    // Check available price elements
    const priceElements = document.querySelectorAll(
      "[data-compare-price], .price__compare, .product__price--compare, .product-single__price--compare, [data-product-compare-price]",
    );
    console.log("Available Price Elements:", {
      total: priceElements.length,
      elements: Array.from(priceElements).map((el, index) => ({
        index: index + 1,
        tagName: el.tagName,
        className: el.className,
        textContent: el.textContent,
        dataComparePrice: el.getAttribute("data-compare-price"),
        dataProductComparePrice: el.getAttribute("data-product-compare-price"),
      })),
    });

    // Check product image containers
    const imageContainers = [
      ".product__media-list .product__media-item",
      ".product__media-list",
      ".product__media-container",
      ".product__media-item",
      ".product-single__media",
      ".product-single__photo",
      ".product__image-container",
      "[data-product-image]",
      ".product__photo",
      ".product-image",
      ".product__media",
      ".product-single",
      "[data-product-container]",
    ];

    console.log("Available Image Containers:", {
      containers: imageContainers.map((selector) => ({
        selector: selector,
        found: !!document.querySelector(selector),
        element: document.querySelector(selector),
      })),
    });

    // Check theme detection
    console.log("Theme Detection:", {
      hasShopify: typeof window.Shopify !== "undefined",
      themeName:
        document.documentElement.getAttribute("data-theme-name") || "Unknown",
      bodyClasses: document.body.className,
    });

    console.log("=== End Product Page Structure Analysis ===");
  }

  // Main execution for product pages
  function initProductLabels() {
    console.log("DO Label Product: initProductLabels called");

    // Run debug analysis
    debugProductPageStructure();

    // Check if we're on a product page
    const onProductPage =
      /\/products\//.test(window.location.pathname) || !!getCurrentProductId();

    console.log("DO Label Product: onProductPage =", onProductPage);

    if (!onProductPage) {
      console.log("DO Label Product: Not on product page, exiting");
      return; // Not a product page, exit early
    }

    // Fetch and inject labels
    (async () => {
      try {
        console.log("DO Label Product: Fetching labels...");
        const labels = await fetchLabels();
        console.log("DO Label Product: Fetched labels:", labels);

        if (!labels || labels.length === 0) {
          console.log("DO Label Product: No labels found");
          return;
        }

        const productId = getCurrentProductId();
        console.log("DO Label Product: Product ID:", productId);

        if (productId) {
          console.log("DO Label Product: Injecting labels...");
          injectLabels(labels, productId);
        } else {
          console.log(
            "DO Label Product: No product ID found, cannot inject labels",
          );
        }
      } catch (error) {
        console.error("DO Label Product: Error in initProductLabels:", error);
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
