
import { StorageController } from '../storage/storageController.js';
import { getDoc, doc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { db } from '../firebase/firebase.js';
import { convertUnits } from '../utils/dataUtils.js';

export function loadItemForm(id) {
  console.log("Loading item form for ID:", id);
  const content = document.getElementById("app-content");

  fetch("templates/item-info-page.html")
    .then(res => res.text())
    .then(async html => {
      content.innerHTML = html;
      console.log("Item info page loaded");

      if (id) {
        const snap = await getDoc(doc(db, "inventory_items", id));
        const item = snap.exists() ? snap.data() : null;
        if (item) {
          document.querySelector('input[name="name"]').value = item.name;
          document.querySelector('input[name="unitCost"]').value = item.unitCost;
          document.querySelector('input[name="forEvent"]').checked = item.forEvent;
          document.querySelector('input[name="par"]').value = item.par;
          document.querySelector('input[name="onHand"]').value = item.onHand;
          document.querySelector('select[name="location"]').value = item.location;
          document.querySelector('input[name="area"]').value = item.area;
          document.querySelector('textarea[name="notes"]').value = item.notes;
          const hiddenId = document.createElement("input");
          hiddenId.type = "hidden";
          hiddenId.name = "id";
          hiddenId.value = item.id;
          document.getElementById("item-form").appendChild(hiddenId);

          document.getElementById("caseQuantity").value = item.caseQuantity || '';
          document.getElementById("unitPerCase").value = item.unitPerCase || '';
          document.getElementById("caseUnit").value = item.caseUnit || 'LB';
          document.getElementById("wasteEntryUnit").value = item.wasteEntryUnit || 'OZ';
          document.getElementById("last-modified").textContent = item.lastModified || "(unsaved)";
        }
      }

      setTimeout(() => initializeItemForm(), 0);
    })
    .catch(err => console.error("Failed to load item-info-page.html:", err));
}

function initializeItemForm() {
  setTimeout(() => {
    const requiredIds = ["caseQuantity", "unitPerCase", "caseCost", "unitCost"];
    const missing = requiredIds.filter(id => !document.getElementById(id));
    if (missing.length > 0) {
      console.warn("Auto cost logic skipped due to missing inputs:", missing);
      return;
    }

    function updateAutoUnitCost() {
      const caseQtyEl = document.getElementById("caseQuantity");
      const unitQtyEl = document.getElementById("unitPerCase");
      const caseCostEl = document.getElementById("caseCost");
      const displayEl = document.getElementById("unitCost");
      const caseUnitEl = document.getElementById("caseUnit");
      const wasteUnitEl = document.getElementById("wasteEntryUnit");
      if (!caseQtyEl || !unitQtyEl || !caseCostEl || !displayEl) return;

      const caseQty = parseFloat(caseQtyEl.value) || 0;
      const unitQty = parseFloat(unitQtyEl.value) || 0;
      const caseCost = parseFloat(caseCostEl.value) || 0;
      const caseUnit = caseUnitEl?.value || "LB";
      const wasteUnit = wasteUnitEl?.value || "OZ";
      const totalUnits = convertUnits(caseUnit, wasteUnit, caseQty * unitQty);
      const result = (totalUnits > 0)
        ? (caseCost / totalUnits).toFixed(2)
        : "";

      displayEl.value = result ? `$${result}` : "";
      const costEl = document.getElementById("caseCost");
      const unitEl = document.getElementById("unitCost");
      if (unitEl) unitEl.value = result ? `$${result}` : "";
    }

    
    document.getElementById("cancel-button").addEventListener("click", () => {
      moduleSystem.loadModule("inventory");
    });
["caseQuantity", "unitPerCase", "caseCost", "wasteEntryUnit"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("input", updateAutoUnitCost);
    });
    });

    // NEW: Save form handler
    document.getElementById("item-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;

      const formData = {
        id: form.querySelector("input[name='id']")?.value || crypto.randomUUID(),
        name: form.querySelector("input[name='name']").value,
        unitCost: parseFloat(form.querySelector("input[name='unitCost']").value) || 0,
        forEvent: form.querySelector("input[name='forEvent']").checked,
        par: parseInt(form.querySelector("input[name='par']").value) || 0,
        onHand: parseInt(form.querySelector("input[name='onHand']").value) || 0,
        location: form.querySelector("select[name='location']").value,
        area: form.querySelector("input[name='area']").value,
        notes: form.querySelector("textarea[name='notes']").value,
        caseQuantity: parseFloat(form.querySelector("input[name='caseQuantity']").value) || 0,
        unitPerCase: parseFloat(form.querySelector("input[name='unitPerCase']").value) || 0,
        caseUnit: form.querySelector("select[name='caseUnit']").value,
        wasteEntryUnit: form.querySelector("select[name='wasteEntryUnit']").value,
        lastModified: new Date().toISOString()
      };

      try {
        await StorageController.save([formData]);
        alert("Item saved successfully.");
        moduleSystem.loadModule("inventory");
      } catch (err) {
        console.error("Error saving item:", err);
        alert("Failed to save item.");
      }
    });
// FIXED: unmatched closing paren removed or corrected
}       // closes initializeItemForm