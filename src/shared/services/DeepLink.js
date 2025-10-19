const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Deep Link Model
 * TASK-14.9 - Deep Linking & Universal Links
 *
 * Manages deep links, universal links, and app routing
 * Features:
 * - Dynamic deep link generation
 * - Universal links (iOS) and App Links (Android)
 * - Link shortening
 * - Analytics tracking
 * - Expiration and usage limits
 * - Campaign tracking
 * - Deferred deep linking
 * - Link validation
 */

// eslint-disable-next-line no-unused-vars

const deepLinkSchema = new mongoose.Schema(
  {
    // Link Information
    shortCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    fullUrl: {
      type: String,
      required: true,
    },

    // Link Type
    type: {
      type: String,
      enum: [
        'universal', // Universal link (iOS) / App Link (Android)
        'deep', // Deep link (app-specific scheme)
        'deferred', // Deferred deep link (opens after install)
        'dynamic', // Dynamic link (Firebase style)
      ],
      default: 'universal',
      index: true,
    },

    // Destination
    destination: {
      screen: {
        type: String,
        required: true,
      },
      params: mongoose.Schema.Types.Mixed,
      fallbackUrl: String, // Web fallback if app not installed
    },

    // Platform Configuration
    platforms: {
      ios: {
        enabled: {
          type: Boolean,
          default: true,
        },
        appStoreUrl: String,
        bundleId: String,
        teamId: String,
        minVersion: String,
      },
      android: {
        enabled: {
          type: Boolean,
          default: true,
        },
        playStoreUrl: String,
        packageName: String,
        sha256CertFingerprint: String,
        minVersion: String,
      },
      web: {
        enabled: {
          type: Boolean,
          default: true,
        },
        url: String,
      },
    },

    // Link Properties
    title: String,
    description: String,
    imageUrl: String,

    // Social Media Tags (Open Graph / Twitter Card)
    socialTags: {
      ogTitle: String,
      ogDescription: String,
      ogImage: String,
      ogType: {
        type: String,
        default: 'website',
      },
      twitterCard: {
        type: String,
        enum: ['summary', 'summary_large_image', 'app', 'player'],
        default: 'summary',
      },
      twitterTitle: String,
      twitterDescription: String,
      twitterImage: String,
    },

    // Campaign Tracking
    campaign: {
      name: String,
      source: String,
      medium: String,
      content: String,
      term: String,
    },

    // UTM Parameters
    utmParams: {
      utm_source: String,
      utm_medium: String,
      utm_campaign: String,
      utm_term: String,
      utm_content: String,
    },

    // Link Behavior
    behavior: {
      // Open in app or web
      preferApp: {
        type: Boolean,
        default: true,
      },

      // Force new install if app not present
      forceInstall: {
        type: Boolean,
        default: false,
      },

      // Preserve link data after install (deferred deep linking)
      preserveAfterInstall: {
        type: Boolean,
        default: true,
      },

      // Custom behavior flags
      flags: [String],
    },

    // Expiration
    expiresAt: Date,

    // Usage Limits
    maxClicks: Number,
    maxUniqueClicks: Number,

    // Status
    status: {
      type: String,
      enum: ['active', 'paused', 'expired', 'disabled'],
      default: 'active',
      index: true,
    },

    // Analytics
    analytics: {
      totalClicks: {
        type: Number,
        default: 0,
      },
      uniqueClicks: {
        type: Number,
        default: 0,
      },
      clicksByPlatform: {
        ios: { type: Number, default: 0 },
        android: { type: Number, default: 0 },
        web: { type: Number, default: 0 },
        other: { type: Number, default: 0 },
      },
      clicksByCountry: [
        {
          country: String,
          count: { type: Number, default: 0 },
        },
      ],
      installs: {
        type: Number,
        default: 0,
      },
      conversions: {
        type: Number,
        default: 0,
      },
      lastClicked: Date,
    },

    // Click History
    clicks: [
      {
        timestamp: {
          type: Date,
          default: Date.now,
        },
        platform: String,
        device: {
          model: String,
          os: String,
          osVersion: String,
          browser: String,
        },
        location: {
          country: String,
          region: String,
          city: String,
          latitude: Number,
          longitude: Number,
        },
        ipAddress: String,
        userAgent: String,
        referrer: String,
        isUnique: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // Associated Entity
    relatedEntity: {
      type: {
        type: String,
        enum: [
          'appointment',
          'patient',
          'document',
          'payment',
          'survey',
          'referral',
          'promotion',
          'other',
        ],
      },
      id: mongoose.Schema.Types.ObjectId,
    },

    // Creator
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },

    // Metadata
    metadata: mongoose.Schema.Types.Mixed,
    tags: [String],
  },
  {
    timestamps: true,
  }
);

// ==================== INDEXES ====================

deepLinkSchema.index({ shortCode: 1, status: 1 });
deepLinkSchema.index({ 'destination.screen': 1 });
deepLinkSchema.index({ 'campaign.name': 1 });
deepLinkSchema.index({ expiresAt: 1 });
deepLinkSchema.index({ status: 1, expiresAt: 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// deepLinkSchema.index({ createdAt: -1 });

// ==================== VIRTUAL FIELDS ====================

deepLinkSchema.virtual('isExpired').get(function () {
  return this.expiresAt && this.expiresAt < new Date();
});

deepLinkSchema.virtual('isActive').get(function () {
  if (this.status !== 'active') return false;
  if (this.isExpired) return false;
  if (this.maxClicks && this.analytics.totalClicks >= this.maxClicks) return false;
  if (this.maxUniqueClicks && this.analytics.uniqueClicks >= this.maxUniqueClicks) return false;
  return true;
});

deepLinkSchema.virtual('clickRate').get(function () {
  if (this.analytics.totalClicks === 0) return 0;
  return (this.analytics.uniqueClicks / this.analytics.totalClicks) * 100;
});

deepLinkSchema.virtual('conversionRate').get(function () {
  if (this.analytics.uniqueClicks === 0) return 0;
  return (this.analytics.conversions / this.analytics.uniqueClicks) * 100;
});

// ==================== INSTANCE METHODS ====================

/**
 * Generate short URL
 */
deepLinkSchema.methods.getShortUrl = function (baseUrl = 'https://expojane.app') {
  return `${baseUrl}/l/${this.shortCode}`;
};

/**
 * Generate deep link URL
 */
deepLinkSchema.methods.getDeepLinkUrl = function (scheme = 'expojane') {
  const params = new URLSearchParams(this.destination.params || {}).toString();
  const { screen } = this.destination;
  return `${scheme}://${screen}${params ? '?' + params : ''}`;
};

/**
 * Generate universal link (iOS)
 */
deepLinkSchema.methods.getUniversalLink = function (domain = 'expojane.app') {
  return `https://${domain}/${this.destination.screen}?deeplink=${this.shortCode}`;
};

/**
 * Generate app link (Android)
 */
deepLinkSchema.methods.getAppLink = function (domain = 'expojane.app') {
  return this.getUniversalLink(domain);
};

/**
 * Track click
 */
deepLinkSchema.methods.trackClick = async function (clickData) {
  // Check if link is active
  if (!this.isActive) {
    throw new Error('Link is not active');
  }

  // Determine if unique click
  const isUnique = !this.clicks.some((click) => click.ipAddress === clickData.ipAddress);

  // Add click to history
  this.clicks.push({
    ...clickData,
    isUnique,
    timestamp: new Date(),
  });

  // Update analytics
  this.analytics.totalClicks += 1;
  if (isUnique) {
    this.analytics.uniqueClicks += 1;
  }

  // Update platform stats
  const platform = clickData.platform?.toLowerCase() || 'other';
  if (this.analytics.clicksByPlatform[platform] !== undefined) {
    this.analytics.clicksByPlatform[platform] += 1;
  } else {
    this.analytics.clicksByPlatform.other += 1;
  }

  // Update country stats
  if (clickData.location?.country) {
    const countryEntry = this.analytics.clicksByCountry.find(
      (c) => c.country === clickData.location.country
    );
    if (countryEntry) {
      countryEntry.count += 1;
    } else {
      this.analytics.clicksByCountry.push({
        country: clickData.location.country,
        count: 1,
      });
    }
  }

  this.analytics.lastClicked = new Date();

  // Keep only last 1000 clicks
  if (this.clicks.length > 1000) {
    this.clicks = this.clicks.slice(-1000);
  }

  return this.save();
};

/**
 * Track install
 */
deepLinkSchema.methods.trackInstall = function () {
  this.analytics.installs += 1;
  return this.save();
};

/**
 * Track conversion
 */
deepLinkSchema.methods.trackConversion = function () {
  this.analytics.conversions += 1;
  return this.save();
};

/**
 * Pause link
 */
deepLinkSchema.methods.pause = function () {
  this.status = 'paused';
  return this.save();
};

/**
 * Resume link
 */
deepLinkSchema.methods.resume = function () {
  this.status = 'active';
  return this.save();
};

/**
 * Disable link
 */
deepLinkSchema.methods.disable = function () {
  this.status = 'disabled';
  return this.save();
};

/**
 * Get analytics summary
 */
deepLinkSchema.methods.getAnalyticsSummary = function () {
  return {
    totalClicks: this.analytics.totalClicks,
    uniqueClicks: this.analytics.uniqueClicks,
    installs: this.analytics.installs,
    conversions: this.analytics.conversions,
    clickRate: this.clickRate,
    conversionRate: this.conversionRate,
    clicksByPlatform: this.analytics.clicksByPlatform,
    topCountries: this.analytics.clicksByCountry.sort((a, b) => b.count - a.count).slice(0, 5),
    lastClicked: this.analytics.lastClicked,
  };
};

// ==================== STATIC METHODS ====================

/**
 * Generate unique short code
 */
deepLinkSchema.statics.generateShortCode = async function (length = 8) {
  let shortCode;
  let exists = true;

  while (exists) {
    shortCode = crypto
      .randomBytes(length)
      .toString('base64')
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, length);

    exists = await this.exists({ shortCode });
  }

  return shortCode;
};

/**
 * Create deep link
 */
deepLinkSchema.statics.createLink = async function (linkData) {
  const shortCode = await this.generateShortCode();

  return this.create({
    shortCode,
    ...linkData,
  });
};

/**
 * Get by short code
 */
deepLinkSchema.statics.getByShortCode = async function (shortCode) {
  return this.findOne({ shortCode });
};

/**
 * Get active links
 */
deepLinkSchema.statics.getActiveLinks = async function (filters = {}) {
  const query = {
    status: 'active',
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    ...filters,
  };

  return this.find(query).sort({ createdAt: -1 });
};

/**
 * Get links by campaign
 */
deepLinkSchema.statics.getByCampaign = async function (campaignName) {
  return this.find({ 'campaign.name': campaignName }).sort({ createdAt: -1 });
};

/**
 * Get analytics for date range
 */
deepLinkSchema.statics.getAnalytics = async function (dateRange, filters = {}) {
  const { startDate, endDate } = dateRange;

  const matchQuery = {
    createdAt: { $gte: startDate, $lte: endDate },
    ...filters,
  };

  const analytics = await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalLinks: { $sum: 1 },
        totalClicks: { $sum: '$analytics.totalClicks' },
        totalUniqueClicks: { $sum: '$analytics.uniqueClicks' },
        totalInstalls: { $sum: '$analytics.installs' },
        totalConversions: { $sum: '$analytics.conversions' },
        avgClicksPerLink: { $avg: '$analytics.totalClicks' },
      },
    },
  ]);

  return (
    analytics[0] || {
      totalLinks: 0,
      totalClicks: 0,
      totalUniqueClicks: 0,
      totalInstalls: 0,
      totalConversions: 0,
      avgClicksPerLink: 0,
    }
  );
};

/**
 * Get top performing links
 */
deepLinkSchema.statics.getTopPerformers = async function (limit = 10, metric = 'totalClicks') {
  const sortField = `analytics.${metric}`;

  return this.find({ status: 'active' })
    .sort({ [sortField]: -1 })
    .limit(limit);
};

/**
 * Clean up expired links
 */
deepLinkSchema.statics.cleanupExpired = async function () {
  return this.updateMany(
    {
      expiresAt: { $lt: new Date() },
      status: 'active',
    },
    {
      $set: { status: 'expired' },
    }
  );
};

/**
 * Clean up old click history
 */
deepLinkSchema.statics.cleanupClickHistory = async function (daysToKeep = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  return this.updateMany(
    {},
    {
      $pull: {
        clicks: {
          timestamp: { $lt: cutoffDate },
        },
      },
    }
  );
};

// ==================== PRE-SAVE HOOKS ====================

deepLinkSchema.pre('save', function (next) {
  // Update status if expired
  if (this.isExpired && this.status === 'active') {
    this.status = 'expired';
  }

  // Generate full URL if not provided
  if (!this.fullUrl) {
    this.fullUrl = this.getShortUrl();
  }

  next();
});

module.exports = mongoose.model('DeepLink', deepLinkSchema);
