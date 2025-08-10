(function () {
  "use strict";

  // Configuration - Multiple endpoints for fallback
  const API_ENDPOINTS = [
    "/apps/doproductlabel/labels", // App Proxy (works when no password protection)
    "https://tr-bread-tickets-office.trycloudflare.com/apps/doproductlabel/labels", // Direct API (bypasses password protection)
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
    // Convert to string and trim whitespace for consistent comparison
    if (id === null || id === undefined) return null;
    return id.toString().trim();
  }

  function getCurrentProductId() {
    // Try to get product ID from various sources
    let productId = null;
    let productHandle = null;

    // PRIORITY 1: Get numeric product ID from product form (most reliable)
    const formInput = document.querySelector('input[name="id"]');
    if (formInput && formInput.value) {
      productId = formInput.value;
      console.log("DO Label: Found product ID from form input:", productId);
    }

    // PRIORITY 2: Get numeric product ID from product JSON script
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

    // PRIORITY 3: Get numeric product ID from data attributes
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

    // PRIORITY 4: Get product handle from meta tag (fallback for numeric ID lookup)
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

    // PRIORITY 5: Get product handle from URL (fallback for numeric ID lookup)
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
   *
   * This function handles different types of product ID configurations:
   * - Array of product IDs: [123, 456, 789]
   * - JSON string: "[123, 456, 789]" or "123"
   * - Single product ID: 123 or "123"
   * - Product handles: "hygain-flexion", "product-name"
   *
   * @param {Object} label - The label configuration object
   * @param {string|number} productId - The product ID or handle to check
   * @returns {boolean} - True if label should be shown, false otherwise
   */
  function shouldShowLabel(label, productId) {
    // Check if label is active - if not active, don't show
    // Default to true if active field is undefined (backward compatibility)
    if (label.active === false) {
      console.log("DO Label: Label is inactive, not showing:", label.text);
      return false;
    }

    // If active is undefined, treat as active (backward compatibility)
    if (label.active === true) {
      console.log(
        "DO Label: Label active status undefined, treating as active (backward compatibility):",
        label.text,
      );
    }

    // Normalize product ID for consistent comparison
    const normalizedProductId = normalizeProductId(productId);
    if (!normalizedProductId) {
      console.warn("DO Label: Product ID is null or undefined");
      return false;
    }

    // If no condition specified, show on all products
    if (
      !label.condition ||
      label.condition === "all" ||
      label.condition === ""
    ) {
      console.log(
        "DO Label: Showing label on all products (no condition specified)",
      );
      return true;
    }

    // Handle specific product condition
    if (label.condition === "specific") {
      // Check if productIds exists and is not empty
      if (
        !label.productIds ||
        label.productIds === "" ||
        label.productIds === "[]"
      ) {
        console.warn(
          "DO Label: Specific condition but no productIds specified",
        );
        return false;
      }

      // Case 1: productIds is already an array
      if (Array.isArray(label.productIds)) {
        const normalizedProductIds = label.productIds.map((id) =>
          normalizeProductId(id),
        );
        const isIncluded = normalizedProductIds.includes(normalizedProductId);

        // Additional check: if current product is a handle (non-numeric),
        // also check if any productIds match as handles
        let handleMatch = false;
        if (!isIncluded && !/^\d+$/.test(normalizedProductId)) {
          // Current product is a handle, check if any productIds are handles
          handleMatch = label.productIds.some((id) => {
            const normalizedId = normalizeProductId(id);
            return (
              normalizedId === normalizedProductId &&
              !/^\d+$/.test(normalizedId)
            );
          });
        }

        const finalResult = isIncluded || handleMatch;
        console.log(
          `DO Label: Product ${normalizedProductId} ${finalResult ? "found" : "not found"} in productIds array:`,
          {
            productIds: label.productIds,
            isNumericMatch: isIncluded,
            isHandleMatch: handleMatch,
            finalResult: finalResult,
          },
        );
        return finalResult;
      }

      // Case 2: productIds is a JSON string (could be array or single value)
      if (typeof label.productIds === "string") {
        try {
          const parsedProductIds = JSON.parse(label.productIds);
          if (Array.isArray(parsedProductIds)) {
            // JSON string contains an array of product IDs
            const normalizedParsedIds = parsedProductIds.map((id) =>
              normalizeProductId(id),
            );
            const isIncluded =
              normalizedParsedIds.includes(normalizedProductId);

            // Additional handle check for JSON arrays
            let handleMatch = false;
            if (!isIncluded && !/^\d+$/.test(normalizedProductId)) {
              handleMatch = parsedProductIds.some((id) => {
                const normalizedId = normalizeProductId(id);
                return (
                  normalizedId === normalizedProductId &&
                  !/^\d+$/.test(normalizedId)
                );
              });
            }

            const finalResult = isIncluded || handleMatch;
            console.log(
              `DO Label: Product ${normalizedProductId} ${finalResult ? "found" : "not found"} in parsed productIds array:`,
              {
                parsedIds: parsedProductIds,
                isNumericMatch: isIncluded,
                isHandleMatch: handleMatch,
                finalResult: finalResult,
              },
            );
            return finalResult;
          } else {
            // JSON string contains a single product ID (not an array)
            const normalizedParsedId = normalizeProductId(parsedProductIds);
            const isMatch = normalizedParsedId === normalizedProductId;
            console.log(
              `DO Label: Parsed productIds is not array, treating as single ID: ${isMatch ? "match" : "no match"}`,
              {
                parsed: normalizedParsedId,
                current: normalizedProductId,
                isNumeric: /^\d+$/.test(normalizedProductId),
                isHandle: !/^\d+$/.test(normalizedProductId),
              },
            );
            return isMatch;
          }
        } catch (error) {
          // JSON parsing failed - treat the string as a single product ID
          const normalizedLabelId = normalizeProductId(label.productIds);
          const isMatch = normalizedLabelId === normalizedProductId;
          console.log(
            `DO Label: JSON parse failed, treating as single ID: ${isMatch ? "match" : "no match"}`,
            {
              labelId: normalizedLabelId,
              productId: normalizedProductId,
              isNumeric: /^\d+$/.test(normalizedProductId),
              isHandle: !/^\d+$/.test(normalizedProductId),
            },
          );
          return isMatch;
        }
      }

      // Case 3: productIds is a number (single product ID)
      if (typeof label.productIds === "number") {
        const normalizedLabelId = normalizeProductId(label.productIds);
        const isMatch = normalizedLabelId === normalizedProductId;
        console.log(
          `DO Label: Product ${normalizedProductId} ${isMatch ? "match" : "no match"} with numeric productIds:`,
          {
            labelId: normalizedLabelId,
            productId: normalizedProductId,
            isNumeric: /^\d+$/.test(normalizedProductId),
            isHandle: !/^\d+$/.test(normalizedProductId),
          },
        );
        return isMatch;
      }

      // Unsupported format - hide label
      console.warn(
        "DO Label: productIds is not in expected format (expected: array, string, or number)",
        label.productIds,
      );
      return false;
    }

    // For any other condition type, show by default (can be extended later)
    console.log(
      `DO Label: Unknown condition "${label.condition}" - showing by default`,
    );
    return true;
  }

  function injectLabels(labels, productId) {
    // Find product image container with more comprehensive selectors
    const productImageContainer =
      // Dawn theme - try most specific first
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

  // Test function for debugging label display logic
  function testLabelLogic() {
    if (window.DO_LABEL_DEBUG) {
      console.group("DO Label: Testing Label Logic");

      // Test case 1: Array of product IDs (active)
      const testLabel1 = {
        condition: "specific",
        productIds: [123, 456, 789],
        text: "Test Array",
        active: true,
      };
      console.log("Test 1 - Array [123, 456, 789] (active):", {
        "Product 123": shouldShowLabel(testLabel1, 123),
        "Product 456": shouldShowLabel(testLabel1, 456),
        "Product 999": shouldShowLabel(testLabel1, 999),
      });

      // Test case 2: Array of product IDs (inactive)
      const testLabel1Inactive = {
        condition: "specific",
        productIds: [123, 456, 789],
        text: "Test Array Inactive",
        active: false,
      };
      console.log("Test 1b - Array [123, 456, 789] (inactive):", {
        "Product 123": shouldShowLabel(testLabel1Inactive, 123),
        "Product 456": shouldShowLabel(testLabel1Inactive, 456),
        "Product 999": shouldShowLabel(testLabel1Inactive, 999),
      });

      // Test case 3: JSON string array (active)
      const testLabel2 = {
        condition: "specific",
        productIds: "[123, 456, 789]",
        text: "Test JSON Array",
        active: true,
      };
      console.log('Test 2 - JSON String "[123, 456, 789]" (active):', {
        "Product 123": shouldShowLabel(testLabel2, 123),
        "Product 456": shouldShowLabel(testLabel2, 456),
        "Product 999": shouldShowLabel(testLabel2, 999),
      });

      // Test case 4: Single product ID (active)
      const testLabel3 = {
        condition: "specific",
        productIds: 123,
        text: "Test Single ID",
        active: true,
      };
      console.log("Test 3 - Single ID 123 (active):", {
        "Product 123": shouldShowLabel(testLabel3, 123),
        "Product 456": shouldShowLabel(testLabel3, 456),
      });

      // Test case 5: JSON string single ID (active)
      const testLabel4 = {
        condition: "specific",
        productIds: "123",
        text: "Test JSON Single ID",
        active: true,
      };
      console.log('Test 4 - JSON String "123" (active):', {
        "Product 123": shouldShowLabel(testLabel4, 123),
        "Product 456": shouldShowLabel(testLabel4, 456),
      });

      // Test case 6: All products (active)
      const testLabel5 = {
        condition: "all",
        text: "Test All Products",
        active: true,
      };
      console.log("Test 5 - All Products (active):", {
        "Product 123": shouldShowLabel(testLabel5, 123),
        "Product 456": shouldShowLabel(testLabel5, 456),
      });

      // Test case 7: All products (inactive)
      const testLabel5Inactive = {
        condition: "all",
        text: "Test All Products Inactive",
        active: false,
      };
      console.log("Test 5b - All Products (inactive):", {
        "Product 123": shouldShowLabel(testLabel5Inactive, 123),
        "Product 456": shouldShowLabel(testLabel5Inactive, 456),
      });

      console.groupEnd();
    }
  }

  // Main execution
  function init() {
    // Run test cases if debug mode is enabled
    testLabelLogic();

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
