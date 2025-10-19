const mongoose = require('mongoose');

/**
 * Online Review Model
 *
 * Monitors and tracks online reviews from multiple platforms
 * Features:
 * - Multi-platform support (Google, Yelp, Facebook, Healthgrades)
 * - Review sentiment analysis
 * - Response tracking
 * - Alert system
 */

// eslint-disable-next-line no-unused-vars

const onlineReviewSchema = new mongoose.Schema(
  {
    // Platform Information
    platform: {
      type: String,
      required: [true, 'Platform is required'],
      enum: ['google', 'yelp', 'facebook', 'healthgrades', 'zocdoc', 'vitals', 'ratemds', 'other'],
    },
    platformReviewId: {
      type: String,
      required: true,
    },
    platformUrl: String,

    // Review Content
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: 0,
      max: 5, // Normalized to 5-star scale
    },
    title: String,
    reviewText: {
      type: String,
      required: true,
    },

    // Reviewer Information
    reviewer: {
      name: String,
      profileUrl: String,
      verified: Boolean,
      totalReviews: Number,
      avatarUrl: String,
    },

    // Patient Matching (if identified)
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
    },
    matchConfidence: {
      type: Number, // 0-100
      min: 0,
      max: 100,
    },

    // Dates
    publishedAt: {
      type: Date,
      required: true,
    },
    updatedAt: Date,
    discoveredAt: {
      type: Date,
      default: Date.now,
    },

    // Sentiment Analysis
    sentiment: {
      overall: {
        type: String,
        enum: ['very_positive', 'positive', 'neutral', 'negative', 'very_negative'],
      },
      score: Number, // -1 to 1
      confidence: Number, // 0-100
      emotions: [
        {
          emotion: String,
          score: Number,
        },
      ],
      keyPhrases: [String],
      topics: [
        {
          topic: String,
          sentiment: String,
          mentions: Number,
        },
      ],
    },

    // Review Classification
    categories: [
      {
        type: String,
        enum: [
          'staff',
          'facility',
          'treatment',
          'wait_time',
          'cost',
          'scheduling',
          'communication',
          'results',
          'cleanliness',
          'parking',
        ],
      },
    ],

    // Response Management
    response: {
      posted: {
        type: Boolean,
        default: false,
      },
      postedAt: Date,
      postedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      responseText: String,
      platformResponseId: String,
      status: {
        type: String,
        enum: ['draft', 'pending_approval', 'approved', 'posted', 'failed'],
        default: 'draft',
      },
    },

    // Internal Management
    status: {
      type: String,
      enum: ['new', 'reviewed', 'responded', 'escalated', 'archived'],
      default: 'new',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Flags and Tags
    flagged: {
      type: Boolean,
      default: false,
    },
    flagReason: String,
    tags: [String],

    // Notes and Internal Comments
    internalNotes: [
      {
        note: String,
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

    // Alert Settings
    alertSent: {
      type: Boolean,
      default: false,
    },
    alertSentAt: Date,
    alertRecipients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // Verification
    verified: {
      type: Boolean,
      default: false,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: Date,

    // Location
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
    },
    practitionerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Metadata
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    source: {
      type: String,
      enum: ['api', 'scraping', 'manual', 'email_notification'],
      default: 'api',
    },
  },
  {
    timestamps: true,
  }
);

// ==================== INDEXES ====================

onlineReviewSchema.index({ platform: 1, platformReviewId: 1 }, { unique: true });
onlineReviewSchema.index({ organization: 1, publishedAt: -1 });
onlineReviewSchema.index({ rating: 1, publishedAt: -1 });
onlineReviewSchema.index({ status: 1, priority: -1 });
onlineReviewSchema.index({ 'sentiment.overall': 1 });
onlineReviewSchema.index({ flagged: 1, status: 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// onlineReviewSchema.index({ patientId: 1 });
onlineReviewSchema.index({ practitionerId: 1 });

// ==================== VIRTUAL FIELDS ====================

onlineReviewSchema.virtual('isPositive').get(function () {
  return this.rating >= 4;
});

onlineReviewSchema.virtual('isNegative').get(function () {
  return this.rating <= 2;
});

onlineReviewSchema.virtual('needsResponse').get(function () {
  return !this.response.posted && (this.rating <= 3 || this.flagged);
});

onlineReviewSchema.virtual('responseTime').get(function () {
  if (this.response.posted && this.response.postedAt) {
    return Math.floor((this.response.postedAt - this.publishedAt) / (1000 * 60 * 60)); // hours
  }
  return null;
});

// ==================== INSTANCE METHODS ====================

/**
 * Analyze sentiment
 */
onlineReviewSchema.methods.analyzeSentiment = function () {
  const text = (this.reviewText || '').toLowerCase();

  // Simple keyword-based sentiment analysis
  const veryPositiveWords = [
    'amazing',
    'excellent',
    'outstanding',
    'exceptional',
    'fantastic',
    'perfect',
    'wonderful',
  ];
  const positiveWords = [
    'good',
    'great',
    'helpful',
    'professional',
    'friendly',
    'caring',
    'clean',
    'recommend',
  ];
  const negativeWords = [
    'bad',
    'poor',
    'terrible',
    'awful',
    'rude',
    'unprofessional',
    'dirty',
    'wait',
    'disappointing',
  ];
  const veryNegativeWords = ['worst', 'horrible', 'disgrace', 'nightmare', 'never', 'avoid'];

  let veryPositiveCount = 0;
  let positiveCount = 0;
  let negativeCount = 0;
  let veryNegativeCount = 0;

  veryPositiveWords.forEach((word) => {
    if (text.includes(word)) veryPositiveCount += 1;
  });
  positiveWords.forEach((word) => {
    if (text.includes(word)) positiveCount += 1;
  });
  negativeWords.forEach((word) => {
    if (text.includes(word)) negativeCount += 1;
  });
  veryNegativeWords.forEach((word) => {
    if (text.includes(word)) veryNegativeCount += 1;
  });

  const totalPositive = veryPositiveCount * 2 + positiveCount;
  const totalNegative = veryNegativeCount * 2 + negativeCount;

  // Determine sentiment
  if (this.rating >= 4.5 || totalPositive > totalNegative * 2) {
    this.sentiment.overall = 'very_positive';
    this.sentiment.score = 0.8;
  } else if (this.rating >= 3.5 || totalPositive > totalNegative) {
    this.sentiment.overall = 'positive';
    this.sentiment.score = 0.5;
  } else if (this.rating >= 2.5 && totalPositive === totalNegative) {
    this.sentiment.overall = 'neutral';
    this.sentiment.score = 0;
  } else if (this.rating <= 2 || totalNegative > totalPositive * 2) {
    this.sentiment.overall = 'very_negative';
    this.sentiment.score = -0.8;
  } else {
    this.sentiment.overall = 'negative';
    this.sentiment.score = -0.5;
  }

  this.sentiment.confidence = 75;

  // Extract topics
  this.extractTopics();
};

/**
 * Extract topics from review
 */
onlineReviewSchema.methods.extractTopics = function () {
  const text = (this.reviewText || '').toLowerCase();

  const topicKeywords = {
    staff: [
      'staff',
      'receptionist',
      'nurse',
      'doctor',
      'practitioner',
      'therapist',
      'team',
      'people',
    ],
    facility: ['office', 'clinic', 'facility', 'building', 'room', 'equipment'],
    treatment: ['treatment', 'therapy', 'care', 'procedure', 'session'],
    wait_time: ['wait', 'waiting', 'late', 'delay', 'on time', 'punctual'],
    cost: ['cost', 'price', 'expensive', 'affordable', 'insurance', 'billing'],
    scheduling: ['appointment', 'schedule', 'booking', 'availability'],
    communication: ['communication', 'explain', 'listen', 'understand', 'answer'],
    results: ['results', 'improvement', 'better', 'worse', 'effective', 'helped'],
    cleanliness: ['clean', 'dirty', 'sanitized', 'hygiene'],
    parking: ['parking', 'park', 'location', 'access'],
  };

  this.sentiment.topics = [];
  this.categories = [];

  Object.entries(topicKeywords).forEach(([topic, keywords]) => {
    let mentions = 0;
    keywords.forEach((keyword) => {
      if (text.includes(keyword)) mentions += 1;
    });

    if (mentions > 0) {
      this.sentiment.topics.push({
        topic,
        sentiment: this.sentiment.overall,
        mentions,
      });
      this.categories.push(topic);
    }
  });
};

/**
 * Calculate priority
 */
onlineReviewSchema.methods.calculatePriority = function () {
  if (this.rating <= 2) {
    this.priority = 'critical';
    this.flagged = true;
    this.flagReason = 'Very low rating (1-2 stars)';
  } else if (this.rating === 3) {
    this.priority = 'high';
  } else if (this.rating === 4) {
    this.priority = 'medium';
  } else {
    this.priority = 'low';
  }

  // Escalate if negative sentiment
  if (this.sentiment.overall === 'very_negative') {
    this.priority = 'critical';
    this.flagged = true;
  }
};

/**
 * Post response
 */
onlineReviewSchema.methods.postResponse = async function (userId, responseText) {
  this.response.posted = true;
  this.response.postedAt = new Date();
  this.response.postedBy = userId;
  this.response.responseText = responseText;
  this.response.status = 'posted';
  this.status = 'responded';
  return this.save();
};

/**
 * Assign for review
 */
onlineReviewSchema.methods.assign = async function (userId) {
  this.assignedTo = userId;
  this.status = 'reviewed';
  return this.save();
};

/**
 * Add internal note
 */
onlineReviewSchema.methods.addNote = async function (userId, noteText) {
  this.internalNotes.push({
    note: noteText,
    createdBy: userId,
    createdAt: new Date(),
  });
  return this.save();
};

/**
 * Send alert
 */
onlineReviewSchema.methods.sendAlert = async function (recipients) {
  this.alertSent = true;
  this.alertSentAt = new Date();
  this.alertRecipients = recipients;
  return this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Get review statistics
 */
onlineReviewSchema.statics.getStats = async function (organizationId, dateRange = {}) {
  const query = { organization: organizationId };

  if (dateRange.startDate) {
    query.publishedAt = { $gte: dateRange.startDate };
  }
  if (dateRange.endDate) {
    query.publishedAt = { ...query.publishedAt, $lte: dateRange.endDate };
  }

  const reviews = await this.find(query);

  const totalReviews = reviews.length;
  const avgRating =
    totalReviews > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews : 0;

  const byRating = {
    5: reviews.filter((r) => r.rating === 5).length,
    4: reviews.filter((r) => r.rating === 4).length,
    3: reviews.filter((r) => r.rating === 3).length,
    2: reviews.filter((r) => r.rating === 2).length,
    1: reviews.filter((r) => r.rating === 1).length,
  };

  const byPlatform = {};
  reviews.forEach((r) => {
    byPlatform[r.platform] = (byPlatform[r.platform] || 0) + 1;
  });

  const responseRate =
    totalReviews > 0 ? (reviews.filter((r) => r.response.posted).length / totalReviews) * 100 : 0;

  const avgResponseTime = reviews
    .filter((r) => r.responseTime !== null)
    .reduce((sum, r, _, arr) => sum + r.responseTime / arr.length, 0);

  return {
    totalReviews,
    avgRating: avgRating.toFixed(2),
    byRating,
    byPlatform,
    responseRate: responseRate.toFixed(1),
    avgResponseTime: Math.round(avgResponseTime),
    needingResponse: reviews.filter((r) => r.needsResponse).length,
    flagged: reviews.filter((r) => r.flagged).length,
  };
};

/**
 * Get reviews needing response
 */
onlineReviewSchema.statics.getNeedingResponse = async function (organizationId) {
  return this.find({
    organization: organizationId,
    'response.posted': false,
    $or: [{ rating: { $lte: 3 } }, { flagged: true }],
  })
    .populate('assignedTo', 'firstName lastName')
    .populate('patientId', 'firstName lastName email')
    .sort({ priority: -1, publishedAt: -1 })
    .limit(50);
};

/**
 * Get trend data
 */
onlineReviewSchema.statics.getTrend = async function (
  organizationId,
  dateRange = {},
  interval = 'week'
) {
  const query = { organization: organizationId };

  if (dateRange.startDate) {
    query.publishedAt = { $gte: dateRange.startDate };
  }
  if (dateRange.endDate) {
    query.publishedAt = { ...query.publishedAt, $lte: dateRange.endDate };
  }

  const reviews = await this.find(query).sort({ publishedAt: 1 });

  const grouped = {};

  reviews.forEach((review) => {
    let key;
    const date = new Date(review.publishedAt);

    if (interval === 'day') {
      key = date.toISOString().split('T')[0];
    } else if (interval === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split('T')[0];
    } else if (interval === 'month') {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    if (!grouped[key]) {
      grouped[key] = { count: 0, totalRating: 0, ratings: [] };
    }

    grouped[key].count += 1;
    grouped[key].totalRating += review.rating;
    grouped[key].ratings.push(review.rating);
  });

  return Object.entries(grouped).map(([period, data]) => ({
    period,
    count: data.count,
    avgRating: (data.totalRating / data.count).toFixed(2),
  }));
};

/**
 * Get reviews by platform
 */
onlineReviewSchema.statics.getByPlatform = async function (
  organizationId,
  platform,
  dateRange = {}
) {
  const query = {
    organization: organizationId,
    platform,
  };

  if (dateRange.startDate) {
    query.publishedAt = { $gte: dateRange.startDate };
  }
  if (dateRange.endDate) {
    query.publishedAt = { ...query.publishedAt, $lte: dateRange.endDate };
  }

  return this.find(query).sort({ publishedAt: -1 }).limit(50);
};

// ==================== PRE-SAVE HOOK ====================

onlineReviewSchema.pre('save', function (next) {
  // Analyze sentiment if review text changed
  if (this.isModified('reviewText') || this.isNew) {
    this.analyzeSentiment();
  }

  // Calculate priority
  if (this.isModified('rating') || this.isModified('sentiment') || this.isNew) {
    this.calculatePriority();
  }

  next();
});

module.exports = mongoose.model('OnlineReview', onlineReviewSchema);
