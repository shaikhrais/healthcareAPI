const mongoose = require('mongoose');

/**
 * Twilio Message Model
 * TASK-15.11 - Twilio SMS/Voice Integration
 *
 * Manages SMS messages, voice calls, and MMS via Twilio
 * Features:
 * - SMS sending and receiving
 * - Voice calls with IVR
 * - MMS (multimedia messages)
 * - Message templates
 * - Delivery tracking
 * - Auto-replies
 * - Call recording
 * - Voicemail
 * - SMS campaigns
 * - Opt-in/Opt-out management
 * - Message scheduling
 * - Two-way conversations
 */

// eslint-disable-next-line no-unused-vars

const twilioMessageSchema = new mongoose.Schema(
  {
    // Message Type
    type: {
      type: String,
      enum: ['sms', 'mms', 'voice', 'whatsapp'],
      required: true,
      index: true,
    },

    // Direction
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      required: true,
      index: true,
    },

    // Participants
    from: {
      phoneNumber: {
        type: String,
        required: true,
        index: true,
      },
      formatted: String,
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      name: String,
    },

    to: {
      phoneNumber: {
        type: String,
        required: true,
        index: true,
      },
      formatted: String,
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
      },
      name: String,
    },

    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    // SMS/MMS Content
    smsContent: {
      body: String,
      numSegments: {
        type: Number,
        default: 1,
      },
      numMedia: {
        type: Number,
        default: 0,
      },
      mediaUrls: [String],
      mediaMimeTypes: [String],
      encoding: {
        type: String,
        enum: ['UTF-8', 'GSM', 'UCS-2'],
        default: 'UTF-8',
      },
    },

    // Voice Call Content
    voiceContent: {
      duration: Number, // seconds
      recordingUrl: String,
      recordingDuration: Number,
      transcription: String,
      transcriptionStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
      },

      // Call details
      callSid: String,
      callStatus: {
        type: String,
        enum: [
          'queued',
          'ringing',
          'in-progress',
          'completed',
          'busy',
          'failed',
          'no-answer',
          'canceled',
        ],
      },
      answeredBy: {
        type: String,
        enum: ['human', 'machine', 'fax', 'unknown'],
      },

      // IVR data
      ivrPath: [String], // Sequence of menu selections
      ivrData: mongoose.Schema.Types.Mixed,

      // Voicemail
      isVoicemail: {
        type: Boolean,
        default: false,
      },
      voicemailUrl: String,
      voicemailTranscription: String,
    },

    // Twilio Identifiers
    twilio: {
      messageSid: {
        type: String,
        unique: true,
        sparse: true,
        index: true,
      },
      accountSid: String,
      callSid: String,
      price: Number,
      priceUnit: {
        type: String,
        default: 'USD',
      },
    },

    // Status
    status: {
      type: String,
      enum: [
        'queued',
        'sending',
        'sent',
        'delivered',
        'undelivered',
        'failed',
        'received',
        'read',
        'scheduled',
      ],
      default: 'queued',
      index: true,
    },

    // Delivery Information
    delivery: {
      sentAt: Date,
      deliveredAt: Date,
      readAt: Date,
      failedAt: Date,

      errorCode: String,
      errorMessage: String,

      retryCount: {
        type: Number,
        default: 0,
      },

      carrierInfo: {
        carrier: String,
        type: String, // mobile, landline, voip
      },
    },

    // Template Usage
    template: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MessageTemplate',
      },
      name: String,
      variables: mongoose.Schema.Types.Mixed,
    },

    // Related Entities
    relatedTo: {
      type: {
        type: String,
        enum: [
          'appointment',
          'patient',
          'campaign',
          'reminder',
          'survey',
          'billing',
          'emergency',
          'marketing',
          'other',
        ],
      },
      id: mongoose.Schema.Types.ObjectId,
      description: String,
    },

    // Campaign Information
    campaign: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign',
      },
      name: String,
      type: {
        type: String,
        enum: [
          'appointment_reminder',
          'recall',
          'marketing',
          'survey',
          'emergency_alert',
          'billing',
        ],
      },
    },

    // Scheduling
    scheduling: {
      scheduledFor: Date,
      scheduledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      isCanceled: {
        type: Boolean,
        default: false,
      },
      canceledAt: Date,
      cancelReason: String,
    },

    // Conversation Thread
    conversation: {
      threadId: {
        type: String,
        index: true,
      },
      isFirstMessage: {
        type: Boolean,
        default: false,
      },
      previousMessageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TwilioMessage',
      },
    },

    // Auto-reply
    autoReply: {
      isAutoReply: {
        type: Boolean,
        default: false,
      },
      triggeredBy: {
        keyword: String,
        pattern: String,
      },
      responseTemplate: String,
    },

    // Opt-in/Opt-out
    consent: {
      status: {
        type: String,
        enum: ['opted_in', 'opted_out', 'pending', 'unknown'],
        default: 'unknown',
      },
      consentedAt: Date,
      optedOutAt: Date,
      optOutMethod: {
        type: String,
        enum: ['user_reply', 'admin_action', 'automated'],
      },
      optOutKeyword: String,
    },

    // Priority
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
      index: true,
    },

    // Tags and Categories
    tags: [String],
    category: {
      type: String,
      enum: ['transactional', 'promotional', 'notification', 'reminder', 'support', 'emergency'],
      default: 'transactional',
    },

    // Analytics
    analytics: {
      opened: Boolean,
      openedAt: Date,
      clicked: Boolean,
      clickedAt: Date,
      linkClicks: [
        {
          url: String,
          clickedAt: Date,
        },
      ],
      responseReceived: Boolean,
      responseReceivedAt: Date,
    },

    // Compliance
    compliance: {
      // TCPA (Telephone Consumer Protection Act)
      tcpaConsent: {
        obtained: Boolean,
        obtainedAt: Date,
        method: String,
      },

      // HIPAA
      containsPHI: {
        type: Boolean,
        default: false,
      },

      // Required for marketing messages
      isMarketing: {
        type: Boolean,
        default: false,
      },

      // Quiet hours compliance
      sentWithinQuietHours: Boolean,
      quietHoursOverrideReason: String,
    },

    // Metadata
    metadata: mongoose.Schema.Types.Mixed,

    // Sender Information
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Soft Delete
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: Date,
  },
  {
    timestamps: true,
  }
);

// ==================== INDEXES ====================

twilioMessageSchema.index({ 'from.phoneNumber': 1, createdAt: -1 });
twilioMessageSchema.index({ 'to.phoneNumber': 1, createdAt: -1 });
twilioMessageSchema.index({ 'conversation.threadId': 1, createdAt: 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// twilioMessageSchema.index({ organization: 1, createdAt: -1 });
twilioMessageSchema.index({ type: 1, direction: 1, createdAt: -1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// twilioMessageSchema.index({ status: 1, createdAt: -1 });
twilioMessageSchema.index({ 'scheduling.scheduledFor': 1, status: 1 });
twilioMessageSchema.index({ 'campaign.id': 1, createdAt: -1 });

// ==================== VIRTUAL FIELDS ====================

twilioMessageSchema.virtual('isDelivered').get(function () {
  return this.status === 'delivered';
});

twilioMessageSchema.virtual('isFailed').get(function () {
  return ['failed', 'undelivered'].includes(this.status);
});

twilioMessageSchema.virtual('isScheduled').get(function () {
  return (
    this.status === 'scheduled' &&
    this.scheduling.scheduledFor &&
    this.scheduling.scheduledFor > new Date()
  );
});

twilioMessageSchema.virtual('isOptedOut').get(function () {
  return this.consent.status === 'opted_out';
});

twilioMessageSchema.virtual('costInDollars').get(function () {
  if (this.twilio.price) {
    return Math.abs(this.twilio.price);
  }
  return 0;
});

// ==================== INSTANCE METHODS ====================

/**
 * Mark as delivered
 */
twilioMessageSchema.methods.markDelivered = async function () {
  this.status = 'delivered';
  this.delivery.deliveredAt = new Date();
  return this.save();
};

/**
 * Mark as failed
 */
twilioMessageSchema.methods.markFailed = async function (errorCode, errorMessage) {
  this.status = 'failed';
  this.delivery.failedAt = new Date();
  this.delivery.errorCode = errorCode;
  this.delivery.errorMessage = errorMessage;
  return this.save();
};

/**
 * Mark as read
 */
twilioMessageSchema.methods.markRead = async function () {
  this.status = 'read';
  this.delivery.readAt = new Date();
  this.analytics.opened = true;
  this.analytics.openedAt = new Date();
  return this.save();
};

/**
 * Schedule message
 */
twilioMessageSchema.methods.schedule = async function (scheduledFor, scheduledBy) {
  this.status = 'scheduled';
  this.scheduling.scheduledFor = scheduledFor;
  this.scheduling.scheduledBy = scheduledBy;
  return this.save();
};

/**
 * Cancel scheduled message
 */
twilioMessageSchema.methods.cancelScheduled = async function (reason) {
  if (this.status !== 'scheduled') {
    throw new Error('Message is not scheduled');
  }

  this.scheduling.isCanceled = true;
  this.scheduling.canceledAt = new Date();
  this.scheduling.cancelReason = reason;
  this.status = 'failed';
  return this.save();
};

/**
 * Track link click
 */
twilioMessageSchema.methods.trackLinkClick = function (url) {
  this.analytics.clicked = true;
  this.analytics.clickedAt = this.analytics.clickedAt || new Date();
  this.analytics.linkClicks.push({
    url,
    clickedAt: new Date(),
  });
  return this.save();
};

/**
 * Record response
 */
twilioMessageSchema.methods.recordResponse = function () {
  this.analytics.responseReceived = true;
  this.analytics.responseReceivedAt = new Date();
  return this.save();
};

/**
 * Opt out
 */
twilioMessageSchema.methods.optOut = async function (method = 'user_reply', keyword = 'STOP') {
  this.consent.status = 'opted_out';
  this.consent.optedOutAt = new Date();
  this.consent.optOutMethod = method;
  this.consent.optOutKeyword = keyword;
  return this.save();
};

/**
 * Opt in
 */
twilioMessageSchema.methods.optIn = async function () {
  this.consent.status = 'opted_in';
  this.consent.consentedAt = new Date();
  return this.save();
};

/**
 * Get conversation history
 */
twilioMessageSchema.methods.getConversationHistory = async function () {
  return this.constructor
    .find({
      'conversation.threadId': this.conversation.threadId,
      isDeleted: false,
    })
    .sort({ createdAt: 1 });
};

// ==================== STATIC METHODS ====================

/**
 * Generate thread ID for conversation
 */
twilioMessageSchema.statics.generateThreadId = function (phone1, phone2) {
  // Normalize phone numbers
  const normalized1 = phone1.replace(/\D/g, '');
  const normalized2 = phone2.replace(/\D/g, '');

  // Always put numbers in same order to ensure same thread ID
  const [first, second] = [normalized1, normalized2].sort();
  return `thread-${first}-${second}`;
};

/**
 * Send SMS
 */
twilioMessageSchema.statics.sendSMS = async function (messageData) {
  const threadId = this.generateThreadId(messageData.from.phoneNumber, messageData.to.phoneNumber);

  return this.create({
    type: 'sms',
    direction: 'outbound',
    from: messageData.from,
    to: messageData.to,
    organization: messageData.organization,
    smsContent: {
      body: messageData.body,
      numSegments: Math.ceil(messageData.body.length / 160),
    },
    status: 'queued',
    conversation: {
      threadId,
      isFirstMessage: false,
    },
    sentBy: messageData.sentBy,
    ...messageData,
  });
};

/**
 * Make voice call
 */
twilioMessageSchema.statics.makeCall = async function (callData) {
  return this.create({
    type: 'voice',
    direction: 'outbound',
    from: callData.from,
    to: callData.to,
    organization: callData.organization,
    voiceContent: {
      callStatus: 'queued',
    },
    status: 'queued',
    sentBy: callData.sentBy,
    ...callData,
  });
};

/**
 * Get conversation
 */
twilioMessageSchema.statics.getConversation = async function (phone1, phone2, limit = 50) {
  const threadId = this.generateThreadId(phone1, phone2);

  return this.find({
    'conversation.threadId': threadId,
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

/**
 * Get messages for user
 */
twilioMessageSchema.statics.getForUser = async function (userId, type, limit = 50) {
  const query = {
    $or: [{ 'from.userId': userId }, { 'to.userId': userId }],
    isDeleted: false,
  };

  if (type) {
    query.type = type;
  }

  return this.find(query).sort({ createdAt: -1 }).limit(limit);
};

/**
 * Get messages by phone number
 */
twilioMessageSchema.statics.getByPhoneNumber = async function (phoneNumber, limit = 100) {
  const normalized = phoneNumber.replace(/\D/g, '');

  return this.find({
    $or: [
      { 'from.phoneNumber': { $regex: normalized } },
      { 'to.phoneNumber': { $regex: normalized } },
    ],
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

/**
 * Get scheduled messages
 */
twilioMessageSchema.statics.getScheduledMessages = async function (organizationId) {
  return this.find({
    organization: organizationId,
    status: 'scheduled',
    'scheduling.scheduledFor': { $lte: new Date() },
    'scheduling.isCanceled': false,
    isDeleted: false,
  }).sort({ 'scheduling.scheduledFor': 1 });
};

/**
 * Get campaign messages
 */
twilioMessageSchema.statics.getCampaignMessages = async function (campaignId) {
  return this.find({
    'campaign.id': campaignId,
    isDeleted: false,
  }).sort({ createdAt: -1 });
};

/**
 * Get delivery stats
 */
twilioMessageSchema.statics.getDeliveryStats = async function (organizationId, dateRange) {
  const { startDate, endDate } = dateRange;

  const messages = await this.find({
    organization: organizationId,
    createdAt: {
      $gte: startDate,
      $lte: endDate,
    },
    isDeleted: false,
  });

  const total = messages.length;
  const sent = messages.filter((m) => ['sent', 'delivered'].includes(m.status)).length;
  const delivered = messages.filter((m) => m.status === 'delivered').length;
  const failed = messages.filter((m) => m.isFailed).length;
  const sms = messages.filter((m) => m.type === 'sms').length;
  const voice = messages.filter((m) => m.type === 'voice').length;

  const totalCost = messages.reduce(
    (sum, m) => sum + (m.twilio.price ? Math.abs(m.twilio.price) : 0),
    0
  );

  return {
    total,
    sent,
    delivered,
    failed,
    deliveryRate: total > 0 ? ((delivered / total) * 100).toFixed(1) : 0,
    failureRate: total > 0 ? ((failed / total) * 100).toFixed(1) : 0,
    byType: {
      sms,
      voice,
    },
    totalCost: totalCost.toFixed(2),
  };
};

/**
 * Get response rate
 */
twilioMessageSchema.statics.getResponseRate = async function (organizationId, dateRange) {
  const { startDate, endDate } = dateRange;

  const outbound = await this.countDocuments({
    organization: organizationId,
    direction: 'outbound',
    type: 'sms',
    createdAt: {
      $gte: startDate,
      $lte: endDate,
    },
    isDeleted: false,
  });

  const withResponse = await this.countDocuments({
    organization: organizationId,
    direction: 'outbound',
    type: 'sms',
    'analytics.responseReceived': true,
    createdAt: {
      $gte: startDate,
      $lte: endDate,
    },
    isDeleted: false,
  });

  return {
    totalOutbound: outbound,
    withResponse,
    responseRate: outbound > 0 ? ((withResponse / outbound) * 100).toFixed(1) : 0,
  };
};

/**
 * Check opt-out status
 */
twilioMessageSchema.statics.checkOptOutStatus = async function (phoneNumber) {
  const normalized = phoneNumber.replace(/\D/g, '');

  const lastMessage = await this.findOne({
    $or: [
      { 'from.phoneNumber': { $regex: normalized } },
      { 'to.phoneNumber': { $regex: normalized } },
    ],
    'consent.status': 'opted_out',
  }).sort({ 'consent.optedOutAt': -1 });

  return {
    isOptedOut: !!lastMessage,
    optedOutAt: lastMessage?.consent.optedOutAt,
    method: lastMessage?.consent.optOutMethod,
  };
};

/**
 * Get undelivered messages
 */
twilioMessageSchema.statics.getUndelivered = async function (organizationId) {
  return this.find({
    organization: organizationId,
    status: { $in: ['queued', 'sending'] },
    createdAt: { $lt: new Date(Date.now() - 60 * 60 * 1000) }, // Older than 1 hour
    isDeleted: false,
  });
};

/**
 * Cleanup old messages
 */
twilioMessageSchema.statics.cleanupOldMessages = async function (daysToKeep = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  return this.updateMany(
    {
      createdAt: { $lt: cutoffDate },
      isDeleted: false,
    },
    {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    }
  );
};

// ==================== PRE-SAVE HOOKS ====================

twilioMessageSchema.pre('save', function (next) {
  // Auto-generate thread ID if not provided
  if (!this.conversation.threadId && this.from.phoneNumber && this.to.phoneNumber) {
    this.conversation.threadId = this.constructor.generateThreadId(
      this.from.phoneNumber,
      this.to.phoneNumber
    );
  }

  // Calculate segments for SMS
  if (this.type === 'sms' && this.smsContent?.body) {
    this.smsContent.numSegments = Math.ceil(this.smsContent.body.length / 160);
  }

  // Mark as sent if status changes to sent/delivered
  if (this.isModified('status') && ['sent', 'delivered'].includes(this.status)) {
    if (!this.delivery.sentAt) {
      this.delivery.sentAt = new Date();
    }
  }

  next();
});

module.exports = mongoose.model('TwilioMessage', twilioMessageSchema);
