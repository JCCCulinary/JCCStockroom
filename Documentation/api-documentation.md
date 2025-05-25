# JCCiMS API Documentation

## Introduction

This documentation describes the internal JavaScript API for the JCC Inventory Management System (JCCiMS). These APIs are designed for internal use within the application and potential future extensions. The system uses a modular architecture with clearly defined interfaces between components.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core System API](#core-system-api)
3. [Data Management API](#data-management-api)
4. [Module-Specific APIs](#module-specific-apis)
5. [Utility APIs](#utility-apis)
6. [Google Drive Integration API](#google-drive-integration-api)
7. [Event System](#event-system)
8. [Extension Points](#extension-points)

## Architecture Overview

JCCiMS is built around a modular architecture with these key components:

- **Module System**: Manages loading of module templates and scripts
- **Data Layer**: Handles data storage, retrieval, and synchronization
- **UI Components**: Reusable interface elements
- **Module Implementation**: Specific functionality for each module
- **Utility Functions**: Shared helper functions
- **Event System**: Cross-module communication

### File Structure

```
jcc-kitchen-inventory/
│
├── index.html                 # Main HTML structure
├── styles/                    # CSS files
├── scripts/
│   ├── app.js                 # Main application initialization
│   ├── modules/               # Module implementation
│   ├── storage/               # Data persistence
│   └── utils/                 # Utility functions
└── templates/                 # HTML templates for modules
```

## Core System API

### Module System

The module system handles dynamically loading module templates and initializing their functionality.

#### `ModuleSystem` Class

```javascript
/**
 * Core module system for loading and initializing modules
 * @class
 */
class ModuleSystem {
  /**
   * Create a new module system instance
   * @constructor
   */
  constructor() {
    this.contentContainer = document.getElementById('app-content');
    this.navLinks = document.querySelectorAll('.nav-link');
    this.currentModule = null;
    this.initNavigation();
  }

  /**
   * Initialize navigation event listeners
   * @private
   */
  initNavigation() {
    this.navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const moduleId = link.getAttribute('data-module');
        this.loadModule(moduleId);
      });
    });
  }

  /**
   * Load a module by ID
   * @param {string} moduleId - The ID of the module to load
   * @returns {Promise<void>} - Resolves when module is loaded
   */
  async loadModule(moduleId) {
    // Implementation details...
  }

  /**
   * Initialize module-specific scripts
   * @param {string} moduleId - The ID of the module to initialize
   * @private
   */
  initModuleScripts(moduleId) {
    // Implementation details...
  }
}
```

#### Usage Example

```javascript
// Initialize the module system
const moduleSystem = new ModuleSystem();

// Load the home module
moduleSystem.loadModule('home');

// Navigate to another module
document.querySelector('[data-module="inventory"]').click();
```

### Application Initialization

The `app.js` file contains initialization code and global application state.

#### Global State

```javascript
/**
 * Global application state
 */
let inventoryItems = [];
let suppliers = [];
let categories = [];
let locations = [];
let hotCountHistory = [];
let orders = [];
let appSettings = {
  version: '1.0.0',
  lastSyncTime: null,
  syncEnabled: true,
  googleDriveConnected: false,
  // Additional settings...
};
```

#### Initialization

```javascript
/**
 * Initialize the application
 */
document.addEventListener('DOMContentLoaded', async function() {
  // Initialize module system
  window.moduleSystem = new ModuleSystem();
  
  // Initialize storage
  initializeStorage();
  
  // Load saved data
  await loadApplicationData();
  
  // Set up global event handlers
  setupGlobalEventHandlers();
  
  // Load the default module
  moduleSystem.loadModule('home');
});
```

## Data Management API

### Local Storage API

The `localStore.js` file provides functions for interacting with browser localStorage.

```javascript
/**
 * Save data to localStorage
 * @param {string} key - Storage key
 * @param {*} data - Data to store (will be JSON serialized)
 * @returns {boolean} - Success status
 */
function saveToLocalStorage(key, data) {
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    console.error('localStorage save error:', error);
    return false;
  }
}

/**
 * Load data from localStorage
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if key doesn't exist
 * @returns {*} - Parsed data or default value
 */
function loadFromLocalStorage(key, defaultValue = null) {
  try {
    const data = localStorage.getItem(key);
    if (data === null) return defaultValue;
    return JSON.parse(data);
  } catch (error) {
    console.error('localStorage load error:', error);
    return defaultValue;
  }
}

/**
 * Remove data from localStorage
 * @param {string} key - Storage key to remove
 */
function removeFromLocalStorage(key) {
  localStorage.removeItem(key);
}

/**
 * Check if localStorage has a key
 * @param {string} key - Storage key to check
 * @returns {boolean} - Whether key exists
 */
function hasLocalStorageItem(key) {
  return localStorage.getItem(key) !== null;
}

/**
 * Clear all application data from localStorage
 */
function clearAllLocalStorage() {
  const appKeys = Object.keys(localStorage).filter(key => 
    key.startsWith('jcc_')
  );
  
  appKeys.forEach(key => localStorage.removeItem(key));
}
```

### Data Model Access Functions

Common functions for accessing and manipulating data models.

#### Inventory Items

```javascript
/**
 * Get all inventory items
 * @returns {Array} - Array of inventory items
 */
function getAllInventoryItems() {
  return [...inventoryItems]; // Return a copy
}

/**
 * Get inventory item by ID
 * @param {string} id - Item ID
 * @returns {Object|null} - Item object or null if not found
 */
function getInventoryItemById(id) {
  return inventoryItems.find(item => item.id === id) || null;
}

/**
 * Add a new inventory item
 * @param {Object} item - Item to add
 * @returns {Object} - Added item with generated ID
 */
function addInventoryItem(item) {
  // Generate ID if not provided
  if (!item.id) {
    item.id = 'item-' + Date.now();
  }
  
  // Set timestamps
  const now = new Date().toISOString();
  item.createdAt = now;
  item.updatedAt = now;
  
  // Initialize arrays if not present
  item.priceHistory = item.priceHistory || [];
  item.usageHistory = item.usageHistory || [];
  item.suppliers = item.suppliers || [];
  
  // Add to collection
  inventoryItems.push(item);
  
  // Save changes
  saveInventoryData();
  
  // Notify of change
  EventBus.publish('inventory-updated', { 
    type: 'add', 
    item: item 
  });
  
  return item;
}

/**
 * Update an existing inventory item
 * @param {string} id - Item ID to update
 * @param {Object} updates - Object with properties to update
 * @returns {Object|null} - Updated item or null if not found
 */
function updateInventoryItem(id, updates) {
  const index = inventoryItems.findIndex(item => item.id === id);
  if (index === -1) return null;
  
  // Update timestamp
  updates.updatedAt = new Date().toISOString();
  
  // Merge updates with existing item
  const updatedItem = { ...inventoryItems[index], ...updates };
  inventoryItems[index] = updatedItem;
  
  // Save changes
  saveInventoryData();
  
  // Notify of change
  EventBus.publish('inventory-updated', { 
    type: 'update', 
    item: updatedItem 
  });
  
  return updatedItem;
}

/**
 * Delete an inventory item
 * @param {string} id - Item ID to delete
 * @returns {boolean} - Success status
 */
function deleteInventoryItem(id) {
  const index = inventoryItems.findIndex(item => item.id === id);
  if (index === -1) return false;
  
  // Store for event
  const deletedItem = inventoryItems[index];
  
  // Remove from array
  inventoryItems.splice(index, 1);
  
  // Save changes
  saveInventoryData();
  
  // Notify of change
  EventBus.publish('inventory-updated', { 
    type: 'delete', 
    item: deletedItem 
  });
  
  return true;
}

/**
 * Find inventory items by query
 * @param {Object} query - Query parameters
 * @returns {Array} - Matching inventory items
 */
function findInventoryItems(query = {}) {
  return inventoryItems.filter(item => {
    for (const [key, value] of Object.entries(query)) {
      // Handle special case for array properties
      if (Array.isArray(item[key])) {
        if (Array.isArray(value)) {
          // Check if arrays have any common elements
          if (!item[key].some(v => value.includes(v))) return false;
        } else {
          // Check if array contains value
          if (!item[key].includes(value)) return false;
        }
      } 
      // Handle regular properties
      else if (item[key] !== value) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Get items below par level
 * @returns {Array} - Items with quantity below par level
 */
function getItemsBelowPar() {
  return inventoryItems.filter(item => 
    item.currentQuantity < item.parLevel
  );
}
```

Similar function sets exist for other data models (suppliers, categories, locations, orders, etc.).

### Data Persistence

Functions for saving and loading all application data.

```javascript
/**
 * Save all inventory data
 * @returns {boolean} - Success status
 */
function saveInventoryData() {
  return saveToLocalStorage('jcc_inventory_items', inventoryItems);
}

/**
 * Load inventory data
 * @returns {Promise<boolean>} - Success status
 */
async function loadInventoryData() {
  // Try to load from Google Drive first
  if (driveStorage.isConnected()) {
    try {
      const driveData = await driveStorage.loadData('inventory_items.json');
      if (driveData) {
        inventoryItems = driveData;
        return true;
      }
    } catch (error) {
      console.error('Failed to load from Google Drive:', error);
      // Fall back to localStorage
    }
  }
  
  // Load from localStorage
  const loadedData = loadFromLocalStorage('jcc_inventory_items', []);
  if (loadedData) {
    inventoryItems = loadedData;
    return true;
  }
  
  return false;
}

/**
 * Save all application data
 * @returns {Promise<boolean>} - Success status
 */
async function saveAllData() {
  // Local save
  const localSaveSuccess = 
    saveToLocalStorage('jcc_inventory_items', inventoryItems) &&
    saveToLocalStorage('jcc_suppliers', suppliers) &&
    saveToLocalStorage('jcc_categories', categories) &&
    saveToLocalStorage('jcc_locations', locations) &&
    saveToLocalStorage('jcc_hot_counts', hotCountHistory) &&
    saveToLocalStorage('jcc_orders', orders) &&
    saveToLocalStorage('jcc_app_settings', appSettings);
  
  // Google Drive save if connected
  let driveSaveSuccess = true;
  if (driveStorage.isConnected()) {
    try {
      driveSaveSuccess = await driveStorage.saveAllData({
        inventory_items: inventoryItems,
        suppliers: suppliers,
        categories: categories,
        locations: locations,
        hot_counts: hotCountHistory,
        orders: orders,
        app_settings: appSettings
      });
    } catch (error) {
      console.error('Failed to save to Google Drive:', error);
      driveSaveSuccess = false;
    }
  }
  
  return localSaveSuccess && driveSaveSuccess;
}
```

## Module-Specific APIs

### Inventory Module API

```javascript
/**
 * Inventory module API
 */
const InventoryModule = {
  /**
   * Initialize the inventory module
   */
  initialize: function() {
    this.attachEventListeners();
    this.renderInventoryTable();
  },
  
  /**
   * Attach event listeners for inventory actions
   * @private
   */
  attachEventListeners: function() {
    // Implementation details...
  },
  
  /**
   * Render the inventory table with current data
   * @param {Object} [filters={}] - Optional filters to apply
   */
  renderInventoryTable: function(filters = {}) {
    // Implementation details...
  },
  
  /**
   * Open the item details modal
   * @param {string} itemId - ID of item to view
   */
  showItemDetails: function(itemId) {
    // Implementation details...
  },
  
  /**
   * Open the edit item modal
   * @param {string} [itemId=null] - Item ID to edit, or null for new item
   */
  openEditItemModal: function(itemId = null) {
    // Implementation details...
  },
  
  /**
   * Save item from the edit form
   * @returns {boolean} - Success status
   */
  saveItemFromForm: function() {
    // Implementation details...
  },
  
  /**
   * Apply filters to the inventory table
   * @param {Object} filters - Filter criteria
   */
  applyFilters: function(filters) {
    // Implementation details...
  },
  
  /**
   * Update item quantity
   * @param {string} itemId - Item ID
   * @param {number} newQuantity - New quantity value
   * @param {string} [reason='Manual adjustment'] - Reason for change
   * @returns {Object|null} - Updated item or null if failed
   */
  updateItemQuantity: function(itemId, newQuantity, reason = 'Manual adjustment') {
    // Implementation details...
  }
};
```

### Hot Counts Module API

```javascript
/**
 * Hot Counts module API
 */
const HotCountsModule = {
  /**
   * Initialize the hot counts module
   */
  initialize: function() {
    this.attachEventListeners();
    this.loadHotCountItems();
    this.checkTodayCounts();
  },
  
  /**
   * Start a new hot count
   * @param {string} countType - 'morning' or 'evening'
   */
  startNewCount: function(countType) {
    // Implementation details...
  },
  
  /**
   * Save the current hot count
   * @returns {Object|null} - Saved count record or null if failed
   */
  saveCurrentCount: function() {
    // Implementation details...
  },
  
  /**
   * Calculate usage between counts
   * @param {number} previousCount - Previous quantity
   * @param {number} currentCount - Current quantity
   * @param {number} [additions=0] - Additions since last count
   * @returns {number} - Calculated usage (can be negative)
   */
  calculateUsage: function(previousCount, currentCount, additions = 0) {
    return previousCount + additions - currentCount;
  },
  
  /**
   * Load items marked for hot counts
   * @returns {Array} - Items for hot counts
   */
  loadHotCountItems: function() {
    // Implementation details...
  },
  
  /**
   * Render hot count history
   * @param {number} [days=30] - Number of days of history to show
   */
  renderHotCountHistory: function(days = 30) {
    // Implementation details...
  },
  
  /**
   * Show details for a specific count
   * @param {string} countId - ID of count to view
   */
  showCountDetails: function(countId) {
    // Implementation details...
  }
};
```

### Import Module API

```javascript
/**
 * Import module API
 */
const ImportModule = {
  /**
   * Initialize the import module
   */
  initialize: function() {
    this.currentStep = 1;
    this.fileData = null;
    this.mappedColumns = {};
    this.parsedData = [];
    this.attachEventListeners();
  },
  
  /**
   * Attach event listeners for the import wizard
   * @private
   */
  attachEventListeners: function() {
    // Implementation details...
  },
  
  /**
   * Handle file selection
   * @param {File} file - Selected file object
   */
  handleFileSelect: function(file) {
    // Implementation details...
  },
  
  /**
   * Parse CSV data
   * @param {File} file - CSV file
   * @returns {Promise<Object>} - Parsing result
   */
  parseCSV: function(file) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: function(results) {
          resolve(results);
        },
        error: function(error) {
          reject(error);
        }
      });
    });
  },
  
  /**
   * Parse Excel data
   * @param {File} file - Excel file
   * @returns {Promise<Object>} - Parsing result
   */
  parseExcel: function(file) {
    // Implementation details...
  },
  
  /**
   * Generate column mapping interface
   * @param {Array} headers - Column headers from file
   */
  generateMappingInterface: function(headers) {
    // Implementation details...
  },
  
  /**
   * Preview mapped data
   */
  previewMappedData: function() {
    // Implementation details...
  },
  
  /**
   * Import data with current mapping
   * @param {Object} options - Import options
   * @returns {Promise<Object>} - Import results
   */
  importData: function(options = {}) {
    // Implementation details...
  },
  
  /**
   * Navigate to a specific step in the wizard
   * @param {number} step - Step number to navigate to
   */
  goToStep: function(step) {
    // Implementation details...
  }
};
