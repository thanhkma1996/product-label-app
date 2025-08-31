# Server-Side Logic

This directory contains server-side functions for the label management system, separated from the UI components for better code organization.

## Files Overview

### `labelServer.js`

Contains the main server-side logic for handling label operations:

#### **Loader Function**

- **Purpose**: Fetch products from Shopify GraphQL API and labels from Prisma database
- **Authentication**: Uses Shopify admin authentication
- **Features**:
  - Product search with GraphQL queries
  - Pagination support with `after` cursor
  - Product data processing (price, images, variants)
  - Label retrieval from database
  - Error handling with redirect to login

#### **Action Function**

- **Purpose**: Handle all label CRUD operations
- **Supported Actions**:
  - `delete` - Delete a single label
  - `edit` - Update label properties
  - `toggle` - Toggle label active status
  - `bulkActivate` - Activate multiple labels
  - `bulkDeactivate` - Deactivate multiple labels
  - Default - Create new label

#### **Helper Functions**

- `handleDeleteLabel()` - Process label deletion
- `handleEditLabel()` - Process label updates
- `handleToggleLabel()` - Process status toggle
- `handleBulkActivate()` - Process bulk activation
- `handleBulkDeactivate()` - Process bulk deactivation
- `handleCreateLabel()` - Process label creation

## Benefits of Separation

1. **Clean Architecture**: Server logic separated from UI components
2. **Maintainability**: Easier to modify database operations without affecting UI
3. **Reusability**: Server functions can be reused in different routes
4. **Testing**: Server logic can be tested independently
5. **Security**: Server-side validation and authentication centralized
6. **Performance**: Database operations optimized in one place

## Usage

Import the loader and action functions in your route file:

```javascript
export { loader, action } from "../server/labelServer.js";
```

## Data Flow

1. **Client Request** → Route file → `loader`/`action` functions
2. **Loader**: Fetch data → Process → Return to client
3. **Action**: Receive form data → Validate → Database operation → Return result

## Error Handling

- Authentication errors redirect to login page
- Database errors return structured error messages
- Form validation with descriptive error messages
- Logging for debugging and monitoring

## Security Features

- Shopify admin authentication required
- Input validation and sanitization
- Database query parameterization
- Error message sanitization

## Future Improvements

- Add TypeScript types for better type safety
- Implement caching for frequently accessed data
- Add rate limiting for API calls
- Implement more sophisticated error handling
- Add logging and monitoring integration
