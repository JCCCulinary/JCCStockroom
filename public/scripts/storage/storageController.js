// scripts/storage/storageController.js - UPDATED: Decimal validation & new field support
import { db, collection, getDocs, setDoc, doc, deleteDoc } from '../firebase/firebase.js';

export const StorageController = {
  /**
   * Load all inventory items from Firebase
   */
  async load() {
    try {
      const snapshot = await getDocs(collection(db, "inventory_items"));
      const items = snapshot.docs.map(doc => {
        const data = doc.data();
        return this.sanitizeItemData(data);
      });
      
      console.log("✅ Loaded inventory from Firebase:", items.length, "items");
      return items;
    } catch (error) {
      console.error("❌ Failed to load inventory from Firebase:", error);
      throw error;
    }
  },

  /**
   * Save inventory items to Firebase with validation
   */
  async save(data) {
    try {
      if (!Array.isArray(data)) {
        data = [data]; // Convert single item to array
      }

      // Validate and sanitize each item before saving
      const validatedItems = data.map(item => this.validateAndSanitizeItem(item));
      
      // Save each item to Firebase
      for (const item of validatedItems) {
        await setDoc(doc(db, "inventory_items", item.id), item);
      }
      
      console.log(`✅ Saved ${validatedItems.length} inventory items to Firebase`);
      return validatedItems;
    } catch (error) {
      console.error("❌ Failed to save inventory to Firebase:", error);
      throw error;
    }
  },

  /**
   * Delete item from Firebase
   */
  async delete(id) {
    try {
      if (!id) {
        throw new Error("Item ID is required for deletion");
      }
      
      await deleteDoc(doc(db, "inventory_items", id));
      console.log("✅ Deleted item with ID:", id);
    } catch (error) {
      console.error("❌ Failed to delete item:", error);
      throw error;
    }
  },

  /**
   * Validate and sanitize item data before saving
   */
  validateAndSanitizeItem(item) {
    if (!item || typeof item !== 'object') {
      throw new Error("Invalid item data: must be an object");
    }

    // Ensure required fields exist
    if (!item.id) {
      item.id = crypto.randomUUID();
    }

    if (!item.name || typeof item.name !== 'string' || item.name.trim() === '') {
      throw new Error("Item name is required and must be a non-empty string");
    }

    // Sanitize and validate the item
    const sanitized = {
      // System fields
      id: String(item.id),
      isActive: Boolean(item.isActive !== false), // Default to true
      timestamp: item.timestamp || new Date().toISOString(),
      lastModified: new Date().toISOString(),
      
      // Basic Info
      name: String(item.name).trim(),
      par: this.validateInteger(item.par, 0),
      onHand: this.validateDecimal(item.onHand, 0), // NEW: Decimal validation
      location: this.sanitizeString(item.location),
      area: this.sanitizeString(item.area),
      forEvent: Boolean(item.forEvent),
      
      // Pricing & Pack Size (NEW FIELD NAMES)
      unitsPerCase: this.validateInteger(item.unitsPerCase, 0),
      sizePerUnit: this.validateDecimal(item.sizePerUnit, 0),
      unitType: this.sanitizeString(item.unitType) || 'OZ',
      caseCost: this.validateDecimal(item.caseCost, 0),
      unitCost: this.validateDecimal(item.unitCost, 0),
      
      // NEW: Portion Size fields
      portionSize: item.portionSize ? this.validateDecimal(item.portionSize, null) : null,
      portionUnit: item.portionSize ? (this.sanitizeString(item.portionUnit) || 'OZ') : null,
      
      // Vendor Information (INCLUDING NEW FIELDS)
      primaryVendor: this.sanitizeString(item.primaryVendor),
      vendorSKU: this.sanitizeString(item.vendorSKU),
      brand: this.sanitizeString(item.brand), // NEW
      manufacturer: this.sanitizeString(item.manufacturer), // NEW
      vendorNotes: this.sanitizeString(item.vendorNotes),
      
      // Storage & Tracking
      wasteEntryUnit: this.sanitizeString(item.wasteEntryUnit) || 'OZ',
      notes: this.sanitizeString(item.notes),
      reorderPoint: item.reorderPoint ? this.validateDecimal(item.reorderPoint, null) : null, // NEW: Decimal support
      
      // Meta fields
      createdBy: this.sanitizeString(item.createdBy) || 'system',
      modifiedBy: this.sanitizeString(item.modifiedBy) || 'system'
    };

    // Validate business logic
    this.validateBusinessRules(sanitized);

    return sanitized;
  },

  /**
   * Sanitize item data when loading (for backward compatibility)
   */
  sanitizeItemData(item) {
    if (!item || typeof item !== 'object') {
      return null;
    }

    // Handle legacy field names and ensure decimal formatting
    return {
      ...item,
      onHand: this.validateDecimal(item.onHand, 0),
      reorderPoint: item.reorderPoint ? this.validateDecimal(item.reorderPoint, null) : null,
      portionSize: item.portionSize ? this.validateDecimal(item.portionSize, null) : null,
      caseCost: this.validateDecimal(item.caseCost, 0),
      unitCost: this.validateDecimal(item.unitCost, 0),
      sizePerUnit: this.validateDecimal(item.sizePerUnit, 0),
      
      // Ensure new fields exist with defaults
      brand: item.brand || '',
      manufacturer: item.manufacturer || '',
      portionUnit: item.portionUnit || null
    };
  },

  /**
   * NEW: Validate decimal values with proper precision
   */
  validateDecimal(value, defaultValue = 0) {
    if (value === null || value === undefined || value === '') {
      return defaultValue;
    }

    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
      return defaultValue;
    }

    if (parsed < 0) {
      return defaultValue;
    }

    // Round to 2 decimal places to avoid floating point issues
    return Math.round(parsed * 100) / 100;
  },

  /**
   * Validate integer values
   */
  validateInteger(value, defaultValue = 0) {
    if (value === null || value === undefined || value === '') {
      return defaultValue;
    }

    const parsed = parseInt(value);
    if (isNaN(parsed)) {
      return defaultValue;
    }

    return Math.max(0, parsed); // Ensure non-negative
  },

  /**
   * Sanitize string values
   */
  sanitizeString(value) {
    if (value === null || value === undefined) {
      return '';
    }
    
    return String(value).trim();
  },

  /**
   * Validate business rules
   */
  validateBusinessRules(item) {
    // Check case/unit consistency
    if (item.unitsPerCase > 0 && item.sizePerUnit <= 0) {
      console.warn(`Item ${item.name}: Size per unit should be > 0 when units per case is specified`);
    }

    if (item.sizePerUnit > 0 && item.unitsPerCase <= 0) {
      console.warn(`Item ${item.name}: Units per case should be > 0 when size per unit is specified`);
    }

    // Check PAR vs On Hand relationship
    if (item.par > 0 && item.onHand > item.par * 3) {
      console.warn(`Item ${item.name}: On hand quantity (${item.onHand}) seems unusually high compared to PAR (${item.par})`);
    }

    // Check reorder point vs PAR
    if (item.reorderPoint && item.par > 0 && item.reorderPoint > item.par) {
      console.warn(`Item ${item.name}: Reorder point (${item.reorderPoint}) is higher than PAR level (${item.par})`);
    }

    // Check portion size reasonableness
    if (item.portionSize && item.portionSize > 1000) {
      console.warn(`Item ${item.name}: Portion size (${item.portionSize}) seems unusually large`);
    }

    // Check cost reasonableness
    if (item.unitCost > 1000) {
      console.warn(`Item ${item.name}: Unit cost ($${item.unitCost}) seems unusually high`);
    }

    return true;
  },

  /**
   * NEW: Bulk update specific fields for multiple items
   */
  async bulkUpdate(itemIds, updates) {
    try {
      if (!Array.isArray(itemIds) || itemIds.length === 0) {
        throw new Error("Item IDs array is required for bulk update");
      }

      // Load existing items
      const allItems = await this.load();
      const itemsToUpdate = allItems.filter(item => itemIds.includes(item.id));

      if (itemsToUpdate.length === 0) {
        throw new Error("No matching items found for bulk update");
      }

      // Apply updates
      const updatedItems = itemsToUpdate.map(item => ({
        ...item,
        ...updates,
        lastModified: new Date().toISOString(),
        modifiedBy: updates.modifiedBy || 'bulk_update'
      }));

      // Save updated items
      await this.save(updatedItems);
      
      console.log(`✅ Bulk updated ${updatedItems.length} items`);
      return updatedItems;
    } catch (error) {
      console.error("❌ Bulk update failed:", error);
      throw error;
    }
  },

  /**
   * NEW: Get items with low stock (for alerts)
   */
  async getLowStockItems() {
    try {
      const items = await this.load();
      const lowStockItems = items.filter(item => {
        const onHand = parseFloat(item.onHand) || 0;
        const par = parseFloat(item.par) || 0;
        const reorderPoint = parseFloat(item.reorderPoint) || (par * 0.5);
        
        return onHand <= reorderPoint && onHand > 0;
      });

      console.log(`📊 Found ${lowStockItems.length} low stock items`);
      return lowStockItems;
    } catch (error) {
      console.error("❌ Failed to get low stock items:", error);
      throw error;
    }
  },

  /**
   * NEW: Get out of stock items
   */
  async getOutOfStockItems() {
    try {
      const items = await this.load();
      const outOfStockItems = items.filter(item => {
        const onHand = parseFloat(item.onHand) || 0;
        return onHand <= 0;
      });

      console.log(`📊 Found ${outOfStockItems.length} out of stock items`);
      return outOfStockItems;
    } catch (error) {
      console.error("❌ Failed to get out of stock items:", error);
      throw error;
    }
  },

  /**
   * NEW: Calculate total inventory value
   */
  async getTotalInventoryValue() {
    try {
      const items = await this.load();
      const totalValue = items.reduce((sum, item) => {
        const onHand = parseFloat(item.onHand) || 0;
        const unitCost = parseFloat(item.unitCost) || 0;
        return sum + (onHand * unitCost);
      }, 0);

      console.log(`💰 Total inventory value: $${totalValue.toFixed(2)}`);
      return totalValue;
    } catch (error) {
      console.error("❌ Failed to calculate inventory value:", error);
      throw error;
    }
  },

  /**
   * NEW: Search items by multiple criteria
   */
  async searchItems(searchTerms) {
    try {
      const items = await this.load();
      const searchLower = searchTerms.toLowerCase();
      
      const matchedItems = items.filter(item => {
        return (
          (item.name || '').toLowerCase().includes(searchLower) ||
          (item.brand || '').toLowerCase().includes(searchLower) ||
          (item.manufacturer || '').toLowerCase().includes(searchLower) ||
          (item.primaryVendor || '').toLowerCase().includes(searchLower) ||
          (item.vendorSKU || '').toLowerCase().includes(searchLower) ||
          (item.category || '').toLowerCase().includes(searchLower)
        );
      });

      console.log(`🔍 Search for "${searchTerms}" found ${matchedItems.length} items`);
      return matchedItems;
    } catch (error) {
      console.error("❌ Search failed:", error);
      throw error;
    }
  }
};