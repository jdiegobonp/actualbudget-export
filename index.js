const api = require('@actual-app/api');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

class ActualBudgetExport {
  constructor(config = {}) {
    this.config = {
      serverURL: config.serverURL || process.env.ACTUAL_SERVER_URL || 'http://localhost:5006',
      password: config.password || process.env.ACTUAL_PASSWORD || '',
      dataDir: config.dataDir || process.env.ACTUAL_DATA_DIR || './actual-data',
      verbose: config.verbose || process.env.ACTUAL_VERBOSE === 'true',
    };
    this.initialized = false;
  }

  async init() {
    if (!this.initialized) {
      await api.init(this.config);
      this.initialized = true;
    }
  }

  async shutdown() {
    if (this.initialized) {
      await api.shutdown();
      this.initialized = false;
    }
  }

  async getBudgets() {
    await this.init();
    return await api.getBudgets();
  }

  async getAccounts() {
    await this.init();
    return await api.getAccounts();
  }

  async getTransactions(accountId, startDate, endDate) {
    await this.init();
    return await api.getTransactions(accountId, startDate, endDate);
  }

  async downloadBudget(syncId, password = null) {
    await this.init();
    await api.internal.send('download-budget', { cloudFileId: syncId });
  }

  async loadBudget(syncId) {
    await this.init();
    await api.loadBudget(syncId);
  }

  async exportBudgetToFile(syncId, outputPath, password = null) {
    await this.init();
    
    await api.internal.send('download-budget', { cloudFileId: syncId });
    
    const budgets = await api.getBudgets();
    const budget = budgets.find(b => b.cloudFileId === syncId || b.id === syncId);
    
    if (!budget) {
      throw new Error(`Budget with syncId ${syncId} not found`);
    }

    const budgetData = {
      name: budget.name,
      cloudFileId: budget.cloudFileId,
      groupId: budget.groupId,
      hasKey: budget.hasKey,
      encryptKeyId: budget.encryptKeyId,
      exportedAt: new Date().toISOString(),
    };

    fs.writeFileSync(outputPath, JSON.stringify(budgetData, null, 2));
    
    return budgetData;
  }

  async exportFullData(syncId, outputPath, password = null) {
    await this.init();
    
    await api.internal.send('download-budget', { cloudFileId: syncId });
    
    const accounts = await api.getAccounts();
    const categories = await api.getCategories();
    const categoryGroups = await api.getCategoryGroups();
    const payees = await api.getPayees();
    const tags = await api.getTags();
    const rules = await api.getRules();
    const schedules = await api.getSchedules();
    const budgetMonths = await api.getBudgetMonths();
    
    const exportData = {
      exportedAt: new Date().toISOString(),
      budgetMonths,
      accounts,
      categories,
      categoryGroups,
      payees,
      tags,
      rules,
      schedules,
    };

    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
    
    return exportData;
  }

  async exportTransactionsToFile(accountId, startDate, endDate, outputPath) {
    await this.init();
    
    const transactions = await api.getTransactions(accountId, startDate, endDate);
    
    fs.writeFileSync(outputPath, JSON.stringify(transactions, null, 2));
    
    return transactions;
  }

  async exportToCSV(transactions, outputPath) {
    const headers = ['id', 'account', 'date', 'amount', 'payee_name', 'category', 'notes', 'cleared'];
    const csvRows = [headers.join(',')];
    
    for (const transaction of transactions) {
      const row = [
        transaction.id,
        transaction.account,
        transaction.date,
        transaction.amount,
        transaction.payee_name || '',
        transaction.category || '',
        (transaction.notes || '').replace(/,/g, ';'),
        transaction.cleared,
      ].map(field => `"${field}"`).join(',');
      
      csvRows.push(row);
    }
    
    fs.writeFileSync(outputPath, csvRows.join('\n'));
    
    return csvRows.length - 1;
  }

  async exportDatabaseZip(syncId, outputPath, password = null) {
    await this.init();
    
    // Ensure the budget is downloaded
    await api.internal.send('download-budget', { cloudFileId: syncId });
    
    // Wait for download to complete
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Get the updated list of budgets to find the local id
    const budgets = await api.getBudgets();
    const budget = budgets.find(b => b.cloudFileId === syncId || b.id === syncId);
    
    if (!budget) {
      throw new Error(`Budget with cloudFileId ${syncId} not found`);
    }
    
    // Check if the budget is available locally (has an 'id' field)
    if (!budget.id) {
      throw new Error(`Budget with cloudFileId ${syncId} is not available locally. Download may have failed.`);
    }
    
    // Construct the path to the budget's local directory
    const budgetDir = path.join(this.config.dataDir, budget.id);
    
    // Check if the directory exists
    if (!fs.existsSync(budgetDir)) {
      throw new Error(`Budget directory not found: ${budgetDir}`);
    }
    
    // Create a zip archive of the budget directory
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Sets the compression level.
    });
    
    // Listen for all archive data to be written
    output.on('close', () => {
      console.log(`${archive.pointer()} total bytes`);
      console.log('Archiver has been finalized and the output file descriptor has closed.');
    });
    
    // This event is fired when the data source is drained regardless of what was in the data source.
    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn(err);
      } else {
        throw err;
      }
    });
    
    // Good practice to catch this error explicitly
    archive.on('error', (err) => {
      throw err;
    });
    
    // Pipe archive data to the output file
    archive.pipe(output);
    
    // Append the budget directory contents
    archive.directory(budgetDir, false);
    
    // Finalize the archive
    await archive.finalize();
    
    return outputPath;
  }
}

module.exports = ActualBudgetExport;