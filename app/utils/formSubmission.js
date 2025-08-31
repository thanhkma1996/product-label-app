import { validateLabelForm } from "./validationUtils.js";

/**
 * Build form data for label submission
 * @param {Object} formData - Form data object
 * @param {string} editLabelId - Edit label ID if editing
 * @returns {FormData} FormData object ready for submission
 */
export function buildLabelFormData(formData, editLabelId = null) {
  const {
    labelText,
    labelBg,
    labelPosition,
    productCondition,
    ruleType,
    selectedProductIds,
    specialPriceFrom,
    specialPriceTo,
    newArrivalDays,
  } = formData;

  const formDataObj = new FormData();
  formDataObj.append("text", labelText);
  formDataObj.append("background", labelBg);
  formDataObj.append("position", labelPosition);

  // Handle different rule types
  if (productCondition[0] === "all") {
    formDataObj.append("condition", "all");
    formDataObj.append("ruleType", "all");
  } else if (productCondition[0] === "special_price") {
    formDataObj.append("condition", "rule_based");
    formDataObj.append("ruleType", "special_price");
    const ruleConfig = {
      from: parseFloat(specialPriceFrom) || 0,
      to: parseFloat(specialPriceTo) || 999999,
    };
    formDataObj.append("ruleConfig", JSON.stringify(ruleConfig));
  } else if (productCondition[0] === "new_arrival") {
    formDataObj.append("condition", "rule_based");
    formDataObj.append("ruleType", "new_arrival");
    const ruleConfig = {
      days: parseInt(newArrivalDays) || 30,
    };
    formDataObj.append("ruleConfig", JSON.stringify(ruleConfig));
  } else {
    formDataObj.append("condition", "specific");
    formDataObj.append("ruleType", ruleType);

    if (ruleType === "specific") {
      selectedProductIds.forEach((id) => formDataObj.append("productIds", id));
    } else if (ruleType === "special_price") {
      const ruleConfig = {
        from: parseFloat(specialPriceFrom) || 0,
        to: parseFloat(specialPriceTo) || 999999,
      };
      formDataObj.append("ruleConfig", JSON.stringify(ruleConfig));
    } else if (ruleType === "new_arrival") {
      const ruleConfig = {
        days: parseInt(newArrivalDays) || 30,
      };
      formDataObj.append("ruleConfig", JSON.stringify(ruleConfig));
    }
  }

  if (editLabelId) {
    formDataObj.append("_action", "edit");
    formDataObj.append("id", editLabelId);
  }

  return formDataObj;
}

/**
 * Submit label form using Remix fetcher
 * @param {Object} formData - Form data object
 * @param {string} editLabelId - Edit label ID if editing
 * @param {Object} fetcher - Remix fetcher instance
 * @returns {boolean} True if form is valid and submitted, false otherwise
 */
export function submitLabelForm(formData, editLabelId = null, fetcher = null) {
  // Validate form data
  const validation = validateLabelForm(formData);
  if (!validation.isValid) {
    alert(validation.message);
    return false;
  }

  // Build form data
  const formDataObj = buildLabelFormData(formData, editLabelId);

  // If fetcher is provided, use it (preferred for Remix)
  if (fetcher) {
    fetcher.submit(formDataObj, { method: "post" });
    return true;
  }

  // Fallback to manual form submission (for backward compatibility)
  const form = document.createElement("form");
  form.method = "POST";
  form.action = "/app/labels";

  for (let [key, value] of formDataObj.entries()) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);

  return true;
}
