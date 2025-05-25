import { StorageController } from '../storage/storageController.js';

export function loadDashboard() {
  const content = document.getElementById("app-content");

  fetch("templates/dashboard.html")
    .then(res => res.text())
    .then(html => {
      content.innerHTML = html;
      updateKPI();
    });
}

function updateKPI() {
  StorageController.load().then(data => {
    if (!Array.isArray(data)) data = [];

    let totalValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    data.forEach(item => {
      const unitCost = parseFloat(item.unitCost) || 0;
      const onHand = parseFloat(item.onHand) || 0;
      totalValue += unitCost * onHand;

      const par = parseFloat(item.par) || 0;
      if (onHand <= 0) {
        outOfStockCount++;
      } else if (onHand < par) {
        lowStockCount++;
      }
    });

    document.getElementById("inventory-value").textContent = `$${totalValue.toFixed(2)}`;
    document.getElementById("low-stock").textContent = lowStockCount;
    document.getElementById("out-of-stock").textContent = outOfStockCount;

    // Placeholder — update as needed when monthly spend is implemented
    document.getElementById("monthly-spend").textContent = "$0.00";
  }).catch(err => {
    console.error("Failed to load inventory:", err);
  });
}