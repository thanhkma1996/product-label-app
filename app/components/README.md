# Component Structure

This directory contains React components that have been extracted from the main `app.labels.jsx` file to improve code organization and maintainability.

## Components Overview

### 1. `HeaderSection.jsx`

Contains the header section of the page including:

- Page title and description
- Create New Label button
- Label filter dropdown
- Total labels count

**Props:**

- `shop` - Shop information
- `labels` - Array of labels
- `labelFilter` - Current filter value
- `setLabelFilter` - Function to update filter
- `openCreateLabelModal` - Function to open modal

### 2. `LabelList.jsx`

Contains the main label list display including:

- List header with bulk action buttons
- Select all checkbox
- Individual label cards with actions

**Props:**

- `filteredLabels` - Filtered labels to display
- `labels` - All labels
- `products` - Product data
- `selectedLabelIds` - Currently selected label IDs
- `setSelectedLabelIds` - Function to update selection
- `handleToggleLabel` - Function to toggle label status
- `handleEditLabel` - Function to edit label
- `handleDeleteLabel` - Function to delete label
- `loadingLabels` - Loading state for individual labels
- `bulkActionLoading` - Loading state for bulk actions
- `handleBulkActivate` - Function to bulk activate
- `handleBulkDeactivate` - Function to bulk deactivate

**Sub-components:**

- `LabelCard` - Individual label display card

### 3. `LabelModal.jsx`

Contains the modal for creating/editing labels including:

- Preview tab with label configuration
- Product conditions tab with rule configuration
- Form validation and submission

**Props:**

- `modalActive` - Whether modal is open
- `onClose` - Function to close modal
- `onSave` - Function to save label
- `isSubmitting` - Loading state
- All form state variables and setters
- `products` - Product data for selection
- `editLabel` - Label being edited (if any)

**Sub-components:**

- `PreviewTab` - Label preview and basic configuration
- `ProductConditionsTab` - Rule configuration
- `SpecialPriceRuleConfig` - Special price rule setup
- `NewArrivalRuleConfig` - New arrival rule setup
- `ManualProductSelection` - Manual product selection interface

## Benefits of This Structure

1. **Separation of Concerns**: Each component has a specific responsibility
2. **Reusability**: Components can be reused in other parts of the application
3. **Maintainability**: Easier to find and fix issues in specific functionality
4. **Testing**: Individual components can be tested in isolation
5. **Code Organization**: Clear structure makes the codebase easier to navigate
6. **Reduced File Size**: Main component file is now much smaller and focused

## File Size Reduction

- **Original file**: ~1595 lines
- **Current main file**: ~500 lines (reduced by ~70%)
- **Component files**: ~200-300 lines each

## Usage

Import the components you need in your main file:

```javascript
import HeaderSection from "../components/HeaderSection.jsx";
import LabelList from "../components/LabelList.jsx";
import LabelModal from "../components/LabelModal.jsx";
```

## Future Improvements

- Add TypeScript types for better type safety
- Add unit tests for each component
- Consider creating custom hooks for complex state management
- Add error boundaries for better error handling
- Implement component lazy loading for better performance
