const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
/**
 * InventoryTurnover Model
 * Stores calculated inventory turnover analysis for items/categories
 */
const inventoryTurnoverSchema = new mongoose.Schema(
  {
    // Analysis Scope
    analysisType: {
      type: String,
      required: true,
      enum: ['item', 'category', 'overall'],
    },
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
    },
    category: String,

    // Time Period
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      required: true,
    },
    periodType: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'],
      default: 'monthly',
    },

    // Stock Levels
    stockLevels: {
      openingStock: {
        type: Number,
        default: 0,
      },
      closingStock: {
        type: Number,
        default: 0,
      },
      averageStock: {
        type: Number,
        default: 0,
      },
      peakStock: {
        type: Number,
        default: 0,
      },
      lowestStock: {
        type: Number,
        default: 0,
      },
    },

    // Movement Metrics
    movement: {
      totalPurchases: {
        type: Number,
        default: 0,
      },
      totalSales: {
        type: Number,
        default: 0,
      },
      totalUsage: {
        type: Number,
        default: 0,
      },
      totalWaste: {
        type: Number,
        default: 0,
      },
      totalAdjustments: {
        type: Number,
        default: 0,
      },
      netMovement: {
        type: Number,
        default: 0,
      },
    },

    // Financial Metrics
    financialMetrics: {
      costOfGoodsSold: {
        type: Number,
        default: 0,
      },
      totalRevenue: {
        type: Number,
        default: 0,
      },
      grossProfit: {
        type: Number,
        default: 0,
      },
      grossMargin: {
        type: Number,
        default: 0,
      },
      averageInventoryValue: {
        type: Number,
        default: 0,
      },
      purchaseValue: {
        type: Number,
        default: 0,
      },
    },

    // Turnover Metrics
    turnoverMetrics: {
      inventoryTurnoverRatio: {
        type: Number,
        default: 0,
      },
      daysInventoryOutstanding: {
        type: Number,
        default: 0,
      },
      stockoutDays: {
        type: Number,
        default: 0,
      },
      stockoutIncidents: {
        type: Number,
        default: 0,
      },
      averageDaysToSell: {
        type: Number,
        default: 0,
      },
    },

    // Performance Indicators
    performance: {
      fastMoving: {
        type: Boolean,
        default: false,
      },
      slowMoving: {
        type: Boolean,
        default: false,
      },
      deadStock: {
        type: Boolean,
        default: false,
      },
      excessStock: {
        type: Boolean,
        default: false,
      },
      underStock: {
        type: Boolean,
        default: false,
      },
    },

    // Transaction Statistics
    transactionStats: {
      totalTransactions: {
        type: Number,
        default: 0,
      },
      purchaseTransactions: {
        type: Number,
        default: 0,
      },
      salesTransactions: {
        type: Number,
        default: 0,
      },
      averageTransactionSize: {
        type: Number,
        default: 0,
      },
      largestTransaction: {
        type: Number,
        default: 0,
      },
    },

    // Recommendations
    insights: {
      reorderNeeded: {
        type: Boolean,
        default: false,
      },
      reorderRecommendedQuantity: Number,
      optimizationNotes: [String],
      alerts: [
        {
          type: String,
          severity: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
          },
          message: String,
        },
      ],
    },

    // Metadata
    calculatedAt: {
      type: Date,
      default: Date.now,
    },
    calculatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
inventoryTurnoverSchema.index({ item: 1, periodStart: 1, periodEnd: 1 });
inventoryTurnoverSchema.index({ category: 1, periodStart: 1, periodEnd: 1 });
inventoryTurnoverSchema.index({ analysisType: 1, periodType: 1 });
inventoryTurnoverSchema.index({ 'turnoverMetrics.inventoryTurnoverRatio': -1 });
inventoryTurnoverSchema.index({ calculatedAt: -1 });

// Virtual for period duration in days
inventoryTurnoverSchema.virtual('periodDurationDays').get(function () {
  if (this.periodStart && this.periodEnd) {
    return Math.ceil((this.periodEnd - this.periodStart) / (1000 * 60 * 60 * 24));
  }
  return 0;
});

// Method to calculate all metrics
inventoryTurnoverSchema.methods.calculateMetrics = function () {
  // Calculate average stock
  this.stockLevels.averageStock =
    (this.stockLevels.openingStock + this.stockLevels.closingStock) / 2;

  // Calculate COGS (Cost of Goods Sold)
  // COGS = Opening Stock + Purchases - Closing Stock
  this.financialMetrics.costOfGoodsSold =
    this.stockLevels.openingStock *
      (this.financialMetrics.averageInventoryValue / Math.max(this.stockLevels.averageStock, 1)) +
    this.financialMetrics.purchaseValue -
    this.stockLevels.closingStock *
      (this.financialMetrics.averageInventoryValue / Math.max(this.stockLevels.averageStock, 1));

  // Calculate gross profit and margin
  this.financialMetrics.grossProfit =
    this.financialMetrics.totalRevenue - this.financialMetrics.costOfGoodsSold;

  if (this.financialMetrics.totalRevenue > 0) {
    this.financialMetrics.grossMargin =
      (this.financialMetrics.grossProfit / this.financialMetrics.totalRevenue) * 100;
  }

  // Calculate inventory turnover ratio
  // Turnover Ratio = COGS / Average Inventory Value
  if (this.financialMetrics.averageInventoryValue > 0) {
    this.turnoverMetrics.inventoryTurnoverRatio =
      this.financialMetrics.costOfGoodsSold / this.financialMetrics.averageInventoryValue;
  }

  // Calculate days inventory outstanding (DIO)
  // DIO = (Average Inventory / COGS) × Period Days
  if (this.financialMetrics.costOfGoodsSold > 0 && this.periodDurationDays > 0) {
    this.turnoverMetrics.daysInventoryOutstanding =
      (this.financialMetrics.averageInventoryValue / this.financialMetrics.costOfGoodsSold) *
      this.periodDurationDays;
  }

  // Calculate average days to sell
  if (this.turnoverMetrics.inventoryTurnoverRatio > 0) {
    this.turnoverMetrics.averageDaysToSell = 365 / this.turnoverMetrics.inventoryTurnoverRatio;
  }

  // Determine performance indicators
  // Fast moving: Turnover ratio > 12 (sells more than once per month)
  this.performance.fastMoving = this.turnoverMetrics.inventoryTurnoverRatio > 12;

  // Slow moving: Turnover ratio < 4 (sells less than once per quarter)
  this.performance.slowMoving =
    this.turnoverMetrics.inventoryTurnoverRatio < 4 &&
    this.turnoverMetrics.inventoryTurnoverRatio > 0;

  // Dead stock: No sales in the period
  this.performance.deadStock = this.movement.totalSales === 0 && this.movement.totalUsage === 0;

  // Excess stock: Closing stock > 3 months of average sales
  const averageMonthlySales = (this.movement.totalSales / this.periodDurationDays) * 30;
  this.performance.excessStock = this.stockLevels.closingStock > averageMonthlySales * 3;

  // Under stock: Had stockout incidents
  this.performance.underStock = this.turnoverMetrics.stockoutIncidents > 0;

  // Generate insights
  this.generateInsights();
};

// Method to generate insights and recommendations
inventoryTurnoverSchema.methods.generateInsights = function () {
  this.insights.optimizationNotes = [];
  this.insights.alerts = [];

  // Fast moving item recommendations
  if (this.performance.fastMoving) {
    this.insights.optimizationNotes.push(
      'High turnover item - consider increasing stock levels to prevent stockouts'
    );
    this.insights.reorderNeeded = this.stockLevels.closingStock < this.stockLevels.averageStock;
  }

  // Slow moving item recommendations
  if (this.performance.slowMoving) {
    this.insights.optimizationNotes.push(
      'Low turnover item - consider reducing order quantities or discontinuing'
    );
    this.insights.alerts.push({
      type: 'slow_moving',
      severity: 'medium',
      message: 'Item has low turnover rate',
    });
  }

  // Dead stock alerts
  if (this.performance.deadStock) {
    this.insights.alerts.push({
      type: 'dead_stock',
      severity: 'high',
      message: 'No sales/usage in this period - review item necessity',
    });
  }

  // Stockout alerts
  if (this.turnoverMetrics.stockoutIncidents > 0) {
    this.insights.alerts.push({
      type: 'stockout',
      severity: 'critical',
      message: `${this.turnoverMetrics.stockoutIncidents} stockout incidents - increase reorder point`,
    });
  }

  // Excess stock alerts
  if (this.performance.excessStock) {
    this.insights.alerts.push({
      type: 'excess_stock',
      severity: 'low',
      message: 'Stock levels exceed 3 months of average usage',
    });
  }

  // Calculate recommended reorder quantity
  if (this.insights.reorderNeeded && this.movement.totalSales > 0) {
    const averageDailySales = this.movement.totalSales / this.periodDurationDays;
    // Recommend enough for 30 days plus safety stock (25%)
    this.insights.reorderRecommendedQuantity = Math.ceil(averageDailySales * 30 * 1.25);
  }
};

// Static method to generate turnover analysis for an item
inventoryTurnoverSchema.statics.generateAnalysis = async function (
  itemId,
  periodStart,
  periodEnd,
  periodType = 'custom'
) {
  const InventoryItem = mongoose.model('InventoryItem');
  const InventoryTransaction = mongoose.model('InventoryTransaction');

  const item = await InventoryItem.findById(itemId);
  if (!item) {
    throw new Error('Item not found');
  }

  // Get all transactions in period
  const transactions = await InventoryTransaction.find({
    item: itemId,
    transactionDate: {
      $gte: periodStart,
      $lte: periodEnd,
    },
  }).sort({ transactionDate: 1 });

  // Get opening stock (stock at start of period)
  const openingStockTrans = await InventoryTransaction.findOne({
    item: itemId,
    transactionDate: { $lt: periodStart },
  }).sort({ transactionDate: -1 });

  const analysis = new this({
    analysisType: 'item',
    item: itemId,
    category: item.category,
    periodStart,
    periodEnd,
    periodType,
  });

  // Set opening stock
  analysis.stockLevels.openingStock = openingStockTrans ? openingStockTrans.stockAfter : 0;

  // Process transactions
  let runningStock = analysis.stockLevels.openingStock;
  let totalStockSamples = 0;
  let stockSum = 0;

  transactions.forEach((trans) => {
    // Update stock tracking
    if (trans.stockAfter !== undefined) {
      runningStock = trans.stockAfter;
      stockSum += runningStock;
      totalStockSamples += 1;
    }

    // Track peak and lowest
    if (runningStock > analysis.stockLevels.peakStock) {
      analysis.stockLevels.peakStock = runningStock;
    }
    if (runningStock < analysis.stockLevels.lowestStock || analysis.stockLevels.lowestStock === 0) {
      analysis.stockLevels.lowestStock = runningStock;
    }

    // Count stockouts
    if (runningStock === 0) {
      analysis.turnoverMetrics.stockoutIncidents += 1;
    }

    // Accumulate movements by type
    switch (trans.transactionType) {
      case 'purchase':
        analysis.movement.totalPurchases += trans.quantity;
        analysis.financialMetrics.purchaseValue += trans.totalCost || 0;
        break;
      case 'sale':
        analysis.movement.totalSales += trans.quantity;
        analysis.financialMetrics.totalRevenue += trans.totalPrice || 0;
        break;
      case 'usage':
        analysis.movement.totalUsage += trans.quantity;
        break;
      case 'waste':
        analysis.movement.totalWaste += trans.quantity;
        break;
      case 'adjustment':
        analysis.movement.totalAdjustments += trans.quantity;
        break;
    }

    // Transaction statistics
    analysis.transactionStats.totalTransactions += 1;
    if (trans.transactionType === 'purchase') {
      analysis.transactionStats.purchaseTransactions += 1;
    }
    if (trans.transactionType === 'sale') {
      analysis.transactionStats.salesTransactions += 1;
    }
    if (trans.quantity > analysis.transactionStats.largestTransaction) {
      analysis.transactionStats.largestTransaction = trans.quantity;
    }
  });

  // Set closing stock (current stock or last transaction)
  analysis.stockLevels.closingStock = item.currentStock;

  // Calculate average stock from samples
  if (totalStockSamples > 0) {
    analysis.stockLevels.averageStock = stockSum / totalStockSamples;
  } else {
    analysis.stockLevels.averageStock =
      (analysis.stockLevels.openingStock + analysis.stockLevels.closingStock) / 2;
  }

  // Calculate average inventory value
  analysis.financialMetrics.averageInventoryValue =
    analysis.stockLevels.averageStock * item.costPrice;

  // Calculate average transaction size
  if (analysis.transactionStats.totalTransactions > 0) {
    analysis.transactionStats.averageTransactionSize =
      (analysis.movement.totalPurchases + analysis.movement.totalSales) /
      analysis.transactionStats.totalTransactions;
  }

  // Calculate all derived metrics
  analysis.calculateMetrics();

  return analysis;
};

module.exports = mongoose.model('InventoryTurnover', inventoryTurnoverSchema);
