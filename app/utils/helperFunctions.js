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
  if (!products || !Array.isArray(products)) {
    return 0;
  }

  const fromPrice = parseFloat(specialPriceFrom) || 0;
  const toPrice = parseFloat(specialPriceTo) || 999999;

  const matchingProducts = products.filter((product) => {
    // Check if product has compareAtPrice (original price)
    if (!product.compareAtPrice) {
      return false;
    }

    const comparePrice = parseFloat(product.compareAtPrice);

    // Check if price is within the specified range
    return comparePrice >= fromPrice && comparePrice <= toPrice;
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
  if (!products || !Array.isArray(products)) {
    return 0;
  }

  if (!newArrivalDays || newArrivalDays <= 0) {
    return 0;
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - newArrivalDays);

  const matchingProducts = products.filter((product) => {
    // Check if product has creation date
    if (!product.createdAt) {
      return false;
    }

    try {
      const productDate = new Date(product.createdAt);

      // Check if product was created within the specified days
      return productDate >= cutoffDate;
    } catch (error) {
      console.warn("Error parsing product creation date:", error);
      return false;
    }
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
  if (!products || !Array.isArray(products)) {
    return [];
  }

  if (!searchTerm || typeof searchTerm !== "string") {
    return products;
  }

  const normalizedSearchTerm = searchTerm.toLowerCase().trim();

  if (normalizedSearchTerm === "") {
    return products;
  }

  return products.filter((product) => {
    if (!product || !product.title) {
      return false;
    }

    return product.title.toLowerCase().includes(normalizedSearchTerm);
  });
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

  if (productCondition[0] === "rule_based") {
    if (ruleType === "special_price") {
      return `This label will be applied to products with special prices between $${specialPriceFrom || "0"} and $${specialPriceTo || "∞"}.`;
    }

    if (ruleType === "new_arrival") {
      return `This label will be applied to products created in the last ${newArrivalDays} days.`;
    }

    return "Please select a rule type to configure this label.";
  }

  if (productCondition[0] === "specific") {
    if (ruleType === "specific") {
      return `This label will be applied to ${selectedProductIds.length} manually selected products.`;
    }

    if (ruleType === "special_price") {
      return `This label will be applied to products with special prices between $${specialPriceFrom || "0"} and $${specialPriceTo || "∞"}.`;
    }

    if (ruleType === "new_arrival") {
      return `This label will be applied to products created in the last ${newArrivalDays} days.`;
    }

    return "Please select a rule type to configure this label.";
  }

  return "Please select a product condition to configure this label.";
}

/**
 * Format date to locale string
 * @param {string} dateString - Date string
 * @returns {string} Formatted date string
 */
export function formatDate(dateString) {
  if (!dateString) {
    return "N/A";
  }

  try {
    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }

    return date.toLocaleString();
  } catch (error) {
    console.warn("Error formatting date:", error);
    return "Invalid Date";
  }
}

/**
 * Get product title by ID
 * @param {Array} products - Array of products
 * @param {string} productId - Product ID
 * @returns {string} Product title or ID if not found
 */
export function getProductTitleById(products, productId) {
  if (!products || !Array.isArray(products)) {
    return productId || "Unknown Product";
  }

  if (!productId) {
    return "Unknown Product";
  }

  const product = products.find((p) => {
    if (!p || !p.id) {
      return false;
    }

    // Try exact match first
    if (p.id === productId) {
      return true;
    }

    // Try string comparison
    if (p.id.toString() === productId.toString()) {
      return true;
    }

    // Try numeric comparison if both are numbers
    if (!isNaN(p.id) && !isNaN(productId)) {
      return parseInt(p.id) === parseInt(productId);
    }

    return false;
  });

  if (product && product.title) {
    return product.title;
  }

  return productId || "Unknown Product";
}

/**
 * Validate rule configuration for special price
 * @param {Object} ruleConfig - Rule configuration object
 * @returns {Object} Validation result with isValid and message
 */
export function validateSpecialPriceRule(ruleConfig) {
  if (!ruleConfig) {
    return { isValid: false, message: "Rule configuration is required" };
  }

  const { from, to } = ruleConfig;

  if (from === undefined || to === undefined) {
    return {
      isValid: false,
      message: 'Both "from" and "to" values are required',
    };
  }

  const fromPrice = parseFloat(from);
  const toPrice = parseFloat(to);

  if (isNaN(fromPrice) || isNaN(toPrice)) {
    return { isValid: false, message: "Price values must be valid numbers" };
  }

  if (fromPrice < 0 || toPrice < 0) {
    return { isValid: false, message: "Price values cannot be negative" };
  }

  if (fromPrice > toPrice) {
    return {
      isValid: false,
      message: '"From" price cannot be greater than "to" price',
    };
  }

  return { isValid: true, message: "Special price rule is valid" };
}

/**
 * Validate rule configuration for new arrival
 * @param {Object} ruleConfig - Rule configuration object
 * @returns {Object} Validation result with isValid and message
 */
export function validateNewArrivalRule(ruleConfig) {
  if (!ruleConfig) {
    return { isValid: false, message: "Rule configuration is required" };
  }

  const { days } = ruleConfig;

  if (days === undefined) {
    return { isValid: false, message: "Days value is required" };
  }

  const daysValue = parseInt(days);

  if (isNaN(daysValue) || daysValue <= 0) {
    return { isValid: false, message: "Days must be a positive number" };
  }

  if (daysValue > 365) {
    return { isValid: false, message: "Days cannot exceed 365" };
  }

  return { isValid: true, message: "New arrival rule is valid" };
}

/**
 * Get rule type display name
 * @param {string} ruleType - Rule type string
 * @returns {string} Human readable rule type name
 */
export function getRuleTypeDisplayName(ruleType) {
  const ruleTypeNames = {
    special_price: "Special Price",
    new_arrival: "New Arrival",
    specific: "Specific Products",
  };

  return ruleTypeNames[ruleType] || ruleType || "Unknown";
}

/**
 * Get condition display name
 * @param {string} condition - Condition string
 * @returns {string} Human readable condition name
 */
export function getConditionDisplayName(condition) {
  const conditionNames = {
    all: "All Products",
    specific: "Specific Products",
    rule_based: "Rule Based",
  };

  return conditionNames[condition] || condition || "Unknown";
}
