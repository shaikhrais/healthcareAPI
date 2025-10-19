const express = require('express');

const { param, query, body } = require('express-validator');

const Notification = require('../models/Notification');
const NotificationService = require('../services/notification.service');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();
// All routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/notifications
 * @desc    Get user's notifications with pagination
 * @access  Authenticated users
 */
router.get(
  '/',
  [
    query('page').isInt({ min: 1 }).optional(),
    query('limit').isInt({ min: 1, max: 100 }).optional(),
    query('unreadOnly').isBoolean().optional(),
    query('type').isString().optional(),
  ],
  async (req, res) => {
    try {
      const options = {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 20,
        unreadOnly: req.query.unreadOnly === 'true',
        type: req.query.type,
      };

      const result = await NotificationService.getUserNotifications(req.user._id, options);
      res.json(result);
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get count of unread notifications
 * @access  Authenticated users
 */
router.get('/unread-count', async (req, res) => {
  try {
    const count = await NotificationService.getUnreadCount(req.user._id);
    res.json({ count });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/notifications/urgent
 * @desc    Get urgent unread notifications
 * @access  Authenticated users
 */
const notificationsController = require('../controllers/notificationsController');
router.get('/urgent', notificationsController.getUrgentUnread);

/**
 * @route   GET /api/notifications/type/:type
 * @desc    Get notifications by type
 * @access  Authenticated users
 */
router.get(
  '/type/:type',
  [
    param('type').isString().withMessage('Valid type required'),
    query('limit').isInt({ min: 1, max: 100 }).optional(),
  ],
  notificationsController.getByType
);

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark a notification as read
 * @access  Authenticated users
 */
router.patch(
  '/:id/read',
  [param('id').isMongoId().withMessage('Valid notification ID required')],
  notificationsController.markAsRead
);

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Authenticated users
 */
router.patch('/read-all', notificationsController.markAllAsRead);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a notification
 * @access  Authenticated users
 */
router.delete(
  '/:id',
  [param('id').isMongoId().withMessage('Valid notification ID required')],
  notificationsController.deleteNotification
);

/**
 * @route   DELETE /api/notifications/read
 * @desc    Delete all read notifications
 * @access  Authenticated users
 */
router.delete('/read', notificationsController.deleteReadNotifications);

/**
 * @route   POST /api/notifications/test
 * @desc    Send a test notification (development only)
 * @access  Authenticated users
 */
router.post(
  '/test',
  [
    body('title').isString().notEmpty().withMessage('Title required'),
    body('message').isString().notEmpty().withMessage('Message required'),
    body('type').isString().optional(),
    body('priority').isIn(['low', 'normal', 'high', 'urgent']).optional(),
  ],
  notificationsController.sendTestNotification
);

/**
 * @route   POST /api/notifications/register-push-token
 * @desc    Register device push token for notifications
 * @access  Authenticated users
 */
router.post(
  '/register-push-token',
  [
    body('pushToken').isString().notEmpty().withMessage('Push token required'),
    body('platform').isIn(['ios', 'android', 'web']).optional(),
  ],
  notificationsController.registerPushToken
);

/**
 * @route   GET /api/notifications/:id
 * @desc    Get a specific notification
 * @access  Authenticated users
 */
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Valid notification ID required')],
  notificationsController.getNotificationById
);

module.exports = router;
