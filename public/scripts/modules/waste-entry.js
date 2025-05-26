function convertWasteQuantity(quantity, unit, item) {
  const caseQty = parseFloat(item.caseQuantity) || 0;
  const unitPerCase = parseFloat(item.unitPerCase) || 0;
  const caseUnits = caseQty * unitPerCase;
  const unitCost = parseFloat(item.unitCost) || 0;

  let estimatedCost = quantity * unitCost;
  let fractionOfCase = 0;

  if (caseUnits > 0) {
    fractionOfCase = (quantity / caseUnits) * 100;
  }

  return {
    convertedQuantity: quantity,
    conversionUnit: item.wasteEntryUnit || unit || "Other",
    estimatedCost,
    fractionOfCase: +fractionOfCase.toFixed(2)
  };
}

import { db } from "../firebase/firebase.js";
import { getDoc, doc, setDoc, collection } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { StorageController } from "../storage/storageController.js";
import { initializeWasteLog } from "./waste-log.js";

export async function loadWasteEntryForm(id = null) {
  const content = document.getElementById("app-content");

  const html = await fetch("templates/waste-entry.html").then(res => res.text());
  content.innerHTML = html;

  const form = document.getElementById("waste-form");
  const cancelBtn = document.getElementById("cancel-waste");
  const itemSelect = document.getElementById("waste-item");
  const quantityInput = document.getElementById("waste-quantity");
  const costInput = document.getElementById("waste-cost");

  const inventory = await StorageController.load();

  inventory.forEach(item => {
    const opt = document.createElement("option");
    opt.value = item.name;
    opt.textContent = item.name;
    itemSelect.appendChild(opt);
  });

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

  function updateCost() {
    const itemName = itemSelect.value;
    const qty = parseFloat(quantityInput.value) || 0;
    const item = inventory.find(i => i.name === itemName);
    const cost = item && item.unitCost ? (qty * parseFloat(item.unitCost)) : 0;
    costInput.value = `$${cost.toFixed(2)}`;
    document.getElementById("waste-unit").value = item?.wasteEntryUnit || "Other";
  }

  itemSelect.addEventListener("change", updateCost);
  quantityInput.addEventListener("input", updateCost);

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

  // Conversion logic
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

  cancelBtn.addEventListener("click", () => moduleSystem.loadModule("waste-log"));
}