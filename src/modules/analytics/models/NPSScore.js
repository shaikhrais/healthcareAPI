const mongoose = require('mongoose');

/**
 * NPS Score Model
 *
 * Dedicated Net Promoter Score tracking
 * Features:
 * - Individual NPS responses
 * - Automated categorization (Promoter/Passive/Detractor)
 * - Follow-up tracking
 * - Trend analysis
 * - Touchpoint tracking
 */

// eslint-disable-next-line no-unused-vars

const npsScoreSchema = new mongoose.Schema(
  {
    // Core NPS Data
    score: {
      type: Number,
      required: [true, 'NPS score is required'],
      min: [0, 'Score must be between 0 and 10'],
      max: [10, 'Score must be between 0 and 10'],
    },
    category: {
      type: String,
      enum: ['promoter', 'passive', 'detractor'],
      required: true,
    },

    // Question
    question: {
      type: String,
      default: 'How likely are you to recommend our practice to a friend or family member?',
    },

    // Patient Reference
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
    },
    patientEmail: String,
    patientName: String,

    // Context
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
    },
    practitionerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    serviceType: String,
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
    },

    // Feedback
    feedback: {
      reason: String, // Why they gave this score
      improvementSuggestions: String,
      positiveComments: String,
    },

    // Sentiment Analysis
    sentiment: {
      overall: {
        type: String,
        enum: ['positive', 'neutral', 'negative', 'mixed'],
      },
      confidence: Number,
      keyPhrases: [String],
    },

    // Source Tracking
    source: {
      type: String,
      enum: ['email', 'sms', 'in_app', 'kiosk', 'phone', 'manual'],
      default: 'email',
    },
    surveyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PatientSurvey',
    },
    campaignId: String,

    // Timing
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    daysSinceAppointment: Number,

    // Response Metadata
    device: {
      type: String,
      enum: ['mobile', 'tablet', 'desktop', 'unknown'],
    },
    ipAddress: String,
    userAgent: String,

    // Follow-up Actions
    followup: {
      required: {
        type: Boolean,
        default: false,
      },
      reason: String,
      assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      assignedAt: Date,
      completedAt: Date,
      notes: String,
      outcome: {
        type: String,
        enum: ['resolved', 'escalated', 'no_action_needed'],
      },
    },

    // Tags and Flags
    tags: [String],
    flagged: {
      type: Boolean,
      default: false,
    },
    flagReason: String,

    // Response to Feedback
    responseToPatient: {
      sent: {
        type: Boolean,
        default: false,
      },
      sentAt: Date,
      sentBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      message: String,
    },

    // Metadata
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    anonymous: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// ==================== INDEXES ====================

npsScoreSchema.index({ category: 1, submittedAt: -1 });
npsScoreSchema.index({ patientId: 1, submittedAt: -1 });
npsScoreSchema.index({ practitionerId: 1, submittedAt: -1 });
npsScoreSchema.index({ organization: 1, submittedAt: -1 });
npsScoreSchema.index({ 'followup.required': 1, 'followup.completedAt': 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// npsScoreSchema.index({ flagged: 1 });

// ==================== VIRTUAL FIELDS ====================

npsScoreSchema.virtual('isPromoter').get(function () {
  return this.score >= 9;
});

npsScoreSchema.virtual('isPassive').get(function () {
  return this.score >= 7 && this.score <= 8;
});

npsScoreSchema.virtual('isDetractor').get(function () {
  return this.score <= 6;
});

// ==================== INSTANCE METHODS ====================

/**
 * Categorize score
 */
npsScoreSchema.methods.categorize = function () {
  if (this.score >= 9) {
    this.category = 'promoter';
  } else if (this.score >= 7) {
    this.category = 'passive';
  } else {
    this.category = 'detractor';
  }
  return this.category;
};

/**
 * Analyze feedback sentiment
 */
npsScoreSchema.methods.analyzeSentiment = function () {
  const feedbackText = [
    this.feedback?.reason,
    this.feedback?.improvementSuggestions,
    this.feedback?.positiveComments,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (!feedbackText) {
    this.sentiment.overall = 'neutral';
    return;
  }

  // Simple sentiment analysis
  const positiveWords = [
    'great',
    'excellent',
    'amazing',
    'wonderful',
    'love',
    'best',
    'fantastic',
    'outstanding',
    'professional',
    'caring',
  ];
  const negativeWords = [
    'bad',
    'terrible',
    'awful',
    'poor',
    'disappointing',
    'worst',
    'unprofessional',
    'rude',
    'wait',
    'long',
  ];

  let positiveCount = 0;
  let negativeCount = 0;

  positiveWords.forEach((word) => {
    if (feedbackText.includes(word)) positiveCount += 1;
  });

  negativeWords.forEach((word) => {
    if (feedbackText.includes(word)) negativeCount += 1;
  });

  if (positiveCount > negativeCount * 2) {
    this.sentiment.overall = 'positive';
    this.sentiment.confidence = 0.7;
  } else if (negativeCount > positiveCount * 2) {
    this.sentiment.overall = 'negative';
    this.sentiment.confidence = 0.7;
  } else if (positiveCount > 0 && negativeCount > 0) {
    this.sentiment.overall = 'mixed';
    this.sentiment.confidence = 0.6;
  } else {
    this.sentiment.overall = 'neutral';
    this.sentiment.confidence = 0.5;
  }
};

/**
 * Check if follow-up is needed
 */
npsScoreSchema.methods.checkFollowupNeeded = function () {
  // Detractors always need follow-up
  if (this.category === 'detractor') {
    this.followup.required = true;
    this.followup.reason = 'Detractor score requires immediate attention';
    this.flagged = true;
    this.flagReason = 'Low NPS score (detractor)';
  }

  // Promoters with negative sentiment need follow-up
  if (this.category === 'promoter' && this.sentiment.overall === 'negative') {
    this.followup.required = true;
    this.followup.reason = 'High score but negative feedback detected';
    this.flagged = true;
    this.flagReason = 'Conflicting score and sentiment';
  }
};

/**
 * Assign follow-up
 */
npsScoreSchema.methods.assignFollowup = async function (userId, notes) {
  this.followup.required = true;
  this.followup.assignedTo = userId;
  this.followup.assignedAt = new Date();
  if (notes) this.followup.notes = notes;
  return this.save();
};

/**
 * Complete follow-up
 */
npsScoreSchema.methods.completeFollowup = async function (outcome, notes) {
  this.followup.completedAt = new Date();
  this.followup.outcome = outcome;
  if (notes) this.followup.notes = notes;
  return this.save();
};

/**
 * Send response to patient
 */
npsScoreSchema.methods.sendResponse = async function (userId, message) {
  this.responseToPatient.sent = true;
  this.responseToPatient.sentAt = new Date();
  this.responseToPatient.sentBy = userId;
  this.responseToPatient.message = message;
  return this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Calculate NPS for date range
 */
npsScoreSchema.statics.calculateNPS = async function (filters = {}, dateRange = {}) {
  const query = this.buildQuery(filters, dateRange);

  const scores = await this.find(query);

  const promoters = scores.filter((s) => s.category === 'promoter').length;
  const passives = scores.filter((s) => s.category === 'passive').length;
  const detractors = scores.filter((s) => s.category === 'detractor').length;
  const total = scores.length;

  const npsScore = total > 0 ? ((promoters - detractors) / total) * 100 : 0;

  return {
    npsScore: Math.round(npsScore),
    promoters,
    passives,
    detractors,
    total,
    promoterPercentage: total > 0 ? ((promoters / total) * 100).toFixed(1) : 0,
    passivePercentage: total > 0 ? ((passives / total) * 100).toFixed(1) : 0,
    detractorPercentage: total > 0 ? ((detractors / total) * 100).toFixed(1) : 0,
  };
};

/**
 * Get NPS trend over time
 */
npsScoreSchema.statics.getTrend = async function (filters = {}, dateRange = {}, interval = 'week') {
  const query = this.buildQuery(filters, dateRange);

  const scores = await this.find(query).sort({ submittedAt: 1 });

  const grouped = {};

  scores.forEach((score) => {
    let key;
    const date = new Date(score.submittedAt);

    if (interval === 'day') {
      key = date.toISOString().split('T')[0];
    } else if (interval === 'week') {
      const weekStart = this.getWeekStart(date);
      key = weekStart.toISOString().split('T')[0];
    } else if (interval === 'month') {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    if (!grouped[key]) {
      grouped[key] = { promoters: 0, passives: 0, detractors: 0, total: 0 };
    }

    grouped[key][score.category + 's']++;
    grouped[key].total += 1;
  });

  return Object.entries(grouped).map(([period, data]) => ({
    period,
    npsScore:
      data.total > 0 ? Math.round(((data.promoters - data.detractors) / data.total) * 100) : 0,
    promoters: data.promoters,
    passives: data.passives,
    detractors: data.detractors,
    total: data.total,
  }));
};

/**
 * Get scores needing follow-up
 */
npsScoreSchema.statics.getNeedingFollowup = async function (organizationId) {
  return this.find({
    organization: organizationId,
    'followup.required': true,
    'followup.completedAt': null,
  })
    .populate('patientId', 'firstName lastName email phone')
    .populate('practitionerId', 'firstName lastName')
    .populate('followup.assignedTo', 'firstName lastName')
    .sort({ submittedAt: -1 });
};

/**
 * Get detractors
 */
npsScoreSchema.statics.getDetractors = async function (filters = {}, dateRange = {}) {
  const query = {
    ...this.buildQuery(filters, dateRange),
    category: 'detractor',
  };

  return this.find(query)
    .populate('patientId', 'firstName lastName email phone')
    .populate('practitionerId', 'firstName lastName')
    .sort({ submittedAt: -1 })
    .limit(50);
};

/**
 * Get promoters
 */
npsScoreSchema.statics.getPromoters = async function (filters = {}, dateRange = {}) {
  const query = {
    ...this.buildQuery(filters, dateRange),
    category: 'promoter',
  };

  return this.find(query)
    .populate('patientId', 'firstName lastName email phone')
    .populate('practitionerId', 'firstName lastName')
    .sort({ submittedAt: -1 })
    .limit(50);
};

/**
 * Get breakdown by dimension
 */
npsScoreSchema.statics.getBreakdown = async function (dimension, filters = {}, dateRange = {}) {
  const query = this.buildQuery(filters, dateRange);

  const pipeline = [
    { $match: query },
    {
      $group: {
        _id: `$${dimension}`,
        promoters: {
          $sum: { $cond: [{ $eq: ['$category', 'promoter'] }, 1, 0] },
        },
        passives: {
          $sum: { $cond: [{ $eq: ['$category', 'passive'] }, 1, 0] },
        },
        detractors: {
          $sum: { $cond: [{ $eq: ['$category', 'detractor'] }, 1, 0] },
        },
        total: { $sum: 1 },
        avgScore: { $avg: '$score' },
      },
    },
    {
      $addFields: {
        npsScore: {
          $multiply: [
            {
              $divide: [{ $subtract: ['$promoters', '$detractors'] }, '$total'],
            },
            100,
          ],
        },
      },
    },
    { $sort: { npsScore: -1 } },
  ];

  if (dimension === 'practitionerId') {
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'practitioner',
      },
    });
  }

  return this.aggregate(pipeline);
};

/**
 * Build query from filters
 */
npsScoreSchema.statics.buildQuery = function (filters = {}, dateRange = {}) {
  const query = {};

  if (filters.organization) query.organization = filters.organization;
  if (filters.practitionerId) query.practitionerId = filters.practitionerId;
  if (filters.serviceType) query.serviceType = filters.serviceType;
  if (filters.locationId) query.locationId = filters.locationId;
  if (filters.category) query.category = filters.category;

  if (dateRange.startDate || dateRange.endDate) {
    query.submittedAt = {};
    if (dateRange.startDate) query.submittedAt.$gte = dateRange.startDate;
    if (dateRange.endDate) query.submittedAt.$lte = dateRange.endDate;
  }

  return query;
};

/**
 * Get week start date
 */
npsScoreSchema.statics.getWeekStart = function (date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
};

// ==================== PRE-SAVE HOOK ====================

npsScoreSchema.pre('save', function (next) {
  // Categorize score
  if (this.isModified('score')) {
    this.categorize();
  }

  // Analyze sentiment if feedback changed
  if (this.isModified('feedback')) {
    this.analyzeSentiment();
  }

  // Check if follow-up needed
  if (this.isNew || this.isModified('score') || this.isModified('sentiment')) {
    this.checkFollowupNeeded();
  }

  next();
});

module.exports = mongoose.model('NPSScore', npsScoreSchema);
