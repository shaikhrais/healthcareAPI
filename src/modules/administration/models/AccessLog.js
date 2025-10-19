const mongoose = require('mongoose');

/**
 * Access Log Model
 * Tracks all system access with device info, location, and social media source
 */

// eslint-disable-next-line no-unused-vars

const accessLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Access Information
    accessType: {
      type: String,
      enum: ['login', 'api_call', 'page_view', 'action', 'logout'],
      required: true,
    },

    endpoint: {
      type: String, // API endpoint accessed
    },

    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    },

    statusCode: {
      type: Number, // HTTP status code
    },

    // Device Information
    deviceInfo: {
      deviceId: String, // Unique device fingerprint
      deviceType: {
        type: String,
        enum: ['mobile', 'tablet', 'desktop', 'unknown'],
      },
      os: String, // Operating system
      osVersion: String,
      browser: String,
      browserVersion: String,
      userAgent: String,
      screenResolution: String,
      timezone: String,
      language: String,
    },

    // Location Information
    location: {
      ip: String,
      country: String,
      countryCode: String,
      region: String,
      city: String,
      latitude: Number,
      longitude: Number,
      timezone: String,
      isp: String, // Internet Service Provider
    },

    // Social Media Source Tracking
    referralSource: {
      type: {
        type: String,
        enum: ['direct', 'social_media', 'search', 'email', 'qr_code', 'advertisement', 'unknown'],
      },
      platform: {
        type: String,
        enum: [
          'facebook',
          'instagram',
          'twitter',
          'linkedin',
          'tiktok',
          'youtube',
          'whatsapp',
          'telegram',
          'other',
          'none',
        ],
      },
      campaign: String, // Marketing campaign ID
      referrer: String, // Full referrer URL
      utmSource: String,
      utmMedium: String,
      utmCampaign: String,
      utmTerm: String,
      utmContent: String,
    },

    // Security Information
    security: {
      isSecure: Boolean, // HTTPS connection
      isTrustedDevice: Boolean,
      isNewDevice: Boolean,
      riskScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      riskFactors: [String], // List of risk factors detected
      authMethod: {
        type: String,
        enum: ['password', 'oauth', 'sso', 'biometric', 'mfa', 'token'],
      },
      mfaUsed: Boolean,
      sessionId: String,
    },

    // Performance Metrics
    performance: {
      responseTime: Number, // milliseconds
      requestSize: Number, // bytes
      responseSize: Number, // bytes
    },

    // Flags
    flagged: {
      type: Boolean,
      default: false,
    },

    flagReason: String,

    // Metadata
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
    collection: 'access_logs',
  }
);

// Indexes for efficient querying
accessLogSchema.index({ userId: 1, createdAt: -1 });
accessLogSchema.index({ 'deviceInfo.deviceId': 1 });
accessLogSchema.index({ 'location.ip': 1 });
accessLogSchema.index({ 'referralSource.platform': 1 });
accessLogSchema.index({ accessType: 1, createdAt: -1 });
accessLogSchema.index({ flagged: 1 });
accessLogSchema.index({ 'security.riskScore': -1 });
accessLogSchema.index({ createdAt: -1 });

// TTL index - automatically delete logs older than 90 days
accessLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

// Static methods
accessLogSchema.statics = {
  /**
   * Get user access statistics
   */
  async getUserStats(userId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.aggregate([
      {
        $match: {
          userId: mongoose.Types.ObjectId(userId),
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          totalAccesses: { $sum: 1 },
          uniqueDevices: { $addToSet: '$deviceInfo.deviceId' },
          uniqueIPs: { $addToSet: '$location.ip' },
          avgRiskScore: { $avg: '$security.riskScore' },
          flaggedAccesses: {
            $sum: { $cond: ['$flagged', 1, 0] },
          },
        },
      },
    ]);
  },

  /**
   * Get social media analytics
   */
  async getSocialMediaAnalytics(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.aggregate([
      {
        $match: {
          'referralSource.type': 'social_media',
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: '$referralSource.platform',
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          avgRiskScore: { $avg: '$security.riskScore' },
        },
      },
      {
        $project: {
          platform: '$_id',
          count: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
          avgRiskScore: 1,
        },
      },
      { $sort: { count: -1 } },
    ]);
  },

  /**
   * Get geographic distribution
   */
  async getGeographicDistribution(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          'location.country': { $exists: true },
        },
      },
      {
        $group: {
          _id: {
            country: '$location.country',
            countryCode: '$location.countryCode',
          },
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          cities: { $addToSet: '$location.city' },
        },
      },
      {
        $project: {
          country: '$_id.country',
          countryCode: '$_id.countryCode',
          count: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
          uniqueCities: { $size: '$cities' },
        },
      },
      { $sort: { count: -1 } },
    ]);
  },

  /**
   * Detect suspicious activity
   */
  async detectSuspiciousActivity(hours = 24) {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hours);

    return this.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          $or: [
            { 'security.riskScore': { $gte: 70 } },
            { flagged: true },
            { 'security.isNewDevice': true },
          ],
        },
      },
      {
        $group: {
          _id: '$userId',
          suspiciousAccesses: { $sum: 1 },
          maxRiskScore: { $max: '$security.riskScore' },
          devices: { $addToSet: '$deviceInfo.deviceId' },
          ips: { $addToSet: '$location.ip' },
          riskFactors: { $push: '$security.riskFactors' },
        },
      },
      {
        $match: {
          $or: [{ suspiciousAccesses: { $gte: 5 } }, { maxRiskScore: { $gte: 80 } }],
        },
      },
      { $sort: { maxRiskScore: -1, suspiciousAccesses: -1 } },
    ]);
  },
};

module.exports = mongoose.model('AccessLog', accessLogSchema);
