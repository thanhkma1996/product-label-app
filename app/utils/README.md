# Utility Functions Structure

This directory contains utility functions that have been extracted from the main `app.labels.jsx` file to improve code maintainability and reusability.

## Files Overview

### 1. `colorUtils.js`

Contains color-related utility functions:

- `hexFromRgb(rgb)` - Convert RGB object to hex string
- `hexToRgb(hex)` - Convert hex string to RGB object

### 2. `labelActions.js`

Contains functions for handling label actions:

- `deleteLabel(id, fetcher, setLoadingLabels)` - Handle label deletion
- `toggleLabel(id, fetcher, setLoadingLabels)` - Handle label active status toggle
- `bulkActivateLabels(selectedLabelIds, fetcher, setBulkActionLoading, setSelectedLabelIds)` - Bulk activate labels
- `bulkDeactivateLabels(selectedLabelIds, fetcher, setBulkActionLoading, setSelectedLabelIds)` - Bulk deactivate labels

### 3. `validationUtils.js`

Contains validation functions:

- `validateSpecialPriceRule(specialPriceFrom, specialPriceTo)` - Validate special price rule
- `validateNewArrivalRule(newArrivalDays)` - Validate new arrival rule
- `validateSpecificProductRule(ruleType, selectedProductIds, specialPriceFrom, specialPriceTo, newArrivalDays)` - Validate specific product rule
- `validateLabelForm(formData)` - Main validation function for label form

### 4. `stateUtils.js`

Contains state management functions:

- `resetLabelFormState(...)` - Reset all label form state to default values
- `setEditLabelState(label, ...)` - Set state for editing a label
- `resetLoadingStates(setLoadingLabels, setBulkActionLoading)` - Reset loading states

### 5. `formSubmission.js`

Contains form submission logic:

- `buildLabelFormData(formData, editLabelId)` - Build FormData object for submission
- `submitLabelForm(formData, editLabelId)` - Submit label form with validation

### 6. `constants.js`

Contains constant values:

- `LABEL_POSITIONS` - Available label position options
- `PRODUCT_CONDITION_CHOICES` - Product condition choices
- `RULE_TYPE_CHOICES` - Rule type choices for specific products
- `LABEL_FILTER_OPTIONS` - Label filter options
- `DEFAULT_LABEL_VALUES` - Default values for label form
- `MODAL_TABS` - Modal tab options

### 7. `helperFunctions.js`

Contains helper utility functions:

- `getMatchingSpecialPriceProductsCount(products, specialPriceFrom, specialPriceTo)` - Get count of products matching special price rule
- `getMatchingNewArrivalProductsCount(products, newArrivalDays)` - Get count of products matching new arrival rule
- `getFilteredProducts(products, searchTerm)` - Get filtered products based on search term
- `getCurrentRuleDescription(...)` - Get description of current rule configuration
- `formatDate(dateString)` - Format date to locale string
- `getProductTitleById(products, productId)` - Get product title by ID

## Benefits of This Structure

1. **Separation of Concerns**: Each file has a specific responsibility
2. **Reusability**: Functions can be reused across different components
3. **Maintainability**: Easier to find and fix issues in specific functionality
4. **Testing**: Individual functions can be tested in isolation
5. **Code Organization**: Clear structure makes the codebase easier to navigate
6. **Reduced File Size**: Main component file is now much smaller and focused

## Usage

Import the functions you need in your component:

```javascript
import { hexFromRgb, hexToRgb } from "../utils/colorUtils.js";
import { deleteLabel, toggleLabel } from "../utils/labelActions.js";
import { validateLabelForm } from "../utils/validationUtils.js";
// ... etc
```

## Future Improvements

- Add TypeScript types for better type safety
- Add unit tests for each utility function
- Consider creating a custom hook for complex state management
- Add error handling and logging utilities
