(function () {
  "use strict";

  // Configuration - Multiple endpoints for fallback
  const API_ENDPOINTS = [
    "/apps/doproductlabel/labels", // App Proxy (works when no password protection)
    "https://dreams-durham-hat-questions.trycloudflare.com/apps/doproductlabel/labels", // Direct API (bypasses password protection)
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

  // Selectors commonly used by Dawn for collection product cards and media
  const COLLECTION_CARD_SELECTORS = [
    ".grid__item .card--product",
    ".grid__item .card",
    ".card-wrapper",
    ".product-grid .grid__item",
  ];
  const CARD_MEDIA_SELECTORS = [
    ".card__media",
    ".card__inner .media",
    ".media",
    ".media--transparent",
    ".media--square",
  ];

  // Utility functions
  /**
   * Normalizes a product ID for consistent comparison
   * Converts to string, trims whitespace, and handles null/undefined values
   * @param {string|number|null|undefined} id - The product ID to normalize
   * @returns {string|null} - Normalized product ID string or null if invalid
   */
  function normalizeProductId(id) {
    console.log(
      `DO Label: Normalizing product ID:`,
      id,
      `(type: ${typeof id})`,
    );

    // Handle null/undefined
    if (id === null || id === undefined) {
      console.log(`DO Label: Product ID is null/undefined, returning null`);
      return null;
    }

    // Convert to string and trim whitespace
    let normalized = id.toString().trim();

    // Handle empty string
    if (normalized === "") {
      console.log(`DO Label: Product ID is empty string, returning null`);
      return null;
    }

    // Handle special cases
    if (
      normalized === "null" ||
      normalized === "undefined" ||
      normalized === "NaN"
    ) {
      console.log(
        `DO Label: Product ID is special value "${normalized}", returning null`,
      );
      return null;
    }

    // Handle Shopify GID format: gid://shopify/Product/7138215985336
    if (normalized.startsWith("gid://shopify/Product/")) {
      const productId = normalized.split("/").pop();
      console.log(
        `DO Label: Shopify GID detected, extracted product ID: ${productId}`,
      );
      return productId;
    }

    // Handle other GID formats if needed
    if (normalized.includes("://") && normalized.includes("/")) {
      const parts = normalized.split("/");
      const lastPart = parts[parts.length - 1];
      if (lastPart && !isNaN(lastPart)) {
        console.log(`DO Label: GID format detected, extracted ID: ${lastPart}`);
        return lastPart;
      }
    }

    console.log(`DO Label: Normalized product ID: "${normalized}"`);
    return normalized;
  }

  function getCurrentProductId() {
    // Try to get product ID from various sources
    let productId = null;
    let productHandle = null;

    console.log("DO Label: Starting to find current product ID...");

    // PRIORITY 1: Get numeric product ID from product form (most reliable)
    const formInput = document.querySelector('input[name="product-id"]');
    if (formInput && formInput.value) {
      productId = formInput.value;
      console.log(
        "DO Label: Found product ID from form input[name='product-id']:",
        productId,
      );
    }

    // PRIORITY 2: Get numeric product ID from custom product-id input
    if (!productId) {
      const customInput = document.querySelector('input[name="product-id"]');
      if (customInput && customInput.value) {
        productId = customInput.value;
        console.log(
          "DO Label: Found product ID from form input[name='product-id']:",
          productId,
        );
      }
    }

    // PRIORITY 3: Get numeric product ID from product JSON script
    if (!productId) {
      const productJsonScript = document.querySelector(
        'script[type="application/json"][data-product-json]',
      );
      if (productJsonScript) {
        try {
          const productData = JSON.parse(productJsonScript.textContent);
          if (productData.id) {
            productId = productData.id.toString();
            console.log(
              "DO Label: Found product ID from JSON script:",
              productId,
            );
          }
        } catch (error) {
          console.warn("DO Label: Failed to parse product JSON:", error);
        }
      }
    }

    // PRIORITY 4: Get numeric product ID from data attributes
    if (!productId) {
      const productElement = document.querySelector("[data-product-id]");
      if (productElement) {
        productId = productElement.getAttribute("data-product-id");
        console.log(
          "DO Label: Found product ID from data attribute:",
          productId,
        );
      }
    }

    // PRIORITY 5: Get product handle from meta tag (fallback for numeric ID lookup)
    if (!productId) {
      const metaUrl = document.querySelector(
        'meta[property="og:url"]',
      )?.content;
      if (metaUrl) {
        const match = metaUrl.match(/products\/([^?]+)/);
        if (match) {
          productHandle = match[1];
          console.log(
            "DO Label: Found product handle from meta tag:",
            productHandle,
          );
        }
      }
    }

    // PRIORITY 6: Get product handle from URL (fallback for numeric ID lookup)
    if (!productId && !productHandle) {
      const urlMatch = window.location.pathname.match(/products\/([^?]+)/);
      if (urlMatch) {
        productHandle = urlMatch[1];
        console.log("DO Label: Found product handle from URL:", productHandle);
      }
    }

    // Return numeric ID if found, otherwise return handle
    if (productId) {
      console.log("DO Label: Using numeric product ID:", productId);
      return productId;
    } else if (productHandle) {
      console.log("DO Label: Using product handle (fallback):", productHandle);
      return productHandle;
    }

    console.warn("DO Label: No product ID or handle found");
    return null;
  }

  function isCollectionPage() {
    // Heuristics: URL contains /collections/ and there are product cards
    const inCollectionsPath =
      window.location.pathname.includes("/collections/");
    const hasProductCards = getCollectionProductCards().length > 0;
    return inCollectionsPath || hasProductCards;
  }

  function extractHandleFromHref(href) {
    if (!href) return null;
    const url = new URL(href, window.location.origin);
    const match = url.pathname.match(/\/products\/([^/?#]+)/);
    return match ? match[1] : null;
  }

  function getProductIdFromCard(cardEl) {
    // Prefer explicit data attributes if available
    const byHandle = cardEl.getAttribute("data-product-handle");
    if (byHandle) return byHandle;

    const byId = cardEl.getAttribute("data-product-id");
    if (byId) return byId;

    // Try anchor href
    const productLink = cardEl.querySelector('a[href*="/products/"]');
    if (productLink) {
      const handle = extractHandleFromHref(productLink.getAttribute("href"));
      if (handle) return handle;
    }

    // As a last resort, look up any nested JSON data blocks (rare)
    const productJsonScript = cardEl.querySelector(
      'script[type="application/json"][data-product-json]',
    );
    if (productJsonScript) {
      try {
        const data = JSON.parse(productJsonScript.textContent);
        if (data && (data.handle || data.id)) {
          return (data.handle || data.id).toString();
        }
      } catch (_) {
        // ignore
      }
    }

    return null;
  }

  function getCollectionProductCards() {
    // Find likely product card containers
    const cards = new Set();
    COLLECTION_CARD_SELECTORS.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        // Only keep elements that actually contain a product link
        if (el.querySelector('a[href*="/products/"]')) {
          cards.add(el);
        }
      });
    });

    // If still empty, try links to products and walk up to card wrapper
    if (cards.size === 0) {
      document.querySelectorAll('a[href*="/products/"]').forEach((link) => {
        const card = link.closest(
          ".card-wrapper, .card--product, .product-card, .grid__item, li.grid__item",
        );
        if (card) cards.add(card);
      });
    }

    return Array.from(cards);
  }

  function getCardMediaContainer(cardEl) {
    for (const sel of CARD_MEDIA_SELECTORS) {
      const el = cardEl.querySelector(sel);
      if (el) return el;
    }
    // Fallback to first image wrapper or the card itself
    return (
      cardEl.querySelector("[data-product-image]") ||
      cardEl.querySelector("img")?.parentElement ||
      cardEl
    );
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
      const isValidColor =
        /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$|^rgb\(|^rgba\(|^hsl\(|^hsla\(/.test(
          label.background,
        );

      if (isValidColor) {
        labelEl.style.backgroundColor = label.background;
      } else {
        // Try to convert to hex if it's a color name
        const tempDiv = document.createElement("div");
        tempDiv.style.color = label.background;
        document.body.appendChild(tempDiv);
        const computedColor = getComputedStyle(tempDiv).color;
        document.body.removeChild(tempDiv);

        if (computedColor !== "rgba(0, 0, 0, 0)") {
          labelEl.style.backgroundColor = computedColor;
        } else {
          // Fallback to default color
          labelEl.style.backgroundColor = "#ff0000";
        }
      }
    } else {
      labelEl.style.backgroundColor = "#ff0000";
    }

    // Position the label
    const position = label.position || "top-left";

    switch (position) {
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
      case "center":
        labelEl.style.top = "50%";
        labelEl.style.left = "50%";
        labelEl.style.transform = "translate(-50%, -50%)";
        break;
      default:
        // Fallback to top-left if position is not recognized
        labelEl.style.top = "10px";
        labelEl.style.left = "10px";
        break;
    }

    return labelEl;
  }

  /**
   * Determines whether a label should be shown for a specific product
   * Supports two main conditions:
   * 1. "all" or undefined: Show on all products
   * 2. "specific": Show only on products listed in productIds
   *
   * @param {Object} label - Label object with condition and productIds
   * @param {string|number} productId - Current product ID or handle
   * @returns {boolean} - Whether the label should be displayed
   */
  function shouldShowLabel(label, productId) {
    // Validate input parameters
    if (!label || typeof label !== "object") {
      console.warn("DO Label: Invalid label object provided");
      return false;
    }

    // Early return if label is inactive
    if (label.active === false) {
      console.log(`DO Label: Label "${label.text}" is inactive, not showing`);
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

    console.log(
      `DO Label: Checking label "${label.text}" for product ${normalizedProductId}`,
    );
    console.log(
      `DO Label: Label condition: "${label.condition}", productIds:`,
      label.productIds,
    );

    // CONDITION 1: Show on all products (default behavior)
    if (
      !label.condition ||
      label.condition === "all" ||
      label.condition === ""
    ) {
      console.log(
        `DO Label: Label "${label.text}" - showing on all products (condition: ${label.condition || "undefined"})`,
      );
      return true;
    }

    // CONDITION 2: Show only on specific products
    if (label.condition === "specific") {
      const result = checkSpecificProductCondition(label, normalizedProductId);
      console.log(
        `DO Label: Label "${label.text}" - specific condition result: ${result}`,
      );
      return result;
    }

    // For any other condition type, show by default (extensible for future conditions)
    console.log(
      `DO Label: Label "${label.text}" - unknown condition "${label.condition}", showing by default`,
    );
    return true;
  }

  /**
   * Helper function to check if a product matches specific product condition
   * @param {Object} label - Label object with productIds
   * @param {string} normalizedProductId - Normalized current product ID
   * @returns {boolean} - Whether the product matches the condition
   */
  function checkSpecificProductCondition(label, normalizedProductId) {
    console.log(
      `DO Label: Checking specific condition for label "${label.text}"`,
    );
    console.log(`DO Label: Current product ID: ${normalizedProductId}`);
    console.log(`DO Label: Label productIds:`, label.productIds);
    console.log(`DO Label: productIds type:`, typeof label.productIds);

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
    console.log(`DO Label: Normalized productIds array:`, productIdsArray);

    if (!productIdsArray || productIdsArray.length === 0) {
      console.warn(
        `DO Label: Label "${label.text}" - productIds array is empty after normalization`,
      );
      return false;
    }

    // Check if current product ID is in the list with detailed logging
    console.log(`DO Label: Starting product ID comparison...`);
    let matchFound = false;

    for (let i = 0; i < productIdsArray.length; i++) {
      const id = productIdsArray[i];
      const normalizedId = normalizeProductId(id);

      console.log(`DO Label: Comparing [${i + 1}/${productIdsArray.length}]`);
      console.log(`DO Label:   Label productId: ${id} (type: ${typeof id})`);
      console.log(`DO Label:   Normalized label ID: ${normalizedId}`);
      console.log(`DO Label:   Current product ID: ${normalizedProductId}`);
      console.log(
        `DO Label:   Types match: ${typeof normalizedId === typeof normalizedProductId}`,
      );

      // Try exact match first
      if (normalizedId === normalizedProductId) {
        console.log(`DO Label:   ✅ EXACT MATCH FOUND!`);
        matchFound = true;
        break;
      }

      // Try string comparison if types don't match
      if (normalizedId.toString() === normalizedProductId.toString()) {
        console.log(`DO Label:   ✅ STRING MATCH FOUND!`);
        matchFound = true;
        break;
      }

      // Try numeric comparison if both are numbers
      if (!isNaN(normalizedId) && !isNaN(normalizedProductId)) {
        if (parseInt(normalizedId) === parseInt(normalizedProductId)) {
          console.log(`DO Label:   ✅ NUMERIC MATCH FOUND!`);
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
          console.log(`DO Label:   ✅ SHOPIFY GID MATCH FOUND!`);
          matchFound = true;
          break;
        }
      }

      console.log(`DO Label:   ✗ No match`);
    }

    console.log(
      `DO Label: Label "${label.text}" - final match result: ${matchFound}`,
    );
    return matchFound;
  }

  /**
   * Helper function to normalize productIds to array format
   * Handles various input formats: array, JSON string, single value
   * @param {any} productIds - Product IDs in various formats
   * @returns {Array|null} - Normalized array of product IDs or null if invalid
   */
  function normalizeProductIdsToArray(productIds) {
    console.log(`DO Label: Normalizing productIds:`, productIds);
    console.log(`DO Label: productIds type:`, typeof productIds);

    // Case 1: Already an array
    if (Array.isArray(productIds)) {
      const filtered = productIds.filter((id) => id != null); // Filter out null/undefined values
      console.log(`DO Label: Input is array, filtered result:`, filtered);
      return filtered;
    }

    // Case 2: JSON string
    if (typeof productIds === "string") {
      console.log(`DO Label: Input is string: "${productIds}"`);

      // Handle empty or invalid JSON strings
      if (productIds.trim() === "" || productIds === "[]") {
        console.log(
          `DO Label: Empty string or empty array string, returning null`,
        );
        return null;
      }

      try {
        const parsed = JSON.parse(productIds);
        console.log(`DO Label: JSON parsed successfully:`, parsed);

        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((id) => id != null);
          console.log(`DO Label: Parsed array, filtered result:`, filtered);
          return filtered;
        } else if (parsed != null) {
          console.log(`DO Label: Parsed single value, returning as array:`, [
            parsed,
          ]);
          return [parsed];
        }
        console.log(`DO Label: Parsed value is null, returning null`);
        return null;
      } catch (error) {
        console.log(
          `DO Label: JSON parse failed, treating as single product ID string`,
        );
        // Treat as single product ID string if JSON parsing fails
        const result = productIds.trim() ? [productIds.trim()] : null;
        console.log(`DO Label: Single ID result:`, result);
        return result;
      }
    }

    // Case 3: Number or other primitive
    if (productIds != null && productIds !== "") {
      console.log(`DO Label: Input is primitive, returning as array:`, [
        productIds,
      ]);
      return [productIds];
    }

    console.log(`DO Label: Input is null/undefined/empty, returning null`);
    return null;
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

    // Clear previously injected labels to avoid duplicates on re-renders
    productImageContainer
      .querySelectorAll(".do-product-label")
      .forEach((el) => el.remove());

    labels.forEach((label, index) => {
      const activeStatus =
        label.active === undefined
          ? "undefined (default: active)"
          : label.active;
      console.log(
        `DO Label: Processing label "${label.text}" (active: ${activeStatus})`,
      );
      if (shouldShowLabel(label, productId)) {
        const labelEl = createLabelElement(label);
        productImageContainer.appendChild(labelEl);
        console.log(`DO Label: Successfully injected label "${label.text}"`);
      } else {
        console.log(
          `DO Label: Skipping label "${label.text}" - conditions not met`,
        );
      }
    });
  }

  function injectLabelsIntoCollection(labels) {
    const cards = getCollectionProductCards();

    cards.forEach((card, idx) => {
      const productId = getProductIdFromCard(card);
      if (!productId) return;

      const mediaContainer = getCardMediaContainer(card);
      if (!mediaContainer) return;

      const containerPosition = getComputedStyle(mediaContainer).position;
      if (containerPosition === "static") {
        mediaContainer.style.position = "relative";
      }

      // Clear previously injected labels to avoid duplicates on re-renders
      mediaContainer
        .querySelectorAll(".do-product-label")
        .forEach((el) => el.remove());

      labels.forEach((label) => {
        const activeStatus =
          label.active === undefined
            ? "undefined (default: active)"
            : label.active;
        console.log(
          `DO Label: Processing collection label "${label.text}" (active: ${activeStatus}) for product ${productId}`,
        );
        if (shouldShowLabel(label, productId)) {
          const labelEl = createLabelElement(label);
          mediaContainer.appendChild(labelEl);
          console.log(
            `DO Label: Successfully injected collection label "${label.text}" for product ${productId}`,
          );
        } else {
          console.log(
            `DO Label: Skipping collection label "${label.text}" for product ${productId} - conditions not met`,
          );
        }
      });
    });
  }

  async function fetchLabels() {
    // Try each endpoint until one works
    for (let i = 0; i < API_ENDPOINTS.length; i++) {
      const endpoint = API_ENDPOINTS[i];
      try {
        const response = await fetch(endpoint);
        if (response.ok) {
          const labels = await response.json();
          return labels;
        }
      } catch (error) {
        // Silent fail
      }
    }

    return [];
  }

  // Main execution
  function init() {
    const onProductPage =
      /\/products\//.test(window.location.pathname) || !!getCurrentProductId();
    const onCollectionPage = isCollectionPage();

    // Fetch and inject labels once per init
    (async () => {
      const labels = await fetchLabels();
      if (!labels || labels.length === 0) {
        console.log("DO Label: No labels found");
        return;
      }

      // Log label statistics
      const activeLabels = labels.filter((label) => label.active === true);
      const inactiveLabels = labels.filter((label) => label.active === false);
      const undefinedLabels = labels.filter(
        (label) => label.active === undefined,
      );
      console.log(
        `DO Label: Found ${labels.length} total labels (${activeLabels.length} active, ${inactiveLabels.length} inactive, ${undefinedLabels.length} undefined - treated as active)`,
      );

      if (onProductPage) {
        const productId = getCurrentProductId();
        if (productId) {
          console.log("DO Label: Injecting labels for product:", productId);
          injectLabels(labels, productId);
        }
      }

      if (onCollectionPage) {
        console.log("DO Label: Injecting labels for collection page");
        injectLabelsIntoCollection(labels);
      }
    })();
  }

  // Run when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Also run on page changes (for SPA themes)
  if (typeof window !== "undefined" && window.Shopify && window.Shopify.on) {
    window.Shopify.on("section:load", init);
  }
})();
