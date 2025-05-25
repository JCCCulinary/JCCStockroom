# JCCiMS Debugging Guide

This guide provides troubleshooting steps for common issues you might encounter while implementing and testing the JCC Inventory Management System.

## Browser Console Basics

The browser's developer console is your primary debugging tool:
- **Chrome/Edge**: Press F12 or Ctrl+Shift+J (Windows/Linux) or Cmd+Option+J (Mac)
- **Firefox**: Press F12 or Ctrl+Shift+K (Windows/Linux) or Cmd+Option+K (Mac)
- **Safari**: Enable Developer menu in Preferences > Advanced, then Safari > Develop > Show JavaScript Console

Look for errors (red text) in the console that indicate problems in your code.

## Common Issues and Solutions

### Module Loading Issues

**Symptoms:**
- Blank page or section when navigating to a module
- Error: "Failed to load module template"

**Troubleshooting:**
1. Check the browser console for specific errors
2. Verify file paths in the moduleSystem.js
3. Ensure all template files exist in the correct location
4. Check for JavaScript syntax errors in module scripts

**Solutions:**
```javascript
// Debug module loading by adding console logs
async loadModule(moduleId) {
  console.log(`Attempting to load module: ${moduleId}`);
  try {
    const response = await fetch(`templates/${moduleId}.html`);
    console.log(`Fetch status: ${response.status}`);
    // rest of code...
  } catch (error) {
    console.error('Detailed error:', error);
    // error handling...
  }
}
```

### Data Not Persisting

**Symptoms:**
- Data disappears after page refresh
- Changes don't save

**Troubleshooting:**
1. Check if localStorage is working:
   ```javascript
   // In console
   localStorage.setItem('test', 'value');
   console.log(localStorage.getItem('test')); // Should output 'value'
   ```
2. Check Google Drive connection status
3. Look for errors during save operations

**Solutions:**
```javascript
// Add debugging to save functions
function saveInventoryData() {
  try {
    const data = JSON.stringify(inventoryItems);
    console.log('Saving data:', data.substring(0, 100) + '...');
    localStorage.setItem('jcc_inventory', data);
    console.log('Save to localStorage complete');
    return true;
  } catch (error) {
    console.error('Save error:', error);
    // Possible localStorage quota exceeded
    return false;
  }
}
```

### Import Process Failing

**Symptoms:**
- File upload seems to work but data doesn't appear
- Column mapping page is blank
- Preview doesn't show data correctly

**Troubleshooting:**
1. Check file format (CSV needs proper delimiters)
2. Verify file size (very large files may cause issues)
3. Look for parsing errors in the console
4. Check data structure after parsing

**Solutions:**
```javascript
// Debug file parsing
function parseFile(file) {
  console.log('File info:', file.name, file.size, file.type);
  
  if (file.type === 'text/csv') {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function(results) {
        console.log('CSV Parse results:', results);
        console.log('First row:', results.data[0]);
        // Continue processing...
      },
      error: function(error) {
        console.error('CSV Parse error:', error);
      }
    });
  } else {
    // Excel processing...
  }
}
```

### UI Rendering Issues

**Symptoms:**
- Tables not displaying data
- Form elements not working
- Buttons not responding

**Troubleshooting:**
1. Check if data is available but not rendering
2. Verify CSS class names match between HTML and CSS files
3. Check for errors in event handlers
4. Inspect DOM to see if elements exist but are hidden

**Solutions:**
```javascript
// Debug UI rendering
function renderInventoryTable() {
  console.log('Rendering inventory table');
  console.log('Items count:', inventoryItems.length);
  
  const tableBody = document.getElementById('inventory-items');
  if (!tableBody) {
    console.error('Table body element not found!');
    return;
  }
  
  // Add a class to help identify in inspector
  tableBody.classList.add('debug-highlight');
  
  // Clear existing content
  tableBody.innerHTML = '';
  
  // Render items...
}
```

### Event Handlers Not Working

**Symptoms:**
- Clicking buttons has no effect
- Form submissions don't work

**Troubleshooting:**
1. Check if elements exist when event handlers are attached
2. Verify event listener syntax
3. Look for errors when events are triggered
4. Check if event bubbling or prevention is causing issues

**Solutions:**
```javascript
// Debug event handler attachment
function attachEventHandlers() {
  console.log('Attaching event handlers');
  
  const addButton = document.getElementById('add-item-btn');
  if (!addButton) {
    console.error('Add button not found');
    return;
  }
  
  console.log('Add button found, attaching click handler');
  addButton.addEventListener('click', function(event) {
    console.log('Add button clicked');
    // Handler code...
  });
}
```

### Google Drive Integration Issues

**Symptoms:**
- "Failed to connect to Google Drive" error
- Authorization seems to work but data doesn't save/load

**Troubleshooting:**
1. Check Client ID configuration
2. Verify API is enabled in Google Cloud Console
3. Check for CORS issues in network tab
4. Verify permission scopes

**Solutions:**
```javascript
// Enhanced error handling for Google Drive
async authorize() {
  try {
    console.log('Starting Google Drive authorization');
    const client = google.accounts.oauth2.initTokenClient({
      client_id: this.clientId,
      scope: 'https://www.googleapis.com/auth/drive.appdata',
      callback: (tokenResponse) => {
        console.log('Token received:', tokenResponse ? 'yes' : 'no');
        if (tokenResponse && tokenResponse.access_token) {
          this.token = tokenResponse.access_token;
          console.log('Authorization successful');
          return true;
        } else {
          console.error('No token in response');
          return false;
        }
      },
    });
    client.requestAccessToken();
  } catch (error) {
    console.error('Detailed auth error:', error);
    throw new Error('Google Drive authorization failed');
  }
}
```

### Module Communication Issues

**Symptoms:**
- Changes in one module don't reflect in others
- Inconsistent data between modules

**Troubleshooting:**
1. Check if global variables are properly shared
2. Verify event listeners for cross-module events
3. Check if data refresh functions are called when needed

**Solutions:**
```javascript
// Add a central event system for cross-module communication
const EventBus = {
  events: {},
  
  subscribe: function(eventName, callback) {
    console.log(`Subscribing to event: ${eventName}`);
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(callback);
  },
  
  publish: function(eventName, data) {
    console.log(`Publishing event: ${eventName}`, data);
    if (this.events[eventName]) {
      this.events[eventName].forEach(callback => {
        callback(data);
      });
    }
  }
};

// Usage:
// When inventory changes
EventBus.publish('inventory-updated', { source: 'inventory-module' });

// In hot counts module
EventBus.subscribe('inventory-updated', function(data) {
  console.log('Hot counts received inventory update from:', data.source);
  refreshHotCountItems();
});
```

## Performance Issues

**Symptoms:**
- Slow loading of large inventory lists
- UI freezes during operations
- High memory usage

**Troubleshooting:**
1. Check data volume (too many items?)
2. Identify expensive operations
3. Use Performance tab in DevTools to find bottlenecks

**Solutions:**
```javascript
// Optimize table rendering with pagination
function renderInventoryTable(page = 1, pageSize = 50) {
  console.time('renderTable');
  
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pageItems = inventoryItems.slice(start, end);
  
  // Only render visible items
  pageItems.forEach(item => {
    // Render row...
  });
  
  // Add pagination controls
  renderPagination(page, Math.ceil(inventoryItems.length / pageSize));
  
  console.timeEnd('renderTable');
}
```

## CORS Issues

**Symptoms:**
- Network requests fail with CORS errors
- Google Drive API calls fail in deployed environment

**Solutions:**
- When testing locally, use a proper web server instead of opening files directly
- For Google Drive API, ensure correct origins are configured in Google Cloud Console
- Consider adding appropriate headers if you control the server:
  ```
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, POST, PUT
  Access-Control-Allow-Headers: Content-Type
  ```

## Storage Quota Exceeded

**Symptoms:**
- Data saving fails with quota errors
- localStorage operations throw exceptions

**Solutions:**
```javascript
// Check available space and optimize storage
function checkStorageQuota() {
  let totalSize = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      totalSize += localStorage[key].length;
    }
  }
  
  console.log(`Current localStorage usage: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  
  // Consider implementing data chunking or compression
  // Or move to IndexedDB for larger storage needs
}
```

## Debugging Tools

These built-in browser tools can help diagnose issues:

1. **Network Tab**: Monitor HTTP requests and responses
2. **Elements Tab**: Inspect and modify DOM elements
3. **Application Tab**: View localStorage, sessionStorage, and IndexedDB
4. **Performance Tab**: Analyze performance bottlenecks
5. **Console**: Log messages and execute JavaScript

## Adding Debugging Code

Add these debugging functions to help monitor application state:

```javascript
// Add to app.js
const Debug = {
  enabled: true, // Set to false in production
  
  log: function(message, data) {
    if (this.enabled) {
      console.log(`%c[DEBUG] ${message}`, 'color: blue', data || '');
    }
  },
  
  error: function(message, error) {
    if (this.enabled) {
      console.error(`%c[ERROR] ${message}`, 'color: red', error || '');
    }
  },
  
  state: function() {
    if (this.enabled) {
      console.log('%c[STATE]', 'color: green', {
        module: moduleSystem.currentModule,
        itemCount: inventoryItems.length,
        hotCountItems: inventoryItems.filter(i => i.isHotCount).length,
        lowStockItems: inventoryItems.filter(i => i.currentQuantity < i.parLevel).length,
        storage: localStorage.length + ' items in localStorage'
      });
    }
  }
};

// Use throughout code:
Debug.log('Initializing module', moduleId);
Debug.error('Failed to save data', error);
Debug.state();
```

Remember that the most effective debugging strategy is methodical isolation of issues - narrow down the problem area, add focused logging, and test incrementally as you fix issues.
