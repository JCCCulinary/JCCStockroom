# 🗒️ Implementation Notes – JCC Stockroom

## 🔄 Firestore Integration
- All inventory, waste, and settings are stored in Firestore.
- `firebase.js` initializes app and connects to project.
- `storageController.js` abstracts Firestore calls for CRUD operations.

## 📦 Inventory Logic
- `Case Unit Type` is locked after save to prevent unit conflicts.
- Each item has a `unitPerCase` used for EA↔CS conversions.
- Currency formatted as USD.
- Items are stored with full metadata (timestamps, vendor info, notes).

## 🗑️ Waste Log Logic
- Waste entries must reference an existing inventory item.
- Units dropdown is populated based on base unit type.
- Estimated cost is calculated using `convertUnits()` from `dataUtils.js`.

## 🔧 Conversion System
- Base unit per item is established at creation.
- Compatible units fetched using `getConvertibleUnits(baseUnit)`
- All conversions handled through breadth-first logic.

## 📊 Dashboard KPIs
- Pull from Firebase in real time.
- Calculated using reduce/sum logic inside `dashboard.js`.
- Monthly Spend box currently uses placeholder logic.

## 🧪 Known Gaps / Future Work
- Cross-module syncing still pending (e.g., Orders → Inventory)
- Offline-first support to be added later
- Audit trail and user attribution for changes (future enhancement)
