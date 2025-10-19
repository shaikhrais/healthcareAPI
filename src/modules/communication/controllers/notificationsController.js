// notificationsController.js
// Controller for notification-related endpoints

const Notification = require('../models/Notification');
const NotificationService = require('../services/notificationService');
const { validationResult } = require('express-validator');

exports.getUrgentUnread = async (req, res) => {
  try {
    const notifications = await Notification.getUrgentUnread(req.user._id);
    res.json(notifications);
  } catch (error) {
    console.error('Urgent notifications error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getByType = async (req, res) => {
  try {
    const { type } = req.params;
    const limit = parseInt(req.query.limit, 10) || 50;
    const notifications = await Notification.getByType(req.user._id, type, limit);
    res.json(notifications);
  } catch (error) {
    console.error('Get by type error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const notification = await NotificationService.markAsRead(req.params.id, req.user._id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json(notification);
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await NotificationService.markAllAsRead(req.user._id);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteReadNotifications = async (req, res) => {
  try {
    const result = await Notification.deleteMany({
      userId: req.user._id,
      read: true,
    });
    res.json({
      message: 'Read notifications deleted',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Delete read notifications error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.sendTestNotification = async (req, res) => {
  try {
    const { title, message, type, priority } = req.body;
    const notification = await NotificationService.sendNotification(req.user._id, {
      title,
      message,
      type: type || 'info',
      priority: priority || 'normal',
      channels: ['in_app', 'push'],
    });
    res.status(201).json(notification);
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.registerPushToken = async (req, res) => {
  try {
    const { pushToken, platform } = req.body;
    const User = require('../models/User');
    await User.findByIdAndUpdate(req.user._id, {
      pushToken,
      pushTokenPlatform: platform,
      pushTokenUpdatedAt: new Date(),
    });
    res.json({ message: 'Push token registered successfully' });
  } catch (error) {
    console.error('Register push token error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getNotificationById = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json(notification);
  } catch (error) {
    console.error('Get notification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
