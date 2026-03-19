require('dotenv').config();

if (typeof navigator === 'undefined') {
  global.navigator = { platform: process.platform };
}

const ActualBudgetExport = require('./index');
const fs = require('fs');
const path = require('path');

const dateString = new Date().toISOString().split('T')[0];
const exportBaseDir = process.env.ACTUAL_EXPORT_BASE_DIR || './export';
const datedExportDir = `${exportBaseDir}/${dateString}`;

if (!fs.existsSync(datedExportDir)) {
  fs.mkdirSync(datedExportDir, { recursive: true });
}

const dataDir = process.env.ACTUAL_DATA_DIR || './actual-data';
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

async function example() {
  const exporter = new ActualBudgetExport();

  try {
    await exporter.init();

    const budgets = await exporter.getBudgets();
    console.log('Available budgets:', budgets.map(b => ({ name: b.name, id: b.cloudFileId || b.id })));

    if (budgets.length > 0) {
      const budgetName = process.env.ACTUAL_BUDGET_NAME || 'Expenses';
      const expensesBudget = budgets.find(b => b.name === budgetName) || budgets[0];
      const budgetId = expensesBudget.cloudFileId || expensesBudget.id;
      
      console.log(`Using budget: ${expensesBudget.name}`);
      console.log(`Budget ID: ${budgetId}`);
      
      await exporter.downloadBudget(budgetId);
      
      await exporter.exportFullData(budgetId, `${datedExportDir}/full-data.json`);
      console.log(`Complete data exported to ${datedExportDir}/full-data.json`);

      await exporter.exportBudgetToFile(budgetId, `${datedExportDir}/budget-info.json`);
      console.log(`Budget info exported to ${datedExportDir}/budget-info.json`);

      const accounts = await exporter.getAccounts();
      console.log(`Accounts found: ${accounts.length}`);
      
      if (accounts.length > 0) {
        const accountId = accounts[0].id;
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = '2024-01-01';
        
        const transactions = await exporter.getTransactions(accountId, startDate, endDate);
        console.log(`Transactions exported: ${transactions.length}`);
        
        await exporter.exportTransactionsToFile(accountId, startDate, endDate, `${datedExportDir}/transactions.json`);
        await exporter.exportToCSV(transactions, `${datedExportDir}/transactions.csv`);
        console.log('Transactions saved in JSON and CSV');
      }
      
      await exporter.exportDatabaseZip(budgetId, `${datedExportDir}/${expensesBudget.name.toLowerCase()}-database.zip`);
      console.log(`Database exported as ZIP to ${datedExportDir}/${expensesBudget.name.toLowerCase()}-database.zip`);
      console.log('This ZIP contains db.sqlite and metadata.json, same as the "Export Data" option in the GUI');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await exporter.shutdown();
  }
}

example();
