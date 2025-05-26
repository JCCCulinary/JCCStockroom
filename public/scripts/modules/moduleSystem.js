class ModuleSystem {
  constructor() {
    this.contentContainer = document.getElementById('app-content');
    this.navLinks = document.querySelectorAll('.tab-link');
    this.currentModule = null;
    this.initNavigation();
  }

  initNavigation() {
    this.navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const moduleId = link.getAttribute('data-module');
        this.loadModule(moduleId);
      });
    });
  }

  async loadModule(moduleId) {
    try {
      const templateResponse = await fetch(`templates/${moduleId}.html`);
      const html = await templateResponse.text();
      this.contentContainer.innerHTML = html;

      const module = await import(`./${moduleId}.js`);
      if (module.default && typeof module.default.initialize === 'function') {
        module.default.initialize();
      } else {
        console.warn(`Module ${moduleId} does not export a default initialize() function.`);
      }
    } catch (error) {
      console.error(`Error loading module '${moduleId}':`, error);
      this.contentContainer.innerHTML = `<p style="color: red;">Failed to load module: ${moduleId}</p>`;
    }
  }
}

window.moduleSystem = new ModuleSystem();

// Automatically load dashboard on page load
window.addEventListener("DOMContentLoaded", () => {
  moduleSystem.loadModule("dashboard");
});