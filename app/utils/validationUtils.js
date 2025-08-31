/**
 * Validate special price rule configuration
 * @param {string} specialPriceFrom - Price from value
 * @param {string} specialPriceTo - Price to value
 * @returns {Object} Validation result with isValid and message
 */
export function validateSpecialPriceRule(specialPriceFrom, specialPriceTo) {
  if (!specialPriceFrom || !specialPriceTo) {
    return {
      isValid: false,
      message: "Please enter both price range values for special price rule",
    };
  }

  if (parseFloat(specialPriceFrom) > parseFloat(specialPriceTo)) {
    return {
      isValid: false,
      message: "Price 'from' must be less than or equal to price 'to'",
    };
  }

  return { isValid: true };
}

/**
 * Validate new arrival rule configuration
 * @param {number} newArrivalDays - Number of days
 * @returns {Object} Validation result with isValid and message
 */
export function validateNewArrivalRule(newArrivalDays) {
  if (!newArrivalDays || newArrivalDays < 1 || newArrivalDays > 365) {
    return {
      isValid: false,
      message:
        "Please enter a valid number of days (1-365) for new arrival rule",
    };
  }

  return { isValid: true };
}

/**
 * Validate specific product selection rule
 * @param {string} ruleType - Type of rule
 * @param {Array} selectedProductIds - Selected product IDs
 * @param {string} specialPriceFrom - Price from value (for special price rule)
 * @param {string} specialPriceTo - Price to value (for special price rule)
 * @param {number} newArrivalDays - Number of days (for new arrival rule)
 * @returns {Object} Validation result with isValid and message
 */
export function validateSpecificProductRule(
  ruleType,
  selectedProductIds,
  specialPriceFrom,
  specialPriceTo,
  newArrivalDays,
) {
  if (ruleType === "specific" && selectedProductIds.length === 0) {
    return {
      isValid: false,
      message: "Please select at least one product for manual selection",
    };
  }

  if (ruleType === "special_price") {
    const priceValidation = validateSpecialPriceRule(
      specialPriceFrom,
      specialPriceTo,
    );
    if (!priceValidation.isValid) {
      return priceValidation;
    }
  }

  if (ruleType === "new_arrival") {
    const arrivalValidation = validateNewArrivalRule(newArrivalDays);
    if (!arrivalValidation.isValid) {
      return arrivalValidation;
    }
  }

  return { isValid: true };
}

/**
 * Validate label form data
 * @param {Object} formData - Form data object
 * @returns {Object} Validation result with isValid and message
 */
export function validateLabelForm(formData) {
  const {
    labelText,
    productCondition,
    ruleType,
    selectedProductIds,
    specialPriceFrom,
    specialPriceTo,
    newArrivalDays,
  } = formData;

  if (!labelText.trim()) {
    return {
      isValid: false,
      message: "Label text is required",
    };
  }

  if (productCondition[0] === "special_price") {
    const priceValidation = validateSpecialPriceRule(
      specialPriceFrom,
      specialPriceTo,
    );
    if (!priceValidation.isValid) {
      return priceValidation;
    }
  }

  if (productCondition[0] === "new_arrival") {
    const arrivalValidation = validateNewArrivalRule(newArrivalDays);
    if (!arrivalValidation.isValid) {
      return arrivalValidation;
    }
  }

  if (productCondition[0] === "specific") {
    const specificValidation = validateSpecificProductRule(
      ruleType,
      selectedProductIds,
      specialPriceFrom,
      specialPriceTo,
      newArrivalDays,
    );
    if (!specificValidation.isValid) {
      return specificValidation;
    }
  }

  return { isValid: true };
}
