# JCC Inventory Management System (JCCiMS)

A comprehensive, modular inventory management system designed for kitchen and food service operations. This web-based application helps manage inventory, track usage, automate ordering processes, and generate analytical reports.

## Features

### Core Inventory Management
- Store and manage inventory items with detailed information
- Track storage locations, food categories, and units of measurement
- Set and monitor par levels with visual indicators
- Include photo references for items

### Supplier Management
- Track multiple suppliers for each item
- Compare pricing between suppliers
- Monitor cost history over time

### Ordering Process
- Automatically identify items below par level
- Generate suggested orders
- Create, edit, and track orders
- Receive orders and update inventory

### Hot Counts System
- Track daily usage of high-turnover items
- Perform morning and evening counts
- View usage history and trends

### Import/Export Functionality
- Import data from CSV and Excel files
- Intuitive column mapping interface
- Export data for backups

### Data Persistence
- Google Drive integration for cloud storage
- Local storage fallback for offline use
- Manual export/import for data backups

### Responsive Design
- Works on desktop, tablet, and mobile devices
- Optimized UI for different screen sizes

## Project Structure

```
jcc-kitchen-inventory/
│
├── index.html                 # Main HTML structure
├── styles/
│   ├── main.css               # Core styles and layout
│   ├── components.css         # UI component styles
│   ├── modules.css            # Module-specific styles
│   └── responsive.css         # Media queries for responsive design
│
├── scripts/
│   ├── app.js                 # Main application initialization
│   ├── modules/
│   │   ├── moduleSystem.js    # Core module loader
│   │   ├── inventory.js       # Inventory module functionality
│   │   ├── import.js          # Import module functionality
│   │   ├── hotcounts.js       # Hot counts module functionality
│   │   └── orders.js          # Orders module functionality
│   │
│   ├── storage/
│   │   ├── googleDrive.js     # Google Drive integration
│   │   └── localStore.js      # Local storage handling
│   │
│   └── utils/
│       ├── fileParser.js      # Functions for parsing files
│       ├── ui.js              # Shared UI utilities
│       └── dataUtils.js       # Data manipulation utilities
│
└── templates/
    ├── home.html              # Home module template
    ├── inventory.html         # Inventory module template
    ├── import.html            # Import module template
    ├── hotcounts.html         # Hot counts module template
    └── orders.html            # Orders module template
```

## Data Model

### Item Objects
```json
{
  "id": "item-123",
  "name": "Chicken Breast",
  "category": "Meat",
  "location": "Walk-in Cooler",
  "unit": "lb",
  "currentQuantity": 25,
  "parLevel": 40,
  "isHotCount": true,
  "suppliers": ["supplier-1", "supplier-2"],
  "primarySupplier": "supplier-1",
  "lastCost": 3.99,
  "photoUrl": "https://example.com/chicken.jpg",
  "notes": "Boneless, skinless",
  "priceHistory": [
    {"date": "2025-04-15", "price": 3.89, "supplier": "supplier-1"},
    {"date": "2025-05-01", "price": 3.99, "supplier": "supplier-1"}
  ],
  "usageHistory": [
    {"date": "2025-05-19", "usage": 12},
    {"date": "2025-05-18", "usage": 8}
  ]
}
```

### Supplier Records
```json
{
  "id": "supplier-1",
  "name": "Metro Food Service",
  "contactName": "John Smith",
  "phone": "555-123-4567",
  "email": "john@metrofoodservice.com",
  "orderDays": ["Monday", "Wednesday", "Friday"],
  "notes": "Orders must be placed by 2pm day before"
}
```

### Hot Count Records
```json
{
  "id": "hc-20250520-1",
  "date": "2025-05-20",
  "type": "morning",
  "timestamp": "2025-05-20T08:15:30",
  "completedBy": "User Name",
  "items": [
    {
      "itemId": "item-123",
      "previousCount": 25,
      "currentCount": 25,
      "usage": 0,
      "notes": ""
    },
    {
      "itemId": "item-456",
      "previousCount": 18,
      "currentCount": 12,
      "usage": 6,
      "notes": "Used for breakfast service"
    }
  ]
}
```

### Order Objects
```json
{
  "id": "order-789",
  "supplier": "supplier-1",
  "dateCreated": "2025-05-20",
  "dateOrdered": "2025-05-20",
  "dateReceived": null,
  "status": "ordered",
  "notes": "Rush order for event",
  "items": [
    {
      "itemId": "item-123",
      "name": "Chicken Breast",
      "quantity": 30,
      "unit": "lb",
      "unitCost": 3.99,
      "receivedQuantity": null,
      "status": "pending"
    }
  ],
  "subtotal": 119.70,
  "tax": 0,
  "shipping": 0,
  "total": 119.70
}
```

## Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Web server for hosting files (for local development, you can use VSCode's Live Server extension)
- Google Cloud Platform account (for Google Drive integration)

### Setup

1. **Clone or download the repository**
   ```
   git clone https://github.com/your-username/jcc-kitchen-inventory.git
   ```

2. **Set up Google Drive integration (optional but recommended)**
   - Create a new project in the Google Cloud Platform Console
   - Enable the Google Drive API
   - Create OAuth 2.0 credentials
   - Replace the placeholder in `googleDrive.js` with your Client ID:
     ```javascript
     const CLIENT_ID = 'YOUR_CLIENT_ID';
     ```

3. **Serve the files using a web server**
   - Using VSCode Live Server extension: Right-click on `index.html` and select "Open with Live Server"
   - Using Python's built-in server:
     ```
     python -m http.server
     ```
   - Then open `http://localhost:8000` in your browser

4. **Connect to Google Drive (if configured)**
   - Click the "Connect to Google Drive" button
   - Authorize the application to access your Google Drive

### Initial Setup

1. **Configure categories and locations**
   - Add your specific food categories (e.g., Produce, Meat, Dairy)
   - Add storage locations (e.g., Walk-in Cooler, Freezer, Dry Storage)

2. **Add suppliers**
   - Enter your supplier information
   - Include contact details and ordering schedules

3. **Import initial inventory**
   - Use the Import module to import existing inventory data
   - Or manually add items through the Inventory module

## Usage

### Managing Inventory
- Navigate to the Inventory module
- Add new items using the "Add Item" button
- Edit items by clicking on them
- Filter by category, location, or search for specific items

### Running Hot Counts
- Navigate to the Hot Counts module
- Click "Start New Count" and select Morning or Evening
- Enter quantities for each item
- Save the count when complete

### Creating Orders
- Navigate to the Orders module
- View suggested orders based on par levels
- Create a new order by selecting items
- Track order status and receive deliveries

### Importing Data
- Navigate to the Import module
- Upload a CSV or Excel file
- Map the columns to the appropriate fields
- Preview and confirm the import

## Troubleshooting

### Data Not Saving
- Check if you're connected to Google Drive
- Verify you have proper permissions
- Try using the manual export feature and save the file locally

### Import Errors
- Ensure your file format is correct (CSV or Excel)
- Check column headings and data formats
- Try the template download feature to get the correct format

### Display Issues
- Clear your browser cache
- Try a different browser
- Check for JavaScript errors in the browser console

## Future Enhancements

- User authentication and multi-user support
- Barcode scanning for inventory and receiving
- Advanced reporting and analytics
- Recipe management and cost calculation
- Integration with point-of-sale systems

## Support

For issues, feature requests, or questions, please contact the JCC Kitchen Inventory System team at support@jccinventory.com or open an issue on the project repository.
