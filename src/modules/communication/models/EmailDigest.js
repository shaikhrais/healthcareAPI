const mongoose = require('mongoose');

/**
 * Email Digest Model
 *
 * Manages automated executive summary email digests
 * Features:
 * - Flexible scheduling (daily, weekly, monthly)
 * - Customizable content sections
 * - Multiple recipient support
 * - Delivery tracking and history
 * - Template customization
 */

// eslint-disable-next-line no-unused-vars

const emailDigestSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: [true, 'Digest name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },

    // Scheduling
    frequency: {
      type: String,
      required: [true, 'Frequency is required'],
      enum: {
        values: ['daily', 'weekly', 'monthly', 'custom'],
        message: '{VALUE} is not a valid frequency',
      },
    },
    schedule: {
      // For 'daily': time of day
      time: {
        type: String, // HH:MM format (24-hour)
        default: '08:00',
      },
      // For 'weekly': day of week
      dayOfWeek: {
        type: Number, // 0 = Sunday, 6 = Saturday
        min: 0,
        max: 6,
      },
      // For 'monthly': day of month
      dayOfMonth: {
        type: Number, // 1-31
        min: 1,
        max: 31,
      },
      // Timezone
      timezone: {
        type: String,
        default: 'America/New_York',
      },
    },

    // Recipients
    recipients: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        email: {
          type: String,
          trim: true,
          lowercase: true,
        },
        name: {
          type: String,
          trim: true,
        },
        role: {
          type: String, // For context in email
        },
      },
    ],

    // Content Configuration
    includedSections: [
      {
        type: String,
        enum: [
          'overview', // High-level metrics
          'revenue', // Revenue analysis
          'appointments', // Appointment statistics
          'practitioners', // Practitioner performance
          'patients', // Patient metrics
          'services', // Service line performance
          'inventory', // Inventory status
          'churn_risk', // At-risk patients
          'anomalies', // Detected anomalies
          'goals', // Progress toward goals
          'trends', // Week/month trends
          'top_performers', // Best practitioners/services
          'action_items', // Recommended actions
        ],
      },
    ],

    // Date Range for Data
    dateRange: {
      type: String,
      enum: ['yesterday', 'last_7_days', 'last_30_days', 'last_week', 'last_month', 'custom'],
      default: 'yesterday',
    },
    customDateRange: {
      startDate: Date,
      endDate: Date,
    },

    // Comparison Period
    includeComparison: {
      type: Boolean,
      default: true,
    },
    comparisonPeriod: {
      type: String,
      enum: ['previous_period', 'previous_week', 'previous_month', 'previous_year'],
      default: 'previous_period',
    },

    // Template Configuration
    template: {
      type: String,
      enum: ['executive', 'detailed', 'minimal', 'custom'],
      default: 'executive',
    },
    customTemplate: {
      type: String, // HTML template
    },
    branding: {
      logo: String,
      primaryColor: {
        type: String,
        default: '#00C1CA', // Jane Cyan
      },
      secondaryColor: {
        type: String,
        default: '#333333',
      },
    },

    // Filters
    filters: {
      practitionerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      locationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Location',
      },
      serviceTypes: [String],
    },

    // Delivery Settings
    deliveryMethod: {
      type: String,
      enum: ['email', 'sms', 'both'],
      default: 'email',
    },
    emailSubjectTemplate: {
      type: String,
      default: 'Executive Summary - {{date}}',
    },
    includeAttachments: {
      type: Boolean,
      default: false,
    },
    attachmentFormats: [
      {
        type: String,
        enum: ['pdf', 'csv', 'excel'],
      },
    ],

    // Status and Tracking
    status: {
      type: String,
      enum: ['active', 'paused', 'draft'],
      default: 'active',
    },
    lastSent: Date,
    nextScheduled: Date,

    // Delivery History
    deliveryHistory: [
      {
        sentAt: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ['sent', 'failed', 'pending'],
          default: 'pending',
        },
        recipientCount: Number,
        successCount: Number,
        failureCount: Number,
        error: String,
        dateRange: {
          startDate: Date,
          endDate: Date,
        },
        metrics: {
          type: mongoose.Schema.Types.Mixed, // Store snapshot of metrics
        },
      },
    ],

    // Performance Tracking
    stats: {
      totalSent: {
        type: Number,
        default: 0,
      },
      totalOpens: {
        type: Number,
        default: 0,
      },
      totalClicks: {
        type: Number,
        default: 0,
      },
      lastOpenedAt: Date,
      avgOpenRate: Number,
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
  },
  {
    timestamps: true,
  }
);

// ==================== INDEXES ====================

emailDigestSchema.index({ status: 1, nextScheduled: 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// emailDigestSchema.index({ organization: 1, status: 1 });
emailDigestSchema.index({ 'recipients.userId': 1 });
emailDigestSchema.index({ createdBy: 1 });

// ==================== INSTANCE METHODS ====================

/**
 * Calculate next scheduled send time
 */
emailDigestSchema.methods.calculateNextScheduled = function () {
  const now = new Date();
  const next = new Date();

  const [hours, minutes] = this.schedule.time.split(':').map(Number);

  switch (this.frequency) {
    case 'daily':
      next.setHours(hours, minutes, 0, 0);
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      break;

    case 'weekly':
      next.setHours(hours, minutes, 0, 0);
      const currentDay = next.getDay();
      const targetDay = this.schedule.dayOfWeek;
      let daysUntilTarget = targetDay - currentDay;
      if (daysUntilTarget <= 0) {
        daysUntilTarget += 7;
      }
      next.setDate(next.getDate() + daysUntilTarget);
      break;

    case 'monthly':
      next.setHours(hours, minutes, 0, 0);
      next.setDate(this.schedule.dayOfMonth);
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }
      // Handle months with fewer days
      if (next.getDate() !== this.schedule.dayOfMonth) {
        next.setDate(0); // Last day of previous month
      }
      break;

    default:
      // For custom, don't auto-calculate
      return null;
  }

  this.nextScheduled = next;
  return next;
};

/**
 * Check if digest is due to be sent
 */
emailDigestSchema.methods.isDue = function () {
  if (this.status !== 'active') return false;
  if (!this.nextScheduled) return false;

  return this.nextScheduled <= new Date();
};

/**
 * Get date range for data collection
 */
emailDigestSchema.methods.getDateRange = function () {
  const now = new Date();
  let startDate;
  let endDate;

  switch (this.dateRange) {
    case 'yesterday':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
      break;

    case 'last_7_days':
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      break;

    case 'last_30_days':
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      break;

    case 'last_week':
      // Previous Sunday to Saturday
      const lastSunday = new Date(now);
      lastSunday.setDate(lastSunday.getDate() - lastSunday.getDay() - 7);
      lastSunday.setHours(0, 0, 0, 0);
      startDate = lastSunday;

      endDate = new Date(lastSunday);
      endDate.setDate(endDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;

    case 'last_month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      endDate.setHours(23, 59, 59, 999);
      break;

    case 'custom':
      startDate = this.customDateRange.startDate;
      endDate = this.customDateRange.endDate;
      break;

    default:
      // Default to yesterday
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
  }

  return { startDate, endDate };
};

/**
 * Get comparison date range
 */
emailDigestSchema.methods.getComparisonDateRange = function () {
  if (!this.includeComparison) return null;

  const { startDate, endDate } = this.getDateRange();
  const periodLength = endDate - startDate;

  let compStartDate;
  let compEndDate;

  switch (this.comparisonPeriod) {
    case 'previous_period':
      compEndDate = new Date(startDate.getTime() - 1);
      compStartDate = new Date(compEndDate.getTime() - periodLength);
      break;

    case 'previous_week':
      compEndDate = new Date(endDate);
      compEndDate.setDate(compEndDate.getDate() - 7);
      compStartDate = new Date(startDate);
      compStartDate.setDate(compStartDate.getDate() - 7);
      break;

    case 'previous_month':
      compEndDate = new Date(endDate);
      compEndDate.setMonth(compEndDate.getMonth() - 1);
      compStartDate = new Date(startDate);
      compStartDate.setMonth(compStartDate.getMonth() - 1);
      break;

    case 'previous_year':
      compEndDate = new Date(endDate);
      compEndDate.setFullYear(compEndDate.getFullYear() - 1);
      compStartDate = new Date(startDate);
      compStartDate.setFullYear(compStartDate.getFullYear() - 1);
      break;

    default:
      compEndDate = new Date(startDate.getTime() - 1);
      compStartDate = new Date(compEndDate.getTime() - periodLength);
  }

  return { startDate: compStartDate, endDate: compEndDate };
};

/**
 * Record successful delivery
 */
emailDigestSchema.methods.recordDelivery = async function (deliveryData) {
  const { startDate, endDate } = this.getDateRange();

  this.deliveryHistory.push({
    sentAt: new Date(),
    status: deliveryData.status || 'sent',
    recipientCount: this.recipients.length,
    successCount: deliveryData.successCount || this.recipients.length,
    failureCount: deliveryData.failureCount || 0,
    error: deliveryData.error,
    dateRange: { startDate, endDate },
    metrics: deliveryData.metrics,
  });

  // Keep only last 100 delivery records
  if (this.deliveryHistory.length > 100) {
    this.deliveryHistory = this.deliveryHistory.slice(-100);
  }

  this.lastSent = new Date();
  this.stats.totalSent += 1;

  // Calculate next scheduled time
  this.calculateNextScheduled();

  return this.save();
};

/**
 * Record email open
 */
emailDigestSchema.methods.recordOpen = async function () {
  this.stats.totalOpens += 1;
  this.stats.lastOpenedAt = new Date();
  this.stats.avgOpenRate = (this.stats.totalOpens / this.stats.totalSent) * 100;
  return this.save();
};

/**
 * Record email click
 */
emailDigestSchema.methods.recordClick = async function () {
  this.stats.totalClicks += 1;
  return this.save();
};

/**
 * Pause digest
 */
emailDigestSchema.methods.pause = async function () {
  this.status = 'paused';
  return this.save();
};

/**
 * Resume digest
 */
emailDigestSchema.methods.resume = async function () {
  this.status = 'active';
  this.calculateNextScheduled();
  return this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Get all digests due to be sent
 */
emailDigestSchema.statics.getDueDigests = async function () {
  return this.find({
    status: 'active',
    nextScheduled: { $lte: new Date() },
  }).populate('recipients.userId');
};

/**
 * Get digests for a user
 */
emailDigestSchema.statics.getUserDigests = async function (userId) {
  return this.find({
    $or: [{ createdBy: userId }, { 'recipients.userId': userId }],
  }).sort({ createdAt: -1 });
};

/**
 * Create default executive digest for organization
 */
emailDigestSchema.statics.createDefaultDigest = async function (organizationId, createdBy) {
  const digest = await this.create({
    name: 'Daily Executive Summary',
    description: 'Automated daily summary of key metrics and performance indicators',
    frequency: 'daily',
    schedule: {
      time: '08:00',
      timezone: 'America/New_York',
    },
    recipients: [],
    includedSections: [
      'overview',
      'revenue',
      'appointments',
      'practitioners',
      'anomalies',
      'trends',
    ],
    dateRange: 'yesterday',
    includeComparison: true,
    comparisonPeriod: 'previous_period',
    template: 'executive',
    status: 'draft',
    organization: organizationId,
    createdBy,
  });

  digest.calculateNextScheduled();
  await digest.save();

  return digest;
};

/**
 * Get digest statistics
 */
emailDigestSchema.statics.getStats = async function (organizationId) {
  const digests = await this.find({ organization: organizationId });

  const stats = {
    total: digests.length,
    active: digests.filter((d) => d.status === 'active').length,
    paused: digests.filter((d) => d.status === 'paused').length,
    draft: digests.filter((d) => d.status === 'draft').length,
    totalSent: digests.reduce((sum, d) => sum + d.stats.totalSent, 0),
    totalRecipients: digests.reduce((sum, d) => sum + d.recipients.length, 0),
    avgOpenRate:
      digests.reduce((sum, d) => sum + (d.stats.avgOpenRate || 0), 0) / digests.length || 0,
  };

  return stats;
};

// ==================== PRE-SAVE HOOK ====================

emailDigestSchema.pre('save', function (next) {
  // Calculate next scheduled if not set and status is active
  if (this.isNew && this.status === 'active' && !this.nextScheduled) {
    this.calculateNextScheduled();
  }

  // Ensure at least one recipient
  if (this.status === 'active' && this.recipients.length === 0) {
    return next(new Error('At least one recipient is required for active digests'));
  }

  // Ensure at least one section
  if (this.includedSections.length === 0) {
    this.includedSections = ['overview'];
  }

  next();
});

module.exports = mongoose.model('EmailDigest', emailDigestSchema);
