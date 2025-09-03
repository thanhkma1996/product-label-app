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

    // Handle Shopify GID format: gid://shopify/Product/7138215985336
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

  function getCurrentProduct() {
    // Try to get product information from various sources
    const product = {};

    // Get compare at price (original price) from the current product card
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

  function getProductFromCard(cardEl) {
    // Try to get product information from a specific product card
    const product = {};

    // console.log(
    //   "DO Label Collection: getProductFromCard called for card:",
    //   cardEl,
    // );

    // Get compare at price from the card
    const compareAtPriceElement =
      cardEl.querySelector("[data-compare-price]") ||
      cardEl.querySelector(".price__compare") ||
      cardEl.querySelector(".product__price--compare") ||
      cardEl.querySelector(".product-single__price--compare") ||
      cardEl.querySelector(".price-item") || 
      cardEl.querySelector("[data-product-compare-price]");


    console.log(
      "DO Label Collection: getProductFromCard - compareAtPriceElement found:",
      compareAtPriceElement,
    );

    if (compareAtPriceElement) {
      const comparePriceText =
        compareAtPriceElement.textContent || compareAtPriceElement.innerText;
      console.log(
        "DO Label Collection: getProductFromCard - comparePriceText:",
        comparePriceText,
      );

      if (comparePriceText) {
        // Extract price from text (remove currency symbols and extra text)
        const priceMatch = comparePriceText.match(/[\d,]+\.?\d*/);
        console.log(
          "DO Label Collection: getProductFromCard - priceMatch:",
          priceMatch,
        );

        if (priceMatch) {
          product.compareAtPrice = priceMatch[0].replace(/,/g, "");
          console.log(
            "DO Label Collection: getProductFromCard - extracted price:",
            product.compareAtPrice,
          );
        }
      }
    } else {
      console.log(
        "DO Label Collection: getProductFromCard - no compare price element found",
      );
      console.log(
        "DO Label Collection: getProductFromCard - available price elements:",
        {
          dataComparePrice: cardEl.querySelector("[data-compare-price]"),
          priceCompare: cardEl.querySelector(".price__compare"),
          productPriceCompare: cardEl.querySelector(".product__price--compare"),
          productSinglePriceCompare: cardEl.querySelector(
            ".product-single__price--compare",
          ),
          dataProductComparePrice: cardEl.querySelector(
            "[data-product-compare-price]",
          ),
        },
      );
    }

    console.log(
      "DO Label Collection: getProductFromCard - returning product:",
      product,
    );
    return product;
  }

  function isCollectionPage() {
    // Heuristics: URL contains /collections/ and there are product cards
    const inCollectionsPath =
      window.location.pathname.includes("/collections/");

    const productCards = getCollectionProductCards();
    const hasProductCards = productCards.length > 0;

    console.log("DO Label Collection: isCollectionPage check:");
    console.log("  - URL path:", window.location.pathname);
    console.log("  - inCollectionsPath:", inCollectionsPath);
    console.log("  - productCards found:", productCards.length);
    console.log("  - hasProductCards:", hasProductCards);

    const result = inCollectionsPath || hasProductCards;
    console.log("DO Label Collection: isCollectionPage result:", result);

    return result;
  }

  function extractHandleFromHref(href) {
    if (!href) return null;
    const url = new URL(href, window.location.origin);
    const match = url.pathname.match(/\/products\/([^/?#]+)/);
    return match ? match[1] : null;
  }

  function getProductIdFromCard(cardEl) {
    console.log(
      "DO Label Collection: getProductIdFromCard called for card:",
      cardEl,
    );

    // Show data-product-id attribute (trùng với productIds trong database)
    const byId = cardEl.getAttribute("data-product-id");
    console.log(
      "DO Label Collection: getProductIdFromCard - data-product-id:",
      byId,
    );
    if (byId) {
      console.log(
        "DO Label Collection: getProductIdFromCard - found by data-product-id:",
        byId,
      );
      return byId;
    }

    // Check ID in card--media element
    const mediaElement = cardEl.querySelector(".card--media");
    console.log(
      "DO Label Collection: getProductIdFromCard - mediaElement:",
      mediaElement,
    );
    if (mediaElement) {
      const mediaProductId = mediaElement.getAttribute("data-product-id");
      console.log(
        "DO Label Collection: getProductIdFromCard - mediaProductId:",
        mediaProductId,
      );
      if (mediaProductId) {
        console.log(
          "DO Label Collection: getProductIdFromCard - found by media data-product-id:",
          mediaProductId,
        );
        return mediaProductId;
      }
    }

    // Fallback: data-product-handle
    const byHandle = cardEl.getAttribute("data-product-handle");
    console.log(
      "DO Label Collection: getProductIdFromCard - data-product-handle:",
      byHandle,
    );
    if (byHandle) {
      console.log(
        "DO Label Collection: getProductIdFromCard - found by data-product-handle:",
        byHandle,
      );
      return byHandle;
    }

    // Try anchor href
    const productLink = cardEl.querySelector('a[href*="/products/"]');
    console.log(
      "DO Label Collection: getProductIdFromCard - productLink:",
      productLink,
    );
    if (productLink) {
      const href = productLink.getAttribute("href");
      console.log("DO Label Collection: getProductIdFromCard - href:", href);
      const handle = extractHandleFromHref(href);
      console.log(
        "DO Label Collection: getProductIdFromCard - extracted handle:",
        handle,
      );
      if (handle) {
        console.log(
          "DO Label Collection: getProductIdFromCard - found by href handle:",
          handle,
        );
        return handle;
      }
    }

    // As a last resort, look up any nested JSON data blocks (rare)
    const productJsonScript = cardEl.querySelector(
      'script[type="application/json"][data-product-json]',
    );
    console.log(
      "DO Label Collection: getProductIdFromCard - productJsonScript:",
      productJsonScript,
    );
    if (productJsonScript) {
      try {
        const data = JSON.parse(productJsonScript.textContent);
        console.log(
          "DO Label Collection: getProductIdFromCard - parsed JSON data:",
          data,
        );
        if (data && (data.handle || data.id)) {
          const result = (data.handle || data.id).toString();
          console.log(
            "DO Label Collection: getProductIdFromCard - found by JSON:",
            result,
          );
          return result;
        }
      } catch (error) {
        console.log(
          "DO Label Collection: getProductIdFromCard - JSON parse error:",
          error,
        );
      }
    }

    console.log(
      "DO Label Collection: getProductIdFromCard - no product ID found",
    );
    return null;
  }

  // Show function helper fro check product ID matching
  function isProductIdMatch(productId1, productId2) {
    // Normalize both IDs
    const normalized1 = normalizeProductId(productId1);
    const normalized2 = normalizeProductId(productId2);

    if (!normalized1 || !normalized2) {
      return false;
    }

    // Exact match (trường hợp phổ biến nhất)
    if (normalized1 === normalized2) {
      return true;
    }

    // String comparison
    if (normalized1.toString() === normalized2.toString()) {
      return true;
    }

    // Numeric comparison (nếu cả hai là số)
    if (!isNaN(normalized1) && !isNaN(normalized2)) {
      if (parseInt(normalized1) === parseInt(normalized2)) {
        return true;
      }
    }

    // Case-insensitive string comparison
    if (typeof normalized1 === "string" && typeof normalized2 === "string") {
      if (normalized1.toLowerCase() === normalized2.toLowerCase()) {
        return true;
      }
    }

    // GID comparison (Shopify GraphQL ID format)
    if (
      normalized1.startsWith("gid://shopify/Product/") ||
      normalized2.startsWith("gid://shopify/Product/")
    ) {
      const id1 = normalizeProductId(normalized1);
      const id2 = normalizeProductId(normalized2);
      if (id1 === id2) {
        return true;
      }
    }

    // Thử so sánh sau khi loại bỏ các ký tự đặc biệt
    const clean1 = normalized1.toString().replace(/[^a-zA-Z0-9]/g, "");
    const clean2 = normalized2.toString().replace(/[^a-zA-Z0-9]/g, "");
    if (clean1 === clean2 && clean1.length > 0) {
      return true;
    }

    return false;
  }

  function getCollectionProductCards() {
    console.log("DO Label Collection: getCollectionProductCards called");
    console.log("DO Label Collection: Current URL:", window.location.href);
    console.log(
      "DO Label Collection: Current pathname:",
      window.location.pathname,
    );

    // Find likely product card containers
    const cards = new Set();

    COLLECTION_CARD_SELECTORS.forEach((sel) => {
      const elements = document.querySelectorAll(sel);
      console.log(
        `DO Label Collection: Selector "${sel}" found ${elements.length} elements`,
      );

      elements.forEach((el, index) => {
        // Only keep elements that actually contain a product link
        const productLink = el.querySelector('a[href*="/products/"]');
        if (productLink) {
          cards.add(el);
          console.log(
            `DO Label Collection: Added card ${index + 1} with selector "${sel}"`,
          );
          console.log(
            `DO Label Collection: Card ${index + 1} product link:`,
            productLink.href,
          );
        } else {
          console.log(
            `DO Label Collection: Card ${index + 1} with selector "${sel}" has no product link`,
          );
        }
      });
    });

    // If still empty, try links to products and walk up to card wrapper
    if (cards.size === 0) {
      console.log(
        "DO Label Collection: No cards found with primary selectors, trying fallback...",
      );

      const productLinks = document.querySelectorAll('a[href*="/products/"]');
      console.log(
        `DO Label Collection: Found ${productLinks.length} product links`,
      );

      productLinks.forEach((link) => {
        const card = link.closest(
          ".card-wrapper, .card--product, .product-card, .grid__item, li.grid__item",
        );
        if (card) {
          cards.add(card);
          console.log("DO Label Collection: Added card via fallback method");
        }
      });
    }

    console.log(`DO Label Collection: Total cards found: ${cards.size}`);
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
      const isValidColor = /^#([A-Fa-f0-9]{3,6})$|^rgba?\(|^hsla?\(/.test(
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

  function shouldShowLabel(label, productId, cardEl = null) {
    console.log(
      `DO Label Collection: shouldShowLabel called for label "${label.text}" and product ${productId}`,
    );

    // Validate input parameters
    if (!label || typeof label !== "object") {
      console.log(
        `DO Label Collection: Label validation failed - invalid label object`,
      );
      return false;
    }

    // Early return if label is inactive
    if (label.active === false) {
      console.log(
        `DO Label Collection: Label "${label.text}" is inactive, not showing`,
      );
      return false;
    }

    // Normalize product ID for consistent comparison
    const normalizedProductId = normalizeProductId(productId);
    if (!normalizedProductId) {
      console.log(
        `DO Label Collection: Product ID normalization failed for ${productId}`,
      );
      return false;
    }

    console.log(
      `DO Label Collection: Label "${label.text}" - condition: ${label.condition}, ruleType: ${label.ruleType}`,
    );

    // Debug: Log full label object for rule_based labels
    if (label.condition === "rule_based") {
      console.log(
        `DO Label Collection: Full label object for rule_based label "${label.text}":`,
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
      console.log(
        `DO Label Collection: Label "${label.text}" - showing (condition: all)`,
      );
      return true;
    }

    // CONDITION 2: Show only on specific products
    if (label.condition === "specific") {
      const result = checkSpecificProductCondition(label, normalizedProductId);
      console.log(
        `DO Label Collection: Label "${label.text}" - specific condition result: ${result}`,
      );
      return result;
    }

    // CONDITION 3: Show based on rule-based conditions
    if (label.condition === "rule_based" && label.ruleType) {
      console.log(
        `DO Label Collection: Label "${label.text}" - checking rule-based condition`,
      );

      // Special Price Rule
      if (label.ruleType === "special_price" && label.ruleConfig) {
        console.log(
          `DO Label Collection: Label "${label.text}" - checking special price rule`,
        );
        console.log(
          `DO Label Collection: Label "${label.text}" - ruleConfig:`,
          label.ruleConfig,
        );

        const product = cardEl
          ? getProductFromCard(cardEl)
          : getCurrentProduct();
        console.log(
          `DO Label Collection: Label "${label.text}" - product data:`,
          product,
        );

        // Debug: Log detailed product price information
        if (cardEl) {
          console.log(
            `DO Label Collection: Label "${label.text}" - searching for compare price in card:`,
            {
              cardHTML: cardEl.outerHTML.substring(0, 300) + "...",
              priceSelectors: [
                "[data-compare-price]",
                ".price__compare",
                ".product__price--compare",
                ".product-single__price--compare",
                "[data-product-compare-price]",
                ".price__sale",
                ".price-item price-item--sale"
              ],
              foundElements: {
                dataComparePrice: cardEl.querySelector("[data-compare-price]"),
                priceCompare: cardEl.querySelector(".price__compare"),
                productPriceCompare: cardEl.querySelector(
                  ".product__price--compare",
                ),
                productSinglePriceCompare: cardEl.querySelector(
                  ".product-single__price--compare",
                ),
                dataProductComparePrice: cardEl.querySelector(
                  "[data-product-compare-price]",
                ),
              },
            },
          );
        }

        if (!product || !product.compareAtPrice) {
          console.log(
            `DO Label Collection: Label "${label.text}" - no compare price, not showing`,
          );
          console.log(
            `DO Label Collection: Label "${label.text}" - product object:`,
            product,
          );
          return false; // No compare price, don't show label
        }

        const comparePrice = parseFloat(product.compareAtPrice);
        const fromPrice = parseFloat(label.ruleConfig.from) || 0;
        const toPrice = parseFloat(label.ruleConfig.to) || 999999;

        console.log(
          `DO Label Collection: Label "${label.text}" - price check: ${comparePrice} between ${fromPrice} and ${toPrice}`,
        );
        console.log(
          `DO Label Collection: Label "${label.text}" - price comparison details:`,
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
            `DO Label Collection: Label "${label.text}" - price outside range, not showing`,
          );
          return false; // Price outside range, don't show label
        }

        console.log(
          `DO Label Collection: Label "${label.text}" - price in range, showing`,
        );
        return true; // Price within range, show label
      }

      // New Arrival Rule - Note: This won't work perfectly on frontend
      // because we can't get product creation date from frontend
      if (label.ruleType === "new_arrival" && label.ruleConfig) {
        console.log(
          `DO Label Collection: Label "${label.text}" - new arrival rule (limited support), showing`,
        );
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
      console.log(
        `DO Label Collection: Label "${label.text}" - checking specific + rule-based condition`,
      );

      // Special Price Rule for specific products
      if (label.ruleType === "special_price" && label.ruleConfig) {
        console.log(
          `DO Label Collection: Label "${label.text}" - checking specific + special price rule`,
        );

        const product = cardEl
          ? getProductFromCard(cardEl)
          : getCurrentProduct();
        console.log(
          `DO Label Collection: Label "${label.text}" - product data:`,
          product,
        );

        if (!product || !product.compareAtPrice) {
          console.log(
            `DO Label Collection: Label "${label.text}" - no compare price, not showing`,
          );
          return false; // No compare price, don't show label
        }

        const comparePrice = parseFloat(product.compareAtPrice);
        const fromPrice = parseFloat(label.ruleConfig.from) || 0;
        const toPrice = parseFloat(label.ruleConfig.to) || 999999;

        console.log(
          `DO Label Collection: Label "${label.text}" - price check: ${comparePrice} between ${fromPrice} and ${toPrice}`,
        );
        console.log(
          `DO Label Collection: Label "${label.text}" - price comparison details:`,
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
            `DO Label Collection: Label "${label.text}" - price outside range, not showing`,
          );
          return false; // Price outside range, don't show label
        }

        console.log(
          `DO Label Collection: Label "${label.text}" - price in range, showing`,
        );
        return true; // Price within range, show label
      }

      // New Arrival Rule for specific products - Same limitation as above
      if (label.ruleType === "new_arrival" && label.ruleConfig) {
        console.log(
          `DO Label Collection: Label "${label.text}" - specific + new arrival rule (limited support), showing`,
        );
        console.warn(
          "DO Label: New arrival rule is not fully supported on frontend due to missing product creation date",
        );
        return true;
      }
    }

    console.log(
      `DO Label Collection: Label "${label.text}" - no conditions matched, not showing`,
    );
    return false; // Default: don't show label if no conditions match
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
      return false;
    }

    // Convert productIds to array for consistent processing
    const productIdsArray = normalizeProductIdsToArray(label.productIds);

    if (!productIdsArray || productIdsArray.length === 0) {
      return false;
    }

    // Check if current product ID is in the list using helper function
    for (let i = 0; i < productIdsArray.length; i++) {
      const id = productIdsArray[i];

      if (isProductIdMatch(id, normalizedProductId)) {
        return true;
      }
    }

    return false;
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

  function injectLabelsIntoCollection(labels) {
    console.log(
      "DO Label Collection: injectLabelsIntoCollection called with labels:",
      labels,
    );

    // Debug: Log each label structure in detail
    if (labels && Array.isArray(labels)) {
      console.log(
        `DO Label Collection: Total labels to process: ${labels.length}`,
      );
      labels.forEach((label, index) => {
        console.log(`DO Label Collection: Label ${index + 1} details:`, {
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

    const cards = getCollectionProductCards();
    console.log(`DO Label Collection: Processing ${cards.length} cards`);

    cards.forEach((card, index) => {
      console.log(
        `DO Label Collection: Processing card ${index + 1}/${cards.length}`,
      );

      const productId = getProductIdFromCard(card);
      console.log(
        `DO Label Collection: Card ${index + 1} product ID:`,
        productId,
      );

      // Debug: Log card HTML structure for troubleshooting
      console.log(
        `DO Label Collection: Card ${index + 1} HTML structure:`,
        card.outerHTML.substring(0, 500) + "...",
      );

      if (!productId) {
        console.log(
          `DO Label Collection: Card ${index + 1} - No product ID found, skipping`,
        );
        console.log(
          `DO Label Collection: Card ${index + 1} - Available attributes:`,
          Array.from(card.attributes).map(
            (attr) => `${attr.name}="${attr.value}"`,
          ),
        );
        return;
      }

      const mediaContainer = getCardMediaContainer(card);
      console.log(
        `DO Label Collection: Card ${index + 1} media container:`,
        mediaContainer,
      );

      // Debug: Log media container details
      if (mediaContainer) {
        console.log(
          `DO Label Collection: Card ${index + 1} media container details:`,
          {
            tagName: mediaContainer.tagName,
            className: mediaContainer.className,
            id: mediaContainer.id,
            position: getComputedStyle(mediaContainer).position,
            hasImages: mediaContainer.querySelectorAll("img").length,
          },
        );
      }

      if (!mediaContainer) {
        console.log(
          `DO Label Collection: Card ${index + 1} - No media container found, skipping`,
        );
        return;
      }

      const containerPosition = getComputedStyle(mediaContainer).position;
      if (containerPosition === "static") {
        mediaContainer.style.position = "relative";
        console.log(
          `DO Label Collection: Card ${index + 1} - Set position to relative`,
        );
      }

      // Clear previously injected labels to avoid duplicates on re-renders
      const existingLabels =
        mediaContainer.querySelectorAll(".do-product-label");
      if (existingLabels.length > 0) {
        console.log(
          `DO Label Collection: Card ${index + 1} - Removing ${existingLabels.length} existing labels`,
        );
        existingLabels.forEach((el) => el.remove());
      }

      let labelsAdded = 0;
      labels.forEach((label) => {
        console.log(
          `DO Label Collection: Card ${index + 1} - Checking label:`,
          label.text,
        );

        if (shouldShowLabel(label, productId, card)) {
          console.log(
            `DO Label Collection: Card ${index + 1} - Adding label:`,
            label.text,
          );
          const labelEl = createLabelElement(label);
          mediaContainer.appendChild(labelEl);
          labelsAdded++;
        } else {
          console.log(
            `DO Label Collection: Card ${index + 1} - Label not shown:`,
            label.text,
          );
        }
      });

      console.log(
        `DO Label Collection: Card ${index + 1} - Added ${labelsAdded} labels`,
      );
    });

    console.log("DO Label Collection: injectLabelsIntoCollection completed");
  }

  async function fetchLabels() {
    console.log("DO Label Collection: fetchLabels called");
    console.log("DO Label Collection: API endpoints to try:", API_ENDPOINTS);

    // Try each endpoint until one works
    for (const endpoint of API_ENDPOINTS) {
      try {
        console.log(`DO Label Collection: Trying endpoint: ${endpoint}`);
        const response = await fetch(endpoint);
        console.log(
          `DO Label Collection: Endpoint ${endpoint} response status:`,
          response.status,
        );

        if (response.ok) {
          const labels = await response.json();
          console.log(
            `DO Label Collection: Successfully fetched labels from ${endpoint}:`,
            labels,
          );

          // Debug: Log each label structure
          if (labels && Array.isArray(labels)) {
            console.log(
              `DO Label Collection: Total labels fetched: ${labels.length}`,
            );
            labels.forEach((label, index) => {
              console.log(
                `DO Label Collection: Label ${index + 1} structure:`,
                {
                  id: label.id,
                  text: label.text,
                  condition: label.condition,
                  ruleType: label.ruleType,
                  ruleConfig: label.ruleConfig,
                  active: label.active,
                  productIds: label.productIds,
                  background: label.background,
                  position: label.position,
                },
              );
            });
          }

          return labels;
        } else {
          console.log(
            `DO Label Collection: Endpoint ${endpoint} failed with status:`,
            response.status,
          );
        }
      } catch (error) {
        console.error(
          `DO Label Collection: Error fetching from ${endpoint}:`,
          error,
        );
      }
    }

    console.log(
      "DO Label Collection: All endpoints failed, returning empty array",
    );
    return [];
  }
  // Debug helper function to analyze collection page structure
  function debugCollectionPageStructure() {
    console.log(
      "=== DO Label Collection: Collection Page Structure Analysis ===",
    );

    // Check URL
    console.log("URL Analysis:", {
      href: window.location.href,
      pathname: window.location.pathname,
      isCollectionPage: window.location.pathname.includes("/collections/"),
    });

    // Check available product cards
    const allCards = document.querySelectorAll(
      ".card, .product-card, .grid__item, [data-product-id], [data-product-handle]",
    );
    console.log("Available Product Cards:", {
      total: allCards.length,
      cards: Array.from(allCards).map((card, index) => ({
        index: index + 1,
        tagName: card.tagName,
        className: card.className,
        id: card.id,
        dataProductId: card.getAttribute("data-product-id"),
        dataProductHandle: card.getAttribute("data-product-handle"),
        hasProductLink: !!card.querySelector('a[href*="/products/"]'),
        productLink: card.querySelector('a[href*="/products/"]')?.href,
      })),
    });

    // Check price elements
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

    // Check theme detection
    console.log("Theme Detection:", {
      hasShopify: typeof window.Shopify !== "undefined",
      themeName:
        document.documentElement.getAttribute("data-theme-name") || "Unknown",
      bodyClasses: document.body.className,
    });

    console.log("=== End Collection Page Structure Analysis ===");
  }

  // Main execution for collection pages
  function initCollectionLabels() {
    const onCollectionPage = isCollectionPage();

    console.log("DO Label Collection: initCollectionLabels called");
    console.log("DO Label Collection: onCollectionPage =", onCollectionPage);

    // Run debug analysis
    debugCollectionPageStructure();

    if (!onCollectionPage) {
      console.log("DO Label Collection: Not on collection page, exiting");
      return;
    }

    // Fetch and inject labels
    (async () => {
      try {
        console.log("DO Label Collection: Fetching labels...");
        const labels = await fetchLabels();
        console.log("DO Label Collection: Fetched labels:", labels);

        if (!labels || labels.length === 0) {
          console.log("DO Label Collection: No labels found");
          return;
        }

        console.log("DO Label Collection: Injecting labels into collection...");
        injectLabelsIntoCollection(labels);
      } catch (error) {
        console.error(
          "DO Label Collection: Error in initCollectionLabels:",
          error,
        );
      }
    })();
  }

  // Run when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCollectionLabels);
  } else {
    initCollectionLabels();
  }

  // Also run on page changes (for SPA themes)
  if (typeof window !== "undefined" && window.Shopify && window.Shopify.on) {
    window.Shopify.on("section:load", initCollectionLabels);
  }
})();
