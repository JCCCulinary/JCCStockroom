# JCCiMS Testing Plan

## Module Loading Tests

1. **Basic Navigation Test**
   - Open the application
   - Click each navigation link (Home, Inventory, Import Data, Hot Counts, Orders)
   - Verify each module loads without errors
   - Verify navigation highlighting works correctly

2. **Module Initialization Test**
   - Navigate to each module
   - Verify all necessary data is loaded
   - Check that UI components are properly initialized

## Inventory Module Tests

1. **Item Display Test**
   - Verify inventory items load correctly
   - Test sorting functionality on all columns
   - Test filtering and search functionality

2. **Item Management Test**
   - Add a new inventory item
   - Edit an existing item
   - Delete an item
   - Verify changes persist after page reload

3. **Category and Location Tests**
   - Test filtering by category
   - Test filtering by location
   - Add/edit categories and locations

## Import Module Tests

1. **File Upload Test**
   - Test CSV file import
   - Test Excel file import
   - Verify file validation works correctly

2. **Mapping Test**
   - Verify column detection works correctly
   - Test mapping different columns to different fields
   - Test the "Next" button validation

3. **Data Preview Test**
   - Verify that mapped data previews correctly
   - Check for proper handling of data types

4. **Import Execution Test**
   - Test importing data with "overwrite existing" checked
   - Test importing data with "skip blank fields" checked
   - Verify newly imported items appear in inventory

## Hot Counts Module Tests

1. **Initial State Test**
   - Verify proper display of current day's count status
   - Check date formatting and status indicators

2. **Count Process Test**
   - Start a new morning count
   - Enter count values for each item
   - Save the count
   - Verify status updates correctly

3. **Evening Count & Usage Calculation Test**
   - Start an evening count
   - Enter count values
   - Verify usage calculations are correct
   - Save the count

4. **History View Test**
   - View history for different periods
   - Verify counts appear correctly
   - Test the details modal
   - Check usage trend chart rendering

## Orders Module Tests

1. **Tab Navigation Test**
   - Verify all three tabs load correctly
   - Test switching between tabs

2. **Suggested Orders Test**
   - Verify items below par level are correctly identified
   - Test supplier filtering
   - Test creating an order from suggested items

3. **Order Creation Test**
   - Create a new order manually
   - Add multiple items to the order
   - Verify total calculations
   - Save the order as draft

4. **Order History Test**
   - Filter orders by date range
   - Filter orders by status
   - View order details
   - Test receiving functionality

## Cross-Module Integration Tests

1. **Inventory → Hot Counts**
   - Mark an item for hot counts in Inventory module
   - Verify it appears in Hot Counts module

2. **Inventory → Orders**
   - Reduce an item quantity below par level in Inventory
   - Verify it appears in Suggested Orders

3. **Hot Counts → Inventory**
   - Complete a hot count
   - Verify inventory quantities update correctly

4. **Orders → Inventory**
   - Receive an order
   - Verify inventory quantities increase accordingly

## Data Persistence Tests

1. **Google Drive Integration**
   - Connect to Google Drive
   - Save data
   - Load data in a new session
   - Verify data integrity

2. **Local Storage Fallback**
   - Use the app without Google Drive connected
   - Verify data saves to localStorage
   - Reload the page and check data persistence

3. **Export/Import Test**
   - Export data to JSON
   - Clear all data
   - Import previously exported data
   - Verify all items are restored

## Responsive Design Tests

1. **Desktop Layout Test**
   - Test UI at 1920×1080, 1366×768, and 1024×768 resolutions
   - Verify all elements are properly sized and positioned

2. **Tablet Layout Test**
   - Test UI at 768×1024 (portrait) and 1024×768 (landscape)
   - Verify responsive adaptations

3. **Mobile Layout Test**
   - Test UI at 375×667 (iPhone) and 360×640 (Android)
   - Verify mobile-friendly navigation and interactions

## Performance Tests

1. **Large Dataset Test**
   - Import 500+ inventory items
   - Test application responsiveness
   - Measure loading times

2. **UI Responsiveness Test**
   - Test all interactive elements with large datasets
   - Verify filtering and sorting remain responsive

## Bug Log Template

For any issues discovered during testing, use this format:

**Bug ID:** [Unique Identifier]  
**Module:** [Affected Module]  
**Severity:** [High/Medium/Low]  
**Description:** [Detailed description of the issue]  
**Steps to Reproduce:**
1. 
2. 
3.  
**Expected Behavior:** [What should happen]  
**Actual Behavior:** [What actually happens]  
**Screenshots/Recordings:** [If applicable]  
**Environment:** [Browser, screen size, etc.]  
**Priority:** [Must Fix / Should Fix / Nice to Fix]
