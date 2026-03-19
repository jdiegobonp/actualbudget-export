# Actual Budget Export

Node.js component to export data from Actual Budget using the official `@actual-app/api`.

## Installation

```bash
npm install
```

## Usage

### Main Class: `ActualBudgetExport`

```javascript
const ActualBudgetExport = require('./index');

const exporter = new ActualBudgetExport({
  serverURL: 'http://localhost:5006',
  password: 'your-password',
  dataDir: './actual-data',
  verbose: false,
});
```

### Available Methods

#### `init()`
Initializes the connection to the Actual Budget server.

#### `shutdown()`
Closes the connection and cleans up resources.

#### `getBudgets()`
Returns a list of all available budgets.

```javascript
const budgets = await exporter.getBudgets();
```

#### `downloadBudget(syncId, password)`
Downloads a specific budget from the server.

```javascript
await exporter.downloadBudget('budget-sync-id');
```

#### `loadBudget(syncId)`
Loads a locally cached budget.

```javascript
await exporter.loadBudget('budget-sync-id');
```

#### `exportBudgetToFile(syncId, outputPath, password)`
Exports basic budget information to a JSON file.

```javascript
await exporter.exportBudgetToFile('budget-sync-id', './budget-info.json');
```

#### `exportFullData(syncId, outputPath, password)`
Exports all budget data including:
- Budget months
- Accounts
- Categories
- Category groups
- Payees
- Tags
- Rules
- Schedules

```javascript
await exporter.exportFullData('budget-sync-id', './full-data.json');
```

#### `getTransactions(accountId, startDate, endDate)`
Gets transactions for an account within a date range.

```javascript
const transactions = await exporter.getTransactions(
  'account-id',
  '2024-01-01',
  '2024-12-31'
);
```

#### `exportTransactionsToFile(accountId, startDate, endDate, outputPath)`
Exports transactions to a JSON file.

```javascript
await exporter.exportTransactionsToFile(
  'account-id',
  '2024-01-01',
  '2024-12-31',
  './transactions.json'
);
```

#### `exportToCSV(transactions, outputPath)`
Exports transactions to CSV format.

```javascript
await exporter.exportToCSV(transactions, './transactions.csv');
```

#### `exportDatabaseZip(syncId, outputPath, password)`
Exports the budget as a ZIP file containing `db.sqlite` and `metadata.json`, identical to the "Export Data" option in Actual Budget's GUI.

```javascript
await exporter.exportDatabaseZip('budget-sync-id', './export/database-backup.zip');
```

## Complete Example

```javascript
const ActualBudgetExport = require('./index');
const fs = require('fs');
const path = require('path');

// Get current date in YYYY-MM-DD format for folder name
const dateString = new Date().toISOString().split('T')[0];
const exportBaseDir = `./export/${dateString}`;

// Ensure export directory exists
if (!fs.existsSync(exportBaseDir)) {
  fs.mkdirSync(exportBaseDir, { recursive: true });
}

async function main() {
  const exporter = new ActualBudgetExport();

  try {
    await exporter.init();

    const budgets = await exporter.getBudgets();
    console.log('Available budgets:', budgets.map(b => ({ name: b.name, id: b.cloudFileId || b.id })));

    if (budgets.length > 0) {
      const budgetName = process.env.ACTUAL_BUDGET_NAME || 'Expenses';
      const budget = budgets.find(b => b.name === budgetName) || budgets[0];
      const budgetId = budget.cloudFileId || budget.id;
      
      console.log(`Using budget: ${budget.name}`);
      console.log(`Budget ID: ${budgetId}`);
      
      await exporter.downloadBudget(budgetId);
      
      await exporter.exportFullData(budgetId, `${exportBaseDir}/full-data.json`);
      console.log(`Complete data exported to ${exportBaseDir}/full-data.json`);

      await exporter.exportBudgetToFile(budgetId, `${exportBaseDir}/budget-info.json`);
      console.log(`Budget info exported to ${exportBaseDir}/budget-info.json`);
      
      const accounts = await exporter.getAccounts();
      console.log(`Accounts found: ${accounts.length}`);
      
      if (accounts.length > 0) {
        const accountId = accounts[0].id;
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = '2024-01-01';
        
        const transactions = await exporter.getTransactions(accountId, startDate, endDate);
        console.log(`Transactions exported: ${transactions.length}`);
        
        await exporter.exportTransactionsToFile(accountId, startDate, endDate, `${exportBaseDir}/transactions.json`);
        await exporter.exportToCSV(transactions, `${exportBaseDir}/transactions.csv`);
        console.log('Transactions saved in JSON and CSV');
      }
      
      // Export the SQLite database as ZIP (matching Actual Budget's Export Data option)
      await exporter.exportDatabaseZip(budgetId, `${exportBaseDir}/${budget.name.toLowerCase()}-database.zip`);
      console.log(`Database exported as ZIP to ${exportBaseDir}/${budget.name.toLowerCase()}-database.zip`);
      console.log('This ZIP contains db.sqlite and metadata.json, same as the "Export Data" option in the GUI');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await exporter.shutdown();
  }
}

main();
```

## Running the Example

```bash
node export.js
```

The script will create a folder with the current date (YYYY-MM-DD) inside the `export/` directory and place all exported files there. The budget name can be customized using the `ACTUAL_BUDGET_NAME` environment variable (defaults to "Expenses"). The budget name can be customized using the `ACTUAL_BUDGET_NAME` environment variable (defaults to "Expenses").

## Export Structure Example

```
export/
├── 2026-03-18/
│   ├── full-data.json
│   ├── budget-info.json
│   ├── transactions.json
│   ├── transactions.csv
│   └── expenses-database.zip
└── 2026-03-19/
    ├── full-data.json
    ├── budget-info.json
    ├── transactions.json
    ├── transactions.csv
    └── expenses-database.zip
```

## Exported Data Structure

### Full Data Export

```json
{
  "exportedAt": "2024-01-15T10:30:00.000Z",
  "budgetMonths": [...],
  "accounts": [...],
  "categories": [...],
  "categoryGroups": [...],
  "payees": [...],
  "tags": [...],
  "rules": [...],
  "schedules": [...]
}
```

### CSV Format

```
id,account,date,amount,payee_name,category,notes,cleared
```

### Database ZIP

The ZIP file generated by `exportDatabaseZip` contains exactly the same files as the "Export Data" option in Actual Budget's GUI:
- `db.sqlite` - SQLite database of the budget
- `metadata.json` - Budget metadata

## Requirements

- Node.js 16+
- Actual Budget server running (optional for local mode)
- `@actual-app/api` package installed
- `archiver` package installed (for creating ZIP files)

## Docker Usage

### Building and Running Locally

```bash
# Build the Docker image
docker build -t actualbudget-export .

# Run the container (replace with your actual environment variables)
docker run --rm \
  -e ACTUAL_SERVER_URL=http://your-actual-server:5006 \
  -e ACTUAL_PASSWORD=your-password \
  -e ACTUAL_EXPORT_BASE_DIR=/app/export \
  -v $(pwd)/export:/app/export \
  actualbudget-export
```

### Building and Pushing Multi-Architecture Image (for Kubernetes)

To build and push a multi-arch image (e.g., for AMD64 and ARM64) using Docker Buildx, follow these steps:

1. Ensure you have Docker Buildx set up (comes with Docker Desktop on Mac). You can create a builder instance if needed:
   ```bash
   docker buildx create --use
   ```

2. Build and push the image to a container registry (replace `your-registry` and `image-tag`):
   ```bash
   docker buildx build --platform linux/amd64,linux/arm64 \
     -t your-registry/actualbudget-export:latest \
     --push .
   ```

3. Then, in your Kubernetes deployment, use the image `your-registry/actualbudget-export:latest`.

Note: Remember to set the required environment variables (ACTUAL_SERVER_URL, ACTUAL_PASSWORD, etc.) in your Kubernetes deployment or as secrets.

The `-v $(pwd)/export:/app/export` flag mounts the local `export` directory into the container so that the exported files are persisted on the host machine.

## License

MIT
