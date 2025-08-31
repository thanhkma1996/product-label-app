/**
 * Get matching products count for special price rule
 * @param {Array} products - Array of products
 * @param {string} specialPriceFrom - Price from value
 * @param {string} specialPriceTo - Price to value
 * @returns {number} Count of matching products
 */
export function getMatchingSpecialPriceProductsCount(
  products,
  specialPriceFrom,
  specialPriceTo,
) {
  const matchingProducts = products.filter((product) => {
    const comparePrice = parseFloat(product.compareAtPrice);
    const fromPrice = parseFloat(specialPriceFrom) || 0;
    const toPrice = parseFloat(specialPriceTo) || 999999;
    return comparePrice && comparePrice >= fromPrice && comparePrice <= toPrice;
  });
  return matchingProducts.length;
}

/**
 * Get matching products count for new arrival rule
 * @param {Array} products - Array of products
 * @param {number} newArrivalDays - Number of days
 * @returns {number} Count of matching products
 */
export function getMatchingNewArrivalProductsCount(products, newArrivalDays) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - newArrivalDays);

  const matchingProducts = products.filter((product) => {
    const productDate = new Date(product.createdAt);
    return productDate >= cutoffDate;
  });

  return matchingProducts.length;
}

/**
 * Get filtered products based on search term
 * @param {Array} products - Array of products
 * @param {string} searchTerm - Search term
 * @returns {Array} Filtered products
 */
export function getFilteredProducts(products, searchTerm) {
  if (!searchTerm) return products;

  return products.filter((product) =>
    product.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );
}

/**
 * Get current rule configuration description
 * @param {Array} productCondition - Product condition array
 * @param {string} ruleType - Rule type
 * @param {string} specialPriceFrom - Special price from
 * @param {string} specialPriceTo - Special price to
 * @param {number} newArrivalDays - New arrival days
 * @param {Array} selectedProductIds - Selected product IDs
 * @returns {string} Description of current rule configuration
 */
export function getCurrentRuleDescription(
  productCondition,
  ruleType,
  specialPriceFrom,
  specialPriceTo,
  newArrivalDays,
  selectedProductIds,
) {
  if (productCondition[0] === "all") {
    return "This label will be applied to ALL products in your store.";
  }

  if (productCondition[0] === "special_price") {
    return `This label will be applied to products with special prices between $${specialPriceFrom || "0"} and $${specialPriceTo || "∞"}.`;
  }

  if (productCondition[0] === "new_arrival") {
    return `This label will be applied to products created in the last ${newArrivalDays} days.`;
  }

  if (productCondition[0] === "specific" && ruleType === "specific") {
    return `This label will be applied to ${selectedProductIds.length} manually selected products.`;
  }

  if (productCondition[0] === "specific" && ruleType === "special_price") {
    return `This label will be applied to products with special prices between $${specialPriceFrom || "0"} and $${specialPriceTo || "∞"}.`;
  }

  if (productCondition[0] === "specific" && ruleType === "new_arrival") {
    return `This label will be applied to products created in the last ${newArrivalDays} days.`;
  }

  return "Please select a rule type to configure this label.";
}

/**
 * Format date to locale string
 * @param {string} dateString - Date string
 * @returns {string} Formatted date string
 */
export function formatDate(dateString) {
  return new Date(dateString).toLocaleString();
}

/**
 * Get product title by ID
 * @param {Array} products - Array of products
 * @param {string} productId - Product ID
 * @returns {string} Product title or ID if not found
 */
export function getProductTitleById(products, productId) {
  const product = products.find((p) => p.id === productId);
  return product ? product.title : productId;
}
