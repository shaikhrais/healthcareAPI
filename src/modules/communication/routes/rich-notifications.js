const express = require('express');
const richNotificationsController = require('../controllers/richNotificationsController');
/**
 * Rich Notifications API Routes
 * TASK-14.7 - Rich Notifications with Actions
 */

const router = express.Router();
// Simple auth middleware
const protect = (req, res, next) => {
  req.user = { _id: req.headers['x-user-id'] || '507f1f77bcf86cd799439011' };
  req.organization = { _id: req.headers['x-organization-id'] || '507f1f77bcf86cd799439012' };
  next();
};

/**
 * @route   POST /api/rich-notifications
 * @desc    Create a rich notification
 */
router.post('/', protect, richNotificationsController.create);

/**
 * @route   GET /api/rich-notifications
 * @desc    Get user's notifications
 */
router.get('/', protect, richNotificationsController.getAll);

/**
 * @route   GET /api/rich-notifications/active
 * @desc    Get active notifications (not dismissed, not expired)
 */
router.get('/active', protect, richNotificationsController.getActive);

/**
 * @route   GET /api/rich-notifications/unread-count
 * @desc    Get unread notification count
 */
router.get('/unread-count', protect, richNotificationsController.getUnreadCount);

/**
 * @route   GET /api/rich-notifications/:id
 * @desc    Get specific notification
 */
router.get('/:id', protect, richNotificationsController.getById);

/**
 * @route   PUT /api/rich-notifications/:id
 * @desc    Update notification
 */
router.put('/:id', protect, richNotificationsController.update);

/**
 * @route   DELETE /api/rich-notifications/:id
 * @desc    Delete notification
 */
router.delete('/:id', protect, richNotificationsController.delete);

/**
 * @route   POST /api/rich-notifications/:id/read
 * @desc    Mark notification as read
 */
router.post('/:id/read', protect, richNotificationsController.markAsRead);

/**
 * @route   POST /api/rich-notifications/mark-all-read
 * @desc    Mark all notifications as read
 */
router.post('/mark-all-read', protect, richNotificationsController.markAllAsRead);

/**
 * @route   POST /api/rich-notifications/:id/dismiss
 * @desc    Dismiss notification
 */
router.post('/:id/dismiss', protect, richNotificationsController.dismiss);

/**
 * @route   POST /api/rich-notifications/bulk-dismiss
 * @desc    Dismiss multiple notifications
 */
router.post('/bulk-dismiss', protect, richNotificationsController.bulkDismiss);

/**
 * @route   POST /api/rich-notifications/:id/snooze
 * @desc    Snooze notification
 */
router.post('/:id/snooze', protect, richNotificationsController.snooze);

/**
 * @route   POST /api/rich-notifications/:id/unsnooze
 * @desc    Unsnooze notification
 */
router.post('/:id/unsnooze', protect, richNotificationsController.unsnooze);

/**
 * @route   POST /api/rich-notifications/:id/actions/:actionId
 * @desc    Execute notification action
 */
router.post('/:id/actions/:actionId', protect, richNotificationsController.executeAction);

/**
 * @route   PUT /api/rich-notifications/:id/progress
 * @desc    Update notification progress
 */
router.put('/:id/progress', protect, richNotificationsController.updateProgress);

/**
 * @route   GET /api/rich-notifications/group/:groupId
 * @desc    Get notifications by group
 */
router.get('/group/:groupId', protect, richNotificationsController.getByGroup);

/**
 * @route   GET /api/rich-notifications/analytics/summary
 * @desc    Get notification analytics
 */
router.get('/analytics/summary', protect, richNotificationsController.getAnalyticsSummary);

/**
 * @route   PUT /api/rich-notifications/:id/delivery-status
 * @desc    Update delivery status (internal/admin use)
 */
router.put('/:id/delivery-status', protect, richNotificationsController.updateDeliveryStatus);

/**
 * @route   POST /api/rich-notifications/admin/cleanup
 * @desc    Clean up expired notifications (admin only)
 */
router.post('/admin/cleanup', protect, richNotificationsController.cleanupExpired);

/**
 * @route   GET /api/rich-notifications/admin/scheduled
 * @desc    Get scheduled notifications ready to send (admin only)
 */
router.get('/admin/scheduled', protect, richNotificationsController.getScheduledReady);

/**
 * @route   GET /api/rich-notifications/admin/snoozed
 * @desc    Get snoozed notifications ready to reappear (admin only)
 */
router.get('/admin/snoozed', protect, richNotificationsController.getSnoozedReady);

module.exports = router;
