/**
 * Push Notification Model
 * Handles mobile push notifications with device management
 */

const mongoose = require('mongoose');

const pushNotificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Notification content
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  
  category: {
    type: String,
    enum: [
      'appointment',
      'medication',
      'health_alert',
      'test_result',
      'general',
      'emergency',
      'reminder',
      'marketing',
      'system'
    ],
    required: true,
    index: true
  },
  
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'critical'],
    default: 'normal',
    index: true
  },
  
  // Delivery details
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  scheduledFor: {
    type: Date,
    index: true
  },
  
  sentAt: Date,
  deliveredAt: Date,
  readAt: Date,
  
  // Device targeting
  devices: [{
    deviceId: {
      type: String,
      required: true
    },
    platform: {
      type: String,
      enum: ['ios', 'android', 'web'],
      required: true
    },
    pushToken: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed'],
      default: 'pending'
    },
    sentAt: Date,
    deliveredAt: Date,
    error: String
  }],
  
  // Notification data
  data: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: new Map()
  },
  
  // Action buttons
  actions: [{
    id: String,
    title: String,
    icon: String,
    action: String, // 'open_app', 'open_url', 'dismiss', 'custom'
    url: String,
    data: Map
  }],
  
  // Rich media
  media: {
    type: {
      type: String,
      enum: ['image', 'video', 'audio']
    },
    url: String,
    thumbnail: String
  },
  
  // Analytics
  analytics: {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    dismissals: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 }
  },
  
  // Targeting rules
  targeting: {
    userSegments: [String],
    demographics: {
      ageMin: Number,
      ageMax: Number,
      gender: String,
      location: String
    },
    behavioral: {
      lastLoginDays: Number,
      appointmentStatus: String,
      engagementLevel: String
    }
  },
  
  // Delivery settings
  settings: {
    badge: { type: Number, default: 1 },
    sound: { type: String, default: 'default' },
    vibrate: { type: Boolean, default: true },
    lights: { type: Boolean, default: true },
    timeToLive: { type: Number, default: 86400 }, // 24 hours in seconds
    collapseKey: String,
    restrictedPackage: String
  },
  
  // A/B testing
  experiment: {
    id: String,
    variant: String,
    isControl: { type: Boolean, default: false }
  },
  
  // Related entities
  relatedTo: {
    entityType: {
      type: String,
      enum: ['appointment', 'patient', 'medication', 'test_result', 'message']
    },
    entityId: mongoose.Schema.Types.ObjectId,
    entityData: Map
  },
  
  // Error tracking
  errors: [{
    device: String,
    error: String,
    code: String,
    timestamp: { type: Date, default: Date.now },
    retryCount: { type: Number, default: 0 }
  }],
  
  // Tracking
  isRead: { type: Boolean, default: false },
  isClicked: { type: Boolean, default: false },
  isDismissed: { type: Boolean, default: false },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for performance
pushNotificationSchema.index({ user: 1, createdAt: -1 });
pushNotificationSchema.index({ status: 1, scheduledFor: 1 });
pushNotificationSchema.index({ category: 1, priority: 1 });
pushNotificationSchema.index({ 'devices.deviceId': 1 });
pushNotificationSchema.index({ 'devices.platform': 1 });
pushNotificationSchema.index({ 'relatedTo.entityType': 1, 'relatedTo.entityId': 1 });

// Update timestamp on save
pushNotificationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static methods

/**
 * Get notifications for a user
 */
pushNotificationSchema.statics.getForUser = function(userId, options = {}) {
  const {
    limit = 50,
    skip = 0,
    category,
    status,
    priority,
    unreadOnly = false
  } = options;

  const query = { user: userId };
  
  if (category) query.category = category;
  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (unreadOnly) query.isRead = false;

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('createdBy', 'name email');
};

/**
 * Get pending notifications for delivery
 */
pushNotificationSchema.statics.getPendingForDelivery = function() {
  return this.find({
    status: 'pending',
    $or: [
      { scheduledFor: { $lte: new Date() } },
      { scheduledFor: { $exists: false } }
    ]
  }).sort({ priority: -1, createdAt: 1 });
};

/**
 * Get notifications by category and date range
 */
pushNotificationSchema.statics.getByDateRange = function(startDate, endDate, category) {
  const query = {
    createdAt: { $gte: startDate, $lte: endDate }
  };
  
  if (category) query.category = category;
  
  return this.find(query).sort({ createdAt: -1 });
};

/**
 * Get analytics for notifications
 */
pushNotificationSchema.statics.getAnalytics = function(userId, days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$category',
        total: { $sum: 1 },
        sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
        delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
        read: { $sum: { $cond: ['$isRead', 1, 0] } },
        clicked: { $sum: { $cond: ['$isClicked', 1, 0] } },
        totalImpressions: { $sum: '$analytics.impressions' },
        totalClicks: { $sum: '$analytics.clicks' }
      }
    }
  ]);
};

// Instance methods

/**
 * Mark notification as read
 */
pushNotificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  this.analytics.impressions += 1;
  return this.save();
};

/**
 * Mark notification as clicked
 */
pushNotificationSchema.methods.markAsClicked = function() {
  this.isClicked = true;
  this.analytics.clicks += 1;
  return this.save();
};

/**
 * Mark notification as dismissed
 */
pushNotificationSchema.methods.markAsDismissed = function() {
  this.isDismissed = true;
  this.analytics.dismissals += 1;
  return this.save();
};

/**
 * Add delivery result for a device
 */
pushNotificationSchema.methods.addDeliveryResult = function(deviceId, status, error = null) {
  const device = this.devices.find(d => d.deviceId === deviceId);
  
  if (device) {
    device.status = status;
    device.sentAt = new Date();
    
    if (status === 'delivered') {
      device.deliveredAt = new Date();
    }
    
    if (error) {
      device.error = error;
      this.errors.push({
        device: deviceId,
        error: error,
        timestamp: new Date()
      });
    }
  }
  
  // Update overall status
  const allDelivered = this.devices.every(d => ['delivered', 'failed'].includes(d.status));
  if (allDelivered) {
    const hasDelivered = this.devices.some(d => d.status === 'delivered');
    this.status = hasDelivered ? 'delivered' : 'failed';
    
    if (hasDelivered) {
      this.deliveredAt = new Date();
    }
  }
  
  return this.save();
};

/**
 * Schedule for later delivery
 */
pushNotificationSchema.methods.scheduleFor = function(date) {
  this.scheduledFor = date;
  this.status = 'pending';
  return this.save();
};

/**
 * Cancel notification
 */
pushNotificationSchema.methods.cancel = function() {
  this.status = 'cancelled';
  return this.save();
};

module.exports = mongoose.model('PushNotification', pushNotificationSchema);