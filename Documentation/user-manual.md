# JCC Inventory Management System (JCCiMS)
# User Manual

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Home Dashboard](#home-dashboard)
4. [Inventory Module](#inventory-module)
5. [Import/Export Module](#importexport-module)
6. [Hot Counts Module](#hot-counts-module)
7. [Orders Module](#orders-module)
8. [User Management](#user-management)
9. [Google Drive Integration](#google-drive-integration)
10. [Troubleshooting](#troubleshooting)
11. [Glossary](#glossary)

---

## Introduction

### About JCCiMS

The JCC Inventory Management System (JCCiMS) is a comprehensive web-based application designed to streamline kitchen and food service inventory operations. This system helps you track inventory levels, monitor usage, automate ordering processes, and generate analytical reports to make informed decisions.

### Key Features

- **Inventory Management**: Track items, locations, categories, and stock levels
- **Supplier Management**: Manage vendors and track pricing
- **Hot Counts**: Daily tracking of high-turnover items
- **Order Management**: Create, track, and receive orders
- **Data Import/Export**: Easy data migration and backup
- **Google Drive Integration**: Cloud-based data storage and synchronization
- **Responsive Design**: Works on desktop, tablet, and mobile devices

### User Roles and Permissions

The system supports three user roles with different permission levels:

1. **Administrator**
   - Full access to all system features
   - User management capabilities
   - System configuration access

2. **Inventory Manager**
   - Full access to inventory management
   - Create and manage orders
   - View and generate reports
   - Import and export data

3. **Kitchen Staff**
   - View inventory items
   - Perform hot counts
   - View (but not modify) order information
   - Basic reporting access

---

## Getting Started

### System Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection for initial loading and synchronization
- Google account for Google Drive integration (optional but recommended)

### Accessing the System

1. Open your web browser
2. Navigate to your JCCiMS URL (provided by your system administrator)
3. If prompted, log in with your provided credentials

### First-Time Setup

When using the system for the first time, follow these steps:

1. **Connect to Google Drive** (recommended)
   - Click the "Connect to Google Drive" button in the top navigation
   - Follow the Google authorization prompts
   - Confirm the connection was successful

2. **Configure Basic Settings**
   - Set up your storage locations (e.g., Walk-in Cooler, Dry Storage)
   - Create your item categories (e.g., Meat, Produce, Dairy)
   - Add your suppliers with contact information

3. **Import Initial Inventory**
   - Prepare a CSV or Excel file with your inventory data
   - Use the Import module to load your data
   - Verify imported items in the Inventory module

---

## Home Dashboard

The Home Dashboard provides an overview of your inventory status and quick access to key functions.

### Dashboard Components

1. **Status Overview**
   - Total inventory items and value
   - Items below par level
   - Today's hot count status
   - Pending orders status

2. **Quick Action Buttons**
   - Start Hot Count
   - Create New Order
   - Add Inventory Item
   - Run Reports

3. **Recent Activity**
   - Latest hot counts
   - Recent order activities
   - Inventory changes

### Navigation

Use the main navigation menu on the left side of the screen to access different modules:

- **Home**: Return to the main dashboard
- **Inventory**: Manage inventory items
- **Import Data**: Import/export functionality
- **Hot Counts**: Perform and track daily counts
- **Orders**: Manage purchase orders

---

## Inventory Module

The Inventory Module is the core of the system where you manage all your stock items.

### Viewing Inventory

1. **Inventory Table**
   - Displays all inventory items in a sortable, filterable table
   - Color-coded status indicators show stock levels
   - Search box for quickly finding specific items

2. **Filtering Options**
   - Filter by category using the dropdown menu
   - Filter by location using the dropdown menu
   - Use the search box to filter by name or other attributes
   - Toggle to show only low stock items

3. **Table Customization**
   - Click column headers to sort by that column
   - Use the "Columns" button to show/hide specific columns
   - Adjust items per page using the pagination controls

### Adding New Items

1. Click the "Add Item" button in the top right
2. Fill in the required fields in the form:
   - **Name**: Item name
   - **Category**: Select from dropdown or create new
   - **Location**: Select from dropdown or create new
   - **Unit**: Unit of measurement (e.g., lb, ea, case)
   - **Current Quantity**: Current stock level
   - **Par Level**: Minimum desired quantity
3. Fill in optional fields as needed:
   - Upload an image
   - Add supplier information
   - Add notes
4. Click "Save" to add the item to inventory

### Editing Items

1. Click on an item in the inventory table to open its details
2. Click the "Edit" button
3. Modify any fields as needed
4. Click "Save" to update the item

### Managing Item Details

When viewing an item's details, you can:

1. **Adjust Quantity**
   - Use the "+" and "-" buttons to quickly adjust stock levels
   - Enter a reason for the adjustment for tracking purposes

2. **View History**
   - See price history chart
   - View quantity change history
   - See order history for this item

3. **Manage Suppliers**
   - Add multiple suppliers for the item
   - Set a primary supplier
   - Track different pricing from each supplier

4. **Hot Count Settings**
   - Mark item for hot counts
   - View recent usage data

### Bulk Operations

For managing multiple items at once:

1. Use checkboxes to select multiple items
2. Use the "Bulk Actions" dropdown to:
   - Update category
   - Update location
   - Delete selected items
   - Export selected items
   - Print labels

---

## Import/Export Module

This module allows you to import data from external sources and export data for backup or reporting purposes.

### Importing Data

The import process consists of a four-step wizard:

#### Step 1: Select File
1. Click "Import Data" in the main navigation
2. Drag and drop your file or click to browse
3. Supported formats: CSV (.csv), Excel (.xlsx, .xls)
4. Verify the file details and click "Next"

#### Step 2: Map Columns
1. Match columns from your file to system fields
2. Required fields are highlighted
3. Use the dropdown for each column to select the corresponding system field
4. Click "Next" when mapping is complete

#### Step 3: Preview Data
1. Review how your data will be imported
2. Check for any warnings or errors
3. Verify the number of new items and updates
4. Click "Next" when ready

#### Step 4: Import Confirmation
1. Review the import summary
2. Choose import options:
   - Overwrite existing items
   - Skip blank fields
3. Click "Import Data" to start the process
4. Wait for the import to complete

### Exporting Data

1. In the Import/Export module, select the "Export" tab
2. Choose what to export:
   - All inventory items
   - Selected categories
   - Items below par level
   - Custom filter
3. Select the export format:
   - CSV
   - Excel
   - JSON (for system backup)
4. Click "Export" to generate and download the file

### Import/Export Templates

To help with data preparation:

1. Use the "Download Template" button to get a properly formatted template
2. Templates are available for:
   - Inventory items
   - Suppliers
   - Categories and locations

---

## Hot Counts Module

The Hot Counts Module is used to track daily usage of high-turnover items.

### Hot Count Basics

Hot counts are typically performed twice daily:
- **Morning Count**: Beginning of day inventory
- **Evening Count**: End of day inventory

The system automatically calculates usage based on the difference between counts, accounting for any additions recorded during the day.

### Starting a New Count

1. Navigate to the Hot Counts module
2. Click "Start New Count"
3. Select the count type (Morning or Evening)
4. The count form will load with all items marked for hot counts

### Performing a Count

1. For each item, enter the current quantity
2. The previous count is shown for reference
3. Add notes for any unusual observations
4. Use the Tab key to move efficiently between fields
5. Click "Save Count" when finished

### Viewing Count History

1. Click the "View History" button in the Hot Counts module
2. Select a date range using the filter
3. View a list of all counts performed
4. Click on any count to see its details

### Usage Analysis

1. In the History view, scroll down to the "Usage Trends" section
2. Select an item from the dropdown
3. View the usage chart showing consumption over time
4. Use date range selectors to adjust the time period

### Managing Hot Count Items

To control which items appear in hot counts:

1. Navigate to the Inventory module
2. Edit an item
3. Check or uncheck the "Include in Hot Counts" option
4. Save the item

---

## Orders Module

The Orders Module helps you manage the entire ordering process from creation to receiving.

### Orders Navigation

The Orders module has three tabs:
1. **Current Orders**: In-progress and recently placed orders
2. **Suggested Orders**: Items below par level that need ordering
3. **Order History**: Completed and historical orders

### Suggested Orders

1. Click the "Suggested Orders" tab
2. View all items below par level
3. Filter by supplier if needed
4. Select items to include in a new order
5. Click "Create Order" to generate a purchase order with selected items

### Creating a New Order

1. Click "Create New Order"
2. Select a supplier from the dropdown
3. Enter order date and any notes
4. Add items to the order:
   - Search for items in the "Add Item" field
   - Click items in the dropdown to add them
   - Or use items pre-selected from Suggested Orders
5. For each item:
   - Adjust the order quantity as needed
   - Verify the unit cost
6. View the order summary at the bottom
7. Click "Save Draft" to save for later or "Place Order" to finalize

### Managing Current Orders

For orders in progress:

1. View all current orders in the "Current Orders" tab
2. Click on an order to view or edit details
3. Use the status buttons to update an order:
   - "Edit" to modify the order
   - "Cancel" to cancel the order
   - "Mark as Ordered" to update status
   - "Receive" to record delivery

### Receiving Orders

When goods arrive:

1. Find the order in Current Orders
2. Click "Receive"
3. Enter the date received
4. For each item:
   - Enter the quantity received
   - Adjust the unit cost if different from ordered
   - Select the status (Received, Partial, Backordered)
5. Use "Receive All in Full" for quick receiving if everything arrived as ordered
6. Click "Complete Receipt" to update inventory

### Order History

To review past orders:

1. Click the "Order History" tab
2. Use filters to find specific orders:
   - Date range
   - Supplier
   - Status
3. Click on any order to view its complete details
4. Use the "Print" button to generate a printable version

---

## User Management

The User Management section allows administrators to control access to the system.

### User Roles

1. **Administrator**
   - All permissions
   - Can create and manage other users
   - Access to system settings

2. **Inventory Manager**
   - Cannot create users or access system settings
   - Full access to all inventory functions
   - Can create and manage orders

3. **Kitchen Staff**
   - Limited to basic inventory viewing
   - Can perform hot counts
   - Cannot create or modify orders
   - Limited reporting access

### Managing Users

For Administrators:

1. Navigate to Settings > User Management
2. View all current users
3. To add a user:
   - Click "Add User"
   - Enter user details and select role
   - Click "Save"
4. To edit a user:
   - Click on the user in the list
   - Modify details as needed
   - Click "Save"
5. To deactivate a user:
   - Click on the user
   - Toggle the "Active" switch to Off
   - Click "Save"

---

## Google Drive Integration

Google Drive integration provides cloud storage and synchronization for your data.

### Connecting to Google Drive

1. Click the "Connect to Google Drive" button in the header
2. Follow the Google authorization prompts
3. Grant the requested permissions
4. Wait for initial synchronization to complete

### Synchronization

Data synchronization happens:
- Automatically every 30 minutes
- When clicking the "Sync Now" button
- Before major operations like imports

### Managing Google Drive Data

1. Click on your username > Settings
2. Select the "Google Drive" tab
3. View sync status and last sync time
4. Options available:
   - Force synchronization
   - Download backup
   - View sync history
   - Disconnect from Google Drive

### Working Offline

The system will continue to function when offline:

1. Changes are stored locally
2. A "Sync Pending" indicator appears
3. Data will synchronize when connection is restored
4. In case of conflicts, the system will ask for resolution

---

## Troubleshooting

### Common Issues and Solutions

#### System Won't Load
- Clear browser cache and cookies
- Try a different browser
- Check internet connection

#### Data Not Saving
- Check if you're connected to Google Drive
- Verify available storage space
- Try using the "Export" function to back up data

#### Import Errors
- Verify your file format matches the template
- Check for special characters or formatting issues
- Try importing smaller batches

#### Sync Conflicts
1. When conflicts occur, a dialog will appear
2. Review the differences between local and cloud versions
3. Select which version to keep, or merge manually
4. Click "Resolve" to continue

### Getting Help

For additional assistance:
- Click the "Help" icon in the top right corner
- Check the Knowledge Base for common issues
- Contact your system administrator

---

## Glossary

- **Par Level**: The minimum desired quantity of an item
- **Hot Count**: Daily inventory count of high-turnover items
- **Usage**: The amount of an item consumed between counts
- **Suggested Order**: Automatically generated order recommendation based on par levels
- **Primary Supplier**: The preferred vendor for an item
- **Cloud Sync**: The process of synchronizing data with Google Drive

---

This manual provides a comprehensive guide to using the JCCiMS. For technical details or advanced features, please refer to the Administrator Guide or contact your system administrator.
