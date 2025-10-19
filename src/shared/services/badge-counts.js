const express = require('express');


const BadgeCount = require('../models/BadgeCount');
/**
 * Badge Counts API Routes
 * TASK-14.8 - App Badge Counts
 */

const router = express.Router();
// Simple auth middleware
const protect = (req, res, next) => {
  req.user = { _id: req.headers['x-user-id'] || '507f1f77bcf86cd799439011' };
  next();
};

/**
 * @route   GET /api/badge-counts
 * @desc    Get user's badge counts
 */
router.get('/', protect, async (req, res) => {
  try {
    const badgeCount = await BadgeCount.getOrCreate(req.user._id);

    res.json({
      success: true,
      data: {
        total: badgeCount.total,
        displayCount: badgeCount.displayCount,
        categories: badgeCount.categories,
        hasNotifications: badgeCount.hasNotifications,
        lastUpdated: badgeCount.lastUpdated,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch badge counts',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/badge-counts/summary
 * @desc    Get category summary
 */
router.get('/summary', protect, async (req, res) => {
  try {
    const badgeCount = await BadgeCount.getOrCreate(req.user._id);
    const summary = badgeCount.getCategorySummary();

    res.json({
      success: true,
      data: {
        total: badgeCount.total,
        summary,
        priorityScore: badgeCount.getPriorityScore(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch badge summary',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/badge-counts/increment
 * @desc    Increment badge count
 */
router.post('/increment', protect, async (req, res) => {
  try {
    const { category, subcategory, amount = 1, reason } = req.body;

    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'category is required',
      });
    }

    const badgeCount = await BadgeCount.incrementForUser(
      req.user._id,
      category,
      subcategory,
      amount,
      reason
    );

    res.json({
      success: true,
      message: 'Badge count incremented',
      data: {
        total: badgeCount.total,
        displayCount: badgeCount.displayCount,
        category: badgeCount.categories[category],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to increment badge count',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/badge-counts/decrement
 * @desc    Decrement badge count
 */
router.post('/decrement', protect, async (req, res) => {
  try {
    const { category, subcategory, amount = 1, reason } = req.body;

    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'category is required',
      });
    }

    const badgeCount = await BadgeCount.decrementForUser(
      req.user._id,
      category,
      subcategory,
      amount,
      reason
    );

    res.json({
      success: true,
      message: 'Badge count decremented',
      data: {
        total: badgeCount.total,
        displayCount: badgeCount.displayCount,
        category: badgeCount.categories[category],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to decrement badge count',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/badge-counts/set
 * @desc    Set badge count for a category
 */
router.post('/set', protect, async (req, res) => {
  try {
    const { category, subcategory, count, reason } = req.body;

    if (!category || count === undefined) {
      return res.status(400).json({
        success: false,
        message: 'category and count are required',
      });
    }

    const badgeCount = await BadgeCount.getOrCreate(req.user._id);
    await badgeCount.setCount(category, subcategory, count, reason);

    res.json({
      success: true,
      message: 'Badge count set',
      data: {
        total: badgeCount.total,
        displayCount: badgeCount.displayCount,
        category: badgeCount.categories[category],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to set badge count',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/badge-counts/clear
 * @desc    Clear badge counts
 */
router.post('/clear', protect, async (req, res) => {
  try {
    const { category, subcategory, reason } = req.body;

    const badgeCount = await BadgeCount.clearForUser(req.user._id, category, subcategory, reason);

    res.json({
      success: true,
      message: category
        ? `Badge count cleared for ${category}${subcategory ? '.' + subcategory : ''}`
        : 'All badge counts cleared',
      data: {
        total: badgeCount.total,
        displayCount: badgeCount.displayCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to clear badge count',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/badge-counts/category/:category
 * @desc    Get badge count for specific category
 */
router.get('/category/:category', protect, async (req, res) => {
  try {
    const badgeCount = await BadgeCount.getOrCreate(req.user._id);
    const { category } = req.params;

    if (!badgeCount.categories[category]) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    res.json({
      success: true,
      data: badgeCount.categories[category],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category badge count',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/badge-counts/config
 * @desc    Update badge configuration
 */
router.put('/config', protect, async (req, res) => {
  try {
    const badgeCount = await BadgeCount.getOrCreate(req.user._id);

    // Update config
    Object.assign(badgeCount.config, req.body);

    // Recalculate total with new config
    badgeCount.calculateTotal();

    await badgeCount.save();

    res.json({
      success: true,
      message: 'Badge configuration updated',
      data: {
        config: badgeCount.config,
        total: badgeCount.total,
        displayCount: badgeCount.displayCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update configuration',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/badge-counts/config
 * @desc    Get badge configuration
 */
router.get('/config', protect, async (req, res) => {
  try {
    const badgeCount = await BadgeCount.getOrCreate(req.user._id);

    res.json({
      success: true,
      data: badgeCount.config,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch configuration',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/badge-counts/sync
 * @desc    Sync badge count to device
 */
router.post('/sync', protect, async (req, res) => {
  try {
    const { deviceId, platform } = req.body;

    if (!deviceId || !platform) {
      return res.status(400).json({
        success: false,
        message: 'deviceId and platform are required',
      });
    }

    const badgeCount = await BadgeCount.getOrCreate(req.user._id);
    await badgeCount.syncToDevice(deviceId, platform);

    res.json({
      success: true,
      message: 'Badge count synced to device',
      data: {
        total: badgeCount.total,
        displayCount: badgeCount.displayCount,
        deviceId,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to sync badge count',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/badge-counts/devices
 * @desc    Get synced devices
 */
router.get('/devices', protect, async (req, res) => {
  try {
    const badgeCount = await BadgeCount.getOrCreate(req.user._id);

    res.json({
      success: true,
      count: badgeCount.devices.length,
      data: badgeCount.devices,
      needsSync: badgeCount.needsSync,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch devices',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/badge-counts/history
 * @desc    Get badge count history
 */
router.get('/history', protect, async (req, res) => {
  try {
    const { limit = 20, action, category } = req.query;

    const badgeCount = await BadgeCount.getOrCreate(req.user._id);

    let { history } = badgeCount;

    // Filter by action
    if (action) {
      history = history.filter((h) => h.action === action);
    }

    // Filter by category
    if (category) {
      history = history.filter((h) => h.category === category);
    }

    // Sort by timestamp descending
    history.sort((a, b) => b.timestamp - a.timestamp);

    // Limit results
    history = history.slice(0, parseInt(limit, 10));

    res.json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch history',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/badge-counts/stats
 * @desc    Get badge statistics
 */
router.get('/stats', protect, async (req, res) => {
  try {
    const badgeCount = await BadgeCount.getOrCreate(req.user._id);

    res.json({
      success: true,
      data: {
        current: {
          total: badgeCount.total,
          displayCount: badgeCount.displayCount,
          priorityScore: badgeCount.getPriorityScore(),
        },
        stats: badgeCount.stats,
        lastUpdated: badgeCount.lastUpdated,
        lastCleared: badgeCount.lastCleared,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/badge-counts/batch
 * @desc    Batch update badge counts
 */
router.post('/batch', protect, async (req, res) => {
  try {
    const { operations } = req.body;

    if (!operations || !Array.isArray(operations)) {
      return res.status(400).json({
        success: false,
        message: 'operations array is required',
      });
    }

    const badgeCount = await BadgeCount.getOrCreate(req.user._id);

    // Process each operation
    for (const op of operations) {
      const { action, category, subcategory, amount, count, reason } = op;

      switch (action) {
        case 'increment':
          await badgeCount.increment(category, subcategory, amount || 1, reason);
          break;
        case 'decrement':
          await badgeCount.decrement(category, subcategory, amount || 1, reason);
          break;
        case 'set':
          await badgeCount.setCount(category, subcategory, count, reason);
          break;
        case 'clear':
          await badgeCount.clear(category, subcategory, reason);
          break;
        default:
          throw new Error(`Invalid action: ${action}`);
      }
    }

    res.json({
      success: true,
      message: `${operations.length} operations processed`,
      data: {
        total: badgeCount.total,
        displayCount: badgeCount.displayCount,
        categories: badgeCount.categories,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process batch operations',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/badge-counts/recalculate
 * @desc    Recalculate badge total from categories
 */
router.post('/recalculate', protect, async (req, res) => {
  try {
    const badgeCount = await BadgeCount.getOrCreate(req.user._id);

    const previousTotal = badgeCount.total;
    badgeCount.calculateTotal();
    await badgeCount.save();

    res.json({
      success: true,
      message: 'Badge count recalculated',
      data: {
        previousTotal,
        newTotal: badgeCount.total,
        displayCount: badgeCount.displayCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to recalculate badge count',
      error: error.message,
    });
  }
});

// ============================================
// ADMIN ROUTES
// ============================================

/**
 * @route   GET /api/badge-counts/admin/analytics
 * @desc    Get global badge analytics (admin only)
 */
router.get('/admin/analytics', protect, async (req, res) => {
  try {
    const summary = await BadgeCount.getAnalyticsSummary();

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/badge-counts/admin/high-counts
 * @desc    Get users with high badge counts (admin only)
 */
router.get('/admin/high-counts', protect, async (req, res) => {
  try {
    const { threshold = 10, limit = 100 } = req.query;

    const users = await BadgeCount.getUsersWithHighCounts(parseInt(threshold, 10), parseInt(limit, 10));

    res.json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch high badge counts',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/badge-counts/admin/cleanup-history
 * @desc    Clean up old history entries (admin only)
 */
router.post('/admin/cleanup-history', protect, async (req, res) => {
  try {
    const { daysToKeep = 30 } = req.body;

    const result = await BadgeCount.cleanupHistory(parseInt(daysToKeep, 10));

    res.json({
      success: true,
      message: `Cleaned up history entries older than ${daysToKeep} days`,
      data: {
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup history',
      error: error.message,
    });
  }
});

module.exports = router;
