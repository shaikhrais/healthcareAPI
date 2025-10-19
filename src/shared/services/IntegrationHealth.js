const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
const integrationHealthSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    integrations: [
      {
        integrationId: {
          type: String,
          required: true,
          index: true,
        },
        integrationType: {
          type: String,
          enum: [
            'quickbooks',
            'mailchimp',
            'slack',
            'teams',
            'social_login',
            'twilio',
            'sendgrid',
            'zapier',
            'doxy',
            'stripe',
            'square',
            'custom',
          ],
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        status: {
          type: String,
          enum: ['healthy', 'degraded', 'down', 'unknown', 'maintenance'],
          default: 'unknown',
          index: true,
        },
        isEnabled: {
          type: Boolean,
          default: true,
        },
        lastCheckAt: {
          type: Date,
          index: true,
        },
        lastHealthyAt: {
          type: Date,
        },
        lastIncidentAt: {
          type: Date,
        },
        uptimePercentage: {
          type: Number,
          default: 100,
          min: 0,
          max: 100,
        },
        responseTime: {
          current: { type: Number, default: 0 }, // ms
          average: { type: Number, default: 0 }, // ms
          min: { type: Number, default: 0 }, // ms
          max: { type: Number, default: 0 }, // ms
        },
        endpoints: [
          {
            endpoint: String,
            method: { type: String, enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
            status: { type: String, enum: ['healthy', 'degraded', 'down', 'unknown'] },
            lastChecked: Date,
            responseTime: Number,
            statusCode: Number,
            errorMessage: String,
          },
        ],
        metrics: {
          totalRequests: { type: Number, default: 0 },
          successfulRequests: { type: Number, default: 0 },
          failedRequests: { type: Number, default: 0 },
          timeouts: { type: Number, default: 0 },
          rateLimit: {
            limit: Number,
            remaining: Number,
            reset: Date,
          },
          quota: {
            limit: Number,
            used: Number,
            remaining: Number,
            resetDate: Date,
          },
        },
        configuration: {
          checkInterval: { type: Number, default: 300 }, // seconds (5 minutes)
          timeout: { type: Number, default: 30 }, // seconds
          retryAttempts: { type: Number, default: 3 },
          alertThreshold: { type: Number, default: 3 }, // consecutive failures
          degradedThreshold: { type: Number, default: 2000 }, // ms response time
        },
        consecutiveFailures: {
          type: Number,
          default: 0,
        },
        consecutiveSuccesses: {
          type: Number,
          default: 0,
        },
      },
    ],
    healthChecks: [
      {
        checkId: {
          type: String,
          required: true,
        },
        integrationId: {
          type: String,
          required: true,
          index: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
          index: true,
        },
        status: {
          type: String,
          enum: ['success', 'failure', 'timeout', 'degraded'],
          required: true,
        },
        responseTime: {
          type: Number,
          default: 0,
        },
        statusCode: {
          type: Number,
        },
        errorMessage: {
          type: String,
        },
        errorStack: {
          type: String,
        },
        metadata: {
          type: mongoose.Schema.Types.Mixed,
        },
      },
    ],
    incidents: [
      {
        incidentId: {
          type: String,
          required: true,
          unique: true,
        },
        integrationId: {
          type: String,
          required: true,
          index: true,
        },
        severity: {
          type: String,
          enum: ['critical', 'high', 'medium', 'low'],
          default: 'medium',
        },
        title: {
          type: String,
          required: true,
        },
        description: {
          type: String,
        },
        status: {
          type: String,
          enum: ['open', 'investigating', 'identified', 'monitoring', 'resolved'],
          default: 'open',
          index: true,
        },
        startedAt: {
          type: Date,
          default: Date.now,
          index: true,
        },
        resolvedAt: {
          type: Date,
        },
        duration: {
          type: Number, // seconds
        },
        affectedEndpoints: [
          {
            type: String,
          },
        ],
        rootCause: {
          type: String,
        },
        resolution: {
          type: String,
        },
        updates: [
          {
            timestamp: { type: Date, default: Date.now },
            message: String,
            updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          },
        ],
        notificationsSent: {
          type: Number,
          default: 0,
        },
      },
    ],
    alerts: [
      {
        alertId: {
          type: String,
          required: true,
        },
        integrationId: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          enum: ['down', 'degraded', 'rate_limit', 'quota_exceeded', 'slow_response', 'error_rate'],
          required: true,
        },
        severity: {
          type: String,
          enum: ['critical', 'warning', 'info'],
          default: 'warning',
        },
        message: {
          type: String,
          required: true,
        },
        acknowledged: {
          type: Boolean,
          default: false,
        },
        acknowledgedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        acknowledgedAt: {
          type: Date,
        },
        createdAt: {
          type: Date,
          default: Date.now,
          index: true,
        },
        resolvedAt: {
          type: Date,
        },
      },
    ],
    notificationConfig: {
      enabled: {
        type: Boolean,
        default: true,
      },
      channels: {
        email: {
          enabled: { type: Boolean, default: true },
          recipients: [{ type: String }],
        },
        slack: {
          enabled: { type: Boolean, default: false },
          channelId: String,
          webhookUrl: String,
        },
        sms: {
          enabled: { type: Boolean, default: false },
          phoneNumbers: [{ type: String }],
        },
        webhook: {
          enabled: { type: Boolean, default: false },
          url: String,
          method: { type: String, default: 'POST' },
          headers: { type: Map, of: String },
        },
      },
      severityFilters: {
        critical: { type: Boolean, default: true },
        high: { type: Boolean, default: true },
        medium: { type: Boolean, default: true },
        low: { type: Boolean, default: false },
      },
      quietHours: {
        enabled: { type: Boolean, default: false },
        startTime: String, // HH:MM format
        endTime: String, // HH:MM format
        timezone: { type: String, default: 'UTC' },
      },
    },
    stats: {
      totalChecks: {
        type: Number,
        default: 0,
      },
      successfulChecks: {
        type: Number,
        default: 0,
      },
      failedChecks: {
        type: Number,
        default: 0,
      },
      totalIncidents: {
        type: Number,
        default: 0,
      },
      openIncidents: {
        type: Number,
        default: 0,
      },
      totalAlerts: {
        type: Number,
        default: 0,
      },
      unacknowledgedAlerts: {
        type: Number,
        default: 0,
      },
      averageResponseTime: {
        type: Number,
        default: 0,
      },
      overallUptime: {
        type: Number,
        default: 100,
        min: 0,
        max: 100,
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
integrationHealthSchema.index({ organization: 1, 'integrations.status': 1 });
integrationHealthSchema.index({ 'healthChecks.timestamp': -1 });
integrationHealthSchema.index({ 'incidents.status': 1, 'incidents.startedAt': -1 });
integrationHealthSchema.index({ 'alerts.acknowledged': 1, 'alerts.createdAt': -1 });

// Virtual: Overall Health Status
integrationHealthSchema.virtual('overallHealthStatus').get(function () {
  if (this.integrations.length === 0) return 'unknown';

  const downCount = this.integrations.filter((i) => i.status === 'down' && i.isEnabled).length;
  const degradedCount = this.integrations.filter(
    (i) => i.status === 'degraded' && i.isEnabled
  ).length;
  const healthyCount = this.integrations.filter(
    (i) => i.status === 'healthy' && i.isEnabled
  ).length;
  const enabledCount = this.integrations.filter((i) => i.isEnabled).length;

  if (enabledCount === 0) return 'unknown';

  if (downCount > 0) return 'critical';
  if (degradedCount > 0) return 'degraded';
  if (healthyCount === enabledCount) return 'healthy';

  return 'unknown';
});

// Virtual: Health Score (0-100)
integrationHealthSchema.virtual('healthScore').get(function () {
  if (this.integrations.length === 0) return 100;

  const enabledIntegrations = this.integrations.filter((i) => i.isEnabled);
  if (enabledIntegrations.length === 0) return 100;

  let totalScore = 0;
  enabledIntegrations.forEach((integration) => {
    let score = 0;
    if (integration.status === 'healthy') score = 100;
    else if (integration.status === 'degraded') score = 60;
    else if (integration.status === 'down') score = 0;
    else score = 50; // unknown or maintenance

    // Factor in uptime percentage
    score = (score * integration.uptimePercentage) / 100;

    totalScore += score;
  });

  return Math.round(totalScore / enabledIntegrations.length);
});

// Instance method: Add Integration
integrationHealthSchema.methods.addIntegration = function (integrationData) {
  const existingIndex = this.integrations.findIndex(
    (i) => i.integrationId === integrationData.integrationId
  );

  if (existingIndex !== -1) {
    throw new Error('Integration already exists');
  }

  this.integrations.push({
    integrationId: integrationData.integrationId,
    integrationType: integrationData.integrationType,
    name: integrationData.name,
    status: 'unknown',
    isEnabled: integrationData.isEnabled !== undefined ? integrationData.isEnabled : true,
    configuration: integrationData.configuration || {},
    consecutiveFailures: 0,
    consecutiveSuccesses: 0,
  });

  return this.save();
};

// Instance method: Update Integration Status
integrationHealthSchema.methods.updateIntegrationStatus = function (
  integrationId,
  status,
  responseTime
) {
  const integration = this.integrations.find((i) => i.integrationId === integrationId);

  if (!integration) {
    throw new Error('Integration not found');
  }

  const previousStatus = integration.status;
  integration.status = status;
  integration.lastCheckAt = new Date();

  // Update response time
  if (responseTime !== undefined) {
    integration.responseTime.current = responseTime;

    if (integration.responseTime.min === 0 || responseTime < integration.responseTime.min) {
      integration.responseTime.min = responseTime;
    }

    if (responseTime > integration.responseTime.max) {
      integration.responseTime.max = responseTime;
    }

    // Update average
    const totalChecks = integration.metrics.totalRequests;
    const currentAvg = integration.responseTime.average;
    integration.responseTime.average = Math.round(
      (currentAvg * totalChecks + responseTime) / (totalChecks + 1)
    );
  }

  // Update consecutive counts
  if (status === 'healthy') {
    integration.consecutiveFailures = 0;
    integration.consecutiveSuccesses += 1;
    integration.lastHealthyAt = new Date();
  } else {
    integration.consecutiveSuccesses = 0;
    integration.consecutiveFailures += 1;
  }

  // Check if status changed from healthy
  if (previousStatus === 'healthy' && status !== 'healthy') {
    integration.lastIncidentAt = new Date();
  }

  return this.save();
};

// Instance method: Record Health Check
integrationHealthSchema.methods.recordHealthCheck = function (checkData) {
  const checkId = `check-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  this.healthChecks.push({
    checkId,
    integrationId: checkData.integrationId,
    timestamp: new Date(),
    status: checkData.status,
    responseTime: checkData.responseTime || 0,
    statusCode: checkData.statusCode,
    errorMessage: checkData.errorMessage,
    errorStack: checkData.errorStack,
    metadata: checkData.metadata,
  });

  // Update stats
  this.stats.totalChecks += 1;

  if (checkData.status === 'success') {
    this.stats.successfulChecks += 1;
  } else {
    this.stats.failedChecks += 1;
  }

  // Update integration metrics
  const integration = this.integrations.find((i) => i.integrationId === checkData.integrationId);
  if (integration) {
    integration.metrics.totalRequests += 1;

    if (checkData.status === 'success') {
      integration.metrics.successfulRequests += 1;
    } else {
      integration.metrics.failedRequests += 1;
    }

    if (checkData.status === 'timeout') {
      integration.metrics.timeouts += 1;
    }

    // Update uptime percentage
    integration.uptimePercentage =
      (integration.metrics.successfulRequests / integration.metrics.totalRequests) * 100;
  }

  // Keep only last 1000 health checks per integration
  const checksForIntegration = this.healthChecks.filter(
    (c) => c.integrationId === checkData.integrationId
  );
  if (checksForIntegration.length > 1000) {
    const checksToRemove = checksForIntegration
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, checksForIntegration.length - 1000)
      .map((c) => c.checkId);

    this.healthChecks = this.healthChecks.filter((c) => !checksToRemove.includes(c.checkId));
  }

  return this.save();
};

// Instance method: Create Incident
integrationHealthSchema.methods.createIncident = function (incidentData) {
  const incidentId = `incident-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  this.incidents.push({
    incidentId,
    integrationId: incidentData.integrationId,
    severity: incidentData.severity || 'medium',
    title: incidentData.title,
    description: incidentData.description,
    status: 'open',
    startedAt: new Date(),
    affectedEndpoints: incidentData.affectedEndpoints || [],
    updates: [],
  });

  this.stats.totalIncidents += 1;
  this.stats.openIncidents += 1;

  return this.save();
};

// Instance method: Update Incident
integrationHealthSchema.methods.updateIncident = function (incidentId, updates, userId) {
  const incident = this.incidents.find((i) => i.incidentId === incidentId);

  if (!incident) {
    throw new Error('Incident not found');
  }

  // Add update message
  if (updates.message) {
    incident.updates.push({
      timestamp: new Date(),
      message: updates.message,
      updatedBy: userId,
    });
  }

  // Update status
  if (updates.status) {
    const previousStatus = incident.status;
    incident.status = updates.status;

    // If resolved, calculate duration
    if (updates.status === 'resolved' && !incident.resolvedAt) {
      incident.resolvedAt = new Date();
      incident.duration = Math.floor((incident.resolvedAt - incident.startedAt) / 1000);
      this.stats.openIncidents = Math.max(0, this.stats.openIncidents - 1);
    }

    // If reopening
    if (previousStatus === 'resolved' && updates.status !== 'resolved') {
      incident.resolvedAt = null;
      incident.duration = null;
      this.stats.openIncidents += 1;
    }
  }

  // Update other fields
  if (updates.severity) incident.severity = updates.severity;
  if (updates.rootCause) incident.rootCause = updates.rootCause;
  if (updates.resolution) incident.resolution = updates.resolution;

  return this.save();
};

// Instance method: Create Alert
integrationHealthSchema.methods.createAlert = function (alertData) {
  const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  this.alerts.push({
    alertId,
    integrationId: alertData.integrationId,
    type: alertData.type,
    severity: alertData.severity || 'warning',
    message: alertData.message,
    acknowledged: false,
    createdAt: new Date(),
  });

  this.stats.totalAlerts += 1;
  this.stats.unacknowledgedAlerts += 1;

  return this.save();
};

// Instance method: Acknowledge Alert
integrationHealthSchema.methods.acknowledgeAlert = function (alertId, userId) {
  const alert = this.alerts.find((a) => a.alertId === alertId);

  if (!alert) {
    throw new Error('Alert not found');
  }

  if (!alert.acknowledged) {
    alert.acknowledged = true;
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date();
    this.stats.unacknowledgedAlerts = Math.max(0, this.stats.unacknowledgedAlerts - 1);
  }

  return this.save();
};

// Instance method: Update Notification Config
integrationHealthSchema.methods.updateNotificationConfig = function (updates) {
  this.notificationConfig = {
    ...this.notificationConfig.toObject(),
    ...updates,
  };

  return this.save();
};

// Static method: Get by organization
integrationHealthSchema.statics.getByOrganization = async function (organizationId) {
  return this.findOne({
    organization: organizationId,
    isDeleted: false,
  });
};

// Static method: Get integration health
integrationHealthSchema.statics.getIntegrationHealth = async function (
  organizationId,
  integrationId
) {
  const health = await this.findOne({
    organization: organizationId,
    isDeleted: false,
  });

  if (!health) return null;

  return health.integrations.find((i) => i.integrationId === integrationId);
};

// Static method: Get recent incidents
integrationHealthSchema.statics.getRecentIncidents = async function (organizationId, filters = {}) {
  const health = await this.findOne({
    organization: organizationId,
    isDeleted: false,
  });

  if (!health) return [];

  let { incidents } = health;

  if (filters.status) {
    incidents = incidents.filter((i) => i.status === filters.status);
  }

  if (filters.severity) {
    incidents = incidents.filter((i) => i.severity === filters.severity);
  }

  if (filters.integrationId) {
    incidents = incidents.filter((i) => i.integrationId === filters.integrationId);
  }

  // Sort by start date (newest first)
  incidents.sort((a, b) => b.startedAt - a.startedAt);

  if (filters.limit) {
    incidents = incidents.slice(0, filters.limit);
  }

  return incidents;
};

// Static method: Get overall statistics
integrationHealthSchema.statics.getOverallStats = async function (organizationId) {
  const health = await this.findOne({
    organization: organizationId,
    isDeleted: false,
  });

  if (!health) return null;

  return {
    totalChecks: health.stats.totalChecks,
    successfulChecks: health.stats.successfulChecks,
    failedChecks: health.stats.failedChecks,
    totalIncidents: health.stats.totalIncidents,
    openIncidents: health.stats.openIncidents,
    totalAlerts: health.stats.totalAlerts,
    unacknowledgedAlerts: health.stats.unacknowledgedAlerts,
    overallUptime: health.stats.overallUptime,
    overallHealthStatus: health.overallHealthStatus,
    healthScore: health.healthScore,
    totalIntegrations: health.integrations.length,
    healthyIntegrations: health.integrations.filter((i) => i.status === 'healthy' && i.isEnabled)
      .length,
    degradedIntegrations: health.integrations.filter((i) => i.status === 'degraded' && i.isEnabled)
      .length,
    downIntegrations: health.integrations.filter((i) => i.status === 'down' && i.isEnabled).length,
  };
};

// Enable virtuals in JSON
integrationHealthSchema.set('toJSON', { virtuals: true });
integrationHealthSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('IntegrationHealth', integrationHealthSchema);
