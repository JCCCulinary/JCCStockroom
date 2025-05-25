# JCCiMS Data Schema

This document defines the data structures used throughout the JCC Inventory Management System. It serves as a reference for developers implementing the storage and manipulation of data within the application.

## 1. Core Data Objects

### 1.1 Inventory Item

The central data structure for inventory management.

```json
{
  "id": "string",               // Unique identifier (e.g., "item-123")
  "name": "string",             // Item name
  "category": "string",         // Item category
  "location": "string",         // Storage location
  "unit": "string",             // Unit of measurement (lb, ea, case, etc.)
  "currentQuantity": "number",  // Current stock quantity
  "parLevel": "number",         // Minimum desired quantity
  "reorderQuantity": "number",  // Default reorder amount
  "isHotCount": "boolean",      // Whether item is tracked in hot counts
  "suppliers": ["string"],      // Array of supplier IDs
  "primarySupplier": "string",  // ID of preferred supplier
  "lastCost": "number",         // Most recent purchase price
  "photoUrl": "string",         // Optional URL or base64 for image
  "notes": "string",            // Optional additional information
  "barcode": "string",          // Optional barcode/SKU
  "createdAt": "string",        // ISO date string of creation
  "updatedAt": "string",        // ISO date string of last update
  "priceHistory": [             // Array of historical prices
    {
      "date": "string",         // ISO date string
      "price": "number",        // Price at that date
      "supplier": "string"      // Supplier ID for this price point
    }
  ],
  "usageHistory": [             // Array of usage records
    {
      "date": "string",         // ISO date string
      "usage": "number"         // Quantity used on that date
    }
  ],
  "tags": ["string"],           // Optional array of tags for filtering
  "minimumOrderQuantity": "number", // Minimum order quantity from supplier
  "isTaxable": "boolean",       // Whether item is subject to tax
  "lastCountDate": "string",    // ISO date of last inventory count
  "averageUsage": "number"      // Calculated average daily usage
}
```

### 1.2 Supplier

Information about vendors and suppliers.

```json
{
  "id": "string",               // Unique identifier (e.g., "supplier-1")
  "name": "string",             // Company name
  "contactName": "string",      // Primary contact person
  "phone": "string",            // Contact phone number
  "email": "string",            // Contact email
  "address": {                  // Physical address
    "street": "string",
    "city": "string",
    "state": "string",
    "zip": "string",
    "country": "string"
  },
  "website": "string",          // Company website
  "accountNumber": "string",    // Account/customer number
  "orderDays": ["string"],      // Days orders can be placed (Mon, Tue, etc.)
  "deliveryDays": ["string"],   // Days deliveries typically arrive
  "leadTime": "number",         // Days between order and delivery
  "paymentTerms": "string",     // Payment terms (Net 30, etc.)
  "notes": "string",            // Additional information
  "active": "boolean",          // Whether supplier is currently active
  "createdAt": "string",        // ISO date string of creation
  "updatedAt": "string"         // ISO date string of last update
}
```

### 1.3 Category

For organizing inventory items.

```json
{
  "id": "string",               // Unique identifier (e.g., "category-1")
  "name": "string",             // Category name
  "description": "string",      // Optional description
  "parentCategory": "string",   // Optional parent category ID for hierarchical categories
  "createdAt": "string",        // ISO date string of creation
  "updatedAt": "string"         // ISO date string of last update
}
```

### 1.4 Location

For tracking where items are stored.

```json
{
  "id": "string",               // Unique identifier (e.g., "location-1")
  "name": "string",             // Location name (e.g., "Walk-in Cooler")
  "description": "string",      // Optional description
  "type": "string",             // Type of storage (refrigerated, frozen, dry, etc.)
  "temperature": "string",      // Temperature range if applicable
  "createdAt": "string",        // ISO date string of creation
  "updatedAt": "string"         // ISO date string of last update
}
```

## 2. Operational Data Objects

### 2.1 Hot Count Record

Records from daily counts of high-turnover items.

```json
{
  "id": "string",               // Unique identifier (e.g., "hc-20250520-1")
  "date": "string",             // ISO date string of count date
  "type": "string",             // "morning" or "evening"
  "timestamp": "string",        // ISO date-time of when count was performed
  "completedBy": "string",      // User who performed the count
  "items": [                    // Array of counted items
    {
      "itemId": "string",       // Reference to inventory item
      "previousCount": "number", // Previous count quantity
      "currentCount": "number",  // Current count quantity
      "usage": "number",         // Calculated usage (prev - current)
      "notes": "string"          // Optional notes about count
    }
  ],
  "notes": "string",            // General notes about this count
  "createdAt": "string",        // ISO date string of creation
  "updatedAt": "string"         // ISO date string of last update
}
```

### 2.2 Order

Purchase orders for inventory items.

```json
{
  "id": "string",               // Unique identifier (e.g., "order-789")
  "orderNumber": "string",      // Reference/PO number
  "supplier": "string",         // Reference to supplier ID
  "supplierName": "string",     // Supplier name (denormalized for convenience)
  "dateCreated": "string",      // ISO date of order creation
  "dateOrdered": "string",      // ISO date when order was placed
  "dateExpected": "string",     // ISO date of expected delivery
  "dateReceived": "string",     // ISO date when order was received (null if pending)
  "status": "string",           // "draft", "ordered", "partial", "received", "canceled"
  "notes": "string",            // Order notes
  "items": [                    // Array of ordered items
    {
      "itemId": "string",       // Reference to inventory item
      "name": "string",         // Item name (denormalized)
      "quantity": "number",     // Ordered quantity
      "unit": "string",         // Unit of measurement
      "unitCost": "number",     // Cost per unit
      "totalCost": "number",    // Calculated total cost
      "receivedQuantity": "number", // Actual quantity received (null if pending)
      "status": "string"        // "pending", "received", "partial", "backordered"
    }
  ],
  "subtotal": "number",         // Sum of all item costs
  "tax": "number",              // Tax amount
  "shipping": "number",         // Shipping/delivery charges
  "total": "number",            // Total order cost
  "createdBy": "string",        // User who created the event
  "notes": "string",            // General notes about the event
  "createdAt": "string",        // ISO date string of creation
  "updatedAt": "string"         // ISO date string of last update
}
```

## 4. Application State Objects

### 4.1 AppSettings

Global application settings.

```json
{
  "version": "string",          // Application version
  "lastSyncTime": "string",     // ISO date-time of last cloud sync
  "syncEnabled": "boolean",     // Whether cloud sync is enabled
  "googleDriveConnected": "boolean", // Whether connected to Google Drive
  "defaultSettings": {          // Default settings for new items
    "defaultParLevelDays": "number",  // Default days of stock for par level
    "defaultCategory": "string", // Default category for new items
    "defaultLocation": "string"  // Default location for new items
  },
  "uiSettings": {               // Global UI settings
    "theme": "string",          // UI theme
    "itemsPerPage": "number",   // Default pagination count
    "dateFormat": "string",     // Preferred date format
    "currencySymbol": "string", // Currency symbol for display
    "currencyCode": "string"    // Currency code (USD, EUR, etc.)
  },
  "orderSettings": {            // Settings for orders
    "autogeneratePO": "boolean", // Auto-generate PO numbers
    "poNumberPrefix": "string",  // Prefix for PO numbers
    "nextPONumber": "number",    // Next sequential PO number
    "defaultTaxRate": "number"   // Default tax rate
  },
  "emailSettings": {            // Email notification settings
    "lowStockAlerts": "boolean", // Send alerts for low stock
    "orderReminders": "boolean", // Send reminders for pending orders
    "dailySummary": "boolean"    // Send daily inventory summary
  }
}
```

### 4.2 SystemLog

Log of system activities.

```json
{
  "logs": [                     // Array of log entries
    {
      "timestamp": "string",    // ISO date-time of event
      "type": "string",         // "info", "warning", "error"
      "module": "string",       // System module where event occurred
      "message": "string",      // Log message
      "user": "string",         // User associated with event (if any)
      "details": "object"       // Additional details (depends on event type)
    }
  ]
}
```

## 5. Data Relationships

This section outlines the relationships between different data objects in the system.

### 5.1 Primary Relationships

- **Item → Supplier**: Many-to-many (Items can have multiple suppliers)
- **Item → Category**: Many-to-one (Items belong to one category)
- **Item → Location**: Many-to-one (Items are stored in one location)
- **Order → Supplier**: Many-to-one (Orders are placed with one supplier)
- **Order → Item**: Many-to-many (Orders contain multiple items, items can be in multiple orders)
- **HotCount → Item**: Many-to-many (Hot counts include multiple items, items appear in multiple hot counts)
- **InventoryCount → Item**: Many-to-many (Inventory counts include multiple items)
- **Event → Item**: Many-to-many (Events require multiple items)

### 5.2 Data Integrity Rules

1. **Deletion Constraints**:
   - When deleting a Supplier, check if any Items reference it as primarySupplier
   - When deleting a Category, reassign its Items to a default category
   - When deleting a Location, reassign its Items to a default location
   - Items with order history should be archived rather than deleted

2. **Update Propagation**:
   - When updating an Item name, update denormalized names in Orders and Counts
   - When receiving an Order, update corresponding Item quantities and lastCost
   - When completing a HotCount, update Item's usageHistory

3. **Data Validation**:
   - Item quantities cannot be negative
   - Par levels must be greater than or equal to zero
   - Order quantities must be greater than zero
   - Dates must be valid ISO format
   - IDs must be unique within their respective collections

## 6. Data Storage Strategy

### 6.1 Local Storage Structure

Data will be organized into logical collections and stored in localStorage:

```javascript
// Example localStorage structure
localStorage.setItem('jcc_inventory_items', JSON.stringify(inventoryItems));
localStorage.setItem('jcc_suppliers', JSON.stringify(suppliers));
localStorage.setItem('jcc_categories', JSON.stringify(categories));
localStorage.setItem('jcc_locations', JSON.stringify(locations));
localStorage.setItem('jcc_hot_counts', JSON.stringify(hotCounts));
localStorage.setItem('jcc_orders', JSON.stringify(orders));
localStorage.setItem('jcc_events', JSON.stringify(events));
localStorage.setItem('jcc_app_settings', JSON.stringify(appSettings));
localStorage.setItem('jcc_system_log', JSON.stringify(systemLog));
```

### 6.2 Google Drive Structure

For Google Drive storage, data will be organized in a similar structure but stored as individual JSON files:

- `inventory_items.json`
- `suppliers.json`
- `categories.json`
- `locations.json`
- `hot_counts.json`
- `orders.json`
- `events.json`
- `app_settings.json`
- `system_log.json`

### 6.3 Data Size Considerations

To manage data size within localStorage limits:

1. **Hot Count History**: Limit retained history to 90 days, with older data exportable
2. **Order History**: Limit to recent 12 months in active storage
3. **Usage History**: Consolidate older data to monthly summaries
4. **System Logs**: Rotate logs regularly, keeping only recent entries

### 6.4 Data Chunking

For larger datasets, implement chunking to stay within localStorage limits:

```javascript
// Example chunking approach for inventory items
const chunkSize = 100;
const chunks = [];

// Split into chunks
for (let i = 0; i < inventoryItems.length; i += chunkSize) {
  chunks.push(inventoryItems.slice(i, i + chunkSize));
}

// Store chunks
chunks.forEach((chunk, index) => {
  localStorage.setItem(`jcc_inventory_items_${index}`, JSON.stringify(chunk));
});

// Store chunk metadata
localStorage.setItem('jcc_inventory_items_meta', JSON.stringify({
  totalItems: inventoryItems.length,
  chunkSize: chunkSize,
  chunks: chunks.length
}));
```

## 7. Data Migration and Versioning

### 7.1 Schema Versioning

The data schema will be versioned to handle future updates:

```javascript
// Schema version metadata
const schemaVersion = {
  version: "1.0.0",
  releaseDate: "2025-05-20",
  migrations: [
    // Migration steps for future updates
  ]
};
```

### 7.2 Migration Strategy

For handling schema changes:

1. Check current schema version against latest version
2. If different, run appropriate migration functions
3. Update stored schema version after successful migration

```javascript
// Example migration function
function migrateFromV1toV2(data) {
  // Example: Add a new field to all inventory items
  data.inventoryItems.forEach(item => {
    if (!item.hasOwnProperty('newField')) {
      item.newField = defaultValue;
    }
  });
  return data;
}
```

## 8. Import/Export Format Specifications

### 8.1 CSV Import Format

Standard CSV format with the following columns:

```
Name,Category,Location,Unit,CurrentQuantity,ParLevel,LastCost,Suppliers,PrimarySupplier,Notes
```

Example:
```
"Chicken Breast","Meat","Walk-in Cooler","lb",25,40,3.99,"Metro Foods,Local Farms","Metro Foods","Boneless, skinless"
```

### 8.2 Excel Import Format

Excel files should follow the same column structure as CSV imports, with an optional header row.

### 8.3 JSON Export Format

Complete data export will be in JSON format:

```json
{
  "metadata": {
    "exportDate": "2025-05-20T10:30:00Z",
    "version": "1.0.0",
    "itemCount": 235
  },
  "items": [
    // Array of inventory items
  ],
  "suppliers": [
    // Array of suppliers
  ],
  "categories": [
    // Array of categories
  ],
  "locations": [
    // Array of locations
  ]
}
```

## 9. Data Security Considerations

### 9.1 Sensitive Data

The following data should be treated as sensitive:

- Supplier contact information
- Pricing and cost information
- Order details and history

### 9.2 Data Protection Measures

1. **Google Drive Integration**:
   - Use OAuth 2.0 for authentication
   - Request minimum necessary permissions
   - Use app-specific folders for data isolation

2. **Local Storage**:
   - Do not store authentication credentials in localStorage
   - Consider encrypting sensitive data for at-rest protection

3. **Data Transmission**:
   - Use HTTPS for all external communications
   - Validate origin of imported data

### 9.3 Data Backup

1. **Automated Backups**:
   - Periodic export to JSON files in Google Drive
   - Keep version history of backup files

2. **Manual Exports**:
   - Allow users to manually trigger data exports
   - Provide clear instructions for data restoration

## 10. Performance Optimization

### 10.1 Indexing Strategy

For faster lookups and searches:

```javascript
// Create indexes for commonly searched fields
function createSearchIndexes(items) {
  const indexes = {
    byId: {},
    byName: {},
    byCategory: {},
    bySupplier: {},
    byLocation: {}
  };
  
  items.forEach(item => {
    indexes.byId[item.id] = item;
    
    // Name index (lowercase for case-insensitive search)
    const nameLower = item.name.toLowerCase();
    if (!indexes.byName[nameLower]) {
      indexes.byName[nameLower] = [];
    }
    indexes.byName[nameLower].push(item.id);
    
    // Category index
    if (!indexes.byCategory[item.category]) {
      indexes.byCategory[item.category] = [];
    }
    indexes.byCategory[item.category].push(item.id);
    
    // Location index
    if (!indexes.byLocation[item.location]) {
      indexes.byLocation[item.location] = [];
    }
    indexes.byLocation[item.location].push(item.id);
    
    // Supplier index
    item.suppliers.forEach(supplier => {
      if (!indexes.bySupplier[supplier]) {
        indexes.bySupplier[supplier] = [];
      }
      indexes.bySupplier[supplier].push(item.id);
    });
  });
  
  return indexes;
}
```

### 10.2 Caching Strategy

For frequently accessed data:

```javascript
// Implement a simple cache with time-based expiration
const cache = {
  data: {},
  set: function(key, value, ttlMinutes = 30) {
    this.data[key] = {
      value: value,
      expires: Date.now() + (ttlMinutes * 60 * 1000)
    };
  },
  get: function(key) {
    const item = this.data[key];
    if (!item) return null;
    if (item.expires < Date.now()) {
      delete this.data[key];
      return null;
    }
    return item.value;
  },
  invalidate: function(key) {
    delete this.data[key];
  },
  clear: function() {
    this.data = {};
  }
};
```

This data schema document provides a comprehensive reference for all data structures in the JCCiMS. It should be consulted during development to ensure consistent data handling throughout the application. User who created the order
  "receivedBy": "string",       // User who received the order
  "createdAt": "string",        // ISO date string of creation
  "updatedAt": "string"         // ISO date string of last update
}
```

### 2.3 Inventory Count

Full inventory count records.

```json
{
  "id": "string",               // Unique identifier (e.g., "count-456")
  "date": "string",             // ISO date of count
  "type": "string",             // "full", "partial", "spot-check"
  "completedBy": "string",      // User who completed the count
  "status": "string",           // "in-progress", "completed", "verified"
  "items": [                    // Array of counted items
    {
      "itemId": "string",       // Reference to inventory item
      "name": "string",         // Item name (denormalized)
      "expectedQuantity": "number", // Quantity in system before count
      "actualQuantity": "number",  // Quantity found during count
      "variance": "number",      // Difference between expected and actual
      "notes": "string"          // Notes about discrepancy
    }
  ],
  "totalItems": "number",       // Total number of items counted
  "itemsWithVariance": "number", // Number of items with discrepancies
  "notes": "string",            // General notes about this count
  "createdAt": "string",        // ISO date string of creation
  "updatedAt": "string"         // ISO date string of last update
}
```

## 3. User Data Objects

### 3.1 User

User account information.

```json
{
  "id": "string",               // Unique identifier
  "username": "string",         // Login username
  "name": "string",             // Full name
  "email": "string",            // Email address
  "role": "string",             // "admin", "manager", "staff"
  "preferences": {              // User preferences
    "theme": "string",          // UI theme preference
    "defaultView": "string",    // Default starting module
    "itemsPerPage": "number"    // Table pagination preference
  },
  "lastLogin": "string",        // ISO date-time of last login
  "active": "boolean",          // Whether account is active
  "createdAt": "string",        // ISO date string of creation
  "updatedAt": "string"         // ISO date string of last update
}
```

### 3.2 Event

Special event information for inventory planning.

```json
{
  "id": "string",               // Unique identifier
  "name": "string",             // Event name
  "startDate": "string",        // ISO date of event start
  "endDate": "string",          // ISO date of event end
  "location": "string",         // Event location
  "attendees": "number",        // Expected number of attendees
  "description": "string",      // Event description
  "status": "string",           // "planned", "active", "completed", "canceled"
  "items": [                    // Array of items needed for this event
    {
      "itemId": "string",       // Reference to inventory item
      "name": "string",         // Item name (denormalized)
      "estimatedQuantity": "number", // Quantity needed for event
      "actualQuantity": "number",   // Actual quantity used (if completed)
      "notes": "string"            // Notes about this item for the event
    }
  ],
  "createdBy": "string",        //