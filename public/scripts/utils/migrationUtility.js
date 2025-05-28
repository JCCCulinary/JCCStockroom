// scripts/utils/migrationUtility.js
import { db } from '../firebase/firebase.js';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  writeBatch,
  setDoc
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

/**
 * Migration utility to enhance existing inventory items with new fields
 * while preserving all current data and functionality
 */
export class MigrationUtility {
  
  /**
   * Migrate inventory items to enhanced schema
   */
  static async migrateInventoryItems() {
    console.log('🔄 Starting inventory migration...');
    
    try {
      const inventoryRef = collection(db, 'inventory_items');
      const snapshot = await getDocs(inventoryRef);
      const batch = writeBatch(db);
      
      let migrationCount = 0;
      const migrationResults = {
        processed: 0,
        updated: 0,
        errors: []
      };
      
      snapshot.docs.forEach((docSnapshot) => {
        const item = docSnapshot.data();
        const itemRef = doc(db, 'inventory_items', docSnapshot.id);
        
        // Check if item needs migration (missing new fields)
        const needsMigration = !item.hasOwnProperty('barcode') || 
                              !item.hasOwnProperty('category') ||
                              !item.hasOwnProperty('isActive');
        
        if (needsMigration) {
          const enhancedItem = this.enhanceItemData(item);
          batch.update(itemRef, enhancedItem);
          migrationCount++;
        }
        
        migrationResults.processed++;
      });
      
      if (migrationCount > 0) {
        await batch.commit();
        migrationResults.updated = migrationCount;
        console.log(`✅ Migration complete: ${migrationCount} items updated`);
      } else {
        console.log('✅ No migration needed - all items already have enhanced schema');
      }
      
      return migrationResults;
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }
  
  /**
   * Enhance existing item data with new fields while preserving existing data
   */
  static enhanceItemData(existingItem) {
    const currentTime = new Date().toISOString();
    
    return {
      // Preserve ALL existing fields
      ...existingItem,
      
      // Add new fields with sensible defaults
      barcode: existingItem.barcode || "",
      primaryVendor: existingItem.primaryVendor || "",
      vendorSKU: existingItem.vendorSKU || "",
      alternateVendors: existingItem.alternateVendors || [],
      priceHistory: existingItem.priceHistory || [],
      expirationDate: existingItem.expirationDate || null,
      lotNumber: existingItem.lotNumber || "",
      itemImage: existingItem.itemImage || "",
      fullDescription: existingItem.fullDescription || existingItem.name || "",
      allergenInfo: existingItem.allergenInfo || [],
      storageInstructions: existingItem.storageInstructions || "",
      yieldPercentage: existingItem.yieldPercentage || 100,
      shelfLifeDays: existingItem.shelfLifeDays || null,
      reorderPoint: existingItem.reorderPoint || existingItem.par || null,
      maxStock: existingItem.maxStock || null,
      category: existingItem.category || this.inferCategory(existingItem),
      subcategory: existingItem.subcategory || "",
      isActive: existingItem.hasOwnProperty('isActive') ? existingItem.isActive : true,
      tags: existingItem.tags || [],
      lastCountDate: existingItem.lastCountDate || null,
      countVariance: existingItem.countVariance || 0,
      averageUsagePerWeek: existingItem.averageUsagePerWeek || 0,
      createdBy: existingItem.createdBy || "system_migration",
      modifiedBy: existingItem.modifiedBy || "system_migration",
      
      // Update modification timestamp
      lastModified: currentTime,
      migrationDate: currentTime
    };
  }
  
  /**
   * Infer category from existing item data
   */
  static inferCategory(item) {
    const name = (item.name || "").toLowerCase();
    const location = (item.location || "").toLowerCase();
    
    // Protein
    if (name.includes('chicken') || name.includes('beef') || name.includes('pork') || 
        name.includes('fish') || name.includes('salmon') || name.includes('shrimp')) {
      return 'Protein';
    }
    
    // Dairy
    if (name.includes('milk') || name.includes('cheese') || name.includes('butter') || 
        name.includes('cream') || name.includes('yogurt')) {
      return 'Dairy';
    }
    
    // Produce
    if (name.includes('lettuce') || name.includes('tomato') || name.includes('onion') || 
        name.includes('potato') || name.includes('apple') || location.includes('cooler')) {
      return 'Produce';
    }
    
    // Dry Goods
    if (location.includes('dry') || name.includes('flour') || name.includes('rice') || 
        name.includes('pasta') || name.includes('spice')) {
      return 'Dry Goods';
    }
    
    // Beverages
    if (name.includes('wine') || name.includes('beer') || name.includes('soda') || 
        name.includes('juice') || location.includes('bar')) {
      return 'Beverages';
    }
    
    // Frozen
    if (location.includes('freezer')) {
      return 'Frozen';
    }
    
    // Default
    return 'Other';
  }
  
  /**
   * Create the new inventory_movements collection structure
   */
  static async initializeMovementsCollection() {
    console.log('🔄 Initializing inventory_movements collection...');
    
    try {
      // Create a sample movement record to establish the collection
      const sampleMovement = {
        id: "sample_movement_init",
        itemId: "sample",
        itemName: "Sample Movement Record",
        movementType: "SYSTEM_INIT",
        quantity: 0,
        quantityBefore: 0,
        quantityAfter: 0,
        unitCost: 0,
        totalCost: 0,
        date: new Date().toISOString(),
        userId: "system",
        userName: "System Migration",
        reason: "Collection initialization",
        referenceDocument: "",
        location: "",
        notes: "Sample record created during migration - can be deleted",
        batchLot: "",
        expirationDate: null,
        vendorName: "",
        approved: true,
        approvedBy: "system",
        timestamp: new Date().toISOString()
      };
      
      const movementRef = doc(db, 'inventory_movements', 'sample_movement_init');
      await setDoc(movementRef, sampleMovement);
      
      console.log('✅ inventory_movements collection initialized');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize movements collection:', error);
      throw error;
    }
  }
  
  /**
   * Run complete migration process
   */
  static async runFullMigration() {
    console.log('🚀 Starting full database migration...');
    
    const results = {
      inventory: null,
      movements: false,
      timestamp: new Date().toISOString()
    };
    
    try {
      // Step 1: Migrate inventory items
      results.inventory = await this.migrateInventoryItems();
      
      // Step 2: Initialize movements collection
      results.movements = await this.initializeMovementsCollection();
      
      console.log('🎉 Full migration completed successfully!');
      console.log('Migration Results:', results);
      
      return results;
      
    } catch (error) {
      console.error('💥 Migration failed:', error);
      throw error;
    }
  }
}

// Utility function to run migration from console
window.runMigration = async () => {
  try {
    const results = await MigrationUtility.runFullMigration();
    alert(`Migration completed!\nInventory items processed: ${results.inventory.processed}\nItems updated: ${results.inventory.updated}`);
    return results;
  } catch (error) {
    alert(`Migration failed: ${error.message}`);
    throw error;
  }
};