const express = require('express');


const { protect, authorize } = require('../middleware/auth');
const InventoryItem = require('../models/InventoryItem');
const InventoryTransaction = require('../models/InventoryTransaction');
const InventoryTurnover = require('../models/InventoryTurnover');
/**
 * Inventory Routes
 * Inventory management and turnover analysis endpoints
 */

const router = express.Router();
// ============================================
// INVENTORY ITEM MANAGEMENT
// ============================================

/**
 * @route   GET /api/inventory/items
 * @desc    Get all inventory items
 * @access  Private (Admin/Full Access)
 */
router.get('/items', protect, authorize('full_access', 'admin_billing'), async (req, res) => {
  try {
    const { category, active, lowStock, search } = req.query;

    const query = {};
    if (category) query.category = category;
    if (active !== undefined) query.active = active === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    let items = await InventoryItem.find(query).sort({ name: 1 });

    // Filter for low stock if requested
    if (lowStock === 'true') {
      items = items.filter((item) => item.currentStock <= item.reorderPoint);
    }

    res.json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch inventory items',
    });
  }
});

/**
 * @route   POST /api/inventory/items
 * @desc    Create new inventory item
 * @access  Private (Admin/Full Access)
 */
router.post('/items', protect, authorize('full_access'), async (req, res) => {
  try {
    const itemData = {
      ...req.body,
      createdBy: req.user._id,
    };

    const item = await InventoryItem.create(itemData);

    // Create initial stock transaction if stock is provided
    if (item.currentStock > 0) {
      await InventoryTransaction.create({
        item: item._id,
        transactionType: 'initial',
        quantity: item.currentStock,
        stockBefore: 0,
        stockAfter: item.currentStock,
        unitCost: item.costPrice,
        totalCost: item.currentStock * item.costPrice,
        recordedBy: req.user._id,
      });
    }

    res.status(201).json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error('Error creating inventory item:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create inventory item',
    });
  }
});

/**
 * @route   GET /api/inventory/items/:id
 * @desc    Get single inventory item
 * @access  Private
 */
router.get('/items/:id', protect, async (req, res) => {
  try {
    const item = await InventoryItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found',
      });
    }

    res.json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch inventory item',
    });
  }
});

/**
 * @route   PUT /api/inventory/items/:id
 * @desc    Update inventory item
 * @access  Private (Admin/Full Access)
 */
router.put('/items/:id', protect, authorize('full_access'), async (req, res) => {
  try {
    const item = await InventoryItem.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedBy: req.user._id,
      },
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found',
      });
    }

    res.json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error('Error updating inventory item:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update inventory item',
    });
  }
});

/**
 * @route   DELETE /api/inventory/items/:id
 * @desc    Delete inventory item (soft delete)
 * @access  Private (Admin/Full Access)
 */
router.delete('/items/:id', protect, authorize('full_access'), async (req, res) => {
  try {
    const item = await InventoryItem.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found',
      });
    }

    res.json({
      success: true,
      message: 'Item deactivated successfully',
    });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete inventory item',
    });
  }
});

// ============================================
// INVENTORY TRANSACTIONS
// ============================================

/**
 * @route   POST /api/inventory/transactions
 * @desc    Record inventory transaction
 * @access  Private
 */
router.post('/transactions', protect, async (req, res) => {
  try {
    const { item: itemId, transactionType, quantity, ...otherData } = req.body;

    const item = await InventoryItem.findById(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found',
      });
    }

    const stockBefore = item.currentStock;
    let stockAfter = stockBefore;

    // Calculate stock after based on transaction type
    switch (transactionType) {
      case 'purchase':
      case 'return':
      case 'adjustment':
        if (transactionType === 'adjustment' && quantity < 0) {
          stockAfter = stockBefore + quantity;
        } else {
          stockAfter = stockBefore + Math.abs(quantity);
        }
        break;
      case 'sale':
      case 'usage':
      case 'waste':
      case 'transfer':
        stockAfter = stockBefore - Math.abs(quantity);
        break;
    }

    // Check for negative stock
    if (stockAfter < 0 && !item.allowNegativeStock) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient stock',
        available: stockBefore,
        requested: quantity,
      });
    }

    // Create transaction
    const transaction = await InventoryTransaction.create({
      item: itemId,
      transactionType,
      quantity: Math.abs(quantity),
      stockBefore,
      stockAfter,
      unitCost: otherData.unitCost || item.costPrice,
      unitPrice: otherData.unitPrice || item.sellingPrice,
      recordedBy: req.user._id,
      ...otherData,
    });

    // Update item stock
    item.currentStock = stockAfter;
    if (transactionType === 'purchase') {
      item.lastRestocked = new Date();
    } else if (transactionType === 'sale' || transactionType === 'usage') {
      item.lastSold = new Date();
    }
    await item.save();

    res.status(201).json({
      success: true,
      data: transaction,
      updatedStock: stockAfter,
    });
  } catch (error) {
    console.error('Error recording transaction:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to record transaction',
    });
  }
});

/**
 * @route   GET /api/inventory/transactions
 * @desc    Get inventory transactions
 * @access  Private
 */
router.get('/transactions', protect, async (req, res) => {
  try {
    const { item, transactionType, startDate, endDate, page = 1, limit = 50 } = req.query;

    const query = {};
    if (item) query.item = item;
    if (transactionType) query.transactionType = transactionType;
    if (startDate || endDate) {
      query.transactionDate = {};
      if (startDate) query.transactionDate.$gte = new Date(startDate);
      if (endDate) query.transactionDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [transactions, total] = await Promise.all([
      InventoryTransaction.find(query)
        .populate('item', 'name sku category')
        .populate('recordedBy', 'firstName lastName')
        .populate('patient', 'firstName lastName')
        .sort({ transactionDate: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      InventoryTransaction.countDocuments(query),
    ]);

    res.json({
      success: true,
      count: transactions.length,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
      data: transactions,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions',
    });
  }
});

// ============================================
// INVENTORY TURNOVER ANALYSIS
// ============================================

/**
 * @route   POST /api/inventory/turnover/generate
 * @desc    Generate turnover analysis for an item or category
 * @access  Private (Admin/Billing)
 */
router.post(
  '/turnover/generate',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { itemId, category, periodStart, periodEnd, periodType } = req.body;

      if (!periodStart || !periodEnd) {
        return res.status(400).json({
          success: false,
          error: 'periodStart and periodEnd are required',
        });
      }

      if (!itemId && !category) {
        return res.status(400).json({
          success: false,
          error: 'Either itemId or category is required',
        });
      }

      let analysis;

      if (itemId) {
        // Check if analysis already exists
        const existing = await InventoryTurnover.findOne({
          item: itemId,
          periodStart: new Date(periodStart),
          periodEnd: new Date(periodEnd),
        });

        if (existing) {
          return res.json({
            success: true,
            message: 'Analysis already exists for this period',
            data: existing,
            cached: true,
          });
        }

        // Generate new analysis
        analysis = await InventoryTurnover.generateAnalysis(
          itemId,
          new Date(periodStart),
          new Date(periodEnd),
          periodType || 'custom'
        );

        analysis.calculatedBy = req.user._id;
        await analysis.save();
      } else if (category) {
        // Generate category-level analysis
        const items = await InventoryItem.find({ category, active: true });

        if (items.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'No items found in this category',
          });
        }

        // Generate analysis for each item and aggregate
        const itemAnalyses = await Promise.all(
          items.map((item) =>
            InventoryTurnover.generateAnalysis(
              item._id,
              new Date(periodStart),
              new Date(periodEnd),
              periodType || 'custom'
            )
          )
        );

        // Create aggregated category analysis
        analysis = new InventoryTurnover({
          analysisType: 'category',
          category,
          periodStart: new Date(periodStart),
          periodEnd: new Date(periodEnd),
          periodType: periodType || 'custom',
          calculatedBy: req.user._id,
        });

        // Aggregate metrics from all items
        itemAnalyses.forEach((itemAnalysis) => {
          analysis.stockLevels.openingStock += itemAnalysis.stockLevels.openingStock;
          analysis.stockLevels.closingStock += itemAnalysis.stockLevels.closingStock;
          analysis.movement.totalPurchases += itemAnalysis.movement.totalPurchases;
          analysis.movement.totalSales += itemAnalysis.movement.totalSales;
          analysis.movement.totalUsage += itemAnalysis.movement.totalUsage;
          analysis.movement.totalWaste += itemAnalysis.movement.totalWaste;
          analysis.financialMetrics.purchaseValue += itemAnalysis.financialMetrics.purchaseValue;
          analysis.financialMetrics.totalRevenue += itemAnalysis.financialMetrics.totalRevenue;
          analysis.financialMetrics.averageInventoryValue +=
            itemAnalysis.financialMetrics.averageInventoryValue;
          analysis.transactionStats.totalTransactions +=
            itemAnalysis.transactionStats.totalTransactions;
        });

        analysis.calculateMetrics();
        await analysis.save();
      }

      res.json({
        success: true,
        message: 'Turnover analysis generated successfully',
        data: analysis,
        cached: false,
      });
    } catch (error) {
      console.error('Error generating turnover analysis:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate turnover analysis',
      });
    }
  }
);

/**
 * @route   GET /api/inventory/turnover/item/:itemId
 * @desc    Get turnover analysis history for an item
 * @access  Private (Admin/Billing)
 */
router.get(
  '/turnover/item/:itemId',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { periodType, limit = 10 } = req.query;

      const query = { item: req.params.itemId };
      if (periodType) query.periodType = periodType;

      const analyses = await InventoryTurnover.find(query)
        .populate('item', 'name sku category')
        .populate('calculatedBy', 'firstName lastName')
        .sort({ periodStart: -1 })
        .limit(parseInt(limit, 10));

      res.json({
        success: true,
        count: analyses.length,
        data: analyses,
      });
    } catch (error) {
      console.error('Error fetching turnover analysis:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch turnover analysis',
      });
    }
  }
);

/**
 * @route   GET /api/inventory/turnover/category/:category
 * @desc    Get turnover analysis for a category
 * @access  Private (Admin/Billing)
 */
router.get(
  '/turnover/category/:category',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { limit = 10 } = req.query;

      const analyses = await InventoryTurnover.find({
        category: req.params.category,
      })
        .sort({ periodStart: -1 })
        .limit(parseInt(limit, 10));

      res.json({
        success: true,
        count: analyses.length,
        data: analyses,
      });
    } catch (error) {
      console.error('Error fetching category turnover:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch category turnover',
      });
    }
  }
);

/**
 * @route   GET /api/inventory/turnover/comparison
 * @desc    Compare turnover across multiple items or categories
 * @access  Private (Admin/Billing)
 */
router.get(
  '/turnover/comparison',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { periodStart, periodEnd, category } = req.query;

      if (!periodStart || !periodEnd) {
        return res.status(400).json({
          success: false,
          error: 'periodStart and periodEnd are required',
        });
      }

      const query = {
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
      };

      if (category) {
        query.category = category;
      }

      const analyses = await InventoryTurnover.find(query)
        .populate('item', 'name sku category')
        .sort({ 'turnoverMetrics.inventoryTurnoverRatio': -1 });

      // Calculate summary statistics
      const summary = {
        totalItems: analyses.length,
        totalRevenue: analyses.reduce((sum, a) => sum + a.financialMetrics.totalRevenue, 0),
        totalCOGS: analyses.reduce((sum, a) => sum + a.financialMetrics.costOfGoodsSold, 0),
        averageTurnoverRatio:
          analyses.reduce((sum, a) => sum + a.turnoverMetrics.inventoryTurnoverRatio, 0) /
          Math.max(analyses.length, 1),
        fastMovingItems: analyses.filter((a) => a.performance.fastMoving).length,
        slowMovingItems: analyses.filter((a) => a.performance.slowMoving).length,
        deadStockItems: analyses.filter((a) => a.performance.deadStock).length,
      };

      res.json({
        success: true,
        period: { start: periodStart, end: periodEnd },
        summary,
        data: analyses.map((a) => ({
          itemId: a.item?._id,
          itemName: a.item?.name,
          sku: a.item?.sku,
          category: a.category,
          turnoverRatio: a.turnoverMetrics.inventoryTurnoverRatio,
          daysToSell: a.turnoverMetrics.averageDaysToSell,
          revenue: a.financialMetrics.totalRevenue,
          grossProfit: a.financialMetrics.grossProfit,
          performance: a.performance,
        })),
      });
    } catch (error) {
      console.error('Error generating comparison:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate comparison',
      });
    }
  }
);

/**
 * @route   GET /api/inventory/turnover/dashboard
 * @desc    Get inventory dashboard with key metrics
 * @access  Private (Admin/Billing)
 */
router.get(
  '/turnover/dashboard',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      // Get all active items
      const items = await InventoryItem.find({ active: true });

      // Calculate totals
      const totalItems = items.length;
      const totalStockValue = items.reduce((sum, item) => sum + item.stockValue, 0);
      const lowStockItems = items.filter((item) => item.isLowStock).length;

      // Get recent transactions (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentTransactions = await InventoryTransaction.countDocuments({
        transactionDate: { $gte: thirtyDaysAgo },
      });

      // Get stock by category
      const stockByCategory = await InventoryItem.aggregate([
        { $match: { active: true } },
        {
          $group: {
            _id: '$category',
            itemCount: { $sum: 1 },
            totalStock: { $sum: '$currentStock' },
            totalValue: { $sum: { $multiply: ['$currentStock', '$costPrice'] } },
          },
        },
        { $sort: { totalValue: -1 } },
      ]);

      // Get items needing reorder
      const itemsNeedingReorder = items.filter((item) => item.needsReorder()).length;

      // Get recent turnover analyses
      const recentAnalyses = await InventoryTurnover.find()
        .sort({ calculatedAt: -1 })
        .limit(5)
        .populate('item', 'name sku');

      res.json({
        success: true,
        dashboard: {
          overview: {
            totalItems,
            totalStockValue,
            lowStockItems,
            itemsNeedingReorder,
            recentTransactions,
          },
          stockByCategory,
          recentAnalyses: recentAnalyses.map((a) => ({
            itemName: a.item?.name,
            period: `${a.periodStart.toLocaleDateString()} - ${a.periodEnd.toLocaleDateString()}`,
            turnoverRatio: a.turnoverMetrics.inventoryTurnoverRatio,
            revenue: a.financialMetrics.totalRevenue,
          })),
        },
      });
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard data',
      });
    }
  }
);

/**
 * @route   GET /api/inventory/turnover/trends
 * @desc    Get turnover trends over time for an item
 * @access  Private (Admin/Billing)
 */
router.get(
  '/turnover/trends',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { itemId, periodType, startDate } = req.query;

      if (!itemId) {
        return res.status(400).json({
          success: false,
          error: 'itemId is required',
        });
      }

      const query = { item: itemId };
      if (periodType) query.periodType = periodType;
      if (startDate) query.periodStart = { $gte: new Date(startDate) };

      const trends = await InventoryTurnover.find(query)
        .sort({ periodStart: 1 })
        .select('periodStart periodEnd turnoverMetrics financialMetrics movement performance');

      res.json({
        success: true,
        itemId,
        dataPoints: trends.length,
        trends: trends.map((t) => ({
          period: `${t.periodStart.toLocaleDateString()} - ${t.periodEnd.toLocaleDateString()}`,
          periodStart: t.periodStart,
          periodEnd: t.periodEnd,
          turnoverRatio: t.turnoverMetrics.inventoryTurnoverRatio,
          daysToSell: t.turnoverMetrics.averageDaysToSell,
          revenue: t.financialMetrics.totalRevenue,
          sales: t.movement.totalSales,
          purchases: t.movement.totalPurchases,
          grossProfit: t.financialMetrics.grossProfit,
          performance: t.performance,
        })),
      });
    } catch (error) {
      console.error('Error fetching trends:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch turnover trends',
      });
    }
  }
);

/**
 * @route   GET /api/inventory/alerts
 * @desc    Get inventory alerts (low stock, dead stock, etc.)
 * @access  Private
 */
router.get('/alerts', protect, async (req, res) => {
  try {
    const items = await InventoryItem.find({ active: true });

    const alerts = {
      lowStock: [],
      reorderNeeded: [],
      outOfStock: [],
      nearExpiry: [],
    };

    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    items.forEach((item) => {
      // Low stock
      if (item.isLowStock) {
        alerts.lowStock.push({
          itemId: item._id,
          name: item.name,
          currentStock: item.currentStock,
          reorderPoint: item.reorderPoint,
        });
      }

      // Reorder needed
      if (item.needsReorder()) {
        alerts.reorderNeeded.push({
          itemId: item._id,
          name: item.name,
          currentStock: item.currentStock,
          recommendedQuantity: item.reorderQuantity,
        });
      }

      // Out of stock
      if (item.currentStock === 0) {
        alerts.outOfStock.push({
          itemId: item._id,
          name: item.name,
        });
      }

      // Near expiry
      if (item.expiryDate && item.expiryDate <= thirtyDaysFromNow) {
        alerts.nearExpiry.push({
          itemId: item._id,
          name: item.name,
          expiryDate: item.expiryDate,
          currentStock: item.currentStock,
        });
      }
    });

    res.json({
      success: true,
      alerts,
      summary: {
        lowStockCount: alerts.lowStock.length,
        reorderNeededCount: alerts.reorderNeeded.length,
        outOfStockCount: alerts.outOfStock.length,
        nearExpiryCount: alerts.nearExpiry.length,
      },
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alerts',
    });
  }
});

module.exports = router;
