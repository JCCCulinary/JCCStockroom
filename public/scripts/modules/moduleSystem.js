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
      console.log(`🔄 Loading module: ${moduleId}`);
      
      // Update active navigation state
      this.updateActiveNav(moduleId);
      
      // Load template
      const templateResponse = await fetch(`templates/${moduleId}.html`);
      if (!templateResponse.ok) {
        throw new Error(`Failed to load template: ${templateResponse.status}`);
      }
      const html = await templateResponse.text();
      this.contentContainer.innerHTML = html;

      // Load and initialize module - FIXED PATH ISSUE
      try {
        // FIXED: Since moduleSystem.js is already in scripts/modules/, use relative path
        const module = await import(`./${moduleId}.js`);
        
        // Standard module initialization pattern for all modules
        if (module.default && typeof module.default.initialize === 'function') {
          module.default.initialize();
          console.log(`✅ Module ${moduleId} initialized successfully`);
        } else {
          console.warn(`Module ${moduleId} does not export a default initialize() function.`);
          console.log('Module exports:', Object.keys(module));
        }
        
        this.currentModule = moduleId;
        
      } catch (moduleError) {
        console.error(`Error initializing module '${moduleId}':`, moduleError);
        this.contentContainer.innerHTML = `
          <div style="padding: 2rem; text-align: center;">
            <h3 style="color: #dc3545;">Module Error</h3>
            <p>Failed to initialize module: ${moduleId}</p>
            <p style="color: #6c757d; font-size: 0.9rem;">${moduleError.message}</p>
            <details style="margin: 1rem 0; text-align: left;">
              <summary style="cursor: pointer; color: #007bff;">Show Error Details</summary>
              <pre style="background: #f8f9fa; padding: 1rem; border-radius: 4px; overflow-x: auto; font-size: 0.8rem;">${moduleError.stack}</pre>
            </details>
            <div style="margin-top: 1rem;">
              <button onclick="location.reload()" style="margin-right: 1rem; padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Reload Page
              </button>
              <button onclick="moduleSystem.loadModule('dashboard')" style="padding: 0.5rem 1rem; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Go to Dashboard
              </button>
            </div>
          </div>
        `;
      }
      
    } catch (error) {
      console.error(`Error loading module '${moduleId}':`, error);
      this.contentContainer.innerHTML = `
        <div style="padding: 2rem; text-align: center;">
          <h3 style="color: #dc3545;">Loading Error</h3>
          <p>Failed to load module: ${moduleId}</p>
          <p style="color: #6c757d; font-size: 0.9rem;">${error.message}</p>
          <div style="margin-top: 1rem;">
            <button onclick="moduleSystem.loadModule('dashboard')" style="margin-right: 1rem; padding: 0.5rem 1rem; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Go to Dashboard
            </button>
            <button onclick="location.reload()" style="padding: 0.5rem 1rem; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Reload Page
            </button>
          </div>
        </div>
      `;
    }
  }

  updateActiveNav(moduleId) {
    // Remove active class from all nav links
    this.navLinks.forEach(link => {
      link.classList.remove('active');
    });
    
    // Add active class to current module
    const activeLink = document.querySelector(`[data-module="${moduleId}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
    }
  }

  getCurrentModule() {
    return this.currentModule;
  }

  // Utility method for modules to navigate to other modules
  navigateToModule(moduleId) {
    this.loadModule(moduleId);
  }

  /**
   * Reload current module (useful for development)
   */
  reloadCurrentModule() {
    if (this.currentModule) {
      this.loadModule(this.currentModule);
    }
  }

  /**
   * Check if a module is available
   */
  async isModuleAvailable(moduleId) {
    try {
      const templateResponse = await fetch(`templates/${moduleId}.html`);
      return templateResponse.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Debug helper - check what files actually exist
   */
  async debugFileStructure() {
    const modules = ['dashboard', 'inventory', 'waste-log', 'import', 'item-info'];
    const results = {};
    
    for (const moduleId of modules) {
      try {
        // Check template
        const templateResponse = await fetch(`templates/${moduleId}.html`);
        const templateExists = templateResponse.ok;
        
        // Check JavaScript module
        let jsExists = false;
        try {
          await import(`./scripts/modules/${moduleId}.js`);
          jsExists = true;
        } catch (e) {
          jsExists = false;
        }
        
        results[moduleId] = {
          template: templateExists,
          javascript: jsExists
        };
        
      } catch (error) {
        results[moduleId] = {
          template: false,
          javascript: false,
          error: error.message
        };
      }
    }
    
    console.log('📁 File structure debug:', results);
    return results;
  }
}

window.moduleSystem = new ModuleSystem();

// Automatically load dashboard on page load
window.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 JCC Stockroom application starting...");
  
  // Load import module if URL contains #import, otherwise load dashboard
  const urlHash = window.location.hash.substring(1);
  const initialModule = urlHash && ['dashboard', 'inventory', 'waste-log', 'import', 'item-info'].includes(urlHash) ? urlHash : 'dashboard';
  
  moduleSystem.loadModule(initialModule);
  
  // Handle browser back/forward navigation
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.substring(1);
    if (hash && hash !== moduleSystem.getCurrentModule()) {
      moduleSystem.loadModule(hash);
    }
  });
});

// Development helpers
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  window.devTools = {
    reloadModule: () => moduleSystem.reloadCurrentModule(),
    loadModule: (moduleId) => moduleSystem.loadModule(moduleId),
    currentModule: () => moduleSystem.getCurrentModule(),
    testImport: () => moduleSystem.loadModule('import'),
    debugFiles: () => moduleSystem.debugFileStructure()
  };
  
  console.log('🛠️ Development tools available: window.devTools');
  console.log('🔍 Run window.devTools.debugFiles() to check file structure');
}