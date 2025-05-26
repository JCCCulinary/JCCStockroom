
console.log("✅ inventory.js is running");

import { loadItemForm } from './item-info.js';
import { StorageController } from '../storage/storageController.js';

function initializeInventory() {
  console.log("Initializing inventory module...");

  const content = document.getElementById("app-content");

  fetch("./templates/inventory.html")
    .then(res => res.text())
    .then(html => {
      content.innerHTML = html;
      bindInventoryEvents();
    });
}

function bindInventoryEvents() {
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

  data.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `
  <td>${item.name || ""}</td>
  <td>${item.location || ""}</td>
  <td>${item.area || ""}</td>
  <td>${item.forEvent ? "✓" : ""}</td>
  <td>${item.par || ""}</td>
  <td>${item.onHand || ""}</td>
  <td><button class="edit-button" data-id="${item.id}">Edit</button></td>
  <td><button class="delete-button" data-id="${item.id}">Delete</button></td>
`;

    const editBtn = row.querySelector(".edit-button");
    editBtn.addEventListener("click", () => {
      loadItemForm(item.id);
    });

    const deleteBtn = row.querySelector(".delete-button");
    deleteBtn.addEventListener("click", async () => {
      const confirmDelete = confirm("Are you sure you want to delete this item?");
      if (!confirmDelete) return;
      try {
        await StorageController.delete(item.id);
        alert("Item deleted.");
        initializeInventory();
      } catch (err) {
        console.error("Failed to delete item:", err);
        alert("Failed to delete item.");
      }
    });

    tbody.appendChild(row);
  });
}

export default {
  initialize: initializeInventory
};
