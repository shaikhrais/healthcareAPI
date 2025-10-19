const mongoose = require('mongoose');

/**
 * Patient Survey Model
 *
 * Manages patient satisfaction surveys
 * Features:
 * - Multiple question types (rating, multiple choice, text)
 * - Survey templates and versioning
 * - Conditional logic
 * - Multi-language support
 */

// eslint-disable-next-line no-unused-vars

const patientSurveySchema = new mongoose.Schema(
  {
    // Survey Information
    title: {
      type: String,
      required: [true, 'Survey title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    version: {
      type: String,
      default: '1.0',
    },

    // Survey Type
    surveyType: {
      type: String,
      required: true,
      enum: [
        'post_appointment',
        'general_satisfaction',
        'service_feedback',
        'facility_feedback',
        'practitioner_feedback',
        'custom',
      ],
      default: 'general_satisfaction',
    },

    // Questions
    questions: [
      {
        questionId: {
          type: String,
          required: true,
        },
        questionText: {
          type: String,
          required: true,
          trim: true,
        },
        questionType: {
          type: String,
          enum: ['rating', 'nps', 'multiple_choice', 'yes_no', 'text', 'email', 'phone'],
          required: true,
        },
        required: {
          type: Boolean,
          default: false,
        },
        order: {
          type: Number,
          required: true,
        },

        // For rating questions
        ratingScale: {
          min: { type: Number, default: 1 },
          max: { type: Number, default: 5 },
          minLabel: String,
          maxLabel: String,
        },

        // For multiple choice
        options: [
          {
            value: String,
            label: String,
            order: Number,
          },
        ],
        allowMultiple: {
          type: Boolean,
          default: false,
        },

        // Conditional logic
        conditionalLogic: {
          showIf: {
            questionId: String,
            operator: String, // equals, not_equals, greater_than, less_than
            value: mongoose.Schema.Types.Mixed,
          },
        },

        // Categorization
        category: {
          type: String,
          enum: ['overall', 'staff', 'facility', 'treatment', 'booking', 'communication', 'other'],
        },
      },
    ],

    // Triggers and Distribution
    triggers: {
      sendAfterAppointment: {
        type: Boolean,
        default: true,
      },
      delayHours: {
        type: Number,
        default: 24, // Send 24 hours after appointment
      },
      sendOnlyForCompleted: {
        type: Boolean,
        default: true,
      },
      appointmentTypes: [String], // Which appointment types trigger this survey
      serviceTypes: [String], // Which service types trigger this survey
    },

    // Distribution Settings
    distribution: {
      method: {
        type: String,
        enum: ['email', 'sms', 'both', 'in_app'],
        default: 'email',
      },
      reminderEnabled: {
        type: Boolean,
        default: true,
      },
      reminderDelayHours: {
        type: Number,
        default: 72, // Remind after 3 days if not completed
      },
      maxReminders: {
        type: Number,
        default: 2,
      },
    },

    // Customization
    branding: {
      logo: String,
      primaryColor: {
        type: String,
        default: '#00C1CA',
      },
      headerText: String,
      footerText: String,
    },

    // Incentives
    incentive: {
      enabled: {
        type: Boolean,
        default: false,
      },
      type: {
        type: String,
        enum: ['discount', 'points', 'gift_card', 'entry'],
      },
      description: String,
      value: Number,
    },

    // Privacy
    anonymous: {
      type: Boolean,
      default: false,
    },
    collectContactInfo: {
      type: Boolean,
      default: false,
    },

    // Status
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'archived'],
      default: 'draft',
    },
    publishedAt: Date,

    // Analytics Summary
    analytics: {
      totalSent: {
        type: Number,
        default: 0,
      },
      totalResponses: {
        type: Number,
        default: 0,
      },
      responseRate: {
        type: Number,
        default: 0,
      },
      averageCompletionTime: Number, // seconds
      averageScore: Number,
      npsScore: Number,
      lastCalculatedAt: Date,
    },

    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    language: {
      type: String,
      default: 'en',
    },
  },
  {
    timestamps: true,
  }
);

// ==================== INDEXES ====================

patientSurveySchema.index({ status: 1, surveyType: 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// patientSurveySchema.index({ organization: 1, status: 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// patientSurveySchema.index({ createdBy: 1 });
patientSurveySchema.index({ 'triggers.appointmentTypes': 1 });

// ==================== INSTANCE METHODS ====================

/**
 * Publish survey
 */
patientSurveySchema.methods.publish = async function () {
  this.status = 'active';
  this.publishedAt = new Date();
  return this.save();
};

/**
 * Pause survey
 */
patientSurveySchema.methods.pause = async function () {
  this.status = 'paused';
  return this.save();
};

/**
 * Archive survey
 */
patientSurveySchema.methods.archive = async function () {
  this.status = 'archived';
  return this.save();
};

/**
 * Get questions by category
 */
patientSurveySchema.methods.getQuestionsByCategory = function (category) {
  return this.questions.filter((q) => q.category === category).sort((a, b) => a.order - b.order);
};

/**
 * Get rating questions
 */
patientSurveySchema.methods.getRatingQuestions = function () {
  return this.questions.filter((q) => q.questionType === 'rating' || q.questionType === 'nps');
};

/**
 * Calculate response metrics
 */
patientSurveySchema.methods.calculateMetrics = async function () {
  const SurveyResponse = mongoose.model('SurveyResponse');

  const responses = await SurveyResponse.find({
    surveyId: this._id,
    status: 'completed',
  });

  // Calculate basic metrics
  this.analytics.totalResponses = responses.length;
  this.analytics.responseRate =
    this.analytics.totalSent > 0
      ? (this.analytics.totalResponses / this.analytics.totalSent) * 100
      : 0;

  // Calculate average completion time
  const completionTimes = responses
    .filter((r) => r.completedAt && r.startedAt)
    .map((r) => (r.completedAt - r.startedAt) / 1000); // Convert to seconds

  if (completionTimes.length > 0) {
    this.analytics.averageCompletionTime =
      completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length;
  }

  // Calculate average score (from rating questions)
  const ratingQuestions = this.getRatingQuestions();
  if (ratingQuestions.length > 0) {
    let totalScore = 0;
    let scoreCount = 0;

    responses.forEach((response) => {
      ratingQuestions.forEach((question) => {
        const answer = response.answers.find((a) => a.questionId === question.questionId);
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
    });

    if (scoreCount > 0) {
      this.analytics.averageScore = totalScore / scoreCount;
    }
  }

  // Calculate NPS score
  const npsQuestions = this.questions.filter((q) => q.questionType === 'nps');
  if (npsQuestions.length > 0) {
    const npsQuestion = npsQuestions[0];
    const npsResponses = responses
      .map((r) => r.answers.find((a) => a.questionId === npsQuestion.questionId))
      .filter((a) => a && typeof a.value === 'number')
      .map((a) => a.value);

    if (npsResponses.length > 0) {
      const promoters = npsResponses.filter((score) => score >= 9).length;
      const detractors = npsResponses.filter((score) => score <= 6).length;
      this.analytics.npsScore = ((promoters - detractors) / npsResponses.length) * 100;
    }
  }

  this.analytics.lastCalculatedAt = new Date();
  return this.save();
};

/**
 * Record survey sent
 */
patientSurveySchema.methods.recordSent = async function () {
  this.analytics.totalSent += 1;
  return this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Get active surveys for trigger
 */
patientSurveySchema.statics.getActiveSurveys = async function (filters = {}) {
  const query = { status: 'active' };

  if (filters.surveyType) {
    query.surveyType = filters.surveyType;
  }

  if (filters.appointmentType) {
    query['triggers.appointmentTypes'] = filters.appointmentType;
  }

  if (filters.serviceType) {
    query['triggers.serviceTypes'] = filters.serviceType;
  }

  return this.find(query);
};

/**
 * Create default post-appointment survey
 */
patientSurveySchema.statics.createDefaultSurvey = async function (organizationId, createdBy) {
  const survey = await this.create({
    title: 'Post-Appointment Satisfaction Survey',
    description: 'Help us improve your experience',
    surveyType: 'post_appointment',
    questions: [
      {
        questionId: 'q1',
        questionText: 'Overall, how satisfied were you with your visit?',
        questionType: 'rating',
        required: true,
        order: 1,
        ratingScale: {
          min: 1,
          max: 5,
          minLabel: 'Very Dissatisfied',
          maxLabel: 'Very Satisfied',
        },
        category: 'overall',
      },
      {
        questionId: 'q2',
        questionText: 'How likely are you to recommend our practice to a friend or family member?',
        questionType: 'nps',
        required: true,
        order: 2,
        ratingScale: {
          min: 0,
          max: 10,
          minLabel: 'Not at all likely',
          maxLabel: 'Extremely likely',
        },
        category: 'overall',
      },
      {
        questionId: 'q3',
        questionText: 'How would you rate the professionalism of our staff?',
        questionType: 'rating',
        required: true,
        order: 3,
        ratingScale: {
          min: 1,
          max: 5,
          minLabel: 'Poor',
          maxLabel: 'Excellent',
        },
        category: 'staff',
      },
      {
        questionId: 'q4',
        questionText: 'How would you rate the cleanliness of our facility?',
        questionType: 'rating',
        required: false,
        order: 4,
        ratingScale: {
          min: 1,
          max: 5,
          minLabel: 'Poor',
          maxLabel: 'Excellent',
        },
        category: 'facility',
      },
      {
        questionId: 'q5',
        questionText: 'Was your appointment time convenient?',
        questionType: 'yes_no',
        required: false,
        order: 5,
        category: 'booking',
      },
      {
        questionId: 'q6',
        questionText: 'Do you have any additional comments or suggestions?',
        questionType: 'text',
        required: false,
        order: 6,
        category: 'other',
      },
    ],
    triggers: {
      sendAfterAppointment: true,
      delayHours: 24,
      sendOnlyForCompleted: true,
    },
    distribution: {
      method: 'email',
      reminderEnabled: true,
    },
    status: 'draft',
    organization: organizationId,
    createdBy,
  });

  return survey;
};

/**
 * Get survey statistics
 */
patientSurveySchema.statics.getStats = async function (organizationId) {
  const surveys = await this.find({ organization: organizationId });

  return {
    total: surveys.length,
    active: surveys.filter((s) => s.status === 'active').length,
    draft: surveys.filter((s) => s.status === 'draft').length,
    paused: surveys.filter((s) => s.status === 'paused').length,
    archived: surveys.filter((s) => s.status === 'archived').length,
    totalSent: surveys.reduce((sum, s) => sum + s.analytics.totalSent, 0),
    totalResponses: surveys.reduce((sum, s) => sum + s.analytics.totalResponses, 0),
    avgResponseRate:
      surveys.length > 0
        ? surveys.reduce((sum, s) => sum + (s.analytics.responseRate || 0), 0) / surveys.length
        : 0,
    avgScore:
      surveys.length > 0
        ? surveys.reduce((sum, s) => sum + (s.analytics.averageScore || 0), 0) / surveys.length
        : 0,
  };
};

// ==================== PRE-SAVE HOOK ====================

patientSurveySchema.pre('save', function (next) {
  // Sort questions by order
  if (this.questions && this.questions.length > 0) {
    this.questions.sort((a, b) => a.order - b.order);
  }

  // Calculate response rate
  if (this.analytics.totalSent > 0) {
    this.analytics.responseRate = (this.analytics.totalResponses / this.analytics.totalSent) * 100;
  }

  next();
});

module.exports = mongoose.model('PatientSurvey', patientSurveySchema);
