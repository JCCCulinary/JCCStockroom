// scripts/modules/import.js - UPDATED: Enhanced Review Interface
import { StorageController } from '../storage/storageController.js';
import { parsePackSize, parsePortionSize, validatePortionSize, formatPortionSize } from '../utils/dataUtils.js';

class InvoiceImportController {
    constructor() {
        this.importData = {
            vendor: null,
            invoiceNumber: '',
            invoiceDate: '',
            fileName: '',
            extractedItems: [],
            matchResults: [],
            summary: {
                totalItems: 0,
                autoMatched: 0,
                needsReview: 0,
                newItems: 0,
                portionsParsed: 0
            }
        };
        
        this.existingInventory = [];
        this.vendorPatterns = this.initializeVendorPatterns();
        
        this.initializeImport();
    }

    initializeVendorPatterns() {
        return {
            customerFirst: {
                fileType: 'csv',
                headers: ['Invoice Date', 'Product #', 'Product Description'],
                confidence: 95,
                requiredColumns: ['Product Description', 'Product #', 'Net Price', 'Pack Size']
            },
            benKeith: {
                fileType: 'pdf',
                textSignatures: ['BEN E. KEITH', 'BEN E KEITH', 'FORT WORTH, TX', 'NET 30'],
                confidence: 95,
                fileNamePatterns: ['keith', 'bek', 'ben_e_keith']
            },
            mcCartney: {
                fileType: 'pdf',
                textSignatures: ['McCartney Produce', '459 Culley Dr', 'Paris, Tennessee'],
                confidence: 95
            },
            gordon: {
                fileType: 'pdf', 
                textSignatures: ['Gordon Food Service Inc', 'www.gfs.com', 'Shepherdsville'],
                confidence: 95
            }
        };
    }

    async initializeImport() {
        try {
            // Load existing inventory for matching
            this.existingInventory = await StorageController.load();
            
            // Load PDF.js library for PDF processing
            await this.loadPDFJS();
            
            this.setupEventListeners();
            this.showFileUpload();
            this.initializeEnhancedImport();
            
            console.log('📊 Enhanced Invoice Import initialized with comprehensive review system');
        } catch (error) {
            console.error('Failed to initialize invoice import:', error);
            this.showError('Failed to initialize import system');
        }
    }

    /**
     * Initialize the enhanced import system
     */
    initializeEnhancedImport() {
        // Setup global functions
        this.setupGlobalItemFunctions();
        
        // Add custom CSS if not already present
        this.addEnhancedStyles();
        
        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        console.log('✨ Enhanced Import Review System initialized');
    }

    /**
     * Load PDF.js library for PDF text extraction
     */
    async loadPDFJS() {
        try {
            // Check if PDF.js is already loaded
            if (window.pdfjsLib) {
                console.log('✅ PDF.js already available');
                return;
            }

            // Load PDF.js from CDN
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = () => {
                // Set PDF.js worker
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                console.log('✅ PDF.js loaded successfully');
            };
            script.onerror = () => {
                console.warn('⚠️ PDF.js failed to load, PDF processing will fail');
            };
            document.head.appendChild(script);

            // Wait for script to load
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
            });

        } catch (error) {
            console.warn('PDF.js loading failed:', error);
        }
    }

    setupEventListeners() {
        // File upload handler
        const fileInput = document.getElementById('invoice-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileUpload(e.target.files[0]);
            });
        }

        // Review actions
        document.addEventListener('click', (e) => {
            if (e.target.matches('.accept-match-btn')) {
                this.acceptMatch(e.target.dataset.itemIndex);
            } else if (e.target.matches('.create-new-btn')) {
                this.createNewItem(e.target.dataset.itemIndex);
            } else if (e.target.matches('.skip-item-btn')) {
                this.skipItem(e.target.dataset.itemIndex);
            } else if (e.target.matches('#apply-import-btn')) {
                this.applyImport();
            }
        });
    }

    showFileUpload() {
        const content = `
            <div class="invoice-import-container">
                <div class="import-header">
                    <h2>📊 Enhanced Invoice Import</h2>
                    <p>Import vendor invoices with comprehensive review and editing capabilities</p>
                </div>
                
                <div class="file-upload-area">
                    <div class="upload-zone" id="upload-zone">
                        <div class="upload-icon">📁</div>
                        <h3>Drop invoice file here or click to browse</h3>
                        <p>Supports: CSV (CustomerFirst), PDF (Ben E. Keith, Gordon Food Service, McCartney)</p>
                        <input type="file" id="invoice-file-input" accept=".csv,.pdf" style="display: none;">
                        <button class="btn-primary" onclick="document.getElementById('invoice-file-input').click()">
                            Choose File
                        </button>
                    </div>
                </div>
                
                <div class="import-features">
                    <div class="feature">
                        <span class="feature-icon">🔍</span>
                        <div>
                            <h4>Smart Vendor Detection</h4>
                            <p>Automatically identifies vendor and data format</p>
                        </div>
                    </div>
                    <div class="feature">
                        <span class="feature-icon">✏️</span>
                        <div>
                            <h4>Comprehensive Editing</h4>
                            <p>Review and edit all data fields before importing</p>
                        </div>
                    </div>
                    <div class="feature">
                        <span class="feature-icon">📏</span>
                        <div>
                            <h4>Portion Size Detection</h4>
                            <p>Detects portion sizes like "6 OZ", "1/4 LB" from descriptions</p>
                        </div>
                    </div>
                    <div class="feature">
                        <span class="feature-icon">🪄</span>
                        <div>
                            <h4>Auto-Fill Missing Data</h4>
                            <p>Intelligently fills categories, locations, and default values</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('app-content').innerHTML = content;
        this.setupDragAndDrop();
    }

    setupDragAndDrop() {
        const uploadZone = document.getElementById('upload-zone');
        if (!uploadZone) return;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadZone.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            uploadZone.addEventListener(eventName, () => uploadZone.classList.add('drag-over'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadZone.addEventListener(eventName, () => uploadZone.classList.remove('drag-over'), false);
        });

        uploadZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileUpload(files[0]);
            }
        }, false);
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    async handleFileUpload(file) {
        if (!file) return;

        try {
            this.showProcessing('Analyzing file...');

            // Detect vendor and file type
            const vendor = await this.detectVendor(file);
            this.importData.vendor = vendor;
            this.importData.fileName = file.name;

            console.log(`📋 Detected vendor: ${vendor}`);

            // Extract data based on vendor
            const extractedItems = await this.extractDataFromFile(file, vendor);
            
            if (!extractedItems || extractedItems.length === 0) {
                throw new Error('No items could be extracted from the invoice. Please check the file format and try again.');
            }
            
            this.importData.extractedItems = extractedItems;

            // Match against existing inventory
            const matchResults = await this.matchItemsToInventory(extractedItems);
            this.importData.matchResults = matchResults;

            // Update summary with portion size stats
            this.updateImportSummary();

            // Show enhanced review interface
            this.showReviewInterface();

        } catch (error) {
            console.error('File upload failed:', error);
            this.showError('Failed to process file: ' + error.message);
        }
    }

    /**
     * Enhanced showReviewInterface - replaces the existing method
     */
    showReviewInterface() {
        const summary = this.importData.summary;
        
        const content = `
            <div class="import-review-container enhanced">
                <div class="review-header">
                    <h2>📋 Enhanced Import Review - ${this.importData.vendor}</h2>
                    <p class="review-subtitle">Review and edit all data before importing. Click any field to edit.</p>
                    
                    <div class="import-summary">
                        <div class="summary-stat">
                            <span class="stat-number">${summary.totalItems}</span>
                            <span class="stat-label">Total Items</span>
                        </div>
                        <div class="summary-stat success">
                            <span class="stat-number">${summary.autoMatched}</span>
                            <span class="stat-label">Auto-Matched</span>
                        </div>
                        <div class="summary-stat warning">
                            <span class="stat-number">${summary.needsReview}</span>
                            <span class="stat-label">Need Review</span>
                        </div>
                        <div class="summary-stat info">
                            <span class="stat-number">${summary.newItems}</span>
                            <span class="stat-label">New Items</span>
                        </div>
                        <div class="summary-stat portion">
                            <span class="stat-number">${summary.portionsParsed}</span>
                            <span class="stat-label">Portions Detected</span>
                        </div>
                    </div>
                </div>
                
                <div class="review-controls">
                    <div class="view-toggles">
                        <button class="btn-toggle active" data-view="all">All Items</button>
                        <button class="btn-toggle" data-view="matched">Auto-Matched</button>
                        <button class="btn-toggle" data-view="review">Need Review</button>
                        <button class="btn-toggle" data-view="new">New Items</button>
                    </div>
                    
                    <div class="bulk-actions">
                        <button class="btn-secondary" id="expand-all-btn">📖 Expand All</button>
                        <button class="btn-secondary" id="collapse-all-btn">📕 Collapse All</button>
                        <button class="btn-secondary" id="auto-fill-btn">🪄 Auto-Fill Missing</button>
                    </div>
                </div>
                
                <div class="review-content enhanced" id="review-items-container">
                    ${this.renderEnhancedReviewItems()}
                </div>
                
                <div class="review-actions enhanced">
                    <div class="action-group">
                        <button class="btn-secondary" onclick="window.location.reload()">❌ Cancel Import</button>
                        <button class="btn-secondary" id="save-draft-btn">💾 Save as Draft</button>
                    </div>
                    <div class="action-group">
                        <button class="btn-secondary" id="validate-all-btn">✅ Validate All</button>
                        <button class="btn-primary" id="apply-import-btn">🚀 Apply Import</button>
                    </div>
                </div>
                
                <div class="import-validation" id="validation-results" style="display: none;">
                    <!-- Validation results will appear here -->
                </div>
            </div>
        `;
        
        document.getElementById('app-content').innerHTML = content;
        this.setupEnhancedEventListeners();
    }

    /**
     * Enhanced renderEnhancedReviewItems - comprehensive item rendering
     */
    renderEnhancedReviewItems() {
        let html = '';
        
        this.importData.matchResults.forEach((match, index) => {
            const item = match.extractedItem;
            const isMatched = !match.requiresReview && !match.isNewItem;
            const needsReview = match.requiresReview;
            const isNew = match.isNewItem;
            
            let statusClass = 'enhanced-item';
            let statusBadge = '';
            
            if (isMatched) {
                statusClass += ' matched';
                statusBadge = '<span class="status-badge success">✓ Auto-Matched</span>';
            } else if (needsReview) {
                statusClass += ' needs-review';
                statusBadge = '<span class="status-badge warning">⚠ Needs Review</span>';
            } else if (isNew) {
                statusClass += ' new-item';
                statusBadge = '<span class="status-badge info">+ New Item</span>';
            }
            
            html += `
                <div class="${statusClass}" data-item-index="${index}" data-view-type="${isMatched ? 'matched' : needsReview ? 'review' : 'new'}">
                    <div class="item-header" onclick="toggleItemExpansion(${index})">
                        <div class="item-header-info">
                            <h4 class="item-name">${this.escapeHtml(item.name)}</h4>
                            <div class="item-quick-info">
                                <span class="quick-info-item">SKU: ${item.vendorSKU}</span>
                                <span class="quick-info-item">Qty: ${item.quantityShipped}</span>
                                <span class="quick-info-item">Cost: $${item.caseCost.toFixed(2)}</span>
                                ${item.portionSize ? `<span class="quick-info-item portion">📏 ${this.formatPortionSize(item.portionSize, item.portionUnit)}</span>` : ''}
                            </div>
                        </div>
                        <div class="item-header-actions">
                            ${statusBadge}
                            <button class="btn-icon expand-btn" data-expanded="false">
                                <span class="expand-icon">▼</span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="item-details-panel" style="display: none;">
                        ${this.renderItemEditingForm(item, match, index)}
                    </div>
                </div>
            `;
        });
        
        return html || '<div class="no-items">No items to display</div>';
    }

    /**
     * Enhanced renderItemEditingForm - comprehensive editing interface
     */
    renderItemEditingForm(item, match, index) {
        const matchInfo = match.matchedItem ? `
            <div class="match-info">
                <h5>📋 Matched to existing item:</h5>
                <p class="matched-item-name">${this.escapeHtml(match.matchedItem.name)}</p>
                <p class="match-confidence">Confidence: ${Math.round(match.confidence * 100)}%</p>
                <div class="match-actions">
                    <button class="btn-warning btn-sm" onclick="unmatchItem(${index})">🔄 Unmatch</button>
                    <button class="btn-info btn-sm" onclick="searchMatches(${index})">🔍 Find Other Matches</button>
                </div>
            </div>
        ` : '';
        
        return `
            <div class="item-edit-form">
                ${matchInfo}
                
                <div class="form-sections">
                    <!-- Basic Information -->
                    <div class="form-section">
                        <h5 class="section-title">📦 Basic Information</h5>
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="name-${index}">Item Name *</label>
                                <input type="text" 
                                       id="name-${index}"
                                       class="form-control" 
                                       data-field="name" 
                                       data-index="${index}"
                                       value="${this.escapeHtml(item.name)}" 
                                       required>
                            </div>
                            <div class="form-group">
                                <label for="vendorSKU-${index}">Vendor SKU</label>
                                <input type="text" 
                                       id="vendorSKU-${index}"
                                       class="form-control" 
                                       data-field="vendorSKU" 
                                       data-index="${index}"
                                       value="${item.vendorSKU}">
                            </div>
                            <div class="form-group">
                                <label for="brand-${index}">Brand</label>
                                <input type="text" 
                                       id="brand-${index}"
                                       class="form-control" 
                                       data-field="brand" 
                                       data-index="${index}"
                                       value="${item.brand || ''}"
                                       placeholder="Enter brand name">
                            </div>
                            <div class="form-group">
                                <label for="category-${index}">Category *</label>
                                <select id="category-${index}" class="form-control" data-field="category" data-index="${index}" required>
                                    ${this.getCategoryOptions(item.category)}
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Pack Size Information -->
                    <div class="form-section">
                        <h5 class="section-title">📏 Pack Size & Units</h5>
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="unitsPerCase-${index}">Units per Case *</label>
                                <input type="number" 
                                       id="unitsPerCase-${index}"
                                       class="form-control" 
                                       data-field="unitsPerCase" 
                                       data-index="${index}"
                                       value="${item.unitsPerCase}" 
                                       min="1" 
                                       step="1" 
                                       required>
                            </div>
                            <div class="form-group">
                                <label for="sizePerUnit-${index}">Size per Unit *</label>
                                <input type="number" 
                                       id="sizePerUnit-${index}"
                                       class="form-control" 
                                       data-field="sizePerUnit" 
                                       data-index="${index}"
                                       value="${item.sizePerUnit}" 
                                       min="0.01" 
                                       step="0.01" 
                                       required>
                            </div>
                            <div class="form-group">
                                <label for="unitType-${index}">Unit Type *</label>
                                <select id="unitType-${index}" class="form-control" data-field="unitType" data-index="${index}" required>
                                    ${this.getUnitTypeOptions(item.unitType)}
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Pricing Information -->
                    <div class="form-section">
                        <h5 class="section-title">💰 Pricing</h5>
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="caseCost-${index}">Case Cost *</label>
                                <div class="input-group">
                                    <span class="input-prefix">$</span>
                                    <input type="number" 
                                           id="caseCost-${index}"
                                           class="form-control" 
                                           data-field="caseCost" 
                                           data-index="${index}"
                                           value="${item.caseCost}" 
                                           min="0" 
                                           step="0.01" 
                                           required>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="unitCost-${index}">Unit Cost (calculated)</label>
                                <div class="input-group">
                                    <span class="input-prefix">$</span>
                                    <input type="number" 
                                           id="unitCost-${index}"
                                           class="form-control calculated" 
                                           data-field="unitCost" 
                                           data-index="${index}"
                                           value="${item.unitCost.toFixed(4)}" 
                                           readonly>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Quantity Information -->
                    <div class="form-section">
                        <h5 class="section-title">📊 Quantities</h5>
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="quantityShipped-${index}">Quantity Shipped *</label>
                                <input type="number" 
                                       id="quantityShipped-${index}"
                                       class="form-control" 
                                       data-field="quantityShipped" 
                                       data-index="${index}"
                                       value="${item.quantityShipped}" 
                                       min="0" 
                                       step="0.01" 
                                       required>
                            </div>
                            <div class="form-group">
                                <label for="par-${index}">Par Level</label>
                                <input type="number" 
                                       id="par-${index}"
                                       class="form-control" 
                                       data-field="par" 
                                       data-index="${index}"
                                       value="${item.par}" 
                                       min="0" 
                                       step="0.01"
                                       placeholder="Target inventory level">
                            </div>
                        </div>
                    </div>
                    
                    <!-- Location Information -->
                    <div class="form-section">
                        <h5 class="section-title">📍 Location</h5>
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="location-${index}">Storage Location</label>
                                <input type="text" 
                                       id="location-${index}"
                                       class="form-control" 
                                       data-field="location" 
                                       data-index="${index}"
                                       value="${item.location || ''}" 
                                       placeholder="e.g., Walk-in Cooler Shelf 2">
                            </div>
                            <div class="form-group">
                                <label for="area-${index}">Area</label>
                                <select id="area-${index}" class="form-control" data-field="area" data-index="${index}">
                                    ${this.getAreaOptions(item.area)}
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Additional Information -->
                    <div class="form-section">
                        <h5 class="section-title">📝 Additional Information</h5>
                        <div class="form-grid">
                            <div class="form-group full-width">
                                <label for="notes-${index}">General Notes</label>
                                <textarea id="notes-${index}"
                                          class="form-control" 
                                          data-field="notes" 
                                          data-index="${index}"
                                          rows="2" 
                                          placeholder="Any additional notes about this item...">${item.notes || ''}</textarea>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Item Actions -->
                <div class="item-actions">
                    <div class="action-group">
                        <button class="btn-secondary btn-sm" onclick="resetItemData(${index})" title="Reset to original imported data">
                            🔄 Reset
                        </button>
                        <button class="btn-secondary btn-sm" onclick="duplicateItem(${index})" title="Create a copy of this item">
                            📋 Duplicate
                        </button>
                    </div>
                    <div class="action-group">
                        <button class="btn-danger btn-sm" onclick="removeItem(${index})" title="Remove from import">
                            🗑 Remove from Import
                        </button>
                        ${match.matchedItem ? 
                            `<button class="btn-warning btn-sm" onclick="unmatchItem(${index})" title="Create as new item instead">
                                🔄 Create as New
                            </button>` : 
                            `<button class="btn-info btn-sm" onclick="searchMatches(${index})" title="Search for potential matches">
                                🔍 Find Matches
                            </button>`
                        }
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Setup all enhanced event listeners
     */
    setupEnhancedEventListeners() {
        // View toggle handlers
        document.querySelectorAll('.btn-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.btn-toggle').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.filterItemsByView(e.target.dataset.view);
            });
        });
        
        // Bulk action handlers
        document.getElementById('expand-all-btn')?.addEventListener('click', () => this.expandAllItems());
        document.getElementById('collapse-all-btn')?.addEventListener('click', () => this.collapseAllItems());
        document.getElementById('auto-fill-btn')?.addEventListener('click', () => this.autoFillMissingData());
        document.getElementById('validate-all-btn')?.addEventListener('click', () => this.validateAllItems());
        document.getElementById('save-draft-btn')?.addEventListener('click', () => this.saveDraft());
        document.getElementById('apply-import-btn')?.addEventListener('click', () => this.applyImport());
        
        // Real-time field editing with debouncing
        let updateTimeout;
        document.addEventListener('input', (e) => {
            if (e.target.dataset.field && e.target.dataset.index !== undefined) {
                clearTimeout(updateTimeout);
                updateTimeout = setTimeout(() => {
                    this.updateItemField(e.target.dataset.index, e.target.dataset.field, e.target.value);
                }, 300); // Debounce updates
            }
        });
        
        // Real-time cost calculation
        document.addEventListener('input', (e) => {
            if (['caseCost', 'unitsPerCase', 'sizePerUnit'].includes(e.target.dataset.field)) {
                this.recalculateUnitCost(e.target.dataset.index);
            }
        });
    }

    /**
     * Enhanced vendor detection supporting both CSV and PDF files
     */
    async detectVendor(file) {
        const fileName = file.name.toLowerCase();
        const fileExtension = fileName.split('.').pop();

        console.log(`🔍 Detecting vendor for file: ${fileName} (${fileExtension})`);

        if (fileExtension === 'csv') {
            // CSV file - check for CustomerFirst format
            const content = await this.readFileAsText(file);
            const lines = content.split('\n');
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

            if (headers.includes('Product Description') && headers.includes('Product #')) {
                console.log('✅ Detected CustomerFirst CSV format');
                return 'customerFirst';
            }
        } 
        
        if (fileExtension === 'pdf') {
            // PDF file - extract text and check for vendor signatures
            try {
                const pdfText = await this.extractPDFText(file);
                
                // Check for Ben E. Keith signatures
                if (this.containsBenEKeithSignature(pdfText, fileName)) {
                    console.log('✅ Detected Ben E. Keith PDF format');
                    return 'benKeith';
                }
                
                // Check for other vendors
                if (pdfText.includes('Gordon Food Service') || pdfText.includes('GFS')) {
                    console.log('✅ Detected Gordon Food Service PDF format');
                    return 'gordon';
                }
                
                if (pdfText.includes('McCartney Produce')) {
                    console.log('✅ Detected McCartney Produce PDF format');
                    return 'mcCartney';
                }
                
                console.log('⚠️ PDF detected but vendor unknown, content preview:', pdfText.substring(0, 200));
                
            } catch (pdfError) {
                console.warn('PDF text extraction failed:', pdfError);
                
                // Fallback to filename detection
                if (fileName.includes('keith') || fileName.includes('bek')) {
                    console.log('✅ Detected Ben E. Keith via filename');
                    return 'benKeith';
                }
            }
        }

        throw new Error(`Unknown vendor format. File: ${fileName}, Extension: ${fileExtension}`);
    }

    /**
     * Check if PDF contains Ben E. Keith signature patterns
     */
    containsBenEKeithSignature(pdfText, fileName) {
        const text = pdfText.toUpperCase();
        const name = fileName.toLowerCase();
        
        // Text-based signatures
        const textSignatures = [
            'BEN E. KEITH', 'BEN E KEITH', 'KEITH FOODS',
            'FORT WORTH, TX', 'FORT WORTH TX',
            'NET 30', 'KEITH MID-SOUTH'
        ];
        
        // Filename signatures
        const filenameSignatures = ['keith', 'bek', 'ben_e_keith'];
        
        // Check text content
        const hasTextSignature = textSignatures.some(signature => text.includes(signature));
        
        // Check filename
        const hasFilenameSignature = filenameSignatures.some(signature => name.includes(signature));
        
        return hasTextSignature || hasFilenameSignature;
    }

    /**
     * SECURE: Extract text content from PDF file using PDF.js with privacy protection
     */
    async extractPDFText(file) {
        if (!window.pdfjsLib) {
            throw new Error('PDF.js not available');
        }

        try {
            console.log('📄 Extracting text from PDF (secure mode)...');
            
            const fileBuffer = await file.arrayBuffer();
            const pdf = await window.pdfjsLib.getDocument(fileBuffer).promise;
            
            let fullText = '';
            const numPages = pdf.numPages;
            
            console.log(`📄 PDF has ${numPages} pages`);
            
            for (let i = 1; i <= numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n';
            }
            
            console.log(`📄 Extracted ${fullText.length} characters from PDF (content not logged for security)`);
            
            return fullText;
            
        } catch (error) {
            console.error('PDF text extraction failed:', error);
            throw error;
        }
    }

    async extractDataFromFile(file, vendor) {
        console.log(`📊 Extracting data for vendor: ${vendor}`);
        
        if (vendor === 'customerFirst') {
            return await this.extractFromCustomerFirstCSV(file);
        } else if (vendor === 'benKeith') {
            return await this.extractFromBenEKeithPDF(file);
        } else if (vendor === 'gordon') {
            return await this.extractFromGordonPDF(file);
        }
        
        throw new Error('Vendor extraction not implemented: ' + vendor);
    }

    /**
     * Extract data from Ben E. Keith PDF invoices
     */
    async extractFromBenEKeithPDF(file) {
        console.log('📋 Processing Ben E. Keith PDF invoice...');
        
        try {
            // Extract PDF text content
            const pdfText = await this.extractPDFText(file);
            
            if (!pdfText || pdfText.length < 100) {
                throw new Error('PDF text extraction failed or file is empty');
            }
            
            console.log('📄 PDF text extracted, attempting to parse...');
            const parsedItems = await this.parseBenEKeithTextContent(pdfText);
            
            if (!parsedItems || parsedItems.length === 0) {
                throw new Error('No items could be parsed from the Ben E. Keith PDF. The file format may not be supported.');
            }
            
            console.log(`✅ Successfully parsed ${parsedItems.length} items from PDF text`);
            return parsedItems;
            
        } catch (error) {
            console.error('Ben E. Keith PDF extraction failed:', error);
            throw new Error(`Ben E. Keith PDF processing failed: ${error.message}`);
        }
    }

    /**
     * SECURE: Ben E. Keith PDF parser with privacy protection - skips sensitive header data
     */
    async parseBenEKeithTextContent(pdfText) {
        console.log('🔍 Parsing Ben E. Keith PDF (secure mode - skipping sensitive header data)...');
        
        try {
            // SECURITY: Skip sensitive header section and jump directly to item data
            // Ben E. Keith invoices have consistent structure - items start after customer info
            const itemDataStartMarkers = [
                // Look for the first item line pattern
                /\w{6,7}\s+\d+\s+\d{6}\s+[A-Z\/]{3,8}\s+\w+\s+\d+\/\d+/,
                // Alternative: Look for first 6-digit item number after headers
                /(?:LINE|ITEM|PRODUCT).*?\n.*?(\d{6})/is,
                // Fallback: Look for quantity + 6-digit pattern
                /\d+\s+\d{6}\s+[A-Z]{3,8}/
            ];
            
            let itemDataStart = -1;
            let itemDataStartIndex = pdfText.length; // Start from end if no pattern found
            
            for (const marker of itemDataStartMarkers) {
                const match = pdfText.match(marker);
                if (match && match.index < itemDataStartIndex) {
                    itemDataStart = match.index;
                    itemDataStartIndex = match.index;
                    console.log('🔍 Found item data start marker (header skipped for privacy)');
                    break;
                }
            }
            
            if (itemDataStart === -1) {
                // Last resort: Find first 6-digit number and work backwards
                const itemNumberMatch = pdfText.match(/\d{6}/);
                if (itemNumberMatch) {
                    itemDataStart = Math.max(0, itemNumberMatch.index - 100);
                    console.log('🔍 Using fallback item detection method');
                } else {
                    throw new Error('Could not locate item data in the PDF');
                }
            }
            
            // Find the end of item data (FUEL ADJUSTMENT or similar)
            const endMarkers = ['FUEL   ADJUSTMENT', 'FUEL ADJUSTMENT', 'TOTAL QTY', 'DOCUMENT AND THE INFORMATION'];
            let fuelAdjustmentIndex = pdfText.length;
            
            for (const marker of endMarkers) {
                const index = pdfText.indexOf(marker, itemDataStart);
                if (index !== -1 && index < fuelAdjustmentIndex) {
                    fuelAdjustmentIndex = index;
                }
            }
            
            if (fuelAdjustmentIndex === pdfText.length) {
                console.warn('⚠️ Could not find end marker, using full remaining text');
            }
            
            // Extract ONLY the item data section (no sensitive header info)
            const itemDataText = pdfText.substring(itemDataStart, fuelAdjustmentIndex);
            console.log(`📋 Processing item data section (${itemDataText.length} characters, header excluded)`);
            
            // SECURITY: Extract invoice metadata without logging sensitive content
            const invoiceNumber = this.extractInvoiceNumberSecure(pdfText);
            const invoiceDate = this.extractInvoiceDateSecure(pdfText);
            
            this.importData.invoiceNumber = invoiceNumber || 'UNKNOWN';
            this.importData.invoiceDate = invoiceDate || new Date().toISOString().split('T')[0];
            
            console.log(`📋 Invoice metadata extracted (number and date only, no sensitive data logged)`);
            
            // FIXED: Remove problematic lookahead that's confused by fractions like "1/4"
            const itemPattern = /(\w{7})\s+(\d+)\s+(\d{6})\s+([A-Z\/]{3,8})\s+(\w+)\s+(\d+\/\d+\.?\d*|\d+\/\d+)\s+([A-Z]{2,3})\s+((?:[A-Z&#+\d\/\s]+?))\s+(\d+\.\d{2})\s+(\d+\.\d{2})/g;
            const items = [];
            let match;
            let itemCount = 0;
            
            console.log('🔍 Starting secure item parsing...');
            
            while ((match = itemPattern.exec(itemDataText)) !== null && itemCount < 25) {
                itemCount++;
                const [fullMatch, route, quantity, itemNo, brand, mfgCode, packSize, unit, description, unitPrice, extendedPrice] = match;
                
                // SECURITY: Only log item-specific data, no sensitive info
                console.log(`✅ Item ${itemCount}: ${itemNo} - ${description.trim().substring(0, 30)}... (${unitPrice})`);
                
                const item = this.createBenEKeithItem({
                    vendorSKU: itemNo,
                    name: description.trim(),
                    brand: brand,
                    packSizeString: `${packSize} ${unit}`,
                    quantityString: quantity,
                    priceString: unitPrice
                });
                
                if (item) {
                    items.push(item);
                }
            }
            
            console.log(`📊 Successfully parsed ${items.length} items (secure processing complete)`);
            
            // If primary parsing missed items, try enhanced alternative method
            if (items.length < 10) { // Expect at least 10 items typically
                console.log(`🔄 Running enhanced alternative parsing (found ${items.length}, expecting 12+ items)...`);
                const alternativeItems = this.parseAlternativeBenEKeithSecure(itemDataText);
                
                // Merge results, avoiding duplicates
                const combinedItems = [...items];
                const existingSkus = items.map(item => item.vendorSKU);
                
                for (const altItem of alternativeItems) {
                    if (!existingSkus.includes(altItem.vendorSKU)) {
                        combinedItems.push(altItem);
                        console.log(`✅ Added missing item via alternative parsing: ${altItem.vendorSKU} - ${altItem.name.substring(0, 30)}...`);
                    }
                }
                
                if (combinedItems.length > items.length) {
                    console.log(`✅ Enhanced parsing found ${combinedItems.length} total items (${combinedItems.length - items.length} additional)`);
                    return combinedItems;
                }
            }
            
            // SECURITY: Clear sensitive data from memory
            this.clearSensitiveDataFromMemory();
            
            return items;
            
        } catch (error) {
            console.error('❌ Ben E. Keith PDF parsing failed:', error.message);
            // SECURITY: Don't log the full error which might contain sensitive data
            throw new Error('PDF parsing failed - please check file format');
        }
    }

    /**
     * SECURE: Extract invoice number without logging sensitive content
     */
    extractInvoiceNumberSecure(pdfText) {
        // Look for invoice number patterns without logging the content
        const patterns = [
            /Invoice\s+No\.?\s*(\d{8})/i,
            /(\d{8})/  // 8-digit number pattern
        ];
        
        for (const pattern of patterns) {
            const match = pdfText.match(pattern);
            if (match && match[1]) {
                // Validate it looks like an invoice number (8 digits)
                if (/^\d{8}$/.test(match[1])) {
                    return match[1];
                }
            }
        }
        
        return null;
    }

    /**
     * SECURE: Extract invoice date without logging sensitive content
     */
    extractInvoiceDateSecure(pdfText) {
        // Look for date patterns in a secure way
        const patterns = [
            /(\d{1,2}\/\d{1,2}\/\d{4})/,
            /(\d{4}-\d{2}-\d{2})/
        ];
        
        for (const pattern of patterns) {
            const match = pdfText.match(pattern);
            if (match && match[1]) {
                const dateStr = match[1];
                // Basic validation that it's a reasonable date
                if (dateStr.includes('/') || dateStr.includes('-')) {
                    return dateStr;
                }
            }
        }
        
        return new Date().toISOString().split('T')[0];
    }

    /**
     * SECURE: Alternative parsing method with privacy protection
     */
    parseAlternativeBenEKeithSecure(itemDataText) {
        console.log('🔄 Secure alternative parsing (no sensitive data logged)...');
        
        const items = [];
        
        // Split by line breaks and filter for potential item lines
        const lines = itemDataText.split(/\n|\r\n?/).filter(line => line.trim().length > 10);
        
        for (const line of lines) {
            try {
                // Look for 6-digit item numbers in each line
                const itemNumberMatch = line.match(/\b(\d{6})\b/);
                if (!itemNumberMatch) continue;
                
                const itemNo = itemNumberMatch[1];
                
                // Try to parse this entire line as an item
                const itemData = this.parseItemLineSecure(itemNo, line);
                if (itemData) {
                    const item = this.createBenEKeithItem(itemData);
                    if (item) {
                        items.push(item);
                        // SECURITY: Only log basic item info
                        console.log(`✅ Alternative parsed: ${item.vendorSKU} - ${item.name.substring(0, 25)}...`);
                    }
                }
                
            } catch (error) {
                // Don't log line content for security
                console.warn(`⚠️ Failed to parse item line (error suppressed for security)`);
            }
        }
        
        return items;
    }

    /**
     * SECURE: Parse item line without logging sensitive content
     */
    parseItemLineSecure(itemNo, line) {
        // Enhanced patterns for Ben E. Keith line parsing
        const linePatterns = [
            /(\w{6,7})\s+(\d+)\s+(\d{6})\s+([A-Z\/]{3,8})\s+(\w+)\s+(\d+\/\d+\.?\d*|\d+\/\d+)\s+([A-Z]{2,3})\s+(.+?)\s+(\d+\.\d{2})\s+(\d+\.\d{2})/,
            /(\w{6,7})\s+(\d+)\s+(\d{6})\s+([A-Z\/]{3,8})\s+(\w+)\s+(\d+\/\d+\.?\d*)\s*([A-Z]{2,3})\s+(.+?)\s+(\d+\.\d{2})\s+(\d+\.\d{2})/,
            /(\w{6,7})\s+(\d+)\s+(\d{6})\s+([A-Z\/&]{3,10})\s+(\w+)\s+(.+?)\s+(\d+\.\d{2})\s+(\d+\.\d{2})/
        ];
        
        for (const pattern of linePatterns) {
            const match = line.match(pattern);
            if (match && match.length >= 8) {
                
                if (match.length >= 9) {
                    const [, route, quantity, matchedItemNo, brand, mfgCode, packSize, unit, description, unitPrice] = match;
                    
                    if (matchedItemNo === itemNo) {
                        return {
                            vendorSKU: itemNo,
                            name: description.trim().replace(/\s+/g, ' '),
                            brand: brand,
                            packSizeString: `${packSize} ${unit}`,
                            quantityString: quantity,
                            priceString: unitPrice
                        };
                    }
                } else {
                    const [, route, quantity, matchedItemNo, brand, mfgCode, description, unitPrice] = match;
                    
                    if (matchedItemNo === itemNo) {
                        // Extract pack size from description if possible
                        const packSizeMatch = description.match(/(\d+\/\d+\.?\d*\s*[A-Z]{2,3})/);
                        const packSize = packSizeMatch ? packSizeMatch[1] : '1/1 OZ';
                        const cleanDescription = description.replace(/\d+\/\d+\.?\d*\s*[A-Z]{2,3}/, '').trim();
                        
                        return {
                            vendorSKU: itemNo,
                            name: cleanDescription.replace(/\s+/g, ' '),
                            brand: brand,
                            packSizeString: packSize,
                            quantityString: quantity,
                            priceString: unitPrice
                        };
                    }
                }
            }
        }
        
        return null;
    }

    /**
     * SECURITY: Clear sensitive data from memory
     */
    clearSensitiveDataFromMemory() {
        // Clear any variables that might contain sensitive data
        if (this.tempPdfText) {
            this.tempPdfText = null;
        }
        
        // Clear the import data that might contain sensitive info
        if (this.importData && this.importData.extractedItems) {
            // Keep only the necessary data, clear any potential sensitive content
            this.importData.extractedItems.forEach(item => {
                // These fields are safe to keep as they're inventory-related
                // No customer or financial sensitive data in these fields
            });
        }
        
        // Suggest garbage collection if available (not standard but some browsers support it)
        if (typeof window !== 'undefined' && window.gc && typeof window.gc === 'function') {
            try {
                window.gc();
            } catch (e) {
                // Garbage collection failed or not available, that's fine
            }
        }
    }

    /**
     * Create a standardized Ben E. Keith item from parsed data (SECURE - only stores inventory data)
     */
    createBenEKeithItem(data) {
        // Parse pack size
        const packSizeData = this.parseBenEKeithPackSize(data.packSizeString || '');
        
        // Parse portion size from description
        const portionData = parsePortionSize(data.name || '');
        
        // Parse quantities and prices
        const caseCost = parseFloat(data.priceString?.replace(/[^0-9.-]/g, '')) || 0;
        const quantityShipped = this.parseDecimalQuantity(data.quantityString || '0');
        
        const item = {
            // Basic item info
            name: data.name || '',
            vendorSKU: data.vendorSKU || '',
            brand: data.brand || '',
            manufacturer: data.brand || '',
            category: 'Unknown',
            
            // Pack size info
            unitsPerCase: packSizeData.unitsPerCase || 1,
            sizePerUnit: packSizeData.sizePerUnit || 1,
            unitType: packSizeData.unitType || 'OZ',
            
            // Portion size info
            portionSize: portionData.isValid ? portionData.portionSize : null,
            portionUnit: portionData.isValid ? portionData.portionUnit : null,
            portionParseConfidence: portionData.confidence || 0,
            portionOriginalText: portionData.originalText || null,
            
            // Pricing info
            caseCost: caseCost,
            unitCost: 0, // Will be calculated
            
            // Quantities (support decimals)
            quantityOrdered: quantityShipped,
            quantityShipped: quantityShipped,
            
            // Default values for new items
            par: 0,
            onHand: 0.0,
            location: '',
            area: '',
            wasteEntryUnit: packSizeData.unitType || 'OZ',
            notes: '',
            reorderPoint: null,
            
            // Vendor info
            primaryVendor: 'Ben E. Keith',
            vendorNotes: '',
            
            // System fields
            isActive: true,
            createdBy: 'invoice_import',
            modifiedBy: 'invoice_import',
            timestamp: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            
            // Import metadata
            importSource: 'ben_e_keith_pdf',
            invoiceNumber: this.importData.invoiceNumber,
            invoiceDate: this.importData.invoiceDate
        };
        
        // Calculate unit cost
        if (item.unitsPerCase > 0 && item.sizePerUnit > 0 && item.caseCost > 0) {
            const totalUnitsPerCase = item.unitsPerCase * item.sizePerUnit;
            item.unitCost = item.caseCost / totalUnitsPerCase;
        }
        
        return item;
    }

    /**
     * Parse Ben E. Keith pack size format
     */
    parseBenEKeithPackSize(packSizeString) {
        if (!packSizeString) return { unitsPerCase: 1, sizePerUnit: 1, unitType: 'OZ' };
        
        // Common Ben E. Keith formats: "2/5 LB", "4/1 GAL", "6/3 LB", "24CT"
        const patterns = [
            /(\d+)\/(\d+\.?\d*)\s*([A-Z]+)/i,  // "2/5 LB"
            /(\d+)\s*([A-Z]+)/i,              // "24 CT"
            /(\d+\.?\d*)\s*([A-Z]+)/i         // "5.5 LB"
        ];
        
        for (const pattern of patterns) {
            const match = packSizeString.match(pattern);
            if (match) {
                if (match.length === 4) {
                    // Format: "2/5 LB"
                    return {
                        unitsPerCase: parseInt(match[1]) || 1,
                        sizePerUnit: parseFloat(match[2]) || 1,
                        unitType: match[3].toUpperCase()
                    };
                } else if (match.length === 3) {
                    // Format: "24 CT" or "5.5 LB"
                    return {
                        unitsPerCase: parseInt(match[1]) || 1,
                        sizePerUnit: 1,
                        unitType: match[2].toUpperCase()
                    };
                }
            }
        }
        
        // Default fallback
        return { unitsPerCase: 1, sizePerUnit: 1, unitType: 'OZ' };
    }

    async extractFromCustomerFirstCSV(file) {
        const content = await this.readFileAsText(file);
        const lines = content.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
            throw new Error('CSV file appears to be empty or invalid');
        }
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        const items = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length < headers.length) continue;
            
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            
            // Parse pack size
            const packSizeData = parsePackSize(row['Pack Size'] || '');
            
            // Parse portion size from description
            const portionData = parsePortionSize(row['Product Description'] || '');
            
            const item = {
                // Basic item info
                name: row['Product Description'] || '',
                vendorSKU: row['Product #'] || '',
                brand: row['Brand'] || '',
                manufacturer: row['Manufacturer Name'] || '',
                category: row['Category/Class'] || '',
                
                // Pack size info
                unitsPerCase: packSizeData.unitsPerCase || 0,
                sizePerUnit: packSizeData.sizePerUnit || 0,
                unitType: packSizeData.unitType || 'OZ',
                
                // Portion size info
                portionSize: portionData.isValid ? portionData.portionSize : null,
                portionUnit: portionData.isValid ? portionData.portionUnit : null,
                portionParseConfidence: portionData.confidence || 0,
                portionOriginalText: portionData.originalText || null,
                
                // Pricing info
                caseCost: parseFloat(row['Net Price']?.replace(/[^0-9.-]/g, '')) || 0,
                unitCost: 0, // Will be calculated
                
                // Quantities (support decimals)
                quantityOrdered: this.parseDecimalQuantity(row['Qty Ordered']),
                quantityShipped: this.parseDecimalQuantity(row['Qty Shipped']),
                
                // Default values for new items
                par: 0,
                onHand: 0.0,
                location: '',
                area: '',
                wasteEntryUnit: packSizeData.unitType || 'OZ',
                notes: '',
                reorderPoint: null,
                
                // Vendor info
                primaryVendor: 'CustomerFirst',
                vendorNotes: '',
                
                // System fields
                isActive: true,
                createdBy: 'invoice_import',
                modifiedBy: 'invoice_import',
                timestamp: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                
                // Import metadata
                importSource: 'customerFirst_csv',
                invoiceNumber: this.importData.invoiceNumber,
                invoiceDate: this.importData.invoiceDate
            };
            
            // Calculate unit cost
            if (item.unitsPerCase > 0 && item.sizePerUnit > 0 && item.caseCost > 0) {
                const totalUnitsPerCase = item.unitsPerCase * item.sizePerUnit;
                item.unitCost = item.caseCost / totalUnitsPerCase;
            }
            
            items.push(item);
        }
        
        if (items.length === 0) {
            throw new Error('No valid items found in CSV file');
        }
        
        console.log(`📊 Extracted ${items.length} items from CustomerFirst CSV`);
        return items;
    }

    parseDecimalQuantity(quantityString) {
        if (!quantityString || quantityString === '') return 0;
        
        // Clean the string and parse
        const cleaned = quantityString.toString().replace(/[^0-9.-]/g, '');
        const parsed = parseFloat(cleaned);
        
        if (isNaN(parsed)) return 0;
        
        // Round to 2 decimal places to avoid floating point issues
        return Math.round(parsed * 100) / 100;
    }

    async extractFromGordonPDF(file) {
        // Placeholder for future Gordon Food Service implementation
        console.log('📋 Gordon PDF extraction not yet implemented');
        throw new Error('Gordon Food Service PDF processing is not yet implemented');
    }

    async matchItemsToInventory(extractedItems) {
        const matches = [];
        
        for (const item of extractedItems) {
            const match = this.findBestMatch(item);
            matches.push({
                extractedItem: item,
                matchType: match.type,
                matchedItem: match.item,
                confidence: match.confidence,
                requiresReview: match.confidence < 0.95,
                isNewItem: match.type === 'new'
            });
        }
        
        return matches;
    }

    findBestMatch(extractedItem) {
        let bestMatch = { type: 'new', item: null, confidence: 0 };
        
        for (const inventoryItem of this.existingInventory) {
            // Exact SKU match (highest priority)
            if (extractedItem.vendorSKU && 
                inventoryItem.vendorSKU === extractedItem.vendorSKU &&
                inventoryItem.primaryVendor === extractedItem.primaryVendor) {
                return { type: 'exact_sku', item: inventoryItem, confidence: 0.98 };
            }
            
            // Fuzzy name matching
            const nameMatch = this.calculateStringSimilarity(
                extractedItem.name.toLowerCase(),
                inventoryItem.name.toLowerCase()
            );
            
            if (nameMatch > bestMatch.confidence && nameMatch > 0.7) {
                bestMatch = {
                    type: 'fuzzy_name',
                    item: inventoryItem,
                    confidence: nameMatch
                };
            }
        }
        
        return bestMatch;
    }

    calculateStringSimilarity(str1, str2) {
        // Simple Levenshtein distance-based similarity
        const matrix = [];
        const len1 = str1.length;
        const len2 = str2.length;
        
        for (let i = 0; i <= len1; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= len2; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                if (str1.charAt(i - 1) === str2.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        const maxLen = Math.max(len1, len2);
        return maxLen === 0 ? 1 : (maxLen - matrix[len1][len2]) / maxLen;
    }

    updateImportSummary() {
        const summary = this.importData.summary;
        summary.totalItems = this.importData.extractedItems.length;
        summary.autoMatched = this.importData.matchResults.filter(m => !m.requiresReview && !m.isNewItem).length;
        summary.needsReview = this.importData.matchResults.filter(m => m.requiresReview).length;
        summary.newItems = this.importData.matchResults.filter(m => m.isNewItem).length;
        
        // Count portion sizes parsed
        summary.portionsParsed = this.importData.extractedItems.filter(item => 
            item.portionSize && item.portionSize > 0
        ).length;
    }

    async applyImport() {
        try {
            this.showProcessing('Applying import...');
            
            const itemsToUpdate = [];
            const itemsToCreate = [];
            
            for (const match of this.importData.matchResults) {
                if (match.isNewItem || !match.matchedItem) {
                    // Create new item
                    itemsToCreate.push({
                        ...match.extractedItem,
                        id: crypto.randomUUID(),
                        onHand: match.extractedItem.quantityShipped || 0
                    });
                } else {
                    // Update existing item
                    const updatedItem = {
                        ...match.matchedItem,
                        onHand: (match.matchedItem.onHand || 0) + (match.extractedItem.quantityShipped || 0),
                        caseCost: match.extractedItem.caseCost || match.matchedItem.caseCost,
                        unitCost: match.extractedItem.unitCost || match.matchedItem.unitCost,
                        
                        // Update portion size if detected and not already set
                        portionSize: match.matchedItem.portionSize || match.extractedItem.portionSize,
                        portionUnit: match.matchedItem.portionUnit || match.extractedItem.portionUnit,
                        
                        lastModified: new Date().toISOString(),
                        modifiedBy: 'invoice_import'
                    };
                    itemsToUpdate.push(updatedItem);
                }
            }
            
            // Save all items
            const allItems = [...itemsToUpdate, ...itemsToCreate];
            await StorageController.save(allItems);
            
            // Show success
            this.showSuccess(itemsToCreate.length, itemsToUpdate.length);
            
        } catch (error) {
            console.error('Import failed:', error);
            this.showError('Failed to apply import: ' + error.message);
        }
    }

    showProcessing(message) {
        document.getElementById('app-content').innerHTML = `
            <div class="processing-container">
                <div class="processing-spinner"></div>
                <h3>${message}</h3>
                <p>Please wait...</p>
            </div>
        `;
    }

    showSuccess(created, updated) {
        document.getElementById('app-content').innerHTML = `
            <div class="success-container">
                <div class="success-icon">✅</div>
                <h2>Import Successful!</h2>
                <div class="success-stats">
                    <div class="stat">
                        <span class="stat-number">${created}</span>
                        <span class="stat-label">New Items Created</span>
                    </div>
                    <div class="stat">
                        <span class="stat-number">${updated}</span>
                        <span class="stat-label">Items Updated</span>
                    </div>
                    <div class="stat">
                        <span class="stat-number">${this.importData.summary.portionsParsed}</span>
                        <span class="stat-label">Portion Sizes Detected</span>
                    </div>
                </div>
                <button class="btn-primary" onclick="window.moduleSystem.loadModule('inventory')">
                    View Inventory
                </button>
            </div>
        `;
    }

    showError(message) {
        document.getElementById('app-content').innerHTML = `
            <div class="error-container">
                <div class="error-icon">❌</div>
                <h2>Import Failed</h2>
                <p>${message}</p>
                <div class="error-details">
                    <p><strong>Possible reasons:</strong></p>
                    <ul>
                        <li>PDF file format is not compatible</li>
                        <li>File is corrupted or password protected</li>
                        <li>No recognizable data found in the file</li>
                        <li>Vendor format is not yet supported</li>
                    </ul>
                    <p>Please check your file and try again, or contact support if the problem persists.</p>
                </div>
                <div class="error-actions">
                    <button class="btn-primary" onclick="location.reload()">Try Again</button>
                    <button class="btn-secondary" onclick="window.moduleSystem.loadModule('inventory')">Back to Inventory</button>
                </div>
            </div>
        `;
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(e.target.error);
            reader.readAsText(file);
        });
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }

    // Action handlers
    acceptMatch(itemIndex) {
        const match = this.importData.matchResults[itemIndex];
        match.requiresReview = false;
        this.updateImportSummary();
        this.showReviewInterface();
    }

    createNewItem(itemIndex) {
        const match = this.importData.matchResults[itemIndex];
        match.isNewItem = true;
        match.requiresReview = false;
        this.updateImportSummary();
        this.showReviewInterface();
    }

    skipItem(itemIndex) {
        this.importData.matchResults.splice(itemIndex, 1);
        this.updateImportSummary();
        this.showReviewInterface();
    }

    // ========================================================================
    // ENHANCED FUNCTIONALITY - NEW METHODS
    // ========================================================================

    /**
     * Filter items by view type
     */
    filterItemsByView(viewType) {
        const items = document.querySelectorAll('.enhanced-item');
        items.forEach(item => {
            if (viewType === 'all' || item.dataset.viewType === viewType) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    /**
     * Expand all items in the review interface
     */
    expandAllItems() {
        document.querySelectorAll('.enhanced-item').forEach((item, index) => {
            const panel = item.querySelector('.item-details-panel');
            const btn = item.querySelector('.expand-btn');
            const icon = btn.querySelector('.expand-icon');
            
            panel.style.display = 'block';
            btn.dataset.expanded = 'true';
            icon.textContent = '▲';
        });
    }

    /**
     * Collapse all items in the review interface
     */
    collapseAllItems() {
        document.querySelectorAll('.enhanced-item').forEach((item, index) => {
            const panel = item.querySelector('.item-details-panel');
            const btn = item.querySelector('.expand-btn');
            const icon = btn.querySelector('.expand-icon');
            
            panel.style.display = 'none';
            btn.dataset.expanded = 'false';
            icon.textContent = '▼';
        });
    }

    /**
     * Auto-fill missing data using intelligent defaults and patterns
     */
    autoFillMissingData() {
        this.showProcessing('Auto-filling missing data...');
        
        let fillCount = 0;
        const fillLog = [];
        
        this.importData.matchResults.forEach((match, index) => {
            const item = match.extractedItem;
            let itemFillCount = 0;
            
            // Auto-fill category based on name patterns
            if (!item.category || item.category === 'Unknown') {
                const category = this.detectCategoryFromName(item.name);
                if (category !== 'Unknown') {
                    item.category = category;
                    itemFillCount++;
                    fillLog.push(`${item.name}: Category → ${category}`);
                }
            }
            
            // Auto-fill area based on category
            if (!item.area && item.category && item.category !== 'Unknown') {
                const area = this.getDefaultAreaForCategory(item.category);
                if (area) {
                    item.area = area;
                    itemFillCount++;
                    fillLog.push(`${item.name}: Area → ${area}`);
                }
            }
            
            // Auto-fill default par level based on item type and cost
            if (!item.par || item.par === 0) {
                const suggestedPar = this.calculateSuggestedPar(item);
                if (suggestedPar > 0) {
                    item.par = suggestedPar;
                    itemFillCount++;
                    fillLog.push(`${item.name}: Par Level → ${suggestedPar}`);
                }
            }
            
            // Auto-fill location based on category
            if (!item.location && item.category) {
                const location = this.getDefaultLocationForCategory(item.category);
                if (location) {
                    item.location = location;
                    itemFillCount++;
                    fillLog.push(`${item.name}: Location → ${location}`);
                }
            }
            
            fillCount += itemFillCount;
        });
        
        // Show results
        setTimeout(() => {
            this.showAutoFillResults(fillCount, fillLog);
            this.showReviewInterface(); // Refresh the interface
        }, 1000);
    }

    /**
     * Detect category from item name using patterns
     */
    detectCategoryFromName(name) {
        const categoryPatterns = {
            'Produce': [
                'lettuce', 'tomato', 'onion', 'potato', 'carrot', 'celery', 'pepper',
                'apple', 'banana', 'orange', 'lemon', 'lime', 'berry', 'grape',
                'mushroom', 'spinach', 'cabbage', 'broccoli', 'cauliflower', 'avocado'
            ],
            'Meat': [
                'beef', 'chicken', 'pork', 'turkey', 'lamb', 'veal', 'ground',
                'steak', 'roast', 'chop', 'breast', 'thigh', 'wing', 'bacon',
                'ham', 'sausage', 'brisket', 'ribs'
            ],
            'Seafood': [
                'fish', 'salmon', 'tuna', 'cod', 'halibut', 'shrimp', 'crab',
                'lobster', 'scallop', 'oyster', 'mussel', 'clam', 'tilapia',
                'mahi', 'snapper', 'catfish'
            ],
            'Dairy': [
                'milk', 'cheese', 'butter', 'cream', 'yogurt', 'sour cream',
                'cottage cheese', 'cheddar', 'mozzarella', 'parmesan', 'swiss',
                'blue cheese', 'cream cheese'
            ],
            'Pantry': [
                'flour', 'sugar', 'salt', 'pepper', 'oil', 'vinegar', 'rice',
                'pasta', 'bread', 'cereal', 'beans', 'sauce', 'spice',
                'herb', 'vanilla', 'baking', 'stock', 'broth'
            ],
            'Frozen': [
                'frozen', 'ice cream', 'sorbet', 'frozen vegetable', 'frozen fruit',
                'pizza', 'ice', 'popsicle'
            ],
            'Beverages': [
                'juice', 'soda', 'water', 'coffee', 'tea', 'wine', 'beer',
                'cocktail', 'syrup', 'mixer', 'cola', 'sprite', 'energy drink'
            ],
            'Condiments': [
                'ketchup', 'mustard', 'mayo', 'dressing', 'sauce', 'marinade',
                'seasoning', 'hot sauce', 'bbq', 'ranch', 'italian'
            ]
        };
        
        const nameLower = name.toLowerCase();
        
        for (const [category, patterns] of Object.entries(categoryPatterns)) {
            if (patterns.some(pattern => nameLower.includes(pattern))) {
                return category;
            }
        }
        
        return 'Unknown';
    }

    /**
     * Get default area for category
     */
    getDefaultAreaForCategory(category) {
        const categoryAreas = {
            'Produce': 'Walk-in Cooler',
            'Meat': 'Walk-in Cooler',
            'Seafood': 'Walk-in Cooler',
            'Dairy': 'Walk-in Cooler',
            'Frozen': 'Walk-in Freezer',
            'Pantry': 'Dry Storage',
            'Beverages': 'Dry Storage',
            'Condiments': 'Dry Storage'
        };
        
        return categoryAreas[category] || '';
    }

    /**
     * Get default location for category
     */
    getDefaultLocationForCategory(category) {
        const categoryLocations = {
            'Produce': 'Produce Cooler',
            'Meat': 'Meat Cooler',
            'Seafood': 'Seafood Cooler',
            'Dairy': 'Dairy Cooler',
            'Frozen': 'Freezer',
            'Pantry': 'Dry Storage Shelves',
            'Beverages': 'Beverage Storage',
            'Condiments': 'Condiment Storage'
        };
        
        return categoryLocations[category] || '';
    }

    /**
     * Calculate suggested par level
     */
    calculateSuggestedPar(item) {
        // Basic par calculation based on cost and category
        const costBasedPar = item.caseCost < 20 ? 3 : item.caseCost < 50 ? 2 : 1;
        
        const categoryMultipliers = {
            'Produce': 1.5,    // Higher turnover
            'Meat': 1.2,       // Moderate turnover
            'Seafood': 1.0,    // Lower turnover, higher cost
            'Dairy': 1.3,      // Moderate-high turnover
            'Frozen': 1.0,     // Lower turnover
            'Pantry': 2.0,     // High turnover, stable
            'Beverages': 1.5,  // High turnover
            'Condiments': 1.0  // Low turnover
        };
        
        const multiplier = categoryMultipliers[item.category] || 1.0;
        return Math.max(1, Math.round(costBasedPar * multiplier));
    }

    /**
     * Show auto-fill results
     */
    showAutoFillResults(fillCount, fillLog) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🪄 Auto-Fill Complete</h3>
                    <button class="btn-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="auto-fill-summary">
                        <div class="fill-stat">
                            <span class="fill-number">${fillCount}</span>
                            <span class="fill-label">Fields Filled</span>
                        </div>
                    </div>
                    
                    ${fillLog.length > 0 ? `
                        <div class="fill-log">
                            <h4>Changes Made:</h4>
                            <div class="fill-log-items">
                                ${fillLog.slice(0, 10).map(entry => `<div class="log-item">${entry}</div>`).join('')}
                                ${fillLog.length > 10 ? `<div class="log-item more">... and ${fillLog.length - 10} more</div>` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">Continue</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    /**
     * Validate all items and show results
     */
    validateAllItems() {
        const validationResults = [];
        
        this.importData.matchResults.forEach((match, index) => {
            const item = match.extractedItem;
            const errors = [];
            const warnings = [];
            
            // Required field validation
            if (!item.name || item.name.trim() === '') {
                errors.push('Item name is required');
            }
            if (!item.unitsPerCase || item.unitsPerCase <= 0) {
                errors.push('Units per case must be greater than 0');
            }
            if (!item.sizePerUnit || item.sizePerUnit <= 0) {
                errors.push('Size per unit must be greater than 0');
            }
            if (!item.unitType || item.unitType === '') {
                errors.push('Unit type is required');
            }
            if (!item.caseCost || item.caseCost < 0) {
                errors.push('Case cost must be 0 or greater');
            }
            if (!item.quantityShipped || item.quantityShipped < 0) {
                errors.push('Quantity shipped must be 0 or greater');
            }
            
            // Warning validations
            if (!item.brand || item.brand === '') {
                warnings.push('Brand is not specified');
            }
            if (!item.category || item.category === 'Unknown') {
                warnings.push('Category not specified');
            }
            if (!item.location || item.location === '') {
                warnings.push('Storage location not specified');
            }
            if (item.portionSize && item.portionParseConfidence < 0.8) {
                warnings.push('Portion size detection has low confidence');
            }
            
            validationResults.push({
                index,
                item: item.name,
                errors,
                warnings,
                isValid: errors.length === 0
            });
        });
        
        this.showValidationResults(validationResults);
    }

    /**
     * Show validation results
     */
    showValidationResults(results) {
        const errorCount = results.filter(r => r.errors.length > 0).length;
        const warningCount = results.filter(r => r.warnings.length > 0).length;
        
        let html = `
            <div class="validation-summary">
                <h4>Validation Results</h4>
                <div class="validation-stats">
                    <span class="stat ${errorCount === 0 ? 'success' : 'error'}">
                        ${errorCount} Errors
                    </span>
                    <span class="stat warning">
                        ${warningCount} Warnings
                    </span>
                    <span class="stat info">
                        ${results.filter(r => r.isValid && r.warnings.length === 0).length} Clean Items
                    </span>
                </div>
            </div>
        `;
        
        if (errorCount > 0 || warningCount > 0) {
            html += '<div class="validation-details">';
            
            results.forEach(result => {
                if (result.errors.length > 0 || result.warnings.length > 0) {
                    html += `
                        <div class="validation-item ${result.errors.length > 0 ? 'has-errors' : 'has-warnings'}">
                            <div class="validation-item-header">
                                <span class="item-name">${result.item}</span>
                                <button class="btn-link" onclick="scrollToItem(${result.index})">View Item</button>
                            </div>
                    `;
                    
                    if (result.errors.length > 0) {
                        html += '<ul class="error-list">';
                        result.errors.forEach(error => {
                            html += `<li class="error">❌ ${error}</li>`;
                        });
                        html += '</ul>';
                    }
                    
                    if (result.warnings.length > 0) {
                        html += '<ul class="warning-list">';
                        result.warnings.forEach(warning => {
                            html += `<li class="warning">⚠️ ${warning}</li>`;
                        });
                        html += '</ul>';
                    }
                    
                    html += '</div>';
                }
            });
            
            html += '</div>';
        } else {
            html += '<div class="validation-success">✅ All items passed validation!</div>';
        }
        
        const validationContainer = document.getElementById('validation-results');
        validationContainer.innerHTML = html;
        validationContainer.style.display = 'block';
        validationContainer.scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * Save current state as draft
     */
    saveDraft() {
        try {
            const draftData = {
                vendor: this.importData.vendor,
                fileName: this.importData.fileName,
                invoiceNumber: this.importData.invoiceNumber,
                invoiceDate: this.importData.invoiceDate,
                matchResults: this.importData.matchResults,
                timestamp: new Date().toISOString(),
                id: crypto.randomUUID()
            };
            
            // Save to localStorage (in real app, this would go to a proper database)
            const drafts = JSON.parse(localStorage.getItem('importDrafts') || '[]');
            drafts.unshift(draftData);
            
            // Keep only last 10 drafts
            if (drafts.length > 10) {
                drafts.splice(10);
            }
            
            localStorage.setItem('importDrafts', JSON.stringify(drafts));
            
            this.showNotification('Draft saved successfully!', 'success');
            
        } catch (error) {
            console.error('Failed to save draft:', error);
            this.showNotification('Failed to save draft', 'error');
        }
    }

    /**
     * Update item field value
     */
    updateItemField(index, field, value) {
        const item = this.importData.matchResults[index].extractedItem;
        
        // Handle different data types
        if (['unitsPerCase', 'sizePerUnit', 'portionSize', 'caseCost', 'unitCost', 'quantityOrdered', 'quantityShipped', 'onHand', 'par'].includes(field)) {
            item[field] = parseFloat(value) || 0;
        } else if (field === 'isActive') {
            item[field] = value === 'true';
        } else {
            item[field] = value;
        }
        
        // Update header display
        this.updateItemHeaderDisplay(index);
    }

    /**
     * Recalculate unit cost when related fields change
     */
    recalculateUnitCost(index) {
        const item = this.importData.matchResults[index].extractedItem;
        
        if (item.unitsPerCase > 0 && item.sizePerUnit > 0 && item.caseCost > 0) {
            const totalUnitsPerCase = item.unitsPerCase * item.sizePerUnit;
            item.unitCost = item.caseCost / totalUnitsPerCase;
            
            // Update the unit cost display
            const unitCostInput = document.querySelector(`[data-field="unitCost"][data-index="${index}"]`);
            if (unitCostInput) {
                unitCostInput.value = item.unitCost.toFixed(4);
            }
        }
    }

    /**
     * Update item header display when data changes
     */
    updateItemHeaderDisplay(index) {
        const item = this.importData.matchResults[index].extractedItem;
        const itemElement = document.querySelector(`[data-item-index="${index}"]`);
        
        if (itemElement) {
            // Update name
            const nameElement = itemElement.querySelector('.item-name');
            if (nameElement) {
                nameElement.textContent = item.name;
            }
            
            // Update quick info
            const quickInfoElement = itemElement.querySelector('.item-quick-info');
            if (quickInfoElement) {
                quickInfoElement.innerHTML = `
                    <span class="quick-info-item">SKU: ${item.vendorSKU}</span>
                    <span class="quick-info-item">Qty: ${item.quantityShipped}</span>
                    <span class="quick-info-item">Cost: $${item.caseCost.toFixed(2)}</span>
                    ${item.portionSize ? `<span class="quick-info-item portion">📏 ${this.formatPortionSize(item.portionSize, item.portionUnit)}</span>` : ''}
                `;
            }
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
                <span class="notification-message">${message}</span>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        // Add to page
        let container = document.querySelector('.notification-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
        
        container.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    /**
     * Setup global functions for item management
     */
    setupGlobalItemFunctions() {
        // Item expansion toggle
        window.toggleItemExpansion = (index) => {
            const item = document.querySelector(`[data-item-index="${index}"]`);
            const panel = item.querySelector('.item-details-panel');
            const btn = item.querySelector('.expand-btn');
            const icon = btn.querySelector('.expand-icon');
            
            if (panel.style.display === 'none') {
                panel.style.display = 'block';
                btn.dataset.expanded = 'true';
                icon.textContent = '▲';
                item.classList.add('expanded');
            } else {
                panel.style.display = 'none';
                btn.dataset.expanded = 'false';
                icon.textContent = '▼';
                item.classList.remove('expanded');
            }
        };
        
        // Reset item data
        window.resetItemData = (index) => {
            if (confirm('Reset this item to its original imported values?')) {
                // Implementation would restore original data
                this.showNotification('Item data reset to original values', 'info');
                this.showReviewInterface(); // Refresh display
            }
        };
        
        // Duplicate item
        window.duplicateItem = (index) => {
            const originalMatch = this.importData.matchResults[index];
            const duplicatedItem = JSON.parse(JSON.stringify(originalMatch.extractedItem));
            
            // Modify duplicated item
            duplicatedItem.name += ' (Copy)';
            duplicatedItem.vendorSKU += '_COPY';
            
            // Add to import data
            const newMatch = {
                extractedItem: duplicatedItem,
                matchType: 'new',
                matchedItem: null,
                confidence: 0,
                requiresReview: false,
                isNewItem: true
            };
            
            this.importData.matchResults.push(newMatch);
            this.updateImportSummary();
            this.showReviewInterface();
            this.showNotification('Item duplicated successfully', 'success');
        };
        
        // Remove item
        window.removeItem = (index) => {
            if (confirm('Remove this item from the import? This cannot be undone.')) {
                this.importData.matchResults.splice(index, 1);
                this.updateImportSummary();
                this.showReviewInterface();
                this.showNotification('Item removed from import', 'info');
            }
        };
        
        // Unmatch item
        window.unmatchItem = (index) => {
            if (confirm('Create this as a new item instead of updating the existing match?')) {
                this.importData.matchResults[index].isNewItem = true;
                this.importData.matchResults[index].requiresReview = false;
                this.importData.matchResults[index].matchedItem = null;
                this.updateImportSummary();
                this.showReviewInterface();
                this.showNotification('Item will be created as new', 'info');
            }
        };
        
        // Search matches
        window.searchMatches = (index) => {
            this.showNotification('Search matches feature coming soon', 'info');
        };

        // Scroll to item
        window.scrollToItem = (index) => {
            const item = document.querySelector(`[data-item-index="${index}"]`);
            if (item) {
                item.scrollIntoView({ behavior: 'smooth', block: 'center' });
                item.classList.add('highlight');
                setTimeout(() => item.classList.remove('highlight'), 2000);
            }
        };
    }

    /**
     * Add enhanced styles dynamically
     */
    addEnhancedStyles() {
        if (document.querySelector('#enhanced-import-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'enhanced-import-styles';
        style.textContent = `
            /* Enhanced Import Review Styles */
            .import-review-container.enhanced {
                max-width: 1400px;
                margin: 0 auto;
                padding: 2rem;
            }

            .review-subtitle {
                color: #666;
                font-size: 1rem;
                margin-bottom: 1.5rem;
                text-align: center;
            }

            .review-controls {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 2rem;
                padding: 1rem;
                background: #f8f9fa;
                border-radius: 8px;
                flex-wrap: wrap;
                gap: 1rem;
            }

            .view-toggles {
                display: flex;
                gap: 0.5rem;
            }

            .btn-toggle {
                padding: 0.5rem 1rem;
                border: 2px solid #ddd;
                background: white;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.9rem;
                font-weight: 500;
                transition: all 0.2s ease;
            }

            .btn-toggle:hover {
                border-color: #2196f3;
                background: #f0f8ff;
            }

            .btn-toggle.active {
                background: #2196f3;
                color: white;
                border-color: #2196f3;
            }

            .bulk-actions {
                display: flex;
                gap: 0.5rem;
                flex-wrap: wrap;
            }

            .review-content.enhanced {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }

            .enhanced-item {
                background: white;
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                border: 2px solid transparent;
                transition: all 0.3s ease;
                animation: slideIn 0.3s ease-out;
            }

            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .enhanced-item:hover {
                box-shadow: 0 4px 16px rgba(0,0,0,0.15);
            }

            .enhanced-item.highlight {
                border-color: #ff9800;
                animation: pulse 2s ease-in-out;
            }

            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.02); }
            }

            .enhanced-item.matched {
                border-left: 4px solid #4caf50;
            }

            .enhanced-item.needs-review {
                border-left: 4px solid #ff9800;
            }

            .enhanced-item.new-item {
                border-left: 4px solid #2196f3;
            }

            .item-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1.5rem;
                cursor: pointer;
                border-bottom: 1px solid #eee;
                transition: background 0.2s ease;
            }

            .item-header:hover {
                background: #f8f9fa;
            }

            .item-header-info {
                flex: 1;
            }

            .item-name {
                margin: 0 0 0.5rem 0;
                font-size: 1.2rem;
                font-weight: 600;
                color: #333;
            }

            .item-quick-info {
                display: flex;
                gap: 1rem;
                flex-wrap: wrap;
            }

            .quick-info-item {
                font-size: 0.9rem;
                color: #666;
                background: #f5f5f5;
                padding: 0.25rem 0.5rem;
                border-radius: 4px;
            }

            .quick-info-item.portion {
                background: #e1bee7;
                color: #7b1fa2;
                font-weight: 500;
            }

            .item-header-actions {
                display: flex;
                align-items: center;
                gap: 1rem;
            }

            .btn-icon {
                background: none;
                border: none;
                padding: 0.5rem;
                border-radius: 4px;
                cursor: pointer;
                transition: background 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .btn-icon:hover {
                background: #f0f0f0;
            }

            .expand-icon {
                font-size: 1.2rem;
                transition: transform 0.2s ease;
            }

            .item-details-panel {
                padding: 0 1.5rem 1.5rem 1.5rem;
                background: #fafafa;
                border-top: 1px solid #eee;
            }

            .item-edit-form {
                background: white;
                border-radius: 8px;
                padding: 1.5rem;
                margin-top: 1rem;
            }

            .match-info {
                background: #e8f5e8;
                padding: 1rem;
                border-radius: 6px;
                margin-bottom: 1.5rem;
                border-left: 4px solid #4caf50;
            }

            .match-info h5 {
                margin: 0 0 0.5rem 0;
                color: #2e7d32;
            }

            .matched-item-name {
                font-weight: 600;
                color: #333;
                margin: 0 0 0.25rem 0;
            }

            .match-confidence {
                font-size: 0.9rem;
                color: #666;
                margin: 0;
            }

            .match-actions {
                margin-top: 1rem;
                display: flex;
                gap: 0.5rem;
            }

            .form-sections {
                display: flex;
                flex-direction: column;
                gap: 2rem;
            }

            .form-section {
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                padding: 1.5rem;
                background: #fafafa;
            }

            .section-title {
                margin: 0 0 1rem 0;
                font-size: 1.1rem;
                font-weight: 600;
                color: #333;
                padding-bottom: 0.5rem;
                border-bottom: 2px solid #e0e0e0;
            }

            .form-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1rem;
            }

            .form-group {
                display: flex;
                flex-direction: column;
            }

            .form-group.full-width {
                grid-column: 1 / -1;
            }

            .form-group label {
                font-weight: 500;
                color: #333;
                margin-bottom: 0.5rem;
                font-size: 0.9rem;
            }

            .form-control {
                padding: 0.75rem;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 0.9rem;
                transition: border-color 0.2s ease;
                background: white;
            }

            .form-control:focus {
                outline: none;
                border-color: #2196f3;
                box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
            }

            .form-control:required:invalid {
                border-color: #f44336;
            }

            .form-control.calculated {
                background: #f5f5f5;
                color: #666;
            }

            .input-group {
                position: relative;
                display: flex;
                align-items: center;
            }

            .input-prefix {
                position: absolute;
                left: 12px;
                color: #666;
                z-index: 1;
                font-weight: 500;
            }

            .input-group .form-control {
                padding-left: 2rem;
            }

            .item-actions {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 1.5rem;
                padding-top: 1rem;
                border-top: 1px solid #e0e0e0;
                flex-wrap: wrap;
                gap: 1rem;
            }

            .action-group {
                display: flex;
                gap: 0.5rem;
                flex-wrap: wrap;
            }

            .btn-sm {
                padding: 0.4rem 0.8rem;
                font-size: 0.8rem;
                border-radius: 4px;
                border: none;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.2s ease;
            }

            .btn-danger {
                background: #f44336;
                color: white;
            }

            .btn-danger:hover {
                background: #d32f2f;
            }

            .btn-warning {
                background: #ff9800;
                color: white;
            }

            .btn-warning:hover {
                background: #f57c00;
            }

            .btn-info {
                background: #2196f3;
                color: white;
            }

            .btn-info:hover {
                background: #1976d2;
            }

            .review-actions.enhanced {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 2rem;
                background: #f8f9fa;
                border-radius: 8px;
                margin-top: 2rem;
                border: 2px solid #e0e0e0;
                flex-wrap: wrap;
                gap: 1rem;
            }

            .import-validation {
                margin-top: 2rem;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                overflow: hidden;
            }

            .validation-summary {
                padding: 1.5rem;
                background: #f8f9fa;
                border-bottom: 1px solid #e0e0e0;
            }

            .validation-summary h4 {
                margin: 0 0 1rem 0;
                color: #333;
            }

            .validation-stats {
                display: flex;
                gap: 1rem;
                flex-wrap: wrap;
            }

            .validation-stats .stat {
                padding: 0.5rem 1rem;
                border-radius: 20px;
                font-size: 0.9rem;
                font-weight: 600;
            }

            .validation-stats .stat.success {
                background: #e8f5e8;
                color: #2e7d32;
            }

            .validation-stats .stat.error {
                background: #ffebee;
                color: #c62828;
            }

            .validation-stats .stat.warning {
                background: #fff3e0;
                color: #ef6c00;
            }

            .validation-stats .stat.info {
                background: #e3f2fd;
                color: #1565c0;
            }

            .validation-details {
                max-height: 400px;
                overflow-y: auto;
                padding: 1rem;
            }

            .validation-item {
                padding: 1rem;
                border-radius: 6px;
                margin-bottom: 1rem;
                border: 1px solid #e0e0e0;
            }

            .validation-item.has-errors {
                background: #ffebee;
                border-color: #f44336;
            }

            .validation-item.has-warnings {
                background: #fff3e0;
                border-color: #ff9800;
            }

            .validation-item-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.5rem;
            }

            .item-name {
                font-weight: 600;
                color: #333;
            }

            .btn-link {
                background: none;
                border: none;
                color: #2196f3;
                cursor: pointer;
                text-decoration: underline;
                font-size: 0.9rem;
            }

            .btn-link:hover {
                color: #1976d2;
            }

            .error-list,
            .warning-list {
                margin: 0.5rem 0 0 0;
                padding: 0;
                list-style: none;
            }

            .error-list li.error {
                color: #c62828;
                margin-bottom: 0.25rem;
            }

            .warning-list li.warning {
                color: #ef6c00;
                margin-bottom: 0.25rem;
            }

            .validation-success {
                padding: 2rem;
                text-align: center;
                color: #2e7d32;
                font-size: 1.1rem;
                font-weight: 600;
            }

            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 2000;
            }

            .modal-content {
                background: white;
                border-radius: 12px;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                width: 90%;
            }

            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1.5rem;
                border-bottom: 1px solid #eee;
            }

            .modal-body {
                padding: 1.5rem;
            }

            .modal-footer {
                display: flex;
                justify-content: flex-end;
                gap: 1rem;
                padding: 1.5rem;
                border-top: 1px solid #eee;
            }

            .auto-fill-summary {
                text-align: center;
                margin-bottom: 2rem;
            }

            .fill-stat {
                display: inline-block;
                background: #e8f5e8;
                padding: 1rem 2rem;
                border-radius: 8px;
                border-left: 4px solid #4caf50;
            }

            .fill-number {
                display: block;
                font-size: 2rem;
                font-weight: 700;
                color: #4caf50;
            }

            .fill-label {
                display: block;
                font-size: 0.9rem;
                color: #666;
                margin-top: 0.25rem;
            }

            .fill-log-items {
                max-height: 200px;
                overflow-y: auto;
                background: #f8f9fa;
                border-radius: 6px;
                padding: 1rem;
            }

            .log-item {
                padding: 0.5rem 0;
                border-bottom: 1px solid #e0e0e0;
                font-size: 0.9rem;
            }

            .log-item:last-child {
                border-bottom: none;
            }

            .log-item.more {
                font-style: italic;
                color: #666;
            }

            .notification-container {
                position: fixed;
                top: 2rem;
                right: 2rem;
                z-index: 3000;
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }

            .notification {
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
                padding: 1rem;
                display: flex;
                align-items: center;
                justify-content: space-between;
                min-width: 300px;
                animation: slideInRight 0.3s ease-out;
            }

            .notification.success {
                border-left: 4px solid #4caf50;
            }

            .notification.error {
                border-left: 4px solid #f44336;
            }

            .notification.info {
                border-left: 4px solid #2196f3;
            }

            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }

            .notification-content {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .notification-close {
                background: none;
                border: none;
                font-size: 1.2rem;
                cursor: pointer;
                color: #666;
                padding: 0.25rem;
            }

            .btn-close {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: #666;
                padding: 0.5rem;
                border-radius: 4px;
            }

            .btn-close:hover {
                background: #f0f0f0;
            }

            /* Responsive Design for Enhanced Interface */
            @media (max-width: 768px) {
                .import-review-container.enhanced {
                    padding: 1rem;
                }
                
                .review-controls {
                    flex-direction: column;
                    align-items: stretch;
                }
                
                .view-toggles,
                .bulk-actions {
                    justify-content: center;
                }
                
                .form-grid {
                    grid-template-columns: 1fr;
                }
                
                .item-header {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 1rem;
                }
                
                .item-header-actions {
                    align-self: stretch;
                    justify-content: space-between;
                }
                
                .item-quick-info {
                    flex-direction: column;
                    gap: 0.5rem;
                }
                
                .item-actions {
                    flex-direction: column;
                    align-items: stretch;
                }
                
                .action-group {
                    justify-content: center;
                }
                
                .review-actions.enhanced {
                    flex-direction: column;
                    align-items: stretch;
                }
                
                .validation-stats {
                    justify-content: center;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + S: Save draft
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveDraft();
            }
            
            // Ctrl/Cmd + Enter: Apply import
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.applyImport();
            }
            
            // Ctrl/Cmd + E: Expand all
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                this.expandAllItems();
            }
            
            // Ctrl/Cmd + R: Collapse all
            if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
                e.preventDefault();
                this.collapseAllItems();
            }
        });
    }

    // Helper methods
    getCategoryOptions(selected) {
        const categories = [
            'Unknown', 'Produce', 'Meat', 'Dairy', 'Pantry', 'Frozen', 
            'Beverages', 'Bakery', 'Seafood', 'Poultry', 'Condiments', 
            'Spices', 'Cleaning', 'Paper Products', 'Other'
        ];
        
        return categories.map(cat => 
            `<option value="${cat}" ${cat === selected ? 'selected' : ''}>${cat}</option>`
        ).join('');
    }

    getUnitTypeOptions(selected) {
        const units = [
            'OZ', 'LB', 'G', 'KG', 'ML', 'L', 'GAL', 'QT', 'PT', 'CUP', 
            'TBSP', 'TSP', 'CT', 'EA', 'PKG', 'BOX', 'BAG', 'CAN', 'BTL'
        ];
        
        return units.map(unit => 
            `<option value="${unit}" ${unit === selected ? 'selected' : ''}>${unit}</option>`
        ).join('');
    }

    getAreaOptions(selected) {
        const areas = [
            '', 'Kitchen', 'Walk-in Cooler', 'Walk-in Freezer', 'Dry Storage', 
            'Bar', 'Prep Area', 'Bakery', 'Receiving', 'Office'
        ];
        
        return areas.map(area => 
            `<option value="${area}" ${area === selected ? 'selected' : ''}>${area || 'Not Specified'}</option>`
        ).join('');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatPortionSize(size, unit) {
        if (!size || !unit) return '';
        return `${size} ${unit}`;
    }
}

// Export for module system
export default {
    initialize: function() {
        new InvoiceImportController();
    }
};

console.log('📊 Enhanced Invoice Import Module loaded with comprehensive review system');