(function () {
  "use strict";

  // Configuration - Multiple endpoints for fallback
  const API_ENDPOINTS = [
    "/apps/doproductlabel/labels", // App Proxy (works when no password protection)
    "https://cover-coating-exotic-lm.trycloudflare.com/api/labels/public", // Direct API (bypasses password protection)
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
    // Try to get product ID from various sources
    const productId =
      // From meta tag
      document
        .querySelector('meta[property="og:url"]')
        ?.content?.match(/products\/([^?]+)/)?.[1] ||
      // From URL
      window.location.pathname.match(/products\/([^?]+)/)?.[1] ||
      // From product form
      document.querySelector('input[name="id"]')?.value ||
      // From product JSON
      JSON.parse(
        document.querySelector(
          'script[type="application/json"][data-product-json]',
        )?.textContent || "{}",
      )?.id;

    return productId;
  }

  function createLabelElement(label) {
    const labelEl = document.createElement("div");
    labelEl.className = "do-product-label";
    labelEl.textContent = label.text;

    // Apply styles
    Object.assign(labelEl.style, LABEL_STYLES, {
      backgroundColor: label.background,
      color: getContrastColor(label.background),
    });

    // Position the label
    const position = label.position || "top-left";
    switch (position) {
      case "top-left":
        labelEl.style.top = "10px";
        labelEl.style.left = "10px";
        break;
      case "top-right":
        labelEl.style.top = "10px";
        labelEl.style.right = "10px";
        break;
      case "bottom-left":
        labelEl.style.bottom = "10px";
        labelEl.style.left = "10px";
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
    }

    return labelEl;
  }

  function getContrastColor(hexColor) {
    // Remove # if present
    const hex = hexColor.replace("#", "");

    // Convert to RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return black or white based on luminance
    return luminance > 0.5 ? "#000000" : "#ffffff";
  }

  function shouldShowLabel(label, productId) {
    // If no condition specified, show on all products
    if (!label.condition) return true;

    // Check if product is in the specific product list
    if (label.productIds && Array.isArray(label.productIds)) {
      return label.productIds.includes(productId);
    }

    // Add more condition logic here as needed
    return true;
  }

  function injectLabels(labels, productId) {
    // Find product image container
    const productImageContainer =
      document.querySelector(".product__media-container") ||
      document.querySelector(".product-single__media") ||
      document.querySelector(".product__image-container") ||
      document.querySelector("[data-product-image]") ||
      document.querySelector(".product__media-item") ||
      document.querySelector(".product__photo");


    if (!productImageContainer) {
      console.log("DO Label: Product image container not found");
      return;
    }

    // Set container to relative positioning if needed
    if (getComputedStyle(productImageContainer).position === "static") {
      productImageContainer.style.position = "relative";
    }

    // Filter and inject labels
    labels.forEach((label) => {
      if (shouldShowLabel(label, productId)) {
        const labelEl = createLabelElement(label);
        productImageContainer.appendChild(labelEl);
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
