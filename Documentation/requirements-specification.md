# 📋 JCC Stockroom – Functional Requirements Specification (Updated May 2025)

## 📦 Inventory Module
- View, search, filter inventory
- Add/edit/delete items
- Store: name, location, area, forEvent, PAR, onHand, unitType, unitCost
- Lock `Case Unit Type` after initial save
- Format unitCost as currency
- Enable unit conversions via `convertUnits()`
- Store conversion reference using `unitPerCase`

## 🗑️ Waste Log Module
- Submit waste entry tied to existing inventory item
- Quantity + UOM selection (filtered by compatible base unit)
- Auto-conversion to base unit for costing
- Store: itemID, date, quantity, unit, reason, estimatedCost
- Live KPIs: Total Waste (Day, Week, Month), Top 3 Waste Items, Top 3 Reasons

## 📊 Dashboard
- Summary boxes show:
  - Inventory Turnover Rate
  - Monthly Spending
  - Low/Out-of-Stock Alerts
  - Waste KPIs (live from Firestore)

## 🔄 Data Sync & Storage
- All data stored in Firebase Firestore
- Inventory and waste collections updated in real time
- StorageController handles all Firestore interactions

## ⚙️ Conversion System
- Converts across units in categories:
  - Weight: LB, OZ, G, KG
  - Volume: GAL, QT, PT, FL OZ, ML, L
  - Each: CS, EA
- Filters UOM dropdowns per item’s base unit
- Bi-directional conversion with fallback logic

## 🧰 Additional Features
- Responsive mobile layout
- Success alert and redirect on Save
- Delete confirmation prompts
- Dynamic dropdowns: Location, Unit Type, Reason
