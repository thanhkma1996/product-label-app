// (function () {
//   "use strict";

//   // Configuration - Multiple endpoints for fallback
//   const API_ENDPOINTS = [
//     "/apps/doproductlabel/labels", // App Proxy (works when no password protection)
//     "https://missouri-opposite-reporters-clinton.trycloudflare.com/apps/doproductlabel/labels", // Direct API (bypasses password protection)
//   ];

//   // Common label styles
//   const LABEL_STYLES = {
//     position: "absolute",
//     zIndex: 1000,
//     padding: "4px 8px",
//     borderRadius: "4px",
//     fontSize: "12px",
//     fontWeight: "bold",
//     color: "#ffffff",
//     textAlign: "center",
//     minWidth: "60px",
//     boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
//     pointerEvents: "none",
//   };

//   // Common utility functions
//   function normalizeProductId(id) {
//     // Handle null/undefined
//     if (id === null || id === undefined) {
//       return null;
//     }

//     // Convert to string and trim whitespace
//     let normalized = id.toString().trim();

//     // Handle empty string
//     if (normalized === "") {
//       return null;
//     }

//     // Handle special cases
//     if (
//       normalized === "null" ||
//       normalized === "undefined" ||
//       normalized === "NaN"
//     ) {
//       return null;
//     }

//     // Handle Shopify GID format: gid://shopify/Product/7138215985336
//     if (normalized.startsWith("gid://shopify/Product/")) {
//       const productId = normalized.split("/").pop();
//       return productId;
//     }

//     // Handle other GID formats if needed
//     if (normalized.includes("://") && normalized.includes("/")) {
//       const parts = normalized.split("/");
//       const lastPart = parts[parts.length - 1];
//       if (lastPart && !isNaN(lastPart)) {
//         return lastPart;
//       }
//     }

//     return normalized;
//   }

//   function normalizeProductIdsToArray(productIds) {
//     // Case 1: Already an array
//     if (Array.isArray(productIds)) {
//       const filtered = productIds.filter((id) => id != null); // Filter out null/undefined values
//       return filtered;
//     }

//     // Case 2: JSON string
//     if (typeof productIds === "string") {
//       // Handle empty or invalid JSON strings
//       if (productIds.trim() === "" || productIds === "[]") {
//         return null;
//       }

//       try {
//         const parsed = JSON.parse(productIds);

//         if (Array.isArray(parsed)) {
//           const filtered = parsed.filter((id) => id != null);
//           return filtered;
//         } else if (parsed != null) {
//           return [parsed];
//         }
//         return null;
//       } catch {
//         // Treat as single product ID string if JSON parsing fails
//         const result = productIds.trim() ? [productIds.trim()] : null;
//         return result;
//       }
//     }

//     // Case 3: Number or other primitive
//     if (productIds != null && productIds !== "") {
//       return [productIds];
//     }

//     return null;
//   }

//   function shouldShowLabel(label, productId) {
//     // Validate input parameters
//     if (!label || typeof label !== "object") {
//       console.warn("DO Label: Invalid label object provided");
//       return false;
//     }

//     // Early return if label is inactive
//     if (label.active === false) {
//       return false;
//     }

//     // Normalize product ID for consistent comparison
//     const normalizedProductId = normalizeProductId(productId);
//     if (!normalizedProductId) {
//       console.warn(
//         `DO Label: Product ID is null or undefined for label "${label.text}"`,
//       );
//       return false;
//     }

//     // CONDITION 1: Show on all products (default behavior)
//     if (
//       !label.condition ||
//       label.condition === "all" ||
//       label.condition === ""
//     ) {
//       return true;
//     }

//     // CONDITION 2: Show only on specific products
//     if (label.condition === "specific") {
//       const result = checkSpecificProductCondition(label, normalizedProductId);
//       return result;
//     }

//     return true;
//   }

//   function checkSpecificProductCondition(label, normalizedProductId) {
//     // Validate productIds exists and is not empty
//     if (
//       !label.productIds ||
//       label.productIds === "" ||
//       label.productIds === "[]" ||
//       label.productIds === "null" ||
//       label.productIds === "undefined"
//     ) {
//       console.warn(
//         `DO Label: Label "${label.text}" - specific condition but no productIds specified`,
//       );
//       return false;
//     }

//     // Convert productIds to array for consistent processing
//     const productIdsArray = normalizeProductIdsToArray(label.productIds);

//     if (!productIdsArray || productIdsArray.length === 0) {
//       console.warn(
//         `DO Label: Label "${label.text}" - productIds array is empty after normalization`,
//       );
//       return false;
//     }

//     // Check if current product ID is in the list
//     let matchFound = false;

//     for (let i = 0; i < productIdsArray.length; i++) {
//       const id = productIdsArray[i];
//       const normalizedId = normalizeProductId(id);

//       // Try exact match first
//       if (normalizedId === normalizedProductId) {
//         matchFound = true;
//         break;
//       }

//       // Try string comparison if types don't match
//       if (normalizedId.toString() === normalizedProductId.toString()) {
//         matchFound = true;
//         break;
//       }

//       // Try numeric comparison if both are numbers
//       if (!isNaN(normalizedId) && !isNaN(normalizedProductId)) {
//         if (parseInt(normalizedId) === parseInt(normalizedProductId)) {
//           matchFound = true;
//           break;
//         }
//       }

//       // Try Shopify GID comparison
//       if (
//         normalizedId.startsWith("gid://shopify/Product/") ||
//         normalizedProductId.startsWith("gid://shopify/Product/")
//       ) {
//         const id1 = normalizeProductId(normalizedId);
//         const id2 = normalizeProductId(normalizedProductId);
//         if (id1 === id2) {
//           matchFound = true;
//           break;
//         }
//       }
//     }

//     return matchFound;
//   }

//   async function fetchLabels() {
//     // Try each endpoint until one works
//     for (const endpoint of API_ENDPOINTS) {
//       try {
//         const response = await fetch(endpoint);
//         if (response.ok) {
//           const labels = await response.json();
//           return labels;
//         }
//       } catch {
//         // Silent fail
//       }
//     }

//     return [];
//   }

//   // Main execution - delegate to specific handlers
//   function init() {
//     // Check page type and load appropriate handler
//     const onProductPage = /\/products\//.test(window.location.pathname);
//     const onCollectionPage = window.location.pathname.includes("/collections/");

//     if (onProductPage) {
//       // Load product label handler
//       if (typeof initProductLabels === 'function') {
//         initProductLabels();
//       }
//     } else if (onCollectionPage) {
//       // Load collection label handler
//       if (typeof initCollectionLabels === 'function') {
//         initCollectionLabels();
//       }
//     }
//   }

//   // Run when DOM is ready
//   if (document.readyState === "loading") {
//     document.addEventListener("DOMContentLoaded", init);
//   } else {
//     init();
//   }

//   // Also run on page changes (for SPA themes)
//   if (typeof window !== "undefined" && window.Shopify && window.Shopify.on) {
//     window.Shopify.on("section:load", init);
//   }

//   // Export common functions for use in other files
//   window.DOLabelUtils = {
//     normalizeProductId,
//     normalizeProductIdsToArray,
//     shouldShowLabel,
//     checkSpecificProductCondition,
//     fetchLabels,
//     LABEL_STYLES
//   };
// })();
