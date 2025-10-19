const mongoose = require('mongoose');

/**
 * Rich Notification Model
 * TASK-14.7 - Rich Notifications with Actions
 *
 * Extends basic notifications with rich media, actions, and interactivity
 * Features:
 * - Interactive action buttons
 * - Rich media (images, videos, audio)
 * - Input fields (text, choice)
 * - Progress indicators
 * - Expandable content
 * - Grouped notifications
 * - Custom layouts
 * - Action tracking and analytics
 */

// eslint-disable-next-line no-unused-vars

const richNotificationSchema = new mongoose.Schema(
  {
    // Basic Information (extends Notification model)
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

    body: {
      type: String,
      required: true,
      maxlength: 500,
    },

    subtitle: String, // iOS specific

    // Notification Type
    type: {
      type: String,
      enum: [
        'appointment_reminder',
        'appointment_confirmation',
        'check_in_ready',
        'message',
        'payment_due',
        'test_results',
        'prescription_ready',
        'survey_request',
        'booking_request',
        'video_call',
        'emergency_alert',
        'promotional',
        'system',
      ],
      required: true,
      index: true,
    },

    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
      index: true,
    },

    // Rich Media
    media: {
      type: {
        type: String,
        enum: ['none', 'image', 'video', 'audio', 'gif'],
        default: 'none',
      },
      url: String,
      thumbnailUrl: String,
      alt: String, // Accessibility text
      width: Number,
      height: Number,
      duration: Number, // For video/audio in seconds
      mimeType: String,
    },

    // Large Icon (Android) / App Icon Badge (iOS)
    icon: {
      url: String,
      color: String, // Hex color for icon tint
    },

    // Expandable Content
    expandedContent: {
      enabled: {
        type: Boolean,
        default: false,
      },
      title: String,
      body: String, // Long text
      layout: {
        type: String,
        enum: ['text', 'inbox', 'messaging', 'media', 'custom'],
        default: 'text',
      },
      lines: [String], // For inbox style
    },

    // Interactive Actions
    actions: [
      {
        id: {
          type: String,
          required: true,
        },
        title: {
          type: String,
          required: true,
          maxlength: 50,
        },
        type: {
          type: String,
          enum: [
            'default', // Standard action
            'destructive', // Red/warning action
            'textInput', // Opens text input
            'choice', // Multiple choice
            'snooze', // Snooze notification
            'dismiss', // Dismiss notification
            'navigate', // Navigate to screen
            'deeplink', // Deep link to app
            'externalUrl', // Open external URL
            'call', // Initiate phone call
            'reply', // Quick reply
          ],
          default: 'default',
        },
        icon: String, // Icon name/url for action
        backgroundColor: String, // Hex color
        foregroundColor: String, // Hex color

        // Input configuration (for textInput/choice)
        input: {
          placeholder: String,
          defaultValue: String,
          multiline: {
            type: Boolean,
            default: false,
          },
          maxLength: Number,
          choices: [
            {
              id: String,
              title: String,
            },
          ],
        },

        // Navigation configuration
        navigation: {
          screen: String,
          params: mongoose.Schema.Types.Mixed,
        },

        // Deep link configuration
        deeplink: String,

        // External URL
        url: String,

        // Phone number (for call action)
        phoneNumber: String,

        // Requires authentication
        requiresAuth: {
          type: Boolean,
          default: false,
        },

        // Action behavior
        behavior: {
          opensApp: {
            type: Boolean,
            default: false,
          },
          dismissesNotification: {
            type: Boolean,
            default: true,
          },
        },

        // Analytics tracking
        tracked: {
          type: Boolean,
          default: true,
        },
      },
    ],

    // Progress Indicator
    progress: {
      enabled: {
        type: Boolean,
        default: false,
      },
      current: {
        type: Number,
        min: 0,
      },
      max: {
        type: Number,
        default: 100,
      },
      indeterminate: {
        type: Boolean,
        default: false,
      },
      label: String,
    },

    // Grouping
    group: {
      id: String, // Group identifier
      summary: String, // Summary line when grouped
      sortOrder: Number,
    },

    // Category (for iOS notification categories)
    category: String,

    // Thread ID (for conversation grouping)
    threadId: String,

    // Sound & Vibration
    sound: {
      enabled: {
        type: Boolean,
        default: true,
      },
      name: {
        type: String,
        default: 'default',
      },
      critical: {
        type: Boolean,
        default: false, // iOS critical alerts
      },
    },

    vibration: {
      enabled: {
        type: Boolean,
        default: true,
      },
      pattern: [Number], // Vibration pattern in ms
    },

    // Badge
    badge: {
      count: Number,
      increment: {
        type: Boolean,
        default: true,
      },
    },

    // Visual Styling
    style: {
      color: String, // Primary color (hex)
      lightColor: String, // For light theme
      darkColor: String, // For dark theme
      smallIcon: String,
      largeIcon: String,
    },

    // Interaction States
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: Date,

    dismissed: {
      type: Boolean,
      default: false,
    },
    dismissedAt: Date,

    snoozed: {
      type: Boolean,
      default: false,
    },
    snoozedUntil: Date,

    // Action Responses
    actionResponses: [
      {
        actionId: String,
        respondedAt: {
          type: Date,
          default: Date.now,
        },
        responseType: {
          type: String,
          enum: ['clicked', 'text_input', 'choice_selected', 'dismissed', 'snoozed'],
        },
        responseData: mongoose.Schema.Types.Mixed, // Input text, selected choice, etc.
        processingStatus: {
          type: String,
          enum: ['pending', 'processing', 'completed', 'failed'],
          default: 'pending',
        },
        processingResult: mongoose.Schema.Types.Mixed,
      },
    ],

    // Delivery
    channels: [
      {
        type: String,
        enum: ['push', 'in_app', 'email', 'sms'],
      },
    ],

    deliveryStatus: {
      push: {
        status: {
          type: String,
          enum: ['pending', 'sent', 'delivered', 'failed'],
          default: 'pending',
        },
        sentAt: Date,
        deliveredAt: Date,
        error: String,
        messageId: String, // FCM/APNS message ID
      },
      inApp: {
        status: {
          type: String,
          enum: ['pending', 'delivered'],
          default: 'pending',
        },
        deliveredAt: Date,
      },
      email: {
        status: {
          type: String,
          enum: ['pending', 'sent', 'delivered', 'opened', 'failed'],
          default: 'pending',
        },
        sentAt: Date,
        deliveredAt: Date,
        openedAt: Date,
        error: String,
      },
      sms: {
        status: {
          type: String,
          enum: ['pending', 'sent', 'delivered', 'failed'],
          default: 'pending',
        },
        sentAt: Date,
        deliveredAt: Date,
        error: String,
      },
    },

    // Scheduling
    scheduledFor: Date,
    sentAt: Date,

    // Expiration
    expiresAt: Date,
    ttl: Number, // Time to live in seconds

    // Related Data
    relatedEntity: {
      type: {
        type: String,
        enum: ['appointment', 'message', 'payment', 'patient', 'prescription', 'survey', 'other'],
      },
      id: mongoose.Schema.Types.ObjectId,
    },

    // Additional Data
    data: mongoose.Schema.Types.Mixed,

    // Analytics
    analytics: {
      impressions: {
        type: Number,
        default: 0,
      },
      clicks: {
        type: Number,
        default: 0,
      },
      actionClicks: [
        {
          actionId: String,
          count: {
            type: Number,
            default: 0,
          },
        },
      ],
      dismissals: {
        type: Number,
        default: 0,
      },
      averageTimeToAction: Number, // Milliseconds
    },

    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
  },
  {
    timestamps: true,
  }
);

// ==================== INDEXES ====================

// DUPLICATE INDEX - Auto-commented by deduplication tool
// richNotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// richNotificationSchema.index({ userId: 1, type: 1 });
richNotificationSchema.index({ userId: 1, snoozedUntil: 1 });
richNotificationSchema.index({ 'group.id': 1 });
richNotificationSchema.index({ threadId: 1 });
richNotificationSchema.index({ scheduledFor: 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// richNotificationSchema.index({ expiresAt: 1 });
richNotificationSchema.index({ 'deliveryStatus.push.status': 1 });

// ==================== VIRTUAL FIELDS ====================

richNotificationSchema.virtual('isExpired').get(function () {
  return this.expiresAt && this.expiresAt < new Date();
});

richNotificationSchema.virtual('isSnoozed').get(function () {
  return this.snoozed && this.snoozedUntil && this.snoozedUntil > new Date();
});

richNotificationSchema.virtual('shouldSend').get(function () {
  if (this.isExpired) return false;
  if (this.isSnoozed) return false;
  if (this.dismissed) return false;
  if (this.scheduledFor && this.scheduledFor > new Date()) return false;
  return true;
});

richNotificationSchema.virtual('hasActions').get(function () {
  return this.actions && this.actions.length > 0;
});

richNotificationSchema.virtual('hasMedia').get(function () {
  return this.media && this.media.type !== 'none';
});

// ==================== INSTANCE METHODS ====================

/**
 * Mark as read
 */
richNotificationSchema.methods.markAsRead = function () {
  this.read = true;
  this.readAt = new Date();
  this.analytics.impressions += 1;
  return this.save();
};

/**
 * Dismiss notification
 */
richNotificationSchema.methods.dismiss = function () {
  this.dismissed = true;
  this.dismissedAt = new Date();
  this.analytics.dismissals += 1;
  return this.save();
};

/**
 * Snooze notification
 */
richNotificationSchema.methods.snooze = function (durationMinutes = 60) {
  const snoozeUntil = new Date();
  snoozeUntil.setMinutes(snoozeUntil.getMinutes() + durationMinutes);

  this.snoozed = true;
  this.snoozedUntil = snoozeUntil;

  return this.save();
};

/**
 * Unsnooze notification
 */
richNotificationSchema.methods.unsnooze = function () {
  this.snoozed = false;
  this.snoozedUntil = null;
  return this.save();
};

/**
 * Record action response
 */
richNotificationSchema.methods.recordActionResponse = function (
  actionId,
  responseType,
  responseData
) {
  const action = this.actions.find((a) => a.id === actionId);

  if (!action) {
    throw new Error('Action not found');
  }

  // Record response
  this.actionResponses.push({
    actionId,
    responseType,
    responseData,
    respondedAt: new Date(),
  });

  // Update analytics
  this.analytics.clicks += 1;

  const actionClick = this.analytics.actionClicks.find((ac) => ac.actionId === actionId);
  if (actionClick) {
    actionClick.count += 1;
  } else {
    this.analytics.actionClicks.push({
      actionId,
      count: 1,
    });
  }

  // Calculate average time to action
  const timeToAction = new Date() - this.createdAt;
  if (this.analytics.averageTimeToAction) {
    this.analytics.averageTimeToAction = (this.analytics.averageTimeToAction + timeToAction) / 2;
  } else {
    this.analytics.averageTimeToAction = timeToAction;
  }

  // Auto-dismiss if configured
  if (action.behavior.dismissesNotification) {
    this.dismissed = true;
    this.dismissedAt = new Date();
  }

  return this.save();
};

/**
 * Update progress
 */
richNotificationSchema.methods.updateProgress = function (current, max) {
  if (!this.progress.enabled) {
    throw new Error('Progress not enabled for this notification');
  }

  this.progress.current = current;
  if (max !== undefined) {
    this.progress.max = max;
  }

  return this.save();
};

/**
 * Update delivery status
 */
richNotificationSchema.methods.updateDeliveryStatus = function (channel, status, metadata = {}) {
  if (!this.deliveryStatus[channel]) {
    throw new Error(`Invalid channel: ${channel}`);
  }

  this.deliveryStatus[channel].status = status;

  if (status === 'sent') {
    this.deliveryStatus[channel].sentAt = new Date();
    if (!this.sentAt) {
      this.sentAt = new Date();
    }
  } else if (status === 'delivered') {
    this.deliveryStatus[channel].deliveredAt = new Date();
  } else if (status === 'opened' && channel === 'email') {
    this.deliveryStatus[channel].openedAt = new Date();
  } else if (status === 'failed') {
    this.deliveryStatus[channel].error = metadata.error;
  }

  if (metadata.messageId) {
    this.deliveryStatus[channel].messageId = metadata.messageId;
  }

  return this.save();
};

/**
 * Get action by ID
 */
richNotificationSchema.methods.getAction = function (actionId) {
  return this.actions.find((a) => a.id === actionId);
};

/**
 * Process action response result
 */
richNotificationSchema.methods.processActionResult = function (actionId, status, result) {
  const response = this.actionResponses.find(
    (r) => r.actionId === actionId && r.processingStatus === 'pending'
  );

  if (response) {
    response.processingStatus = status;
    response.processingResult = result;
  }

  return this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Get unread count
 */
richNotificationSchema.statics.getUnreadCount = async function (userId) {
  return this.countDocuments({
    userId,
    read: false,
    dismissed: false,
    $or: [{ snoozed: false }, { snoozedUntil: { $lt: new Date() } }],
  });
};

/**
 * Get active notifications (not dismissed, not expired)
 */
richNotificationSchema.statics.getActive = async function (userId, options = {}) {
  const { limit = 20, type, priority } = options;

  const query = {
    userId,
    dismissed: false,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    $or: [{ snoozed: false }, { snoozedUntil: { $lt: new Date() } }],
  };

  if (type) query.type = type;
  if (priority) query.priority = priority;

  return this.find(query).sort({ priority: -1, createdAt: -1 }).limit(limit);
};

/**
 * Get notifications by group
 */
richNotificationSchema.statics.getByGroup = async function (userId, groupId) {
  return this.find({
    userId,
    'group.id': groupId,
    dismissed: false,
  }).sort({ 'group.sortOrder': 1, createdAt: -1 });
};

/**
 * Get snoozed notifications ready to reappear
 */
richNotificationSchema.statics.getSnoozedReady = async function () {
  return this.find({
    snoozed: true,
    snoozedUntil: { $lt: new Date() },
    dismissed: false,
  });
};

/**
 * Get scheduled notifications ready to send
 */
richNotificationSchema.statics.getScheduledReady = async function () {
  return this.find({
    scheduledFor: { $lt: new Date() },
    sentAt: null,
    dismissed: false,
  });
};

/**
 * Get analytics summary
 */
richNotificationSchema.statics.getAnalyticsSummary = async function (userId, dateRange) {
  const { startDate, endDate } = dateRange;

  const notifications = await this.find({
    userId,
    createdAt: { $gte: startDate, $lte: endDate },
  });

  const summary = {
    total: notifications.length,
    sent: notifications.filter((n) => n.sentAt).length,
    read: notifications.filter((n) => n.read).length,
    dismissed: notifications.filter((n) => n.dismissed).length,
    withActions: notifications.filter((n) => n.hasActions).length,
    totalClicks: notifications.reduce((sum, n) => sum + n.analytics.clicks, 0),
    totalImpressions: notifications.reduce((sum, n) => sum + n.analytics.impressions, 0),
    readRate: 0,
    clickRate: 0,
    averageTimeToAction: 0,
  };

  if (summary.sent > 0) {
    summary.readRate = (summary.read / summary.sent) * 100;
  }

  if (summary.read > 0) {
    summary.clickRate = (summary.totalClicks / summary.read) * 100;
  }

  const timesToAction = notifications
    .filter((n) => n.analytics.averageTimeToAction)
    .map((n) => n.analytics.averageTimeToAction);

  if (timesToAction.length > 0) {
    summary.averageTimeToAction = timesToAction.reduce((a, b) => a + b) / timesToAction.length;
  }

  return summary;
};

/**
 * Bulk dismiss
 */
richNotificationSchema.statics.bulkDismiss = async function (userId, notificationIds) {
  return this.updateMany(
    {
      _id: { $in: notificationIds },
      userId,
    },
    {
      $set: {
        dismissed: true,
        dismissedAt: new Date(),
      },
      $inc: {
        'analytics.dismissals': 1,
      },
    }
  );
};

/**
 * Mark all as read
 */
richNotificationSchema.statics.markAllAsRead = async function (userId) {
  return this.updateMany(
    {
      userId,
      read: false,
      dismissed: false,
    },
    {
      $set: {
        read: true,
        readAt: new Date(),
      },
      $inc: {
        'analytics.impressions': 1,
      },
    }
  );
};

/**
 * Clean up expired notifications
 */
richNotificationSchema.statics.cleanupExpired = async function () {
  return this.deleteMany({
    expiresAt: { $lt: new Date() },
  });
};

// ==================== PRE-SAVE HOOKS ====================

richNotificationSchema.pre('save', function (next) {
  // Auto-set expiration if not set
  if (!this.expiresAt && this.ttl) {
    const expirationDate = new Date();
    expirationDate.setSeconds(expirationDate.getSeconds() + this.ttl);
    this.expiresAt = expirationDate;
  } else if (!this.expiresAt) {
    // Default expiration: 30 days for read, 90 days for unread
    const expirationDate = new Date();
    if (this.read) {
      expirationDate.setDate(expirationDate.getDate() + 30);
    } else {
      expirationDate.setDate(expirationDate.getDate() + 90);
    }
    this.expiresAt = expirationDate;
  }

  next();
});

module.exports = mongoose.model('RichNotification', richNotificationSchema);
