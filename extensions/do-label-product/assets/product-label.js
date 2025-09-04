(function () {
  "use strict";

  // Configuration - Multiple endpoints for fallback
  const API_ENDPOINTS = [
    "/apps/doproductlabel/labels", // App Proxy (works when no password protection)
    "https://hungarian-laos-tourist-proposals.trycloudflare.com/apps/doproductlabel/labels", // Direct API (bypasses password protection)
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

  // Get product creation date from various DOM sources
  function getProductCreationDate() {
    console.log("DO Label Product: getProductCreationDate called");

    // Method 1: Look for data attributes with creation date
    const creationDateSelectors = [
      "[data-product-created-at]",
      "[data-product-creation-date]",
      "[data-product-date]",
      "[data-created-at]",
      "[data-creation-date]",
      "[data-date-created]",
      "[data-product-published-at]",
      "[data-published-at]",
    ];

    for (const selector of creationDateSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const dateValue =
          element.getAttribute(selector.replace(/[[\]]/g, "")) ||
          element.textContent;
        if (dateValue) {
          console.log(
            `DO Label Product: Found creation date with selector "${selector}":`,
            dateValue,
          );
          const parsedDate = parseDateString(dateValue);
          if (parsedDate) {
            return parsedDate;
          }
        }
      }
    }

    // Method 2: Look for JSON-LD structured data
    const jsonLdScripts = document.querySelectorAll(
      'script[type="application/ld+json"]',
    );
    for (const script of jsonLdScripts) {
      try {
        const data = JSON.parse(script.textContent);
        if (data && data["@type"] === "Product") {
          const dateCreated =
            data.dateCreated || data.datePublished || data.createdAt;
          if (dateCreated) {
            console.log(
              "DO Label Product: Found creation date in JSON-LD:",
              dateCreated,
            );
            const parsedDate = parseDateString(dateCreated);
            if (parsedDate) {
              return parsedDate;
            }
          }
        }
      } catch (error) {
        // Continue to next script
      }
    }

    // Method 3: Look for meta tags
    const metaSelectors = [
      'meta[property="product:created_time"]',
      'meta[property="product:published_time"]',
      'meta[name="product:created_time"]',
      'meta[name="product:published_time"]',
      'meta[property="article:published_time"]',
    ];

    for (const selector of metaSelectors) {
      const meta = document.querySelector(selector);
      if (meta) {
        const content = meta.getAttribute("content");
        if (content) {
          console.log(
            `DO Label Product: Found creation date in meta "${selector}":`,
            content,
          );
          const parsedDate = parseDateString(content);
          if (parsedDate) {
            return parsedDate;
          }
        }
      }
    }

    // Method 4: Look for Shopify-specific data
    if (typeof window.Shopify !== "undefined" && window.Shopify.analytics) {
      const productData = window.Shopify.analytics.meta?.product;
      if (productData && productData.created_at) {
        console.log(
          "DO Label Product: Found creation date in Shopify analytics:",
          productData.created_at,
        );
        const parsedDate = parseDateString(productData.created_at);
        if (parsedDate) {
          return parsedDate;
        }
      }
    }

    console.log("DO Label Product: No product creation date found");
    return null;
  }

  // Parse various date string formats
  function parseDateString(dateString) {
    if (!dateString) return null;

    // Try different date formats
    const formats = [
      // ISO 8601 formats
      dateString,
      // Unix timestamp (seconds)
      new Date(parseInt(dateString) * 1000),
      // Unix timestamp (milliseconds)
      new Date(parseInt(dateString)),
    ];

    for (const format of formats) {
      const date = new Date(format);
      if (!isNaN(date.getTime()) && date.getFullYear() > 2000) {
        console.log(
          `DO Label Product: Successfully parsed date: ${dateString} -> ${date.toISOString()}`,
        );
        return date;
      }
    }

    console.log(`DO Label Product: Failed to parse date: ${dateString}`);
    return null;
  }

  // Calculate days since creation
  function getDaysSinceCreation(createdDate) {
    if (!createdDate) return Infinity;

    const now = new Date();
    const diffTime = Math.abs(now - createdDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    console.log(`DO Label Product: Days since creation: ${diffDays}`);
    return diffDays;
  }

  // Fallback method to detect new arrivals when creation date is not available
  function checkNewArrivalFallback(label) {
    console.log("DO Label Product: checkNewArrivalFallback called");

    // Method 1: Look for "new" text indicators
    const newTextIndicators = [
      "new",
      "nouveau",
      "nuevo",
      "neu",
      "ny",
      "mới",
      "mới về",
      "hàng mới",
    ];

    const allElements = document.querySelectorAll("*");
    for (const element of allElements) {
      const text = (element.textContent || "").toLowerCase().trim();
      if (
        text &&
        newTextIndicators.some((indicator) => text.includes(indicator))
      ) {
        console.log(
          `DO Label Product: Found "new" indicator in text: "${text}"`,
        );
        return true;
      }
    }

    // Method 2: Look for "new" class names or attributes
    const newClassSelectors = [
      ".new",
      ".new-product",
      ".new-arrival",
      ".latest",
      ".recent",
      "[data-new]",
      "[data-new-product]",
      "[data-new-arrival]",
    ];

    for (const selector of newClassSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log(
          `DO Label Product: Found "new" indicator with selector: "${selector}"`,
        );
        return true;
      }
    }

    // Method 3: Check if product has very recent price changes (indicating it might be new)
    const priceElements = document.querySelectorAll(
      "[data-price], .price, .money",
    );
    for (const element of priceElements) {
      const priceText = element.textContent || "";
      if (
        priceText.includes("$") ||
        priceText.includes("€") ||
        priceText.includes("£")
      ) {
        // If we can't determine creation date, assume it's not new
        console.log(
          "DO Label Product: No new arrival indicators found, assuming not new",
        );
        return false;
      }
    }

    console.log("DO Label Product: No new arrival indicators found");
    return false;
  }

  // Fallback method to detect compare prices from theme structures
  function detectComparePriceFromTheme() {
    console.log("DO Label Product: detectComparePriceFromTheme called");

    // Method 1: Look for price elements with strikethrough or line-through styles
    const strikethroughElements = document.querySelectorAll("*");
    for (const el of strikethroughElements) {
      const style = getComputedStyle(el);
      if (
        style.textDecoration.includes("line-through") ||
        style.textDecoration.includes("strikethrough") ||
        el.style.textDecoration.includes("line-through") ||
        el.style.textDecoration.includes("strikethrough")
      ) {
        const text = (el.textContent || "").trim();
        if (text && /\d+/.test(text)) {
          console.log("DO Label Product: Found strikethrough price element:", {
            element: el,
            text: text,
            className: el.className,
            tagName: el.tagName,
          });
          return { element: el, text: text };
        }
      }
    }

    // Method 2: Look for elements with "was" or "compare" in text content
    const textElements = document.querySelectorAll("*");
    for (const el of textElements) {
      const text = (el.textContent || "").toLowerCase();
      if (
        (text.includes("was") ||
          text.includes("compare") ||
          text.includes("original")) &&
        /\d+/.test(text) &&
        el.children.length === 0
      ) {
        console.log(
          "DO Label Product: Found price element with 'was/compare' text:",
          {
            element: el,
            text: el.textContent,
            className: el.className,
            tagName: el.tagName,
          },
        );
        return { element: el, text: el.textContent };
      }
    }

    // Method 3: Look for price elements that are visually different (smaller, grayed out)
    const priceElements = document.querySelectorAll("*");
    for (const el of priceElements) {
      const text = (el.textContent || "").trim();
      if (text && /\d+/.test(text) && el.children.length === 0) {
        const style = getComputedStyle(el);
        const fontSize = parseFloat(style.fontSize);
        const color = style.color;

        // Check if it's smaller than parent or has a grayed out color
        const parent = el.parentElement;
        if (parent) {
          const parentStyle = getComputedStyle(parent);
          const parentFontSize = parseFloat(parentStyle.fontSize);

          if (
            fontSize < parentFontSize ||
            color.includes("128") || // Gray colors often have 128 in RGB
            color.includes("gray") ||
            color.includes("grey")
          ) {
            console.log(
              "DO Label Product: Found smaller/grayed price element:",
              {
                element: el,
                text: text,
                className: el.className,
                tagName: el.tagName,
                fontSize: fontSize,
                parentFontSize: parentFontSize,
                color: color,
              },
            );
            return { element: el, text: text };
          }
        }
      }
    }

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

    // Enhanced compare at price detection with more comprehensive selectors
    const comparePriceSelectors = [
      // Data attributes
      "[data-compare-price]",
      "[data-product-compare-price]",
      "[data-original-price]",
      "[data-was-price]",
      "[data-old-price]",
      "[data-price-compare]",
      // Class-based selectors
      ".price__compare",
      ".product__price--compare",
      ".product-single__price--compare",
      ".price-compare",
      ".compare-price",
      ".original-price",
      ".was-price",
      ".old-price",
      ".price-original",
      ".price-was",
      ".price-old",
      ".product-price-compare",
      ".product-price-original",
      ".product-price-was",
      ".product-price-old",
      // Theme-specific selectors
      ".money-compare",
      ".money-original",
      ".money-was",
      ".money-old",
      ".product-money-compare",
      ".product-money-original",
      ".product-money-was",
      ".product-money-old",
      // Generic selectors
      ".price .compare",
      ".price .original",
      ".price .was",
      ".price .old",
      ".product-price .compare",
      ".product-price .original",
      ".product-price .was",
      ".product-price .old",
      // Shopify Liquid variables (if available in DOM)
      "[data-product-compare-at-price]",
      "[data-variant-compare-at-price]",
      // Additional fallback selectors
      ".price-item--compare",
      ".price-item--original",
      ".price-item--was",
      ".price-item--old",
      ".product__price-item--compare",
      ".product__price-item--original",
      ".product__price-item--was",
      ".product__price-item--old",
    ];

    let compareAtPriceElement = null;
    let selectedSelector = null;

    // Try each selector and log which one is found
    console.log("DO Label Product: Checking all compare price selectors:");
    for (const selector of comparePriceSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log(
          `DO Label Product: Found compare price element with selector "${selector}":`,
          {
            element: element,
            tagName: element.tagName,
            className: element.className,
            textContent: element.textContent,
            innerText: element.innerText,
            dataComparePrice: element.getAttribute("data-compare-price"),
            dataProductComparePrice: element.getAttribute(
              "data-product-compare-price",
            ),
            dataOriginalPrice: element.getAttribute("data-original-price"),
            dataWasPrice: element.getAttribute("data-was-price"),
            dataOldPrice: element.getAttribute("data-old-price"),
          },
        );
        if (!compareAtPriceElement) {
          compareAtPriceElement = element;
          selectedSelector = selector;
        }
      }
    }

    console.log(
      `DO Label Product: getCurrentProduct - compareAtPriceElement found with selector "${selectedSelector}":`,
      compareAtPriceElement,
    );

    if (compareAtPriceElement) {
      // Try multiple methods to get the price text
      let comparePriceText =
        compareAtPriceElement.textContent ||
        compareAtPriceElement.innerText ||
        compareAtPriceElement.getAttribute("data-compare-price") ||
        compareAtPriceElement.getAttribute("data-product-compare-price") ||
        compareAtPriceElement.getAttribute("data-original-price") ||
        compareAtPriceElement.getAttribute("data-was-price") ||
        compareAtPriceElement.getAttribute("data-old-price") ||
        "";

      console.log(
        "DO Label Product: getCurrentProduct - comparePriceText:",
        comparePriceText,
      );

      if (comparePriceText && comparePriceText.trim()) {
        // Enhanced price extraction with better regex patterns
        const pricePatterns = [
          // Standard price patterns
          /[\d,]+\.?\d*/g,
          // Currency-specific patterns
          /\$[\d,]+\.?\d*/g,
          /€[\d,]+\.?\d*/g,
          /£[\d,]+\.?\d*/g,
          /¥[\d,]+\.?\d*/g,
          // Decimal patterns
          /[\d,]+\.\d{2}/g,
          /[\d,]+\.\d{1}/g,
          // Integer patterns
          /[\d,]+/g,
        ];

        let extractedPrice = null;
        for (const pattern of pricePatterns) {
          const matches = comparePriceText.match(pattern);
          if (matches && matches.length > 0) {
            // Get the first match and clean it
            let price = matches[0];
            // Remove currency symbols and commas
            price = price.replace(/[$€£¥,]/g, "");
            // Validate it's a number
            if (!isNaN(price) && parseFloat(price) > 0) {
              extractedPrice = price;
              break;
            }
          }
        }

        console.log(
          "DO Label Product: getCurrentProduct - extracted price:",
          extractedPrice,
        );

        if (extractedPrice) {
          product.compareAtPrice = extractedPrice;
          console.log(
            "DO Label Product: getCurrentProduct - final compare price:",
            product.compareAtPrice,
          );
        } else {
          console.log(
            "DO Label Product: getCurrentProduct - could not extract valid price from text:",
            comparePriceText,
          );
        }
      }
    } else {
      console.log(
        "DO Label Product: getCurrentProduct - no compare price element found with standard selectors",
      );

      // Try fallback method to detect compare prices from theme structures
      console.log(
        "DO Label Product: Trying fallback price detection methods...",
      );
      const fallbackResult = detectComparePriceFromTheme();

      if (fallbackResult) {
        console.log(
          "DO Label Product: Fallback method found compare price element:",
          fallbackResult,
        );

        const comparePriceText = fallbackResult.text;
        if (comparePriceText && comparePriceText.trim()) {
          // Use the same enhanced price extraction logic
          const pricePatterns = [
            /[\d,]+\.?\d*/g,
            /\$[\d,]+\.?\d*/g,
            /€[\d,]+\.?\d*/g,
            /£[\d,]+\.?\d*/g,
            /¥[\d,]+\.?\d*/g,
            /[\d,]+\.\d{2}/g,
            /[\d,]+\.\d{1}/g,
            /[\d,]+/g,
          ];

          let extractedPrice = null;
          for (const pattern of pricePatterns) {
            const matches = comparePriceText.match(pattern);
            if (matches && matches.length > 0) {
              let price = matches[0];
              price = price.replace(/[$€£¥,]/g, "");
              if (!isNaN(price) && parseFloat(price) > 0) {
                extractedPrice = price;
                break;
              }
            }
          }

          if (extractedPrice) {
            product.compareAtPrice = extractedPrice;
            console.log(
              "DO Label Product: getCurrentProduct - fallback extracted price:",
              product.compareAtPrice,
            );
          }
        }
      } else {
        console.log(
          "DO Label Product: getCurrentProduct - fallback methods also failed",
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

        // Validate rule configuration
        if (!label.ruleConfig.from && !label.ruleConfig.to) {
          console.warn(
            `DO Label Product: Label "${label.text}" - special price rule has no valid configuration`,
          );
          return false;
        }

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

        // Validate compare price is a valid number
        if (isNaN(comparePrice) || comparePrice <= 0) {
          console.warn(
            `DO Label Product: Label "${label.text}" - invalid compare price: ${product.compareAtPrice}`,
          );
          return false;
        }

        let fromPrice = parseFloat(label.ruleConfig.from) || 0;
        let toPrice = parseFloat(label.ruleConfig.to) || 999999;

        // Validate price range
        if (fromPrice < 0 || toPrice < 0) {
          console.warn(
            `DO Label Product: Label "${label.text}" - invalid price range: from=${fromPrice}, to=${toPrice}`,
          );
          return false;
        }

        if (fromPrice > toPrice) {
          console.warn(
            `DO Label Product: Label "${label.text}" - from price (${fromPrice}) is greater than to price (${toPrice}), swapping values`,
          );
          const temp = fromPrice;
          fromPrice = toPrice;
          toPrice = temp;
        }

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

      // New Arrival Rule - Enhanced to detect recently created products
      if (label.ruleType === "new_arrival" && label.ruleConfig) {
        console.log(
          `DO Label Product: Label "${label.text}" - checking new arrival rule`,
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

        // Try to get product creation date
        const productCreatedAt = getProductCreationDate();
        console.log(
          `DO Label Product: Label "${label.text}" - product creation date:`,
          productCreatedAt,
        );

        if (!productCreatedAt) {
          console.log(
            `DO Label Product: Label "${label.text}" - no creation date found, using fallback method`,
          );
          // Fallback: Check if product has "new" indicators in DOM
          return checkNewArrivalFallback(label);
        }

        const daysSinceCreation = getDaysSinceCreation(productCreatedAt);
        const maxDays = parseInt(label.ruleConfig.days) || 30;

        console.log(
          `DO Label Product: Label "${label.text}" - days since creation: ${daysSinceCreation}, max days: ${maxDays}`,
        );

        if (daysSinceCreation <= maxDays) {
          console.log(
            `DO Label Product: Label "${label.text}" - product is new arrival, showing`,
          );
          return true;
        } else {
          console.log(
            `DO Label Product: Label "${label.text}" - product is not new arrival, not showing`,
          );
          return false;
        }
      }
    }

    // CONDITION 4: Show only on specific products (no rule-based conditions allowed)
    if (label.condition === "specific") {
      // For specific products, only check if current product is in the selected list
      // No additional rule-based conditions are allowed
      console.log(
        `DO Label Product: Label "${label.text}" - checking specific products only (no rule-based conditions)`,
      );
      return false; // This should not be reached as specific products are handled in CONDITION 2
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

    // Check available price elements with comprehensive selectors
    const allPriceSelectors = [
      "[data-compare-price]",
      "[data-product-compare-price]",
      "[data-original-price]",
      "[data-was-price]",
      "[data-old-price]",
      "[data-price-compare]",
      ".price__compare",
      ".product__price--compare",
      ".product-single__price--compare",
      ".price-compare",
      ".compare-price",
      ".original-price",
      ".was-price",
      ".old-price",
      ".price-original",
      ".price-was",
      ".price-old",
      ".product-price-compare",
      ".product-price-original",
      ".product-price-was",
      ".product-price-old",
      ".money-compare",
      ".money-original",
      ".money-was",
      ".money-old",
      ".product-money-compare",
      ".product-money-original",
      ".product-money-was",
      ".product-money-old",
      ".price .compare",
      ".price .original",
      ".price .was",
      ".price .old",
      ".product-price .compare",
      ".product-price .original",
      ".product-price .was",
      ".product-price .old",
      "[data-product-compare-at-price]",
      "[data-variant-compare-at-price]",
      ".price-item--compare",
      ".price-item--original",
      ".price-item--was",
      ".price-item--old",
      ".product__price-item--compare",
      ".product__price-item--original",
      ".product__price-item--was",
      ".product__price-item--old",
    ];

    const allPriceElements = document.querySelectorAll(
      allPriceSelectors.join(", "),
    );
    console.log("Available Price Elements (Comprehensive):", {
      total: allPriceElements.length,
      selectors: allPriceSelectors,
      elements: Array.from(allPriceElements).map((el, index) => ({
        index: index + 1,
        tagName: el.tagName,
        className: el.className,
        id: el.id,
        textContent: el.textContent,
        innerText: el.innerText,
        dataComparePrice: el.getAttribute("data-compare-price"),
        dataProductComparePrice: el.getAttribute("data-product-compare-price"),
        dataOriginalPrice: el.getAttribute("data-original-price"),
        dataWasPrice: el.getAttribute("data-was-price"),
        dataOldPrice: el.getAttribute("data-old-price"),
        dataPriceCompare: el.getAttribute("data-price-compare"),
        dataProductCompareAtPrice: el.getAttribute(
          "data-product-compare-at-price",
        ),
        dataVariantCompareAtPrice: el.getAttribute(
          "data-variant-compare-at-price",
        ),
        computedStyle: {
          display: getComputedStyle(el).display,
          visibility: getComputedStyle(el).visibility,
          opacity: getComputedStyle(el).opacity,
        },
      })),
    });

    // Also check for any elements containing price-related text
    const allElements = document.querySelectorAll("*");
    const priceTextElements = Array.from(allElements).filter((el) => {
      const text = (el.textContent || "").trim();
      return (
        text &&
        (text.includes("$") ||
          text.includes("€") ||
          text.includes("£") ||
          text.includes("¥") ||
          /\d+\.\d{2}/.test(text) ||
          /\d+,\d{2}/.test(text)) &&
        el.children.length === 0
      ); // Only leaf elements
    });

    console.log("Elements with Price-like Text:", {
      total: priceTextElements.length,
      elements: priceTextElements.slice(0, 20).map((el, index) => ({
        index: index + 1,
        tagName: el.tagName,
        className: el.className,
        textContent: el.textContent,
        parentTagName: el.parentElement?.tagName,
        parentClassName: el.parentElement?.className,
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
