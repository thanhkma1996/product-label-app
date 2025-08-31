(function () {
  "use strict";

  // Configuration - Multiple endpoints for fallback
  const API_ENDPOINTS = [
    "/apps/doproductlabel/labels", // App Proxy (works when no password protection)
    "hhttps://belkin-cope-susan-strap.trycloudflare.com/apps/doproductlabel/labels", // Direct API (bypasses password protection)
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

  function isCollectionPage() {
    // Heuristics: URL contains /collections/ and there are product cards
    const inCollectionsPath =
      window.location.pathname.includes("/collections/");
    return inCollectionsPath || getCollectionProductCards().length > 0;
  }

  function extractHandleFromHref(href) {
    if (!href) return null;
    const url = new URL(href, window.location.origin);
    const match = url.pathname.match(/\/products\/([^/?#]+)/);
    return match ? match[1] : null;
  }

  function getProductIdFromCard(cardEl) {
    // Show data-product-id attribute (trùng với productIds trong database)
    const byId = cardEl.getAttribute("data-product-id");
    if (byId) {
      return byId;
    }

    // Check ID in card--media element
    const mediaElement = cardEl.querySelector(".card--media");
    if (mediaElement) {
      const mediaProductId = mediaElement.getAttribute("data-product-id");
      if (mediaProductId) {
        return mediaProductId;
      }
    }

    // Fallback: data-product-handle
    const byHandle = cardEl.getAttribute("data-product-handle");
    if (byHandle) {
      return byHandle;
    }

    // Try anchor href
    const productLink = cardEl.querySelector('a[href*="/products/"]');
    if (productLink) {
      const handle = extractHandleFromHref(productLink.getAttribute("href"));
      if (handle) {
        return handle;
      }
    }

    // As a last resort, look up any nested JSON data blocks (rare)
    const productJsonScript = cardEl.querySelector(
      'script[type="application/json"][data-product-json]',
    );
    if (productJsonScript) {
      try {
        const data = JSON.parse(productJsonScript.textContent);
        if (data && (data.handle || data.id)) {
          const result = (data.handle || data.id).toString();
          return result;
        }
      } catch (_) {
        // ignore
      }
    }

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

  function shouldShowLabel(label, productId) {
    // Validate input parameters
    if (!label || typeof label !== "object") {
      return false;
    }

    // Early return if label is inactive
    if (label.active === false) {
      return false;
    }

    // Normalize product ID for consistent comparison
    const normalizedProductId = normalizeProductId(productId);
    if (!normalizedProductId) {
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
      return checkSpecificProductCondition(label, normalizedProductId);
    }

    return true;
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
    const cards = getCollectionProductCards();

    cards.forEach((card, index) => {
      const productId = getProductIdFromCard(card);
      if (!productId) {
        return;
      }

      const mediaContainer = getCardMediaContainer(card);
      if (!mediaContainer) {
        return;
      }

      const containerPosition = getComputedStyle(mediaContainer).position;
      if (containerPosition === "static") {
        mediaContainer.style.position = "relative";
      }

      // Clear previously injected labels to avoid duplicates on re-renders
      const existingLabels =
        mediaContainer.querySelectorAll(".do-product-label");
      if (existingLabels.length > 0) {
        existingLabels.forEach((el) => el.remove());
      }

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
  // Main execution for collection pages
  function initCollectionLabels() {
    const onCollectionPage = isCollectionPage();

    if (!onCollectionPage) {
      return;
    }

    // Fetch and inject labels
    (async () => {
      try {
        const labels = await fetchLabels();

        if (!labels || labels.length === 0) {
          return;
        }

        injectLabelsIntoCollection(labels);
      } catch (error) {
        // Silent fail
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
