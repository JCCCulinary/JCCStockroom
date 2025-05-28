# 🛠️ JCC Stockroom – Technical Implementation Plan (Updated May 2025)

## 🔧 Tech Stack
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Storage**: Firebase Firestore (Cloud-first)
- **Hosting**: Firebase Hosting (HTTPS enforced)
- **Authentication**: Google OAuth2 (optional)
- **Architecture**: Client-side SPA (Single Page Application) with modular JS
- **Build**: Manual asset management (no bundler currently)

---

## 🔁 Data Management & Persistence

### 🔹 Primary Storage
- Firebase Firestore is now the sole source of truth for inventory, waste log, and settings.
- Offline caching and sync are not yet implemented.

### 🔹 Deprecated
- Google Drive and localStorage have been fully removed from the codebase.

---

## 🔗 Module Integration Plan

### ✅ Implemented
- `inventory.js` ↔ `item-info.js` (Add/Edit/Delete flow)
- `waste-log.js` ↔ `waste-entry.js` with conversion support
- `dashboard.js` KPIs pull from Firestore collections

### 🔜 Planned
- Link hot counts to live inventory
- Link orders module to usage + par levels
- Link waste log trends to dashboard

---

## ⚙️ Conversion Engine

- Core in `dataUtils.js`
- Supports dynamic UOM dropdowns via `getConvertibleUnits(baseUnit)`
- Converts between categories (weight, volume, each) using bi-directional multi-hop logic
- Uses `unitPerCase` for accurate CS↔EA conversions

---

## 🔐 Security Considerations
- Firebase rules restrict access based on user roles (planned)
- No PII is stored
- All network traffic encrypted (HTTPS enforced)
