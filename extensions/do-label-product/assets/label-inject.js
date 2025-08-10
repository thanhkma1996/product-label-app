(function () {
  "use strict";

  // Configuration - Multiple endpoints for fallback
  const API_ENDPOINTS = [
    "/apps/doproductlabel/labels", // App Proxy (works when no password protection)
    "https://dressed-quilt-o-casino.trycloudflare.com/apps/doproductlabel/labels", // Direct API (bypasses password protection)
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
  function getCurrentProductId() {
    // Try to get product ID from various sources
    let productId = null;

    // From meta tag
    const metaUrl = document.querySelector('meta[property="og:url"]')?.content;
    if (metaUrl) {
      const match = metaUrl.match(/products\/([^?]+)/);
      if (match) {
        productId = match[1];
      }
    }

    // From URL if not found from meta
    if (!productId) {
      const urlMatch = window.location.pathname.match(/products\/([^?]+)/);
      if (urlMatch) {
        productId = urlMatch[1];
      }
    }

    // From product form
    if (!productId) {
      const formInput = document.querySelector('input[name="id"]');
      if (formInput && formInput.value) {
        productId = formInput.value;
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
          }
        } catch (error) {
          // Silent fail
        }
      }
    }

    // From data attributes
    if (!productId) {
      const productElement = document.querySelector("[data-product-id]");
      if (productElement) {
        productId = productElement.getAttribute("data-product-id");
      }
    }

    return productId;
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

  function shouldShowLabel(label, productId) {
    // If no condition specified, show on all products
    if (
      !label.condition ||
      label.condition === "all" ||
      label.condition === ""
    ) {
      return true;
    }

    // Check if product is in the specific product list
    if (label.productIds && Array.isArray(label.productIds)) {
      const isIncluded = label.productIds.includes(productId);
      return isIncluded;
    }

    // If productIds is a string, try to parse it as JSON
    if (label.productIds && typeof label.productIds === "string") {
      try {
        const parsedProductIds = JSON.parse(label.productIds);
        if (Array.isArray(parsedProductIds)) {
          const isIncluded = parsedProductIds.includes(productId);
          return isIncluded;
        }
      } catch (error) {
        // Silent fail
      }
    }

    // Add more condition logic here as needed
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
      if (shouldShowLabel(label, productId)) {
        const labelEl = createLabelElement(label);
        productImageContainer.appendChild(labelEl);
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
        if (shouldShowLabel(label, productId)) {
          const labelEl = createLabelElement(label);
          mediaContainer.appendChild(labelEl);
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
        return;
      }

      if (onProductPage) {
        const productId = getCurrentProductId();
        if (productId) {
          injectLabels(labels, productId);
        }
      }

      if (onCollectionPage) {
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
