import { db } from "../firebase/firebase.js";
import {
  getDocs,
  collection
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

function updateKPI() {
  const inventoryRef = collection(db, "inventory_items");
  const wasteRef = collection(db, "waste_log");

  Promise.all([
    getDocs(inventoryRef),
    getDocs(wasteRef)
  ]).then(([inventorySnap, wasteSnap]) => {
    const inventory = inventorySnap.docs.map(doc => doc.data());
    const wasteEntries = wasteSnap.docs.map(doc => doc.data());

    // Inventory stats
    let totalValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    inventory.forEach(item => {
      const unitCost = parseFloat(item.unitCost) || 0;
      const onHand = parseFloat(item.onHand) || 0;
      totalValue += unitCost * onHand;

      const par = parseFloat(item.par) || 0;
      if (onHand <= 0) outOfStockCount++;
      else if (onHand < par) lowStockCount++;
    });

    document.getElementById("inventory-value").textContent = `$${totalValue.toFixed(2)}`;
    document.getElementById("low-stock").textContent = lowStockCount;
    document.getElementById("out-of-stock").textContent = outOfStockCount;
    document.getElementById("monthly-spend").textContent = "$0.00";

    // Waste calculations
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    let wasteDay = 0;
    let wasteWeek = 0;
    let wasteMonth = 0;
    let wasteYear = 0;

    wasteEntries.forEach(entry => {
      const cost = parseFloat(entry.estimatedCost) || 0;
      const date = new Date(entry.date);

      if (isSameDay(date, today)) wasteDay += cost;
      if (date >= startOfWeek) wasteWeek += cost;
      if (date >= startOfMonth) wasteMonth += cost;
      if (date >= startOfYear) wasteYear += cost;
    });

    document.getElementById("waste-day").textContent = `$${wasteDay.toFixed(2)}`;
    document.getElementById("waste-week").textContent = `$${wasteWeek.toFixed(2)}`;
    document.getElementById("waste-month").textContent = `$${wasteMonth.toFixed(2)}`;
    document.getElementById("waste-year").textContent = `$${wasteYear.toFixed(2)}`;
  }).catch(err => {
    console.error("Failed to load dashboard KPIs:", err);
  });
}

function isSameDay(date1, date2) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export default {
  initialize: function () {
    fetch("templates/dashboard.html")
      .then(res => res.text())
      .then(html => {
        document.getElementById("app-content").innerHTML = html;
        updateKPI();
      });
  }
};