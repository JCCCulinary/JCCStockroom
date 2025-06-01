// scripts/modules/inventory.js - UPDATED: Removed Unit Cost column from display
console.log("✅ Enhanced inventory.js with decimal support is running");

import { loadItemForm } from './item-info.js';
import { StorageController } from '../storage/storageController.js';

// Global state
let inventoryData = [];
let filteredData = [];
let currentSort = { column: 'name', direction: 'asc' };
let selectedItems = new Set();

// Pagination state
let pagination = {
  currentPage: 1,
  itemsPerPage: 50, // Default items per page
  totalPages: 1,
  totalItems: 0
};

/**
 * Initialize the enhanced inventory module
 */
function initializeInventory() {
  console.log("Initializing enhanced inventory module with decimal support...");
  showLoadingIndicator(true);

  const content = document.getElementById("app-content");

  fetch("./templates/inventory.html")
    .then(res => res.text())
    .then(html => {
      content.innerHTML = html;
      setupPaginationControls(); // Add pagination controls
      bindInventoryEvents();
      loadInventoryData();
    })
    .catch(err => {
      console.error("Failed to load inventory template:", err);
      showLoadingIndicator(false);
    });
}

/**
 * Setup pagination controls - FIXED: Added error handling
 */
function setupPaginationControls() {
  const tableContainer = document.querySelector('.inventory-container');
  
  // FIXED: Add error handling to prevent null reference
  if (!tableContainer) {
    console.error('Inventory container not found - pagination setup failed');
    return;
  }
  
  // Add pagination controls after the table
  const paginationHTML = `
    <div class="pagination-container">
      <div class="pagination-info">
        <span>Show </span>
        <select id="items-per-page" class="pagination-select">
          <option value="25">25</option>
          <option value="50" selected>50</option>
          <option value="100">100</option>
          <option value="200">200</option>
          <option value="all">All</option>
        </select>
        <span> items per page</span>
        <span class="pagination-summary">
          Showing <span id="items-start">0</span>-<span id="items-end">0</span> 
          of <span id="items-total">0</span> items
        </span>
      </div>
      
      <div class="pagination-controls">
        <button id="first-page" class="pagination-btn" title="First Page">&laquo;</button>
        <button id="prev-page" class="pagination-btn" title="Previous Page">&lsaquo;</button>
        
        <div class="page-numbers" id="page-numbers">
          <!-- Page numbers will be generated here -->
        </div>
        
        <button id="next-page" class="pagination-btn" title="Next Page">&rsaquo;</button>
        <button id="last-page" class="pagination-btn" title="Last Page">&raquo;</button>
      </div>
      
      <div class="pagination-jump">
        <span>Go to page: </span>
        <input type="number" id="page-jump" class="page-jump-input" min="1" max="1" value="1">
        <button id="jump-to-page" class="btn btn-sm">Go</button>
      </div>
    </div>
  `;
  
  tableContainer.insertAdjacentHTML('afterend', paginationHTML);
  bindPaginationEvents();
}

/**
 * Bind pagination event listeners
 */
function bindPaginationEvents() {
  const itemsPerPageSelect = document.getElementById('items-per-page');
  const firstPageBtn = document.getElementById('first-page');
  const prevPageBtn = document.getElementById('prev-page');
  const nextPageBtn = document.getElementById('next-page');
  const lastPageBtn = document.getElementById('last-page');
  const pageJumpInput = document.getElementById('page-jump');
  const jumpToPageBtn = document.getElementById('jump-to-page');

  itemsPerPageSelect?.addEventListener('change', handleItemsPerPageChange);
  firstPageBtn?.addEventListener('click', () => goToPage(1));
  prevPageBtn?.addEventListener('click', () => goToPage(pagination.currentPage - 1));
  nextPageBtn?.addEventListener('click', () => goToPage(pagination.currentPage + 1));
  lastPageBtn?.addEventListener('click', () => goToPage(pagination.totalPages));
  
  pageJumpInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const page = parseInt(e.target.value);
      if (page >= 1 && page <= pagination.totalPages) {
        goToPage(page);
      }
    }
  });
  
  jumpToPageBtn?.addEventListener('click', () => {
    const page = parseInt(pageJumpInput.value);
    if (page >= 1 && page <= pagination.totalPages) {
      goToPage(page);
    }
  });
}

/**
 * Handle items per page change
 */
function handleItemsPerPageChange(e) {
  const value = e.target.value;
  pagination.itemsPerPage = value === 'all' ? filteredData.length : parseInt(value);
  pagination.currentPage = 1; // Reset to first page
  updatePagination();
  displayInventory();
}

/**
 * Go to specific page
 */
function goToPage(page) {
  if (page < 1 || page > pagination.totalPages) return;
  
  pagination.currentPage = page;
  displayInventory();
  updatePaginationControls();
  
  // Scroll to top of table
  document.querySelector('.inventory-table').scrollIntoView({ 
    behavior: 'smooth', 
    block: 'start' 
  });
}

/**
 * Update pagination calculations
 */
function updatePagination() {
  pagination.totalItems = filteredData.length;
  
  if (pagination.itemsPerPage >= pagination.totalItems) {
    pagination.totalPages = 1;
    pagination.currentPage = 1;
  } else {
    pagination.totalPages = Math.ceil(pagination.totalItems / pagination.itemsPerPage);
    
    // Ensure current page is valid
    if (pagination.currentPage > pagination.totalPages) {
      pagination.currentPage = pagination.totalPages;
    }
  }
}

/**
 * Update pagination controls display
 */
function updatePaginationControls() {
  const itemsStart = document.getElementById('items-start');
  const itemsEnd = document.getElementById('items-end');
  const itemsTotal = document.getElementById('items-total');
  const pageJumpInput = document.getElementById('page-jump');
  const firstPageBtn = document.getElementById('first-page');
  const prevPageBtn = document.getElementById('prev-page');
  const nextPageBtn = document.getElementById('next-page');
  const lastPageBtn = document.getElementById('last-page');

  // Update summary
  const start = (pagination.currentPage - 1) * pagination.itemsPerPage + 1;
  const end = Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems);
  
  itemsStart.textContent = pagination.totalItems > 0 ? start : 0;
  itemsEnd.textContent = end;
  itemsTotal.textContent = pagination.totalItems;

  // Update page jump input
  pageJumpInput.max = pagination.totalPages;
  pageJumpInput.value = pagination.currentPage;

  // Update button states
  firstPageBtn.disabled = pagination.currentPage === 1;
  prevPageBtn.disabled = pagination.currentPage === 1;
  nextPageBtn.disabled = pagination.currentPage === pagination.totalPages;
  lastPageBtn.disabled = pagination.currentPage === pagination.totalPages;

  // Generate page numbers
  generatePageNumbers();
  
  // Show/hide pagination if not needed
  const paginationContainer = document.querySelector('.pagination-container');
  if (paginationContainer) {
    paginationContainer.style.display = pagination.totalPages <= 1 ? 'none' : 'block';
  }
}

/**
 * Generate page number buttons
 */
function generatePageNumbers() {
  const pageNumbersContainer = document.getElementById('page-numbers');
  if (!pageNumbersContainer) return;

  pageNumbersContainer.innerHTML = '';

  // Show max 7 page numbers: [1] [2] [3] ... [8] [9] [10]
  const maxVisible = 7;
  let startPage = Math.max(1, pagination.currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(pagination.totalPages, startPage + maxVisible - 1);

  // Adjust start if we're near the end
  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  // Add "..." before if needed
  if (startPage > 1) {
    addPageButton(1);
    if (startPage > 2) {
      pageNumbersContainer.appendChild(createEllipsis());
    }
  }

  // Add page numbers
  for (let i = startPage; i <= endPage; i++) {
    addPageButton(i);
  }

  // Add "..." after if needed
  if (endPage < pagination.totalPages) {
    if (endPage < pagination.totalPages - 1) {
      pageNumbersContainer.appendChild(createEllipsis());
    }
    addPageButton(pagination.totalPages);
  }
}

/**
 * Add page number button
 */
function addPageButton(pageNum) {
  const pageNumbersContainer = document.getElementById('page-numbers');
  const button = document.createElement('button');
  button.className = `pagination-btn ${pageNum === pagination.currentPage ? 'active' : ''}`;
  button.textContent = pageNum;
  button.addEventListener('click', () => goToPage(pageNum));
  pageNumbersContainer.appendChild(button);
}

/**
 * Create ellipsis element
 */
function createEllipsis() {
  const span = document.createElement('span');
  span.className = 'pagination-ellipsis';
  span.textContent = '...';
  return span;
}

/**
 * Bind all event listeners for the inventory module
 */
function bindInventoryEvents() {
  // Search and filter inputs
  const searchInput = document.getElementById("search");
  const filterLocation = document.getElementById("filter-location");
  const filterStatus = document.getElementById("filter-status");

  // Quick filter buttons
  const quickFilterBtns = document.querySelectorAll(".status-nav-item");

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
  filterStatus?.addEventListener("change", applyFilters);

  quickFilterBtns.forEach(btn => {
    btn.addEventListener("click", handleQuickFilter);
  });

  addItemButton?.addEventListener("click", () => {
    console.log("🟩 Add Item button clicked - creating new item");
    loadItemForm(null); // null means create new item
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
    showLoadingIndicator(false);
    
  } catch (error) {
    console.error("Failed to load inventory data:", error);
    showLoadingIndicator(false);
    showNoResults(true);
  }
}

/**
 * Apply current filters to inventory data
 * UPDATED: Enhanced search to include brand and manufacturer
 */
function applyFilters() {
  const search = document.getElementById("search")?.value.toLowerCase() || "";
  const locationFilter = document.getElementById("filter-location")?.value || "";
  const statusFilter = document.getElementById("filter-status")?.value || "";

  filteredData = inventoryData.filter(item => {
    // ENHANCED: Search filter includes brand, manufacturer, and vendor SKU
    const searchMatch = !search || 
      (item.name || "").toLowerCase().includes(search) ||
      (item.primaryVendor || "").toLowerCase().includes(search) ||
      (item.brand || "").toLowerCase().includes(search) ||           // NEW: Brand search
      (item.manufacturer || "").toLowerCase().includes(search) ||    // NEW: Manufacturer search
      (item.vendorSKU || "").toLowerCase().includes(search) ||       // NEW: SKU search
      (item.fullDescription || "").toLowerCase().includes(search) ||
      (item.tags || []).some(tag => tag.toLowerCase().includes(search));

    // Location filter
    const locationMatch = !locationFilter || item.location === locationFilter;

    // Status filter
    const statusMatch = !statusFilter || getStockStatus(item) === statusFilter;

    return searchMatch && locationMatch && statusMatch;
  });

  // Apply current sort
  applySorting();
  
  // Update pagination
  updatePagination();
  
  // Update display
  displayInventory();
  updateInventoryStats();
  updatePaginationControls();
  
  // Show/hide no results message
  showNoResults(filteredData.length === 0);
}

/**
 * Handle quick filter button clicks - UPDATED: Removed for-event filter
 */
function handleQuickFilter(e) {
  const filterType = e.target.dataset.filter;
  
  // Remove active class from all buttons
  document.querySelectorAll(".status-nav-item").forEach(btn => {
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
    case "all":
    default:
      clearAllFilters(false);
      break;
  }
  
  applyFilters();
}

/**
 * Clear all filters - UPDATED: Removed for-event filter
 */
function clearAllFilters(resetActiveButton = true) {
  document.getElementById("search").value = "";
  document.getElementById("filter-location").value = "";
  document.getElementById("filter-status").value = "";
  
  if (resetActiveButton) {
    document.querySelectorAll(".status-nav-item").forEach(btn => {
      btn.classList.remove("active");
    });
    document.querySelector(".status-nav-item[data-filter='all']").classList.add("active");
  }
  
  applyFilters();
}

/**
 * Handle table sorting
 * UPDATED: Added brand and manufacturer to sortable fields
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
  displayInventory();
}

/**
 * Apply current sorting to filtered data
 * UPDATED: Enhanced sorting for new fields including decimals
 */
function applySorting() {
  filteredData.sort((a, b) => {
    let aVal = a[currentSort.column] || "";
    let bVal = b[currentSort.column] || "";
    
    // Handle numeric values (including decimals)
    if (currentSort.column === 'unitCost' || currentSort.column === 'par' || 
        currentSort.column === 'onHand' || currentSort.column === 'reorderPoint' ||
        currentSort.column === 'portionSize') {
      aVal = parseFloat(aVal) || 0;
      bVal = parseFloat(bVal) || 0;
    } else {
      // Handle string values (including new brand/manufacturer fields)
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
 * Display inventory items in the table (with pagination)
 * UPDATED: Removed Unit Cost column from display, kept Total Value only
 */
function displayInventory() {
  const tbody = document.getElementById("inventory-table-body");
  if (!tbody) {
    console.error("Inventory table body not found.");
    return;
  }
  
  tbody.innerHTML = "";
  
  if (filteredData.length === 0) {
    return; // Let the no-results message handle this
  }

  // Calculate which items to show based on pagination
  const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
  const endIndex = Math.min(startIndex + pagination.itemsPerPage, filteredData.length);
  const pageData = filteredData.slice(startIndex, endIndex);

  pageData.forEach((item) => {
    const row = document.createElement("tr");
    const stockStatus = getStockStatus(item);
    row.className = `status-${stockStatus}`;
    
    // Calculate total value using correct field names
    const unitCost = parseFloat(item.unitCost) || 0;
    const onHand = parseFloat(item.onHand) || 0;
    const totalValue = unitCost * onHand;
    
    // Build vendor info with brand/manufacturer
    const vendorInfo = buildVendorInfoDisplay(item);
    
    // NEW: Build portion size display
    const portionInfo = buildPortionInfoDisplay(item);
    
    row.innerHTML = `
      <td class="bulk-select">
        <input type="checkbox" class="item-checkbox" data-id="${item.id}">
      </td>
      <td class="item-name">
        <div class="item-details">
          <strong>${item.name || ""}</strong>
          ${portionInfo ? `<div class="item-portion">${portionInfo}</div>` : ""}
          ${item.fullDescription ? `<div class="item-description">${item.fullDescription}</div>` : ""}
        </div>
      </td>
      <td>${item.location || ""}</td>
      <td>
        <div class="vendor-info">
          ${vendorInfo}
        </div>
      </td>
      <td class="text-center">${item.par || ""}</td>
      <td class="text-center decimal-value">${formatDecimalValue(item.onHand)}</td>
      <td class="text-center">
        <span class="status-badge status-${stockStatus}">${getStatusText(stockStatus)}</span>
      </td>
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

    editBtn.addEventListener("click", () => {
      console.log(`🔧 Edit button clicked for item ID: ${item.id}`);
      console.log("Item data:", item);
      loadItemForm(item.id);
    });
    
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
 * NEW: Format decimal values for display (remove trailing zeros)
 */
function formatDecimalValue(value) {
  if (value === null || value === undefined || value === '') {
    return '0';
  }
  
  const num = parseFloat(value);
  if (isNaN(num)) return '0';
  
  // Format to max 2 decimal places, remove trailing zeros
  return num.toFixed(2).replace(/\.?0+$/, '');
}

/**
 * NEW: Build portion info display
 */
function buildPortionInfoDisplay(item) {
  if (!item.portionSize || !item.portionUnit) {
    return null;
  }
  
  const formattedSize = formatDecimalValue(item.portionSize);
  return `📏 ${formattedSize} ${item.portionUnit} portions`;
}

/**
 * Build vendor info display with brand/manufacturer
 */
function buildVendorInfoDisplay(item) {
  const parts = [];
  
  // Primary vendor name
  if (item.primaryVendor) {
    parts.push(`<div class="vendor-name">${item.primaryVendor}</div>`);
  }
  
  // Brand (if different from vendor)
  if (item.brand && item.brand !== item.primaryVendor) {
    parts.push(`<div class="vendor-brand">Brand: ${item.brand}</div>`);
  }
  
  // Manufacturer (if different from brand and vendor)
  if (item.manufacturer && 
      item.manufacturer !== item.brand && 
      item.manufacturer !== item.primaryVendor) {
    parts.push(`<div class="vendor-manufacturer">Mfg: ${item.manufacturer}</div>`);
  }
  
  // SKU
  if (item.vendorSKU) {
    parts.push(`<div class="vendor-sku">SKU: ${item.vendorSKU}</div>`);
  }
  
  return parts.length > 0 ? parts.join('') : '—';
}

/**
 * Determine stock status based on PAR and onHand values
 * UPDATED: Uses correct field names and decimal support
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
  
  // Check stock levels (using decimal comparison)
  if (onHand <= 0) {
    return "out";
  } else if (onHand <= reorderPoint) {
    return "low";
  } else if (par > 0 && onHand >= par) {
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
 * UPDATED: Uses correct field names for value calculation with decimal support
 */
function updateInventoryStats() {
  const totalItems = filteredData.length;
  let totalValue = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  
  filteredData.forEach(item => {
    // Use correct field names for calculation with decimal support
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
 * Setup bulk actions event listeners - UPDATED: Removed bulk toggle event
 */
function setupBulkActions() {
  const bulkEditLocation = document.getElementById("bulk-edit-location");
  const bulkDelete = document.getElementById("bulk-delete");
  const bulkCancel = document.getElementById("bulk-cancel");
  
  bulkEditLocation?.addEventListener("click", handleBulkLocationChange);
  bulkDelete?.addEventListener("click", handleBulkDelete);
  bulkCancel?.addEventListener("click", clearBulkSelection);
}

/**
 * Handle bulk location change
 * UPDATED: Uses StorageController for proper decimal handling
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
  const tableContainer = document.querySelector(".inventory-container");
  
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