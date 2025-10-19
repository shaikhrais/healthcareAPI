
const express = require('express');
const notificationPreferencesController = require('../controllers/notificationPreferencesController');
const router = express.Router();
const protect = (req, res, next) => {
  req.user = { _id: req.headers['x-user-id'] || '507f1f77bcf86cd799439011' };
  next();
};

/**
 * @route   GET /api/notification-preferences
 * @desc    Get user's notification preferences
 */
router.get('/', protect, notificationPreferencesController.getPreferences);

/**
 * @route   PUT /api/notification-preferences
 * @desc    Update notification preferences
 */
router.put('/', protect, notificationPreferencesController.updatePreferences);

/**
 * @route   POST /api/notification-preferences/devices
 * @desc    Register a device for push notifications
 */
router.post('/devices', protect, notificationPreferencesController.registerDevice);

/**
 * @route   DELETE /api/notification-preferences/devices/:deviceId
 * @desc    Unregister a device
 */
router.delete('/devices/:deviceId', protect, notificationPreferencesController.unregisterDevice);

/**
 * @route   GET /api/notification-preferences/devices
 * @desc    Get all registered devices
 */
router.get('/devices', protect, notificationPreferencesController.getDevices);

/**
 * @route   PUT /api/notification-preferences/categories/:category
 * @desc    Update specific category preferences
 */
router.put('/categories/:category', protect, notificationPreferencesController.updateCategory);

/**
 * @route   GET /api/notification-preferences/categories
 * @desc    Get all category preferences
 */
router.get('/categories', protect, notificationPreferencesController.getCategories);

/**
 * @route   PUT /api/notification-preferences/quiet-hours
 * @desc    Update quiet hours settings
 */
router.put('/quiet-hours', protect, notificationPreferencesController.updateQuietHours);

/**
 * @route   GET /api/notification-preferences/quiet-hours
 * @desc    Get quiet hours settings
 */
router.get('/quiet-hours', protect, notificationPreferencesController.getQuietHours);

/**
 * @route   POST /api/notification-preferences/pause
 * @desc    Pause notifications temporarily
 */
router.post('/pause', protect, notificationPreferencesController.pauseNotifications);

/**
 * @route   POST /api/notification-preferences/resume
 * @desc    Resume notifications
 */
router.post('/resume', protect, notificationPreferencesController.resumeNotifications);

/**
 * @route   PUT /api/notification-preferences/sound
 * @desc    Update sound preferences
 */
router.put('/sound', protect, notificationPreferencesController.updateSound);

/**
 * @route   PUT /api/notification-preferences/vibration
 * @desc    Update vibration preferences
 */
router.put('/vibration', protect, notificationPreferencesController.updateVibration);

/**
 * @route   PUT /api/notification-preferences/badge
 * @desc    Update badge preferences
 */
router.put('/badge', protect, notificationPreferencesController.updateBadge);

/**
 * @route   PUT /api/notification-preferences/priority-filter
 * @desc    Update priority filter settings
 */
router.put('/priority-filter', protect, notificationPreferencesController.updatePriorityFilter);

/**
 * @route   GET /api/notification-preferences/stats
 * @desc    Get notification statistics
 */
router.get('/stats', protect, async (req, res) => {
  try {
    const preferences = await NotificationPreferences.findOne({ userId: req.user._id });

    if (!preferences) {
      return res.json({
        success: true,
        data: {
          totalSent: 0,
          totalDelivered: 0,
          totalRead: 0,
          totalClicked: 0,
          deliveryRate: 0,
          readRate: 0,
          clickRate: 0,
        },
      });
    }

    const { stats } = preferences;
    const deliveryRate = stats.totalSent > 0 ? (stats.totalDelivered / stats.totalSent) * 100 : 0;
    const readRate = stats.totalDelivered > 0 ? (stats.totalRead / stats.totalDelivered) * 100 : 0;
    const clickRate = stats.totalRead > 0 ? (stats.totalClicked / stats.totalRead) * 100 : 0;

    res.json({
      success: true,
      data: {
        ...stats.toObject(),
        deliveryRate: Math.round(deliveryRate * 10) / 10,
        readRate: Math.round(readRate * 10) / 10,
        clickRate: Math.round(clickRate * 10) / 10,
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
 * @route   POST /api/notification-preferences/test
 * @desc    Send a test notification
 */
router.post('/test', protect, async (req, res) => {
  try {
    const preferences = await NotificationPreferences.getOrCreate(req.user._id);

    const tokens = preferences.getActiveTokens();

    if (tokens.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active devices registered',
      });
    }

    // In production, this would actually send a push notification
    // For now, return the tokens that would be used
    res.json({
      success: true,
      message: 'Test notification would be sent to registered devices',
      data: {
        deviceCount: tokens.length,
        tokens: tokens.map((t) => ({
          platform: t.platform,
          tokenType: t.tokenType,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/notification-preferences/check
 * @desc    Check if a notification should be sent
 */
router.post('/check', protect, async (req, res) => {
  try {
    const { notificationType, priority, channel } = req.body;

    if (!notificationType || !priority) {
      return res.status(400).json({
        success: false,
        message: 'notificationType and priority are required',
      });
    }

    const preferences = await NotificationPreferences.getOrCreate(req.user._id);

    const shouldSend = preferences.shouldSendNotification(notificationType, priority, channel);

    res.json({
      success: true,
      data: {
        shouldSend,
        notificationType,
        priority,
        channel,
        reason: shouldSend ? 'Notification allowed' : 'Notification blocked by user preferences',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check notification',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/notification-preferences/reset
 * @desc    Reset preferences to default
 */
router.post('/reset', protect, notificationPreferencesController.resetPreferences);

/**
 * @route   GET /api/notification-preferences/admin/stats
 * @desc    Get global notification stats (admin only)
 */
router.get('/admin/stats', protect, notificationPreferencesController.getAdminStats);

/**
 * @route   POST /api/notification-preferences/admin/cleanup
 * @desc    Clean up inactive devices (admin only)
 */
router.post('/admin/cleanup', protect, notificationPreferencesController.adminCleanup);

module.exports = router;
