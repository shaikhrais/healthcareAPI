// richNotificationsController.js
// Controller for rich notification-related endpoints

const RichNotification = require('../models/RichNotification');

exports.create = async (req, res) => {
  try {
    const notification = await RichNotification.create({
      ...req.body,
      createdBy: req.user._id,
      organization: req.organization._id,
    });
    res.status(201).json({
      success: true,
      message: 'Rich notification created successfully',
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create notification',
      error: error.message,
    });
  }
};

exports.getAll = async (req, res) => {
  try {
    const { type, priority, read, dismissed, limit = 20, page = 1 } = req.query;
    const query = { userId: req.user._id };
    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (read !== undefined) query.read = read === 'true';
    if (dismissed !== undefined) query.dismissed = dismissed === 'true';
    const notifications = await RichNotification.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .limit(parseInt(limit, 10))
      .skip((parseInt(page, 10) - 1) * parseInt(limit, 10));
    const total = await RichNotification.countDocuments(query);
    res.json({
      success: true,
      count: notifications.length,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message,
    });
  }
};

exports.getActive = async (req, res) => {
  try {
    const { type, priority, limit = 20 } = req.query;
    const options = { limit: parseInt(limit, 10) };
    if (type) options.type = type;
    if (priority) options.priority = priority;
    const notifications = await RichNotification.getActive(req.user._id, options);
    res.json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active notifications',
      error: error.message,
    });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const count = await RichNotification.getUnreadCount(req.user._id);
    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count',
      error: error.message,
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const notification = await RichNotification.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }
    res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification',
      error: error.message,
    });
  }
};

exports.update = async (req, res) => {
  try {
    const notification = await RichNotification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }
    res.json({
      success: true,
      message: 'Notification updated successfully',
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update notification',
      error: error.message,
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const notification = await RichNotification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }
    res.json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message,
    });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const notification = await RichNotification.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }
    await notification.markAsRead();
    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark as read',
      error: error.message,
    });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const result = await RichNotification.markAllAsRead(req.user._id);
    res.json({
      success: true,
      message: 'All notifications marked as read',
      data: { modifiedCount: result.modifiedCount },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark all as read',
      error: error.message,
    });
  }
};

exports.dismiss = async (req, res) => {
  try {
    const notification = await RichNotification.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }
    await notification.dismiss();
    res.json({
      success: true,
      message: 'Notification dismissed',
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to dismiss notification',
      error: error.message,
    });
  }
};

exports.bulkDismiss = async (req, res) => {
  try {
    const { notificationIds } = req.body;
    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({
        success: false,
        message: 'notificationIds array is required',
      });
    }
    const result = await RichNotification.bulkDismiss(req.user._id, notificationIds);
    res.json({
      success: true,
      message: 'Notifications dismissed',
      data: { modifiedCount: result.modifiedCount },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to dismiss notifications',
      error: error.message,
    });
  }
};

exports.snooze = async (req, res) => {
  try {
    const { durationMinutes = 60 } = req.body;
    const notification = await RichNotification.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }
    await notification.snooze(durationMinutes);
    res.json({
      success: true,
      message: `Notification snoozed for ${durationMinutes} minutes`,
      data: { snoozedUntil: notification.snoozedUntil },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to snooze notification',
      error: error.message,
    });
  }
};

exports.unsnooze = async (req, res) => {
  try {
    const notification = await RichNotification.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }
    await notification.unsnooze();
    res.json({
      success: true,
      message: 'Notification unsnoozed',
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to unsnooze notification',
      error: error.message,
    });
  }
};

exports.executeAction = async (req, res) => {
  try {
    const { responseType, responseData } = req.body;
    const notification = await RichNotification.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }
    const action = notification.getAction(req.params.actionId);
    if (!action) {
      return res.status(404).json({
        success: false,
        message: 'Action not found',
      });
    }
    await notification.recordActionResponse(
      req.params.actionId,
      responseType || 'clicked',
      responseData
    );
    res.json({
      success: true,
      message: 'Action executed successfully',
      data: { notification, action },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to execute action',
      error: error.message,
    });
  }
};

exports.updateProgress = async (req, res) => {
  try {
    const { current, max } = req.body;
    if (current === undefined) {
      return res.status(400).json({
        success: false,
        message: 'current is required',
      });
    }
    const notification = await RichNotification.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }
    await notification.updateProgress(current, max);
    res.json({
      success: true,
      message: 'Progress updated',
      data: notification.progress,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update progress',
      error: error.message,
    });
  }
};

exports.getByGroup = async (req, res) => {
  try {
    const notifications = await RichNotification.getByGroup(req.user._id, req.params.groupId);
    res.json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch grouped notifications',
      error: error.message,
    });
  }
};

exports.getAnalyticsSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateRange = {
      startDate: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate) : new Date(),
    };
    const summary = await RichNotification.getAnalyticsSummary(req.user._id, dateRange);
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
};

exports.updateDeliveryStatus = async (req, res) => {
  try {
    const { channel, status, metadata } = req.body;
    if (!channel || !status) {
      return res.status(400).json({
        success: false,
        message: 'channel and status are required',
      });
    }
    const notification = await RichNotification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }
    await notification.updateDeliveryStatus(channel, status, metadata);
    res.json({
      success: true,
      message: 'Delivery status updated',
      data: notification.deliveryStatus,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update delivery status',
      error: error.message,
    });
  }
};

exports.cleanupExpired = async (req, res) => {
  try {
    const result = await RichNotification.cleanupExpired();
    res.json({
      success: true,
      message: 'Expired notifications cleaned up',
      data: { deletedCount: result.deletedCount },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup notifications',
      error: error.message,
    });
  }
};

exports.getScheduledReady = async (req, res) => {
  try {
    const notifications = await RichNotification.getScheduledReady();
    res.json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scheduled notifications',
      error: error.message,
    });
  }
};

exports.getSnoozedReady = async (req, res) => {
  try {
    const notifications = await RichNotification.getSnoozedReady();
    res.json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch snoozed notifications',
      error: error.message,
    });
  }
};
