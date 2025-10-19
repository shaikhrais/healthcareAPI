/**
 * Push Notifications Controller
 * Handles HTTP requests for push notification management
 */

const { validationResult } = require('express-validator');
const pushNotificationService = require('../services/pushNotificationService');
const PushNotification = require('../models/PushNotification');
const Device = require('../models/Device');

/**
 * Register a device for push notifications
 */
exports.registerDevice = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const {
      deviceId,
      name,
      platform,
      model,
      manufacturer,
      osVersion,
      appVersion,
      pushToken,
      provider = 'fcm',
      preferences = {},
      capabilities = {},
      location = {}
    } = req.body;

    // Check if device already exists
    let device = await Device.findOne({ deviceId });

    if (device) {
      // Update existing device
      device.user = userId;
      device.name = name;
      device.platform = platform;
      device.model = model;
      device.manufacturer = manufacturer;
      device.osVersion = osVersion;
      device.appVersion = appVersion;
      device.isActive = true;
      device.lastActivity = new Date();

      if (preferences) {
        Object.assign(device.preferences, preferences);
      }

      if (capabilities) {
        Object.assign(device.capabilities, capabilities);
      }

      if (location) {
        Object.assign(device.location, location);
      }

      if (pushToken) {
        await device.updatePushToken(pushToken, provider);
      }

      await device.save();
    } else {
      // Create new device
      device = new Device({
        user: userId,
        deviceId,
        name,
        platform,
        model,
        manufacturer,
        osVersion,
        appVersion,
        preferences: {
          enabled: true,
          categories: {
            appointment: true,
            medication: true,
            health_alert: true,
            test_result: true,
            general: true,
            emergency: true,
            reminder: true,
            marketing: false,
            system: true
          },
          quietHours: {
            enabled: false,
            startTime: '22:00',
            endTime: '08:00'
          },
          priority: {
            low: true,
            normal: true,
            high: true,
            critical: true
          },
          ...preferences
        },
        capabilities: {
          pushNotifications: true,
          richMedia: true,
          actionButtons: true,
          badge: true,
          sound: true,
          vibration: true,
          ...capabilities
        },
        location,
        isActive: true,
        lastActivity: new Date()
      });

      if (pushToken) {
        await device.updatePushToken(pushToken, provider);
      }

      await device.save();
    }

    res.status(201).json({
      success: true,
      message: 'Device registered successfully',
      device: {
        id: device._id,
        deviceId: device.deviceId,
        name: device.name,
        platform: device.platform,
        isActive: device.isActive,
        preferences: device.preferences
      }
    });
  } catch (error) {
    console.error('Register device error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register device',
      message: error.message
    });
  }
};

/**
 * Update device preferences
 */
exports.updateDevicePreferences = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { deviceId } = req.params;
    const userId = req.user.id;
    const { preferences } = req.body;

    const device = await Device.findOne({ deviceId, user: userId });
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }

    await device.updatePreferences(preferences);

    res.json({
      success: true,
      message: 'Device preferences updated successfully',
      preferences: device.preferences
    });
  } catch (error) {
    console.error('Update device preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update device preferences',
      message: error.message
    });
  }
};

/**
 * Get user's devices
 */
exports.getUserDevices = async (req, res) => {
  try {
    const userId = req.user.id;
    const { activeOnly = 'true' } = req.query;

    const devices = await Device.getForUser(userId, activeOnly === 'true');

    res.json({
      success: true,
      count: devices.length,
      devices: devices.map(device => ({
        id: device._id,
        deviceId: device.deviceId,
        name: device.name,
        platform: device.platform,
        model: device.model,
        manufacturer: device.manufacturer,
        osVersion: device.osVersion,
        appVersion: device.appVersion,
        isActive: device.isActive,
        isVerified: device.isVerified,
        lastActivity: device.lastActivity,
        preferences: device.preferences,
        capabilities: device.capabilities,
        stats: device.stats
      }))
    });
  } catch (error) {
    console.error('Get user devices error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user devices',
      message: error.message
    });
  }
};

/**
 * Send push notification to user
 */
exports.sendNotification = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      userIds,
      deviceIds,
      title,
      message,
      category = 'general',
      priority = 'normal',
      data = {},
      actions = [],
      media = null,
      scheduledFor = null,
      settings = {}
    } = req.body;

    let result;

    if (userIds && userIds.length > 0) {
      result = await pushNotificationService.sendToUsers(userIds, {
        title,
        message,
        category,
        priority,
        data,
        actions,
        media,
        scheduledFor,
        settings
      });
    } else if (deviceIds && deviceIds.length > 0) {
      result = await pushNotificationService.sendToDevices(deviceIds, {
        title,
        message,
        category,
        priority,
        data,
        actions,
        media,
        scheduledFor,
        settings
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Either userIds or deviceIds must be provided'
      });
    }

    res.json({
      success: true,
      message: 'Notification sent successfully',
      result
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send notification',
      message: error.message
    });
  }
};

/**
 * Send bulk notifications
 */
exports.sendBulkNotifications = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { notifications } = req.body;

    if (!Array.isArray(notifications) || notifications.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Notifications array is required and cannot be empty'
      });
    }

    const results = await pushNotificationService.sendBulk(notifications);

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    res.json({
      success: true,
      message: 'Bulk notifications processed',
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount
      },
      results
    });
  } catch (error) {
    console.error('Send bulk notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send bulk notifications',
      message: error.message
    });
  }
};

/**
 * Get user's notifications
 */
exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      limit = 50,
      skip = 0,
      category,
      status,
      priority,
      unreadOnly = 'false'
    } = req.query;

    const options = {
      limit: parseInt(limit, 10),
      skip: parseInt(skip, 10),
      unreadOnly: unreadOnly === 'true'
    };

    if (category) options.category = category;
    if (status) options.status = status;
    if (priority) options.priority = priority;

    const notifications = await PushNotification.getForUser(userId, options);

    res.json({
      success: true,
      count: notifications.length,
      notifications: notifications.map(notification => ({
        id: notification._id,
        title: notification.title,
        message: notification.message,
        category: notification.category,
        priority: notification.priority,
        status: notification.status,
        isRead: notification.isRead,
        isClicked: notification.isClicked,
        data: Object.fromEntries(notification.data),
        actions: notification.actions,
        media: notification.media,
        createdAt: notification.createdAt,
        sentAt: notification.sentAt,
        deliveredAt: notification.deliveredAt,
        readAt: notification.readAt
      }))
    });
  } catch (error) {
    console.error('Get user notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notifications',
      message: error.message
    });
  }
};

/**
 * Mark notification as read
 */
exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await PushNotification.findOne({
      _id: notificationId,
      user: userId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    await notification.markAsRead();

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read',
      message: error.message
    });
  }
};

/**
 * Mark notification as clicked
 */
exports.markAsClicked = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await PushNotification.findOne({
      _id: notificationId,
      user: userId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    await notification.markAsClicked();

    res.json({
      success: true,
      message: 'Notification marked as clicked'
    });
  } catch (error) {
    console.error('Mark as clicked error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as clicked',
      message: error.message
    });
  }
};

/**
 * Dismiss notification
 */
exports.dismissNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await PushNotification.findOne({
      _id: notificationId,
      user: userId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    await notification.markAsDismissed();

    res.json({
      success: true,
      message: 'Notification dismissed'
    });
  } catch (error) {
    console.error('Dismiss notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to dismiss notification',
      message: error.message
    });
  }
};

/**
 * Get notification statistics
 */
exports.getNotificationStatistics = async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;

    const statistics = await pushNotificationService.getStatistics(
      userId,
      parseInt(days, 10)
    );

    res.json({
      success: true,
      period: `${days} days`,
      statistics
    });
  } catch (error) {
    console.error('Get notification statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notification statistics',
      message: error.message
    });
  }
};

/**
 * Test notification delivery
 */
exports.testNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { deviceId } = req.body;

    let targetDevices;
    if (deviceId) {
      targetDevices = [deviceId];
    } else {
      const devices = await Device.getForUser(userId, true);
      targetDevices = devices.map(d => d.deviceId);
    }

    if (targetDevices.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No active devices found for testing'
      });
    }

    const result = await pushNotificationService.sendToDevices(targetDevices, {
      title: 'Test Notification',
      message: 'This is a test notification from the Healthcare app',
      category: 'system',
      priority: 'normal',
      data: {
        test: 'true',
        timestamp: new Date().toISOString()
      }
    });

    res.json({
      success: true,
      message: 'Test notification sent',
      result
    });
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification',
      message: error.message
    });
  }
};

/**
 * Deactivate device
 */
exports.deactivateDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user.id;

    const device = await Device.findOne({ deviceId, user: userId });
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }

    await device.deactivate();

    res.json({
      success: true,
      message: 'Device deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate device error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate device',
      message: error.message
    });
  }
};

/**
 * Get notification categories and settings
 */
exports.getNotificationSettings = async (req, res) => {
  try {
    const settings = {
      categories: [
        { id: 'appointment', name: 'Appointments', description: 'Appointment reminders and updates' },
        { id: 'medication', name: 'Medications', description: 'Medication reminders and alerts' },
        { id: 'health_alert', name: 'Health Alerts', description: 'Important health notifications' },
        { id: 'test_result', name: 'Test Results', description: 'Lab and test result notifications' },
        { id: 'general', name: 'General', description: 'General healthcare notifications' },
        { id: 'emergency', name: 'Emergency', description: 'Emergency and urgent notifications' },
        { id: 'reminder', name: 'Reminders', description: 'General reminders and follow-ups' },
        { id: 'marketing', name: 'Marketing', description: 'Promotional and marketing messages' },
        { id: 'system', name: 'System', description: 'System updates and maintenance' }
      ],
      priorities: [
        { id: 'low', name: 'Low', description: 'Non-urgent notifications' },
        { id: 'normal', name: 'Normal', description: 'Standard notifications' },
        { id: 'high', name: 'High', description: 'Important notifications' },
        { id: 'critical', name: 'Critical', description: 'Urgent and critical notifications' }
      ]
    };

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notification settings',
      message: error.message
    });
  }
};

/**
 * Schedule notification
 */
exports.scheduleNotification = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      userIds,
      title,
      message,
      category = 'general',
      priority = 'normal',
      scheduledFor,
      data = {},
      actions = [],
      settings = {}
    } = req.body;

    const scheduledDate = new Date(scheduledFor);
    if (scheduledDate <= new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Scheduled time must be in the future'
      });
    }

    const result = await pushNotificationService.sendToUsers(userIds, {
      title,
      message,
      category,
      priority,
      data,
      actions,
      scheduledFor: scheduledDate,
      settings
    });

    res.json({
      success: true,
      message: 'Notification scheduled successfully',
      scheduledFor: scheduledDate,
      result
    });
  } catch (error) {
    console.error('Schedule notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to schedule notification',
      message: error.message
    });
  }
};