/**
 * Convert a waste quantity from the input unit to the item's base case unit.
 * @param {number} quantity - The user-entered quantity
 * @param {string} fromUnit - Unit of the user-entered quantity (e.g., OZ)
 * @param {object} item - The inventory item reference
 * @returns {object|null} - Converted values or null if invalid
 */
export function convertWasteQuantity(quantity, fromUnit, item) {
  if (!item || !item.caseQuantity || !item.unitPerCase || !item.caseUnit) return null;

  const unitConversions = {
    LB: { OZ: 16 },
    GAL: { OZ: 128 }
  };

  const unit = item.caseUnit;
  const wasteUnit = fromUnit;

  let convertedQuantity = quantity;

  if (unit !== wasteUnit) {
    const conversionRate = unitConversions[unit]?.[wasteUnit];
    if (!conversionRate) return null;
    convertedQuantity = quantity / conversionRate;
  }

  const totalCaseQuantity = item.caseQuantity * item.unitPerCase;
  const fractionOfCase = convertedQuantity / totalCaseQuantity;
  const estimatedCost = item.lastCost ? parseFloat((item.lastCost * fractionOfCase).toFixed(2)) : null;

  return {
    convertedQuantity: parseFloat(convertedQuantity.toFixed(2)),
    targetUnit: unit,
    fractionOfCase: parseFloat((fractionOfCase * 100).toFixed(2)), // as percent
    estimatedCost
  };
}

// === Unit Conversion Utility ===
export const UNIT_CONVERSIONS = {
  LB: { OZ: 16 },
  OZ: { LB: 1 / 16 },
  GAL: { "FL OZ": 128 },
  "FL OZ": { GAL: 1 / 128 },
  CS: { EA: 1 },
  EA: { CS: 1 }
};

export function convertUnits(fromUnit, toUnit, quantity) {
  if (fromUnit === toUnit) return quantity;
  const rate = UNIT_CONVERSIONS[fromUnit]?.[toUnit];
  return rate ? quantity * rate : quantity; // fallback: no conversion
}

// === JSON Formatter ===
export function formatData(data) {
  return JSON.stringify(data);
}