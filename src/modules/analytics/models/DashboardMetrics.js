const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
/**
 * DashboardMetrics Model
 *
 * Caches pre-calculated dashboard metrics for real-time updates.
 * Reduces database load by storing aggregated data that updates periodically.
 */

const dashboardMetricsSchema = new mongoose.Schema(
  {
    // Metric identification
    metricType: {
      type: String,
      required: true,
      enum: [
        'overview',
        'appointments_today',
        'revenue_today',
        'patients_active',
        'appointments_week',
        'revenue_month',
        'practitioner_utilization',
        'service_performance',
        'anomaly_alerts',
        'system_health',
      ],
      index: true,
    },

    // Scope (global or user-specific)
    scope: {
      type: String,
      enum: ['global', 'practitioner', 'location'],
      default: 'global',
    },
    practitionerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
    },

    // Metric data
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    // Metadata
    calculatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    validUntil: {
      type: Date,
      required: true,
      index: true,
    },
    refreshInterval: {
      type: Number, // seconds
      default: 300, // 5 minutes
    },

    // Cache control
    isStale: {
      type: Boolean,
      default: false,
    },
    lastAccessedAt: Date,
    accessCount: {
      type: Number,
      default: 0,
    },

    // Version for optimistic locking
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// ==================== INDEXES ====================

dashboardMetricsSchema.index(
  { metricType: 1, scope: 1, practitionerId: 1 },
  { unique: true, sparse: true }
);
dashboardMetricsSchema.index({ validUntil: 1 });
dashboardMetricsSchema.index({ isStale: 1, validUntil: 1 });

// ==================== METHODS ====================

/**
 * Check if metric is expired
 */
dashboardMetricsSchema.methods.isExpired = function () {
  return this.validUntil < new Date();
};

/**
 * Mark as stale
 */
dashboardMetricsSchema.methods.markStale = function () {
  this.isStale = true;
  return this.save();
};

/**
 * Refresh metric data
 */
dashboardMetricsSchema.methods.refresh = async function (newData) {
  this.data = newData;
  this.calculatedAt = new Date();
  this.validUntil = new Date(Date.now() + this.refreshInterval * 1000);
  this.isStale = false;
  this.version += 1;
  return this.save();
};

/**
 * Record access
 */
dashboardMetricsSchema.methods.recordAccess = function () {
  this.lastAccessedAt = new Date();
  this.accessCount += 1;
  return this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Get or create metric
 */
dashboardMetricsSchema.statics.getOrCreate = async function (
  metricType,
  scope = 'global',
  practitionerId = null
) {
  const query = { metricType, scope };
  if (practitionerId) query.practitionerId = practitionerId;

  let metric = await this.findOne(query);

  if (!metric) {
    metric = new this({
      metricType,
      scope,
      practitionerId,
      data: {},
      validUntil: new Date(Date.now() + 300 * 1000), // 5 minutes default
    });
    await metric.save();
  }

  return metric;
};

/**
 * Get metric if valid (not expired)
 */
dashboardMetricsSchema.statics.getValid = async function (
  metricType,
  scope = 'global',
  practitionerId = null
) {
  const query = {
    metricType,
    scope,
    validUntil: { $gt: new Date() },
    isStale: false,
  };
  if (practitionerId) query.practitionerId = practitionerId;

  const metric = await this.findOne(query);
  if (metric) {
    await metric.recordAccess();
  }
  return metric;
};

/**
 * Clean up expired metrics
 */
dashboardMetricsSchema.statics.cleanupExpired = async function () {
  const result = await this.deleteMany({
    validUntil: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // 24 hours old
  });
  return result.deletedCount;
};

/**
 * Mark all metrics as stale (force refresh)
 */
dashboardMetricsSchema.statics.invalidateAll = async function (metricType = null) {
  const query = metricType ? { metricType } : {};
  const result = await this.updateMany(query, { $set: { isStale: true } });
  return result.modifiedCount;
};

/**
 * Calculate overview metrics
 */
dashboardMetricsSchema.statics.calculateOverview = async function () {
  const Appointment = require('./Appointment');
  const Patient = require('./Patient');
  const Payment = require('./Payment');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Appointments today
  const appointmentsToday = await Appointment.countDocuments({
    startTime: { $gte: today, $lt: tomorrow },
  });

  const appointmentsTodayCompleted = await Appointment.countDocuments({
    startTime: { $gte: today, $lt: tomorrow },
    status: 'completed',
  });

  // Revenue today
  const revenueToday = await Payment.aggregate([
    {
      $match: {
        createdAt: { $gte: today, $lt: tomorrow },
        status: 'completed',
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
      },
    },
  ]);

  // Active patients (had appointment in last 90 days)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const recentAppointments = await Appointment.distinct('patient', {
    startTime: { $gte: ninetyDaysAgo },
  });

  // Week overview
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const appointmentsWeek = await Appointment.countDocuments({
    startTime: { $gte: weekStart },
  });

  // Month revenue
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const revenueMonth = await Payment.aggregate([
    {
      $match: {
        createdAt: { $gte: monthStart },
        status: 'completed',
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
      },
    },
  ]);

  return {
    appointmentsToday: {
      total: appointmentsToday,
      completed: appointmentsTodayCompleted,
      pending: appointmentsToday - appointmentsTodayCompleted,
    },
    revenueToday: {
      total: revenueToday.length > 0 ? revenueToday[0].total : 0,
      currency: 'USD',
    },
    patientsActive: recentAppointments.length,
    appointmentsWeek,
    revenueMonth: {
      total: revenueMonth.length > 0 ? revenueMonth[0].total : 0,
      currency: 'USD',
    },
    timestamp: new Date(),
  };
};

/**
 * Calculate practitioner utilization
 */
dashboardMetricsSchema.statics.calculatePractitionerUtilization = async function () {
  const Appointment = require('./Appointment');
  const User = require('./User');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const practitioners = await User.find({ role: 'practitioner', active: true });

  const utilizationData = [];

  for (const practitioner of practitioners) {
    const appointments = await Appointment.find({
      practitioner: practitioner._id,
      startTime: { $gte: today, $lt: tomorrow },
    });

    const totalMinutes = appointments.reduce((sum, appt) => sum + appt.duration, 0);
    const workdayMinutes = 8 * 60; // 8-hour workday
    const utilization = (totalMinutes / workdayMinutes) * 100;

    utilizationData.push({
      practitionerId: practitioner._id,
      name: `${practitioner.firstName} ${practitioner.lastName}`,
      appointments: appointments.length,
      totalMinutes,
      utilization: Math.min(utilization, 100),
      status: appointments.length > 0 ? 'active' : 'available',
    });
  }

  return {
    practitioners: utilizationData,
    avgUtilization:
      utilizationData.reduce((sum, p) => sum + p.utilization, 0) / utilizationData.length || 0,
    timestamp: new Date(),
  };
};

/**
 * Get system health metrics
 */
dashboardMetricsSchema.statics.calculateSystemHealth = async function () {
  const Anomaly = require('./Anomaly');

  // Active anomalies
  const activeAnomalies = await Anomaly.countDocuments({
    status: { $in: ['new', 'acknowledged', 'investigating'] },
  });

  const criticalAnomalies = await Anomaly.countDocuments({
    status: { $in: ['new', 'acknowledged', 'investigating'] },
    severity: 'critical',
  });

  // Database size (simplified)
  const dbStats = {
    healthy: activeAnomalies === 0,
    anomalyCount: activeAnomalies,
    criticalCount: criticalAnomalies,
  };

  return {
    status: criticalAnomalies > 0 ? 'critical' : activeAnomalies > 0 ? 'warning' : 'healthy',
    anomalies: {
      active: activeAnomalies,
      critical: criticalAnomalies,
    },
    uptime: process.uptime(),
    memory: {
      used: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      total: process.memoryUsage().heapTotal / 1024 / 1024, // MB
    },
    timestamp: new Date(),
  };
};

module.exports = mongoose.model('DashboardMetrics', dashboardMetricsSchema);
