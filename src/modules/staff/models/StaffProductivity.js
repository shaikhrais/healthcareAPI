const mongoose = require('mongoose');

/**
 * Staff Productivity Model
 *
 * Tracks staff productivity metrics and performance
 * Features:
 * - Daily/weekly/monthly productivity snapshots
 * - Multiple productivity metrics
 * - Goal tracking
 * - Performance trends
 */

// eslint-disable-next-line no-unused-vars

const staffProductivitySchema = new mongoose.Schema(
  {
    // Staff Reference
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: ['practitioner', 'receptionist', 'nurse', 'therapist', 'admin', 'billing', 'other'],
    },

    // Time Period
    periodType: {
      type: String,
      required: true,
      enum: ['daily', 'weekly', 'monthly'],
    },
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      required: true,
    },

    // Appointment Metrics (for practitioners/therapists)
    appointmentMetrics: {
      scheduled: Number,
      completed: Number,
      cancelled: Number,
      noShow: Number,
      rescheduled: Number,
      totalDuration: Number, // minutes
      avgDuration: Number, // minutes
      utilization: Number, // percentage of available time used
      completionRate: Number, // percentage
    },

    // Revenue Metrics (for practitioners)
    revenueMetrics: {
      totalRevenue: Number,
      collectedRevenue: Number,
      outstandingRevenue: Number,
      avgRevenuePerAppointment: Number,
      revenuePerHour: Number,
    },

    // Patient Metrics
    patientMetrics: {
      uniquePatients: Number,
      newPatients: Number,
      returningPatients: Number,
      retentionRate: Number, // percentage
    },

    // Time Metrics
    timeMetrics: {
      totalHours: Number,
      billableHours: Number,
      nonBillableHours: Number,
      overtimeHours: Number,
      ptoHours: Number,
      availableHours: Number,
    },

    // Quality Metrics
    qualityMetrics: {
      avgPatientSatisfaction: Number, // 0-5 scale
      npsScore: Number,
      reviewCount: Number,
      avgRating: Number,
      complaintCount: Number,
    },

    // Task Metrics (for admin/support staff)
    taskMetrics: {
      tasksAssigned: Number,
      tasksCompleted: Number,
      taskCompletionRate: Number, // percentage
      avgCompletionTime: Number, // hours
      overdueCount: Number,
    },

    // Communication Metrics
    communicationMetrics: {
      emailsSent: Number,
      callsMade: Number,
      messagesResponded: Number,
      avgResponseTime: Number, // minutes
    },

    // Billing Metrics (for billing staff)
    billingMetrics: {
      claimsProcessed: Number,
      claimApprovalRate: Number, // percentage
      avgProcessingTime: Number, // hours
      collectionsAmount: Number,
    },

    // Efficiency Metrics
    efficiencyMetrics: {
      appointmentsPerDay: Number,
      patientsPerHour: Number,
      revenuePerHour: Number,
      tasksPerHour: Number,
    },

    // Goals and Targets
    goals: {
      appointmentTarget: Number,
      revenueTarget: Number,
      patientTarget: Number,
      taskTarget: Number,
      appointmentAchievement: Number, // percentage
      revenueAchievement: Number, // percentage
      patientAchievement: Number, // percentage
      taskAchievement: Number, // percentage
    },

    // Comparative Metrics
    comparative: {
      rankInTeam: Number,
      totalInTeam: Number,
      percentile: Number,
      avgTeamPerformance: Number,
    },

    // Flags and Alerts
    alerts: [
      {
        type: {
          type: String,
          enum: [
            'below_target',
            'high_cancellation',
            'low_satisfaction',
            'high_overtime',
            'low_utilization',
          ],
        },
        severity: {
          type: String,
          enum: ['low', 'medium', 'high'],
        },
        message: String,
      },
    ],

    // Notes
    notes: String,
    managerReview: {
      reviewed: Boolean,
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      reviewedAt: Date,
      comments: String,
      rating: Number, // 1-5
    },

    // Metadata
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
    },
    calculatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// ==================== INDEXES ====================

staffProductivitySchema.index({ staffId: 1, periodStart: -1 });
staffProductivitySchema.index({ organization: 1, periodStart: -1 });
staffProductivitySchema.index({ role: 1, periodStart: -1 });
staffProductivitySchema.index({ periodType: 1, periodStart: -1 });

// ==================== VIRTUAL FIELDS ====================

staffProductivitySchema.virtual('overallScore').get(function () {
  let score = 0;
  let count = 0;

  if (this.appointmentMetrics?.completionRate) {
    score += this.appointmentMetrics.completionRate;
    count += 1;
  }

  if (this.appointmentMetrics?.utilization) {
    score += this.appointmentMetrics.utilization;
    count += 1;
  }

  if (this.qualityMetrics?.avgPatientSatisfaction) {
    score += (this.qualityMetrics.avgPatientSatisfaction / 5) * 100;
    count += 1;
  }

  if (this.taskMetrics?.taskCompletionRate) {
    score += this.taskMetrics.taskCompletionRate;
    count += 1;
  }

  return count > 0 ? (score / count).toFixed(1) : 0;
});

// ==================== INSTANCE METHODS ====================

/**
 * Check for performance alerts
 */
staffProductivitySchema.methods.checkAlerts = function () {
  this.alerts = [];

  // Low utilization
  if (this.appointmentMetrics?.utilization < 60) {
    this.alerts.push({
      type: 'low_utilization',
      severity: 'high',
      message: `Utilization at ${this.appointmentMetrics.utilization}% (target: 80%+)`,
    });
  }

  // High cancellation rate
  const cancelRate =
    this.appointmentMetrics?.scheduled > 0
      ? (this.appointmentMetrics.cancelled / this.appointmentMetrics.scheduled) * 100
      : 0;

  if (cancelRate > 15) {
    this.alerts.push({
      type: 'high_cancellation',
      severity: 'medium',
      message: `Cancellation rate at ${cancelRate.toFixed(1)}% (target: <10%)`,
    });
  }

  // Below revenue target
  if (this.goals?.revenueAchievement < 80) {
    this.alerts.push({
      type: 'below_target',
      severity: 'high',
      message: `Revenue achievement at ${this.goals.revenueAchievement}% of target`,
    });
  }

  // Low satisfaction
  if (this.qualityMetrics?.avgPatientSatisfaction < 4.0) {
    this.alerts.push({
      type: 'low_satisfaction',
      severity: 'high',
      message: `Patient satisfaction at ${this.qualityMetrics.avgPatientSatisfaction}/5.0`,
    });
  }

  // High overtime
  if (this.timeMetrics?.overtimeHours > 10) {
    this.alerts.push({
      type: 'high_overtime',
      severity: 'medium',
      message: `${this.timeMetrics.overtimeHours} hours of overtime this period`,
    });
  }
};

/**
 * Calculate goal achievements
 */
staffProductivitySchema.methods.calculateGoalAchievement = function () {
  if (this.goals) {
    if (this.goals.appointmentTarget) {
      this.goals.appointmentAchievement = this.appointmentMetrics?.completed
        ? (this.appointmentMetrics.completed / this.goals.appointmentTarget) * 100
        : 0;
    }

    if (this.goals.revenueTarget) {
      this.goals.revenueAchievement = this.revenueMetrics?.totalRevenue
        ? (this.revenueMetrics.totalRevenue / this.goals.revenueTarget) * 100
        : 0;
    }

    if (this.goals.patientTarget) {
      this.goals.patientAchievement = this.patientMetrics?.uniquePatients
        ? (this.patientMetrics.uniquePatients / this.goals.patientTarget) * 100
        : 0;
    }

    if (this.goals.taskTarget) {
      this.goals.taskAchievement = this.taskMetrics?.tasksCompleted
        ? (this.taskMetrics.tasksCompleted / this.goals.taskTarget) * 100
        : 0;
    }
  }
};

/**
 * Add manager review
 */
staffProductivitySchema.methods.addReview = async function (managerId, comments, rating) {
  this.managerReview = {
    reviewed: true,
    reviewedBy: managerId,
    reviewedAt: new Date(),
    comments,
    rating,
  };
  return this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Calculate productivity for staff member
 */
staffProductivitySchema.statics.calculateForStaff = async function (
  staffId,
  periodStart,
  periodEnd,
  periodType
) {
  const Appointment = require('./Appointment');
  const Payment = require('./Payment');
  const Patient = require('./Patient');
  const User = require('./User');
  const NPSScore = require('./NPSScore');

  const staff = await User.findById(staffId);
  if (!staff) throw new Error('Staff member not found');

  // Build appointment query
  const appointmentQuery = {
    practitioner: staffId,
    startTime: { $gte: periodStart, $lte: periodEnd },
  };

  const appointments = await Appointment.find(appointmentQuery);

  // Calculate appointment metrics
  const appointmentMetrics = {
    scheduled: appointments.length,
    completed: appointments.filter((a) => a.status === 'completed').length,
    cancelled: appointments.filter((a) => a.status === 'cancelled').length,
    noShow: appointments.filter((a) => a.status === 'no_show').length,
    rescheduled: appointments.filter((a) => a.rescheduled).length,
    totalDuration: appointments.reduce((sum, a) => sum + (a.duration || 0), 0),
    avgDuration: 0,
    utilization: 0,
    completionRate: 0,
  };

  if (appointmentMetrics.completed > 0) {
    appointmentMetrics.avgDuration =
      appointmentMetrics.totalDuration / appointmentMetrics.completed;
    appointmentMetrics.completionRate =
      (appointmentMetrics.completed / appointmentMetrics.scheduled) * 100;
  }

  // Calculate revenue metrics
  const payments = await Payment.find({
    appointmentId: { $in: appointments.map((a) => a._id) },
    status: 'completed',
  });

  const revenueMetrics = {
    totalRevenue: payments.reduce((sum, p) => sum + p.amount, 0),
    collectedRevenue: payments.reduce((sum, p) => sum + p.amount, 0),
    outstandingRevenue: 0,
    avgRevenuePerAppointment: 0,
    revenuePerHour: 0,
  };

  if (appointmentMetrics.completed > 0) {
    revenueMetrics.avgRevenuePerAppointment =
      revenueMetrics.totalRevenue / appointmentMetrics.completed;
  }

  if (appointmentMetrics.totalDuration > 0) {
    revenueMetrics.revenuePerHour =
      (revenueMetrics.totalRevenue / appointmentMetrics.totalDuration) * 60;
  }

  // Calculate patient metrics
  const uniquePatientIds = [...new Set(appointments.map((a) => a.patient?.toString()))].filter(
    Boolean
  );
  const patientMetrics = {
    uniquePatients: uniquePatientIds.length,
    newPatients: 0,
    returningPatients: 0,
    retentionRate: 0,
  };

  // Calculate quality metrics from NPS scores
  const npsScores = await NPSScore.find({
    practitionerId: staffId,
    submittedAt: { $gte: periodStart, $lte: periodEnd },
  });

  const qualityMetrics = {
    avgPatientSatisfaction: 0,
    npsScore: 0,
    reviewCount: npsScores.length,
    avgRating: 0,
    complaintCount: 0,
  };

  if (npsScores.length > 0) {
    const avgNPS = npsScores.reduce((sum, s) => sum + s.score, 0) / npsScores.length;
    qualityMetrics.avgRating = avgNPS / 2; // Convert 0-10 to 0-5 scale
    qualityMetrics.avgPatientSatisfaction = qualityMetrics.avgRating;

    const promoters = npsScores.filter((s) => s.score >= 9).length;
    const detractors = npsScores.filter((s) => s.score <= 6).length;
    qualityMetrics.npsScore = ((promoters - detractors) / npsScores.length) * 100;
  }

  // Calculate time metrics (simplified)
  const workingDays = Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24));
  const timeMetrics = {
    totalHours: appointmentMetrics.totalDuration / 60 || 0,
    billableHours: appointmentMetrics.totalDuration / 60 || 0,
    nonBillableHours: 0,
    overtimeHours: 0,
    ptoHours: 0,
    availableHours: workingDays * 8, // Assuming 8-hour workdays
  };

  if (timeMetrics.availableHours > 0) {
    appointmentMetrics.utilization = (timeMetrics.billableHours / timeMetrics.availableHours) * 100;
  }

  // Calculate efficiency metrics
  const efficiencyMetrics = {
    appointmentsPerDay: workingDays > 0 ? appointmentMetrics.completed / workingDays : 0,
    patientsPerHour:
      timeMetrics.billableHours > 0 ? patientMetrics.uniquePatients / timeMetrics.billableHours : 0,
    revenuePerHour: revenueMetrics.revenuePerHour,
    tasksPerHour: 0,
  };

  // Create productivity record
  const productivity = new this({
    staffId,
    role: staff.role,
    periodType,
    periodStart,
    periodEnd,
    appointmentMetrics,
    revenueMetrics,
    patientMetrics,
    qualityMetrics,
    timeMetrics,
    efficiencyMetrics,
    organization: staff.organization,
    locationId: staff.locationId,
  });

  productivity.checkAlerts();
  productivity.calculateGoalAchievement();

  return productivity;
};

/**
 * Get team productivity
 */
staffProductivitySchema.statics.getTeamProductivity = async function (
  organizationId,
  periodStart,
  periodEnd,
  periodType,
  filters = {}
) {
  const query = {
    organization: organizationId,
    periodStart,
    periodEnd,
    periodType,
  };

  if (filters.role) query.role = filters.role;
  if (filters.locationId) query.locationId = filters.locationId;

  return this.find(query)
    .populate('staffId', 'firstName lastName email')
    .sort({ 'revenueMetrics.totalRevenue': -1 });
};

/**
 * Get productivity trends
 */
staffProductivitySchema.statics.getTrends = async function (staffId, count = 12) {
  return this.find({ staffId }).sort({ periodStart: -1 }).limit(count);
};

/**
 * Get leaderboard
 */
staffProductivitySchema.statics.getLeaderboard = async function (
  organizationId,
  periodStart,
  periodEnd,
  metric = 'revenue'
) {
  const query = {
    organization: organizationId,
    periodStart,
    periodEnd,
  };

  let sortField;
  switch (metric) {
    case 'revenue':
      sortField = { 'revenueMetrics.totalRevenue': -1 };
      break;
    case 'appointments':
      sortField = { 'appointmentMetrics.completed': -1 };
      break;
    case 'patients':
      sortField = { 'patientMetrics.uniquePatients': -1 };
      break;
    case 'satisfaction':
      sortField = { 'qualityMetrics.avgPatientSatisfaction': -1 };
      break;
    default:
      sortField = { 'revenueMetrics.totalRevenue': -1 };
  }

  return this.find(query).populate('staffId', 'firstName lastName').sort(sortField).limit(10);
};

// ==================== PRE-SAVE HOOK ====================

staffProductivitySchema.pre('save', function (next) {
  // Check alerts before saving
  this.checkAlerts();

  // Calculate goal achievements
  this.calculateGoalAchievement();

  next();
});

module.exports = mongoose.model('StaffProductivity', staffProductivitySchema);
