/**
 * Reset label form state to default values
 * @param {Function} setLabelText - Function to set label text
 * @param {Function} setLabelBg - Function to set label background
 * @param {Function} setLabelHex - Function to set label hex color
 * @param {Function} setLabelPosition - Function to set label position
 * @param {Function} setActiveTab - Function to set active tab
 * @param {Function} setProductCondition - Function to set product condition
 * @param {Function} setSelectedProductIds - Function to set selected product IDs
 * @param {Function} setEditLabel - Function to set edit label
 * @param {Function} setProductSearchTerm - Function to set product search term
 * @param {Function} setDebouncedProductSearch - Function to set debounced search term
 * @param {Function} setRuleType - Function to set rule type
 * @param {Function} setSpecialPriceFrom - Function to set special price from
 * @param {Function} setSpecialPriceTo - Function to set special price to
 * @param {Function} setNewArrivalDays - Function to set new arrival days
 */
export function resetLabelFormState(
  setLabelText,
  setLabelBg,
  setLabelHex,
  setLabelPosition,
  setActiveTab,
  setProductCondition,
  setSelectedProductIds,
  setEditLabel,
  setProductSearchTerm,
  setDebouncedProductSearch,
  setRuleType,
  setSpecialPriceFrom,
  setSpecialPriceTo,
  setNewArrivalDays,
) {
  setLabelText("");
  setLabelBg({ red: 0, green: 128, blue: 96 });
  setLabelHex("#008060");
  setLabelPosition("bottom-center");
  setActiveTab(0);
  setProductCondition(["all"]);
  setSelectedProductIds([]);
  setEditLabel(null);
  setProductSearchTerm("");
  setDebouncedProductSearch("");
  setRuleType("specific");
  setSpecialPriceFrom("");
  setSpecialPriceTo("");
  setNewArrivalDays(30);
}

/**
 * Set edit label state
 * @param {Object} label - Label object to edit
 * @param {Function} setEditLabel - Function to set edit label
 * @param {Function} setLabelText - Function to set label text
 * @param {Function} setLabelBg - Function to set label background
 * @param {Function} setLabelHex - Function to set label hex color
 * @param {Function} setLabelPosition - Function to set label position
 * @param {Function} setProductCondition - Function to set product condition
 * @param {Function} setRuleType - Function to set rule type
 * @param {Function} setSelectedProductIds - Function to set selected product IDs
 * @param {Function} setSpecialPriceFrom - Function to set special price from
 * @param {Function} setSpecialPriceTo - Function to set special price to
 * @param {Function} setNewArrivalDays - Function to set new arrival days
 * @param {Function} setModalActive - Function to set modal active
 * @param {Function} hexToRgb - Function to convert hex to RGB
 */
export function setEditLabelState(
  label,
  setEditLabel,
  setLabelText,
  setLabelBg,
  setLabelHex,
  setLabelPosition,
  setProductCondition,
  setRuleType,
  setSelectedProductIds,
  setSpecialPriceFrom,
  setSpecialPriceTo,
  setNewArrivalDays,
  setModalActive,
  hexToRgb,
) {
  setEditLabel(label);
  setLabelText(label.text);
  setLabelBg(hexToRgb(label.background));
  setLabelHex(label.background);
  setLabelPosition(label.position);

  // Set condition and rule type
  if (label.ruleType === "special_price" || label.ruleType === "new_arrival") {
    setProductCondition([label.ruleType]);
    setRuleType(label.ruleType);
  } else if (label.condition === "specific") {
    setProductCondition(["specific"]);
    setRuleType(label.ruleType || "specific");
  } else {
    setProductCondition(["all"]);
    setRuleType("all");
  }

  setSelectedProductIds(
    Array.isArray(label.productIds) ? label.productIds : [],
  );

  // Set rule configuration
  if (label.ruleType === "special_price" && label.ruleConfig) {
    setSpecialPriceFrom(label.ruleConfig.from?.toString() || "");
    setSpecialPriceTo(label.ruleConfig.to?.toString() || "");
  } else if (label.ruleType === "new_arrival" && label.ruleConfig) {
    setNewArrivalDays(label.ruleConfig.days || 30);
  } else {
    setSpecialPriceFrom("");
    setSpecialPriceTo("");
    setNewArrivalDays(30);
  }

  setModalActive(true);
}

/**
 * Reset loading states
 * @param {Function} setLoadingLabels - Function to set loading labels
 * @param {Function} setBulkActionLoading - Function to set bulk action loading
 */
export function resetLoadingStates(setLoadingLabels, setBulkActionLoading) {
  setLoadingLabels(new Set());
  setBulkActionLoading(false);
}
