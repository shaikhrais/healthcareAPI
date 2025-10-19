const mongoose = require('mongoose');

/**
 * Notification Preferences Model
 * TASK-14.6 - Push Notification Preferences
 *
 * Manages user preferences for push notifications across different categories
 * Features:
 * - Per-category preferences (appointments, messages, billing, etc.)
 * - Channel-specific settings (push, email, SMS)
 * - Quiet hours configuration
 * - Device-specific tokens (FCM, APNS)
 * - Badge count management
 * - Sound and vibration preferences
 * - Priority-based filtering
 */

// eslint-disable-next-line no-unused-vars

const notificationPreferencesSchema = new mongoose.Schema(
  {
    // User reference
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    // Global Settings
    enabled: {
      type: Boolean,
      default: true,
    },
    pausedUntil: Date, // Temporary pause

    // Device Tokens (for push notifications)
    devices: [
      {
        deviceId: {
          type: String,
          required: true,
        },
        platform: {
          type: String,
          enum: ['ios', 'android', 'web'],
          required: true,
        },
        token: {
          type: String, // FCM token (Android/Web) or APNS token (iOS)
          required: true,
        },
        tokenType: {
          type: String,
          enum: ['fcm', 'apns'],
        },
        deviceName: String, // e.g., "John's iPhone"
        deviceModel: String,
        osVersion: String,
        appVersion: String,
        registeredAt: {
          type: Date,
          default: Date.now,
        },
        lastActive: Date,
        active: {
          type: Boolean,
          default: true,
        },
      },
    ],

    // Category-specific Preferences
    categories: {
      // Appointments
      appointments: {
        enabled: {
          type: Boolean,
          default: true,
        },
        channels: {
          push: { type: Boolean, default: true },
          email: { type: Boolean, default: true },
          sms: { type: Boolean, default: false },
        },
        subcategories: {
          reminders: { type: Boolean, default: true },
          confirmations: { type: Boolean, default: true },
          cancellations: { type: Boolean, default: true },
          rescheduling: { type: Boolean, default: true },
          checkIn: { type: Boolean, default: true },
        },
        reminderTiming: [
          {
            type: String,
            enum: ['1_hour', '2_hours', '4_hours', '1_day', '2_days', '1_week'],
          },
        ],
      },

      // Messages
      messages: {
        enabled: {
          type: Boolean,
          default: true,
        },
        channels: {
          push: { type: Boolean, default: true },
          email: { type: Boolean, default: true },
          sms: { type: Boolean, default: false },
        },
        subcategories: {
          directMessages: { type: Boolean, default: true },
          groupMessages: { type: Boolean, default: true },
          systemMessages: { type: Boolean, default: true },
        },
      },

      // Billing & Payments
      billing: {
        enabled: {
          type: Boolean,
          default: true,
        },
        channels: {
          push: { type: Boolean, default: true },
          email: { type: Boolean, default: true },
          sms: { type: Boolean, default: false },
        },
        subcategories: {
          paymentDue: { type: Boolean, default: true },
          paymentReceived: { type: Boolean, default: true },
          paymentFailed: { type: Boolean, default: true },
          invoices: { type: Boolean, default: true },
          statements: { type: Boolean, default: true },
        },
      },

      // Medical Updates
      medical: {
        enabled: {
          type: Boolean,
          default: true,
        },
        channels: {
          push: { type: Boolean, default: true },
          email: { type: Boolean, default: true },
          sms: { type: Boolean, default: false },
        },
        subcategories: {
          testResults: { type: Boolean, default: true },
          prescriptions: { type: Boolean, default: true },
          referrals: { type: Boolean, default: true },
          vaccinations: { type: Boolean, default: true },
        },
      },

      // Insurance
      insurance: {
        enabled: {
          type: Boolean,
          default: true,
        },
        channels: {
          push: { type: Boolean, default: true },
          email: { type: Boolean, default: true },
          sms: { type: Boolean, default: false },
        },
        subcategories: {
          claimUpdates: { type: Boolean, default: true },
          authorization: { type: Boolean, default: true },
          coverage: { type: Boolean, default: true },
          expiring: { type: Boolean, default: true },
        },
      },

      // Surveys & Feedback
      surveys: {
        enabled: {
          type: Boolean,
          default: true,
        },
        channels: {
          push: { type: Boolean, default: true },
          email: { type: Boolean, default: true },
          sms: { type: Boolean, default: false },
        },
        subcategories: {
          postVisit: { type: Boolean, default: true },
          nps: { type: Boolean, default: true },
          satisfaction: { type: Boolean, default: true },
        },
      },

      // Marketing & Promotions
      marketing: {
        enabled: {
          type: Boolean,
          default: false,
        },
        channels: {
          push: { type: Boolean, default: false },
          email: { type: Boolean, default: false },
          sms: { type: Boolean, default: false },
        },
        subcategories: {
          promotions: { type: Boolean, default: false },
          newsletters: { type: Boolean, default: false },
          tips: { type: Boolean, default: false },
        },
      },

      // System & Updates
      system: {
        enabled: {
          type: Boolean,
          default: true,
        },
        channels: {
          push: { type: Boolean, default: true },
          email: { type: Boolean, default: false },
          sms: { type: Boolean, default: false },
        },
        subcategories: {
          appUpdates: { type: Boolean, default: true },
          maintenance: { type: Boolean, default: true },
          security: { type: Boolean, default: true },
        },
      },
    },

    // Priority Filtering
    priorityFilter: {
      enabled: {
        type: Boolean,
        default: false,
      },
      minPriority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal',
      },
    },

    // Quiet Hours
    quietHours: {
      enabled: {
        type: Boolean,
        default: false,
      },
      startTime: String, // e.g., "22:00"
      endTime: String, // e.g., "08:00"
      timezone: {
        type: String,
        default: 'America/New_York',
      },
      allowUrgent: {
        type: Boolean,
        default: true, // Allow urgent notifications during quiet hours
      },
      daysOfWeek: [
        {
          type: String,
          enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        },
      ],
    },

    // Sound & Vibration
    sound: {
      enabled: {
        type: Boolean,
        default: true,
      },
      soundName: {
        type: String,
        default: 'default',
      },
      customSound: String,
    },
    vibration: {
      enabled: {
        type: Boolean,
        default: true,
      },
      pattern: {
        type: String,
        enum: ['default', 'short', 'long', 'double', 'custom'],
        default: 'default',
      },
    },

    // Badge Settings
    badge: {
      enabled: {
        type: Boolean,
        default: true,
      },
      showCount: {
        type: Boolean,
        default: true,
      },
      includeCategories: [
        {
          type: String,
          enum: [
            'appointments',
            'messages',
            'billing',
            'medical',
            'insurance',
            'surveys',
            'system',
          ],
        },
      ],
    },

    // Delivery Preferences
    delivery: {
      // Group notifications by time interval
      batching: {
        enabled: {
          type: Boolean,
          default: false,
        },
        intervalMinutes: {
          type: Number,
          default: 30,
          min: 5,
          max: 240,
        },
      },

      // Rate limiting
      rateLimit: {
        enabled: {
          type: Boolean,
          default: false,
        },
        maxPerHour: {
          type: Number,
          default: 10,
        },
        maxPerDay: {
          type: Number,
          default: 50,
        },
      },
    },

    // Preview Settings
    preview: {
      showOnLockScreen: {
        type: Boolean,
        default: true,
      },
      showPreview: {
        type: Boolean,
        default: true,
      },
      previewLength: {
        type: Number,
        default: 50, // characters
      },
    },

    // In-App Notifications
    inApp: {
      enabled: {
        type: Boolean,
        default: true,
      },
      showBanner: {
        type: Boolean,
        default: true,
      },
      bannerDuration: {
        type: Number,
        default: 5, // seconds
      },
      sound: {
        type: Boolean,
        default: true,
      },
    },

    // Email Preferences
    email: {
      digest: {
        enabled: {
          type: Boolean,
          default: false,
        },
        frequency: {
          type: String,
          enum: ['daily', 'weekly', 'monthly'],
          default: 'weekly',
        },
        time: String, // e.g., "09:00"
      },
    },

    // Analytics & Tracking
    tracking: {
      deliveryTracking: {
        type: Boolean,
        default: true,
      },
      readTracking: {
        type: Boolean,
        default: true,
      },
      clickTracking: {
        type: Boolean,
        default: true,
      },
    },

    // Statistics
    stats: {
      totalSent: {
        type: Number,
        default: 0,
      },
      totalDelivered: {
        type: Number,
        default: 0,
      },
      totalRead: {
        type: Number,
        default: 0,
      },
      totalClicked: {
        type: Number,
        default: 0,
      },
      lastSentAt: Date,
      lastReadAt: Date,
    },

    // Metadata
    lastUpdated: Date,
    updatedBy: {
      type: String,
      enum: ['user', 'system', 'admin'],
      default: 'user',
    },
  },
  {
    timestamps: true,
  }
);

// ==================== INDEXES ====================

notificationPreferencesSchema.index({ 'devices.token': 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// notificationPreferencesSchema.index({ 'devices.deviceId': 1 });
notificationPreferencesSchema.index({ 'devices.active': 1 });

// ==================== VIRTUAL FIELDS ====================

notificationPreferencesSchema.virtual('activeDevices').get(function () {
  return this.devices.filter((d) => d.active);
});

notificationPreferencesSchema.virtual('isInQuietHours').get(function () {
  if (!this.quietHours.enabled) return false;

  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM
  const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
    now.getDay()
  ];

  // Check if today is in quiet days
  if (this.quietHours.daysOfWeek.length > 0 && !this.quietHours.daysOfWeek.includes(currentDay)) {
    return false;
  }

  const start = this.quietHours.startTime;
  const end = this.quietHours.endTime;

  if (start < end) {
    // Same day range (e.g., 09:00 to 17:00)
    return currentTime >= start && currentTime < end;
  }
  // Overnight range (e.g., 22:00 to 08:00)
  return currentTime >= start || currentTime < end;
});

// ==================== INSTANCE METHODS ====================

/**
 * Register a new device
 */
notificationPreferencesSchema.methods.registerDevice = function (deviceData) {
  // Check if device already exists
  const existingDevice = this.devices.find((d) => d.deviceId === deviceData.deviceId);

  if (existingDevice) {
    // Update existing device
    existingDevice.token = deviceData.token;
    existingDevice.deviceName = deviceData.deviceName || existingDevice.deviceName;
    existingDevice.deviceModel = deviceData.deviceModel || existingDevice.deviceModel;
    existingDevice.osVersion = deviceData.osVersion || existingDevice.osVersion;
    existingDevice.appVersion = deviceData.appVersion || existingDevice.appVersion;
    existingDevice.lastActive = new Date();
    existingDevice.active = true;
  } else {
    // Add new device
    this.devices.push({
      deviceId: deviceData.deviceId,
      platform: deviceData.platform,
      token: deviceData.token,
      tokenType: deviceData.platform === 'ios' ? 'apns' : 'fcm',
      deviceName: deviceData.deviceName,
      deviceModel: deviceData.deviceModel,
      osVersion: deviceData.osVersion,
      appVersion: deviceData.appVersion,
      lastActive: new Date(),
      active: true,
    });
  }

  return this.save();
};

/**
 * Unregister a device
 */
notificationPreferencesSchema.methods.unregisterDevice = function (deviceId) {
  const device = this.devices.find((d) => d.deviceId === deviceId);
  if (device) {
    device.active = false;
  }
  return this.save();
};

/**
 * Update category preferences
 */
notificationPreferencesSchema.methods.updateCategory = function (category, settings) {
  if (!this.categories[category]) {
    throw new Error(`Invalid category: ${category}`);
  }

  this.categories[category] = {
    ...this.categories[category],
    ...settings,
  };

  this.lastUpdated = new Date();
  return this.save();
};

/**
 * Check if notification should be sent
 */
notificationPreferencesSchema.methods.shouldSendNotification = function (
  notificationType,
  priority,
  channel
) {
  // Check if notifications are globally enabled
  if (!this.enabled) return false;

  // Check if paused
  if (this.pausedUntil && this.pausedUntil > new Date()) return false;

  // Check priority filter
  if (this.priorityFilter.enabled) {
    const priorities = ['low', 'normal', 'high', 'urgent'];
    const minIndex = priorities.indexOf(this.priorityFilter.minPriority);
    const currentIndex = priorities.indexOf(priority);
    if (currentIndex < minIndex) return false;
  }

  // Check quiet hours (allow urgent if configured)
  if (this.isInQuietHours && (!this.quietHours.allowUrgent || priority !== 'urgent')) {
    return false;
  }

  // Map notification type to category
  const categoryMap = {
    appointment_reminder: 'appointments',
    appointment_confirmation: 'appointments',
    appointment_cancellation: 'appointments',
    check_in: 'appointments',
    message: 'messages',
    direct_message: 'messages',
    payment_due: 'billing',
    payment_received: 'billing',
    payment_failed: 'billing',
    test_results: 'medical',
    prescription: 'medical',
    insurance_claim: 'insurance',
    survey: 'surveys',
    system_alert: 'system',
  };

  const category = categoryMap[notificationType] || 'system';
  const categoryPrefs = this.categories[category];

  if (!categoryPrefs || !categoryPrefs.enabled) return false;

  // Check channel-specific setting
  if (channel && categoryPrefs.channels && categoryPrefs.channels[channel] === false) {
    return false;
  }

  return true;
};

/**
 * Get active device tokens
 */
notificationPreferencesSchema.methods.getActiveTokens = function (platform) {
  let devices = this.devices.filter((d) => d.active);

  if (platform) {
    devices = devices.filter((d) => d.platform === platform);
  }

  return devices.map((d) => ({
    token: d.token,
    tokenType: d.tokenType,
    platform: d.platform,
  }));
};

/**
 * Pause notifications
 */
notificationPreferencesSchema.methods.pauseNotifications = function (durationMinutes) {
  const pauseUntil = new Date();
  pauseUntil.setMinutes(pauseUntil.getMinutes() + durationMinutes);
  this.pausedUntil = pauseUntil;
  return this.save();
};

/**
 * Resume notifications
 */
notificationPreferencesSchema.methods.resumeNotifications = function () {
  this.pausedUntil = null;
  return this.save();
};

/**
 * Update statistics
 */
notificationPreferencesSchema.methods.recordNotificationSent = function () {
  this.stats.totalSent += 1;
  this.stats.lastSentAt = new Date();
};

notificationPreferencesSchema.methods.recordNotificationDelivered = function () {
  this.stats.totalDelivered += 1;
};

notificationPreferencesSchema.methods.recordNotificationRead = function () {
  this.stats.totalRead += 1;
  this.stats.lastReadAt = new Date();
};

notificationPreferencesSchema.methods.recordNotificationClicked = function () {
  this.stats.totalClicked += 1;
};

// ==================== STATIC METHODS ====================

/**
 * Get or create preferences for user
 */
notificationPreferencesSchema.statics.getOrCreate = async function (userId) {
  let prefs = await this.findOne({ userId });

  if (!prefs) {
    prefs = await this.create({ userId });
  }

  return prefs;
};

/**
 * Get tokens for users who should receive notification
 */
notificationPreferencesSchema.statics.getTokensForNotification = async function (
  userIds,
  notificationType,
  priority,
  channel
) {
  const preferences = await this.find({ userId: { $in: userIds } });

  const tokens = [];

  preferences.forEach((pref) => {
    if (pref.shouldSendNotification(notificationType, priority, channel)) {
      tokens.push(...pref.getActiveTokens());
    }
  });

  return tokens;
};

/**
 * Clean up inactive devices
 */
notificationPreferencesSchema.statics.cleanupInactiveDevices = async function (daysInactive = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

  return this.updateMany(
    { 'devices.lastActive': { $lt: cutoffDate } },
    { $set: { 'devices.$[elem].active': false } },
    { arrayFilters: [{ 'elem.lastActive': { $lt: cutoffDate } }] }
  );
};

/**
 * Get notification stats summary
 */
notificationPreferencesSchema.statics.getStatsSummary = async function () {
  const results = await this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        enabledUsers: {
          $sum: { $cond: ['$enabled', 1, 0] },
        },
        totalDevices: {
          $sum: { $size: '$devices' },
        },
        activeDevices: {
          $sum: {
            $size: {
              $filter: {
                input: '$devices',
                as: 'device',
                cond: { $eq: ['$$device.active', true] },
              },
            },
          },
        },
        totalNotificationsSent: { $sum: '$stats.totalSent' },
        totalNotificationsDelivered: { $sum: '$stats.totalDelivered' },
        totalNotificationsRead: { $sum: '$stats.totalRead' },
      },
    },
  ]);

  return (
    results[0] || {
      totalUsers: 0,
      enabledUsers: 0,
      totalDevices: 0,
      activeDevices: 0,
      totalNotificationsSent: 0,
      totalNotificationsDelivered: 0,
      totalNotificationsRead: 0,
    }
  );
};

// ==================== PRE-SAVE HOOKS ====================

notificationPreferencesSchema.pre('save', function (next) {
  this.lastUpdated = new Date();
  next();
});

module.exports = mongoose.model('NotificationPreferences', notificationPreferencesSchema);
