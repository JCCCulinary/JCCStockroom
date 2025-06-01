// Enhanced item-info.js - UPDATED: Removed For Event field
import { StorageController } from '../storage/storageController.js';
import { db, doc, getDoc, setDoc } from '../firebase/firebase.js';
import { convertUnits, getConvertibleUnits, parsePortionSize, formatPortionSize } from '../utils/dataUtils.js';

class MobileItemFormController {
    constructor(itemId = null) {
        this.itemId = itemId;
        this.formData = {};
        this.originalData = {};
        this.isDirty = false;
        this.autoSaveTimer = null;
        this.isUnitTypeLocked = false;
        
        this.initializeForm();
    }

    async initializeForm() {
        try {
            // Load specific item if ID provided
            if (this.itemId) {
                await this.loadItem(this.itemId);
            } else {
                this.setupNewItem();
            }
            
            this.setupEventListeners();
            this.setupExpandableSections();
            this.setupQuantityControls();
            this.setupCalculations();
            this.setupWasteUnitFiltering();
            this.setupPortionSizeParsing(); // NEW: Setup portion size auto-parsing
            this.startAutoSave();
            this.updateSaveStatus('saved');
            
        } catch (error) {
            console.error('Failed to initialize form:', error);
            this.showMessage('Failed to load item data', 'error');
        }
    }

    async loadItem(itemId) {
        try {
            const snap = await getDoc(doc(db, "inventory_items", itemId));
            if (snap.exists()) {
                const item = snap.data();
                this.originalData = { ...item };
                this.formData = { ...item };
                
                this.isUnitTypeLocked = this.shouldLockUnitType(item);
                this.populateForm(item);
            } else {
                throw new Error('Item not found');
            }
        } catch (error) {
            console.error('Failed to load item:', error);
            this.showMessage('Item not found', 'error');
        }
    }

    shouldLockUnitType(item) {
        return !!(item.timestamp && 
                 !item.isDraft && 
                 item.unitType && 
                 item.lastModified && 
                 item.lastModified !== item.timestamp);
    }

    setupNewItem() {
        this.isUnitTypeLocked = false;
        
        this.formData = {
            id: crypto.randomUUID(),
            name: '',
            par: 0,
            onHand: 0.0, // NEW: Default to decimal
            location: '',
            area: '',
            
            // Pricing & Pack Size
            unitsPerCase: 0,
            sizePerUnit: 0,
            unitType: 'OZ',
            caseCost: 0,
            unitCost: 0,
            
            // NEW: Portion Size fields
            portionSize: null,
            portionUnit: 'OZ',
            
            // Vendor Information
            primaryVendor: '',
            vendorSKU: '',
            brand: '',
            manufacturer: '',
            vendorNotes: '',
            
            // Storage & Tracking
            wasteEntryUnit: 'OZ',
            notes: '',
            reorderPoint: null,
            
            // System fields
            isActive: true,
            createdBy: 'manual_entry',
            modifiedBy: 'manual_entry',
            timestamp: new Date().toISOString(),
            lastModified: new Date().toISOString()
        };
        
        const titleElement = document.getElementById('mobile-item-title');
        if (titleElement) {
            titleElement.textContent = 'New Item';
        }
    }

    populateForm(item) {
        const setElementValue = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else {
                    element.value = value || '';
                }
            }
        };

        // Update page title with item name
        const titleElement = document.getElementById('mobile-item-title');
        if (titleElement) {
            titleElement.textContent = item.name || 'Unnamed Item';
        }
        
        // Quick Edit Section
        setElementValue('mobile-item-name', item.name);
        setElementValue('mobile-par-input', item.par);
        
        // NEW: Format On Hand with proper decimal display
        setElementValue('mobile-onhand-input', this.formatDecimalValue(item.onHand || 0));
        
        setElementValue('mobile-location-select', item.location);
        
        // Pricing Section
        setElementValue('mobile-units-per-case', item.unitsPerCase || 0);
        setElementValue('mobile-size-per-unit', item.sizePerUnit || 0);
        setElementValue('mobile-case-cost', item.caseCost ? `$${item.caseCost.toFixed(2)}` : '');
        
        // NEW: Populate portion size fields
        setElementValue('mobile-portion-size', item.portionSize || '');
        setElementValue('mobile-portion-unit', item.portionUnit || 'OZ');
        
        this.populateUnitType(item.unitType || 'OZ');
        
        // Vendor Section
        setElementValue('mobile-vendor-name', item.primaryVendor);
        setElementValue('mobile-product-sku', item.vendorSKU);
        setElementValue('mobile-brand', item.brand);
        setElementValue('mobile-manufacturer', item.manufacturer);
        setElementValue('mobile-vendor-notes', item.vendorNotes);
        
        // Storage & Tracking Section
        setElementValue('mobile-area-input', item.area);
        setElementValue('mobile-notes-input', item.notes);
        
        // NEW: Format reorder point with decimal support
        setElementValue('mobile-reorder-point', item.reorderPoint ? this.formatDecimalValue(item.reorderPoint) : '');
        
        this.populateWasteEntryUnit(item.wasteEntryUnit || item.unitType || 'OZ');
        this.populateSystemInfo(item);
        this.updateCalculations();
        
        console.log(`🔒 Unit Type Locked: ${this.isUnitTypeLocked}`);
    }

    /**
     * NEW: Format decimal values for display (max 2 decimal places, no trailing zeros)
     */
    formatDecimalValue(value) {
        if (value === null || value === undefined || value === '') return '';
        const num = parseFloat(value);
        if (isNaN(num)) return '';
        
        // Format to max 2 decimal places, remove trailing zeros
        return num.toFixed(2).replace(/\.?0+$/, '');
    }

    /**
     * NEW: Parse decimal values from input (handles empty, null, etc.)
     */
    parseDecimalValue(value) {
        if (!value || value === '') return 0;
        const num = parseFloat(value);
        return isNaN(num) ? 0 : Math.round(num * 100) / 100; // Round to 2 decimal places
    }

    populateUnitType(unitType) {
        const unitTypeContainer = document.getElementById('mobile-unit-type').parentElement;
        
        if (this.isUnitTypeLocked) {
            unitTypeContainer.innerHTML = `
                <label class="form-label" for="mobile-unit-type">Unit Type</label>
                <div class="form-input-readonly" id="mobile-unit-type-display">
                    <span class="readonly-value">${unitType}</span>
                    <span class="readonly-indicator">🔒 Locked</span>
                </div>
                <div class="form-hint">Unit type is locked after first save to maintain data consistency</div>
                <input type="hidden" id="mobile-unit-type" value="${unitType}">
            `;
        } else {
            const select = document.getElementById('mobile-unit-type');
            if (select) {
                select.value = unitType;
            }
        }
    }

    populateWasteEntryUnit(wasteUnit) {
        const wasteSelect = document.getElementById('mobile-waste-unit');
        if (!wasteSelect) return;
        
        const unitType = this.getCurrentUnitType();
        const compatibleUnits = this.getCompatibleWasteUnits(unitType);
        
        wasteSelect.innerHTML = '';
        
        compatibleUnits.forEach(unit => {
            const option = document.createElement('option');
            option.value = unit;
            option.textContent = this.getUnitDisplayName(unit);
            wasteSelect.appendChild(option);
        });
        
        if (compatibleUnits.includes(wasteUnit)) {
            wasteSelect.value = wasteUnit;
        } else {
            const defaultUnit = compatibleUnits.includes(unitType) ? unitType : compatibleUnits[0];
            wasteSelect.value = defaultUnit;
            
            if (wasteUnit !== defaultUnit) {
                this.showWasteUnitValidationError(wasteUnit, unitType, defaultUnit);
            }
        }
    }

    getCurrentUnitType() {
        const unitTypeInput = document.getElementById('mobile-unit-type');
        return unitTypeInput ? unitTypeInput.value : 'OZ';
    }

    getCompatibleWasteUnits(unitType) {
        const compatibleUnits = getConvertibleUnits(unitType) || [unitType];
        
        if (!compatibleUnits.includes('CS')) {
            compatibleUnits.push('CS');
        }
        
        return compatibleUnits.sort();
    }

    getUnitDisplayName(unit) {
        const displayNames = {
            'OZ': 'OZ (Ounces)',
            'LB': 'LB (Pounds)',
            'GAL': 'GAL (Gallons)',
            'QT': 'QT (Quarts)',
            'PT': 'PT (Pints)',
            'FL OZ': 'FL OZ (Fluid Ounces)',
            'EA': 'EA (Each)',
            'CS': 'CS (Case)',
            'G': 'G (Grams)',
            'KG': 'KG (Kilograms)',
            'ML': 'ML (Milliliters)',
            'L': 'L (Liters)',
            '#10 CAN': '#10 CAN',
            'Other': 'Other'
        };
        return displayNames[unit] || unit;
    }

    showWasteUnitValidationError(attempted, unitType, corrected) {
        this.showMessage(
            `Waste unit "${attempted}" is not compatible with unit type "${unitType}". Reset to "${corrected}".`, 
            'warning'
        );
    }

    setupWasteUnitFiltering() {
        const unitTypeSelect = document.getElementById('mobile-unit-type');
        const wasteUnitSelect = document.getElementById('mobile-waste-unit');
        
        if (!this.isUnitTypeLocked && unitTypeSelect) {
            unitTypeSelect.addEventListener('change', () => {
                const newUnitType = unitTypeSelect.value;
                console.log(`🔄 Unit type changed to: ${newUnitType}`);
                
                this.populateWasteEntryUnit(newUnitType);
                this.updateCalculations();
            });
        }
        
        if (wasteUnitSelect) {
            wasteUnitSelect.addEventListener('change', () => {
                this.validateWasteUnit();
                this.updateCalculations();
            });
        }
    }

    validateWasteUnit() {
        const unitType = this.getCurrentUnitType();
        const wasteUnit = document.getElementById('mobile-waste-unit')?.value;
        
        if (!wasteUnit) return;
        
        const compatibleUnits = this.getCompatibleWasteUnits(unitType);
        
        if (!compatibleUnits.includes(wasteUnit)) {
            const defaultUnit = compatibleUnits.includes(unitType) ? unitType : compatibleUnits[0];
            this.showWasteUnitValidationError(wasteUnit, unitType, defaultUnit);
            
            const wasteSelect = document.getElementById('mobile-waste-unit');
            if (wasteSelect) {
                wasteSelect.value = defaultUnit;
            }
        }
    }

    /**
     * NEW: Setup automatic portion size parsing from item name
     */
    setupPortionSizeParsing() {
        const itemNameInput = document.getElementById('mobile-item-name');
        if (!itemNameInput) return;
        
        // Parse portion size when item name changes
        itemNameInput.addEventListener('input', (e) => {
            this.tryParsePortionSizeFromName(e.target.value);
        });
        
        // Also setup manual portion size change handlers
        const portionSizeInput = document.getElementById('mobile-portion-size');
        const portionUnitSelect = document.getElementById('mobile-portion-unit');
        
        if (portionSizeInput) {
            portionSizeInput.addEventListener('input', () => {
                this.updateCalculations();
            });
        }
        
        if (portionUnitSelect) {
            portionUnitSelect.addEventListener('change', () => {
                this.updateCalculations();
            });
        }
    }

    /**
     * NEW: Try to parse portion size from item name/description
     */
    tryParsePortionSizeFromName(itemName) {
        if (!itemName || itemName.length < 3) return;
        
        const portionSizeInput = document.getElementById('mobile-portion-size');
        const portionUnitSelect = document.getElementById('mobile-portion-unit');
        
        if (!portionSizeInput || !portionUnitSelect) return;
        
        // Only auto-parse if portion size is currently empty
        if (portionSizeInput.value && portionSizeInput.value.trim() !== '') {
            return; // Don't overwrite existing portion size
        }
        
        try {
            const parsed = parsePortionSize(itemName);
            
            if (parsed.isValid && parsed.portionSize && parsed.portionUnit) {
                console.log('🔍 Auto-parsed portion size:', parsed);
                
                portionSizeInput.value = this.formatDecimalValue(parsed.portionSize);
                portionUnitSelect.value = parsed.portionUnit;
                
                this.updateField('portionSize', parsed.portionSize);
                this.updateField('portionUnit', parsed.portionUnit);
                
                // Show user-friendly message
                this.showMessage(
                    `Auto-detected portion size: ${formatPortionSize(parsed.portionSize, parsed.portionUnit)}`,
                    'info'
                );
                
                // Update calculations to include portion cost
                this.updateCalculations();
            }
        } catch (error) {
            console.log('No portion size found in item name:', error);
        }
    }

    populateSystemInfo(item) {
        const setSystemValue = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value || '—';
            }
        };

        const formatDate = (dateString) => {
            if (!dateString) return '—';
            try {
                const date = new Date(dateString);
                return date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch (error) {
                return dateString;
            }
        };

        setSystemValue('mobile-item-id', item.id);
        setSystemValue('mobile-created-date', formatDate(item.timestamp || item.createdDate));
        setSystemValue('mobile-last-modified', formatDate(item.lastModified));
        setSystemValue('mobile-modified-by', item.modifiedBy || 'Unknown');
    }

    setupExpandableSections() {
        const sections = document.querySelectorAll('.expandable-section');
        if (sections.length === 0) return;
        
        sections.forEach(section => {
            const header = section.querySelector('.section-header');
            if (header) {
                header.addEventListener('click', () => {
                    section.classList.toggle('expanded');
                    
                    const isExpanded = section.classList.contains('expanded');
                    header.setAttribute('aria-expanded', isExpanded);
                    
                    if (isExpanded) {
                        setTimeout(() => {
                            section.scrollIntoView({ 
                                behavior: 'smooth', 
                                block: 'nearest' 
                            });
                        }, 100);
                    }
                });
                
                header.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        header.click();
                    }
                });
            }
        });
    }

    setupQuantityControls() {
        // Setup PAR Level controls (integer)
        this.setupQuantityInput('par', 'mobile-par-input', 'mobile-par-minus', 'mobile-par-plus', 0, 999, 1);
        
        // NEW: Setup On Hand controls (decimal with 0.05 increments)
        this.setupQuantityInput('onHand', 'mobile-onhand-input', 'mobile-onhand-minus', 'mobile-onhand-plus', 0, 999.99, 0.05);
    }

    /**
     * UPDATED: Setup quantity input with decimal support
     */
    setupQuantityInput(fieldName, inputId, minusId, plusId, min = 0, max = 999, increment = 1) {
        const input = document.getElementById(inputId);
        const minusBtn = document.getElementById(minusId);
        const plusBtn = document.getElementById(plusId);

        if (!input) return;

        // Input change handler with validation
        input.addEventListener('input', (e) => {
            let value = increment === 1 ? 
                parseInt(e.target.value) : 
                parseFloat(e.target.value);
                
            if (isNaN(value)) value = 0;
            value = Math.max(min, Math.min(max, value));
            
            // Round to proper precision for decimal inputs
            if (increment < 1) {
                value = Math.round(value / increment) * increment;
                e.target.value = this.formatDecimalValue(value);
            } else {
                e.target.value = value;
            }
            
            this.updateField(fieldName, value);
        });

        // Minus button
        if (minusBtn) {
            minusBtn.addEventListener('click', () => {
                const currentValue = increment === 1 ? 
                    parseInt(input.value) || 0 : 
                    parseFloat(input.value) || 0;
                    
                let newValue = currentValue - increment;
                newValue = Math.max(min, Math.round(newValue / increment) * increment);
                
                input.value = increment === 1 ? newValue : this.formatDecimalValue(newValue);
                this.updateField(fieldName, newValue);
                this.animateButton(minusBtn);
                if (navigator.vibrate) navigator.vibrate(10);
            });
        }

        // Plus button
        if (plusBtn) {
            plusBtn.addEventListener('click', () => {
                const currentValue = increment === 1 ? 
                    parseInt(input.value) || 0 : 
                    parseFloat(input.value) || 0;
                    
                let newValue = currentValue + increment;
                newValue = Math.min(max, Math.round(newValue / increment) * increment);
                
                input.value = increment === 1 ? newValue : this.formatDecimalValue(newValue);
                this.updateField(fieldName, newValue);
                this.animateButton(plusBtn);
                if (navigator.vibrate) navigator.vibrate(10);
            });
        }

        // Update button states
        const updateButtonStates = () => {
            const value = increment === 1 ? 
                parseInt(input.value) || 0 : 
                parseFloat(input.value) || 0;
            if (minusBtn) minusBtn.disabled = value <= min;
            if (plusBtn) plusBtn.disabled = value >= max;
        };

        input.addEventListener('input', updateButtonStates);
        updateButtonStates();
    }

    animateButton(button) {
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = 'scale(1)';
        }, 100);
    }

    setupCalculations() {
        const elements = [
            'mobile-units-per-case',
            'mobile-size-per-unit',
            'mobile-case-cost',
            'mobile-portion-size', // NEW: Include portion size in calculations
            'mobile-portion-unit'   // NEW: Include portion unit in calculations
        ];

        const updateCalculations = () => {
            this.updateCalculations();
        };

        elements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {
                element.addEventListener('input', updateCalculations);
                element.addEventListener('change', updateCalculations);
            }
        });
        
        if (!this.isUnitTypeLocked) {
            const unitType = document.getElementById('mobile-unit-type');
            if (unitType) {
                unitType.addEventListener('change', updateCalculations);
            }
        }
        
        const wasteUnit = document.getElementById('mobile-waste-unit');
        if (wasteUnit) {
            wasteUnit.addEventListener('change', updateCalculations);
        }
        
        updateCalculations();
    }

    /**
     * ENHANCED: Update calculations with portion cost support
     */
    updateCalculations() {
        const unitsPerCase = document.getElementById('mobile-units-per-case');
        const sizePerUnit = document.getElementById('mobile-size-per-unit');
        const caseCost = document.getElementById('mobile-case-cost');
        const wasteUnit = document.getElementById('mobile-waste-unit');
        const portionSize = document.getElementById('mobile-portion-size');
        const portionUnit = document.getElementById('mobile-portion-unit');
        
        if (!unitsPerCase || !sizePerUnit || !caseCost) return;

        const units = parseInt(unitsPerCase.value) || 0;
        const size = parseFloat(sizePerUnit.value) || 0;
        const cost = parseFloat(caseCost.value.replace(/[^0-9.-]/g, '')) || 0;
        const fromUnit = this.getCurrentUnitType();
        const toUnit = wasteUnit?.value || 'OZ';

        console.log('🧮 Calculating with values:', {
            units, size, cost, fromUnit, toUnit
        });

        // Update visual case format display
        const formatDisplay = document.getElementById('mobile-visual-format');
        if (formatDisplay && units > 0 && size > 0) {
            formatDisplay.textContent = `${units}/${size}${fromUnit}`;
        }
        
        // Update total units calculation
        const totalDisplay = document.getElementById('mobile-visual-total');
        const wasteUnitDisplay = document.getElementById('mobile-visual-waste-unit');
        if (totalDisplay && units > 0 && size > 0) {
            const totalUnits = units * size;
            totalDisplay.textContent = totalUnits.toString();
            if (wasteUnitDisplay) {
                wasteUnitDisplay.textContent = fromUnit.toLowerCase();
            }
        }

        // Calculate unit costs
        if (units > 0 && size > 0 && cost > 0) {
            try {
                const totalUnitsPerCase = units * size;
                const baseUnitCost = cost / totalUnitsPerCase;
                const csCost = cost;
                
                let wasteUnitCost = baseUnitCost;
                if (toUnit === 'CS') {
                    wasteUnitCost = csCost;
                } else if (fromUnit !== toUnit) {
                    const convertedUnits = convertUnits(fromUnit, toUnit, totalUnitsPerCase);
                    if (convertedUnits > 0) {
                        wasteUnitCost = cost / convertedUnits;
                    }
                }
                
                this.updateCostDisplay(baseUnitCost, fromUnit, wasteUnitCost, toUnit, csCost);
                
                // NEW: Calculate portion cost if portion size is specified
                this.updatePortionCostDisplay(portionSize, portionUnit, baseUnitCost, fromUnit);
                
                this.updateField('unitCost', wasteUnitCost);

                console.log('✅ Enhanced calculation result:', {
                    baseUnitCost: baseUnitCost.toFixed(4),
                    wasteUnitCost: wasteUnitCost.toFixed(4),
                    csCost: csCost.toFixed(2),
                    fromUnit,
                    toUnit
                });
                
            } catch (error) {
                console.error('Conversion error:', error);
                this.clearCalculations();
            }
        } else {
            this.clearCalculations();
        }
    }

    /**
     * NEW: Update portion cost display
     */
    updatePortionCostDisplay(portionSizeEl, portionUnitEl, baseUnitCost, baseUnit) {
        const portionResultsRow = document.getElementById('mobile-portion-results');
        const portionCostDisplay = document.getElementById('mobile-portion-cost');
        
        if (!portionResultsRow || !portionCostDisplay) return;
        
        const portionSizeValue = parseFloat(portionSizeEl?.value) || 0;
        const portionUnitValue = portionUnitEl?.value || baseUnit;
        
        if (portionSizeValue > 0 && baseUnitCost > 0) {
            try {
                let portionCost = baseUnitCost;
                
                // Convert portion size to base unit if different
                if (portionUnitValue !== baseUnit) {
                    const convertedSize = convertUnits(portionUnitValue, baseUnit, portionSizeValue);
                    if (convertedSize > 0) {
                        portionCost = baseUnitCost * convertedSize;
                    } else {
                        // Can't convert, use original values
                        portionCost = baseUnitCost * portionSizeValue;
                    }
                } else {
                    portionCost = baseUnitCost * portionSizeValue;
                }
                
                portionCostDisplay.textContent = `$${portionCost.toFixed(3)}`;
                portionResultsRow.style.display = 'flex';
                
                console.log(`💰 Portion cost: ${portionSizeValue} ${portionUnitValue} = $${portionCost.toFixed(3)}`);
                
            } catch (error) {
                console.error('Portion cost calculation error:', error);
                portionResultsRow.style.display = 'none';
            }
        } else {
            portionResultsRow.style.display = 'none';
        }
    }

    updateCostDisplay(baseUnitCost, baseUnit, wasteUnitCost, wasteUnit, csCost) {
        const unitCostDisplay = document.getElementById('mobile-unit-cost');
        const totalVolumeDisplay = document.getElementById('mobile-total-volume');
        
        if (unitCostDisplay) {
            if (wasteUnit === 'CS') {
                unitCostDisplay.innerHTML = `
                    <div class="primary-cost">$${csCost.toFixed(2)} per CS</div>
                    <div class="secondary-cost">($${baseUnitCost.toFixed(4)} per ${baseUnit})</div>
                `;
            } else {
                unitCostDisplay.innerHTML = `
                    <div class="primary-cost">$${wasteUnitCost.toFixed(4)} per ${wasteUnit}</div>
                    <div class="secondary-cost">($${csCost.toFixed(2)} per CS)</div>
                `;
            }
        }
        
        if (totalVolumeDisplay) {
            if (wasteUnit === 'CS') {
                totalVolumeDisplay.textContent = `1 Case (CS)`;
            } else {
                const units = parseInt(document.getElementById('mobile-units-per-case')?.value) || 0;
                const size = parseFloat(document.getElementById('mobile-size-per-unit')?.value) || 0;
                const totalUnitsInWasteUnit = wasteUnit === baseUnit ? 
                    units * size : 
                    convertUnits(baseUnit, wasteUnit, units * size) || 0;
                
                totalVolumeDisplay.textContent = `${totalUnitsInWasteUnit} ${wasteUnit.toLowerCase()} per case`;
            }
        }
    }

    clearCalculations() {
        const unitCostDisplay = document.getElementById('mobile-unit-cost');
        const totalVolumeDisplay = document.getElementById('mobile-total-volume');
        const portionResultsRow = document.getElementById('mobile-portion-results');
        
        if (unitCostDisplay) unitCostDisplay.innerHTML = '<div class="primary-cost">$0.00</div>';
        if (totalVolumeDisplay) totalVolumeDisplay.textContent = '0 units';
        if (portionResultsRow) portionResultsRow.style.display = 'none';
        
        this.updateField('unitCost', 0);
    }

    setupEventListeners() {
        // Save button
        const saveBtn = document.getElementById('mobile-save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveItem();
            });
        }

        // Save & Close button
        const saveCloseBtn = document.getElementById('mobile-save-close-btn');
        if (saveCloseBtn) {
            saveCloseBtn.addEventListener('click', () => {
                this.saveAndClose();
            });
        }

        // Back button
        const backBtn = document.getElementById('mobile-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.goBack();
            });
        }

        this.setupChangeDetection();

        // Item name input in Quick Edit - sync with page title
        const itemNameInput = document.getElementById('mobile-item-name');
        if (itemNameInput) {
            itemNameInput.addEventListener('input', (e) => {
                const titleElement = document.getElementById('mobile-item-title');
                if (titleElement) {
                    titleElement.textContent = e.target.value || 'Unnamed Item';
                }
                this.updateField('name', e.target.value);
            });
        }
    }

    setupChangeDetection() {
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.markDirty();
            });
            
            input.addEventListener('change', () => {
                this.markDirty();
            });
        });
    }

    updateField(fieldName, value) {
        this.formData[fieldName] = value;
        this.markDirty();
    }

    markDirty() {
        if (!this.isDirty) {
            this.isDirty = true;
            this.updateSaveStatus('unsaved');
        }
    }

    updateSaveStatus(status) {
        const statusEl = document.getElementById('mobile-save-status');
        if (!statusEl) return;
        
        statusEl.className = `save-status ${status}`;
        
        const statusText = {
            'saved': 'Saved',
            'saving': 'Saving...',
            'unsaved': 'Unsaved',
            'error': 'Error'
        };
        
        statusEl.textContent = statusText[status] || 'Unknown';
    }

    startAutoSave() {
        this.autoSaveTimer = setInterval(() => {
            if (this.isDirty && this.itemId) {
                this.saveDraft();
            }
        }, 3000);
    }

    async saveDraft() {
        try {
            this.updateSaveStatus('saving');
            this.collectFormData();
            
            await setDoc(doc(db, "inventory_items", this.formData.id), {
                ...this.formData,
                isDraft: true,
                lastModified: new Date().toISOString()
            });
            
            this.updateSaveStatus('saved');
            this.isDirty = false;
            
            console.log('Draft saved:', this.formData.name);
        } catch (error) {
            this.updateSaveStatus('error');
            console.error('Auto-save failed:', error);
        }
    }

    async saveItem() {
        try {
            this.updateSaveStatus('saving');
            this.collectFormData();
            
            if (!this.validateForm()) {
                this.updateSaveStatus('error');
                return;
            }
            
            this.toggleButtonSpinner('mobile-save-btn', true);
            
            await StorageController.save([{
                ...this.formData,
                isDraft: false,
                lastModified: new Date().toISOString()
            }]);
            
            if (!this.itemId) {
                this.isUnitTypeLocked = true;
                this.populateUnitType(this.formData.unitType);
                console.log('🔒 Unit type locked after first save');
            }
            
            this.updateSaveStatus('saved');
            this.isDirty = false;
            this.originalData = { ...this.formData };
            
            this.showMessage('Item saved successfully!', 'success');
            
            if (!this.itemId) {
                this.itemId = this.formData.id;
            }
            
            console.log('Item saved:', this.formData.name);
        } catch (error) {
            this.updateSaveStatus('error');
            this.showMessage('Failed to save item: ' + error.message, 'error');
            console.error('Save failed:', error);
        } finally {
            this.toggleButtonSpinner('mobile-save-btn', false);
        }
    }

    async saveAndClose() {
        try {
            this.updateSaveStatus('saving');
            this.collectFormData();
            
            if (!this.validateForm()) {
                this.updateSaveStatus('error');
                return;
            }
            
            this.toggleButtonSpinner('mobile-save-close-btn', true);
            
            await StorageController.save([{
                ...this.formData,
                isDraft: false,
                lastModified: new Date().toISOString()
            }]);
            
            this.updateSaveStatus('saved');
            this.isDirty = false;
            
            this.showMessage('Item saved successfully!', 'success');
            
            setTimeout(() => {
                this.goBack();
            }, 1000);
            
            console.log('Item saved and closing:', this.formData.name);
        } catch (error) {
            this.updateSaveStatus('error');
            this.showMessage('Failed to save item: ' + error.message, 'error');
            console.error('Save and close failed:', error);
            this.toggleButtonSpinner('mobile-save-close-btn', false);
        }
    }

    toggleButtonSpinner(buttonId, show) {
        const button = document.getElementById(buttonId);
        if (!button) return;
        
        const spinner = button.querySelector('.btn-spinner');
        const text = button.querySelector('.btn-text');
        
        if (spinner && text) {
            if (show) {
                spinner.style.display = 'inline';
                text.style.display = 'none';
                button.disabled = true;
            } else {
                spinner.style.display = 'none';
                text.style.display = 'inline';
                button.disabled = false;
            }
        }
    }

    collectFormData() {
        const getValue = (id) => {
            const element = document.getElementById(id);
            if (!element) return '';
            
            if (element.type === 'checkbox') {
                return element.checked;
            } else {
                return element.value || '';
            }
        };

        this.formData = {
            // System fields
            id: this.formData.id || crypto.randomUUID(),
            isActive: true,
            timestamp: this.formData.timestamp || new Date().toISOString(),
            lastModified: new Date().toISOString(),
            
            // Basic Info
            name: getValue('mobile-item-name') || '',
            par: parseInt(getValue('mobile-par-input')) || 0,
            onHand: this.parseDecimalValue(getValue('mobile-onhand-input')), // NEW: Parse decimal
            location: getValue('mobile-location-select') || '',
            area: getValue('mobile-area-input') || '',
            
            // Pricing & Pack Size
            unitsPerCase: parseInt(getValue('mobile-units-per-case')) || 0,
            sizePerUnit: parseFloat(getValue('mobile-size-per-unit')) || 0,
            unitType: this.getCurrentUnitType(),
            caseCost: parseFloat(getValue('mobile-case-cost')?.replace(/[^0-9.-]/g, '')) || 0,
            unitCost: this.formData.unitCost || 0,
            
            // NEW: Portion Size fields
            portionSize: this.parseDecimalValue(getValue('mobile-portion-size')),
            portionUnit: getValue('mobile-portion-unit') || 'OZ',
            
            // Vendor Information
            primaryVendor: getValue('mobile-vendor-name') || '',
            vendorSKU: getValue('mobile-product-sku') || '',
            brand: getValue('mobile-brand') || '',
            manufacturer: getValue('mobile-manufacturer') || '',
            vendorNotes: getValue('mobile-vendor-notes') || '',
            
            // Storage & Tracking
            wasteEntryUnit: getValue('mobile-waste-unit') || 'OZ',
            notes: getValue('mobile-notes-input') || '',
            reorderPoint: this.parseDecimalValue(getValue('mobile-reorder-point')) || null, // NEW: Decimal support
            
            // Meta fields
            createdBy: this.formData.createdBy || 'manual_entry',
            modifiedBy: 'manual_entry'
        };

        console.log('✅ Form data collected with decimal support:', this.formData);
    }

    validateForm() {
        const errors = [];
        
        if (!this.formData.name.trim()) {
            errors.push('Item name is required');
            this.highlightError('mobile-item-name');
        }
        
        if (this.formData.unitsPerCase > 0 && this.formData.sizePerUnit <= 0) {
            errors.push('Size per unit must be greater than 0');
        }
        
        if (this.formData.sizePerUnit > 0 && this.formData.unitsPerCase <= 0) {
            errors.push('Units per case must be greater than 0');
        }
        
        // NEW: Validate portion size if specified
        if (this.formData.portionSize > 0 && !this.formData.portionUnit) {
            errors.push('Portion unit is required when portion size is specified');
        }
        
        this.validateWasteUnit();
        
        if (errors.length > 0) {
            this.showMessage(errors.join(', '), 'error');
            return false;
        }
        
        return true;
    }

    highlightError(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.borderColor = 'var(--mobile-error)';
            element.focus();
            
            setTimeout(() => {
                element.style.borderColor = '';
            }, 3000);
        }
    }

    goBack() {
        if (this.isDirty) {
            const confirmed = confirm('You have unsaved changes. Are you sure you want to leave?');
            if (!confirmed) return;
        }
        
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
        
        if (window.moduleSystem) {
            window.moduleSystem.loadModule('inventory');
        } else {
            window.location.href = '#inventory';
        }
    }

    showMessage(message, type = 'info') {
        const existingMessages = document.querySelectorAll('.message-overlay');
        existingMessages.forEach(msg => msg.remove());
        
        const messageEl = document.createElement('div');
        messageEl.className = `message-overlay ${type}`;
        messageEl.textContent = message;
        
        const colors = {
            success: '#4caf50',
            error: '#f44336',
            info: '#2196f3',
            warning: '#ff9800'
        };
        
        messageEl.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: ${colors[type] || colors.info};
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            z-index: 1000;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            max-width: 90%;
            text-align: center;
            animation: slideInFromTop 0.3s ease-out;
        `;
        
        if (!document.querySelector('#message-animations')) {
            const style = document.createElement('style');
            style.id = 'message-animations';
            style.textContent = `
                @keyframes slideInFromTop {
                    from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
                    to { transform: translateX(-50%) translateY(0); opacity: 1; }
                }
                .form-input-readonly {
                    padding: var(--mobile-spacing-md);
                    border: 2px solid var(--mobile-border);
                    border-radius: var(--mobile-radius-md);
                    background: #f8f9fa;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: var(--mobile-font-base);
                }
                .readonly-value {
                    font-weight: 600;
                    color: var(--mobile-text-primary);
                }
                .readonly-indicator {
                    font-size: var(--mobile-font-sm);
                    color: var(--mobile-text-secondary);
                    opacity: 0.7;
                }
                .primary-cost {
                    font-weight: 600;
                    color: var(--mobile-text-primary);
                }
                .secondary-cost {
                    font-size: var(--mobile-font-sm);
                    color: var(--mobile-text-secondary);
                    margin-top: 2px;
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(messageEl);
        
        const removeDelay = type === 'error' ? 5000 : (type === 'warning' ? 4000 : 3000);
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.remove();
            }
        }, removeDelay);
    }

    destroy() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
    }
}

// Export functions for compatibility
export function loadItemForm(id) {
    console.log('Loading item form for ID:', id);
    const content = document.getElementById("app-content");
    
    const templateUrl = "templates/item-info-page.html";
    
    fetch(templateUrl)
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res;
        })
        .then(res => res.text())
        .then(html => {
            content.innerHTML = html;
            
            setTimeout(() => {
                new MobileItemFormController(id);
            }, 0);
        })
        .catch(err => {
            console.error("Failed to load item form:", err);
            content.innerHTML = `<p style="color: red;">Failed to load form: ${err.message}</p>`;
        });
}

export default {
    initialize: function() {
        const templateUrl = "templates/item-info-page.html";
        
        fetch(templateUrl)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res;
            })
            .then(res => res.text())
            .then(html => {
                document.getElementById("app-content").innerHTML = html;
                
                setTimeout(() => {
                    new MobileItemFormController();
                }, 0);
            })
            .catch(err => {
                console.error("Failed to load item form:", err);
                document.getElementById("app-content").innerHTML = 
                    `<p style="color: red;">Failed to load form: ${err.message}</p>`;
            });
    }
};