# CHANGELOG

All notable changes to **JCC Stockroom** will be documented here.

---

## [2.0.0] - 2025-05-28
### Added
- Firebase Firestore integration completed and replaces Google Drive/localStorage
- Full migration of inventory, waste log, and item info to Firebase
- Smart unit conversion logic implemented (`convertUnits`, `getConvertibleUnits`)
- Unit dropdowns now dynamically filtered based on item’s base unit
- Locked "Case Unit Type" after save to prevent data inconsistency
- Waste Log KPIs now calculated from live database data
- `.ico` favicon and branding assets added

### Changed
- Modular structure improvements for better scalability and maintainability
- Updated dashboard to show KPIs from Firebase
- `storageController.js` now uses Firebase throughout the app
- Updated UI responsiveness and touch elements for mobile support

### Fixed
- Dropdown mismatches for UOM
- Conversion system failing on EA↔CS paths without `unitPerCase`
- Waste entries not appearing due to bad write paths
- Dashboard auto-loading after cold start
