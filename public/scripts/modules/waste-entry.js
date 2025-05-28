import { db } from "../firebase/firebase.js";
import { convertUnits, getConvertibleUnits } from "../utils/dataUtils.js";
import { getDoc, doc, setDoc, collection } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { StorageController } from "../storage/storageController.js";

function updateUnitDropdown(baseUnit) {
  const unitDropdown = document.getElementById('waste-unit');
  if (!unitDropdown) return;
  
  const validUnits = getConvertibleUnits(baseUnit);
  unitDropdown.innerHTML = "";
  validUnits.forEach(unit => {
    const option = document.createElement('option');
    option.value = unit;
    option.textContent = unit;
    unitDropdown.appendChild(option);
  });
}

function convertWasteQuantity(quantity, wasteUnit, item) {
  const caseQty = parseFloat(item.caseQuantity) || 0;
  const unitPerCase = parseFloat(item.unitPerCase) || 0;
  const unitCost = parseFloat(item.unitCost) || 0;
  const caseUnit = item.caseUnit || "LB";

  const totalUnits = convertUnits(caseUnit, wasteUnit, caseQty * unitPerCase, item);
  const convertedQuantity = convertUnits(wasteUnit, caseUnit, quantity, item);

  const fractionOfCase = totalUnits > 0 ? (convertedQuantity / totalUnits) * 100 : 0;
  const estimatedCost = (totalUnits > 0)
    ? (quantity * unitCost).toFixed(2)
    : "0.00";

  return {
    convertedQuantity: parseFloat(quantity.toFixed(2)),
    conversionUnit: wasteUnit,
    estimatedCost: parseFloat(estimatedCost),
    fractionOfCase: parseFloat(fractionOfCase.toFixed(2))
  };
}

export async function loadWasteEntryForm(id = null) {
  const content = document.getElementById("app-content");

  try {
    const html = await fetch("templates/waste-entry.html").then(res => res.text());
    content.innerHTML = html;

    const cancelBtn = document.getElementById("cancel-waste");
    const itemSelect = document.getElementById("waste-item");
    const quantityInput = document.getElementById("waste-quantity");
    const costInput = document.getElementById("waste-cost");
    const form = document.getElementById("waste-form");

    const inventory = await StorageController.load();

    // Populate item dropdown
    inventory.forEach(item => {
      const opt = document.createElement("option");
      opt.value = item.name;
      opt.textContent = item.name;
      itemSelect.appendChild(opt);
    });

    // Load existing entry if editing
    if (id) {
      const snap = await getDoc(doc(db, "waste_log", id));
      if (snap.exists()) {
        const entry = snap.data();
        document.getElementById("waste-date").value = entry.date;
        document.getElementById("waste-item").value = entry.item;
        document.getElementById("waste-quantity").value = entry.quantity;
        document.getElementById("waste-unit").value = entry.unit;
        document.getElementById("waste-reason").value = entry.reason;
        document.getElementById("waste-notes").value = entry.notes || "";
        costInput.value = `$${parseFloat(entry.estimatedCost || 0).toFixed(2)}`;
        form.setAttribute("data-id", id);
      }
    } else {
      document.getElementById("waste-date").valueAsDate = new Date();
    }

    // Update unit dropdown when item changes
    itemSelect.addEventListener("change", () => {
      const selectedItem = inventory.find(i => i.name === itemSelect.value);
      if (selectedItem && selectedItem.caseUnit) {
        updateUnitDropdown(selectedItem.caseUnit);
        // Set default to the item's waste entry unit
        const wasteUnitSelect = document.getElementById("waste-unit");
        if (selectedItem.wasteEntryUnit && wasteUnitSelect) {
          wasteUnitSelect.value = selectedItem.wasteEntryUnit;
        }
      }
      updateCost();
    });

    // Cost calculation function
    function updateCost() {
      const itemName = itemSelect.value;
      const qty = parseFloat(quantityInput.value) || 0;
      const unit = document.getElementById("waste-unit").value;
      const item = inventory.find(i => i.name === itemName);

      if (!item || !qty) return;

      const result = convertWasteQuantity(qty, unit, item);
      costInput.value = `$${result.estimatedCost}`;
    }

    // Event listeners for real-time cost updates
    quantityInput.addEventListener("input", updateCost);
    document.getElementById("waste-unit").addEventListener("change", updateCost);

    // Form submission handler
    form.addEventListener("submit", async e => {
      e.preventDefault();

      const entry = {
        item: itemSelect.value,
        quantity: parseFloat(document.getElementById("waste-quantity").value),
        unit: document.getElementById("waste-unit").value,
        estimatedCost: parseFloat(costInput.value.replace(/[^\d.-]+/g, "")) || 0,
        reason: document.getElementById("waste-reason").value,
        date: document.getElementById("waste-date").value,
        notes: document.getElementById("waste-notes").value || ""
      };

      const item = inventory.find(i => i.name === entry.item);
      const result = convertWasteQuantity(entry.quantity, entry.unit, item);

      if (result) {
        entry.convertedQuantity = result.convertedQuantity;
        entry.conversionUnit = result.conversionUnit || "Other";
        entry.fractionOfCase = result.fractionOfCase;
        entry.estimatedCost = result.estimatedCost;
      }

      const docId = form.getAttribute("data-id") || `waste-${Date.now()}`;
      await setDoc(doc(db, "waste_log", docId), { id: docId, ...entry });
      alert("Waste entry saved.");
      moduleSystem.loadModule("waste-log");
    });

    // Cancel button
    cancelBtn.addEventListener("click", () => moduleSystem.loadModule("waste-log"));

  } catch (error) {
    console.error("Error loading waste entry form:", error);
    content.innerHTML = `<p style="color: red;">Error loading waste entry form: ${error.message}</p>`;
  }
}