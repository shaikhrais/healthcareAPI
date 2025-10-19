/**
 * Sync Routes
 * API endpoints for offline synchronization
 */

const express = require('express');
const { body, param, query } = require('express-validator');
const { authMiddleware } = require('../../../shared/middleware/middleware/auth');
const syncController = require('../controllers/syncController');

const router = express.Router();

// All sync routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * components:
 *   schemas:
 *     SyncDevice:
 *       type: object
 *       required:
 *         - deviceId
 *         - deviceType
 *       properties:
 *         deviceId:
 *           type: string
 *           example: "device_123456"
 *           description: "Unique device identifier"
 *         deviceType:
 *           type: string
 *           enum: [ios, android, web]
 *           example: "ios"
 *         capabilities:
 *           type: object
 *           properties:
 *             storage:
 *               type: number
 *               example: 1000000
 *             bandwidth:
 *               type: string
 *               example: "high"
 *             platform:
 *               type: string
 *               example: "iOS 15.0"
 *         lastSyncAt:
 *           type: string
 *           format: date-time
 *         status:
 *           type: string
 *           enum: [active, inactive, syncing]
 *           example: "active"
 *     SyncData:
 *       type: object
 *       properties:
 *         collection:
 *           type: string
 *           example: "patients"
 *         data:
 *           type: array
 *           items:
 *             type: object
 *         timestamp:
 *           type: string
 *           format: date-time
 *         checksum:
 *           type: string
 *           example: "abc123def456"
 *     SyncStatus:
 *       type: object
 *       properties:
 *         deviceId:
 *           type: string
 *         lastSyncAt:
 *           type: string
 *           format: date-time
 *         status:
 *           type: string
 *           enum: [syncing, completed, failed, pending]
 *         progress:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *           example: 75
 *         collections:
 *           type: object
 *           description: "Sync status for each data collection"
 */

// ============================================================================
// Device Management
// ============================================================================

/**
 * @swagger
 * /api/sync/devices/initialize:
 *   post:
 *     tags: [Offline Sync]
 *     summary: Initialize device for offline sync
 *     description: Register a device for offline synchronization capabilities
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SyncDevice'
 *     responses:
 *       201:
 *         description: Device initialized successfully
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
 *                   example: "Device initialized for sync"
 *                 device:
 *                   $ref: '#/components/schemas/SyncDevice'
 *                 syncToken:
 *                   type: string
 *                   example: "sync_token_123456"
 *       400:
 *         description: Invalid device data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Device already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * @route   POST /api/sync/devices/initialize
 * @desc    Initialize device for offline sync
 * @access  Private
 */
router.post(
  '/devices/initialize',
  [
    body('deviceId').isString().notEmpty().withMessage('Device ID is required'),
    body('deviceType').isIn(['ios', 'android', 'web']).withMessage('Valid device type required'),
    body('capabilities').optional().isObject().withMessage('Capabilities must be an object'),
  ],
  syncController.initializeDevice
);

/**
 * @route   GET /api/sync/devices/:deviceId/status
 * @desc    Get sync status for device
 * @access  Private
 */
router.get(
  '/devices/:deviceId/status',
  [param('deviceId').isString().notEmpty().withMessage('Device ID is required')],
  syncController.getSyncStatus
);

/**
 * @route   POST /api/sync/devices/:deviceId/connection
 * @desc    Update device connection status
 * @access  Private
 */
router.post(
  '/devices/:deviceId/connection',
  [
    param('deviceId').isString().notEmpty().withMessage('Device ID is required'),
    body('isOnline').isBoolean().withMessage('isOnline must be boolean'),
    body('quality')
      .optional()
      .isIn(['excellent', 'good', 'poor'])
      .withMessage('Invalid connection quality'),
  ],
  syncController.updateConnectionStatus
);

// ============================================================================
// Change Queue Management
// ============================================================================

/**
 * @route   POST /api/sync/devices/:deviceId/queue
 * @desc    Queue a change for synchronization
 * @access  Private
 */
router.post(
  '/devices/:deviceId/queue',
  [
    param('deviceId').isString().notEmpty().withMessage('Device ID is required'),
    body('dataType')
      .isIn(['appointment', 'patient', 'clinicalNote', 'message', 'document'])
      .withMessage('Valid data type required'),
    body('recordId').isMongoId().withMessage('Valid record ID required'),
    body('operation').isIn(['create', 'update', 'delete']).withMessage('Valid operation required'),
    body('changeData').isObject().withMessage('Change data is required'),
    body('originalData').optional().isObject().withMessage('Original data must be an object'),
  ],
  syncController.queueChange
);

/**
 * @route   POST /api/sync/devices/:deviceId/process
 * @desc    Process pending synchronization
 * @access  Private
 */
router.post(
  '/devices/:deviceId/process',
  [
    param('deviceId').isString().notEmpty().withMessage('Device ID is required'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('dataType')
      .optional()
      .isIn(['appointment', 'patient', 'clinicalNote', 'message', 'document'])
      .withMessage('Invalid data type'),
  ],
  syncController.processPendingSync
);

/**
 * @route   POST /api/sync/devices/:deviceId/batch
 * @desc    Process batch sync operations
 * @access  Private
 */
router.post(
  '/devices/:deviceId/batch',
  [
    param('deviceId').isString().notEmpty().withMessage('Device ID is required'),
    body('operations').isArray().withMessage('Operations must be an array'),
  ],
  syncController.batchSync
);

// ============================================================================
// Incremental Sync
// ============================================================================

/**
 * @route   GET /api/sync/devices/:deviceId/incremental/:dataType
 * @desc    Get incremental sync data since last sync
 * @access  Private
 */
router.get(
  '/devices/:deviceId/incremental/:dataType',
  [
    param('deviceId').isString().notEmpty().withMessage('Device ID is required'),
    param('dataType')
      .isIn(['appointments', 'patients', 'clinicalNotes', 'messages', 'documents'])
      .withMessage('Valid data type required'),
    query('lastSyncTime').isISO8601().withMessage('Valid lastSyncTime required'),
  ],
  syncController.getIncrementalSync
);

/**
 * @route   POST /api/sync/devices/:deviceId/full-sync
 * @desc    Force full synchronization (emergency)
 * @access  Private
 */
router.post(
  '/devices/:deviceId/full-sync',
  [
    param('deviceId').isString().notEmpty().withMessage('Device ID is required'),
    body('dataTypes')
      .optional()
      .isArray()
      .withMessage('Data types must be an array'),
  ],
  syncController.forceFullSync
);

// ============================================================================
// Conflict Resolution
// ============================================================================

/**
 * @route   GET /api/sync/conflicts
 * @desc    Get conflicts for manual resolution
 * @access  Private
 */
router.get(
  '/conflicts',
  [
    query('deviceId').optional().isString().withMessage('Device ID must be string'),
  ],
  syncController.getConflicts
);

/**
 * @route   POST /api/sync/conflicts/:conflictId/resolve
 * @desc    Resolve a synchronization conflict
 * @access  Private
 */
router.post(
  '/conflicts/:conflictId/resolve',
  [
    param('conflictId').isMongoId().withMessage('Valid conflict ID required'),
    body('resolution')
      .isIn(['server_wins', 'client_wins', 'manual_resolve'])
      .withMessage('Valid resolution required'),
    body('resolvedData').optional().isObject().withMessage('Resolved data must be an object'),
  ],
  syncController.resolveConflict
);

// ============================================================================
// Statistics and Monitoring
// ============================================================================

/**
 * @route   GET /api/sync/devices/:deviceId/stats
 * @desc    Get sync statistics for device
 * @access  Private
 */
router.get(
  '/devices/:deviceId/stats',
  [param('deviceId').isString().notEmpty().withMessage('Device ID is required')],
  syncController.getSyncStats
);

// ============================================================================
// Health Check
// ============================================================================

/**
 * @route   GET /api/sync/health
 * @desc    Sync service health check
 * @access  Private
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Sync service is healthy',
    timestamp: new Date().toISOString(),
    features: [
      'device_initialization',
      'change_queuing',
      'incremental_sync',
      'conflict_resolution',
      'batch_operations',
      'connection_tracking',
    ],
  });
});

module.exports = router;