const mongoose = require('mongoose');

/**
 * Survey Response Model
 *
 * Stores patient survey responses
 * Features:
 * - Answer tracking for all question types
 * - Completion tracking
 * - Sentiment analysis
 * - Response validation
 */

// eslint-disable-next-line no-unused-vars

const surveyResponseSchema = new mongoose.Schema(
  {
    // Survey Reference
    surveyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PatientSurvey',
      required: true,
    },
    surveyVersion: {
      type: String,
      default: '1.0',
    },

    // Patient Reference
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
    },

    // Respondent Info (if not linked to patient)
    respondent: {
      name: String,
      email: String,
      phone: String,
    },

    // Answers
    answers: [
      {
        questionId: {
          type: String,
          required: true,
        },
        questionText: String, // Stored for historical purposes
        questionType: String,
        value: mongoose.Schema.Types.Mixed, // Can be number, string, array
        textResponse: String, // For text/comment questions
        answeredAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Completion Status
    status: {
      type: String,
      enum: ['invited', 'started', 'completed', 'abandoned'],
      default: 'invited',
    },
    startedAt: Date,
    completedAt: Date,
    completionTime: Number, // seconds

    // Distribution
    sentVia: {
      type: String,
      enum: ['email', 'sms', 'in_app', 'link'],
    },
    sentAt: Date,
    remindersCount: {
      type: Number,
      default: 0,
    },
    lastReminderAt: Date,

    // Response Metadata
    ipAddress: String,
    userAgent: String,
    device: {
      type: String,
      enum: ['mobile', 'tablet', 'desktop', 'unknown'],
    },
    location: {
      city: String,
      state: String,
      country: String,
    },

    // Calculated Scores
    scores: {
      overall: Number, // Average of all rating questions (0-100)
      nps: Number, // NPS score (0-10)
      categoryScores: [
        {
          category: String,
          score: Number,
        },
      ],
    },

    // Sentiment Analysis
    sentiment: {
      overall: {
        type: String,
        enum: ['positive', 'neutral', 'negative', 'mixed'],
      },
      confidence: Number,
      keyPhrases: [String],
      emotions: [
        {
          emotion: String,
          score: Number,
        },
      ],
    },

    // Flags and Tags
    flagged: {
      type: Boolean,
      default: false,
    },
    flagReason: String,
    tags: [String],

    // Follow-up
    requiresFollowup: {
      type: Boolean,
      default: false,
    },
    followupReason: String,
    followupAssignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    followupCompletedAt: Date,
    followupNotes: String,

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

surveyResponseSchema.index({ surveyId: 1, status: 1 });
surveyResponseSchema.index({ patientId: 1, completedAt: -1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// surveyResponseSchema.index({ appointmentId: 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// surveyResponseSchema.index({ organization: 1, status: 1 });
surveyResponseSchema.index({ completedAt: -1 });
surveyResponseSchema.index({ flagged: 1, requiresFollowup: 1 });
surveyResponseSchema.index({ 'scores.nps': 1 });

// ==================== INSTANCE METHODS ====================

/**
 * Mark response as started
 */
surveyResponseSchema.methods.markStarted = async function () {
  if (this.status === 'invited') {
    this.status = 'started';
    this.startedAt = new Date();
    return this.save();
  }
};

/**
 * Mark response as completed
 */
surveyResponseSchema.methods.markCompleted = async function () {
  this.status = 'completed';
  this.completedAt = new Date();

  if (this.startedAt) {
    this.completionTime = (this.completedAt - this.startedAt) / 1000; // seconds
  }

  await this.calculateScores();
  await this.analyzeSentiment();
  await this.checkForFlags();

  return this.save();
};

/**
 * Calculate scores from answers
 */
surveyResponseSchema.methods.calculateScores = async function () {
  const PatientSurvey = mongoose.model('PatientSurvey');
  const survey = await PatientSurvey.findById(this.surveyId);

  if (!survey) return;

  // Calculate overall score from rating questions
  const ratingQuestions = survey.getRatingQuestions();
  let totalScore = 0;
  let scoreCount = 0;

  ratingQuestions.forEach((question) => {
    const answer = this.answers.find((a) => a.questionId === question.questionId);
    if (answer && typeof answer.value === 'number') {
      // Normalize to 0-100 scale
      const normalized =
        ((answer.value - question.ratingScale.min) /
          (question.ratingScale.max - question.ratingScale.min)) *
        100;
      totalScore += normalized;
      scoreCount += 1;
    }
  });

  if (scoreCount > 0) {
    this.scores.overall = totalScore / scoreCount;
  }

  // Calculate NPS score
  const npsQuestion = survey.questions.find((q) => q.questionType === 'nps');
  if (npsQuestion) {
    const npsAnswer = this.answers.find((a) => a.questionId === npsQuestion.questionId);
    if (npsAnswer && typeof npsAnswer.value === 'number') {
      this.scores.nps = npsAnswer.value;
    }
  }

  // Calculate category scores
  const categories = [...new Set(survey.questions.map((q) => q.category))];
  this.scores.categoryScores = [];

  categories.forEach((category) => {
    const categoryQuestions = survey
      .getQuestionsByCategory(category)
      .filter((q) => q.questionType === 'rating' || q.questionType === 'nps');

    let catScore = 0;
    let catCount = 0;

    categoryQuestions.forEach((question) => {
      const answer = this.answers.find((a) => a.questionId === question.questionId);
      if (answer && typeof answer.value === 'number') {
        const normalized =
          ((answer.value - question.ratingScale.min) /
            (question.ratingScale.max - question.ratingScale.min)) *
          100;
        catScore += normalized;
        catCount += 1;
      }
    });

    if (catCount > 0) {
      this.scores.categoryScores.push({
        category,
        score: catScore / catCount,
      });
    }
  });
};

/**
 * Analyze sentiment from text responses
 */
surveyResponseSchema.methods.analyzeSentiment = async function () {
  // Get all text responses
  const textResponses = this.answers
    .filter((a) => a.questionType === 'text' && a.textResponse)
    .map((a) => a.textResponse)
    .join(' ');

  if (!textResponses) return;

  // Simple keyword-based sentiment analysis
  // In production, use AWS Comprehend, Google NLP, or similar
  const positiveWords = [
    'great',
    'excellent',
    'amazing',
    'wonderful',
    'fantastic',
    'love',
    'best',
    'perfect',
    'awesome',
    'outstanding',
  ];
  const negativeWords = [
    'bad',
    'terrible',
    'awful',
    'horrible',
    'worst',
    'hate',
    'poor',
    'disappointing',
    'unacceptable',
  ];

  const text = textResponses.toLowerCase();
  let positiveCount = 0;
  let negativeCount = 0;

  positiveWords.forEach((word) => {
    if (text.includes(word)) positiveCount += 1;
  });

  negativeWords.forEach((word) => {
    if (text.includes(word)) negativeCount += 1;
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
 * Check if response should be flagged
 */
surveyResponseSchema.methods.checkForFlags = async function () {
  // Flag very low scores
  if (this.scores.overall && this.scores.overall < 40) {
    this.flagged = true;
    this.flagReason = 'Low overall satisfaction score';
    this.requiresFollowup = true;
    this.followupReason = 'Patient expressed low satisfaction';
  }

  // Flag low NPS scores (detractors)
  if (this.scores.nps !== undefined && this.scores.nps <= 6) {
    this.flagged = true;
    this.flagReason = this.flagReason || 'Low NPS score (detractor)';
    this.requiresFollowup = true;
    this.followupReason = this.followupReason || 'Patient is a detractor';
  }

  // Flag negative sentiment
  if (this.sentiment.overall === 'negative') {
    this.flagged = true;
    this.flagReason = this.flagReason || 'Negative sentiment detected';
    this.requiresFollowup = true;
    this.followupReason = this.followupReason || 'Negative feedback requires attention';
  }
};

/**
 * Record reminder sent
 */
surveyResponseSchema.methods.recordReminder = async function () {
  this.remindersCount += 1;
  this.lastReminderAt = new Date();
  return this.save();
};

/**
 * Assign follow-up
 */
surveyResponseSchema.methods.assignFollowup = async function (userId, notes) {
  this.requiresFollowup = true;
  this.followupAssignedTo = userId;
  if (notes) this.followupNotes = notes;
  return this.save();
};

/**
 * Complete follow-up
 */
surveyResponseSchema.methods.completeFollowup = async function (notes) {
  this.requiresFollowup = false;
  this.followupCompletedAt = new Date();
  if (notes) this.followupNotes = notes;
  return this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Get responses needing follow-up
 */
surveyResponseSchema.statics.getNeedingFollowup = async function (organizationId) {
  return this.find({
    organization: organizationId,
    requiresFollowup: true,
    followupCompletedAt: null,
  })
    .populate('patientId', 'firstName lastName email phone')
    .populate('surveyId', 'title')
    .populate('followupAssignedTo', 'firstName lastName')
    .sort({ completedAt: -1 });
};

/**
 * Get flagged responses
 */
surveyResponseSchema.statics.getFlagged = async function (organizationId) {
  return this.find({
    organization: organizationId,
    flagged: true,
    status: 'completed',
  })
    .populate('patientId', 'firstName lastName email phone')
    .populate('surveyId', 'title')
    .sort({ completedAt: -1 });
};

/**
 * Calculate NPS distribution
 */
surveyResponseSchema.statics.calculateNPS = async function (surveyId, dateRange = {}) {
  const query = {
    surveyId,
    status: 'completed',
    'scores.nps': { $exists: true },
  };

  if (dateRange.startDate) {
    query.completedAt = { $gte: dateRange.startDate };
  }
  if (dateRange.endDate) {
    query.completedAt = { ...query.completedAt, $lte: dateRange.endDate };
  }

  const responses = await this.find(query);

  const promoters = responses.filter((r) => r.scores.nps >= 9).length;
  const passives = responses.filter((r) => r.scores.nps >= 7 && r.scores.nps <= 8).length;
  const detractors = responses.filter((r) => r.scores.nps <= 6).length;
  const total = responses.length;

  const npsScore = total > 0 ? ((promoters - detractors) / total) * 100 : 0;

  return {
    npsScore,
    promoters,
    passives,
    detractors,
    total,
    promoterPercentage: total > 0 ? (promoters / total) * 100 : 0,
    passivePercentage: total > 0 ? (passives / total) * 100 : 0,
    detractorPercentage: total > 0 ? (detractors / total) * 100 : 0,
  };
};

/**
 * Get response statistics
 */
surveyResponseSchema.statics.getStats = async function (surveyId, dateRange = {}) {
  const query = { surveyId };

  if (dateRange.startDate) {
    query.completedAt = { $gte: dateRange.startDate };
  }
  if (dateRange.endDate) {
    query.completedAt = { ...query.completedAt, $lte: dateRange.endDate };
  }

  const completedResponses = await this.find({ ...query, status: 'completed' });

  const totalSent =
    (await this.countDocuments({ surveyId, status: { $ne: 'completed' } })) +
    completedResponses.length;

  const avgCompletionTime =
    completedResponses.length > 0
      ? completedResponses.reduce((sum, r) => sum + (r.completionTime || 0), 0) /
        completedResponses.length
      : 0;

  const avgOverallScore =
    completedResponses.length > 0
      ? completedResponses.reduce((sum, r) => sum + (r.scores.overall || 0), 0) /
        completedResponses.length
      : 0;

  return {
    totalSent,
    totalCompleted: completedResponses.length,
    responseRate: totalSent > 0 ? (completedResponses.length / totalSent) * 100 : 0,
    avgCompletionTime,
    avgOverallScore,
    flaggedCount: completedResponses.filter((r) => r.flagged).length,
    needingFollowup: completedResponses.filter((r) => r.requiresFollowup && !r.followupCompletedAt)
      .length,
  };
};

module.exports = mongoose.model('SurveyResponse', surveyResponseSchema);
