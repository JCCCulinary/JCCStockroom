
console.log("✅ inventory.js is running");

import { loadItemForm } from './item-info.js';
import { StorageController } from '../storage/storageController.js';

export function loadInventory() {
  const content = document.getElementById("app-content");
  fetch("./templates/inventory.html")
    .then(res => res.text())
    .then(html => {
      content.innerHTML = html;
      initializeInventory(); // Call immediately after injecting HTML
    });
}

function initializeInventory() {
  console.log("Initializing inventory module...");

  const searchInput = document.getElementById("search");
  const filterLocation = document.getElementById("filter-location");
  const filterEvent = document.getElementById("filter-event");
  const addItemButton = document.getElementById("add-item-button");

  let inventory = [];

  StorageController.load().then(data => {
    inventory = Array.isArray(data) ? data : [];
    displayInventory(inventory);
  });

  searchInput?.addEventListener("input", () => applyFilters(inventory));
  filterLocation?.addEventListener("change", () => applyFilters(inventory));
  filterEvent?.addEventListener("change", () => applyFilters(inventory));

  addItemButton?.addEventListener("click", () => {
    console.log("🟩 Add Item button clicked (from JS)");
    loadItemForm(null);
  });
}

function applyFilters(data) {
  const search = document.getElementById("search")?.value.toLowerCase() || "";
  const loc = document.getElementById("filter-location")?.value;
  const evt = document.getElementById("filter-event")?.value;

  const filtered = data.filter(item => {
    return (!search || item.name?.toLowerCase().includes(search)) &&
           (!loc || item.location === loc) &&
           (!evt || String(item.forEvent) === evt);
  });

  displayInventory(filtered);
}

function displayInventory(data) {
  const tbody = document.getElementById("inventory-table-body");
  if (!tbody) {
    console.error("Inventory table body not found.");
    return;
  }
  tbody.innerHTML = "";

  data.forEach((item, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.name || ""}</td>
      <td>${item.location || ""}</td>
      <td>${item.area || ""}</td>
      <td>${item.forEvent ? "✓" : ""}</td>
      <td>${item.par || ""}</td>
      <td>${item.onHand || ""}</td>
      <td><button data-index="${index}" class="edit-button">Edit</button></td>
    `;
    tbody.appendChild(row);
  });

  document.querySelectorAll(".edit-button").forEach(btn => {
    btn.addEventListener("click", e => {
      const index = parseInt(e.target.dataset.index);
      loadItemForm(index);
    });
  });
}
