const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
const apiRateLimitingSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    // Rate Limiting Tiers
    tiers: [
      {
        tierId: {
          type: String,
          required: true,
          unique: true,
        },
        name: {
          type: String,
          required: true,
        },
        description: String,
        level: {
          type: String,
          enum: ['free', 'basic', 'standard', 'premium', 'enterprise', 'unlimited'],
          required: true,
        },
        limits: {
          requestsPerSecond: {
            type: Number,
            default: 10,
          },
          requestsPerMinute: {
            type: Number,
            default: 100,
          },
          requestsPerHour: {
            type: Number,
            default: 1000,
          },
          requestsPerDay: {
            type: Number,
            default: 10000,
          },
          requestsPerMonth: {
            type: Number,
            default: 100000,
          },
          concurrentRequests: {
            type: Number,
            default: 5,
          },
          burstLimit: {
            type: Number,
            default: 20,
          },
        },
        quotas: {
          dataTransferPerMonth: {
            type: Number,
            default: 10737418240, // 10GB in bytes
          },
          storageLimit: {
            type: Number,
            default: 5368709120, // 5GB in bytes
          },
          webhookCallsPerMonth: {
            type: Number,
            default: 10000,
          },
          customEndpoints: {
            type: Number,
            default: 5,
          },
        },
        features: {
          apiKeySupport: {
            type: Boolean,
            default: true,
          },
          oauthSupport: {
            type: Boolean,
            default: false,
          },
          webhookSupport: {
            type: Boolean,
            default: false,
          },
          analyticsAccess: {
            type: Boolean,
            default: false,
          },
          prioritySupport: {
            type: Boolean,
            default: false,
          },
          customRateLimits: {
            type: Boolean,
            default: false,
          },
          whitelistIps: {
            type: Boolean,
            default: false,
          },
        },
        pricing: {
          monthlyPrice: {
            type: Number,
            default: 0,
          },
          annualPrice: {
            type: Number,
            default: 0,
          },
          currency: {
            type: String,
            default: 'USD',
          },
          overage: {
            enabled: {
              type: Boolean,
              default: false,
            },
            pricePerRequest: Number,
            pricePerGb: Number,
          },
        },
        isActive: {
          type: Boolean,
          default: true,
        },
        isDefault: {
          type: Boolean,
          default: false,
        },
        sortOrder: {
          type: Number,
          default: 0,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // API Keys
    apiKeys: [
      {
        keyId: {
          type: String,
          required: true,
          unique: true,
        },
        name: {
          type: String,
          required: true,
        },
        key: {
          type: String,
          required: true,
          unique: true,
          select: false,
        },
        secret: {
          type: String,
          select: false,
        },
        tierId: {
          type: String,
          required: true,
        },
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        status: {
          type: String,
          enum: ['active', 'suspended', 'revoked', 'expired'],
          default: 'active',
        },
        permissions: [
          {
            resource: {
              type: String,
              required: true,
            },
            actions: [
              {
                type: String,
                enum: ['read', 'write', 'delete', 'admin'],
              },
            ],
          },
        ],
        ipWhitelist: [String],
        referrerWhitelist: [String],
        scopes: [String],
        metadata: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
        expiresAt: Date,
        lastUsedAt: Date,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Usage Tracking
    usage: [
      {
        period: {
          type: String,
          required: true, // Format: YYYY-MM-DD or YYYY-MM-DD-HH
        },
        keyId: String,
        tierId: String,
        metrics: {
          totalRequests: {
            type: Number,
            default: 0,
          },
          successfulRequests: {
            type: Number,
            default: 0,
          },
          failedRequests: {
            type: Number,
            default: 0,
          },
          throttledRequests: {
            type: Number,
            default: 0,
          },
          dataTransferred: {
            type: Number,
            default: 0, // in bytes
          },
          averageResponseTime: Number, // in ms
          peakRequestsPerSecond: Number,
        },
        endpoints: [
          {
            path: String,
            method: String,
            count: Number,
            avgResponseTime: Number,
          },
        ],
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Rate Limit Violations
    violations: [
      {
        violationId: {
          type: String,
          required: true,
        },
        keyId: String,
        tierId: String,
        limitType: {
          type: String,
          enum: [
            'per_second',
            'per_minute',
            'per_hour',
            'per_day',
            'per_month',
            'concurrent',
            'burst',
          ],
        },
        limitValue: Number,
        actualValue: Number,
        endpoint: String,
        ipAddress: String,
        userAgent: String,
        action: {
          type: String,
          enum: ['throttled', 'blocked', 'warned'],
          default: 'throttled',
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Custom Rate Limits (Overrides)
    customLimits: [
      {
        customLimitId: {
          type: String,
          required: true,
        },
        keyId: {
          type: String,
          required: true,
        },
        endpoint: String, // Specific endpoint or '*' for all
        limits: {
          requestsPerSecond: Number,
          requestsPerMinute: Number,
          requestsPerHour: Number,
          requestsPerDay: Number,
        },
        reason: String,
        expiresAt: Date,
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Alerts
    alerts: [
      {
        alertId: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          enum: [
            'quota_warning',
            'quota_exceeded',
            'rate_limit_violation',
            'key_expiring',
            'suspicious_activity',
          ],
          required: true,
        },
        severity: {
          type: String,
          enum: ['low', 'medium', 'high', 'critical'],
          default: 'medium',
        },
        keyId: String,
        tierId: String,
        message: String,
        data: mongoose.Schema.Types.Mixed,
        acknowledged: {
          type: Boolean,
          default: false,
        },
        acknowledgedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        acknowledgedAt: Date,
        resolvedAt: Date,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Notification Settings
    notifications: {
      email: {
        enabled: {
          type: Boolean,
          default: true,
        },
        recipients: [String],
        events: [
          {
            type: String,
            enum: [
              'quota_90',
              'quota_100',
              'rate_limit_exceeded',
              'key_expired',
              'suspicious_activity',
            ],
          },
        ],
      },
      webhook: {
        enabled: {
          type: Boolean,
          default: false,
        },
        url: String,
        events: [String],
        headers: {
          type: Map,
          of: String,
        },
      },
      slack: {
        enabled: {
          type: Boolean,
          default: false,
        },
        webhookUrl: String,
        channel: String,
      },
    },

    // Global Settings
    settings: {
      defaultTierId: String,
      gracePeriod: {
        type: Number,
        default: 3600, // seconds after quota exceeded
      },
      enableBurstMode: {
        type: Boolean,
        default: true,
      },
      blockOnViolation: {
        type: Boolean,
        default: false,
      },
      logAllRequests: {
        type: Boolean,
        default: true,
      },
      retentionDays: {
        type: Number,
        default: 90,
      },
      autoScaling: {
        enabled: {
          type: Boolean,
          default: false,
        },
        threshold: Number,
        maxTier: String,
      },
    },

    // Analytics
    analytics: {
      totalApiKeys: {
        type: Number,
        default: 0,
      },
      activeApiKeys: {
        type: Number,
        default: 0,
      },
      totalRequests: {
        type: Number,
        default: 0,
      },
      totalThrottled: {
        type: Number,
        default: 0,
      },
      averageResponseTime: Number,
      topEndpoints: [
        {
          path: String,
          method: String,
          count: Number,
        },
      ],
      tierDistribution: {
        type: Map,
        of: Number,
      },
      lastUpdated: Date,
    },

    // Audit Trail
    isActive: {
      type: Boolean,
      default: true,
    },
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
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
apiRateLimitingSchema.index({ organization: 1, isDeleted: 1 });
apiRateLimitingSchema.index({ 'apiKeys.keyId': 1 });
apiRateLimitingSchema.index({ 'apiKeys.key': 1 });
apiRateLimitingSchema.index({ 'apiKeys.status': 1 });
apiRateLimitingSchema.index({ 'usage.period': 1 });
apiRateLimitingSchema.index({ 'violations.timestamp': -1 });

// Virtual: Throttle Rate
apiRateLimitingSchema.virtual('throttleRate').get(function () {
  if (this.analytics.totalRequests === 0) return 0;
  return ((this.analytics.totalThrottled / this.analytics.totalRequests) * 100).toFixed(2);
});

// Virtual: Active Keys by Tier
apiRateLimitingSchema.virtual('activeKeysByTier').get(function () {
  const distribution = {};
  this.apiKeys
    .filter((k) => k.status === 'active')
    .forEach((key) => {
      distribution[key.tierId] = (distribution[key.tierId] || 0) + 1;
    });
  return distribution;
});

// Static Methods

// Get by Organization
apiRateLimitingSchema.statics.getByOrganization = async function (organizationId) {
  return this.findOne({
    organization: organizationId,
    isDeleted: false,
  });
};

// Get Tier
apiRateLimitingSchema.statics.getTier = async function (organizationId, tierId) {
  const rateLimiting = await this.findOne({ organization: organizationId, isDeleted: false });
  if (!rateLimiting) return null;
  return rateLimiting.tiers.find((t) => t.tierId === tierId);
};

// Get API Key
apiRateLimitingSchema.statics.getApiKey = async function (organizationId, key) {
  const rateLimiting = await this.findOne({
    organization: organizationId,
    isDeleted: false,
  }).select('+apiKeys.key +apiKeys.secret');
  if (!rateLimiting) return null;
  return rateLimiting.apiKeys.find((k) => k.key === key);
};

// Check Rate Limit
apiRateLimitingSchema.statics.checkRateLimit = async function (
  organizationId,
  keyId,
  limitType = 'per_minute'
) {
  const rateLimiting = await this.findOne({ organization: organizationId, isDeleted: false });
  if (!rateLimiting) return { allowed: true };

  const apiKey = rateLimiting.apiKeys.find((k) => k.keyId === keyId);
  if (!apiKey || apiKey.status !== 'active') {
    return { allowed: false, reason: 'Invalid or inactive API key' };
  }

  const tier = rateLimiting.tiers.find((t) => t.tierId === apiKey.tierId);
  if (!tier) {
    return { allowed: false, reason: 'Tier not found' };
  }

  // Get current period usage
  const now = new Date();
  let period;
  let limit;

  switch (limitType) {
    case 'per_second':
      period = now.toISOString().slice(0, 19); // YYYY-MM-DDTHH:MM:SS
      limit = tier.limits.requestsPerSecond;
      break;
    case 'per_minute':
      period = now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
      limit = tier.limits.requestsPerMinute;
      break;
    case 'per_hour':
      period = now.toISOString().slice(0, 13); // YYYY-MM-DDTHH
      limit = tier.limits.requestsPerHour;
      break;
    case 'per_day':
      period = now.toISOString().slice(0, 10); // YYYY-MM-DD
      limit = tier.limits.requestsPerDay;
      break;
    default:
      period = now.toISOString().slice(0, 16);
      limit = tier.limits.requestsPerMinute;
  }

  const usage = rateLimiting.usage.find((u) => u.period === period && u.keyId === keyId);
  const currentCount = usage ? usage.metrics.totalRequests : 0;

  if (currentCount >= limit) {
    return {
      allowed: false,
      reason: 'Rate limit exceeded',
      limit,
      current: currentCount,
      resetAt: new Date(now.getTime() + 60000), // Next minute
    };
  }

  return {
    allowed: true,
    limit,
    current: currentCount,
    remaining: limit - currentCount,
  };
};

// Instance Methods

// Add Tier
apiRateLimitingSchema.methods.addTier = async function (tierData) {
  const tierId = tierData.tierId || `TIER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  this.tiers.push({
    ...tierData,
    tierId,
  });

  return this.save();
};

// Update Tier
apiRateLimitingSchema.methods.updateTier = async function (tierId, updateData) {
  const tier = this.tiers.find((t) => t.tierId === tierId);
  if (!tier) {
    throw new Error('Tier not found');
  }

  Object.assign(tier, updateData);
  return this.save();
};

// Delete Tier
apiRateLimitingSchema.methods.deleteTier = async function (tierId) {
  const index = this.tiers.findIndex((t) => t.tierId === tierId);
  if (index === -1) {
    throw new Error('Tier not found');
  }

  // Check if tier is in use
  const keysUsingTier = this.apiKeys.filter((k) => k.tierId === tierId && k.status === 'active');
  if (keysUsingTier.length > 0) {
    throw new Error('Cannot delete tier with active API keys');
  }

  this.tiers.splice(index, 1);
  return this.save();
};

// Create API Key
apiRateLimitingSchema.methods.createApiKey = async function (keyData) {
  const keyId = `KEY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const key = `sk_${this.organization.toString().slice(0, 8)}_${Math.random().toString(36).substr(2, 32)}`;
  const secret = `secret_${Math.random().toString(36).substr(2, 48)}`;

  this.apiKeys.push({
    ...keyData,
    keyId,
    key,
    secret,
  });

  this.analytics.totalApiKeys += 1;
  this.analytics.activeApiKeys += 1;

  return this.save();
};

// Update API Key
apiRateLimitingSchema.methods.updateApiKey = async function (keyId, updateData) {
  const apiKey = this.apiKeys.find((k) => k.keyId === keyId);
  if (!apiKey) {
    throw new Error('API key not found');
  }

  const oldStatus = apiKey.status;
  Object.assign(apiKey, updateData);

  // Update analytics
  if (oldStatus !== updateData.status) {
    if (oldStatus === 'active' && updateData.status !== 'active') {
      this.analytics.activeApiKeys = Math.max(0, this.analytics.activeApiKeys - 1);
    } else if (oldStatus !== 'active' && updateData.status === 'active') {
      this.analytics.activeApiKeys += 1;
    }
  }

  return this.save();
};

// Revoke API Key
apiRateLimitingSchema.methods.revokeApiKey = async function (keyId) {
  const apiKey = this.apiKeys.find((k) => k.keyId === keyId);
  if (!apiKey) {
    throw new Error('API key not found');
  }

  apiKey.status = 'revoked';

  if (apiKey.status === 'active') {
    this.analytics.activeApiKeys = Math.max(0, this.analytics.activeApiKeys - 1);
  }

  return this.save();
};

// Record Usage
apiRateLimitingSchema.methods.recordUsage = async function (usageData) {
  const { period, keyId, endpoint, method, responseTime, dataTransferred, success } = usageData;

  let usage = this.usage.find((u) => u.period === period && u.keyId === keyId);

  if (!usage) {
    const apiKey = this.apiKeys.find((k) => k.keyId === keyId);
    this.usage.push({
      period,
      keyId,
      tierId: apiKey ? apiKey.tierId : null,
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        throttledRequests: 0,
        dataTransferred: 0,
      },
      endpoints: [],
    });
    usage = this.usage[this.usage.length - 1];
  }

  // Update metrics
  usage.metrics.totalRequests += 1;
  if (success) {
    usage.metrics.successfulRequests += 1;
  } else {
    usage.metrics.failedRequests += 1;
  }

  if (dataTransferred) {
    usage.metrics.dataTransferred += dataTransferred;
  }

  if (responseTime) {
    if (usage.metrics.averageResponseTime) {
      usage.metrics.averageResponseTime = (usage.metrics.averageResponseTime + responseTime) / 2;
    } else {
      usage.metrics.averageResponseTime = responseTime;
    }
  }

  // Update endpoint stats
  if (endpoint) {
    let endpointStat = usage.endpoints.find((e) => e.path === endpoint && e.method === method);
    if (!endpointStat) {
      usage.endpoints.push({
        path: endpoint,
        method,
        count: 0,
        avgResponseTime: 0,
      });
      endpointStat = usage.endpoints[usage.endpoints.length - 1];
    }

    endpointStat.count += 1;
    if (responseTime) {
      endpointStat.avgResponseTime = endpointStat.avgResponseTime
        ? (endpointStat.avgResponseTime + responseTime) / 2
        : responseTime;
    }
  }

  // Update API key last used
  const apiKey = this.apiKeys.find((k) => k.keyId === keyId);
  if (apiKey) {
    apiKey.lastUsedAt = new Date();
  }

  // Update analytics
  this.analytics.totalRequests += 1;
  this.analytics.lastUpdated = new Date();

  return this.save();
};

// Record Violation
apiRateLimitingSchema.methods.recordViolation = async function (violationData) {
  const violationId = `VIO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  this.violations.push({
    ...violationData,
    violationId,
  });

  this.analytics.totalThrottled += 1;

  // Create alert if severity is high
  if (violationData.action === 'blocked') {
    await this.createAlert({
      type: 'rate_limit_violation',
      severity: 'high',
      keyId: violationData.keyId,
      message: `Rate limit violation: ${violationData.limitType}`,
      data: violationData,
    });
  }

  // Keep only last 10000 violations
  if (this.violations.length > 10000) {
    this.violations = this.violations.slice(-10000);
  }

  return this.save();
};

// Add Custom Limit
apiRateLimitingSchema.methods.addCustomLimit = async function (customLimitData) {
  const customLimitId = `CL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  this.customLimits.push({
    ...customLimitData,
    customLimitId,
  });

  return this.save();
};

// Remove Custom Limit
apiRateLimitingSchema.methods.removeCustomLimit = async function (customLimitId) {
  const index = this.customLimits.findIndex((cl) => cl.customLimitId === customLimitId);
  if (index === -1) {
    throw new Error('Custom limit not found');
  }

  this.customLimits.splice(index, 1);
  return this.save();
};

// Create Alert
apiRateLimitingSchema.methods.createAlert = async function (alertData) {
  const alertId = `ALERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  this.alerts.push({
    ...alertData,
    alertId,
  });

  return this.save();
};

// Acknowledge Alert
apiRateLimitingSchema.methods.acknowledgeAlert = async function (alertId, userId) {
  const alert = this.alerts.find((a) => a.alertId === alertId);
  if (!alert) {
    throw new Error('Alert not found');
  }

  alert.acknowledged = true;
  alert.acknowledgedBy = userId;
  alert.acknowledgedAt = new Date();

  return this.save();
};

// Resolve Alert
apiRateLimitingSchema.methods.resolveAlert = async function (alertId) {
  const alert = this.alerts.find((a) => a.alertId === alertId);
  if (!alert) {
    throw new Error('Alert not found');
  }

  alert.resolvedAt = new Date();
  return this.save();
};

// Get Usage Summary
apiRateLimitingSchema.methods.getUsageSummary = function (keyId, startDate, endDate) {
  let usage = this.usage.filter((u) => u.keyId === keyId);

  if (startDate || endDate) {
    usage = usage.filter((u) => {
      const usageDate = new Date(u.timestamp);
      if (startDate && usageDate < new Date(startDate)) return false;
      if (endDate && usageDate > new Date(endDate)) return false;
      return true;
    });
  }

  const summary = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    throttledRequests: 0,
    dataTransferred: 0,
    averageResponseTime: 0,
  };

  usage.forEach((u) => {
    summary.totalRequests += u.metrics.totalRequests;
    summary.successfulRequests += u.metrics.successfulRequests;
    summary.failedRequests += u.metrics.failedRequests;
    summary.throttledRequests += u.metrics.throttledRequests;
    summary.dataTransferred += u.metrics.dataTransferred;
  });

  if (usage.length > 0) {
    const avgTimes = usage.filter((u) => u.metrics.averageResponseTime);
    if (avgTimes.length > 0) {
      summary.averageResponseTime =
        avgTimes.reduce((sum, u) => sum + u.metrics.averageResponseTime, 0) / avgTimes.length;
    }
  }

  return summary;
};

// Soft Delete
apiRateLimitingSchema.methods.softDelete = async function (userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

// Restore
apiRateLimitingSchema.methods.restore = async function () {
  this.isDeleted = false;
  this.deletedAt = null;
  this.deletedBy = null;
  return this.save();
};

module.exports = mongoose.model('ApiRateLimiting', apiRateLimitingSchema);
