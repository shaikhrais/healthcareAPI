const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
/**
 * PatientAttribution Model
 *
 * Tracks the complete journey of how a patient discovered and booked with the practice,
 * including all marketing touchpoints and conversion paths for ROI analysis.
 *
 * Attribution Models Supported:
 * - First Touch: 100% credit to first interaction
 * - Last Touch: 100% credit to final interaction before conversion
 * - Linear: Equal credit across all touchpoints
 * - Time Decay: More recent touchpoints get more credit
 * - Position-Based (U-Shaped): 40% first, 40% last, 20% middle
 * - Custom: Weighted based on business rules
 */

const touchPointSchema = new mongoose.Schema(
  {
    // Touchpoint metadata
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
    channel: {
      type: String,
      required: true,
      enum: [
        'organic_search', // Google/Bing organic
        'paid_search', // Google Ads, Bing Ads
        'social_organic', // Facebook, Instagram, LinkedIn organic
        'social_paid', // Facebook Ads, Instagram Ads
        'email', // Email campaigns
        'direct', // Direct traffic (typed URL)
        'referral', // Patient/provider referral
        'display_ads', // Banner ads
        'video_ads', // YouTube ads
        'content', // Blog posts, articles
        'review_sites', // Google Reviews, Yelp, Healthgrades
        'marketplace', // Jane app marketplace
        'events', // Health fairs, community events
        'print', // Flyers, magazines
        'radio', // Radio ads
        'tv', // TV commercials
        'partnership', // Insurance/corporate partnerships
        'retargeting', // Retargeting campaigns
        'sms', // SMS campaigns
        'affiliate', // Affiliate marketing
        'other',
      ],
      index: true,
    },
    medium: {
      type: String,
      enum: [
        'cpc',
        'cpm',
        'organic',
        'referral',
        'email',
        'social',
        'display',
        'affiliate',
        'other',
      ],
    },
    source: {
      type: String, // google, facebook, instagram, jane_marketplace, etc.
    },
    campaign: {
      type: String, // Campaign name/ID
      index: true,
    },
    content: {
      type: String, // Ad content, email subject, post title
    },
    keyword: {
      type: String, // Search keyword (for paid/organic search)
    },

    // Page/session information
    landingPage: {
      type: String,
    },
    referrerUrl: {
      type: String,
    },
    pageViews: {
      type: Number,
      default: 1,
    },
    sessionDuration: {
      type: Number, // seconds
    },

    // Device/tech info
    device: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet'],
    },
    browser: String,
    os: String,

    // Location
    location: {
      city: String,
      state: String,
      country: String,
    },

    // Engagement metrics
    interactions: {
      type: Number,
      default: 0, // clicks, form submissions, etc.
    },
    valueAdded: {
      type: Number,
      default: 0, // Estimated value of this touchpoint
    },

    // Attribution credits (calculated)
    credits: {
      firstTouch: { type: Number, default: 0 },
      lastTouch: { type: Number, default: 0 },
      linear: { type: Number, default: 0 },
      timeDecay: { type: Number, default: 0 },
      positionBased: { type: Number, default: 0 },
      custom: { type: Number, default: 0 },
    },
  },
  { _id: true }
);

const patientAttributionSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      unique: true,
      index: true,
    },

    // Journey metadata
    journeyStartDate: {
      type: Date,
      required: true,
      index: true,
    },
    conversionDate: {
      type: Date,
      index: true,
    },
    journeyDuration: {
      type: Number, // days from first touch to conversion
    },

    // Conversion details
    converted: {
      type: Boolean,
      default: false,
      index: true,
    },
    conversionType: {
      type: String,
      enum: [
        'appointment_booked',
        'account_created',
        'form_submitted',
        'call_made',
        'not_converted',
      ],
      default: 'not_converted',
    },
    firstAppointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
    },
    firstAppointmentDate: {
      type: Date,
    },

    // Revenue attribution
    lifetimeValue: {
      type: Number,
      default: 0,
    },
    firstYearRevenue: {
      type: Number,
      default: 0,
    },

    // Touchpoints journey
    touchPoints: [touchPointSchema],

    // Attribution summary
    firstTouchChannel: {
      type: String,
      index: true,
    },
    lastTouchChannel: {
      type: String,
      index: true,
    },

    // Channel counts
    channelCounts: {
      type: Map,
      of: Number,
      default: {},
    },

    // Path analysis
    conversionPath: {
      type: String, // e.g., "organic_search > email > paid_search"
    },
    pathLength: {
      type: Number, // Number of touchpoints
      index: true,
    },

    // Campaign tracking
    campaigns: [String], // List of all campaigns involved
    primaryCampaign: String,

    // Time analysis
    timeToConversion: {
      firstTouch: Number, // Hours from first touch to conversion
      lastTouch: Number, // Hours from last touch to conversion
    },

    // UTM parameters (initial)
    utmParams: {
      source: String,
      medium: String,
      campaign: String,
      term: String,
      content: String,
    },

    // Referral information
    referralSource: {
      type: String,
      enum: ['patient', 'provider', 'insurance', 'corporate', 'none', 'other'],
      default: 'none',
    },
    referringPatient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
    },
    referringProvider: String,

    // Quality scores
    engagementScore: {
      type: Number, // 0-100
      default: 0,
    },
    intentScore: {
      type: Number, // 0-100 (likelihood to convert based on behavior)
      default: 0,
    },

    // Tracking metadata
    trackingId: {
      type: String,
      unique: true,
      sparse: true,
    },
    sessionIds: [String], // All session IDs in journey

    notes: String,
  },
  {
    timestamps: true,
  }
);

// ==================== INDEXES ====================

patientAttributionSchema.index({ journeyStartDate: -1 });
patientAttributionSchema.index({ conversionDate: -1 });
patientAttributionSchema.index({ firstTouchChannel: 1, converted: 1 });
patientAttributionSchema.index({ lastTouchChannel: 1, converted: 1 });
patientAttributionSchema.index({ 'touchPoints.channel': 1 });
patientAttributionSchema.index({ 'touchPoints.campaign': 1 });
patientAttributionSchema.index({ pathLength: 1 });
patientAttributionSchema.index({ lifetimeValue: -1 });

// ==================== METHODS ====================

/**
 * Add a touchpoint to the journey
 */
patientAttributionSchema.methods.addTouchPoint = function (touchPointData) {
  // Create touchpoint
  const touchPoint = {
    timestamp: touchPointData.timestamp || new Date(),
    channel: touchPointData.channel,
    medium: touchPointData.medium,
    source: touchPointData.source,
    campaign: touchPointData.campaign,
    content: touchPointData.content,
    keyword: touchPointData.keyword,
    landingPage: touchPointData.landingPage,
    referrerUrl: touchPointData.referrerUrl,
    pageViews: touchPointData.pageViews || 1,
    sessionDuration: touchPointData.sessionDuration,
    device: touchPointData.device,
    browser: touchPointData.browser,
    os: touchPointData.os,
    location: touchPointData.location,
    interactions: touchPointData.interactions || 0,
  };

  this.touchPoints.push(touchPoint);

  // Update channel counts
  const channelCount = this.channelCounts.get(touchPoint.channel) || 0;
  this.channelCounts.set(touchPoint.channel, channelCount + 1);

  // Update first/last touch channels
  if (this.touchPoints.length === 1) {
    this.firstTouchChannel = touchPoint.channel;
    this.journeyStartDate = touchPoint.timestamp;
  }
  this.lastTouchChannel = touchPoint.channel;

  // Update campaigns
  if (touchPoint.campaign && !this.campaigns.includes(touchPoint.campaign)) {
    this.campaigns.push(touchPoint.campaign);
    if (!this.primaryCampaign) {
      this.primaryCampaign = touchPoint.campaign;
    }
  }

  // Recalculate attribution
  this.calculateAttribution();

  return this.save();
};

/**
 * Mark as converted
 */
patientAttributionSchema.methods.markConverted = function (conversionData) {
  this.converted = true;
  this.conversionDate = conversionData.conversionDate || new Date();
  this.conversionType = conversionData.conversionType || 'appointment_booked';
  this.firstAppointment = conversionData.appointmentId;
  this.firstAppointmentDate = conversionData.appointmentDate;

  // Calculate journey duration
  if (this.journeyStartDate) {
    this.journeyDuration = Math.floor(
      (this.conversionDate - this.journeyStartDate) / (1000 * 60 * 60 * 24)
    );
  }

  // Calculate time to conversion
  if (this.touchPoints.length > 0) {
    const firstTouch = this.touchPoints[0].timestamp;
    const lastTouch = this.touchPoints[this.touchPoints.length - 1].timestamp;

    this.timeToConversion = {
      firstTouch: (this.conversionDate - firstTouch) / (1000 * 60 * 60),
      lastTouch: (this.conversionDate - lastTouch) / (1000 * 60 * 60),
    };
  }

  // Recalculate attribution with conversion
  this.calculateAttribution();

  return this.save();
};

/**
 * Calculate attribution credits across all models
 */
patientAttributionSchema.methods.calculateAttribution = function () {
  if (this.touchPoints.length === 0) return;

  const touchPointCount = this.touchPoints.length;
  this.pathLength = touchPointCount;

  // Build conversion path string
  this.conversionPath = this.touchPoints.map((tp) => tp.channel).join(' > ');

  // 1. FIRST TOUCH: 100% credit to first touchpoint
  this.touchPoints[0].credits.firstTouch = 1.0;
  for (let i = 1; i < touchPointCount; i += 1) {
    this.touchPoints[i].credits.firstTouch = 0;
  }

  // 2. LAST TOUCH: 100% credit to last touchpoint
  for (let i = 0; i < touchPointCount - 1; i += 1) {
    this.touchPoints[i].credits.lastTouch = 0;
  }
  this.touchPoints[touchPointCount - 1].credits.lastTouch = 1.0;

  // 3. LINEAR: Equal credit to all touchpoints
  const linearCredit = 1.0 / touchPointCount;
  this.touchPoints.forEach((tp) => {
    tp.credits.linear = linearCredit;
  });

  // 4. TIME DECAY: More recent touchpoints get more credit
  // Using exponential decay with half-life of 7 days
  const halfLifeDays = 7;
  let totalWeight = 0;

  if (this.conversionDate) {
    // Calculate weights
    const weights = this.touchPoints.map((tp) => {
      const daysAgo = (this.conversionDate - tp.timestamp) / (1000 * 60 * 60 * 24);
      return 0.5 ** (daysAgo / halfLifeDays);
    });

    totalWeight = weights.reduce((sum, w) => sum + w, 0);

    // Normalize weights to sum to 1.0
    this.touchPoints.forEach((tp, i) => {
      tp.credits.timeDecay = weights[i] / totalWeight;
    });
  } else {
    // If not converted, use linear as fallback
    this.touchPoints.forEach((tp) => {
      tp.credits.timeDecay = linearCredit;
    });
  }

  // 5. POSITION-BASED (U-SHAPED): 40% first, 40% last, 20% middle
  if (touchPointCount === 1) {
    this.touchPoints[0].credits.positionBased = 1.0;
  } else if (touchPointCount === 2) {
    this.touchPoints[0].credits.positionBased = 0.5;
    this.touchPoints[1].credits.positionBased = 0.5;
  } else {
    this.touchPoints[0].credits.positionBased = 0.4;
    this.touchPoints[touchPointCount - 1].credits.positionBased = 0.4;
    const middleCredit = 0.2 / (touchPointCount - 2);
    for (let i = 1; i < touchPointCount - 1; i += 1) {
      this.touchPoints[i].credits.positionBased = middleCredit;
    }
  }

  // 6. CUSTOM: Business-specific weighting
  // Weight by channel value (can be customized)
  const channelWeights = {
    paid_search: 1.5,
    paid_social: 1.3,
    referral: 1.8,
    organic_search: 1.0,
    email: 0.8,
    direct: 0.5,
    social_organic: 0.7,
    review_sites: 1.2,
    marketplace: 1.4,
  };

  const customWeights = this.touchPoints.map((tp) => channelWeights[tp.channel] || 1.0);
  const totalCustomWeight = customWeights.reduce((sum, w) => sum + w, 0);

  this.touchPoints.forEach((tp, i) => {
    tp.credits.custom = customWeights[i] / totalCustomWeight;
  });

  // Calculate engagement score
  this.calculateEngagementScore();
};

/**
 * Calculate engagement score based on journey behavior
 */
patientAttributionSchema.methods.calculateEngagementScore = function () {
  let score = 0;

  // More touchpoints = higher engagement (max 30 points)
  score += Math.min(this.touchPoints.length * 5, 30);

  // Total page views (max 20 points)
  const totalPageViews = this.touchPoints.reduce((sum, tp) => sum + (tp.pageViews || 0), 0);
  score += Math.min(totalPageViews * 2, 20);

  // Total interactions (max 25 points)
  const totalInteractions = this.touchPoints.reduce((sum, tp) => sum + (tp.interactions || 0), 0);
  score += Math.min(totalInteractions * 5, 25);

  // Conversion bonus (25 points)
  if (this.converted) {
    score += 25;
  }

  this.engagementScore = Math.min(score, 100);
};

/**
 * Update revenue metrics
 */
patientAttributionSchema.methods.updateRevenue = function (ltv, firstYearRev) {
  this.lifetimeValue = ltv || 0;
  this.firstYearRevenue = firstYearRev || 0;
  return this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Create or update attribution for a patient
 */
patientAttributionSchema.statics.trackTouchPoint = async function (patientId, touchPointData) {
  let attribution = await this.findOne({ patient: patientId });

  if (!attribution) {
    // Create new attribution record
    attribution = new this({
      patient: patientId,
      journeyStartDate: touchPointData.timestamp || new Date(),
      touchPoints: [],
      channelCounts: new Map(),
      campaigns: [],
    });
  }

  await attribution.addTouchPoint(touchPointData);
  return attribution;
};

/**
 * Get attribution report for a date range
 */
patientAttributionSchema.statics.getAttributionReport = async function (
  startDate,
  endDate,
  attributionModel = 'lastTouch'
) {
  const attributions = await this.find({
    converted: true,
    conversionDate: { $gte: startDate, $lte: endDate },
  });

  // Aggregate by channel
  const channelReport = {};

  attributions.forEach((attr) => {
    attr.touchPoints.forEach((tp) => {
      const { channel } = tp;
      const credit = tp.credits[attributionModel] || 0;

      if (!channelReport[channel]) {
        channelReport[channel] = {
          conversions: 0,
          attributedConversions: 0,
          revenue: 0,
          touchPoints: 0,
          avgPathLength: 0,
        };
      }

      channelReport[channel].attributedConversions += credit;
      channelReport[channel].revenue += (attr.lifetimeValue || 0) * credit;
      channelReport[channel].touchPoints += 1;
    });

    // Count full conversion for first/last touch
    if (attributionModel === 'firstTouch') {
      channelReport[attr.firstTouchChannel].conversions += 1;
    } else if (attributionModel === 'lastTouch') {
      channelReport[attr.lastTouchChannel].conversions += 1;
    }
  });

  return {
    totalConversions: attributions.length,
    totalRevenue: attributions.reduce((sum, a) => sum + (a.lifetimeValue || 0), 0),
    channelPerformance: channelReport,
    avgJourneyLength: attributions.reduce((sum, a) => sum + a.pathLength, 0) / attributions.length,
    avgJourneyDuration:
      attributions.reduce((sum, a) => sum + (a.journeyDuration || 0), 0) / attributions.length,
  };
};

/**
 * Get conversion funnel metrics
 */
patientAttributionSchema.statics.getConversionFunnel = async function (startDate, endDate) {
  const totalJourneys = await this.countDocuments({
    journeyStartDate: { $gte: startDate, $lte: endDate },
  });

  const converted = await this.countDocuments({
    journeyStartDate: { $gte: startDate, $lte: endDate },
    converted: true,
  });

  const withMultipleTouchPoints = await this.countDocuments({
    journeyStartDate: { $gte: startDate, $lte: endDate },
    pathLength: { $gte: 2 },
  });

  const avgTimeToConvert = await this.aggregate([
    {
      $match: {
        journeyStartDate: { $gte: startDate, $lte: endDate },
        converted: true,
      },
    },
    {
      $group: {
        _id: null,
        avgDays: { $avg: '$journeyDuration' },
        avgHoursFromFirst: { $avg: '$timeToConversion.firstTouch' },
        avgHoursFromLast: { $avg: '$timeToConversion.lastTouch' },
      },
    },
  ]);

  return {
    totalJourneys,
    converted,
    conversionRate: totalJourneys > 0 ? (converted / totalJourneys) * 100 : 0,
    multiTouchRate: totalJourneys > 0 ? (withMultipleTouchPoints / totalJourneys) * 100 : 0,
    avgTimeToConvert: avgTimeToConvert.length > 0 ? avgTimeToConvert[0] : null,
  };
};

/**
 * Get top conversion paths
 */
patientAttributionSchema.statics.getTopConversionPaths = async function (
  startDate,
  endDate,
  limit = 10
) {
  const paths = await this.aggregate([
    {
      $match: {
        converted: true,
        conversionDate: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$conversionPath',
        count: { $sum: 1 },
        avgRevenue: { $avg: '$lifetimeValue' },
        avgDuration: { $avg: '$journeyDuration' },
      },
    },
    {
      $sort: { count: -1 },
    },
    {
      $limit: limit,
    },
  ]);

  return paths;
};

/**
 * Compare attribution models
 */
patientAttributionSchema.statics.compareAttributionModels = async function (startDate, endDate) {
  const models = ['firstTouch', 'lastTouch', 'linear', 'timeDecay', 'positionBased', 'custom'];
  const comparison = {};

  for (const model of models) {
    comparison[model] = await this.getAttributionReport(startDate, endDate, model);
  }

  return comparison;
};

module.exports = mongoose.model('PatientAttribution', patientAttributionSchema);
