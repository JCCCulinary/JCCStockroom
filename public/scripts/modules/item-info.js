
import { StorageController } from '../storage/storageController.js';
import { loadInventory } from './inventory.js';

export function loadItemForm(index) {
  console.log("Loading item form for index:", index);
  const content = document.getElementById("app-content");

  fetch("templates/item-info-page.html")
    .then(res => res.text())
    .then(html => {
      content.innerHTML = html;
      console.log("Item info page loaded");
      initializeItemForm(index);
    })
    .catch(err => console.error("Failed to load item-info-page.html:", err));
}

function initializeItemForm(index) {
  const form = document.getElementById("item-form");
  const cancelButton = document.getElementById("cancel-button");
  const unitType = document.getElementById("unit-type");
  const unitTypeOther = document.getElementById("unit-type-other");
  const location = document.getElementById("location");
  const locationOther = document.getElementById("location-other");

  let itemData = {};

  StorageController.load().then(data => {
    if (index !== null && Array.isArray(data)) {
      itemData = data[index] || {};
    }
    populateForm(itemData);
  });

  unitType.addEventListener("change", () => {
    unitTypeOther.style.display = unitType.value === "Other" ? "inline-block" : "none";
  });
  location.addEventListener("change", () => {
    locationOther.style.display = location.value === "Other" ? "inline-block" : "none";
  });

  cancelButton.addEventListener("click", () => {
    loadInventory();
  });

  form.addEventListener("submit", e => {
    e.preventDefault();

    const newItem = {
      name: document.getElementById("item-name").value.trim(),
      unitType: unitType.value === "Other" ? unitTypeOther.value.trim() : unitType.value,
      unitCost: parseFloat(document.getElementById("unit-cost").value.replace(/[^0-9.-]+/g,"")) || 0,
      forEvent: document.getElementById("for-event").checked,
      par: document.getElementById("par").value.trim(),
      onHand: document.getElementById("on-hand").value.trim(),
      vendorName: document.getElementById("vendor-name").value.trim(),
      productId: document.getElementById("product-id").value.trim(),
      location: location.value === "Other" ? locationOther.value.trim() : location.value,
      area: document.getElementById("area").value.trim(),
      notes: document.getElementById("notes").value.trim(),
      lastModified: new Date().toLocaleString()
    };

    StorageController.load().then(data => {
      if (!Array.isArray(data)) data = [];
      if (index !== null) {
        data[index] = newItem;
      } else {
        data.push(newItem);
      }
      StorageController.save(data).then(() => {
        alert("Save successful.");
        loadInventory();
      }).catch(() => alert("Save failed."));
    });
  });
}

function populateForm(data) {
  document.getElementById("item-name").value = data.name || "";
  document.getElementById("unit-cost").value = data.unitCost?.toFixed(2) || "";
  document.getElementById("for-event").checked = !!data.forEvent;
  document.getElementById("par").value = data.par || "";
  document.getElementById("on-hand").value = data.onHand || "";
  document.getElementById("vendor-name").value = data.vendorName || "";
  document.getElementById("product-id").value = data.productId || "";
  document.getElementById("area").value = data.area || "";
  document.getElementById("notes").value = data.notes || "";
  document.getElementById("last-modified").textContent = data.lastModified || "";

  const unitType = document.getElementById("unit-type");
  const unitTypeOther = document.getElementById("unit-type-other");
  if (data.unitType && [...unitType.options].some(opt => opt.value === data.unitType)) {
    unitType.value = data.unitType;
    unitTypeOther.style.display = "none";
  } else {
    unitType.value = "Other";
    unitTypeOther.value = data.unitType || "";
    unitTypeOther.style.display = "inline-block";
  }

  const location = document.getElementById("location");
  const locationOther = document.getElementById("location-other");
  if (data.location && [...location.options].some(opt => opt.value === data.location)) {
    location.value = data.location;
    locationOther.style.display = "none";
  } else {
    location.value = "Other";
    locationOther.value = data.location || "";
    locationOther.style.display = "inline-block";
  }
}
