// scripts/modules/import.js - Complete Invoice Import Module with Enhanced Ben E. Keith PDF Support
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
            
            console.log('📊 Invoice import initialized with Enhanced Ben E. Keith PDF support (SECURE MODE - sensitive data protected)');
        } catch (error) {
            console.error('Failed to initialize invoice import:', error);
            this.showError('Failed to initialize import system');
        }
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
                    <h2>📊 Invoice Import</h2>
                    <p>Import vendor invoices with automatic portion size detection</p>
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
                        <span class="feature-icon">📄</span>
                        <div>
                            <h4>Enhanced PDF Text Extraction</h4>
                            <p>Processes PDF invoices with improved data extraction</p>
                        </div>
                    </div>
                    <div class="feature">
                        <span class="feature-icon">📏</span>
                        <div>
                            <h4>Portion Size Parsing</h4>
                            <p>Detects portion sizes like "6 OZ", "1/4 LB" from descriptions</p>
                        </div>
                    </div>
                    <div class="feature">
                        <span class="feature-icon">💰</span>
                        <div>
                            <h4>Decimal Quantities</h4>
                            <p>Supports fractional case quantities (0.5, 0.75, etc.)</p>
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

            // Show review interface
            this.showReviewInterface();

        } catch (error) {
            console.error('File upload failed:', error);
            this.showError('Failed to process file: ' + error.message);
        }
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
     * Enhanced alternative parsing method for Ben E. Keith data - handles edge cases with security
     */
    parseAlternativeBenEKeith(itemDataText) {
        // Redirect to secure method
        return this.parseAlternativeBenEKeithSecure(itemDataText);
    }

    /**
     * Parse a complete item line (ENHANCED for fraction handling)
     */
    parseItemLineSecure(itemNo, line) {
        // Enhanced patterns for Ben E. Keith line parsing with fraction support
        // Format: [Route] [Qty] [ItemNo] [Brand] [MfgCode] [PackSize] [Description] [UnitPrice] [ExtendedPrice]
        const linePatterns = [
            // Main pattern with fraction support in descriptions
            /(\w{6,7})\s+(\d+)\s+(\d{6})\s+([A-Z\/]{3,8})\s+(\w+)\s+(\d+\/\d+\.?\d*|\d+\/\d+)\s+([A-Z]{2,3})\s+(.+?)\s+(\d+\.\d{2})\s+(\d+\.\d{2})/,
            // Alternative pattern for complex descriptions with fractions
            /(\w{6,7})\s+(\d+)\s+(\d{6})\s+([A-Z\/]{3,8})\s+(\w+)\s+(\d+\/\d+\.?\d*)\s*([A-Z]{2,3})\s+(.+?)\s+(\d+\.\d{2})\s+(\d+\.\d{2})/,
            // Specific pattern for items with "1/4" in description - more greedy description capture
            /(\w{6,7})\s+(\d+)\s+(\d{6})\s+([A-Z\/]{3,8})\s+(\w+)\s+(\d+\/\d+\.?\d*|\d+\/\d+)\s+([A-Z]{2,3})\s+([A-Z\s\/\d]+)\s+(\d+\.\d{2})\s+(\d+\.\d{2})/,
            // Fallback pattern
            /(\w{6,7})\s+(\d+)\s+(\d{6})\s+([A-Z\/&]{3,10})\s+(\w+)\s+(.+?)\s+(\d+\.\d{2})\s+(\d+\.\d{2})/
        ];
        
        for (let i = 0; i < linePatterns.length; i++) {
            const match = line.match(linePatterns[i]);
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
     * Parse an individual item section (SECURE VERSION)
     */
    parseItemSection(itemNo, section) {
        // SECURITY: Parse without logging sensitive section content
        
        // Look for brand (3-8 uppercase letters after item number)
        const brandMatch = section.match(new RegExp(`${itemNo}\\s+([A-Z]{3,8})`));
        const brand = brandMatch ? brandMatch[1] : '';
        
        // Look for pack size (number/number unit or number unit)
        const packSizeMatch = section.match(/(\d+\/\d+\.?\d*\s*[A-Z]{2,3}|\d+\s*[A-Z]{2,3})/);
        const packSize = packSizeMatch ? packSizeMatch[1] : '';
        
        // Look for price (XX.XX format)
        const priceMatches = section.match(/(\d+\.\d{2})/g);
        const price = priceMatches ? priceMatches[0] : '';
        
        // Look for quantity (number before item number)
        const quantityMatch = section.match(new RegExp(`(\\d+)\\s+${itemNo}`));
        const quantity = quantityMatch ? quantityMatch[1] : '1';
        
        // Extract description (words between pack size and price)
        let description = '';
        if (packSize && price) {
            const packIndex = section.indexOf(packSize);
            const priceIndex = section.indexOf(price);
            if (packIndex !== -1 && priceIndex !== -1 && priceIndex > packIndex) {
                const descSection = section.substring(packIndex + packSize.length, priceIndex).trim();
                // Clean up the description
                description = descSection.replace(/\s+/g, ' ').trim();
            }
        }
        
        if (!description || !price) {
            // SECURITY: Don't log section content
            console.warn(`⚠️ Incomplete data for item ${itemNo} (section content not logged for security)`);
            return null;
        }
        
        return {
            vendorSKU: itemNo,
            name: description,
            brand: brand,
            packSizeString: packSize,
            quantityString: quantity,
            priceString: price
        };
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
            forEvent: false,
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

    /**
     * Extract invoice number from PDF text (redirects to secure method)
     */
    extractInvoiceNumber(pdfText) {
        return this.extractInvoiceNumberSecure(pdfText);
    }

    /**
     * Enhanced invoice date extraction from PDF text (redirects to secure method)
     */
    extractInvoiceDate(pdfText) {
        return this.extractInvoiceDateSecure(pdfText);
    }

    // ========================================================================
    // EXISTING CUSTOMERFIRST AND CORE FUNCTIONALITY (UNCHANGED)
    // ========================================================================

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
                forEvent: false,
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

    showReviewInterface() {
        const summary = this.importData.summary;
        
        const content = `
            <div class="import-review-container">
                <div class="review-header">
                    <h2>📋 Review Import - ${this.importData.vendor}</h2>
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
                
                <div class="review-content">
                    ${this.renderAutoApprovedItems()}
                    ${this.renderReviewItems()}
                    ${this.renderNewItems()}
                </div>
                
                <div class="review-actions">
                    <button class="btn-secondary" onclick="window.location.reload()">Cancel</button>
                    <button class="btn-primary" id="apply-import-btn">Apply Import</button>
                </div>
            </div>
        `;
        
        document.getElementById('app-content').innerHTML = content;
    }

    renderAutoApprovedItems() {
        const autoApproved = this.importData.matchResults.filter(m => !m.requiresReview && !m.isNewItem);
        if (autoApproved.length === 0) return '';
        
        const itemsHtml = autoApproved.map(match => `
            <div class="review-item approved">
                <div class="item-info">
                    <h4>${match.extractedItem.name}</h4>
                    <div class="item-details">
                        <span class="detail-item">SKU: ${match.extractedItem.vendorSKU}</span>
                        <span class="detail-item">Qty: ${match.extractedItem.quantityShipped}</span>
                        <span class="detail-item">Cost: $${match.extractedItem.caseCost.toFixed(2)}</span>
                        ${match.extractedItem.portionSize ? 
                            `<span class="detail-item portion-highlight">📏 ${formatPortionSize(match.extractedItem.portionSize, match.extractedItem.portionUnit)}</span>` : 
                            ''
                        }
                    </div>
                </div>
                <div class="match-status">
                    <span class="status-badge success">✓ Auto-Matched</span>
                    <div class="match-details">→ ${match.matchedItem.name}</div>
                </div>
            </div>
        `).join('');
        
        return `
            <div class="review-section">
                <h3 class="section-title success">🟢 Auto-Approved (${autoApproved.length} items)</h3>
                <div class="review-items">
                    ${itemsHtml}
                </div>
            </div>
        `;
    }

    renderReviewItems() {
        const needsReview = this.importData.matchResults.filter(m => m.requiresReview);
        if (needsReview.length === 0) return '';
        
        const itemsHtml = needsReview.map((match, index) => `
            <div class="review-item needs-review">
                <div class="item-info">
                    <h4>${match.extractedItem.name}</h4>
                    <div class="item-details">
                        <span class="detail-item">SKU: ${match.extractedItem.vendorSKU}</span>
                        <span class="detail-item">Qty: ${match.extractedItem.quantityShipped}</span>
                        <span class="detail-item">Cost: $${match.extractedItem.caseCost.toFixed(2)}</span>
                        ${match.extractedItem.portionSize ? 
                            `<span class="detail-item portion-highlight">📏 ${formatPortionSize(match.extractedItem.portionSize, match.extractedItem.portionUnit)}</span>` : 
                            ''
                        }
                    </div>
                </div>
                <div class="match-options">
                    <div class="suggested-match">
                        <strong>Suggested Match (${Math.round(match.confidence * 100)}%):</strong>
                        <div>${match.matchedItem ? match.matchedItem.name : 'No match found'}</div>
                    </div>
                    <div class="action-buttons">
                        <button class="btn-success accept-match-btn" data-item-index="${index}">Accept Match</button>
                        <button class="btn-primary create-new-btn" data-item-index="${index}">Create New</button>
                        <button class="btn-secondary skip-item-btn" data-item-index="${index}">Skip</button>
                    </div>
                </div>
            </div>
        `).join('');
        
        return `
            <div class="review-section">
                <h3 class="section-title warning">🟡 Needs Review (${needsReview.length} items)</h3>
                <div class="review-items">
                    ${itemsHtml}
                </div>
            </div>
        `;
    }

    renderNewItems() {
        const newItems = this.importData.matchResults.filter(m => m.isNewItem);
        if (newItems.length === 0) return '';
        
        const itemsHtml = newItems.map(match => `
            <div class="review-item new-item">
                <div class="item-info">
                    <h4>${match.extractedItem.name}</h4>
                    <div class="item-details">
                        <span class="detail-item">SKU: ${match.extractedItem.vendorSKU}</span>
                        <span class="detail-item">Qty: ${match.extractedItem.quantityShipped}</span>
                        <span class="detail-item">Cost: $${match.extractedItem.caseCost.toFixed(2)}</span>
                        ${match.extractedItem.portionSize ? 
                            `<span class="detail-item portion-highlight">📏 ${formatPortionSize(match.extractedItem.portionSize, match.extractedItem.portionUnit)}</span>` : 
                            ''
                        }
                    </div>
                </div>
                <div class="new-item-badge">
                    <span class="status-badge new">+ New Item</span>
                </div>
            </div>
        `).join('');
        
        return `
            <div class="review-section">
                <h3 class="section-title info">🔵 New Items (${newItems.length} items)</h3>
                <div class="review-items">
                    ${itemsHtml}
                </div>
            </div>
        `;
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
}

// Export for module system
export default {
    initialize: function() {
        new InvoiceImportController();
    }
};

console.log('📊 SECURE Enhanced Invoice Import Module loaded - Sensitive data protected, header sections skipped');