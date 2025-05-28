// scripts/modules/item-info.js - Enhanced Phase 1B with Tabbed Interface
import { StorageController } from '../storage/storageController.js';
import { getDoc, doc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { db } from '../firebase/firebase.js';
import { convertUnits } from '../utils/dataUtils.js';

let currentItemId = null;
let isDirty = false;

/**
 * Load the enhanced item form
 */
export function loadItemForm(id) {
  console.log("Loading enhanced item form for ID:", id);
  currentItemId = id;
  const content = document.getElementById("app-content");

  fetch("templates/item-info-page.html")
    .then(res => res.text())
    .then(async html => {
      content.innerHTML = html;
      console.log("Enhanced item info page loaded");

      // Initialize the form
      initializeTabNavigation();
      initializeFormValidation();
      setupAutoCalculations();
      setupFormChangeTracking();

      // Load existing item data if editing
      if (id) {
        await loadExistingItem(id);
      } else {
        setDefaultValues();
      }

      // Setup event listeners
      setupEventListeners();
      
      // Focus first input
      document.getElementById("item-name")?.focus();
    })
    .catch(err => console.error("Failed to load item-info-page.html:", err));
}

/**
 * Initialize tab navigation
 */
function initializeTabNavigation() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const targetTab = e.currentTarget.dataset.tab;
      
      // Remove active class from all tabs and contents
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active class to clicked tab and corresponding content
      e.currentTarget.classList.add('active');
      document.getElementById(targetTab).classList.add('active');
      
      // Update URL hash for direct linking
      window.location.hash = targetTab;
    });
  });

  // Check for hash in URL and activate corresponding tab
  const hash = window.location.hash.slice(1);
  if (hash && document.getElementById(hash)) {
    document.querySelector(`[data-tab="${hash}"]`)?.click();
  }
}

/**
 * Load existing item data
 */
async function loadExistingItem(id) {
  try {
    const snap = await getDoc(doc(db, "inventory_items", id));
    const item = snap.exists() ? snap.data() : null;
    
    if (!item) {
      showToast("Item not found", "error");
      moduleSystem.loadModule("inventory");
      return;
    }

    // Update form title and breadcrumb
    document.getElementById("form-title").textContent = `Edit: ${item.name}`;
    document.getElementById("breadcrumb-action").textContent = "Edit Item";

    // Populate form fields with backward compatibility
    populateFormFields(item);
    
    // Load history data
    await loadItemHistory(id);
    
    isDirty = false;
  } catch (error) {
    console.error("Failed to load item:", error);
    showToast("Failed to load item data", "error");
  }
}

/**
 * Populate form fields with item data (backward compatible)
 */
function populateFormFields(item) {
  // Basic Info Tab
  setFieldValue("item-name", item.name);
  setFieldValue("category", item.category);
  setFieldValue("subcategory", item.subcategory);
  setFieldValue("full-description", item.fullDescription || item.name);
  setFieldValue("item-image", item.itemImage);
  setFieldValue("tags", Array.isArray(item.tags) ? item.tags.join(', ') : item.tags);
  setCheckboxValue("for-event", item.forEvent);
  
  // Set allergen checkboxes
  if (Array.isArray(item.allergenInfo)) {
    item.allergenInfo.forEach(allergen => {
      const checkbox = document.querySelector(`input[name="allergens"][value="${allergen}"]`);
      if (checkbox) checkbox.checked = true;
    });
  }

  // Purchasing Tab
  setFieldValue("primary-vendor", item.primaryVendor);
  setFieldValue("vendor-sku", item.vendorSKU);
  setFieldValue("alternate-vendors", Array.isArray(item.alternateVendors) ? 
    item.alternateVendors.join('\n') : item.alternateVendors);
  setFieldValue("caseQuantity", item.caseQuantity);
  setFieldValue("unitPerCase", item.unitPerCase);
  setFieldValue("caseUnit", item.caseUnit || 'LB');
  setFieldValue("caseCost", item.caseCost);
  setFieldValue("unitCost", formatCurrency(item.unitCost));
  setFieldValue("yield-percentage", item.yieldPercentage || 100);

  // Inventory Tab
  setFieldValue("par", item.par);
  setFieldValue("on-hand", item.onHand);
  setFieldValue("reorder-point", item.reorderPoint);
  setFieldValue("max-stock", item.maxStock);
  setFieldValue("location", item.location);
  setFieldValue("area", item.area);
  setFieldValue("storage-instructions", item.storageInstructions);
  setFieldValue("wasteEntryUnit", item.wasteEntryUnit || 'OZ');
  setFieldValue("shelf-life-days", item.shelfLifeDays);

  // Tracking Tab
  setFieldValue("barcode", item.barcode);
  setFieldValue("lot-number", item.lotNumber);
  setFieldValue("expiration-date", item.expirationDate);
  setFieldValue("last-count-date", item.lastCountDate);
  setFieldValue("count-variance", item.countVariance);
  setFieldValue("average-usage", item.averageUsagePerWeek);
  setFieldValue("notes", item.notes);
  setCheckboxValue("is-active", item.isActive !== false); // Default to true

  // History Tab
  setFieldValue("created-by", item.createdBy || "Unknown");
  setFieldValue("modified-by", item.modifiedBy || "Unknown");
  setFieldValue("last-modified", formatDateTime(item.lastModified));

  // Add hidden ID field
  let hiddenId = document.querySelector('input[name="id"]');
  if (!hiddenId) {
    hiddenId = document.createElement("input");
    hiddenId.type = "hidden";
    hiddenId.name = "id";
    document.getElementById("item-form").appendChild(hiddenId);
  }
  hiddenId.value = item.id;
}

/**
 * Set default values for new items
 */
function setDefaultValues() {
  document.getElementById("form-title").textContent = "Add New Item";
  document.getElementById("breadcrumb-action").textContent = "Add Item";
  
  // Set default values
  setFieldValue("yield-percentage", 100);
  setFieldValue("caseUnit", "LB");
  setFieldValue("wasteEntryUnit", "OZ");
  setCheckboxValue("is-active", true);
  setFieldValue("created-by", "Current User");
  setFieldValue("last-modified", "Not saved yet");
}

/**
 * Load item history data
 */
async function loadItemHistory(itemId) {
  // This will be implemented when movement tracking is available
  // For now, show placeholder data
  
  const priceHistoryContainer = document.getElementById("price-history-container");
  const movementHistoryContainer = document.getElementById("movement-history-container");
  
  // Price history placeholder
  priceHistoryContainer.innerHTML = `
    <div class="price-history-item">
      <small class="text-muted">Price history tracking will be available after inventory movements are implemented</small>
    </div>
  `;
  
  // Movement history placeholder
  movementHistoryContainer.innerHTML = `
    <div class="movement-history-item">
      <small class="text-muted">Movement history will be available after inventory movements are implemented</small>
    </div>
  `;
  
  // Usage statistics placeholder
  document.getElementById("stat-received").textContent = "—";
  document.getElementById("stat-used").textContent = "—";
  document.getElementById("stat-wasted").textContent = "—";
  document.getElementById("stat-turnover").textContent = "—";
}

/**
 * Setup auto-calculations for pricing
 */
function setupAutoCalculations() {
  const requiredIds = ["caseQuantity", "unitPerCase", "caseCost", "unitCost"];
  const missing = requiredIds.filter(id => !document.getElementById(id));
  
  if (missing.length > 0) {
    console.warn("Auto cost logic skipped due to missing inputs:", missing);
    return;
  }

  function updateAutoUnitCost() {
    const caseQtyEl = document.getElementById("caseQuantity");
    const unitQtyEl = document.getElementById("unitPerCase");
    const caseCostEl = document.getElementById("caseCost");
    const displayEl = document.getElementById("unitCost");
    const caseUnitEl = document.getElementById("caseUnit");
    const wasteUnitEl = document.getElementById("wasteEntryUnit");
    
    if (!caseQtyEl || !unitQtyEl || !caseCostEl || !displayEl) return;

    const caseQty = parseFloat(caseQtyEl.value) || 0;
    const unitQty = parseFloat(unitQtyEl.value) || 0;
    const caseCost = parseFloat(caseCostEl.value) || 0;
    const caseUnit = caseUnitEl?.value || "LB";
    const wasteUnit = wasteUnitEl?.value || "OZ";
    
    if (caseQty > 0 && unitQty > 0 && caseCost > 0) {
      const totalUnits = convertUnits(caseUnit, wasteUnit, caseQty * unitQty);
      const result = totalUnits > 0 ? (caseCost / totalUnits).toFixed(2) : "";
      displayEl.value = result ? formatCurrency(result) : "";
    } else {
      displayEl.value = "";
    }
  }

  // Add input change listeners for auto-cost calculation
  ["caseQuantity", "unitPerCase", "caseCost", "caseUnit", "wasteEntryUnit"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", updateAutoUnitCost);
  });
}

/**
 * Setup form validation
 */
function initializeFormValidation() {
  const requiredFields = ["item-name"];
  
  requiredFields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.addEventListener("blur", validateField);
      field.addEventListener("input", clearFieldError);
    }
  });
}

/**
 * Validate individual field
 */
function validateField(e) {
  const field = e.target;
  const value = field.value.trim();
  
  // Clear previous validation states
  clearFieldError(e);
  
  if (field.hasAttribute("required") && !value) {
    showFieldError(field, "This field is required");
    return false;
  }
  
  // Field-specific validation
  switch (field.id) {
    case "item-name":
      if (value.length < 2) {
        showFieldError(field, "Item name must be at least 2 characters");
        return false;
      }
      break;
      
    case "caseCost":
    case "unitCost":
      if (value && isNaN(parseFloat(value))) {
        showFieldError(field, "Please enter a valid number");
        return false;
      }
      break;
      
    case "item-image":
      if (value && !isValidUrl(value)) {
        showFieldError(field, "Please enter a valid URL");
        return false;
      }
      break;
  }
  
  showFieldSuccess(field);
  return true;
}

/**
 * Setup form change tracking
 */
function setupFormChangeTracking() {
  const form = document.getElementById("item-form");
  const inputs = form.querySelectorAll("input, select, textarea");
  
  inputs.forEach(input => {
    input.addEventListener("change", () => {
      isDirty = true;
    });
  });
  
  // Warn user about unsaved changes
  window.addEventListener("beforeunload", (e) => {
    if (isDirty) {
      e.preventDefault();
      e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
    }
  });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Cancel button
  document.getElementById("cancel-button").addEventListener("click", handleCancel);
  
  // Form submit
  document.getElementById("item-form").addEventListener("submit", handleFormSubmit);
  
  // Tab keyboard navigation
  document.addEventListener("keydown", handleKeyboardNavigation);
}

/**
 * Handle cancel button
 */
function handleCancel() {
  if (isDirty) {
    if (!confirm("You have unsaved changes. Are you sure you want to cancel?")) {
      return;
    }
  }
  
  moduleSystem.loadModule("inventory");
}

/**
 * Handle form submission
 */
async function handleFormSubmit(e) {
  e.preventDefault();
  
  if (!validateForm()) {
    showToast("Please fix the errors before saving", "error");
    return;
  }
  
  const form = e.target;
  const saveButton = document.getElementById("save-button");
  
  try {
    // Add saving state
    form.classList.add("form-saving");
    saveButton.textContent = "Saving...";
    saveButton.disabled = true;
    
    const formData = collectFormData();
    
    await StorageController.save([formData]);
    
    isDirty = false;
    showToast("Item saved successfully", "success");
    
    // Navigate back to inventory after a short delay
    setTimeout(() => {
      moduleSystem.loadModule("inventory");
    }, 1000);
    
  } catch (err) {
    console.error("Error saving item:", err);
    showToast("Failed to save item", "error");
  } finally {
    // Remove saving state
    form.classList.remove("form-saving");
    saveButton.textContent = "Save Item";
    saveButton.disabled = false;
  }
}

/**
 * Validate entire form
 */
function validateForm() {
  const requiredFields = ["item-name"];
  let isValid = true;
  
  requiredFields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field && !validateField({ target: field })) {
      isValid = false;
    }
  });
  
  return isValid;
}

/**
 * Collect form data
 */
function collectFormData() {
  const form = document.getElementById("item-form");
  const currentTime = new Date().toISOString();
  
  // Get allergen info
  const allergens = Array.from(document.querySelectorAll('input[name="allergens"]:checked'))
    .map(cb => cb.value);
  
  // Get alternate vendors
  const alternateVendors = getFieldValue("alternate-vendors")
    .split('\n')
    .map(v => v.trim())
    .filter(v => v.length > 0);
  
  // Get tags
  const tags = getFieldValue("tags")
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0);
  
  const formData = {
    // Core fields (maintain backward compatibility)
    id: form.querySelector("input[name='id']")?.value || crypto.randomUUID(),
    name: getFieldValue("item-name"),
    unitCost: parseFloat(getFieldValue("unitCost").replace(/[^0-9.-]/g, '')) || 0,
    forEvent: getCheckboxValue("for-event"),
    par: parseInt(getFieldValue("par")) || 0,
    onHand: parseInt(getFieldValue("on-hand")) || 0,
    location: getFieldValue("location"),
    area: getFieldValue("area"),
    notes: getFieldValue("notes"),
    caseQuantity: parseFloat(getFieldValue("caseQuantity")) || 0,
    unitPerCase: parseFloat(getFieldValue("unitPerCase")) || 0,
    caseUnit: getFieldValue("caseUnit"),
    wasteEntryUnit: getFieldValue("wasteEntryUnit"),
    caseCost: parseFloat(getFieldValue("caseCost")) || 0,
    
    // Enhanced fields (Phase 1B additions)
    barcode: getFieldValue("barcode"),
    primaryVendor: getFieldValue("primary-vendor"),
    vendorSKU: getFieldValue("vendor-sku"),
    alternateVendors: alternateVendors,
    priceHistory: [], // Will be populated by movement tracking
    expirationDate: getFieldValue("expiration-date") || null,
    lotNumber: getFieldValue("lot-number"),
    itemImage: getFieldValue("item-image"),
    fullDescription: getFieldValue("full-description"),
    allergenInfo: allergens,
    storageInstructions: getFieldValue("storage-instructions"),
    yieldPercentage: parseFloat(getFieldValue("yield-percentage")) || 100,
    shelfLifeDays: parseInt(getFieldValue("shelf-life-days")) || null,
    reorderPoint: parseInt(getFieldValue("reorder-point")) || null,
    maxStock: parseInt(getFieldValue("max-stock")) || null,
    category: getFieldValue("category"),
    subcategory: getFieldValue("subcategory"),
    isActive: getCheckboxValue("is-active"),
    tags: tags,
    lastCountDate: getFieldValue("last-count-date") || null,
    countVariance: parseFloat(getFieldValue("count-variance")) || 0,
    averageUsagePerWeek: parseFloat(getFieldValue("average-usage")) || 0,
    
    // Audit fields
    createdBy: currentItemId ? getFieldValue("created-by") : "Current User",
    modifiedBy: "Current User",
    lastModified: currentTime
  };

  return formData;
}

/**
 * Handle keyboard navigation
 */
function handleKeyboardNavigation(e) {
  // Ctrl/Cmd + S to save
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    document.getElementById("item-form").dispatchEvent(new Event('submit'));
  }
  
  // Escape to cancel
  if (e.key === 'Escape') {
    handleCancel();
  }
  
  // Ctrl/Cmd + Tab to switch tabs
  if ((e.ctrlKey || e.metaKey) && e.key === 'Tab') {
    e.preventDefault();
    const activeTab = document.querySelector('.tab-btn.active');
    const nextTab = activeTab.nextElementSibling || document.querySelector('.tab-btn');
    nextTab.click();
  }
}

/**
 * Utility functions
 */
function setFieldValue(fieldId, value) {
  const field = document.getElementById(fieldId);
  if (field && value !== undefined && value !== null) {
    field.value = value;
  }
}

function getFieldValue(fieldId) {
  const field = document.getElementById(fieldId);
  return field ? field.value : "";
}

function setCheckboxValue(fieldId, checked) {
  const field = document.getElementById(fieldId);
  if (field) {
    field.checked = !!checked;
  }
}

function getCheckboxValue(fieldId) {
  const field = document.getElementById(fieldId);
  return field ? field.checked : false;
}

function showFieldError(field, message) {
  field.classList.add("error");
  field.classList.remove("success");
  
  // Remove existing error message
  const existingError = field.parentNode.querySelector(".error-message");
  if (existingError) {
    existingError.remove();
  }
  
  // Add new error message
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.textContent = message;
  field.parentNode.appendChild(errorDiv);
}

function showFieldSuccess(field) {
  field.classList.add("success");
  field.classList.remove("error");
  
  // Remove error message
  const existingError = field.parentNode.querySelector(".error-message");
  if (existingError) {
    existingError.remove();
  }
}

function clearFieldError(e) {
  const field = e.target;
  field.classList.remove("error", "success");
  
  const existingError = field.parentNode.querySelector(".error-message");
  if (existingError) {
    existingError.remove();
  }
}

function formatCurrency(value) {
  const num = parseFloat(value) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(num);
}

function formatDateTime(dateString) {
  if (!dateString) return "Never";
  
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (error) {
    return dateString;
  }
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (error) {
    return false;
  }
}

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

// Auto-save functionality (optional)
let autoSaveTimer;

function scheduleAutoSave() {
  clearTimeout(autoSaveTimer);
  
  if (!isDirty || !currentItemId) return; // Only auto-save existing items
  
  autoSaveTimer = setTimeout(async () => {
    try {
      const formData = collectFormData();
      await StorageController.save([formData]);
      console.log("Auto-saved item");
      
      // Update last modified display
      setFieldValue("last-modified", formatDateTime(new Date().toISOString()));
      
      isDirty = false;
    } catch (error) {
      console.error("Auto-save failed:", error);
    }
  }, 30000); // Auto-save after 30 seconds of inactivity
}

// Enable auto-save on form changes
function enableAutoSave() {
  const form = document.getElementById("item-form");
  const inputs = form.querySelectorAll("input, select, textarea");
  
  inputs.forEach(input => {
    input.addEventListener("input", scheduleAutoSave);
  });
}

/**
 * Initialize form with enhanced features
 */
export function initializeEnhancedForm() {
  // Enable auto-save for existing items
  if (currentItemId) {
    enableAutoSave();
  }
  
  // Add keyboard shortcuts help
  const shortcuts = document.createElement('div');
  shortcuts.innerHTML = `
    <div style="position: fixed; bottom: 20px; left: 20px; background: rgba(0,0,0,0.8); color: white; padding: 0.5rem; border-radius: 4px; font-size: 12px; z-index: 1000;">
      <div><kbd>Ctrl+S</kbd> Save</div>
      <div><kbd>Esc</kbd> Cancel</div>
      <div><kbd>Ctrl+Tab</kbd> Next Tab</div>
    </div>
  `;
  document.body.appendChild(shortcuts);
  
  // Hide shortcuts after 5 seconds
  setTimeout(() => {
    shortcuts.style.opacity = '0';
    setTimeout(() => shortcuts.remove(), 300);
  }, 5000);
}

// REMOVED: Duplicate export line that was causing the error
// export { loadItemForm, initializeEnhancedForm };