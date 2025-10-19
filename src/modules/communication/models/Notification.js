const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 100,
    },
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },
    type: {
      type: String,
      enum: [
        'info',
        'appointment_reminder',
        'schedule_change',
        'check_in',
        'room_ready',
        'patient_ready',
        'vitals_alert',
        'task_assigned',
        'task_reminder',
        'task_completed',
        'payment_received',
        'payment_due',
        'system_alert',
        'message',
      ],
      default: 'info',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
      index: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    actionUrl: {
      type: String,
    },
    channels: [
      {
        type: String,
        enum: ['in_app', 'push', 'email', 'sms'],
      },
    ],
    deliveryStatus: {
      push: {
        type: String,
        enum: ['pending', 'sent', 'failed'],
        default: 'pending',
      },
      email: {
        type: String,
        enum: ['pending', 'sent', 'failed'],
        default: 'pending',
      },
      sms: {
        type: String,
        enum: ['pending', 'sent', 'failed'],
        default: 'pending',
      },
    },
    sentAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Get unread count for user
notificationSchema.statics.getUnreadCount = async function (userId) {
  return this.countDocuments({ userId, read: false });
};

// Get recent notifications
notificationSchema.statics.getRecent = async function (userId, limit = 20) {
  return this.find({ userId }).sort({ createdAt: -1 }).limit(limit);
};

// Mark all as read for user
notificationSchema.statics.markAllAsRead = async function (userId) {
  return this.updateMany({ userId, read: false }, { $set: { read: true, readAt: new Date() } });
};

// Get notifications by type
notificationSchema.statics.getByType = async function (userId, type, limit = 50) {
  return this.find({ userId, type }).sort({ createdAt: -1 }).limit(limit);
};

// Get urgent unread notifications
notificationSchema.statics.getUrgentUnread = async function (userId) {
  return this.find({
    userId,
    read: false,
    priority: { $in: ['high', 'urgent'] },
  }).sort({ priority: -1, createdAt: -1 });
};

// Auto-expire old notifications (30 days for read, 90 days for unread)
notificationSchema.pre('save', function (next) {
  if (!this.expiresAt) {
    const expirationDate = new Date();
    if (this.read) {
      expirationDate.setDate(expirationDate.getDate() + 30); // 30 days for read
    } else {
      expirationDate.setDate(expirationDate.getDate() + 90); // 90 days for unread
    }
    this.expiresAt = expirationDate;
  }
  next();
});

module.exports = mongoose.model('Notification', notificationSchema);
