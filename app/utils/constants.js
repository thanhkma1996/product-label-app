/**
 * Label position options
 */
export const LABEL_POSITIONS = [
  { label: "Top Left (top-left)", value: "top-left" },
  { label: "Top Center (top-center)", value: "top-center" },
  { label: "Top Right (top-right)", value: "top-right" },
  { label: "Bottom Left (bottom-left)", value: "bottom-left" },
  { label: "Bottom Center (bottom-center)", value: "bottom-center" },
  { label: "Bottom Right (bottom-right)", value: "bottom-right" },
];

/**
 * Product condition choices
 */
export const PRODUCT_CONDITION_CHOICES = [
  { label: "All products", value: "all" },
  { label: "Choose specific products", value: "specific" },
  { label: "Special price rule", value: "special_price" },
  { label: "New arrival rule", value: "new_arrival" },
];

/**
 * Rule type choices for specific products
 */
export const RULE_TYPE_CHOICES = [
  { label: "Manual selection", value: "specific" },
  { label: "Special price rule", value: "special_price" },
  { label: "New arrival rule", value: "new_arrival" },
];

/**
 * Label filter options
 */
export const LABEL_FILTER_OPTIONS = [
  { label: "All Labels", value: "all" },
  { label: "Active Only", value: "active" },
  { label: "Inactive Only", value: "inactive" },
];

/**
 * Default label values
 */
export const DEFAULT_LABEL_VALUES = {
  text: "",
  background: { red: 0, green: 128, blue: 96 },
  hex: "#008060",
  position: "bottom-center",
  productCondition: ["all"],
  selectedProductIds: [],
  ruleType: "specific",
  specialPriceFrom: "",
  specialPriceTo: "",
  newArrivalDays: 30,
};

/**
 * Tab options for modal
 */
export const MODAL_TABS = [
  { id: "preview", content: "Preview" },
  { id: "product-conditions", content: "Product conditions" },
];
