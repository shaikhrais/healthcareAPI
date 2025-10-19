/**
 * Push Notifications Routes
 * API endpoints for mobile push notification management
 */

const express = require('express');
const { body, param, query } = require('express-validator');
const authMiddleware = require('../../auth/middleware/authMiddleware');
const rateLimiterMiddleware = require('../../../shared/middleware/rateLimiterMiddleware');
const pushNotificationsController = require('../controllers/pushNotificationsController');

const router = express.Router();

// Apply middleware to all routes
router.use(authMiddleware);

// Define validation constants
const SUPPORTED_PLATFORMS = ['ios', 'android', 'web'];
const NOTIFICATION_CATEGORIES = [
  'appointment', 'medication', 'health_alert', 'test_result',
  'general', 'emergency', 'reminder', 'marketing', 'system'
];
const NOTIFICATION_PRIORITIES = ['low', 'normal', 'high', 'critical'];

/**
 * @swagger
 * components:
 *   schemas:
 *     NotificationDevice:
 *       type: object
 *       required:
 *         - deviceToken
 *         - platform
 *       properties:
 *         deviceToken:
 *           type: string
 *           example: "abc123def456ghi789"
 *           description: "Device-specific push notification token"
 *         platform:
 *           type: string
 *           enum: [ios, android, web]
 *           example: "ios"
 *         deviceInfo:
 *           type: object
 *           properties:
 *             model:
 *               type: string
 *               example: "iPhone 14 Pro"
 *             version:
 *               type: string
 *               example: "iOS 16.0"
 *             appVersion:
 *               type: string
 *               example: "1.2.0"
 *         preferences:
 *           type: object
 *           properties:
 *             enabled:
 *               type: boolean
 *               default: true
 *             categories:
 *               type: array
 *               items:
 *                 type: string
 *                 enum: [appointment, medication, health_alert, test_result, general, emergency, reminder, marketing, system]
 *             quietHours:
 *               type: object
 *               properties:
 *                 enabled:
 *                   type: boolean
 *                 start:
 *                   type: string
 *                   example: "22:00"
 *                 end:
 *                   type: string
 *                   example: "08:00"
 *     PushNotification:
 *       type: object
 *       required:
 *         - title
 *         - body
 *         - category
 *       properties:
 *         title:
 *           type: string
 *           example: "Appointment Reminder"
 *           maxLength: 100
 *         body:
 *           type: string
 *           example: "You have an appointment with Dr. Smith tomorrow at 2:00 PM"
 *           maxLength: 500
 *         category:
 *           type: string
 *           enum: [appointment, medication, health_alert, test_result, general, emergency, reminder, marketing, system]
 *           example: "appointment"
 *         priority:
 *           type: string
 *           enum: [low, normal, high, critical]
 *           default: normal
 *         data:
 *           type: object
 *           description: "Additional data payload for the notification"
 *           properties:
 *             appointmentId:
 *               type: string
 *             patientId:
 *               type: string
 *             action:
 *               type: string
 *               example: "view_appointment"
 *         scheduledFor:
 *           type: string
 *           format: date-time
 *           description: "Schedule notification for future delivery"
 *         sound:
 *           type: string
 *           example: "default"
 *         badge:
 *           type: number
 *           example: 1
 *         recipients:
 *           type: array
 *           items:
 *             oneOf:
 *               - type: string
 *                 description: "User ID"
 *               - type: object
 *                 properties:
 *                   userId:
 *                     type: string
 *                   deviceToken:
 *                     type: string
 *     NotificationHistory:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         title:
 *           type: string
 *         body:
 *           type: string
 *         category:
 *           type: string
 *         status:
 *           type: string
 *           enum: [sent, delivered, failed, pending]
 *         sentAt:
 *           type: string
 *           format: date-time
 *         deliveredAt:
 *           type: string
 *           format: date-time
 *         recipients:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               status:
 *                 type: string
 *               deliveredAt:
 *                 type: string
 *                 format: date-time
 */

/**
 * @swagger
 * /api/notifications/devices/register:
 *   post:
 *     tags: [Push Notifications]
 *     summary: Register device for push notifications
 *     description: Register a mobile device to receive push notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotificationDevice'
 *     responses:
 *       201:
 *         description: Device registered successfully
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
 *                   example: "Device registered for notifications"
 *                 device:
 *                   $ref: '#/components/schemas/NotificationDevice'
 *       400:
 *         description: Invalid device data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Device already registered
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
router.post('/devices/register',
  rateLimiterMiddleware('device_register', 10), // 10 registrations per hour
  [
    body('deviceId')
      .notEmpty()
      .withMessage('Device ID is required')
      .isLength({ max: 100 })
      .withMessage('Device ID must be less than 100 characters'),
    body('name')
      .notEmpty()
      .withMessage('Device name is required')
      .isLength({ max: 100 })
      .withMessage('Device name must be less than 100 characters'),
    body('platform')
      .isIn(SUPPORTED_PLATFORMS)
      .withMessage('Platform must be one of: ' + SUPPORTED_PLATFORMS.join(', ')),
    body('pushToken')
      .optional()
      .isString()
      .withMessage('Push token must be a string'),
    body('provider')
      .optional()
      .isIn(['fcm', 'apns', 'web_push'])
      .withMessage('Provider must be fcm, apns, or web_push'),
    body('preferences')
      .optional()
      .isObject()
      .withMessage('Preferences must be an object'),
    body('capabilities')
      .optional()
      .isObject()
      .withMessage('Capabilities must be an object'),
    body('location')
      .optional()
      .isObject()
      .withMessage('Location must be an object')
  ],
  pushNotificationsController.registerDevice
);

/**
 * PUT /api/notifications/devices/:deviceId/preferences
 * Update device notification preferences
 */

/**
 * @swagger
 * /api/notifications/devices/{deviceId}/preferences:
 *   put:
 *     tags: [Push Notifications]
 *     summary: Update device notification preferences
 *     description: Update notification preferences for a registered device
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Device ID
 *         example: "device_12345"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - preferences
 *             properties:
 *               preferences:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                     description: Enable/disable notifications for this device
 *                     example: true
 *                   categories:
 *                     type: object
 *                     description: Notification category preferences
 *                     properties:
 *                       appointment:
 *                         type: boolean
 *                         example: true
 *                       medication:
 *                         type: boolean
 *                         example: true
 *                       health_alert:
 *                         type: boolean
 *                         example: false
 *                   quietHours:
 *                     type: object
 *                     properties:
 *                       enabled:
 *                         type: boolean
 *                         example: true
 *                       start:
 *                         type: string
 *                         example: "22:00"
 *                       end:
 *                         type: string
 *                         example: "08:00"
 *     responses:
 *       200:
 *         description: Device preferences updated successfully
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
 *                   example: "Device preferences updated successfully"
 *       400:
 *         description: Invalid preferences data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Device not found
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
router.put('/devices/:deviceId/preferences',
  rateLimiterMiddleware('device_update', 50), // 50 updates per hour
  [
    param('deviceId')
      .notEmpty()
      .withMessage('Device ID is required'),
    body('preferences')
      .isObject()
      .withMessage('Preferences object is required'),
    body('preferences.enabled')
      .optional()
      .isBoolean()
      .withMessage('Enabled must be a boolean'),
    body('preferences.categories')
      .optional()
      .isObject()
      .withMessage('Categories must be an object'),
    body('preferences.quietHours')
      .optional()
      .isObject()
      .withMessage('Quiet hours must be an object'),
    body('preferences.priority')
      .optional()
      .isObject()
      .withMessage('Priority must be an object')
  ],
  pushNotificationsController.updateDevicePreferences
);

/**
 * @swagger
 * /api/notifications/devices:
 *   get:
 *     tags: [Push Notifications]
 *     summary: Get user's registered devices
 *     description: Retrieve all devices registered for push notifications for the current user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: boolean
 *         description: Filter to show only active devices
 *         example: true
 *     responses:
 *       200:
 *         description: Devices retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/NotificationDevice'
 *                 count:
 *                   type: integer
 *                   example: 3
 *       500:
 *         description: Failed to retrieve devices
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/devices',
  [
    query('activeOnly')
      .optional()
      .isBoolean()
      .withMessage('activeOnly must be a boolean')
  ],
  pushNotificationsController.getUserDevices
);

/**
 * DELETE /api/notifications/devices/:deviceId
 * Deactivate a device
 */
router.delete('/devices/:deviceId',
  rateLimiterMiddleware('device_deactivate', 20), // 20 deactivations per hour
  [
    param('deviceId')
      .notEmpty()
      .withMessage('Device ID is required')
  ],
  pushNotificationsController.deactivateDevice
);

/**
 * @swagger
 * /api/notifications/send:
 *   post:
 *     tags: [Push Notifications]
 *     summary: Send push notification
 *     description: Send a push notification to specified users or devices
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - message
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 100
 *                 description: Notification title
 *                 example: "Appointment Reminder"
 *               message:
 *                 type: string
 *                 maxLength: 500
 *                 description: Notification message
 *                 example: "You have an appointment with Dr. Smith tomorrow at 2:00 PM"
 *               category:
 *                 type: string
 *                 enum: [appointment, medication, health_alert, test_result, general, emergency, reminder, marketing, system]
 *                 example: "appointment"
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high, critical]
 *                 example: "normal"
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 maxItems: 1000
 *                 description: Array of user IDs to send notification to
 *               deviceIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 maxItems: 100
 *                 description: Array of device IDs to send notification to
 *               data:
 *                 type: object
 *                 description: Additional data payload for the notification
 *               scheduledFor:
 *                 type: string
 *                 format: date-time
 *                 description: Schedule notification for future delivery
 *     responses:
 *       200:
 *         description: Notification sent successfully
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
 *                   example: "Notification sent successfully"
 *                 notificationId:
 *                   type: string
 *                   example: "notif_12345"
 *       400:
 *         description: Invalid notification data
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
 *       500:
 *         description: Failed to send notification
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/send',
  rateLimiterMiddleware('notification_send', 100), // 100 sends per hour
  [
    body('title')
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ max: 100 })
      .withMessage('Title must be less than 100 characters'),
    body('message')
      .notEmpty()
      .withMessage('Message is required')
      .isLength({ max: 500 })
      .withMessage('Message must be less than 500 characters'),
    body('category')
      .optional()
      .isIn(NOTIFICATION_CATEGORIES)
      .withMessage('Invalid notification category'),
    body('priority')
      .optional()
      .isIn(NOTIFICATION_PRIORITIES)
      .withMessage('Invalid notification priority'),
    body('userIds')
      .optional()
      .isArray({ min: 1, max: 1000 })
      .withMessage('userIds must be an array with 1-1000 items'),
    body('deviceIds')
      .optional()
      .isArray({ min: 1, max: 100 })
      .withMessage('deviceIds must be an array with 1-100 items'),
    body('data')
      .optional()
      .isObject()
      .withMessage('Data must be an object'),
    body('actions')
      .optional()
      .isArray({ max: 3 })
      .withMessage('Actions must be an array with max 3 items'),
    body('scheduledFor')
      .optional()
      .isISO8601()
      .withMessage('scheduledFor must be a valid ISO date'),
    body('settings')
      .optional()
      .isObject()
      .withMessage('Settings must be an object')
  ],
  pushNotificationsController.sendNotification
);

/**
 * POST /api/notifications/bulk
 * Send bulk notifications
 */
router.post('/bulk',
  rateLimiterMiddleware('notification_bulk', 5), // 5 bulk sends per hour
  [
    body('notifications')
      .isArray({ min: 1, max: 1000 })
      .withMessage('Notifications must be an array with 1-1000 items'),
    body('notifications.*.title')
      .notEmpty()
      .withMessage('Each notification must have a title'),
    body('notifications.*.message')
      .notEmpty()
      .withMessage('Each notification must have a message'),
    body('notifications.*.userIds')
      .optional()
      .isArray({ min: 1 })
      .withMessage('userIds must be a non-empty array when provided'),
    body('notifications.*.deviceIds')
      .optional()
      .isArray({ min: 1 })
      .withMessage('deviceIds must be a non-empty array when provided')
  ],
  pushNotificationsController.sendBulkNotifications
);

/**
 * POST /api/notifications/schedule
 * Schedule a notification for future delivery
 */
router.post('/schedule',
  rateLimiterMiddleware('notification_schedule', 50), // 50 schedules per hour
  [
    body('title')
      .notEmpty()
      .withMessage('Title is required'),
    body('message')
      .notEmpty()
      .withMessage('Message is required'),
    body('userIds')
      .isArray({ min: 1, max: 1000 })
      .withMessage('userIds must be an array with 1-1000 items'),
    body('scheduledFor')
      .isISO8601()
      .withMessage('scheduledFor must be a valid ISO date'),
    body('category')
      .optional()
      .isIn(NOTIFICATION_CATEGORIES)
      .withMessage('Invalid notification category'),
    body('priority')
      .optional()
      .isIn(NOTIFICATION_PRIORITIES)
      .withMessage('Invalid notification priority')
  ],
  pushNotificationsController.scheduleNotification
);

/**
 * GET /api/notifications
 * Get user's notifications
 */
router.get('/',
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('skip')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Skip must be a non-negative integer'),
    query('category')
      .optional()
      .isIn(NOTIFICATION_CATEGORIES)
      .withMessage('Invalid notification category'),
    query('status')
      .optional()
      .isIn(['pending', 'sent', 'delivered', 'failed', 'cancelled'])
      .withMessage('Invalid notification status'),
    query('priority')
      .optional()
      .isIn(NOTIFICATION_PRIORITIES)
      .withMessage('Invalid notification priority'),
    query('unreadOnly')
      .optional()
      .isBoolean()
      .withMessage('unreadOnly must be a boolean')
  ],
  pushNotificationsController.getUserNotifications
);

/**
 * POST /api/notifications/:notificationId/read
 * Mark notification as read
 */
router.post('/:notificationId/read',
  rateLimiterMiddleware('notification_action', 200), // 200 actions per hour
  [
    param('notificationId')
      .isMongoId()
      .withMessage('Invalid notification ID')
  ],
  pushNotificationsController.markAsRead
);

/**
 * POST /api/notifications/:notificationId/click
 * Mark notification as clicked
 */
router.post('/:notificationId/click',
  rateLimiterMiddleware('notification_action', 200), // 200 actions per hour
  [
    param('notificationId')
      .isMongoId()
      .withMessage('Invalid notification ID')
  ],
  pushNotificationsController.markAsClicked
);

/**
 * POST /api/notifications/:notificationId/dismiss
 * Dismiss notification
 */
router.post('/:notificationId/dismiss',
  rateLimiterMiddleware('notification_action', 200), // 200 actions per hour
  [
    param('notificationId')
      .isMongoId()
      .withMessage('Invalid notification ID')
  ],
  pushNotificationsController.dismissNotification
);

/**
 * GET /api/notifications/statistics
 * Get notification statistics
 */
router.get('/statistics',
  [
    query('days')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Days must be between 1 and 365')
  ],
  pushNotificationsController.getNotificationStatistics
);

/**
 * GET /api/notifications/settings
 * Get notification categories and settings
 */
router.get('/settings',
  pushNotificationsController.getNotificationSettings
);

/**
 * POST /api/notifications/test
 * Send test notification
 */
router.post('/test',
  rateLimiterMiddleware('notification_test', 10), // 10 tests per hour
  [
    body('deviceId')
      .optional()
      .isString()
      .withMessage('Device ID must be a string')
  ],
  pushNotificationsController.testNotification
);

// Health check endpoints

/**
 * GET /api/notifications/health
 * Check notification service health
 */
router.get('/health',
  async (req, res) => {
    try {
      const pushNotificationService = require('../services/pushNotificationService');
      const status = pushNotificationService.getStatus();
      
      res.json({
        success: true,
        status: 'healthy',
        services: status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// Webhook endpoints for delivery confirmations

/**
 * POST /api/notifications/webhook/fcm
 * FCM delivery status webhook
 */
router.post('/webhook/fcm',
  rateLimiterMiddleware('webhook', 1000), // 1000 webhooks per hour
  async (req, res) => {
    try {
      // Handle FCM delivery status updates
      const { data } = req.body;
      
      // Process delivery confirmations, failures, etc.
      console.log('FCM webhook received:', data);
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('FCM webhook error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * POST /api/notifications/webhook/web-push
 * Web Push delivery status webhook
 */
router.post('/webhook/web-push',
  rateLimiterMiddleware('webhook', 1000), // 1000 webhooks per hour
  async (req, res) => {
    try {
      // Handle Web Push delivery status updates
      const { data } = req.body;
      
      console.log('Web Push webhook received:', data);
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Web Push webhook error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

module.exports = router;