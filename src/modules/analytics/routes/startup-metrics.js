const express = require('express');


const StartupMetrics = require('../models/StartupMetrics');
/**
 * Startup Metrics API Routes
 * TASK-14.24 - Startup Time Optimization
 */

const router = express.Router();
const protect = (req, res, next) => {
  req.user = { _id: req.headers['x-user-id'] || '507f1f77bcf86cd799439011' };
  next();
};

/**
 * @route   POST /api/startup-metrics
 * @desc    Record startup metrics
 */
router.post('/', async (req, res) => {
  try {
    const metrics = await StartupMetrics.create({
      ...req.body,
      userId: req.user?._id,
    });

    res.status(201).json({
      success: true,
      message: 'Metrics recorded',
      data: metrics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to record metrics',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/startup-metrics
 * @desc    Get all metrics
 */
router.get('/', protect, async (req, res) => {
  try {
    const { platform, type, limit = 50 } = req.query;
    const query = {};

    if (platform) query['device.platform'] = platform;
    if (type) query.startupType = type;

    const metrics = await StartupMetrics.find(query).sort({ timestamp: -1 }).limit(parseInt(limit, 10));

    res.json({
      success: true,
      count: metrics.length,
      data: metrics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch metrics',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/startup-metrics/:id
 * @desc    Get specific metrics
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const metrics = await StartupMetrics.findById(req.params.id);

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
    res.status(500).json({
      success: false,
      message: 'Failed to fetch metrics',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/startup-metrics/:id/summary
 * @desc    Get metrics summary
 */
router.get('/:id/summary', protect, async (req, res) => {
  try {
    const metrics = await StartupMetrics.findById(req.params.id);

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
    res.status(500).json({
      success: false,
      message: 'Failed to fetch summary',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/startup-metrics/:id/phases
 * @desc    Get slowest phases
 */
router.get('/:id/phases', protect, async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const metrics = await StartupMetrics.findById(req.params.id);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        message: 'Metrics not found',
      });
    }

    const phases = metrics.getSlowestPhases(parseInt(limit, 10));

    res.json({
      success: true,
      data: phases,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch phases',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/startup-metrics/:id/bottlenecks
 * @desc    Get critical bottlenecks
 */
router.get('/:id/bottlenecks', protect, async (req, res) => {
  try {
    const metrics = await StartupMetrics.findById(req.params.id);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        message: 'Metrics not found',
      });
    }

    const bottlenecks = metrics.getCriticalBottlenecks();

    res.json({
      success: true,
      count: bottlenecks.length,
      data: bottlenecks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bottlenecks',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/startup-metrics/:id/recommendations
 * @desc    Get optimization recommendations
 */
router.get('/:id/recommendations', protect, async (req, res) => {
  try {
    const metrics = await StartupMetrics.findById(req.params.id);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        message: 'Metrics not found',
      });
    }

    const recommendations = metrics.getRecommendations();

    res.json({
      success: true,
      count: recommendations.length,
      data: recommendations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recommendations',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/startup-metrics/:id/improvement
 * @desc    Calculate potential improvement
 */
router.get('/:id/improvement', protect, async (req, res) => {
  try {
    const metrics = await StartupMetrics.findById(req.params.id);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        message: 'Metrics not found',
      });
    }

    const improvement = metrics.calculatePotentialImprovement();

    res.json({
      success: true,
      data: improvement,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to calculate improvement',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/startup-metrics/analytics/average
 * @desc    Get average startup time
 */
router.get('/analytics/average', protect, async (req, res) => {
  try {
    const { platform, version } = req.query;
    const filters = {};

    if (platform) filters['device.platform'] = platform;
    if (version) filters.appVersion = version;

    const averages = await StartupMetrics.getAverageTime(filters);

    res.json({
      success: true,
      data: averages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to calculate average',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/startup-metrics/analytics/trend
 * @desc    Get startup time trend
 */
router.get('/analytics/trend', protect, async (req, res) => {
  try {
    const { platform, days = 7 } = req.query;

    if (!platform) {
      return res.status(400).json({
        success: false,
        message: 'Platform parameter is required',
      });
    }

    const trend = await StartupMetrics.getTimeTrend(platform, parseInt(days, 10));

    res.json({
      success: true,
      data: trend,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trend',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/startup-metrics/analytics/stats
 * @desc    Get performance statistics
 */
router.get('/analytics/stats', protect, async (req, res) => {
  try {
    const { platform, type, version } = req.query;
    const filters = {};

    if (platform) filters['device.platform'] = platform;
    if (type) filters.startupType = type;
    if (version) filters.appVersion = version;

    const stats = await StartupMetrics.getPerformanceStats(filters);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stats',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/startup-metrics/analytics/bottlenecks
 * @desc    Get common bottlenecks
 */
router.get('/analytics/bottlenecks', protect, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const bottlenecks = await StartupMetrics.getCommonBottlenecks(parseInt(limit, 10));

    res.json({
      success: true,
      data: bottlenecks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bottlenecks',
      error: error.message,
    });
  }
});

module.exports = router;
