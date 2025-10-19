const mongoose = require('mongoose');

/**
 * SendGrid Email Model
 * TASK-15.12 - SendGrid Email Service
 *
 * Manages transactional emails, newsletters, and campaigns via SendGrid
 * Features:
 * - Transactional email sending
 * - Template management
 * - Email tracking (opens, clicks, bounces)
 * - Suppression list management
 * - Campaign management
 * - A/B testing
 * - Email scheduling
 * - Attachment handling
 * - Dynamic templates
 * - Webhook event processing
 * - Analytics and reporting
 */

// eslint-disable-next-line no-unused-vars

const sendGridEmailSchema = new mongoose.Schema(
  {
    // Email Type
    type: {
      type: String,
      enum: [
        'transactional',
        'marketing',
        'notification',
        'reminder',
        'newsletter',
        'campaign',
        'automated',
        'test',
      ],
      required: true,
      index: true,
    },

    // Recipients
    to: [
      {
        email: {
          type: String,
          required: true,
        },
        name: String,
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],

    cc: [
      {
        email: String,
        name: String,
      },
    ],

    bcc: [
      {
        email: String,
        name: String,
      },
    ],

    // Sender
    from: {
      email: {
        type: String,
        required: true,
      },
      name: String,
    },

    replyTo: {
      email: String,
      name: String,
    },

    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    // Content
    subject: {
      type: String,
      required: true,
    },

    content: {
      // Plain text
      text: String,

      // HTML content
      html: String,

      // AMP HTML (for interactive emails)
      amp: String,
    },

    // Template
    template: {
      // SendGrid template ID
      templateId: String,

      // Template name
      name: String,

      // Dynamic template data
      dynamicData: mongoose.Schema.Types.Mixed,

      // Template version
      version: String,
    },

    // Personalization
    personalization: [
      {
        to: [
          {
            email: String,
            name: String,
          },
        ],
        substitutions: mongoose.Schema.Types.Mixed,
        customArgs: mongoose.Schema.Types.Mixed,
        dynamicTemplateData: mongoose.Schema.Types.Mixed,
        subject: String,
        headers: mongoose.Schema.Types.Mixed,
        sendAt: Date,
      },
    ],

    // Attachments
    attachments: [
      {
        filename: String,
        content: String, // Base64 encoded
        type: String, // MIME type
        disposition: {
          type: String,
          enum: ['inline', 'attachment'],
          default: 'attachment',
        },
        contentId: String, // For inline images
        size: Number, // bytes
      },
    ],

    // SendGrid Identifiers
    sendgrid: {
      messageId: {
        type: String,
        unique: true,
        sparse: true,
        index: true,
      },
      batchId: String,
      templateId: String,
    },

    // Status
    status: {
      type: String,
      enum: [
        'queued',
        'processing',
        'sent',
        'delivered',
        'opened',
        'clicked',
        'bounced',
        'dropped',
        'deferred',
        'blocked',
        'failed',
        'scheduled',
      ],
      default: 'queued',
      index: true,
    },

    // Delivery Information
    delivery: {
      sentAt: Date,
      deliveredAt: Date,

      // Bounce information
      bounced: {
        type: Boolean,
        default: false,
      },
      bounceType: {
        type: String,
        enum: ['soft', 'hard', 'block'],
      },
      bounceReason: String,
      bounceTimestamp: Date,

      // Drop information
      dropped: Boolean,
      dropReason: String,

      // Defer information
      deferred: Boolean,
      deferReason: String,
      deferCount: {
        type: Number,
        default: 0,
      },

      // Spam report
      spamReport: Boolean,
      spamReportAt: Date,

      // Unsubscribe
      unsubscribed: Boolean,
      unsubscribeAt: Date,
    },

    // Engagement Tracking
    engagement: {
      // Opens
      opened: {
        type: Boolean,
        default: false,
      },
      openCount: {
        type: Number,
        default: 0,
      },
      firstOpenAt: Date,
      lastOpenAt: Date,
      uniqueOpens: {
        type: Number,
        default: 0,
      },

      // Clicks
      clicked: {
        type: Boolean,
        default: false,
      },
      clickCount: {
        type: Number,
        default: 0,
      },
      firstClickAt: Date,
      lastClickAt: Date,
      uniqueClicks: {
        type: Number,
        default: 0,
      },

      // Detailed click tracking
      clickedUrls: [
        {
          url: String,
          clickCount: Number,
          firstClickAt: Date,
          lastClickAt: Date,
        },
      ],

      // User agent info
      userAgent: String,
      device: {
        type: String,
        enum: ['desktop', 'mobile', 'tablet', 'unknown'],
      },
      os: String,
      browser: String,

      // Geographic info
      location: {
        country: String,
        region: String,
        city: String,
        latitude: Number,
        longitude: Number,
      },
    },

    // Campaign Information
    campaign: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign',
      },
      name: String,
      type: String,

      // A/B testing
      abTest: {
        enabled: Boolean,
        variant: {
          type: String,
          enum: ['A', 'B', 'C', 'D'],
        },
        testMetric: {
          type: String,
          enum: ['open_rate', 'click_rate', 'conversion_rate'],
        },
      },
    },

    // Categories and Tags (for SendGrid filtering)
    categories: [String],
    tags: [String],

    // Custom Arguments
    customArgs: mongoose.Schema.Types.Mixed,

    // Related Entity
    relatedTo: {
      type: {
        type: String,
        enum: ['appointment', 'patient', 'invoice', 'survey', 'document', 'order', 'other'],
      },
      id: mongoose.Schema.Types.ObjectId,
      description: String,
    },

    // Scheduling
    scheduling: {
      scheduledFor: {
        type: Date,
        index: true,
      },
      timezone: String,
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

    // Priority
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },

    // Tracking Settings
    trackingSettings: {
      clickTracking: {
        enabled: {
          type: Boolean,
          default: true,
        },
        enableText: Boolean,
      },
      openTracking: {
        enabled: {
          type: Boolean,
          default: true,
        },
        substitutionTag: String,
      },
      subscriptionTracking: {
        enabled: {
          type: Boolean,
          default: true,
        },
        text: String,
        html: String,
      },
      ganalytics: {
        enabled: Boolean,
        utmSource: String,
        utmMedium: String,
        utmCampaign: String,
        utmTerm: String,
        utmContent: String,
      },
    },

    // Mail Settings
    mailSettings: {
      bypassListManagement: {
        type: Boolean,
        default: false,
      },
      footer: {
        enabled: Boolean,
        text: String,
        html: String,
      },
      sandboxMode: {
        type: Boolean,
        default: false,
      },
    },

    // Error Information
    error: {
      code: String,
      message: String,
      timestamp: Date,
      retryCount: {
        type: Number,
        default: 0,
      },
    },

    // Compliance
    compliance: {
      // GDPR
      consentObtained: Boolean,
      consentDate: Date,
      consentType: {
        type: String,
        enum: ['explicit', 'implicit', 'legitimate_interest'],
      },

      // CAN-SPAM
      unsubscribeLink: {
        type: Boolean,
        default: true,
      },
      physicalAddress: String,

      // HIPAA
      containsPHI: {
        type: Boolean,
        default: false,
      },
    },

    // Metadata
    metadata: mongoose.Schema.Types.Mixed,

    // Sent By
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

sendGridEmailSchema.index({ 'to.email': 1, createdAt: -1 });
sendGridEmailSchema.index({ 'from.email': 1, createdAt: -1 });
sendGridEmailSchema.index({ organization: 1, createdAt: -1 });
sendGridEmailSchema.index({ type: 1, status: 1, createdAt: -1 });
sendGridEmailSchema.index({ 'campaign.id': 1, createdAt: -1 });
sendGridEmailSchema.index({ 'scheduling.scheduledFor': 1, status: 1 });
sendGridEmailSchema.index({ categories: 1 });

// ==================== VIRTUAL FIELDS ====================

sendGridEmailSchema.virtual('isDelivered').get(function () {
  return this.status === 'delivered';
});

sendGridEmailSchema.virtual('isBounced').get(function () {
  return this.status === 'bounced' || this.delivery.bounced;
});

sendGridEmailSchema.virtual('openRate').get(function () {
  if (this.engagement.openCount === 0) return 0;
  return ((this.engagement.uniqueOpens / this.to.length) * 100).toFixed(2);
});

sendGridEmailSchema.virtual('clickRate').get(function () {
  if (this.engagement.clickCount === 0) return 0;
  return ((this.engagement.uniqueClicks / this.to.length) * 100).toFixed(2);
});

sendGridEmailSchema.virtual('clickToOpenRate').get(function () {
  if (!this.engagement.opened || this.engagement.uniqueOpens === 0) return 0;
  return ((this.engagement.uniqueClicks / this.engagement.uniqueOpens) * 100).toFixed(2);
});

// ==================== INSTANCE METHODS ====================

/**
 * Mark as sent
 */
sendGridEmailSchema.methods.markSent = async function (messageId) {
  this.status = 'sent';
  this.delivery.sentAt = new Date();
  this.sendgrid.messageId = messageId;
  return this.save();
};

/**
 * Mark as delivered
 */
sendGridEmailSchema.methods.markDelivered = async function () {
  this.status = 'delivered';
  this.delivery.deliveredAt = new Date();
  return this.save();
};

/**
 * Mark as bounced
 */
sendGridEmailSchema.methods.markBounced = async function (bounceType, reason) {
  this.status = 'bounced';
  this.delivery.bounced = true;
  this.delivery.bounceType = bounceType;
  this.delivery.bounceReason = reason;
  this.delivery.bounceTimestamp = new Date();
  return this.save();
};

/**
 * Track open
 */
sendGridEmailSchema.methods.trackOpen = async function (userAgent, location) {
  this.status = 'opened';
  this.engagement.opened = true;
  this.engagement.openCount += 1;

  if (!this.engagement.firstOpenAt) {
    this.engagement.firstOpenAt = new Date();
    this.engagement.uniqueOpens = 1;
  }

  this.engagement.lastOpenAt = new Date();
  this.engagement.userAgent = userAgent;

  if (location) {
    this.engagement.location = location;
  }

  return this.save();
};

/**
 * Track click
 */
sendGridEmailSchema.methods.trackClick = async function (url, userAgent) {
  this.status = 'clicked';
  this.engagement.clicked = true;
  this.engagement.clickCount += 1;

  if (!this.engagement.firstClickAt) {
    this.engagement.firstClickAt = new Date();
    this.engagement.uniqueClicks = 1;
  }

  this.engagement.lastClickAt = new Date();
  this.engagement.userAgent = userAgent;

  // Track URL-specific clicks
  const urlEntry = this.engagement.clickedUrls.find((u) => u.url === url);
  if (urlEntry) {
    urlEntry.clickCount += 1;
    urlEntry.lastClickAt = new Date();
  } else {
    this.engagement.clickedUrls.push({
      url,
      clickCount: 1,
      firstClickAt: new Date(),
      lastClickAt: new Date(),
    });
  }

  return this.save();
};

/**
 * Mark as dropped
 */
sendGridEmailSchema.methods.markDropped = async function (reason) {
  this.status = 'dropped';
  this.delivery.dropped = true;
  this.delivery.dropReason = reason;
  return this.save();
};

/**
 * Track spam report
 */
sendGridEmailSchema.methods.trackSpamReport = async function () {
  this.delivery.spamReport = true;
  this.delivery.spamReportAt = new Date();
  return this.save();
};

/**
 * Track unsubscribe
 */
sendGridEmailSchema.methods.trackUnsubscribe = async function () {
  this.delivery.unsubscribed = true;
  this.delivery.unsubscribeAt = new Date();
  return this.save();
};

/**
 * Schedule email
 */
sendGridEmailSchema.methods.schedule = async function (scheduledFor, scheduledBy) {
  this.status = 'scheduled';
  this.scheduling.scheduledFor = scheduledFor;
  this.scheduling.scheduledBy = scheduledBy;
  return this.save();
};

/**
 * Cancel scheduled email
 */
sendGridEmailSchema.methods.cancelScheduled = async function (reason) {
  if (this.status !== 'scheduled') {
    throw new Error('Email is not scheduled');
  }

  this.scheduling.isCanceled = true;
  this.scheduling.canceledAt = new Date();
  this.scheduling.cancelReason = reason;
  this.status = 'failed';
  return this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Send email
 */
sendGridEmailSchema.statics.sendEmail = async function (emailData) {
  return this.create({
    ...emailData,
    status: emailData.scheduling?.scheduledFor ? 'scheduled' : 'queued',
  });
};

/**
 * Get by SendGrid message ID
 */
sendGridEmailSchema.statics.getByMessageId = async function (messageId) {
  return this.findOne({ 'sendgrid.messageId': messageId });
};

/**
 * Get scheduled emails
 */
sendGridEmailSchema.statics.getScheduledEmails = async function (organizationId) {
  return this.find({
    organization: organizationId,
    status: 'scheduled',
    'scheduling.scheduledFor': { $lte: new Date() },
    'scheduling.isCanceled': false,
    isDeleted: false,
  }).sort({ 'scheduling.scheduledFor': 1 });
};

/**
 * Get emails by recipient
 */
sendGridEmailSchema.statics.getByRecipient = async function (email, limit = 50) {
  return this.find({
    'to.email': email,
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

/**
 * Get campaign emails
 */
sendGridEmailSchema.statics.getCampaignEmails = async function (campaignId) {
  return this.find({
    'campaign.id': campaignId,
    isDeleted: false,
  }).sort({ createdAt: -1 });
};

/**
 * Get delivery stats
 */
sendGridEmailSchema.statics.getDeliveryStats = async function (organizationId, dateRange) {
  const { startDate, endDate } = dateRange;

  const emails = await this.find({
    organization: organizationId,
    createdAt: {
      $gte: startDate,
      $lte: endDate,
    },
    isDeleted: false,
  });

  const total = emails.length;
  const sent = emails.filter((e) =>
    ['sent', 'delivered', 'opened', 'clicked'].includes(e.status)
  ).length;
  const delivered = emails.filter((e) => e.status === 'delivered' || e.engagement.opened).length;
  const opened = emails.filter((e) => e.engagement.opened).length;
  const clicked = emails.filter((e) => e.engagement.clicked).length;
  const bounced = emails.filter((e) => e.isBounced).length;
  const failed = emails.filter((e) => e.status === 'failed').length;

  const totalOpens = emails.reduce((sum, e) => sum + e.engagement.openCount, 0);
  const totalClicks = emails.reduce((sum, e) => sum + e.engagement.clickCount, 0);

  return {
    total,
    sent,
    delivered,
    opened,
    clicked,
    bounced,
    failed,
    deliveryRate: total > 0 ? ((delivered / sent) * 100).toFixed(1) : 0,
    openRate: delivered > 0 ? ((opened / delivered) * 100).toFixed(1) : 0,
    clickRate: delivered > 0 ? ((clicked / delivered) * 100).toFixed(1) : 0,
    clickToOpenRate: opened > 0 ? ((clicked / opened) * 100).toFixed(1) : 0,
    bounceRate: sent > 0 ? ((bounced / sent) * 100).toFixed(1) : 0,
    totalOpens,
    totalClicks,
    avgOpensPerEmail: delivered > 0 ? (totalOpens / delivered).toFixed(2) : 0,
    avgClicksPerEmail: delivered > 0 ? (totalClicks / delivered).toFixed(2) : 0,
  };
};

/**
 * Get engagement analytics
 */
sendGridEmailSchema.statics.getEngagementAnalytics = async function (organizationId, dateRange) {
  const { startDate, endDate } = dateRange;

  const emails = await this.find({
    organization: organizationId,
    'delivery.deliveredAt': {
      $gte: startDate,
      $lte: endDate,
    },
    isDeleted: false,
  });

  // Top clicked URLs
  const urlClicks = {};
  emails.forEach((email) => {
    email.engagement.clickedUrls.forEach((urlData) => {
      if (!urlClicks[urlData.url]) {
        urlClicks[urlData.url] = 0;
      }
      urlClicks[urlData.url] += urlData.clickCount;
    });
  });

  const topUrls = Object.entries(urlClicks)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([url, clicks]) => ({ url, clicks }));

  // Device breakdown
  const deviceCounts = emails.reduce((acc, email) => {
    const device = email.engagement.device || 'unknown';
    acc[device] = (acc[device] || 0) + 1;
    return acc;
  }, {});

  // Geographic breakdown
  const countryCounts = {};
  emails.forEach((email) => {
    if (email.engagement.location?.country) {
      const { country } = email.engagement.location;
      countryCounts[country] = (countryCounts[country] || 0) + 1;
    }
  });

  const topCountries = Object.entries(countryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([country, count]) => ({ country, count }));

  return {
    topClickedUrls: topUrls,
    deviceBreakdown: deviceCounts,
    topCountries,
  };
};

/**
 * Get bounced emails
 */
sendGridEmailSchema.statics.getBouncedEmails = async function (organizationId, bounceType) {
  const query = {
    organization: organizationId,
    'delivery.bounced': true,
    isDeleted: false,
  };

  if (bounceType) {
    query['delivery.bounceType'] = bounceType;
  }

  return this.find(query).sort({ 'delivery.bounceTimestamp': -1 });
};

/**
 * Get suppression list (bounced, spam, unsubscribed)
 */
sendGridEmailSchema.statics.getSuppressionList = async function (organizationId) {
  const bounced = await this.distinct('to.email', {
    organization: organizationId,
    'delivery.bounced': true,
    'delivery.bounceType': 'hard',
  });

  const spam = await this.distinct('to.email', {
    organization: organizationId,
    'delivery.spamReport': true,
  });

  const unsubscribed = await this.distinct('to.email', {
    organization: organizationId,
    'delivery.unsubscribed': true,
  });

  return {
    bounced,
    spam,
    unsubscribed,
    total: [...new Set([...bounced, ...spam, ...unsubscribed])].length,
  };
};

/**
 * Cleanup old emails
 */
sendGridEmailSchema.statics.cleanupOldEmails = async function (daysToKeep = 90) {
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

sendGridEmailSchema.pre('save', function (next) {
  // Ensure compliance defaults
  if (this.type === 'marketing' && !this.compliance.consentObtained) {
    this.compliance.consentObtained = false;
  }

  // Auto-set status based on delivery info
  if (this.delivery.bounced && this.status !== 'bounced') {
    this.status = 'bounced';
  }

  if (this.engagement.clicked && !['clicked'].includes(this.status)) {
    this.status = 'clicked';
  } else if (this.engagement.opened && !['opened', 'clicked'].includes(this.status)) {
    this.status = 'opened';
  }

  next();
});

module.exports = mongoose.model('SendGridEmail', sendGridEmailSchema);
