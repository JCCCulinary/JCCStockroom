// scripts/utils/dataUtils.js - Enhanced Unit Conversion System
// Complete unit conversion and compatibility system for JCC Stockroom

/**
 * ✅ COMPREHENSIVE UNIT CONVERSION SYSTEM
 * 
 * Features:
 * - Multi-category unit conversions (Weight, Volume, Count)
 * - Smart compatibility grouping
 * - CS (Case) special handling
 * - Precision decimal handling
 * - Error handling and validation
 * - Pack size parsing
 * - Cost calculations
 */

// =============================================================================
// UNIT DEFINITIONS & CONVERSION FACTORS
// =============================================================================

/**
 * Master unit conversion table
 * Base units: OZ (weight), FL OZ (volume), EA (count)
 */
const CONVERSION_TABLE = {
    // WEIGHT UNITS (base: OZ)
    'OZ': { factor: 1, category: 'weight', name: 'Ounces' },
    'LB': { factor: 16, category: 'weight', name: 'Pounds' },
    'G': { factor: 0.035274, category: 'weight', name: 'Grams' },
    'KG': { factor: 35.274, category: 'weight', name: 'Kilograms' },
    
    // VOLUME UNITS (base: FL OZ)
    'FL OZ': { factor: 1, category: 'volume', name: 'Fluid Ounces' },
    'PT': { factor: 16, category: 'volume', name: 'Pints' },
    'QT': { factor: 32, category: 'volume', name: 'Quarts' },
    'GAL': { factor: 128, category: 'volume', name: 'Gallons' },
    'ML': { factor: 0.033814, category: 'volume', name: 'Milliliters' },
    'L': { factor: 33.814, category: 'volume', name: 'Liters' },
    
    // COUNT UNITS (base: EA)
    'EA': { factor: 1, category: 'count', name: 'Each' },
    '#10 CAN': { factor: 1, category: 'count', name: '#10 Can' },
    'CT': { factor: 1, category: 'count', name: 'Count' },
    
    // SPECIAL UNITS
    'CS': { factor: 1, category: 'case', name: 'Case' },
    'Other': { factor: 1, category: 'other', name: 'Other' }
};

/**
 * Unit compatibility groups
 * Units within the same group can be converted to each other
 */
const COMPATIBILITY_GROUPS = {
    weight: ['OZ', 'LB', 'G', 'KG'],
    volume: ['FL OZ', 'PT', 'QT', 'GAL', 'ML', 'L'],
    count: ['EA', '#10 CAN', 'CT'],
    case: ['CS'], // CS is special - always compatible with everything
    other: ['Other']
};

/**
 * Common pack size patterns for parsing
 */
const PACK_SIZE_PATTERNS = {
    // "12/24 OZ" → 12 units of 24oz each
    slashFormat: /(\d+)\/(\d+\.?\d*)\s*([A-Z\s#]+)/i,
    
    // "4x1 GAL", "4X5 LB" → 4 units of specified size
    xFormat: /(\d+)[xX](\d+\.?\d*)\s*([A-Z\s#]+)/i,
    
    // "6-3 LB" → 6 units of 3lb each
    dashFormat: /(\d+)[-](\d+\.?\d*)\s*([A-Z\s#]+)/i,
    
    // "24CT", "50 CT" → 24 count items
    countFormat: /(\d+)\s*CT/i,
    
    // "EACH", "1 EACH" → single item
    eachFormat: /(\d+\s*)?EACH/i,
    
    // "1 CS", "2 CASE" → case format
    caseFormat: /(\d+)\s*(CS|CASE)/i
};

// =============================================================================
// CORE CONVERSION FUNCTIONS
// =============================================================================

/**
 * Convert between compatible units
 * @param {string} fromUnit - Source unit
 * @param {string} toUnit - Target unit  
 * @param {number} quantity - Amount to convert
 * @returns {number|null} - Converted quantity or null if incompatible
 */
export function convertUnits(fromUnit, toUnit, quantity) {
    // Validate inputs
    if (!fromUnit || !toUnit || typeof quantity !== 'number' || quantity < 0) {
        console.warn('Invalid conversion parameters:', { fromUnit, toUnit, quantity });
        return null;
    }
    
    // Normalize unit names
    fromUnit = normalizeUnitName(fromUnit);
    toUnit = normalizeUnitName(toUnit);
    
    // Same unit - no conversion needed
    if (fromUnit === toUnit) {
        return quantity;
    }
    
    // Special handling for CS (Case)
    if (fromUnit === 'CS' || toUnit === 'CS') {
        return handleCaseConversion(fromUnit, toUnit, quantity);
    }
    
    // Get unit definitions
    const fromDef = CONVERSION_TABLE[fromUnit];
    const toDef = CONVERSION_TABLE[toUnit];
    
    if (!fromDef || !toDef) {
        console.warn('Unknown units:', { fromUnit, toUnit });
        return null;
    }
    
    // Check compatibility
    if (!areUnitsCompatible(fromUnit, toUnit)) {
        console.warn('Incompatible units:', { fromUnit, toUnit });
        return null;
    }
    
    // Convert via base unit
    const baseQuantity = quantity * fromDef.factor;
    const convertedQuantity = baseQuantity / toDef.factor;
    
    // Round to reasonable precision
    return Math.round(convertedQuantity * 10000) / 10000;
}

/**
 * Get all units compatible with the given unit
 * @param {string} unit - Unit to find compatible units for
 * @returns {string[]} - Array of compatible unit names
 */
export function getConvertibleUnits(unit) {
    if (!unit) return [];
    
    const normalizedUnit = normalizeUnitName(unit);
    const unitDef = CONVERSION_TABLE[normalizedUnit];
    
    if (!unitDef) {
        console.warn('Unknown unit for compatibility check:', unit);
        return [normalizedUnit]; // Return the unit itself as fallback
    }
    
    // CS is compatible with everything
    const compatibleUnits = [...(COMPATIBILITY_GROUPS[unitDef.category] || [])];
    
    // Always add CS as an option (except for 'other' category)
    if (unitDef.category !== 'other' && !compatibleUnits.includes('CS')) {
        compatibleUnits.push('CS');
    }
    
    return compatibleUnits.sort();
}

/**
 * Check if two units are compatible for conversion
 * @param {string} unit1 - First unit
 * @param {string} unit2 - Second unit
 * @returns {boolean} - True if compatible
 */
export function areUnitsCompatible(unit1, unit2) {
    if (!unit1 || !unit2) return false;
    
    const norm1 = normalizeUnitName(unit1);
    const norm2 = normalizeUnitName(unit2);
    
    // Same unit is always compatible
    if (norm1 === norm2) return true;
    
    // CS is compatible with everything except 'other'
    if (norm1 === 'CS' || norm2 === 'CS') {
        const otherUnit = norm1 === 'CS' ? norm2 : norm1;
        const otherDef = CONVERSION_TABLE[otherUnit];
        return otherDef && otherDef.category !== 'other';
    }
    
    // Check if units are in the same compatibility group
    const def1 = CONVERSION_TABLE[norm1];
    const def2 = CONVERSION_TABLE[norm2];
    
    if (!def1 || !def2) return false;
    
    return def1.category === def2.category;
}

/**
 * Get the category of a unit (weight, volume, count, etc.)
 * @param {string} unit - Unit to categorize
 * @returns {string} - Unit category
 */
export function getUnitCategory(unit) {
    const normalizedUnit = normalizeUnitName(unit);
    const unitDef = CONVERSION_TABLE[normalizedUnit];
    return unitDef ? unitDef.category : 'unknown';
}

/**
 * Get the full display name of a unit
 * @param {string} unit - Unit abbreviation
 * @returns {string} - Full display name
 */
export function getUnitDisplayName(unit) {
    const normalizedUnit = normalizeUnitName(unit);
    const unitDef = CONVERSION_TABLE[normalizedUnit];
    
    if (unitDef) {
        return `${normalizedUnit} (${unitDef.name})`;
    }
    
    return unit; // Return as-is if not found
}

// =============================================================================
// PACK SIZE PARSING FUNCTIONS
// =============================================================================

/**
 * Parse pack size string into components
 * @param {string} packSizeString - Pack size to parse (e.g., "12/24 OZ")
 * @returns {object} - { unitsPerCase, sizePerUnit, unitType, isValid }
 */
export function parsePackSize(packSizeString) {
    if (!packSizeString || typeof packSizeString !== 'string') {
        return { unitsPerCase: 0, sizePerUnit: 0, unitType: 'OZ', isValid: false };
    }
    
    const trimmed = packSizeString.trim().toUpperCase();
    
    // Try each pattern in order
    const patterns = [
        { regex: PACK_SIZE_PATTERNS.slashFormat, type: 'slash' },
        { regex: PACK_SIZE_PATTERNS.xFormat, type: 'x' },
        { regex: PACK_SIZE_PATTERNS.dashFormat, type: 'dash' },
        { regex: PACK_SIZE_PATTERNS.countFormat, type: 'count' },
        { regex: PACK_SIZE_PATTERNS.caseFormat, type: 'case' },
        { regex: PACK_SIZE_PATTERNS.eachFormat, type: 'each' }
    ];
    
    for (const pattern of patterns) {
        const match = trimmed.match(pattern.regex);
        if (match) {
            return parsePackSizeMatch(match, pattern.type);
        }
    }
    
    console.warn('Could not parse pack size:', packSizeString);
    return { unitsPerCase: 0, sizePerUnit: 0, unitType: 'OZ', isValid: false };
}

/**
 * Parse the matched pack size pattern
 * @param {array} match - Regex match array
 * @param {string} type - Pattern type
 * @returns {object} - Parsed pack size components
 */
function parsePackSizeMatch(match, type) {
    let unitsPerCase, sizePerUnit, unitType;
    
    switch (type) {
        case 'slash':
        case 'x':
        case 'dash':
            // Format: "12/24 OZ" or "4x5 LB"
            unitsPerCase = parseInt(match[1]) || 0;
            sizePerUnit = parseFloat(match[2]) || 0;
            unitType = normalizeUnitName(match[3]);
            break;
            
        case 'count':
            // Format: "24CT"
            unitsPerCase = parseInt(match[1]) || 0;
            sizePerUnit = 1;
            unitType = 'CT';
            break;
            
        case 'case':
            // Format: "1 CS"
            unitsPerCase = 1;
            sizePerUnit = parseInt(match[1]) || 1;
            unitType = 'CS';
            break;
            
        case 'each':
            // Format: "EACH" or "1 EACH"
            unitsPerCase = parseInt(match[1]) || 1;
            sizePerUnit = 1;
            unitType = 'EA';
            break;
            
        default:
            return { unitsPerCase: 0, sizePerUnit: 0, unitType: 'OZ', isValid: false };
    }
    
    return {
        unitsPerCase,
        sizePerUnit,
        unitType,
        isValid: true
    };
}

// =============================================================================
// COST CALCULATION FUNCTIONS
// =============================================================================

/**
 * Calculate unit cost from case information
 * @param {number} caseCost - Cost per case
 * @param {number} unitsPerCase - Number of units in a case
 * @param {number} sizePerUnit - Size of each unit
 * @param {string} fromUnit - Original unit type
 * @param {string} toUnit - Target unit for cost calculation
 * @returns {number} - Cost per target unit
 */
export function calculateUnitCost(caseCost, unitsPerCase, sizePerUnit, fromUnit, toUnit = null) {
    // Validate inputs
    if (!caseCost || caseCost <= 0 || !unitsPerCase || unitsPerCase <= 0) {
        return 0;
    }
    
    // Default to same unit if no target specified
    toUnit = toUnit || fromUnit;
    
    // Special handling for CS (Case)
    if (toUnit === 'CS') {
        return caseCost; // 1 CS = 1 Case
    }
    
    // Calculate total units per case in original unit
    const totalUnitsPerCase = unitsPerCase * (sizePerUnit || 1);
    
    if (totalUnitsPerCase <= 0) {
        return 0;
    }
    
    // Calculate base unit cost (in original unit)
    const baseUnitCost = caseCost / totalUnitsPerCase;
    
    // Convert to target unit if different
    if (fromUnit !== toUnit) {
        const conversionFactor = getConversionFactor(fromUnit, toUnit);
        if (conversionFactor === null) {
            console.warn('Cannot convert cost from', fromUnit, 'to', toUnit);
            return baseUnitCost; // Return base cost as fallback
        }
        
        return baseUnitCost / conversionFactor;
    }
    
    return baseUnitCost;
}

/**
 * Calculate total value of inventory
 * @param {number} quantity - Quantity on hand
 * @param {number} unitCost - Cost per unit
 * @param {string} quantityUnit - Unit of the quantity
 * @param {string} costUnit - Unit of the cost
 * @returns {number} - Total value
 */
export function calculateInventoryValue(quantity, unitCost, quantityUnit, costUnit) {
    if (!quantity || !unitCost || quantity <= 0 || unitCost <= 0) {
        return 0;
    }
    
    // If units match, simple multiplication
    if (quantityUnit === costUnit) {
        return quantity * unitCost;
    }
    
    // Convert quantity to cost unit
    const convertedQuantity = convertUnits(quantityUnit, costUnit, quantity);
    if (convertedQuantity === null) {
        console.warn('Cannot calculate inventory value: incompatible units', quantityUnit, costUnit);
        return 0;
    }
    
    return convertedQuantity * unitCost;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Normalize unit name to standard format
 * @param {string} unit - Unit to normalize
 * @returns {string} - Normalized unit name
 */
function normalizeUnitName(unit) {
    if (!unit || typeof unit !== 'string') return 'OZ';
    
    const normalized = unit.trim().toUpperCase();
    
    // Handle common variations
    const variations = {
        'OUNCE': 'OZ',
        'OUNCES': 'OZ',
        'POUND': 'LB',
        'POUNDS': 'LB',
        'GALLON': 'GAL',
        'GALLONS': 'GAL',
        'QUART': 'QT',
        'QUARTS': 'QT',
        'PINT': 'PT',
        'PINTS': 'PT',
        'FLUID OUNCE': 'FL OZ',
        'FLUID OUNCES': 'FL OZ',
        'FLOZ': 'FL OZ',
        'EACH': 'EA',
        'COUNT': 'CT',
        'CASE': 'CS',
        'CASES': 'CS',
        'GRAM': 'G',
        'GRAMS': 'G',
        'KILOGRAM': 'KG',
        'KILOGRAMS': 'KG',
        'MILLILITER': 'ML',
        'MILLILITERS': 'ML',
        'LITER': 'L',
        'LITERS': 'L'
    };
    
    return variations[normalized] || normalized;
}

/**
 * Get conversion factor between two units
 * @param {string} fromUnit - Source unit
 * @param {string} toUnit - Target unit
 * @returns {number|null} - Conversion factor or null if incompatible
 */
function getConversionFactor(fromUnit, toUnit) {
    const normalizedFrom = normalizeUnitName(fromUnit);
    const normalizedTo = normalizeUnitName(toUnit);
    
    if (normalizedFrom === normalizedTo) return 1;
    
    const fromDef = CONVERSION_TABLE[normalizedFrom];
    const toDef = CONVERSION_TABLE[normalizedTo];
    
    if (!fromDef || !toDef || !areUnitsCompatible(normalizedFrom, normalizedTo)) {
        return null;
    }
    
    return fromDef.factor / toDef.factor;
}

/**
 * Handle special case conversions involving CS (Case)
 * @param {string} fromUnit - Source unit
 * @param {string} toUnit - Target unit
 * @param {number} quantity - Quantity to convert
 * @returns {number|null} - Converted quantity
 */
function handleCaseConversion(fromUnit, toUnit, quantity) {
    // CS to CS
    if (fromUnit === 'CS' && toUnit === 'CS') {
        return quantity;
    }
    
    // For now, treat CS as 1:1 with any unit for basic compatibility
    // In real usage, this would need additional context about what's in the case
    console.warn('CS conversion requires case contents information:', { fromUnit, toUnit, quantity });
    
    if (fromUnit === 'CS') {
        // Converting from cases to individual units
        // This would need to know the case contents
        return quantity; // Placeholder - needs actual case definition
    } else {
        // Converting to cases from individual units
        // This would need to know how many units make a case
        return quantity; // Placeholder - needs actual case definition
    }
}

/**
 * Format a quantity with appropriate unit display
 * @param {number} quantity - Quantity to format
 * @param {string} unit - Unit of the quantity
 * @param {number} precision - Decimal places (default 2)
 * @returns {string} - Formatted quantity string
 */
export function formatQuantityWithUnit(quantity, unit, precision = 2) {
    if (typeof quantity !== 'number' || !unit) {
        return '0 ' + (unit || 'units');
    }
    
    const normalizedUnit = normalizeUnitName(unit);
    const roundedQuantity = Math.round(quantity * Math.pow(10, precision)) / Math.pow(10, precision);
    
    return `${roundedQuantity} ${normalizedUnit}`;
}

/**
 * Validate pack size components
 * @param {number} unitsPerCase - Units per case
 * @param {number} sizePerUnit - Size per unit
 * @param {string} unitType - Unit type
 * @returns {object} - Validation result with errors if any
 */
export function validatePackSize(unitsPerCase, sizePerUnit, unitType) {
    const errors = [];
    
    if (!unitsPerCase || unitsPerCase <= 0) {
        errors.push('Units per case must be greater than 0');
    }
    
    if (!sizePerUnit || sizePerUnit <= 0) {
        errors.push('Size per unit must be greater than 0');
    }
    
    if (!unitType || !CONVERSION_TABLE[normalizeUnitName(unitType)]) {
        errors.push('Invalid unit type');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

/**
 * Get all available units organized by category
 * @returns {object} - Units organized by category
 */
export function getAllUnits() {
    const categories = {};
    
    Object.entries(CONVERSION_TABLE).forEach(([unit, def]) => {
        if (!categories[def.category]) {
            categories[def.category] = [];
        }
        categories[def.category].push({
            code: unit,
            name: def.name,
            factor: def.factor
        });
    });
    
    return categories;
}

/**
 * Check if a unit is a valid unit type
 * @param {string} unit - Unit to validate
 * @returns {boolean} - True if valid
 */
export function isValidUnit(unit) {
    return !!CONVERSION_TABLE[normalizeUnitName(unit)];
}

/**
 * Get units suitable for waste tracking based on item unit type
 * @param {string} itemUnitType - The item's unit type
 * @returns {string[]} - Array of suitable waste tracking units
 */
export function getWasteTrackingUnits(itemUnitType) {
    const compatibleUnits = getConvertibleUnits(itemUnitType);
    
    // Always include CS for waste tracking
    if (!compatibleUnits.includes('CS')) {
        compatibleUnits.push('CS');
    }
    
    // Sort with most common waste units first
    const priorityOrder = ['CS', 'EA', 'LB', 'OZ', 'GAL', 'QT'];
    
    return compatibleUnits.sort((a, b) => {
        const aIndex = priorityOrder.indexOf(a);
        const bIndex = priorityOrder.indexOf(b);
        
        if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex;
        } else if (aIndex !== -1) {
            return -1;
        } else if (bIndex !== -1) {
            return 1;
        } else {
            return a.localeCompare(b);
        }
    });
}

// =============================================================================
// PORTION SIZE PARSING FUNCTIONS
// =============================================================================

/**
 * Parse portion size from item description
 * @param {string} description - Item description from invoice
 * @returns {object} - { portionSize, portionUnit, isValid, originalText }
 */
export function parsePortionSize(description) {
    if (!description || typeof description !== 'string') {
        return { portionSize: null, portionUnit: null, isValid: false, originalText: null };
    }
    
    const trimmed = description.trim().toUpperCase();
    
    // Common portion size patterns in food descriptions
    const portionPatterns = [
        // "6 OZ", "8OZ", "4 oz"
        /(\d+\.?\d*)\s*(OZ|OUNCE|OUNCES)/i,
        
        // "1/4 LB", "1/2 LB", "0.25 LB"
        /(\d+\/\d+|\d+\.?\d*)\s*(LB|POUND|POUNDS)/i,
        
        // "4 PC", "6 PIECE", "8 COUNT"
        /(\d+\.?\d*)\s*(PC|PIECE|PIECES|CT|COUNT)/i,
        
        // "2.5 GAL", "1 GALLON"
        /(\d+\.?\d*)\s*(GAL|GALLON|GALLONS)/i,
        
        // "16 FL OZ", "12 FLUID OZ"
        /(\d+\.?\d*)\s*(FL\s*OZ|FLUID\s*OZ|FLUID\s*OUNCE)/i,
        
        // "10 ML", "500 MILLILITER"
        /(\d+\.?\d*)\s*(ML|MILLILITER|MILLILITERS)/i,
        
        // "1 L", "2 LITER", "1.5 LITERS"
        /(\d+\.?\d*)\s*(L|LITER|LITERS)/i,
        
        // "5 G", "250 GRAM", "1 KG"
        /(\d+\.?\d*)\s*(G|GRAM|GRAMS|KG|KILOGRAM|KILOGRAMS)/i
    ];
    
    for (const pattern of portionPatterns) {
        const match = trimmed.match(pattern);
        if (match) {
            return parsePortionMatch(match, description);
        }
    }
    
    console.log('No portion size found in description:', description);
    return { portionSize: null, portionUnit: null, isValid: false, originalText: null };
}

/**
 * Parse matched portion size pattern
 * @param {array} match - Regex match array
 * @param {string} originalDescription - Original description text
 * @returns {object} - Parsed portion size
 */
function parsePortionMatch(match, originalDescription) {
    let portionSize = match[1];
    let portionUnit = match[2];
    
    // Handle fractions like "1/4", "1/2"
    if (portionSize.includes('/')) {
        const [numerator, denominator] = portionSize.split('/');
        portionSize = parseFloat(numerator) / parseFloat(denominator);
    } else {
        portionSize = parseFloat(portionSize);
    }
    
    // Normalize unit to standard format
    portionUnit = normalizeUnitName(portionUnit);
    
    // Extract the original matched text for reference
    const originalText = match[0];
    
    return {
        portionSize,
        portionUnit,
        isValid: true,
        originalText,
        confidence: calculatePortionConfidence(originalDescription, originalText)
    };
}

/**
 * Calculate confidence score for portion size extraction
 * @param {string} description - Full description
 * @param {string} matchedText - Matched portion text
 * @returns {number} - Confidence score 0-1
 */
function calculatePortionConfidence(description, matchedText) {
    let confidence = 0.8; // Base confidence
    
    const desc = description.toUpperCase();
    
    // Higher confidence for food-related keywords
    const foodKeywords = [
        'CHICKEN', 'BEEF', 'PORK', 'FISH', 'SALMON', 'TUNA', 'CATFISH',
        'BREAST', 'THIGH', 'STEAK', 'FILET', 'FILLET', 'CHOP', 'CUTLET',
        'PORTION', 'SERVING', 'INDIVIDUAL', 'IQF', 'FROZEN'
    ];
    
    const hasFood = foodKeywords.some(keyword => desc.includes(keyword));
    if (hasFood) confidence += 0.1;
    
    // Lower confidence for packaging-related contexts
    const packagingKeywords = ['CASE', 'BOX', 'BAG', 'CONTAINER', 'PACK'];
    const hasPackaging = packagingKeywords.some(keyword => 
        desc.includes(keyword) && desc.indexOf(keyword) < desc.indexOf(matchedText)
    );
    if (hasPackaging) confidence -= 0.2;
    
    return Math.max(0.1, Math.min(1.0, confidence));
}

/**
 * Extract multiple portion sizes if present (for variety packs)
 * @param {string} description - Item description
 * @returns {array} - Array of portion size objects
 */
export function extractAllPortionSizes(description) {
    if (!description) return [];
    
    const portionSizes = [];
    const trimmed = description.trim().toUpperCase();
    
    // Find all potential portion size matches
    const allPatterns = [
        /(\d+\.?\d*)\s*(OZ|OUNCE|OUNCES)/gi,
        /(\d+\/\d+|\d+\.?\d*)\s*(LB|POUND|POUNDS)/gi,
        /(\d+\.?\d*)\s*(PC|PIECE|PIECES|CT|COUNT)/gi,
        /(\d+\.?\d*)\s*(GAL|GALLON|GALLONS)/gi,
        /(\d+\.?\d*)\s*(FL\s*OZ|FLUID\s*OZ)/gi
    ];
    
    allPatterns.forEach(pattern => {
        let match;
        pattern.lastIndex = 0; // Reset regex
        while ((match = pattern.exec(trimmed)) !== null) {
            const parsed = parsePortionMatch(match, description);
            if (parsed.isValid) {
                portionSizes.push(parsed);
            }
        }
    });
    
    // Remove duplicates and sort by confidence
    const unique = portionSizes.filter((item, index, arr) => 
        arr.findIndex(other => 
            other.portionSize === item.portionSize && 
            other.portionUnit === item.portionUnit
        ) === index
    );
    
    return unique.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Validate if a portion size makes sense for the item type
 * @param {number} portionSize - Portion size value
 * @param {string} portionUnit - Portion unit
 * @param {string} itemDescription - Item description for context
 * @returns {boolean} - True if portion size seems reasonable
 */
export function validatePortionSize(portionSize, portionUnit, itemDescription = '') {
    if (!portionSize || portionSize <= 0 || !portionUnit) {
        return false;
    }
    
    const desc = itemDescription.toUpperCase();
    const unit = normalizeUnitName(portionUnit);
    
    // Define reasonable ranges for different portion types
    const portionRanges = {
        'OZ': { min: 0.5, max: 32, typical: [2, 4, 6, 8, 12, 16] },
        'LB': { min: 0.1, max: 5, typical: [0.25, 0.33, 0.5, 1, 2] },
        'FL OZ': { min: 1, max: 64, typical: [8, 12, 16, 20, 32] },
        'EA': { min: 1, max: 100, typical: [1, 2, 4, 6, 12] },
        'CT': { min: 1, max: 100, typical: [1, 2, 4, 6, 12] },
        'ML': { min: 10, max: 2000, typical: [250, 500, 750, 1000] },
        'L': { min: 0.1, max: 5, typical: [0.5, 1, 1.5, 2] },
        'G': { min: 10, max: 1000, typical: [100, 250, 500] },
        'KG': { min: 0.1, max: 10, typical: [0.5, 1, 2, 5] }
    };
    
    const range = portionRanges[unit];
    if (!range) return true; // Unknown unit, assume valid
    
    // Check if size is within reasonable range
    if (portionSize < range.min || portionSize > range.max) {
        return false;
    }
    
    // Higher confidence for typical portion sizes
    if (range.typical.includes(portionSize)) {
        return true;
    }
    
    // Special validation for protein items
    if (unit === 'OZ' && desc.includes('CHICKEN') && portionSize >= 4 && portionSize <= 12) {
        return true;
    }
    
    if (unit === 'OZ' && desc.includes('FISH') && portionSize >= 3 && portionSize <= 10) {
        return true;
    }
    
    return true; // Default to valid if no red flags
}

/**
 * Format portion size for display
 * @param {number} portionSize - Portion size value
 * @param {string} portionUnit - Portion unit
 * @returns {string} - Formatted portion size string
 */
export function formatPortionSize(portionSize, portionUnit) {
    if (!portionSize || !portionUnit) return '';
    
    // Format number to avoid unnecessary decimals
    const formattedSize = portionSize % 1 === 0 ? 
        portionSize.toString() : 
        portionSize.toFixed(2).replace(/\.?0+$/, '');
    
    return `${formattedSize} ${normalizeUnitName(portionUnit)}`;
}

// =============================================================================
// DEBUG AND TESTING UTILITIES
// =============================================================================

/**
 * Test portion size parsing for debugging
 * @returns {object} - Test results
 */
export function runPortionSizeTests() {
    const testDescriptions = [
        'TUNA YELLOWFIN STK 6 OZ FZ',
        'CHICKEN BREAST BONELESS SKINLESS 8 OZ',
        'SALMON FILET 4 OZ INDIVIDUALLY WRAPPED',
        'BEEF TENDERLOIN STEAK 10 OZ',
        'CATFISH FILET 6OZ FRESH',
        'PORK CHOP BONE-IN 12 OZ',
        'SHRIMP 16/20 COUNT 1 LB BAG',
        'GROUND BEEF 80/20 1/4 LB PATTIES',
        'MILK WHOLE 1 GAL JUG',
        'OLIVE OIL EXTRA VIRGIN 500 ML BOTTLE'
    ];
    
    const results = testDescriptions.map(desc => {
        const parsed = parsePortionSize(desc);
        const allPortions = extractAllPortionSizes(desc);
        const isValid = validatePortionSize(parsed.portionSize, parsed.portionUnit, desc);
        
        return {
            description: desc,
            parsed,
            allPortions,
            isValid,
            formatted: formatPortionSize(parsed.portionSize, parsed.portionUnit)
        };
    });
    
    console.log('Portion size parsing test results:', results);
    return results;
}

/**
 * Debug unit conversion with decimals
 * @param {string} fromUnit - Source unit
 * @param {string} toUnit - Target unit
 * @param {number} quantity - Decimal quantity to test
 * @returns {object} - Conversion result with debug info
 */
export function debugDecimalConversion(fromUnit, toUnit, quantity) {
    console.log(`Converting ${quantity} ${fromUnit} to ${toUnit}`);
    
    const result = convertUnits(fromUnit, toUnit, quantity);
    const rounded = result ? Math.round(result * 100) / 100 : null;
    
    const debugInfo = {
        input: { fromUnit, toUnit, quantity },
        result,
        rounded,
        isValid: result !== null,
        formatted: result ? formatQuantityWithUnit(result, toUnit, 2) : 'Invalid conversion'
    };
    
    console.log('Decimal conversion result:', debugInfo);
    return debugInfo;
}

console.log('✅ Enhanced dataUtils.js loaded with comprehensive unit conversion system');

// Export all functions for external use including new portion size functions
export default {
    convertUnits,
    getConvertibleUnits,
    areUnitsCompatible,
    getUnitCategory,
    getUnitDisplayName,
    parsePackSize,
    calculateUnitCost,
    calculateInventoryValue,
    formatQuantityWithUnit,
    validatePackSize,
    getAllUnits,
    isValidUnit,
    getWasteTrackingUnits,
    parsePortionSize,
    extractAllPortionSizes,
    validatePortionSize,
    formatPortionSize,
    runPortionSizeTests,
    debugDecimalConversion
};