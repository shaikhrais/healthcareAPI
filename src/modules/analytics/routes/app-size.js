const express = require('express');


const AppSizeMetrics = require('../models/AppSizeMetrics');
/**
 * App Size Optimization API Routes
 * TASK-14.23 - App Size Optimization
 *
 * API for tracking and analyzing app size metrics
 */

const router = express.Router();
const protect = (req, res, next) => {
  req.user = { _id: req.headers['x-user-id'] || '507f1f77bcf86cd799439011' };
  next();
};

// ==================== METRICS ====================

/**
 * @route   POST /api/app-size/metrics
 * @desc    Record new size metrics
 * @access  Private
 */
router.post('/metrics', protect, async (req, res) => {
  try {
    const metrics = await AppSizeMetrics.create({
      ...req.body,
      analyzedBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Metrics recorded successfully',
      data: metrics,
    });
  } catch (error) {
    console.error('Error recording metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record metrics',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/app-size/metrics
 * @desc    Get all metrics
 * @access  Private
 */
router.get('/metrics', protect, async (req, res) => {
  try {
    const { platform, limit = 20 } = req.query;
    const query = platform ? { platform } : {};

    const metrics = await AppSizeMetrics.find(query)
      .sort({ analyzedAt: -1 })
      .limit(parseInt(limit, 10));

    res.json({
      success: true,
      count: metrics.length,
      data: metrics,
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch metrics',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/app-size/metrics/:id
 * @desc    Get specific metrics by ID
 * @access  Private
 */
router.get('/metrics/:id', protect, async (req, res) => {
  try {
    const metrics = await AppSizeMetrics.findById(req.params.id);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        message: 'Metrics not found',
      });
    }

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch metrics',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/app-size/latest
 * @desc    Get latest metrics for platform
 * @access  Public
 */
router.get('/latest', async (req, res) => {
  try {
    const { platform } = req.query;

    if (!platform) {
      return res.status(400).json({
        success: false,
        message: 'Platform parameter is required',
      });
    }

    const metrics = await AppSizeMetrics.getLatest(platform);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        message: 'No metrics found for platform',
      });
    }

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Error fetching latest metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch latest metrics',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/app-size/summary/:id
 * @desc    Get size summary
 * @access  Private
 */
router.get('/summary/:id', protect, async (req, res) => {
  try {
    const metrics = await AppSizeMetrics.findById(req.params.id);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        message: 'Metrics not found',
      });
    }

    const summary = metrics.getSummary();

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch summary',
      error: error.message,
    });
  }
});

// ==================== ANALYSIS ====================

/**
 * @route   GET /api/app-size/trend
 * @desc    Get size trend over time
 * @access  Private
 */
router.get('/trend', protect, async (req, res) => {
  try {
    const { platform, limit = 10 } = req.query;

    if (!platform) {
      return res.status(400).json({
        success: false,
        message: 'Platform parameter is required',
      });
    }

    const trend = await AppSizeMetrics.getSizeTrend(platform, parseInt(limit, 10));

    res.json({
      success: true,
      data: trend,
    });
  } catch (error) {
    console.error('Error fetching trend:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trend',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/app-size/compare/:id
 * @desc    Compare with previous build
 * @access  Private
 */
router.get('/compare/:id', protect, async (req, res) => {
  try {
    const metrics = await AppSizeMetrics.findById(req.params.id);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        message: 'Metrics not found',
      });
    }

    const comparison = await metrics.compareWithPrevious();

    res.json({
      success: true,
      data: comparison,
    });
  } catch (error) {
    console.error('Error comparing:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to compare',
      error: error.message,
    });
  }
});

// ==================== OPTIMIZATIONS ====================

/**
 * @route   GET /api/app-size/opportunities/:id
 * @desc    Get top optimization opportunities
 * @access  Private
 */
router.get('/opportunities/:id', protect, async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const metrics = await AppSizeMetrics.findById(req.params.id);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        message: 'Metrics not found',
      });
    }

    const opportunities = metrics.getTopOpportunities(parseInt(limit, 10));

    res.json({
      success: true,
      count: opportunities.length,
      data: opportunities,
    });
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch opportunities',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/app-size/optimizations/:id/implement
 * @desc    Mark optimization as implemented
 * @access  Private
 */
router.post('/optimizations/:id/implement', protect, async (req, res) => {
  try {
    const { type } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'Optimization type is required',
      });
    }

    const metrics = await AppSizeMetrics.findById(req.params.id);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        message: 'Metrics not found',
      });
    }

    await metrics.markOptimizationImplemented(type);

    res.json({
      success: true,
      message: 'Optimization marked as implemented',
      data: metrics,
    });
  } catch (error) {
    console.error('Error implementing optimization:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to implement optimization',
    });
  }
});

/**
 * @route   GET /api/app-size/savings/:id
 * @desc    Calculate potential savings
 * @access  Private
 */
router.get('/savings/:id', protect, async (req, res) => {
  try {
    const metrics = await AppSizeMetrics.findById(req.params.id);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        message: 'Metrics not found',
      });
    }

    const savings = metrics.calculateTotalSavings();

    res.json({
      success: true,
      data: savings,
    });
  } catch (error) {
    console.error('Error calculating savings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate savings',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/app-size/recommendations
 * @desc    Get global recommendations
 * @access  Private
 */
router.get('/recommendations', protect, async (req, res) => {
  try {
    const recommendations = await AppSizeMetrics.getGlobalRecommendations();

    res.json({
      success: true,
      count: recommendations.length,
      data: recommendations,
    });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recommendations',
      error: error.message,
    });
  }
});

// ==================== ASSETS ====================

/**
 * @route   GET /api/app-size/assets/:id/largest
 * @desc    Get largest assets
 * @access  Private
 */
router.get('/assets/:id/largest', protect, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const metrics = await AppSizeMetrics.findById(req.params.id);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        message: 'Metrics not found',
      });
    }

    const assets = metrics.getLargestAssets(parseInt(limit, 10));

    res.json({
      success: true,
      count: assets.length,
      data: assets,
    });
  } catch (error) {
    console.error('Error fetching largest assets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch largest assets',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/app-size/assets/:id/unused
 * @desc    Get unused assets
 * @access  Private
 */
router.get('/assets/:id/unused', protect, async (req, res) => {
  try {
    const metrics = await AppSizeMetrics.findById(req.params.id);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        message: 'Metrics not found',
      });
    }

    const assets = metrics.getUnusedAssets();

    res.json({
      success: true,
      count: assets.length,
      data: assets,
    });
  } catch (error) {
    console.error('Error fetching unused assets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unused assets',
      error: error.message,
    });
  }
});

// ==================== STATS ====================

/**
 * @route   GET /api/app-size/stats
 * @desc    Get overall statistics
 * @access  Private
 */
router.get('/stats', protect, async (req, res) => {
  try {
    const stats = await AppSizeMetrics.getOverallStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stats',
      error: error.message,
    });
  }
});

module.exports = router;
