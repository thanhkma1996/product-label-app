# DO Product Label - Theme Extension

## Overview

This theme extension displays product labels on Shopify stores based on configurable rules and conditions.

## Files

- `product-label.js` - Handles labels on individual product pages
- `collection-label.js` - Handles labels on collection pages
- `label-inject.js` - Common label injection logic
- `label-styles.css` - Label styling

## Label Display Logic

### 1. Basic Conditions

- **Active Status**: Label must have `active: true`
- **Product Condition**:
  - `"all"` - Show on all products
  - `"specific"` - Show only on selected products
  - `"rule_based"` - Show based on business rules

### 2. Rule-Based Conditions

#### Special Price Rule

- **Condition**: `"rule_based"`
- **Rule Type**: `"special_price"`
- **Configuration**:
  - `from`: Minimum price threshold
  - `to`: Maximum price threshold
- **Logic**: Only show label when product's `compareAtPrice` is within the specified range
- **Example**:

  ```json
  {
    "condition": "rule_based",
    "ruleType": "special_price",
    "ruleConfig": {
      "from": "10.00",
      "to": "50.00"
    }
  }
  ```

  - Products with `compareAtPrice` between $10-$50: ✅ Show label
  - Products with `compareAtPrice` outside $10-$50: ❌ Hide label

#### New Arrival Rule

- **Condition**: `"rule_based"`
- **Rule Type**: `"new_arrival"`
- **Configuration**: `days` - Number of days since product creation
- **Limitation**: Currently not fully supported on frontend due to missing `createdAt` data
- **Future**: Will be implemented with product sync mechanism

### 3. Implementation Details

#### Product Pages (`product-label.js`)

- Uses `getCurrentProduct()` to get product information
- Extracts `compareAtPrice` from DOM elements
- Applies rules to determine label visibility

#### Collection Pages (`collection-label.js`)

- Uses `getProductFromCard(cardEl)` to get product information from each card
- Processes multiple product cards simultaneously
- Applies same rules as product pages

#### Price Extraction

The extension looks for `compareAtPrice` in these DOM elements:

- `[data-compare-price]`
- `.price__compare`
- `.product__price--compare`
- `.product-single__price--compare`
- `[data-product-compare-price]`

### 4. Performance Considerations

- Labels are cached and reused
- DOM queries are optimized for common theme structures
- Fallback mechanisms ensure compatibility across different themes

### 5. Future Enhancements

- Product sync mechanism for accurate `createdAt` data
- Advanced rule combinations
- A/B testing support
- Analytics integration

## Usage

1. Install the theme extension
2. Configure labels in the app admin
3. Labels automatically appear based on configured rules
4. No additional theme code required
