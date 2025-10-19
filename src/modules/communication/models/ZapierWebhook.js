const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Zapier Webhook Model
 * TASK-15.13 - Zapier Webhooks
 *
 * Manages Zapier webhook subscriptions and events
 * Features:
 * - Webhook subscription management
 * - Event triggering (triggers)
 * - Action handling (actions)
 * - Webhook authentication
 * - Event filtering
 * - Retry mechanism
 * - Webhook testing
 * - Event history
 * - Rate limiting
 * - Webhook verification
 */

// eslint-disable-next-line no-unused-vars

const zapierWebhookSchema = new mongoose.Schema(
  {
    // Webhook Type
    type: {
      type: String,
      enum: ['trigger', 'action', 'search'],
      required: true,
      index: true,
    },

    // Event Name (what triggers/actions this webhook handles)
    event: {
      type: String,
      required: true,
      index: true,
      // Examples: 'appointment.created', 'patient.updated', 'invoice.paid'
    },

    // Target URL (Zapier's webhook URL)
    targetUrl: {
      type: String,
      required: true,
    },

    // Webhook Status
    status: {
      type: String,
      enum: ['active', 'paused', 'disabled', 'failed'],
      default: 'active',
      index: true,
    },

    // Organization
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    // User who created the webhook
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Authentication
    authentication: {
      // API Key for verification
      apiKey: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },

      // Secret for HMAC signature verification
      secret: {
        type: String,
        required: true,
      },

      // Authentication method
      method: {
        type: String,
        enum: ['api_key', 'hmac', 'bearer', 'basic'],
        default: 'api_key',
      },
    },

    // Event Filters (what data to send)
    filters: {
      // Only send events matching these conditions
      conditions: [
        {
          field: String,
          operator: {
            type: String,
            enum: [
              'equals',
              'not_equals',
              'contains',
              'not_contains',
              'greater_than',
              'less_than',
              'in',
              'not_in',
            ],
          },
          value: mongoose.Schema.Types.Mixed,
        },
      ],

      // Fields to include in payload
      includedFields: [String],

      // Fields to exclude from payload
      excludedFields: [String],
    },

    // Retry Configuration
    retryConfig: {
      enabled: {
        type: Boolean,
        default: true,
      },
      maxRetries: {
        type: Number,
        default: 3,
      },
      retryDelay: {
        type: Number,
        default: 60000, // 1 minute in ms
      },
      backoffMultiplier: {
        type: Number,
        default: 2, // Exponential backoff
      },
    },

    // Rate Limiting
    rateLimit: {
      enabled: {
        type: Boolean,
        default: true,
      },
      maxRequestsPerMinute: {
        type: Number,
        default: 60,
      },
      maxRequestsPerHour: {
        type: Number,
        default: 1000,
      },
    },

    // Statistics
    stats: {
      totalEvents: {
        type: Number,
        default: 0,
      },
      successfulEvents: {
        type: Number,
        default: 0,
      },
      failedEvents: {
        type: Number,
        default: 0,
      },
      lastTriggeredAt: Date,
      lastSuccessAt: Date,
      lastFailureAt: Date,
      averageResponseTime: Number, // ms
    },

    // Recent Events (keep last 100)
    recentEvents: [
      {
        eventId: String,
        eventType: String,
        payload: mongoose.Schema.Types.Mixed,
        triggeredAt: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ['pending', 'sent', 'failed', 'retrying'],
        },
        statusCode: Number,
        responseTime: Number, // ms
        errorMessage: String,
        retryCount: {
          type: Number,
          default: 0,
        },
      },
    ],

    // Zapier-specific Configuration
    zapierConfig: {
      // Zapier subscription ID
      subscriptionId: String,

      // Zapier app version
      appVersion: String,

      // Zapier user info
      zapierUserId: String,

      // Hook URL (for Zapier REST Hooks)
      hookUrl: String,

      // Perform list (for static webhooks)
      performList: Boolean,
    },

    // Configuration
    config: {
      // Batch events
      batchEnabled: {
        type: Boolean,
        default: false,
      },
      batchSize: {
        type: Number,
        default: 10,
      },
      batchInterval: {
        type: Number,
        default: 60000, // 1 minute
      },

      // Include metadata
      includeMetadata: {
        type: Boolean,
        default: true,
      },

      // Transform payload
      transformEnabled: Boolean,
      transformScript: String, // JavaScript transformation code

      // Headers to send with webhook
      customHeaders: mongoose.Schema.Types.Mixed,

      // Timeout
      timeout: {
        type: Number,
        default: 30000, // 30 seconds
      },
    },

    // Testing
    testing: {
      isTest: {
        type: Boolean,
        default: false,
      },
      lastTestedAt: Date,
      testResults: [
        {
          testedAt: Date,
          success: Boolean,
          statusCode: Number,
          responseTime: Number,
          errorMessage: String,
        },
      ],
    },

    // Metadata
    metadata: mongoose.Schema.Types.Mixed,
    tags: [String],

    // Soft Delete
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: Date,
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// ==================== INDEXES ====================

zapierWebhookSchema.index({ organization: 1, event: 1 });
zapierWebhookSchema.index({ 'authentication.apiKey': 1, isDeleted: 1 });
zapierWebhookSchema.index({ status: 1, type: 1 });
zapierWebhookSchema.index({ createdBy: 1, createdAt: -1 });

// ==================== VIRTUAL FIELDS ====================

zapierWebhookSchema.virtual('isActive').get(function () {
  return this.status === 'active';
});

zapierWebhookSchema.virtual('successRate').get(function () {
  if (this.stats.totalEvents === 0) return 0;
  return ((this.stats.successfulEvents / this.stats.totalEvents) * 100).toFixed(2);
});

zapierWebhookSchema.virtual('failureRate').get(function () {
  if (this.stats.totalEvents === 0) return 0;
  return ((this.stats.failedEvents / this.stats.totalEvents) * 100).toFixed(2);
});

// ==================== INSTANCE METHODS ====================

/**
 * Generate API key
 */
zapierWebhookSchema.methods.generateApiKey = function () {
  this.authentication.apiKey = crypto.randomBytes(32).toString('hex');
  return this.authentication.apiKey;
};

/**
 * Generate secret
 */
zapierWebhookSchema.methods.generateSecret = function () {
  this.authentication.secret = crypto.randomBytes(64).toString('hex');
  return this.authentication.secret;
};

/**
 * Verify API key
 */
zapierWebhookSchema.methods.verifyApiKey = function (apiKey) {
  return this.authentication.apiKey === apiKey;
};

/**
 * Generate HMAC signature
 */
zapierWebhookSchema.methods.generateSignature = function (payload) {
  const hmac = crypto.createHmac('sha256', this.authentication.secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
};

/**
 * Verify HMAC signature
 */
zapierWebhookSchema.methods.verifySignature = function (payload, signature) {
  const expectedSignature = this.generateSignature(payload);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
};

/**
 * Record event
 */
zapierWebhookSchema.methods.recordEvent = async function (eventData) {
  const event = {
    eventId: eventData.eventId || crypto.randomBytes(16).toString('hex'),
    eventType: eventData.eventType || this.event,
    payload: eventData.payload,
    triggeredAt: new Date(),
    status: eventData.status || 'pending',
    statusCode: eventData.statusCode,
    responseTime: eventData.responseTime,
    errorMessage: eventData.errorMessage,
    retryCount: eventData.retryCount || 0,
  };

  // Add to recent events (keep last 100)
  this.recentEvents.unshift(event);
  if (this.recentEvents.length > 100) {
    this.recentEvents = this.recentEvents.slice(0, 100);
  }

  // Update stats
  this.stats.totalEvents += 1;
  this.stats.lastTriggeredAt = new Date();

  if (eventData.status === 'sent') {
    this.stats.successfulEvents += 1;
    this.stats.lastSuccessAt = new Date();

    // Update average response time
    if (eventData.responseTime) {
      const currentAvg = this.stats.averageResponseTime || 0;
      const totalSuccess = this.stats.successfulEvents;
      this.stats.averageResponseTime = Math.round(
        (currentAvg * (totalSuccess - 1) + eventData.responseTime) / totalSuccess
      );
    }
  } else if (eventData.status === 'failed') {
    this.stats.failedEvents += 1;
    this.stats.lastFailureAt = new Date();
  }

  return this.save();
};

/**
 * Test webhook
 */
zapierWebhookSchema.methods.testWebhook = async function (testPayload) {
  const testResult = {
    testedAt: new Date(),
    success: false,
    statusCode: 0,
    responseTime: 0,
    errorMessage: null,
  };

  try {
    const startTime = Date.now();

    // In production, this would make an actual HTTP request
    // For now, we'll simulate it
    testResult.success = true;
    testResult.statusCode = 200;
    testResult.responseTime = Date.now() - startTime;

    this.testing.lastTestedAt = new Date();
  } catch (error) {
    testResult.success = false;
    testResult.errorMessage = error.message;
  }

  this.testing.testResults.push(testResult);

  // Keep only last 10 test results
  if (this.testing.testResults.length > 10) {
    this.testing.testResults = this.testing.testResults.slice(-10);
  }

  await this.save();

  return testResult;
};

/**
 * Apply filters to payload
 */
zapierWebhookSchema.methods.applyFilters = function (payload) {
  let filteredPayload = { ...payload };

  // Apply field filters
  if (this.filters.includedFields && this.filters.includedFields.length > 0) {
    const included = {};
    this.filters.includedFields.forEach((field) => {
      if (payload[field] !== undefined) {
        included[field] = payload[field];
      }
    });
    filteredPayload = included;
  }

  if (this.filters.excludedFields && this.filters.excludedFields.length > 0) {
    this.filters.excludedFields.forEach((field) => {
      delete filteredPayload[field];
    });
  }

  return filteredPayload;
};

/**
 * Check if event matches conditions
 */
zapierWebhookSchema.methods.matchesConditions = function (payload) {
  if (!this.filters.conditions || this.filters.conditions.length === 0) {
    return true;
  }

  return this.filters.conditions.every((condition) => {
    const value = payload[condition.field];
    const targetValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return value === targetValue;
      case 'not_equals':
        return value !== targetValue;
      case 'contains':
        return String(value).includes(String(targetValue));
      case 'not_contains':
        return !String(value).includes(String(targetValue));
      case 'greater_than':
        return value > targetValue;
      case 'less_than':
        return value < targetValue;
      case 'in':
        return Array.isArray(targetValue) && targetValue.includes(value);
      case 'not_in':
        return Array.isArray(targetValue) && !targetValue.includes(value);
      default:
        return true;
    }
  });
};

/**
 * Pause webhook
 */
zapierWebhookSchema.methods.pause = async function () {
  this.status = 'paused';
  return this.save();
};

/**
 * Resume webhook
 */
zapierWebhookSchema.methods.resume = async function () {
  this.status = 'active';
  return this.save();
};

/**
 * Disable webhook
 */
zapierWebhookSchema.methods.disable = async function () {
  this.status = 'disabled';
  return this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Create webhook
 */
zapierWebhookSchema.statics.createWebhook = async function (webhookData) {
  const webhook = new this(webhookData);

  // Generate API key and secret if not provided
  if (!webhook.authentication.apiKey) {
    webhook.generateApiKey();
  }

  if (!webhook.authentication.secret) {
    webhook.generateSecret();
  }

  return webhook.save();
};

/**
 * Get webhook by API key
 */
zapierWebhookSchema.statics.getByApiKey = async function (apiKey) {
  return this.findOne({
    'authentication.apiKey': apiKey,
    isDeleted: false,
  });
};

/**
 * Get active webhooks for event
 */
zapierWebhookSchema.statics.getActiveWebhooksForEvent = async function (event, organizationId) {
  return this.find({
    event,
    organization: organizationId,
    status: 'active',
    isDeleted: false,
  });
};

/**
 * Get webhooks by organization
 */
zapierWebhookSchema.statics.getByOrganization = async function (organizationId) {
  return this.find({
    organization: organizationId,
    isDeleted: false,
  }).sort({ createdAt: -1 });
};

/**
 * Get statistics for organization
 */
zapierWebhookSchema.statics.getOrganizationStats = async function (organizationId) {
  const webhooks = await this.find({
    organization: organizationId,
    isDeleted: false,
  });

  const stats = {
    totalWebhooks: webhooks.length,
    activeWebhooks: webhooks.filter((w) => w.status === 'active').length,
    pausedWebhooks: webhooks.filter((w) => w.status === 'paused').length,
    totalEvents: webhooks.reduce((sum, w) => sum + w.stats.totalEvents, 0),
    successfulEvents: webhooks.reduce((sum, w) => sum + w.stats.successfulEvents, 0),
    failedEvents: webhooks.reduce((sum, w) => sum + w.stats.failedEvents, 0),
    averageResponseTime: Math.round(
      webhooks.reduce((sum, w) => sum + (w.stats.averageResponseTime || 0), 0) / webhooks.length
    ),
  };

  stats.successRate =
    stats.totalEvents > 0 ? ((stats.successfulEvents / stats.totalEvents) * 100).toFixed(2) : 0;

  return stats;
};

/**
 * Get failing webhooks
 */
zapierWebhookSchema.statics.getFailingWebhooks = async function (organizationId, threshold = 50) {
  const webhooks = await this.find({
    organization: organizationId,
    status: 'active',
    isDeleted: false,
  });

  return webhooks.filter((webhook) => {
    if (webhook.stats.totalEvents === 0) return false;
    const failureRate = (webhook.stats.failedEvents / webhook.stats.totalEvents) * 100;
    return failureRate >= threshold;
  });
};

/**
 * Cleanup old events
 */
zapierWebhookSchema.statics.cleanupOldEvents = async function (daysToKeep = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  return this.updateMany(
    {},
    {
      $pull: {
        recentEvents: {
          triggeredAt: { $lt: cutoffDate },
        },
      },
    }
  );
};

/**
 * Get available events
 */
zapierWebhookSchema.statics.getAvailableEvents = function () {
  return [
    // Appointment events
    'appointment.created',
    'appointment.updated',
    'appointment.deleted',
    'appointment.confirmed',
    'appointment.cancelled',
    'appointment.completed',
    'appointment.no_show',

    // Patient events
    'patient.created',
    'patient.updated',
    'patient.deleted',

    // Invoice/Billing events
    'invoice.created',
    'invoice.paid',
    'invoice.overdue',
    'invoice.refunded',

    // Payment events
    'payment.received',
    'payment.failed',

    // Document events
    'document.uploaded',
    'document.signed',

    // Form events
    'form.submitted',
    'survey.completed',

    // Communication events
    'message.sent',
    'email.delivered',
    'sms.delivered',

    // Custom events
    'custom.event',
  ];
};

// ==================== PRE-SAVE HOOKS ====================

zapierWebhookSchema.pre('save', function (next) {
  // Ensure API key and secret exist
  if (!this.authentication.apiKey) {
    this.generateApiKey();
  }

  if (!this.authentication.secret) {
    this.generateSecret();
  }

  next();
});

module.exports = mongoose.model('ZapierWebhook', zapierWebhookSchema);
