# 📦 JCC Stockroom

**JCC Stockroom** is a custom-built inventory and waste tracking system for the Jackson Country Club culinary department. It includes real-time data tracking, smart unit conversion, and administrative tools.

---

## 🔧 Features
- Modular dashboard with KPIs
- Inventory management with conversion logic
- Locked base unit after item creation
- Waste log system with daily, weekly, and monthly analytics
- Firestore cloud database (no localStorage)
- Fully responsive UI for desktop/tablet/mobile
- Modular HTML and JS structure for easy scaling

---

## 🏁 Setup Instructions

### 1. Firebase Configuration
Ensure you have a Firebase project set up with Firestore and Hosting enabled. Then configure:

```js
// scripts/firebase/firebase.js
const firebaseConfig = {
  apiKey: "YOUR-KEY-HERE",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-project-id",
  ...
};
```

### 2. Deployment
To deploy:
```bash
firebase deploy --only hosting
```

### 3. File Structure
```
public/
├── index.html
├── templates/
├── scripts/
│   ├── modules/
│   ├── utils/
│   └── firebase/
├── styles/
└── assets/
```

---

## 📘 Modules
- **Dashboard**: KPIs for inventory and waste
- **Inventory**: Add/edit/delete items
- **Item Info**: Case cost, base unit, and vendor details
- **Waste Log**: Track discarded product by quantity and reason
- **Waste Entry**: Pulls from live inventory for valid item list

---

## 🔄 Conversions
- All items use “Case Unit Type” as base
- Supported unit categories: weight, volume, each
- Conversion engine is bi-directional and smart
- Cost is derived from base unit pricing

---

## 🧪 Testing
Sample JSON files are in `/examples/` for hot counts, orders, suppliers, etc.

---

## 🧠 Maintainers
Built by Nova and Nickalaus Weatherington.
