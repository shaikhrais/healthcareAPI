/**
 * Health Integrations Routes
 * API endpoints for health data integration
 */

const express = require('express');
const { body, param, query } = require('express-validator');
const authMiddleware = require('../../auth/middleware/authMiddleware');
const rateLimiterMiddleware = require('../../../shared/middleware/rateLimiterMiddleware');
const healthIntegrationsController = require('../controllers/healthIntegrationsController');

const router = express.Router();

// Apply middleware to all routes
router.use(authMiddleware);

// Define supported data types for validation
const SUPPORTED_DATA_TYPES = [
  'heart_rate', 'blood_pressure', 'weight', 'height', 'bmi', 'body_fat',
  'steps', 'distance', 'calories_burned', 'active_minutes', 'floors_climbed',
  'sleep_duration', 'deep_sleep', 'light_sleep', 'rem_sleep', 'awake_time',
  'blood_glucose', 'temperature', 'oxygen_saturation', 'respiratory_rate',
  'calories_consumed', 'water_intake', 'nutrition'
];

const SUPPORTED_PLATFORMS = ['apple_health', 'google_fit', 'fitbit', 'manual'];

/**
 * @swagger
 * components:
 *   schemas:
 *     HealthData:
 *       type: object
 *       required:
 *         - type
 *         - value
 *         - recordedAt
 *         - platform
 *       properties:
 *         type:
 *           type: string
 *           enum: [heart_rate, blood_pressure, weight, height, bmi, body_fat, steps, distance, calories_burned, active_minutes, floors_climbed, sleep_duration, deep_sleep, light_sleep, rem_sleep, awake_time, blood_glucose, temperature, oxygen_saturation, respiratory_rate, calories_consumed, water_intake, nutrition]
 *           example: "heart_rate"
 *         value:
 *           oneOf:
 *             - type: number
 *             - type: object
 *           example: 72
 *           description: "Health data value (number for simple metrics, object for complex ones like blood pressure)"
 *         unit:
 *           type: string
 *           example: "bpm"
 *           description: "Unit of measurement"
 *         recordedAt:
 *           type: string
 *           format: date-time
 *           example: "2023-01-01T12:00:00Z"
 *         platform:
 *           type: string
 *           enum: [apple_health, google_fit, fitbit, manual]
 *           example: "apple_health"
 *         deviceInfo:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *               example: "iPhone"
 *             model:
 *               type: string
 *               example: "iPhone 14 Pro"
 *             version:
 *               type: string
 *               example: "iOS 16.0"
 *         metadata:
 *           type: object
 *           description: "Additional platform-specific metadata"
 *     HealthDataBatch:
 *       type: object
 *       required:
 *         - platform
 *         - data
 *       properties:
 *         platform:
 *           type: string
 *           enum: [apple_health, google_fit, fitbit, manual]
 *           example: "apple_health"
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/HealthData'
 *         syncToken:
 *           type: string
 *           example: "sync_token_123456"
 *         lastSyncAt:
 *           type: string
 *           format: date-time
 *     HealthSummary:
 *       type: object
 *       properties:
 *         period:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *           example: "daily"
 *         date:
 *           type: string
 *           format: date
 *           example: "2023-01-01"
 *         metrics:
 *           type: object
 *           properties:
 *             steps:
 *               type: number
 *               example: 8500
 *             calories_burned:
 *               type: number
 *               example: 2200
 *             active_minutes:
 *               type: number
 *               example: 45
 *             heart_rate_avg:
 *               type: number
 *               example: 68
 *             sleep_duration:
 *               type: number
 *               example: 480
 *         trends:
 *           type: object
 *           description: "Comparison with previous periods"
 *         goals:
 *           type: object
 *           description: "Progress towards health goals"
 */

/**
 * @swagger
 * /api/health/sync:
 *   post:
 *     tags: [Health Integrations]
 *     summary: Sync health data from external platform
 *     description: Import health data from Apple Health, Google Fit, Fitbit, or manual entry
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HealthDataBatch'
 *     responses:
 *       200:
 *         description: Health data synced successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Health data synced successfully"
 *                 synced:
 *                   type: number
 *                   example: 25
 *                   description: "Number of data points synced"
 *                 skipped:
 *                   type: number
 *                   example: 2
 *                   description: "Number of duplicate data points skipped"
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: "Any errors encountered during sync"
 *       400:
 *         description: Invalid health data or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * POST /api/health/sync
 * Sync health data from external platform
 */
router.post('/sync',
  rateLimiterMiddleware('health_sync', 100), // 100 requests per hour
  [
    body('platform')
      .isIn(SUPPORTED_PLATFORMS)
      .withMessage('Platform must be one of: ' + SUPPORTED_PLATFORMS.join(', ')),
    body('data')
      .isArray({ min: 1 })
      .withMessage('Data must be a non-empty array'),
    body('data.*.dataType')
      .isIn(SUPPORTED_DATA_TYPES)
      .withMessage('Invalid data type'),
    body('data.*.value')
      .notEmpty()
      .withMessage('Value is required'),
    body('data.*.recordedAt')
      .isISO8601()
      .withMessage('recordedAt must be a valid ISO date'),
  ],
  healthIntegrationsController.syncHealthData
);

/**
 * POST /api/health/batch-import
 * Batch import health data
 */
router.post('/batch-import',
  rateLimiterMiddleware('health_batch', 10), // 10 batch imports per hour
  [
    body('platform')
      .isIn(SUPPORTED_PLATFORMS)
      .withMessage('Platform must be one of: ' + SUPPORTED_PLATFORMS.join(', ')),
    body('dataArray')
      .isArray({ min: 1, max: 1000 })
      .withMessage('dataArray must be an array with 1-1000 items'),
  ],
  healthIntegrationsController.batchImportHealthData
);

/**
 * GET /api/health/summary
 * Get user's health data summary
 */
router.get('/summary',
  [
    query('days')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Days must be between 1 and 365'),
    query('categories')
      .optional()
      .isString()
      .withMessage('Categories must be a comma-separated string'),
  ],
  healthIntegrationsController.getHealthSummary
);

/**
 * GET /api/health/trends/:dataType
 * Get health trends and insights
 */
router.get('/trends/:dataType',
  [
    param('dataType')
      .isIn(SUPPORTED_DATA_TYPES)
      .withMessage('Invalid data type'),
    query('days')
      .optional()
      .isInt({ min: 7, max: 365 })
      .withMessage('Days must be between 7 and 365'),
  ],
  healthIntegrationsController.getHealthTrends
);

/**
 * GET /api/health/data/:dataType
 * Get health data by type
 */
router.get('/data/:dataType',
  [
    param('dataType')
      .isIn(SUPPORTED_DATA_TYPES)
      .withMessage('Invalid data type'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Limit must be between 1 and 1000'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('startDate must be a valid ISO date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('endDate must be a valid ISO date'),
  ],
  healthIntegrationsController.getHealthDataByType
);

/**
 * POST /api/health/data
 * Create manual health data entry
 */
router.post('/data',
  rateLimiterMiddleware('health_create', 200), // 200 creates per hour
  [
    body('dataType')
      .isIn(SUPPORTED_DATA_TYPES)
      .withMessage('Invalid data type'),
    body('value')
      .notEmpty()
      .withMessage('Value is required'),
    body('recordedAt')
      .isISO8601()
      .withMessage('recordedAt must be a valid ISO date'),
    body('unit')
      .optional()
      .isString()
      .withMessage('Unit must be a string'),
    body('metadata')
      .optional()
      .isObject()
      .withMessage('Metadata must be an object'),
  ],
  healthIntegrationsController.createHealthData
);

/**
 * PUT /api/health/data/:id
 * Update health data entry
 */
router.put('/data/:id',
  rateLimiterMiddleware('health_update', 100), // 100 updates per hour
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid health data ID'),
    body('value')
      .optional()
      .notEmpty()
      .withMessage('Value cannot be empty'),
    body('unit')
      .optional()
      .isString()
      .withMessage('Unit must be a string'),
    body('metadata')
      .optional()
      .isObject()
      .withMessage('Metadata must be an object'),
  ],
  healthIntegrationsController.updateHealthData
);

/**
 * DELETE /api/health/data/:id
 * Delete health data entry
 */
router.delete('/data/:id',
  rateLimiterMiddleware('health_delete', 50), // 50 deletes per hour
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid health data ID'),
  ],
  healthIntegrationsController.deleteHealthData
);

/**
 * GET /api/health/stats/:dataType
 * Get health statistics for user
 */
router.get('/stats/:dataType',
  [
    param('dataType')
      .isIn(SUPPORTED_DATA_TYPES)
      .withMessage('Invalid data type'),
    query('days')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Days must be between 1 and 365'),
  ],
  healthIntegrationsController.getHealthStats
);

/**
 * GET /api/health/flagged
 * Get flagged health data for review
 */
router.get('/flagged',
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('flagType')
      .optional()
      .isIn(['anomaly', 'duplicate', 'quality', 'outlier'])
      .withMessage('Invalid flag type'),
  ],
  healthIntegrationsController.getFlaggedData
);

/**
 * POST /api/health/flagged/:id/resolve
 * Resolve flagged health data
 */
router.post('/flagged/:id/resolve',
  rateLimiterMiddleware('health_resolve', 50), // 50 resolves per hour
  [
    param('id')
      .isMongoId()
      .withMessage('Invalid health data ID'),
    body('flagIndex')
      .isInt({ min: 0 })
      .withMessage('Flag index must be a non-negative integer'),
  ],
  healthIntegrationsController.resolveFlaggedData
);

/**
 * GET /api/health/platforms
 * Get supported platforms and data types
 */
router.get('/platforms',
  healthIntegrationsController.getSupportedPlatforms
);

/**
 * GET /api/health/export
 * Export user's health data
 */
router.get('/export',
  rateLimiterMiddleware('health_export', 5), // 5 exports per hour
  [
    query('format')
      .optional()
      .isIn(['json', 'csv'])
      .withMessage('Format must be json or csv'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('startDate must be a valid ISO date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('endDate must be a valid ISO date'),
    query('dataTypes')
      .optional()
      .isString()
      .withMessage('dataTypes must be a comma-separated string'),
  ],
  healthIntegrationsController.exportHealthData
);

// Health data validation routes

/**
 * POST /api/health/validate
 * Validate health data before submission
 */
router.post('/validate',
  [
    body('dataType')
      .isIn(SUPPORTED_DATA_TYPES)
      .withMessage('Invalid data type'),
    body('value')
      .notEmpty()
      .withMessage('Value is required'),
    body('unit')
      .optional()
      .isString()
      .withMessage('Unit must be a string'),
  ],
  async (req, res) => {
    try {
      const healthIntegrationService = require('../services/healthIntegrationService');
      const validation = healthIntegrationService.validateHealthData(req.body);
      
      res.json({
        success: true,
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Validation failed',
        message: error.message,
      });
    }
  }
);

// Health insights routes

/**
 * GET /api/health/insights
 * Get AI-generated health insights
 */
router.get('/insights',
  [
    query('days')
      .optional()
      .isInt({ min: 7, max: 90 })
      .withMessage('Days must be between 7 and 90'),
    query('categories')
      .optional()
      .isString()
      .withMessage('Categories must be a comma-separated string'),
  ],
  async (req, res) => {
    try {
      const healthIntegrationService = require('../services/healthIntegrationService');
      const userId = req.user.id;
      const { days = 30, categories } = req.query;
      
      const options = { days: parseInt(days, 10) };
      if (categories) {
        options.categories = categories.split(',');
      }
      
      const insights = await healthIntegrationService.generateInsights(userId, options);
      
      res.json({
        success: true,
        insights,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to generate insights',
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/health/goals
 * Get health goals and progress
 */
router.get('/goals',
  async (req, res) => {
    try {
      const healthIntegrationService = require('../services/healthIntegrationService');
      const userId = req.user.id;
      
      const goals = await healthIntegrationService.getHealthGoals(userId);
      
      res.json({
        success: true,
        goals,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get health goals',
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/health/goals
 * Set health goals
 */
router.post('/goals',
  [
    body('goals')
      .isArray({ min: 1 })
      .withMessage('Goals must be a non-empty array'),
    body('goals.*.dataType')
      .isIn(SUPPORTED_DATA_TYPES)
      .withMessage('Invalid goal data type'),
    body('goals.*.target')
      .isNumeric()
      .withMessage('Goal target must be numeric'),
    body('goals.*.period')
      .isIn(['daily', 'weekly', 'monthly'])
      .withMessage('Goal period must be daily, weekly, or monthly'),
  ],
  async (req, res) => {
    try {
      const healthIntegrationService = require('../services/healthIntegrationService');
      const userId = req.user.id;
      const { goals } = req.body;
      
      const result = await healthIntegrationService.setHealthGoals(userId, goals);
      
      res.json({
        success: true,
        message: 'Health goals set successfully',
        goals: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to set health goals',
        message: error.message,
      });
    }
  }
);

module.exports = router;