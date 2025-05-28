// scripts/modules/inventory.js - Enhanced Phase 1B
console.log("✅ Enhanced inventory.js is running");

import { loadItemForm } from './item-info.js';
import { StorageController } from '../storage/storageController.js';

// Global state
let inventoryData = [];
let filteredData = [];
let currentSort = { column: 'name', direction: 'asc' };
let selectedItems = new Set();

/**
 * Initialize the enhanced inventory module
 */
function initializeInventory() {
  console.log("Initializing enhanced inventory module...");
  showLoadingIndicator(true);

  const content = document.getElementById("app-content");

  fetch("./templates/inventory.html")
    .then(res => res.text())
    .then(html => {
      content.innerHTML = html;
      bindInventoryEvents();
      loadInventoryData();
    })
    .catch(err => {
      console.error("Failed to load inventory template:", err);
      showLoadingIndicator(false);
    });
}

/**
 * Bind all event listeners for the inventory module
 */
function bindInventoryEvents() {
  // Search and filter inputs
  const searchInput = document.getElementById("search");
  const filterLocation = document.getElementById("filter-location");
  const filterCategory = document.getElementById("filter-category");
  const filterEvent = document.getElementById("filter-event");
  const filterStatus = document.getElementById("filter-status");

  // Quick filter buttons
  const quickFilterBtns = document.querySelectorAll(".quick-filter-btn");

  // Action buttons
  const addItemButton = document.getElementById("add-item-button");
  const clearFiltersBtn = document.getElementById("clear-filters");
  const selectAllCheckbox = document.getElementById("select-all");

  // Bulk actions
  const bulkActionsBtn = document.getElementById("bulk-actions-btn");

  // Sortable headers
  const sortableHeaders = document.querySelectorAll(".sortable");

  // Event listeners
  searchInput?.addEventListener("input", debounce(applyFilters, 300));
  filterLocation?.addEventListener("change", applyFilters);
  filterCategory?.addEventListener("change", applyFilters);
  filterEvent?.addEventListener("change", applyFilters);
  filterStatus?.addEventListener("change", applyFilters);

  quickFilterBtns.forEach(btn => {
    btn.addEventListener("click", handleQuickFilter);
  });

  addItemButton?.addEventListener("click", () => {
    console.log("🟩 Add Item button clicked");
    loadItemForm(null);
  });

  clearFiltersBtn?.addEventListener("click", clearAllFilters);
  selectAllCheckbox?.addEventListener("change", handleSelectAll);

  sortableHeaders.forEach(header => {
    header.addEventListener("click", handleSort);
  });

  // Bulk actions events
  setupBulkActions();
}

/**
 * Load inventory data from storage
 */
async function loadInventoryData() {
  try {
    showLoadingIndicator(true);
    const data = await StorageController.load();
    inventoryData = Array.isArray(data) ? data : [];
    
    console.log(`Loaded ${inventoryData.length} inventory items`);
    
    applyFilters();
    updateInventoryStats();
    showLoadingIndicator(false);
    
  } catch (error) {
    console.error("Failed to load inventory data:", error);
    showLoadingIndicator(false);
    showNoResults(true);
  }
}

/**
 * Apply current filters to inventory data
 */
function applyFilters() {
  const search = document.getElementById("search")?.value.toLowerCase() || "";
  const locationFilter = document.getElementById("filter-location")?.value || "";
  const categoryFilter = document.getElementById("filter-category")?.value || "";
  const eventFilter = document.getElementById("filter-event")?.value || "";
  const statusFilter = document.getElementById("filter-status")?.value || "";

  filteredData = inventoryData.filter(item => {
    // Search filter (name, vendor, tags, description)
    const searchMatch = !search || 
      (item.name || "").toLowerCase().includes(search) ||
      (item.primaryVendor || "").toLowerCase().includes(search) ||
      (item.fullDescription || "").toLowerCase().includes(search) ||
      (item.tags || []).some(tag => tag.toLowerCase().includes(search));

    // Location filter
    const locationMatch = !locationFilter || item.location === locationFilter;

    // Category filter
    const categoryMatch = !categoryFilter || item.category === categoryFilter;

    // Event filter
    const eventMatch = !eventFilter || String(item.forEvent) === eventFilter;

    // Status filter
    const statusMatch = !statusFilter || getStockStatus(item) === statusFilter;

    return searchMatch && locationMatch && categoryMatch && eventMatch && statusMatch;
  });

  // Apply current sort
  applySorting();
  
  // Update display
  displayInventory(filteredData);
  updateInventoryStats();
  
  // Show/hide no results message
  showNoResults(filteredData.length === 0);
}

/**
 * Handle quick filter button clicks
 */
function handleQuickFilter(e) {
  const filterType = e.target.dataset.filter;
  
  // Remove active class from all buttons
  document.querySelectorAll(".quick-filter-btn").forEach(btn => {
    btn.classList.remove("active");
  });
  
  // Add active class to clicked button
  e.target.classList.add("active");
  
  // Apply filter
  switch (filterType) {
    case "low-stock":
      document.getElementById("filter-status").value = "low";
      break;
    case "out-of-stock":
      document.getElementById("filter-status").value = "out";
      break;
    case "expiring":
      document.getElementById("filter-status").value = "expiring";
      break;
    case "for-event":
      document.getElementById("filter-event").value = "true";
      break;
    case "all":
    default:
      clearAllFilters(false);
      break;
  }
  
  applyFilters();
}

/**
 * Clear all filters
 */
function clearAllFilters(resetActiveButton = true) {
  document.getElementById("search").value = "";
  document.getElementById("filter-location").value = "";
  document.getElementById("filter-category").value = "";
  document.getElementById("filter-event").value = "";
  document.getElementById("filter-status").value = "";
  
  if (resetActiveButton) {
    document.querySelectorAll(".quick-filter-btn").forEach(btn => {
      btn.classList.remove("active");
    });
    document.querySelector(".quick-filter-btn[data-filter='all']").classList.add("active");
  }
  
  applyFilters();
}

/**
 * Handle table sorting
 */
function handleSort(e) {
  const column = e.currentTarget.dataset.sort;
  
  if (currentSort.column === column) {
    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    currentSort.column = column;
    currentSort.direction = 'asc';
  }
  
  // Update sort indicators
  updateSortIndicators();
  
  // Apply sorting and refresh display
  applySorting();
  displayInventory(filteredData);
}

/**
 * Apply current sorting to filtered data
 */
function applySorting() {
  filteredData.sort((a, b) => {
    let aVal = a[currentSort.column] || "";
    let bVal = b[currentSort.column] || "";
    
    // Handle numeric values
    if (currentSort.column === 'unitCost' || currentSort.column === 'par' || currentSort.column === 'onHand') {
      aVal = parseFloat(aVal) || 0;
      bVal = parseFloat(bVal) || 0;
    } else {
      // Handle string values
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();
    }
    
    if (aVal < bVal) return currentSort.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return currentSort.direction === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Update sort indicators in table headers
 */
function updateSortIndicators() {
  document.querySelectorAll(".sort-indicator").forEach(indicator => {
    indicator.className = "sort-indicator";
  });
  
  const activeHeader = document.querySelector(`[data-sort="${currentSort.column}"] .sort-indicator`);
  if (activeHeader) {
    activeHeader.className = `sort-indicator ${currentSort.direction}`;
  }
}

/**
 * Display inventory items in the table
 */
function displayInventory(data) {
  const tbody = document.getElementById("inventory-table-body");
  if (!tbody) {
    console.error("Inventory table body not found.");
    return;
  }
  
  tbody.innerHTML = "";
  
  if (data.length === 0) {
    return; // Let the no-results message handle this
  }

  data.forEach((item) => {
    const row = document.createElement("tr");
    const stockStatus = getStockStatus(item);
    row.className = `status-${stockStatus}`;
    
    // Calculate total value
    const unitCost = parseFloat(item.unitCost) || 0;
    const onHand = parseFloat(item.onHand) || 0;
    const totalValue = unitCost * onHand;
    
    row.innerHTML = `
      <td class="bulk-select">
        <input type="checkbox" class="item-checkbox" data-id="${item.id}">
      </td>
      <td class="item-name">
        <div class="item-details">
          <strong>${item.name || ""}</strong>
          ${item.fullDescription ? `<div class="item-description">${item.fullDescription}</div>` : ""}
        </div>
      </td>
      <td>
        <span class="category-badge">${item.category || "Uncategorized"}</span>
      </td>
      <td>${item.location || ""}</td>
      <td>
        <div class="vendor-info">
          ${item.primaryVendor || "—"}
          ${item.vendorSKU ? `<div class="vendor-sku">SKU: ${item.vendorSKU}</div>` : ""}
        </div>
      </td>
      <td class="text-center">
        ${item.forEvent ? "✓" : ""}
      </td>
      <td class="text-center">${item.par || ""}</td>
      <td class="text-center">${item.onHand || ""}</td>
      <td class="text-center">
        <span class="status-badge status-${stockStatus}">${getStatusText(stockStatus)}</span>
      </td>
      <td class="text-right">${formatCurrency(unitCost)}</td>
      <td class="text-right">${formatCurrency(totalValue)}</td>
      <td class="text-center">
        <div class="action-buttons-cell">
          <button class="btn-sm btn-edit" data-id="${item.id}">Edit</button>
          <button class="btn-sm btn-delete" data-id="${item.id}">Delete</button>
        </div>
      </td>
    `;

    // Add event listeners for row actions
    const editBtn = row.querySelector(".btn-edit");
    const deleteBtn = row.querySelector(".btn-delete");
    const checkbox = row.querySelector(".item-checkbox");

    editBtn.addEventListener("click", () => loadItemForm(item.id));
    
    deleteBtn.addEventListener("click", async () => {
      if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
        try {
          await StorageController.delete(item.id);
          showToast("Item deleted successfully", "success");
          loadInventoryData(); // Reload data
        } catch (err) {
          console.error("Failed to delete item:", err);
          showToast("Failed to delete item", "error");
        }
      }
    });

    checkbox.addEventListener("change", handleItemSelection);

    tbody.appendChild(row);
  });
}

/**
 * Determine stock status based on PAR and onHand values
 */
function getStockStatus(item) {
  const onHand = parseFloat(item.onHand) || 0;
  const par = parseFloat(item.par) || 0;
  const reorderPoint = parseFloat(item.reorderPoint) || par * 0.5;
  
  // Check if expiring soon
  if (item.expirationDate) {
    const expDate = new Date(item.expirationDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry <= 3 && daysUntilExpiry >= 0) {
      return "expiring";
    }
  }
  
  // Check stock levels
  if (onHand <= 0) {
    return "out";
  } else if (onHand <= reorderPoint) {
    return "low";
  } else if (onHand >= par) {
    return "excellent";
  } else {
    return "good";
  }
}

/**
 * Get display text for status
 */
function getStatusText(status) {
  const statusTexts = {
    excellent: "Excellent",
    good: "Good",
    low: "Low",
    out: "Out",
    expiring: "Expiring"
  };
  return statusTexts[status] || "Unknown";
}

/**
 * Update inventory statistics
 */
function updateInventoryStats() {
  const totalItems = filteredData.length;
  let totalValue = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  
  filteredData.forEach(item => {
    const unitCost = parseFloat(item.unitCost) || 0;
    const onHand = parseFloat(item.onHand) || 0;
    totalValue += unitCost * onHand;
    
    const status = getStockStatus(item);
    if (status === "low" || status === "expiring") {
      lowStockCount++;
    } else if (status === "out") {
      outOfStockCount++;
    }
  });
  
  // Update stat displays
  document.getElementById("total-items").textContent = totalItems;
  document.getElementById("total-value").textContent = formatCurrency(totalValue);
  document.getElementById("low-stock-count").textContent = lowStockCount;
  document.getElementById("out-stock-count").textContent = outOfStockCount;
}

/**
 * Handle individual item selection
 */
function handleItemSelection(e) {
  const itemId = e.target.dataset.id;
  
  if (e.target.checked) {
    selectedItems.add(itemId);
  } else {
    selectedItems.delete(itemId);
  }
  
  updateBulkActionsVisibility();
  updateSelectAllState();
}

/**
 * Handle select all checkbox
 */
function handleSelectAll(e) {
  const checkboxes = document.querySelectorAll(".item-checkbox");
  
  checkboxes.forEach(checkbox => {
    checkbox.checked = e.target.checked;
    const itemId = checkbox.dataset.id;
    
    if (e.target.checked) {
      selectedItems.add(itemId);
    } else {
      selectedItems.delete(itemId);
    }
  });
  
  updateBulkActionsVisibility();
}

/**
 * Update select all checkbox state
 */
function updateSelectAllState() {
  const selectAllCheckbox = document.getElementById("select-all");
  const checkboxes = document.querySelectorAll(".item-checkbox");
  const checkedBoxes = document.querySelectorAll(".item-checkbox:checked");
  
  if (checkedBoxes.length === 0) {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = false;
  } else if (checkedBoxes.length === checkboxes.length) {
    selectAllCheckbox.checked = true;
    selectAllCheckbox.indeterminate = false;
  } else {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = true;
  }
}

/**
 * Update bulk actions panel visibility
 */
function updateBulkActionsVisibility() {
  const bulkPanel = document.getElementById("bulk-actions-panel");
  const bulkCount = document.querySelector(".bulk-count");
  
  if (selectedItems.size > 0) {
    bulkPanel.style.display = "block";
    bulkCount.textContent = `${selectedItems.size} item${selectedItems.size > 1 ? 's' : ''} selected`;
  } else {
    bulkPanel.style.display = "none";
  }
}

/**
 * Setup bulk actions event listeners
 */
function setupBulkActions() {
  const bulkEditLocation = document.getElementById("bulk-edit-location");
  const bulkEditCategory = document.getElementById("bulk-edit-category");
  const bulkToggleEvent = document.getElementById("bulk-toggle-event");
  const bulkDelete = document.getElementById("bulk-delete");
  const bulkCancel = document.getElementById("bulk-cancel");
  
  bulkEditLocation?.addEventListener("click", handleBulkLocationChange);
  bulkEditCategory?.addEventListener("click", handleBulkCategoryChange);
  bulkToggleEvent?.addEventListener("click", handleBulkToggleEvent);
  bulkDelete?.addEventListener("click", handleBulkDelete);
  bulkCancel?.addEventListener("click", clearBulkSelection);
}

/**
 * Handle bulk location change
 */
async function handleBulkLocationChange() {
  const newLocation = prompt("Enter new location for selected items:");
  if (!newLocation) return;
  
  try {
    const selectedItemsData = inventoryData.filter(item => selectedItems.has(item.id));
    const updates = selectedItemsData.map(item => ({
      ...item,
      location: newLocation,
      lastModified: new Date().toISOString(),
      modifiedBy: "bulk_update"
    }));
    
    await StorageController.save(updates);
    showToast(`Updated location for ${selectedItems.size} items`, "success");
    clearBulkSelection();
    loadInventoryData();
  } catch (error) {
    console.error("Bulk location update failed:", error);
    showToast("Failed to update locations", "error");
  }
}

/**
 * Handle bulk category change
 */
async function handleBulkCategoryChange() {
  const categories = ["Protein", "Dairy", "Produce", "Dry Goods", "Beverages", "Frozen", "Other"];
  const categorySelect = categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
  
  const modal = document.createElement('div');
  modal.innerHTML = `
    <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;">
      <div style="background: white; padding: 2rem; border-radius: 8px; min-width: 300px;">
        <h3>Select Category</h3>
        <select id="category-select" style="width: 100%; padding: 0.5rem; margin: 1rem 0;">
          <option value="">Select category...</option>
          ${categorySelect}
        </select>
        <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
          <button id="cancel-category" style="padding: 0.5rem 1rem;">Cancel</button>
          <button id="apply-category" style="padding: 0.5rem 1rem; background: var(--header-bg); color: white; border: none;">Apply</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.querySelector('#cancel-category').onclick = () => modal.remove();
  modal.querySelector('#apply-category').onclick = async () => {
    const newCategory = modal.querySelector('#category-select').value;
    if (!newCategory) return;
    
    try {
      const selectedItemsData = inventoryData.filter(item => selectedItems.has(item.id));
      const updates = selectedItemsData.map(item => ({
        ...item,
        category: newCategory,
        lastModified: new Date().toISOString(),
        modifiedBy: "bulk_update"
      }));
      
      await StorageController.save(updates);
      showToast(`Updated category for ${selectedItems.size} items`, "success");
      clearBulkSelection();
      loadInventoryData();
      modal.remove();
    } catch (error) {
      console.error("Bulk category update failed:", error);
      showToast("Failed to update categories", "error");
    }
  };
}

/**
 * Handle bulk toggle event status
 */
async function handleBulkToggleEvent() {
  try {
    const selectedItemsData = inventoryData.filter(item => selectedItems.has(item.id));
    const updates = selectedItemsData.map(item => ({
      ...item,
      forEvent: !item.forEvent,
      lastModified: new Date().toISOString(),
      modifiedBy: "bulk_update"
    }));
    
    await StorageController.save(updates);
    showToast(`Toggled event status for ${selectedItems.size} items`, "success");
    clearBulkSelection();
    loadInventoryData();
  } catch (error) {
    console.error("Bulk toggle failed:", error);
    showToast("Failed to toggle event status", "error");
  }
}

/**
 * Handle bulk delete
 */
async function handleBulkDelete() {
  if (!confirm(`Are you sure you want to delete ${selectedItems.size} selected items? This cannot be undone.`)) {
    return;
  }
  
  try {
    const deletePromises = Array.from(selectedItems).map(id => StorageController.delete(id));
    await Promise.all(deletePromises);
    
    showToast(`Deleted ${selectedItems.size} items`, "success");
    clearBulkSelection();
    loadInventoryData();
  } catch (error) {
    console.error("Bulk delete failed:", error);
    showToast("Failed to delete items", "error");
  }
}

/**
 * Clear bulk selection
 */
function clearBulkSelection() {
  selectedItems.clear();
  document.querySelectorAll(".item-checkbox").forEach(cb => cb.checked = false);
  document.getElementById("select-all").checked = false;
  document.getElementById("select-all").indeterminate = false;
  updateBulkActionsVisibility();
}

/**
 * Show/hide loading indicator
 */
function showLoadingIndicator(show) {
  const indicator = document.getElementById("loading-indicator");
  if (indicator) {
    indicator.style.display = show ? "block" : "none";
  }
}

/**
 * Show/hide no results message
 */
function showNoResults(show) {
  const noResults = document.getElementById("no-results");
  const tableContainer = document.querySelector(".table-container");
  
  if (noResults && tableContainer) {
    noResults.style.display = show ? "block" : "none";
    tableContainer.style.display = show ? "none" : "block";
  }
}

/**
 * Format currency values
 */
function formatCurrency(value) {
  const num = parseFloat(value) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(num);
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
  // Create toast if it doesn't exist
  let toast = document.getElementById('toast-notification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 1.5rem;
      border-radius: 4px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease;
    `;
    document.body.appendChild(toast);
  }
  
  // Set message and style based on type
  toast.textContent = message;
  const colors = {
    success: '#28a745',
    error: '#dc3545',
    warning: '#ffc107',
    info: '#17a2b8'
  };
  toast.style.backgroundColor = colors[type] || colors.info;
  
  // Show toast
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
  }, 100);
  
  // Hide toast after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
  }, 3000);
}

/**
 * Debounce function for search input
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Export the module
export default {
  initialize: initializeInventory
};