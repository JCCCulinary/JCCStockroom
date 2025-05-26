import { collection, getDocs, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { db } from "../firebase/firebase.js";
import { loadWasteEntryForm } from "./waste-entry.js";

let wasteLogEntries = [];

async function loadWasteLogData() {
  const snapshot = await getDocs(collection(db, "waste_log"));
  wasteLogEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

function renderWasteLogTable() {
  const tableBody = document.getElementById('waste-log-body');
  if (!tableBody) return;

  tableBody.innerHTML = '';

  if (!wasteLogEntries || wasteLogEntries.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="8">No entries found.</td></tr>';
    return;
  }

  wasteLogEntries.forEach(entry => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${entry.date}</td>
      <td>${entry.item}</td>
      <td>${entry.quantity}</td><td>${entry.convertedQuantity ?? "-"}</td><td>${entry.fractionOfCase ? entry.fractionOfCase + "%" : "-"}</td><td>${entry.estimatedCost ? "$" + entry.estimatedCost : "-"}</td>
      <td>${entry.unit}</td>
      <td>$${entry.estimatedCost?.toFixed(2) || "0.00"}</td>
      <td>${entry.reason}</td>
      <td><button class="btn-edit" data-id="${entry.id}">Edit</button></td>
      <td><button class="btn-delete" data-id="${entry.id}">Delete</button></td>
    `;
    tableBody.appendChild(row);
  });

  document.querySelectorAll(".btn-edit").forEach(btn => {
    btn.addEventListener("click", e => {
      const id = e.target.getAttribute("data-id");
      loadWasteEntryForm(id);
    });
  });

  document.querySelectorAll(".btn-delete").forEach(btn => {
    btn.addEventListener("click", async e => {
      const id = e.target.getAttribute("data-id");
      if (confirm("Are you sure you want to delete this entry?")) {
        await deleteDoc(doc(db, "waste_log", id));
        alert("Entry deleted.");
        await initializeWasteLog();
      }
    });
  });
}

export async function initializeWasteLog() {
  await loadWasteLogData();
  renderWasteLogTable();
    updateKPIs();
}


function bindEventHandlers() {
  document.querySelectorAll(".btn-edit").forEach(btn => {
    btn.addEventListener("click", e => {
      const id = e.target.getAttribute("data-id");
      loadWasteEntryForm(id);
    });
  });

  document.querySelectorAll(".btn-delete").forEach(btn => {
    btn.addEventListener("click", async e => {
      const id = e.target.getAttribute("data-id");
      if (confirm("Are you sure you want to delete this entry?")) {
        await deleteDoc(doc(db, "waste_log", id));
        alert("Entry deleted.");
        await initializeWasteLog();
      }
    });
  });

  const addButton = document.getElementById("add-waste-button");
  if (addButton) {
    addButton.addEventListener("click", () => loadWasteEntryForm(null));
  }
}



function updateKPIs() {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  let dayTotal = 0;
  let weekTotal = 0;
  let monthTotal = 0;

  const itemCounts = {};
  const categoryCounts = {};

  wasteLogEntries.forEach(entry => {
    const cost = parseFloat(entry.estimatedCost) || 0;
    const date = new Date(entry.date);

    if (isSameDay(date, today)) dayTotal += cost;
    if (date >= startOfWeek) weekTotal += cost;
    if (date >= startOfMonth) monthTotal += cost;

    // Count items
    itemCounts[entry.item] = (itemCounts[entry.item] || 0) + 1;
    // Count reasons
    categoryCounts[entry.reason] = (categoryCounts[entry.reason] || 0) + 1;
  });

  document.getElementById("waste-total-day").textContent = `$${dayTotal.toFixed(2)}`;
  document.getElementById("waste-total-week").textContent = `$${weekTotal.toFixed(2)}`;
  document.getElementById("waste-total-month").textContent = `$${monthTotal.toFixed(2)}`;

  updateTopList("top-wasted-items", itemCounts);
  updateTopList("top-waste-categories", categoryCounts);
}

function updateTopList(elementId, countObj) {
  const sorted = Object.entries(countObj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const list = document.getElementById(elementId);
  list.innerHTML = "";
  sorted.forEach(([label, count], i) => {
    const li = document.createElement("li");
    li.textContent = `${i + 1}. ${label} (${count})`;
    list.appendChild(li);
  });
}

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}



export default {
  initialize: async function () {
    await loadWasteLogData();
    renderWasteLogTable();
    updateKPIs();
    bindEventHandlers();
  }
};