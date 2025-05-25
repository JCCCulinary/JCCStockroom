
import { StorageController } from "../storage/storageController.js";
import { loadDashboard } from "./dashboard.js";
import { loadInventory } from "./inventory.js";

document.addEventListener("DOMContentLoaded", () => {
  const tabLinks = document.querySelectorAll(".tab-link");
  const content = document.getElementById("app-content");

  tabLinks.forEach(btn => {
    btn.addEventListener("click", async () => {
      const module = btn.dataset.module;
      if (module === "dashboard") {
        const html = await fetch("./templates/dashboard.html").then(res => res.text());
        content.innerHTML = html;
        loadDashboard();
      } else if (module === "inventory") {
        loadInventory(); // Let inventory.js handle loading and initializing
      } else {
        content.innerHTML = "<p>Module not found.</p>";
      }
    });
  });

  // Load default view
  document.querySelector(".tab-link[data-module='dashboard']")?.click();
});
