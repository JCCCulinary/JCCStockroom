
// === Unit Category Map ===
const UNIT_CATEGORIES = {
  weight: ["LB", "OZ", "G", "KG"],
  volume: ["GAL", "QT", "PT", "FL OZ", "ML", "L"],
  each: ["CS", "EA"]
};

// === Base Conversion Table (one-way only) ===
const BASE_CONVERSIONS = {
  LB: { OZ: 16 },
  OZ: { LB: 1 / 16 },
  GAL: { QT: 4, "FL OZ": 128 },
  QT: { GAL: 1 / 4, PT: 2 },
  PT: { QT: 1 / 2, "FL OZ": 16 },
  "FL OZ": { PT: 1 / 16, GAL: 1 / 128 },
  G: { KG: 1 / 1000 },
  KG: { G: 1000 },
  ML: { L: 1 / 1000 },
  L: { ML: 1000 }
};

// === Helper: Automatically add reverse mappings ===
const UNIT_CONVERSIONS = JSON.parse(JSON.stringify(BASE_CONVERSIONS));
for (const from in BASE_CONVERSIONS) {
  for (const to in BASE_CONVERSIONS[from]) {
    if (!UNIT_CONVERSIONS[to]) UNIT_CONVERSIONS[to] = {};
    UNIT_CONVERSIONS[to][from] = 1 / BASE_CONVERSIONS[from][to];
  }
}

// === Multi-hop Conversion ===
export function convertUnits(fromUnit, toUnit, quantity, item = null) {
  if (fromUnit === toUnit) return quantity;

  // Handle CS <-> EA with unitPerCase logic
  if ((fromUnit === "CS" && toUnit === "EA") || (fromUnit === "EA" && toUnit === "CS")) {
    const rate = item?.unitPerCase;
    if (!rate) return null;
    return fromUnit === "CS" ? quantity * rate : quantity / rate;
  }

  // Breadth-First Search for multi-hop path
  const visited = new Set();
  const queue = [{ unit: fromUnit, qty: quantity }];

  while (queue.length > 0) {
    const { unit, qty } = queue.shift();
    if (unit === toUnit) return parseFloat(qty.toFixed(4));

    visited.add(unit);
    const neighbors = UNIT_CONVERSIONS[unit] || {};
    for (const next in neighbors) {
      if (!visited.has(next)) {
        queue.push({ unit: next, qty: qty * neighbors[next] });
      }
    }
  }

  return null; // No valid path
}

// === Get Compatible Units Based on Base Unit ===
export function getConvertibleUnits(baseUnit) {
  for (const category in UNIT_CATEGORIES) {
    if (UNIT_CATEGORIES[category].includes(baseUnit)) {
      return UNIT_CATEGORIES[category];
    }
  }
  return [];
}

// === Estimate Cost From Waste Quantity ===
export function convertWasteQuantity(quantity, fromUnit, item) {
  if (!item || !item.caseQuantity || !item.unitPerCase || !item.caseUnit) return null;
  const baseUnit = item.caseUnit;
  const convertedQuantity = convertUnits(fromUnit, baseUnit, quantity, item);
  if (convertedQuantity === null) return null;

  const totalCaseQuantity = item.caseQuantity * item.unitPerCase;
  const fractionOfCase = convertedQuantity / totalCaseQuantity;
  const estimatedCost = item.lastCost ? parseFloat((item.lastCost * fractionOfCase).toFixed(2)) : null;

  return {
    convertedQuantity: parseFloat(convertedQuantity.toFixed(2)),
    targetUnit: baseUnit,
    fractionOfCase: parseFloat((fractionOfCase * 100).toFixed(2)), // %
    estimatedCost
  };
}
