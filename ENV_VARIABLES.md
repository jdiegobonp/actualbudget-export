# Actual Budget Export - Environment Variables

## Environment Variables

The component supports the following environment variables for configuration:

| Variable | Description | Default |
|----------|-------------|---------|
| `ACTUAL_SERVER_URL` | URL of the Actual Budget server | `http://localhost:5006` |
| `ACTUAL_PASSWORD` | Server password | (empty) |
| `ACTUAL_DATA_DIR` | Directory for local cache | `./actual-data` |
| `ACTUAL_VERBOSE` | Enable detailed logs (`true`/`false`) | `false` |
| `ACTUAL_BUDGET_NAME` | Name of the budget to export | `Expenses` |
| `ACTUAL_EXPORT_BASE_DIR` | Base directory for exports | `./export` |

## Usage with Environment Variables

### Option 1: `.env` File

Create a `.env` file in the project root:

```bash
ACTUAL_SERVER_URL=http://localhost:5006
ACTUAL_PASSWORD=your-password
ACTUAL_DATA_DIR=./actual-data
ACTUAL_VERBOSE=false
ACTUAL_BUDGET_NAME=Expenses
ACTUAL_EXPORT_BASE_DIR=./export
```

Then load them using `dotenv`:

```bash
npm install dotenv
```

```javascript
require('dotenv').config();
const ActualBudgetExport = require('./index');

const exporter = new ActualBudgetExport();
```

### Option 2: Export in Terminal

```bash
export ACTUAL_SERVER_URL=http://localhost:5006
export ACTUAL_PASSWORD=your-password
export ACTUAL_DATA_DIR=./actual-data
export ACTUAL_BUDGET_NAME=Expenses

node export.js
```

### Option 3: Inline When Running

```bash
ACTUAL_SERVER_URL=http://localhost:5006 ACTUAL_PASSWORD=your-password ACTUAL_BUDGET_NAME=Expenses node export.js
```

### Option 4: Docker

```bash
docker run -e ACTUAL_SERVER_URL=http://host:5006 -e ACTUAL_PASSWORD=secret -e ACTUAL_BUDGET_NAME=Expenses -e ACTUAL_EXPORT_BASE_DIR=/app/export node:18 node export.js
```

## Updated Example

```javascript
require('dotenv').config();
const ActualBudgetExport = require('./index');

async function main() {
  // No configuration passed - uses environment variables
  const exporter = new ActualBudgetExport();

  try {
    await exporter.init();
    const budgets = await exporter.getBudgets();
    console.log('Budgets:', budgets);
  } finally {
    await exporter.shutdown();
  }
}

main();
```

## Configuration Priority

1. Constructor parameters (highest priority)
2. Environment variables
3. Default values (lowest priority)

```javascript
// This overrides environment variables
const exporter = new ActualBudgetExport({
  serverURL: 'http://custom-url:5006'  // ← Uses this value
});

// This uses environment variables
const exporter = new ActualBudgetExport();  // ← Uses ACTUAL_SERVER_URL
```
