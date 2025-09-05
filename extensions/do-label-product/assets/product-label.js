(function () {
  "use strict";

  // Configuration - Multiple endpoints for fallback
  const API_ENDPOINTS = [
    "/apps/doproductlabel/labels", // App Proxy (works when no password protection)
    "https://win-african-ink-sport.trycloudflare.com/apps/doproductlabel/labels", // Direct API (bypasses password protection)
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

  function getCurrentVariantId() {
    // Try to get current variant ID from various sources
    let variantId = null;

    // Method 1: Look for variant ID in form inputs
    const variantInputs = [
      'input[name="id"]',
      'input[name="variant-id"]',
      'input[name="variant_id"]',
      'input[name="product-variant-id"]',
      'input[name="product_variant_id"]',
    ];

    for (const selector of variantInputs) {
      const input = document.querySelector(selector);
      if (input && input.value) {
        variantId = input.value;
        console.log(`DO Label Product: Found variant ID with selector "${selector}":`, variantId);
        break;
      }
    }

    // Method 2: Look for variant ID in data attributes
    if (!variantId) {
      const variantSelectors = [
        '[data-variant-id]',
        '[data-product-variant-id]',
        '[data-selected-variant-id]',
        '[data-current-variant-id]',
      ];

      for (const selector of variantSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const value = element.getAttribute(selector.replace(/[[\]]/g, '')) || 
                      element.getAttribute('data-variant-id') ||
                      element.getAttribute('data-product-variant-id') ||
                      element.getAttribute('data-selected-variant-id') ||
                      element.getAttribute('data-current-variant-id');
          if (value) {
            variantId = value;
            console.log(`DO Label Product: Found variant ID with selector "${selector}":`, variantId);
            break;
          }
        }
      }
    }

    // Method 3: Look for variant ID in Shopify global objects
    if (!variantId && typeof window !== "undefined" && window.Shopify) {
      // Check Shopify.analytics.meta.product
      if (window.Shopify.analytics && window.Shopify.analytics.meta && window.Shopify.analytics.meta.product) {
        const productData = window.Shopify.analytics.meta.product;
        if (productData.variant_id) {
          variantId = productData.variant_id.toString();
          console.log("DO Label Product: Found variant ID in Shopify.analytics.meta.product:", variantId);
        }
      }

      // Check window.meta.product
      if (!variantId && window.meta && window.meta.product) {
        const productData = window.meta.product;
        if (productData.variant_id) {
          variantId = productData.variant_id.toString();
          console.log("DO Label Product: Found variant ID in window.meta.product:", variantId);
        }
      }
    }

    // Method 4: Look for variant ID in JSON script tags
    if (!variantId) {
      const scriptTags = document.querySelectorAll('script[type="application/json"]');
      for (const script of scriptTags) {
        try {
          const data = JSON.parse(script.textContent);
          if (data && data.product && data.product.selected_or_first_available_variant) {
            const variant = data.product.selected_or_first_available_variant;
            if (variant && variant.id) {
              variantId = variant.id.toString();
              console.log("DO Label Product: Found variant ID in JSON script tag:", variantId);
              break;
            }
          }
        } catch (error) {
          // Continue to next script
        }
      }
    }

    console.log("DO Label Product: Final variant ID:", variantId);
    return variantId;
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

    // Focus search on product-specific elements only
    const productSelectors = [
      ".product",
      ".product-single",
      ".product__info",
      ".product__details",
      ".product__content",
      ".product__description",
      ".product__title",
      ".product__price",
      ".product__meta",
      "[data-product]",
      "[data-product-id]",
      ".product-form",
      ".product-form__buttons",
    ];

    let searchElements = [];

    // Try to find product-specific containers first
    for (const selector of productSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        searchElements = Array.from(elements);
        console.log(
          `DO Label Product: Found product containers with selector: ${selector}`,
        );
        break;
      }
    }

    // If no product containers found, search more broadly but be more restrictive
    if (searchElements.length === 0) {
      console.log(
        "DO Label Product: No product containers found, using broader search",
      );
      searchElements = [document.body];
    }

    // Method 1: Look for "new" text indicators in product-specific elements
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

    for (const container of searchElements) {
      const elements = container.querySelectorAll("*");
      for (const element of elements) {
        const text = (element.textContent || "").toLowerCase().trim();
        if (
          text &&
          newTextIndicators.some((indicator) => text.includes(indicator)) &&
          // Additional check: make sure it's not just a common word
          text.length < 50 && // Avoid long text blocks
          !text.includes("news") && // Avoid "news"
          !text.includes("renew") && // Avoid "renew"
          !text.includes("renewal") // Avoid "renewal"
        ) {
          console.log(
            `DO Label Product: Found "new" indicator in text: "${text}"`,
          );
          return true;
        }
      }
    }

    // Method 2: Look for "new" class names or attributes in product-specific elements
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

    for (const container of searchElements) {
      for (const selector of newClassSelectors) {
        const element = container.querySelector(selector);
        if (element) {
          console.log(
            `DO Label Product: Found "new" indicator with selector: "${selector}"`,
          );
          return true;
        }
      }
    }

    // Method 3: Check for very specific new arrival indicators
    const specificNewSelectors = [
      ".badge--new",
      ".tag--new",
      ".label--new",
      ".product-badge--new",
      ".product-tag--new",
      "[data-badge='new']",
      "[data-tag='new']",
      "[data-label='new']",
    ];

    for (const container of searchElements) {
      for (const selector of specificNewSelectors) {
        const element = container.querySelector(selector);
        if (element) {
          console.log(
            `DO Label Product: Found specific new indicator with selector: "${selector}"`,
          );
          return true;
        }
      }
    }

    // If no indicators found, assume it's not new
    console.log(
      "DO Label Product: No new arrival indicators found, assuming not new",
    );
    return false;
  }

  // Fallback method to detect compare prices from theme structures
  function detectComparePriceFromTheme() {
    console.log("DO Label Product: detectComparePriceFromTheme called");

    // Focus search on product-specific containers first
    const productSelectors = [
      ".product",
      ".product-single",
      ".product__info",
      ".product__details",
      ".product__content",
      ".product__price",
      ".product__meta",
      "[data-product]",
      "[data-product-id]",
      ".product-form",
      ".product__wrapper",
      ".product__main",
      ".product__inner",
    ];

    let searchElements = [];

    // Try to find product-specific containers first
    for (const selector of productSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        searchElements = Array.from(elements);
        console.log(
          `DO Label Product: Found product containers with selector: ${selector}`,
        );
        break;
      }
    }

    // If no product containers found, search more broadly but be more restrictive
    if (searchElements.length === 0) {
      console.log(
        "DO Label Product: No product containers found, using broader search",
      );
      searchElements = [document.body];
    }

    // Method 1: Look for price elements with strikethrough or line-through styles
    for (const container of searchElements) {
      const strikethroughElements = container.querySelectorAll("*");
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
            console.log(
              "DO Label Product: Found strikethrough price element:",
              {
                element: el,
                text: text,
                className: el.className,
                tagName: el.tagName,
              },
            );
            return { element: el, text: text };
          }
        }
      }
    }

    // Method 2: Look for elements with "was" or "compare" in text content
    for (const container of searchElements) {
      const textElements = container.querySelectorAll("*");
      for (const el of textElements) {
        const text = (el.textContent || "").toLowerCase();
        if (
          (text.includes("was") ||
            text.includes("compare") ||
            text.includes("original") ||
            text.includes("regular") ||
            text.includes("list price") ||
            text.includes("msrp")) &&
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
    }

    // Method 3: Look for price elements that are visually different (smaller, grayed out)
    for (const container of searchElements) {
      const priceElements = container.querySelectorAll("*");
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
              color.includes("grey") ||
              color.includes("999") || // Common gray color values
              color.includes("666")
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
    }

    // Method 4: Look for multiple price elements and find the higher one (likely compare price)
    for (const container of searchElements) {
      const priceElements = container.querySelectorAll("*");
      const priceTexts = [];
      
      for (const el of priceElements) {
        const text = (el.textContent || "").trim();
        if (text && /\d+/.test(text) && el.children.length === 0) {
          // Extract numeric value
          const priceMatch = text.match(/[\d,]+\.?\d*/);
          if (priceMatch) {
            const priceValue = parseFloat(priceMatch[0].replace(/,/g, ""));
            if (!isNaN(priceValue) && priceValue > 0) {
              priceTexts.push({
                element: el,
                text: text,
                value: priceValue,
                className: el.className,
                tagName: el.tagName,
              });
            }
          }
        }
      }

      // If we found multiple prices, the higher one is likely the compare price
      if (priceTexts.length >= 2) {
        priceTexts.sort((a, b) => b.value - a.value);
        const highestPrice = priceTexts[0];
        const secondHighest = priceTexts[1];
        
        // Only consider it a compare price if there's a significant difference
        if (highestPrice.value > secondHighest.value * 1.1) { // 10% higher
          console.log(
            "DO Label Product: Found potential compare price (highest of multiple prices):",
            {
              element: highestPrice.element,
              text: highestPrice.text,
              value: highestPrice.value,
              secondHighest: secondHighest.value,
              className: highestPrice.className,
              tagName: highestPrice.tagName,
            },
          );
          return { element: highestPrice.element, text: highestPrice.text };
        }
      }
    }

    // Method 5: Try to get compare price from Shopify global objects
    if (typeof window !== "undefined" && window.Shopify) {
      console.log("DO Label Product: Checking Shopify global objects for compare price");
      
      // Check Shopify.analytics.meta.product
      if (window.Shopify.analytics && window.Shopify.analytics.meta && window.Shopify.analytics.meta.product) {
        const productData = window.Shopify.analytics.meta.product;
        if (productData.compare_at_price && productData.compare_at_price > 0) {
          console.log(
            "DO Label Product: Found compare price in Shopify.analytics.meta.product:",
            productData.compare_at_price,
          );
          return { element: null, text: productData.compare_at_price.toString() };
        }
      }

      // Check window.meta.product
      if (window.meta && window.meta.product) {
        const productData = window.meta.product;
        if (productData.compare_at_price && productData.compare_at_price > 0) {
          console.log(
            "DO Label Product: Found compare price in window.meta.product:",
            productData.compare_at_price,
          );
          return { element: null, text: productData.compare_at_price.toString() };
        }
      }

      // Check for product data in script tags
      const scriptTags = document.querySelectorAll('script[type="application/json"]');
      for (const script of scriptTags) {
        try {
          const data = JSON.parse(script.textContent);
          if (data && data.product && data.product.compare_at_price && data.product.compare_at_price > 0) {
            console.log(
              "DO Label Product: Found compare price in JSON script tag:",
              data.product.compare_at_price,
            );
            return { element: null, text: data.product.compare_at_price.toString() };
          }
        } catch (error) {
          // Continue to next script
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

    // Get current variant ID if available
    product.variantId = getCurrentVariantId();
    console.log(
      "DO Label Product: getCurrentProduct - variant ID:",
      product.variantId,
    );

    // Enhanced compare at price detection with more comprehensive selectors
    const comparePriceSelectors = [
      // Data attributes (highest priority)
      "[data-compare-price]",
      "[data-product-compare-price]",
      "[data-original-price]",
      "[data-was-price]",
      "[data-old-price]",
      "[data-price-compare]",
      "[data-product-compare-at-price]",
      "[data-variant-compare-at-price]",
      "[data-compare-at-price]",
      "[data-sale-price]",
      "[data-regular-price]",
      ".price-item--regular",
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
      // Additional fallback selectors
      ".price-item--compare",
      ".price-item--original",
      ".price-item--was",
      ".price-item--old",
      ".product__price-item--compare",
      ".product__price-item--original",
      ".product__price-item--was",
      ".product__price-item--old",
      // More specific product detail selectors
      ".product__price .price__compare",
      ".product-single__price .price__compare",
      ".product__details .price__compare",
      ".product__info .price__compare",
      ".product-form .price__compare",
      // Shopify 2.0 theme selectors
      ".price .price-item--sale",
      ".price .price-item--regular",
      ".product__price .price-item--sale",
      ".product__price .price-item--regular",
      // Additional common selectors
      ".sale-price",
      ".regular-price",
      ".compare-at-price",
      ".product__sale-price",
      ".product__regular-price",
      ".product__compare-at-price",
    ];

    let compareAtPriceElement = null;
    let selectedSelector = null;

    // Try each selector and log which one is found
    console.log("DO Label Product: Checking all compare price selectors:");
    
    // First, try to find variant-specific compare price elements
    if (product.variantId) {
      console.log(`DO Label Product: Looking for variant-specific compare price for variant ${product.variantId}`);
      
      // Look for variant-specific selectors first
      const variantSpecificSelectors = [
        `[data-variant-compare-at-price="${product.variantId}"]`,
        `[data-variant-compare-price="${product.variantId}"]`,
        `[data-variant-id="${product.variantId}"] [data-compare-price]`,
        `[data-variant-id="${product.variantId}"] [data-compare-at-price]`,
        `[data-selected-variant-id="${product.variantId}"] [data-compare-price]`,
        `[data-current-variant-id="${product.variantId}"] [data-compare-price]`,
      ];
      
      for (const selector of variantSpecificSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          console.log(
            `DO Label Product: Found variant-specific compare price element with selector "${selector}":`,
            {
              element: element,
              tagName: element.tagName,
              className: element.className,
              textContent: element.textContent,
              innerText: element.innerText,
              variantId: product.variantId,
            },
          );
          compareAtPriceElement = element;
          selectedSelector = selector;
          break;
        }
      }
    }
    
    // If no variant-specific element found, try general selectors
    if (!compareAtPriceElement) {
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
              dataCompareAtPrice: element.getAttribute("data-compare-at-price"),
              dataVariantCompareAtPrice: element.getAttribute("data-variant-compare-at-price"),
              dataSalePrice: element.getAttribute("data-sale-price"),
              dataRegularPrice: element.getAttribute("data-regular-price"),
              computedStyle: {
                display: getComputedStyle(element).display,
                visibility: getComputedStyle(element).visibility,
                opacity: getComputedStyle(element).opacity,
                textDecoration: getComputedStyle(element).textDecoration,
              },
            },
          );
          if (!compareAtPriceElement) {
            compareAtPriceElement = element;
            selectedSelector = selector;
          }
        } else {
          console.log(
            `DO Label Product: No element found with selector "${selector}"`,
          );
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
        compareAtPriceElement.getAttribute("data-compare-at-price") ||
        compareAtPriceElement.getAttribute("data-variant-compare-at-price") ||
        compareAtPriceElement.getAttribute("data-sale-price") ||
        compareAtPriceElement.getAttribute("data-regular-price") ||
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

        // Validate rule configuration - ensure we have at least one valid price
        const fromPriceValue = parseFloat(label.ruleConfig.from);
        const toPriceValue = parseFloat(label.ruleConfig.to);

        console.log(
          `DO Label Product: Label "${label.text}" - raw price values:`,
          {
            from: label.ruleConfig.from,
            to: label.ruleConfig.to,
            fromParsed: fromPriceValue,
            toParsed: toPriceValue,
            fromIsNaN: isNaN(fromPriceValue),
            toIsNaN: isNaN(toPriceValue),
          },
        );

        // Check if we have at least one valid price value
        if (isNaN(fromPriceValue) && isNaN(toPriceValue)) {
          console.warn(
            `DO Label Product: Label "${label.text}" - both from and to prices are invalid, not showing`,
          );
          return false;
        }

        // Additional check: if both values exist but are invalid, don't show
        if (
          label.ruleConfig.from &&
          label.ruleConfig.to &&
          isNaN(fromPriceValue) &&
          isNaN(toPriceValue)
        ) {
          console.warn(
            `DO Label Product: Label "${label.text}" - both provided prices are invalid, not showing`,
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
          console.log(
            `DO Label Product: Label "${label.text}" - product object:`,
            product,
          );
          return false; // No compare price, don't show label
        }

        // Additional validation: check if compareAtPrice is a valid number
        const comparePriceRaw = product.compareAtPrice;
        if (
          typeof comparePriceRaw !== "string" &&
          typeof comparePriceRaw !== "number"
        ) {
          console.warn(
            `DO Label Product: Label "${label.text}" - compareAtPrice is not a string or number:`,
            comparePriceRaw,
            typeof comparePriceRaw,
          );
          return false;
        }

        const comparePrice = parseFloat(product.compareAtPrice);

        console.log(
          `DO Label Product: Label "${label.text}" - compare price validation:`,
          {
            rawComparePrice: product.compareAtPrice,
            parsedComparePrice: comparePrice,
            isNaN: isNaN(comparePrice),
            isPositive: comparePrice > 0,
            isValid: !isNaN(comparePrice) && comparePrice > 0,
          },
        );

        // Validate compare price is a valid number
        if (isNaN(comparePrice) || comparePrice <= 0) {
          console.warn(
            `DO Label Product: Label "${label.text}" - invalid compare price: ${product.compareAtPrice}`,
          );
          return false;
        }

        // Process price range with proper validation
        let fromPrice, toPrice;

        if (isNaN(fromPriceValue) && isNaN(toPriceValue)) {
          // Both values are invalid - this should have been caught earlier
          console.warn(
            `DO Label Product: Label "${label.text}" - both from and to prices are invalid`,
          );
          return false;
        } else if (isNaN(fromPriceValue)) {
          // Only from price is invalid - require a valid to price
          if (isNaN(toPriceValue) || toPriceValue <= 0) {
            console.warn(
              `DO Label Product: Label "${label.text}" - from price invalid and to price is also invalid or <= 0`,
            );
            return false;
          }
          fromPrice = 0;
          toPrice = toPriceValue;
          console.log(
            `DO Label Product: Label "${label.text}" - from price invalid, using 0 as default. Range: 0 to ${toPrice}`,
          );
        } else if (isNaN(toPriceValue)) {
          // Only to price is invalid - require a valid from price
          if (isNaN(fromPriceValue) || fromPriceValue <= 0) {
            console.warn(
              `DO Label Product: Label "${label.text}" - to price invalid and from price is also invalid or <= 0`,
            );
            return false;
          }
          fromPrice = fromPriceValue;
          toPrice = 999999;
          console.log(
            `DO Label Product: Label "${label.text}" - to price invalid, using 999999 as default. Range: ${fromPrice} to 999999`,
          );
        } else {
          // Both values are valid
          fromPrice = fromPriceValue;
          toPrice = toPriceValue;
          console.log(
            `DO Label Product: Label "${label.text}" - both prices valid. Range: ${fromPrice} to ${toPrice}`,
          );
        }

        // Additional validation: ensure we have valid price range
        if (isNaN(fromPrice) || isNaN(toPrice)) {
          console.warn(
            `DO Label Product: Label "${label.text}" - invalid price range after processing: from=${fromPrice}, to=${toPrice}`,
          );
          return false;
        }

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
        const isInRange = comparePrice >= fromPrice && comparePrice <= toPrice;

        // Additional edge case validation - warn if range is too broad
        if (fromPrice === 0 && toPrice === 999999) {
          console.warn(
            `DO Label Product: Label "${label.text}" - WARNING: Very broad price range (0-999999), this may show on all products!`,
          );
        }

        // Check if range is too broad (more than 1000x difference)
        const rangeRatio = toPrice / fromPrice;
        if (rangeRatio > 1000 && fromPrice > 0) {
          console.warn(
            `DO Label Product: Label "${label.text}" - WARNING: Very broad price range (${fromPrice}-${toPrice}), ratio: ${rangeRatio.toFixed(2)}x`,
          );
        }

        console.log(
          `DO Label Product: Label "${label.text}" - price range check:`,
          {
            comparePrice: comparePrice,
            fromPrice: fromPrice,
            toPrice: toPrice,
            isInRange: isInRange,
            condition: `${comparePrice} >= ${fromPrice} && ${comparePrice} <= ${toPrice}`,
            result: isInRange ? "SHOW LABEL" : "HIDE LABEL",
          },
        );

        if (!isInRange) {
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

        // Validate rule configuration
        if (!label.ruleConfig.days || isNaN(parseInt(label.ruleConfig.days))) {
          console.warn(
            `DO Label Product: Label "${label.text}" - invalid new arrival rule configuration`,
          );
          return false;
        }

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
          // But be more conservative - only show if we find strong indicators
          const fallbackResult = checkNewArrivalFallback(label);
          console.log(
            `DO Label Product: Label "${label.text}" - fallback result: ${fallbackResult}`,
          );
          return fallbackResult;
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

  // Function to re-inject labels when variant changes
  function reInjectLabelsOnVariantChange() {
    console.log("DO Label Product: Variant change detected, re-injecting labels");
    
    // Small delay to allow DOM to update
    setTimeout(() => {
      initProductLabels();
    }, 100);
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

  // Listen for variant changes
  function setupVariantChangeListeners() {
    console.log("DO Label Product: Setting up variant change listeners");

    // Listen for form changes (variant selectors)
    const variantSelectors = [
      'select[name="id"]',
      'select[name="variant-id"]',
      'select[name="variant_id"]',
      'input[name="id"]',
      'input[name="variant-id"]',
      'input[name="variant_id"]',
      '.variant-selector',
      '.product-variant-selector',
      '[data-variant-selector]',
    ];

    variantSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        element.addEventListener('change', reInjectLabelsOnVariantChange);
        console.log(`DO Label Product: Added change listener to ${selector}`);
      });
    });

    // Listen for click events on variant options
    const variantOptions = [
      '.variant-option',
      '.product-variant-option',
      '[data-variant-option]',
      '.size-option',
      '.color-option',
      '.option-value',
    ];

    variantOptions.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        element.addEventListener('click', reInjectLabelsOnVariantChange);
        console.log(`DO Label Product: Added click listener to ${selector}`);
      });
    });

    // Listen for custom variant change events
    document.addEventListener('variant:change', reInjectLabelsOnVariantChange);
    document.addEventListener('product:variant-change', reInjectLabelsOnVariantChange);
    document.addEventListener('variantChange', reInjectLabelsOnVariantChange);
    document.addEventListener('productVariantChange', reInjectLabelsOnVariantChange);

    // Listen for URL changes (for some themes that use URL parameters)
    let lastUrl = window.location.href;
    const urlChangeObserver = new MutationObserver(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        console.log("DO Label Product: URL changed, checking for variant change");
        reInjectLabelsOnVariantChange();
      }
    });
    urlChangeObserver.observe(document, { subtree: true, childList: true });

    console.log("DO Label Product: Variant change listeners setup complete");
  }

  // Setup variant change listeners when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupVariantChangeListeners);
  } else {
    setupVariantChangeListeners();
  }
})();
