const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
/**
 * ServiceLineAnalysis Model
 * Tracks performance metrics and analytics for different service lines
 * Used for revenue analysis, utilization tracking, and business intelligence
 */
const serviceLineAnalysisSchema = new mongoose.Schema(
  {
    // Service Line Information
    serviceLine: {
      type: String,
      required: true,
      enum: [
        'RMT',
        'RPT',
        'Physiotherapy',
        'Massage Therapy',
        'Acupuncture',
        'Chiropractic',
        'General',
      ],
    },

    // Time Period
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      required: true,
    },
    periodType: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'],
      default: 'monthly',
    },

    // Appointment Metrics
    appointmentMetrics: {
      total: {
        type: Number,
        default: 0,
      },
      completed: {
        type: Number,
        default: 0,
      },
      cancelled: {
        type: Number,
        default: 0,
      },
      noShow: {
        type: Number,
        default: 0,
      },
      completionRate: {
        type: Number,
        default: 0,
      },
      cancellationRate: {
        type: Number,
        default: 0,
      },
      noShowRate: {
        type: Number,
        default: 0,
      },
    },

    // Revenue Metrics
    revenueMetrics: {
      totalRevenue: {
        type: Number,
        default: 0,
      },
      averageRevenuePerAppointment: {
        type: Number,
        default: 0,
      },
      revenueGrowth: {
        type: Number,
        default: 0, // Percentage change from previous period
      },
      revenueByPaymentMethod: {
        card: { type: Number, default: 0 },
        cash: { type: Number, default: 0 },
        insurance: { type: Number, default: 0 },
        other: { type: Number, default: 0 },
      },
    },

    // Utilization Metrics
    utilizationMetrics: {
      totalAvailableHours: {
        type: Number,
        default: 0,
      },
      totalBookedHours: {
        type: Number,
        default: 0,
      },
      utilizationRate: {
        type: Number,
        default: 0, // Percentage
      },
      averageAppointmentDuration: {
        type: Number,
        default: 0, // Minutes
      },
    },

    // Patient Metrics
    patientMetrics: {
      totalPatients: {
        type: Number,
        default: 0,
      },
      newPatients: {
        type: Number,
        default: 0,
      },
      returningPatients: {
        type: Number,
        default: 0,
      },
      retentionRate: {
        type: Number,
        default: 0,
      },
    },

    // Practitioner Performance
    practitionerMetrics: {
      totalPractitioners: {
        type: Number,
        default: 0,
      },
      averageAppointmentsPerPractitioner: {
        type: Number,
        default: 0,
      },
      topPerformers: [
        {
          practitionerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
          practitionerName: String,
          appointmentsCompleted: Number,
          revenueGenerated: Number,
          utilizationRate: Number,
        },
      ],
    },

    // Time-based Analysis
    timeAnalysis: {
      peakDays: [
        {
          day: String, // Monday, Tuesday, etc.
          appointmentCount: Number,
          revenue: Number,
        },
      ],
      peakHours: [
        {
          hour: Number, // 0-23
          appointmentCount: Number,
          revenue: Number,
        },
      ],
    },

    // Trends and Insights
    insights: {
      growingDemand: {
        type: Boolean,
        default: false,
      },
      decliningPerformance: {
        type: Boolean,
        default: false,
      },
      seasonalTrends: String,
      recommendations: [String],
    },

    // Metadata
    calculatedAt: {
      type: Date,
      default: Date.now,
    },
    calculatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    dataQuality: {
      completeness: {
        type: Number,
        default: 100, // Percentage
      },
      notes: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
serviceLineAnalysisSchema.index({ serviceLine: 1, periodStart: 1, periodEnd: 1 });
serviceLineAnalysisSchema.index({ serviceLine: 1, periodType: 1 });
serviceLineAnalysisSchema.index({ periodStart: 1, periodEnd: 1 });
serviceLineAnalysisSchema.index({ 'revenueMetrics.totalRevenue': -1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// serviceLineAnalysisSchema.index({ calculatedAt: -1 });

// Compound index for time-series queries
serviceLineAnalysisSchema.index({ serviceLine: 1, periodStart: -1 });

// Virtual for period duration
serviceLineAnalysisSchema.virtual('periodDurationDays').get(function () {
  if (this.periodStart && this.periodEnd) {
    return Math.ceil((this.periodEnd - this.periodStart) / (1000 * 60 * 60 * 24));
  }
  return 0;
});

// Method to calculate all metrics
serviceLineAnalysisSchema.methods.calculateMetrics = function () {
  // Calculate completion rate
  if (this.appointmentMetrics.total > 0) {
    this.appointmentMetrics.completionRate =
      (this.appointmentMetrics.completed / this.appointmentMetrics.total) * 100;
    this.appointmentMetrics.cancellationRate =
      (this.appointmentMetrics.cancelled / this.appointmentMetrics.total) * 100;
    this.appointmentMetrics.noShowRate =
      (this.appointmentMetrics.noShow / this.appointmentMetrics.total) * 100;
  }

  // Calculate average revenue per appointment
  if (this.appointmentMetrics.completed > 0) {
    this.revenueMetrics.averageRevenuePerAppointment =
      this.revenueMetrics.totalRevenue / this.appointmentMetrics.completed;
  }

  // Calculate utilization rate
  if (this.utilizationMetrics.totalAvailableHours > 0) {
    this.utilizationMetrics.utilizationRate =
      (this.utilizationMetrics.totalBookedHours / this.utilizationMetrics.totalAvailableHours) *
      100;
  }

  // Calculate retention rate
  if (this.patientMetrics.totalPatients > 0) {
    this.patientMetrics.retentionRate =
      (this.patientMetrics.returningPatients / this.patientMetrics.totalPatients) * 100;
  }

  // Calculate average appointments per practitioner
  if (this.practitionerMetrics.totalPractitioners > 0) {
    this.practitionerMetrics.averageAppointmentsPerPractitioner =
      this.appointmentMetrics.completed / this.practitionerMetrics.totalPractitioners;
  }
};

// Static method to generate analysis for a service line and period
serviceLineAnalysisSchema.statics.generateAnalysis = async function (
  serviceLine,
  periodStart,
  periodEnd,
  periodType = 'custom'
) {
  const Appointment = mongoose.model('Appointment');
  const Payment = mongoose.model('Payment');

  // Fetch all appointments for this service line in the period
  const appointments = await Appointment.find({
    serviceType: serviceLine,
    startTime: {
      $gte: periodStart,
      $lte: periodEnd,
    },
  }).populate('practitioner', 'firstName lastName');

  // Initialize metrics
  const analysis = new this({
    serviceLine,
    periodStart,
    periodEnd,
    periodType,
  });

  // Calculate appointment metrics
  analysis.appointmentMetrics.total = appointments.length;
  analysis.appointmentMetrics.completed = appointments.filter(
    (a) => a.status === 'completed'
  ).length;
  analysis.appointmentMetrics.cancelled = appointments.filter(
    (a) => a.status === 'cancelled'
  ).length;
  analysis.appointmentMetrics.noShow = appointments.filter((a) => a.status === 'no-show').length;

  // Get payment data for completed appointments
  const completedAppointmentIds = appointments
    .filter((a) => a.status === 'completed')
    .map((a) => a._id);

  const payments = await Payment.find({
    appointmentId: { $in: completedAppointmentIds },
    status: 'completed',
  });

  // Calculate revenue metrics
  analysis.revenueMetrics.totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Group by payment method
  payments.forEach((payment) => {
    const method = payment.paymentMethod || 'other';
    if (analysis.revenueMetrics.revenueByPaymentMethod[method] !== undefined) {
      analysis.revenueMetrics.revenueByPaymentMethod[method] += payment.amount || 0;
    } else {
      analysis.revenueMetrics.revenueByPaymentMethod.other += payment.amount || 0;
    }
  });

  // Calculate utilization metrics
  const totalDurationMinutes = appointments
    .filter((a) => a.status === 'completed')
    .reduce((sum, a) => sum + (a.duration || 0), 0);
  analysis.utilizationMetrics.totalBookedHours = totalDurationMinutes / 60;
  analysis.utilizationMetrics.averageAppointmentDuration =
    appointments.filter((a) => a.status === 'completed').length > 0
      ? totalDurationMinutes / appointments.filter((a) => a.status === 'completed').length
      : 0;

  // Calculate patient metrics
  const uniquePatients = new Set(appointments.map((a) => a.patient.toString()));
  analysis.patientMetrics.totalPatients = uniquePatients.size;

  // Time-based analysis
  const dayCount = {};
  const hourCount = {};
  const dayRevenue = {};
  const hourRevenue = {};

  appointments.forEach((apt) => {
    const day = apt.startTime.toLocaleDateString('en-US', { weekday: 'long' });
    const hour = apt.startTime.getHours();

    dayCount[day] = (dayCount[day] || 0) + 1;
    hourCount[hour] = (hourCount[hour] || 0) + 1;

    // Find payment for this appointment
    const payment = payments.find((p) => p.appointmentId?.toString() === apt._id.toString());
    if (payment) {
      dayRevenue[day] = (dayRevenue[day] || 0) + payment.amount;
      hourRevenue[hour] = (hourRevenue[hour] || 0) + payment.amount;
    }
  });

  analysis.timeAnalysis.peakDays = Object.keys(dayCount)
    .map((day) => ({
      day,
      appointmentCount: dayCount[day],
      revenue: dayRevenue[day] || 0,
    }))
    .sort((a, b) => b.appointmentCount - a.appointmentCount);

  analysis.timeAnalysis.peakHours = Object.keys(hourCount)
    .map((hour) => ({
      hour: parseInt(hour, 10),
      appointmentCount: hourCount[hour],
      revenue: hourRevenue[hour] || 0,
    }))
    .sort((a, b) => b.appointmentCount - a.appointmentCount);

  // Practitioner performance
  const practitionerMap = {};
  appointments.forEach((apt) => {
    if (apt.practitioner && apt.status === 'completed') {
      const id = apt.practitioner._id.toString();
      if (!practitionerMap[id]) {
        practitionerMap[id] = {
          practitionerId: apt.practitioner._id,
          practitionerName: `${apt.practitioner.firstName} ${apt.practitioner.lastName}`,
          appointmentsCompleted: 0,
          revenueGenerated: 0,
          utilizationRate: 0,
        };
      }
      practitionerMap[id].appointmentsCompleted += 1;

      const payment = payments.find((p) => p.appointmentId?.toString() === apt._id.toString());
      if (payment) {
        practitionerMap[id].revenueGenerated += payment.amount || 0;
      }
    }
  });

  analysis.practitionerMetrics.topPerformers = Object.values(practitionerMap)
    .sort((a, b) => b.revenueGenerated - a.revenueGenerated)
    .slice(0, 5);

  analysis.practitionerMetrics.totalPractitioners = Object.keys(practitionerMap).length;

  // Calculate all derived metrics
  analysis.calculateMetrics();

  return analysis;
};

module.exports = mongoose.model('ServiceLineAnalysis', serviceLineAnalysisSchema);
