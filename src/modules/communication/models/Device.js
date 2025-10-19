/**
 * Device Model
 * Manages user devices for push notifications
 */

const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Device identification
  deviceId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  name: {
    type: String,
    required: true,
    maxlength: 100
  },
  
  platform: {
    type: String,
    enum: ['ios', 'android', 'web'],
    required: true,
    index: true
  },
  
  // Device details
  model: String,
  manufacturer: String,
  osVersion: String,
  appVersion: String,
  
  // Push notification tokens
  pushTokens: [{
    token: {
      type: String,
      required: true
    },
    provider: {
      type: String,
      enum: ['fcm', 'apns', 'web_push'],
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    lastUsed: Date,
    expiresAt: Date
  }],
  
  // Notification preferences
  preferences: {
    enabled: { type: Boolean, default: true },
    categories: {
      appointment: { type: Boolean, default: true },
      medication: { type: Boolean, default: true },
      health_alert: { type: Boolean, default: true },
      test_result: { type: Boolean, default: true },
      general: { type: Boolean, default: true },
      emergency: { type: Boolean, default: true },
      reminder: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false },
      system: { type: Boolean, default: true }
    },
    quietHours: {
      enabled: { type: Boolean, default: false },
      startTime: { type: String, default: '22:00' }, // 24h format
      endTime: { type: String, default: '08:00' }
    },
    priority: {
      low: { type: Boolean, default: true },
      normal: { type: Boolean, default: true },
      high: { type: Boolean, default: true },
      critical: { type: Boolean, default: true }
    }
  },
  
  // Device capabilities
  capabilities: {
    pushNotifications: { type: Boolean, default: true },
    richMedia: { type: Boolean, default: true },
    actionButtons: { type: Boolean, default: true },
    badge: { type: Boolean, default: true },
    sound: { type: Boolean, default: true },
    vibration: { type: Boolean, default: true }
  },
  
  // Location and timezone
  location: {
    country: String,
    region: String,
    city: String,
    timezone: { type: String, default: 'UTC' }
  },
  
  // Activity tracking
  lastActivity: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  lastLogin: Date,
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  isVerified: {
    type: Boolean,
    default: false
  },
  
  // Statistics
  stats: {
    notificationsReceived: { type: Number, default: 0 },
    notificationsRead: { type: Number, default: 0 },
    notificationsClicked: { type: Number, default: 0 },
    lastNotificationAt: Date
  },
  
  // Metadata
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: new Map()
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Compound indexes
deviceSchema.index({ user: 1, platform: 1 });
deviceSchema.index({ user: 1, isActive: 1 });
deviceSchema.index({ 'pushTokens.token': 1, 'pushTokens.isActive': 1 });

// Update timestamp on save
deviceSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static methods

/**
 * Get devices for a user
 */
deviceSchema.statics.getForUser = function(userId, activeOnly = true) {
  const query = { user: userId };
  
  if (activeOnly) {
    query.isActive = true;
  }
  
  return this.find(query).sort({ lastActivity: -1 });
};

/**
 * Get devices by platform
 */
deviceSchema.statics.getByPlatform = function(platform, activeOnly = true) {
  const query = { platform };
  
  if (activeOnly) {
    query.isActive = true;
  }
  
  return this.find(query);
};

/**
 * Find device by push token
 */
deviceSchema.statics.findByPushToken = function(token) {
  return this.findOne({
    'pushTokens.token': token,
    'pushTokens.isActive': true,
    isActive: true
  });
};

/**
 * Get devices that can receive notifications for a category
 */
deviceSchema.statics.getEligibleForNotification = function(userId, category, priority = 'normal') {
  const now = new Date();
  const currentTime = now.toTimeString().substr(0, 5); // HH:MM format
  
  return this.find({
    user: userId,
    isActive: true,
    'preferences.enabled': true,
    [`preferences.categories.${category}`]: true,
    [`preferences.priority.${priority}`]: true,
    $or: [
      { 'preferences.quietHours.enabled': false },
      {
        $and: [
          { 'preferences.quietHours.enabled': true },
          {
            $or: [
              {
                $and: [
                  { 'preferences.quietHours.startTime': { $lte: currentTime } },
                  { 'preferences.quietHours.endTime': { $gte: currentTime } }
                ]
              },
              {
                $and: [
                  { 'preferences.quietHours.startTime': { $gt: 'preferences.quietHours.endTime' } },
                  {
                    $or: [
                      { 'preferences.quietHours.startTime': { $lte: currentTime } },
                      { 'preferences.quietHours.endTime': { $gte: currentTime } }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  });
};

/**
 * Cleanup inactive devices
 */
deviceSchema.statics.cleanupInactive = function(days = 90) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return this.updateMany(
    {
      lastActivity: { $lt: cutoffDate },
      isActive: true
    },
    {
      $set: { isActive: false }
    }
  );
};

// Instance methods

/**
 * Add or update push token
 */
deviceSchema.methods.updatePushToken = function(token, provider, expiresAt = null) {
  // Deactivate old tokens for this provider
  this.pushTokens.forEach(t => {
    if (t.provider === provider) {
      t.isActive = false;
    }
  });
  
  // Add new token
  this.pushTokens.push({
    token,
    provider,
    isActive: true,
    createdAt: new Date(),
    lastUsed: new Date(),
    expiresAt
  });
  
  return this.save();
};

/**
 * Get active push token for provider
 */
deviceSchema.methods.getActivePushToken = function(provider) {
  const token = this.pushTokens.find(t => 
    t.provider === provider && 
    t.isActive && 
    (!t.expiresAt || t.expiresAt > new Date())
  );
  
  return token ? token.token : null;
};

/**
 * Update activity timestamp
 */
deviceSchema.methods.updateActivity = function() {
  this.lastActivity = new Date();
  return this.save();
};

/**
 * Update notification preferences
 */
deviceSchema.methods.updatePreferences = function(preferences) {
  Object.assign(this.preferences, preferences);
  return this.save();
};

/**
 * Record notification interaction
 */
deviceSchema.methods.recordNotificationInteraction = function(type) {
  if (type === 'received') {
    this.stats.notificationsReceived += 1;
    this.stats.lastNotificationAt = new Date();
  } else if (type === 'read') {
    this.stats.notificationsRead += 1;
  } else if (type === 'clicked') {
    this.stats.notificationsClicked += 1;
  }
  
  return this.save();
};

/**
 * Check if device can receive notification at current time
 */
deviceSchema.methods.canReceiveNotification = function(category, priority = 'normal') {
  if (!this.isActive || !this.preferences.enabled) {
    return false;
  }
  
  if (!this.preferences.categories[category]) {
    return false;
  }
  
  if (!this.preferences.priority[priority]) {
    return false;
  }
  
  // Check quiet hours
  if (this.preferences.quietHours.enabled) {
    const now = new Date();
    const currentTime = now.toTimeString().substr(0, 5);
    const startTime = this.preferences.quietHours.startTime;
    const endTime = this.preferences.quietHours.endTime;
    
    // Handle quiet hours that span midnight
    if (startTime > endTime) {
      if (currentTime >= startTime || currentTime <= endTime) {
        return false;
      }
    } else {
      if (currentTime >= startTime && currentTime <= endTime) {
        return false;
      }
    }
  }
  
  return true;
};

/**
 * Deactivate device
 */
deviceSchema.methods.deactivate = function() {
  this.isActive = false;
  this.pushTokens.forEach(token => {
    token.isActive = false;
  });
  return this.save();
};

/**
 * Verify device
 */
deviceSchema.methods.verify = function() {
  this.isVerified = true;
  return this.save();
};

module.exports = mongoose.model('Device', deviceSchema);