(function () {
  "use strict";

  // Configuration - Multiple endpoints for fallback
  const API_ENDPOINTS = [
    "/apps/doproductlabel/labels", // App Proxy (works when no password protection)
    "https://tune-lakes-order-apparently.trycloudflare.com/apps/doproductlabel/labels", // Direct API (bypasses password protection)
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

  // Utility functions
  function getCurrentProductId() {
    console.log("DO Label: Attempting to get current product ID...");

    // Try to get product ID from various sources
    let productId = null;

    // From meta tag
    const metaUrl = document.querySelector('meta[property="og:url"]')?.content;
    if (metaUrl) {
      const match = metaUrl.match(/products\/([^?]+)/);
      if (match) {
        productId = match[1];
        console.log(`DO Label: Found product ID from meta tag: ${productId}`);
      }
    }

    // From URL if not found from meta
    if (!productId) {
      const urlMatch = window.location.pathname.match(/products\/([^?]+)/);
      if (urlMatch) {
        productId = urlMatch[1];
        console.log(`DO Label: Found product ID from URL: ${productId}`);
      }
    }

    // From product form
    if (!productId) {
      const formInput = document.querySelector('input[name="id"]');
      if (formInput && formInput.value) {
        productId = formInput.value;
        console.log(`DO Label: Found product ID from form input: ${productId}`);
      }
    }

    // From product JSON
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
              `DO Label: Found product ID from product JSON: ${productId}`,
            );
          }
        } catch (error) {
          console.log(`DO Label: Failed to parse product JSON:`, error);
        }
      }
    }

    // From data attributes
    if (!productId) {
      const productElement = document.querySelector("[data-product-id]");
      if (productElement) {
        productId = productElement.getAttribute("data-product-id");
        console.log(
          `DO Label: Found product ID from data attribute: ${productId}`,
        );
      }
    }

    if (productId) {
      console.log(
        `DO Label: Final product ID: ${productId} (type: ${typeof productId})`,
      );
    } else {
      console.log(`DO Label: Could not find product ID. Available sources:`, {
        metaUrl: document.querySelector('meta[property="og:url"]')?.content,
        currentPath: window.location.pathname,
        formInput: document.querySelector('input[name="id"]')?.value,
        productJson:
          document
            .querySelector('script[type="application/json"][data-product-json]')
            ?.textContent?.substring(0, 100) + "...",
        dataAttribute: document
          .querySelector("[data-product-id]")
          ?.getAttribute("data-product-id"),
      });
    }

    return productId;
  }

  function createLabelElement(label) {
    const labelEl = document.createElement("div");
    labelEl.className = "do-product-label";
    labelEl.textContent = label.text;

    console.log(
      `DO Label: Creating label element for "${label.text}" with background ${label.background}`,
    );

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
        console.log(
          `DO Label: Applied valid background color: ${label.background}`,
        );
      } else {
        // Try to convert to hex if it's a color name
        const tempDiv = document.createElement("div");
        tempDiv.style.color = label.background;
        document.body.appendChild(tempDiv);
        const computedColor = getComputedStyle(tempDiv).color;
        document.body.removeChild(tempDiv);

        if (computedColor !== "rgba(0, 0, 0, 0)") {
          labelEl.style.backgroundColor = computedColor;
          console.log(
            `DO Label: Converted color name "${label.background}" to: ${computedColor}`,
          );
        } else {
          // Fallback to default color
          labelEl.style.backgroundColor = "#ff0000";
          console.warn(
            `DO Label: Invalid background color "${label.background}", using fallback: #ff0000`,
          );
        }
      }
    } else {
      console.warn(
        `DO Label: No background color specified for label "${label.text}", using default`,
      );
      labelEl.style.backgroundColor = "#ff0000";
    }

    // Position the label
    const position = label.position || "top-left";
    console.log(`DO Label: Positioning label "${label.text}" at "${position}"`);

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
        console.warn(
          `DO Label: Unknown position "${position}", using top-left`,
        );
        labelEl.style.top = "10px";
        labelEl.style.left = "10px";
        break;
    }

    console.log(`DO Label: Applied styles for "${label.text}":`, {
      top: labelEl.style.top,
      left: labelEl.style.left,
      right: labelEl.style.right,
      bottom: labelEl.style.bottom,
      transform: labelEl.style.transform,
      position: labelEl.style.position,
      zIndex: labelEl.style.zIndex,
      backgroundColor: labelEl.style.backgroundColor,
    });

    return labelEl;
  }

  function shouldShowLabel(label, productId) {
    console.log(`DO Label: Checking condition for label "${label.text}":`, {
      labelCondition: label.condition,
      labelProductIds: label.productIds,
      currentProductId: productId,
      productIdType: typeof productId,
      productIdsType: typeof label.productIds,
    });

    // If no condition specified, show on all products
    if (
      !label.condition ||
      label.condition === "all" ||
      label.condition === ""
    ) {
      console.log(
        `DO Label: No condition specified, showing label "${label.text}" on all products`,
      );
      return true;
    }

    // Check if product is in the specific product list
    if (label.productIds && Array.isArray(label.productIds)) {
      const isIncluded = label.productIds.includes(productId);
      console.log(
        `DO Label: Product ${productId} in productIds array:`,
        isIncluded,
      );
      return isIncluded;
    }

    // If productIds is a string, try to parse it as JSON
    if (label.productIds && typeof label.productIds === "string") {
      try {
        const parsedProductIds = JSON.parse(label.productIds);
        if (Array.isArray(parsedProductIds)) {
          const isIncluded = parsedProductIds.includes(productId);
          console.log(
            `DO Label: Product ${productId} in parsed productIds:`,
            isIncluded,
          );
          return isIncluded;
        }
      } catch (error) {
        console.log(`DO Label: Failed to parse productIds string:`, error);
      }
    }

    // Add more condition logic here as needed
    console.log(
      `DO Label: No specific condition matched, showing label "${label.text}" by default`,
    );
    return true;
  }

  function injectLabels(labels, productId) {
    // Find product image container with more comprehensive selectors
    const productImageContainer =
      // Dawn theme
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
      console.log(
        "DO Label: Product image container not found. Available containers:",
        {
          mediaContainer: document.querySelector(".product__media-container"),
          mediaItem: document.querySelector(".product__media-item"),
          singleMedia: document.querySelector(".product-single__media"),
          imageContainer: document.querySelector(".product__image-container"),
          productImage: document.querySelector("[data-product-image]"),
          productPhoto: document.querySelector(".product__photo"),
          productMedia: document.querySelector(".product__media"),
          productSingle: document.querySelector(".product-single"),
        },
      );
      return;
    }

    console.log(
      "DO Label: Found container:",
      productImageContainer.className,
      productImageContainer,
    );

    // Set container to relative positioning if needed
    const containerPosition = getComputedStyle(productImageContainer).position;
    console.log(`DO Label: Container position before: ${containerPosition}`);

    if (containerPosition === "static") {
      productImageContainer.style.position = "relative";
      console.log(`DO Label: Set container position to relative`);
    } else {
      console.log(
        `DO Label: Container already has position: ${containerPosition}`,
      );
    }

    // Filter and inject labels
    console.log(
      `DO Label: Processing ${labels.length} labels for product ${productId}`,
    );

    labels.forEach((label, index) => {
      console.log(`DO Label: Processing label ${index + 1}:`, {
        text: label.text,
        position: label.position,
        condition: label.condition,
        productIds: label.productIds,
        background: label.background,
        backgroundType: typeof label.background,
        shouldShow: shouldShowLabel(label, productId),
      });

      if (shouldShowLabel(label, productId)) {
        const labelEl = createLabelElement(label);
        productImageContainer.appendChild(labelEl);
        console.log(
          `DO Label: Successfully injected label "${label.text}" at position "${label.position}" with background "${label.background}"`,
        );

        // Debug: Check if label is actually visible and show applied styles
        setTimeout(() => {
          const rect = labelEl.getBoundingClientRect();
          const computedStyle = getComputedStyle(labelEl);
          console.log(`DO Label: Label "${label.text}" final styles:`, {
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left,
            visible: rect.width > 0 && rect.height > 0,
            display: computedStyle.display,
            visibility: computedStyle.visibility,
            opacity: computedStyle.opacity,
            backgroundColor: computedStyle.backgroundColor,
            color: computedStyle.color,
            fontSize: computedStyle.fontSize,
            fontWeight: computedStyle.fontWeight,
            borderRadius: computedStyle.borderRadius,
            padding: computedStyle.padding,
            boxShadow: computedStyle.boxShadow,
          });
        }, 100);
      } else {
        console.log(
          `DO Label: Skipping label "${label.text}" - condition not met`,
        );
      }
    });
  }

  async function fetchLabels() {
    // Try each endpoint until one works
    for (let i = 0; i < API_ENDPOINTS.length; i++) {
      const endpoint = API_ENDPOINTS[i];
      try {
        console.log(
          `DO Label: Trying endpoint ${i + 1}/${API_ENDPOINTS.length}:`,
          endpoint,
        );

        const response = await fetch(endpoint);
        if (response.ok) {
          const labels = await response.json();
          console.log(`DO Label: Success with endpoint:`, endpoint);
          console.log(`DO Label: Raw labels data:`, labels);

          // Log each label's details
          labels.forEach((label, index) => {
            console.log(`DO Label: Label ${index + 1} details:`, {
              id: label.id,
              text: label.text,
              background: label.background,
              position: label.position,
              condition: label.condition,
              productIds: label.productIds,
              createdAt: label.createdAt,
            });
          });

          return labels;
        } else {
          console.log(
            `DO Label: Endpoint ${endpoint} returned status:`,
            response.status,
          );
        }
      } catch (error) {
        console.log(`DO Label: Endpoint ${endpoint} failed:`, error.message);
      }
    }

    console.error("DO Label: All endpoints failed");
    return [];
  }

  // Main execution
  function init() {
    const productId = getCurrentProductId();

    if (!productId) {
      console.log("DO Label: Product ID not found");
      return;
    }

    console.log("DO Label: Initializing for product:", productId);

    // Fetch and inject labels (async/await)
    (async () => {
      const labels = await fetchLabels();
      if (labels.length > 0) {
        console.log("DO Label: Found", labels.length, "labels");
        injectLabels(labels, productId);
      } else {
        console.log("DO Label: No labels found");
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
