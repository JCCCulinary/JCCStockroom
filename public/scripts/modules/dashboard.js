// scripts/modules/dashboard.js - UPDATED: Enhanced KPIs with field consistency
import { db } from "../firebase/firebase.js";
import {
  getDocs,
  collection
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/**
 * Update KPI dashboard with enhanced metrics
 * UPDATED: Uses correct field names and enhanced calculations
 */
function updateKPI() {
  const inventoryRef = collection(db, "inventory_items");
  const wasteRef = collection(db, "waste_log");

  Promise.all([
    getDocs(inventoryRef),
    getDocs(wasteRef)
  ]).then(([inventorySnap, wasteSnap]) => {
    const inventory = inventorySnap.docs.map(doc => doc.data());
    const wasteEntries = wasteSnap.docs.map(doc => doc.data());

    console.log(`📊 Dashboard: Loaded ${inventory.length} inventory items and ${wasteEntries.length} waste entries`);

    // Calculate inventory stats with enhanced metrics
    calculateInventoryStats(inventory);
    
    // Calculate waste stats
    calculateWasteStats(wasteEntries);
    
    // Calculate additional insights
    calculateAdditionalInsights(inventory);
    
  }).catch(err => {
    console.error("Failed to load dashboard KPIs:", err);
    showErrorState();
  });
}

/**
 * Calculate inventory statistics using correct field names
 * UPDATED: Enhanced calculations with new field structure
 */
function calculateInventoryStats(inventory) {
  let totalValue = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let totalItems = 0;
  let activeItems = 0;
  
  // Enhanced metrics
  let totalUnits = 0;
  let averageUnitCost = 0;
  let vendorCounts = {};
  let brandCounts = {};
  let categoryValues = {};

  inventory.forEach(item => {
    // Filter out inactive items
    if (item.isActive === false) return;
    
    activeItems++;
    totalItems++;
    
    // FIXED: Use correct field names for calculations
    const unitCost = parseFloat(item.unitCost) || 0;
    const onHand = parseFloat(item.onHand) || 0;
    const par = parseFloat(item.par) || 0;
    const reorderPoint = parseFloat(item.reorderPoint) || par * 0.5;
    
    // Calculate total value
    const itemValue = unitCost * onHand;
    totalValue += itemValue;
    totalUnits += onHand;
    
    // Stock status calculations
    if (onHand <= 0) {
      outOfStockCount++;
    } else if (onHand <= reorderPoint) {
      lowStockCount++;
    }
    
    // Enhanced analytics
    // Vendor distribution
    const vendor = item.primaryVendor || 'Unknown';
    vendorCounts[vendor] = (vendorCounts[vendor] || 0) + 1;
    
    // Brand distribution (NEW)
    if (item.brand) {
      brandCounts[item.brand] = (brandCounts[item.brand] || 0) + 1;
    }
    
    // Category value distribution
    const category = item.category || 'Uncategorized';
    categoryValues[category] = (categoryValues[category] || 0) + itemValue;
  });

  // Calculate average unit cost
  averageUnitCost = totalUnits > 0 ? totalValue / totalUnits : 0;

  // Update main KPI displays
  updateElement("inventory-value", formatCurrency(totalValue));
  updateElement("low-stock", lowStockCount);
  updateElement("out-of-stock", outOfStockCount);
  
  // Monthly spend placeholder (would need purchase tracking)
  updateElement("monthly-spend", "$0.00");
  
  console.log(`📈 Inventory Stats: ${activeItems} active items, Total Value: ${formatCurrency(totalValue)}, Low: ${lowStockCount}, Out: ${outOfStockCount}`);
}

/**
 * Calculate waste statistics with time periods
 * UPDATED: Enhanced waste period calculations
 */
function calculateWasteStats(wasteEntries) {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfYear = new Date(today.getFullYear(), 0, 1);

  let wasteDay = 0;
  let wasteWeek = 0;
  let wasteMonth = 0;
  let wasteYear = 0;
  
  // Enhanced waste analytics
  let wasteByCategory = {};
  let wasteByReason = {};
  let totalWasteItems = wasteEntries.length;

  wasteEntries.forEach(entry => {
    const cost = parseFloat(entry.estimatedCost) || 0;
    const date = new Date(entry.date);
    
    // Time period calculations
    if (date >= startOfDay) wasteDay += cost;
    if (date >= startOfWeek) wasteWeek += cost;
    if (date >= startOfMonth) wasteMonth += cost;
    if (date >= startOfYear) wasteYear += cost;
    
    // Enhanced analytics
    // Waste by category (if available)
    if (entry.wasteCategory) {
      wasteByCategory[entry.wasteCategory] = (wasteByCategory[entry.wasteCategory] || 0) + cost;
    }
    
    // Waste by reason
    const reason = entry.reason || 'Unknown';
    wasteByReason[reason] = (wasteByReason[reason] || 0) + cost;
  });

  // Update waste displays
  updateElement("waste-day", formatCurrency(wasteDay));
  updateElement("waste-week", formatCurrency(wasteWeek));
  updateElement("waste-month", formatCurrency(wasteMonth));
  updateElement("waste-year", formatCurrency(wasteYear));
  
  console.log(`🗑️ Waste Stats: Day: ${formatCurrency(wasteDay)}, Week: ${formatCurrency(wasteWeek)}, Month: ${formatCurrency(wasteMonth)}, Year: ${formatCurrency(wasteYear)}`);
}

/**
 * Calculate additional insights for enhanced dashboard
 * NEW: Additional metrics using new field structure
 */
function calculateAdditionalInsights(inventory) {
  // Enhanced insights that could be displayed
  const insights = {
    totalBrands: 0,
    totalVendors: 0,
    totalManufacturers: 0,
    avgUnitsPerCase: 0,
    mostValuableCategory: '',
    topBrand: '',
    topVendor: ''
  };
  
  const brands = new Set();
  const vendors = new Set();
  const manufacturers = new Set();
  const categoryValues = {};
  const brandCounts = {};
  const vendorCounts = {};
  let totalUnitsPerCase = 0;
  let itemsWithCaseData = 0;

  inventory.forEach(item => {
    if (item.isActive === false) return;
    
    // NEW: Track brands, vendors, manufacturers
    if (item.brand) brands.add(item.brand);
    if (item.primaryVendor) vendors.add(item.primaryVendor);
    if (item.manufacturer) manufacturers.add(item.manufacturer);
    
    // NEW: Calculate average units per case
    if (item.unitsPerCase && item.unitsPerCase > 0) {
      totalUnitsPerCase += item.unitsPerCase;
      itemsWithCaseData++;
    }
    
    // Calculate category values
    const category = item.category || 'Uncategorized';
    const itemValue = (parseFloat(item.unitCost) || 0) * (parseFloat(item.onHand) || 0);
    categoryValues[category] = (categoryValues[category] || 0) + itemValue;
    
    // Count brands and vendors
    if (item.brand) {
      brandCounts[item.brand] = (brandCounts[item.brand] || 0) + 1;
    }
    if (item.primaryVendor) {
      vendorCounts[item.primaryVendor] = (vendorCounts[item.primaryVendor] || 0) + 1;
    }
  });

  insights.totalBrands = brands.size;
  insights.totalVendors = vendors.size;
  insights.totalManufacturers = manufacturers.size;
  insights.avgUnitsPerCase = itemsWithCaseData > 0 ? Math.round(totalUnitsPerCase / itemsWithCaseData) : 0;
  
  // Find top category by value
  insights.mostValuableCategory = Object.keys(categoryValues).reduce((a, b) => 
    categoryValues[a] > categoryValues[b] ? a : b, 'None');
  
  // Find top brand by item count
  insights.topBrand = Object.keys(brandCounts).reduce((a, b) => 
    brandCounts[a] > brandCounts[b] ? a : b, 'None');
  
  // Find top vendor by item count
  insights.topVendor = Object.keys(vendorCounts).reduce((a, b) => 
    vendorCounts[a] > vendorCounts[b] ? a : b, 'None');

  console.log(`🔍 Additional Insights:`, insights);
  
  // These insights could be displayed in an enhanced dashboard
  // For now, just log them - could be used for future dashboard enhancements
}

/**
 * Helper function to check if two dates are the same day
 */
function isSameDay(date1, date2) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Helper function to safely update DOM elements
 */
function updateElement(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  } else {
    console.warn(`Dashboard element not found: ${id}`);
  }
}

/**
 * Format currency values consistently
 */
function formatCurrency(value) {
  const num = parseFloat(value) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(num);
}

/**
 * Show error state when data loading fails
 */
function showErrorState() {
  const errorElements = [
    "inventory-value",
    "monthly-spend", 
    "low-stock",
    "out-of-stock",
    "waste-day",
    "waste-week", 
    "waste-month",
    "waste-year"
  ];
  
  errorElements.forEach(id => {
    updateElement(id, "Error");
  });
}

/**
 * Enhanced dashboard initialization
 * UPDATED: Better error handling and loading states
 */
function initializeDashboard() {
  console.log("🚀 Initializing enhanced dashboard...");
  
  // Set loading state
  const loadingElements = [
    "inventory-value",
    "monthly-spend",
    "low-stock", 
    "out-of-stock",
    "waste-day",
    "waste-week",
    "waste-month", 
    "waste-year"
  ];
  
  loadingElements.forEach(id => {
    updateElement(id, "Loading...");
  });
  
  // Load dashboard data
  updateKPI();
  
  // Set up auto-refresh every 5 minutes
  setInterval(() => {
    console.log("🔄 Auto-refreshing dashboard KPIs...");
    updateKPI();
  }, 5 * 60 * 1000);
}

/**
 * Calculate turnover rate for specific items or categories
 * NEW: Enhanced analytics function
 */
function calculateTurnoverRate(inventory, wasteEntries) {
  // This could be expanded to show inventory turnover rates
  // For now, placeholder for future enhancement
  const turnoverData = {
    overallTurnover: 0,
    categoryTurnovers: {},
    vendorTurnovers: {}
  };
  
  // Calculate turnover metrics here
  // Turnover = Usage / Average Inventory Value
  
  return turnoverData;
}

/**
 * Generate insights for management reporting
 * NEW: Management insights using enhanced data
 */
function generateManagementInsights(inventory, wasteEntries) {
  const insights = [];
  
  // Calculate key ratios
  const totalValue = inventory.reduce((sum, item) => {
    if (item.isActive === false) return sum;
    return sum + ((parseFloat(item.unitCost) || 0) * (parseFloat(item.onHand) || 0));
  }, 0);
  
  const totalWasteThisMonth = wasteEntries
    .filter(entry => {
      const entryDate = new Date(entry.date);
      const now = new Date();
      return entryDate.getMonth() === now.getMonth() && 
             entryDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, entry) => sum + (parseFloat(entry.estimatedCost) || 0), 0);
  
  const wastePercentage = totalValue > 0 ? (totalWasteThisMonth / totalValue) * 100 : 0;
  
  // Generate actionable insights
  if (wastePercentage > 5) {
    insights.push(`⚠️ Waste rate is ${wastePercentage.toFixed(1)}% - consider waste reduction strategies`);
  }
  
  const outOfStockItems = inventory.filter(item => 
    item.isActive !== false && (parseFloat(item.onHand) || 0) <= 0
  ).length;
  
  if (outOfStockItems > 0) {
    insights.push(`📦 ${outOfStockItems} items are out of stock - review ordering procedures`);
  }
  
  return insights;
}

// Export the module with enhanced functionality
export default {
  initialize: function () {
    fetch("templates/dashboard.html")
      .then(res => res.text())
      .then(html => {
        document.getElementById("app-content").innerHTML = html;
        initializeDashboard();
      })
      .catch(err => {
        console.error("Failed to load dashboard template:", err);
        document.getElementById("app-content").innerHTML = 
          `<div style="padding: 2rem; text-align: center; color: #dc3545;">
            <h3>Dashboard Error</h3>
            <p>Failed to load dashboard. Please refresh the page.</p>
          </div>`;
      });
  },
  
  // Export additional functions for potential use by other modules
  updateKPI,
  calculateInventoryStats,
  calculateWasteStats,
  generateManagementInsights
};