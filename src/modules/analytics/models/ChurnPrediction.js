const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
/**
 * ChurnPrediction Model
 *
 * Predicts patient churn risk using engagement patterns, appointment history,
 * payment behavior, and communication responsiveness.
 *
 * Churn Definition: A patient is considered "churned" if they haven't had an
 * appointment in the last 90 days and show declining engagement patterns.
 */

const churnPredictionSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },

    // Prediction metadata
    predictionDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    modelVersion: {
      type: String,
      default: '1.0',
    },

    // Risk Assessment
    churnRisk: {
      score: {
        type: Number, // 0-100 scale
        required: true,
        min: 0,
        max: 100,
      },
      level: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Critical'],
        required: true,
        index: true,
      },
      confidence: {
        type: Number, // 0-100 scale
        default: 75,
      },
    },

    // ==================== FEATURE CATEGORIES ====================

    // 1. ENGAGEMENT FEATURES
    engagementFeatures: {
      daysSinceLastAppointment: {
        type: Number,
        required: true,
      },
      appointmentFrequency: {
        type: Number, // Appointments per month
        required: true,
      },
      appointmentTrend: {
        type: String,
        enum: ['increasing', 'stable', 'declining', 'inactive'],
        required: true,
      },
      totalLifetimeAppointments: {
        type: Number,
        required: true,
      },
      averageDaysBetweenAppointments: {
        type: Number,
      },
      last90DaysAppointments: {
        type: Number,
      },
      last180DaysAppointments: {
        type: Number,
      },
      engagementScore: {
        type: Number, // 0-100
      },
    },

    // 2. APPOINTMENT BEHAVIOR FEATURES
    appointmentBehavior: {
      cancellationRate: {
        type: Number, // Percentage
        required: true,
      },
      noShowRate: {
        type: Number, // Percentage
        required: true,
      },
      completionRate: {
        type: Number, // Percentage
        required: true,
      },
      lastMinuteCancellations: {
        type: Number, // Count of cancellations within 24 hours
      },
      reschedulingFrequency: {
        type: Number, // Number of reschedules
      },
      averageAdvanceBooking: {
        type: Number, // Days in advance
      },
      bookingConsistency: {
        type: String,
        enum: ['regular', 'irregular', 'sporadic'],
      },
    },

    // 3. PAYMENT BEHAVIOR FEATURES
    paymentBehavior: {
      totalRevenue: {
        type: Number,
        required: true,
      },
      averagePaymentAmount: {
        type: Number,
      },
      outstandingBalance: {
        type: Number,
        default: 0,
      },
      paymentTimeliness: {
        type: Number, // 0-100 score
      },
      latePaymentCount: {
        type: Number,
        default: 0,
      },
      paymentMethodChanges: {
        type: Number, // Frequency of changing payment methods
        default: 0,
      },
      declinedPayments: {
        type: Number,
        default: 0,
      },
    },

    // 4. COMMUNICATION FEATURES
    communicationFeatures: {
      emailResponseRate: {
        type: Number, // Percentage
      },
      smsResponseRate: {
        type: Number, // Percentage
      },
      reminderResponseRate: {
        type: Number, // Percentage
      },
      daysSinceLastContact: {
        type: Number,
      },
      communicationPreference: {
        type: String,
        enum: ['email', 'sms', 'phone', 'none'],
      },
      unsubscribedFromMarketing: {
        type: Boolean,
        default: false,
      },
      complaintsCount: {
        type: Number,
        default: 0,
      },
    },

    // 5. RELATIONSHIP FEATURES
    relationshipFeatures: {
      patientTenure: {
        type: Number, // Days since first appointment
        required: true,
      },
      practitionerChanges: {
        type: Number, // Number of times changed practitioner
        default: 0,
      },
      currentPractitioner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      practitionerRetentionRate: {
        type: Number, // Percentage of appointments with same practitioner
      },
      referralSource: {
        type: String,
        enum: ['organic', 'referral', 'marketing', 'insurance', 'other'],
      },
      hasReferredOthers: {
        type: Boolean,
        default: false,
      },
    },

    // 6. TREATMENT FEATURES
    treatmentFeatures: {
      primaryServiceType: {
        type: String,
      },
      serviceTypeDiversity: {
        type: Number, // Number of different service types tried
      },
      treatmentPlanCompliance: {
        type: Number, // 0-100 score
      },
      hasActiveTreatmentPlan: {
        type: Boolean,
        default: false,
      },
      treatmentOutcomeSatisfaction: {
        type: Number, // 1-5 rating
      },
    },

    // 7. TEMPORAL FEATURES
    temporalFeatures: {
      currentMonth: {
        type: Number, // 1-12
      },
      currentQuarter: {
        type: Number, // 1-4
      },
      dayOfWeek: {
        type: Number, // 0-6
      },
      seasonalPatternScore: {
        type: Number, // Historical attendance pattern score
      },
    },

    // 8. COMPETITIVE FEATURES
    competitiveFeatures: {
      nearbyCompetitorCount: {
        type: Number,
        default: 0,
      },
      marketSaturation: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium',
      },
      priceComparison: {
        type: String,
        enum: ['lower', 'competitive', 'higher'],
        default: 'competitive',
      },
    },

    // ==================== CHURN INDICATORS ====================

    churnIndicators: {
      redFlags: [
        {
          indicator: String,
          severity: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
          },
          description: String,
        },
      ],
      protectiveFactors: [
        {
          factor: String,
          strength: {
            type: String,
            enum: ['weak', 'moderate', 'strong'],
          },
          description: String,
        },
      ],
    },

    // ==================== RETENTION STRATEGY ====================

    retentionStrategy: {
      recommendedActions: [
        {
          priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'urgent'],
          },
          action: String,
          description: String,
          timeline: String, // e.g., "Within 24 hours", "Within 1 week"
          expectedImpact: String, // e.g., "High", "Medium", "Low"
        },
      ],
      assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'cancelled'],
        default: 'pending',
      },
      notes: String,
    },

    // ==================== TRACKING ====================

    // Actual outcome tracking
    actualOutcome: {
      churned: {
        type: Boolean,
      },
      churnDate: {
        type: Date,
      },
      churnReason: {
        type: String,
        enum: [
          'price',
          'quality',
          'convenience',
          'moved',
          'insurance',
          'health_improved',
          'competitor',
          'dissatisfaction',
          'other',
        ],
      },
      churnReasonDetails: String,
    },

    // Retention efforts
    retentionEfforts: [
      {
        date: Date,
        type: {
          type: String,
          enum: ['call', 'email', 'sms', 'mail', 'visit', 'promotion', 'other'],
        },
        description: String,
        outcome: {
          type: String,
          enum: ['positive', 'neutral', 'negative', 'no_response'],
        },
        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],

    // Prediction accuracy
    predictionAccurate: {
      type: Boolean,
    },
    validatedDate: {
      type: Date,
    },

    // Metadata
    calculatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    calculationDuration: {
      type: Number, // milliseconds
    },

    notes: String,
  },
  {
    timestamps: true,
  }
);

// ==================== INDEXES ====================

churnPredictionSchema.index({ patient: 1, predictionDate: -1 });
churnPredictionSchema.index({ 'churnRisk.level': 1, predictionDate: -1 });
churnPredictionSchema.index({ 'churnRisk.score': -1 });
churnPredictionSchema.index({ 'retentionStrategy.status': 1 });
churnPredictionSchema.index({ 'actualOutcome.churned': 1 });

// ==================== METHODS ====================

/**
 * Calculate churn risk based on all features using rule-based algorithm (v1.0)
 * Future versions will use ML models (logistic regression, random forest, neural networks)
 */
churnPredictionSchema.methods.calculateChurnRisk = function () {
  let riskScore = 0;
  let maxScore = 0;

  // 1. ENGAGEMENT RISK (Weight: 35%)
  const engWeight = 35;
  maxScore += engWeight;

  const daysSince = this.engagementFeatures.daysSinceLastAppointment;
  const trend = this.engagementFeatures.appointmentTrend;
  const frequency = this.engagementFeatures.appointmentFrequency;

  if (daysSince > 120)
    riskScore += engWeight * 1.0; // 35 points
  else if (daysSince > 90)
    riskScore += engWeight * 0.8; // 28 points
  else if (daysSince > 60)
    riskScore += engWeight * 0.5; // 17.5 points
  else if (daysSince > 30)
    riskScore += engWeight * 0.3; // 10.5 points
  else riskScore += engWeight * 0.1; // 3.5 points

  if (trend === 'inactive') riskScore += engWeight * 0.5;
  else if (trend === 'declining') riskScore += engWeight * 0.3;
  else if (trend === 'stable') riskScore += engWeight * 0.1;

  // 2. APPOINTMENT BEHAVIOR RISK (Weight: 20%)
  const behaviorWeight = 20;
  maxScore += behaviorWeight;

  const cancelRate = this.appointmentBehavior.cancellationRate;
  const { noShowRate } = this.appointmentBehavior;

  if (cancelRate > 30) riskScore += behaviorWeight * 0.6;
  else if (cancelRate > 20) riskScore += behaviorWeight * 0.4;
  else if (cancelRate > 10) riskScore += behaviorWeight * 0.2;

  if (noShowRate > 20) riskScore += behaviorWeight * 0.4;
  else if (noShowRate > 10) riskScore += behaviorWeight * 0.2;

  // 3. PAYMENT BEHAVIOR RISK (Weight: 15%)
  const paymentWeight = 15;
  maxScore += paymentWeight;

  const outstanding = this.paymentBehavior.outstandingBalance;
  const declined = this.paymentBehavior.declinedPayments;

  if (outstanding > 500) riskScore += paymentWeight * 0.7;
  else if (outstanding > 200) riskScore += paymentWeight * 0.4;
  else if (outstanding > 0) riskScore += paymentWeight * 0.2;

  if (declined > 3) riskScore += paymentWeight * 0.3;
  else if (declined > 1) riskScore += paymentWeight * 0.15;

  // 4. COMMUNICATION RISK (Weight: 15%)
  const commWeight = 15;
  maxScore += commWeight;

  const responseRate =
    ((this.communicationFeatures.emailResponseRate || 0) +
      (this.communicationFeatures.smsResponseRate || 0)) /
    2;

  if (responseRate < 20) riskScore += commWeight * 0.8;
  else if (responseRate < 40) riskScore += commWeight * 0.5;
  else if (responseRate < 60) riskScore += commWeight * 0.3;

  if (this.communicationFeatures.unsubscribedFromMarketing) {
    riskScore += commWeight * 0.2;
  }

  // 5. RELATIONSHIP RISK (Weight: 10%)
  const relationshipWeight = 10;
  maxScore += relationshipWeight;

  const { practitionerChanges } = this.relationshipFeatures;

  if (practitionerChanges > 3) riskScore += relationshipWeight * 0.7;
  else if (practitionerChanges > 1) riskScore += relationshipWeight * 0.4;

  // 6. TREATMENT COMPLIANCE (Weight: 5%)
  const treatmentWeight = 5;
  maxScore += treatmentWeight;

  const compliance = this.treatmentFeatures.treatmentPlanCompliance || 50;

  if (compliance < 30) riskScore += treatmentWeight * 0.8;
  else if (compliance < 50) riskScore += treatmentWeight * 0.5;
  else if (compliance < 70) riskScore += treatmentWeight * 0.3;

  // Calculate final score (0-100 scale)
  this.churnRisk.score = Math.round((riskScore / maxScore) * 100);

  // Assign risk level
  const { score } = this.churnRisk;
  if (score >= 75) this.churnRisk.level = 'Critical';
  else if (score >= 50) this.churnRisk.level = 'High';
  else if (score >= 25) this.churnRisk.level = 'Medium';
  else this.churnRisk.level = 'Low';

  return this.churnRisk;
};

/**
 * Identify churn indicators and protective factors
 */
churnPredictionSchema.methods.identifyIndicators = function () {
  const redFlags = [];
  const protectiveFactors = [];

  // RED FLAGS
  if (this.engagementFeatures.daysSinceLastAppointment > 90) {
    redFlags.push({
      indicator: 'Extended Absence',
      severity: 'critical',
      description: `No appointment for ${this.engagementFeatures.daysSinceLastAppointment} days`,
    });
  }

  if (this.engagementFeatures.appointmentTrend === 'declining') {
    redFlags.push({
      indicator: 'Declining Engagement',
      severity: 'high',
      description: 'Appointment frequency is decreasing over time',
    });
  }

  if (this.appointmentBehavior.cancellationRate > 30) {
    redFlags.push({
      indicator: 'High Cancellation Rate',
      severity: 'high',
      description: `${this.appointmentBehavior.cancellationRate.toFixed(1)}% cancellation rate`,
    });
  }

  if (this.paymentBehavior.outstandingBalance > 200) {
    redFlags.push({
      indicator: 'Outstanding Balance',
      severity: 'medium',
      description: `$${this.paymentBehavior.outstandingBalance.toFixed(2)} outstanding`,
    });
  }

  if (this.communicationFeatures.unsubscribedFromMarketing) {
    redFlags.push({
      indicator: 'Unsubscribed from Communications',
      severity: 'medium',
      description: 'Patient has opted out of marketing communications',
    });
  }

  if (this.relationshipFeatures.practitionerChanges > 2) {
    redFlags.push({
      indicator: 'Multiple Practitioner Changes',
      severity: 'medium',
      description: `Changed practitioner ${this.relationshipFeatures.practitionerChanges} times`,
    });
  }

  // PROTECTIVE FACTORS
  if (this.engagementFeatures.totalLifetimeAppointments > 20) {
    protectiveFactors.push({
      factor: 'Established Patient',
      strength: 'strong',
      description: `${this.engagementFeatures.totalLifetimeAppointments} lifetime appointments`,
    });
  }

  if (this.paymentBehavior.totalRevenue > 2000) {
    protectiveFactors.push({
      factor: 'High Lifetime Value',
      strength: 'strong',
      description: `$${this.paymentBehavior.totalRevenue.toFixed(2)} total revenue`,
    });
  }

  if (this.relationshipFeatures.hasReferredOthers) {
    protectiveFactors.push({
      factor: 'Active Referrer',
      strength: 'strong',
      description: 'Patient has referred other patients',
    });
  }

  if (this.appointmentBehavior.completionRate > 90) {
    protectiveFactors.push({
      factor: 'High Completion Rate',
      strength: 'moderate',
      description: `${this.appointmentBehavior.completionRate.toFixed(1)}% completion rate`,
    });
  }

  if (this.relationshipFeatures.practitionerRetentionRate > 80) {
    protectiveFactors.push({
      factor: 'Strong Practitioner Relationship',
      strength: 'moderate',
      description: 'Consistent with preferred practitioner',
    });
  }

  this.churnIndicators.redFlags = redFlags;
  this.churnIndicators.protectiveFactors = protectiveFactors;
};

/**
 * Generate personalized retention strategy
 */
churnPredictionSchema.methods.generateRetentionStrategy = function () {
  const actions = [];

  const riskLevel = this.churnRisk.level;
  const daysSince = this.engagementFeatures.daysSinceLastAppointment;

  // CRITICAL RISK - Urgent interventions
  if (riskLevel === 'Critical') {
    actions.push({
      priority: 'urgent',
      action: 'Personal Phone Call',
      description: 'Have senior staff member call patient to check in and understand their needs',
      timeline: 'Within 24 hours',
      expectedImpact: 'High',
    });

    actions.push({
      priority: 'urgent',
      action: 'Special Retention Offer',
      description: 'Offer complimentary consultation or discounted session',
      timeline: 'Within 48 hours',
      expectedImpact: 'High',
    });
  }

  // HIGH RISK - Proactive outreach
  if (riskLevel === 'High' || riskLevel === 'Critical') {
    if (daysSince > 60) {
      actions.push({
        priority: 'high',
        action: 'Re-engagement Email Campaign',
        description: 'Send personalized email highlighting benefits and success stories',
        timeline: 'Within 1 week',
        expectedImpact: 'Medium',
      });
    }

    if (this.paymentBehavior.outstandingBalance > 0) {
      actions.push({
        priority: 'high',
        action: 'Payment Plan Discussion',
        description: 'Contact patient to discuss flexible payment options',
        timeline: 'Within 1 week',
        expectedImpact: 'Medium',
      });
    }
  }

  // MEDIUM RISK - Engagement activities
  if (riskLevel === 'Medium' || riskLevel === 'High') {
    actions.push({
      priority: 'medium',
      action: 'Appointment Reminder',
      description: 'Send friendly reminder about booking next appointment',
      timeline: 'Within 2 weeks',
      expectedImpact: 'Medium',
    });

    actions.push({
      priority: 'medium',
      action: 'Feedback Survey',
      description: 'Request feedback on their experience and areas for improvement',
      timeline: 'Within 2 weeks',
      expectedImpact: 'Low',
    });
  }

  // ALL RISK LEVELS - Preventive measures
  actions.push({
    priority: 'low',
    action: 'Educational Content',
    description: 'Share relevant health tips and wellness content',
    timeline: 'Ongoing',
    expectedImpact: 'Low',
  });

  if (this.relationshipFeatures.hasReferredOthers) {
    actions.push({
      priority: 'low',
      action: 'Loyalty Appreciation',
      description: 'Thank patient for referrals and offer loyalty rewards',
      timeline: 'Within 1 month',
      expectedImpact: 'Medium',
    });
  }

  this.retentionStrategy.recommendedActions = actions;
};

/**
 * Update actual outcome for prediction validation
 */
churnPredictionSchema.methods.updateOutcome = function (
  churned,
  churnDate = null,
  churnReason = null,
  details = null
) {
  this.actualOutcome.churned = churned;
  this.actualOutcome.churnDate = churnDate;
  this.actualOutcome.churnReason = churnReason;
  this.actualOutcome.churnReasonDetails = details;
  this.validatedDate = new Date();

  // Determine if prediction was accurate
  if (churned && (this.churnRisk.level === 'High' || this.churnRisk.level === 'Critical')) {
    this.predictionAccurate = true;
  } else if (!churned && (this.churnRisk.level === 'Low' || this.churnRisk.level === 'Medium')) {
    this.predictionAccurate = true;
  } else {
    this.predictionAccurate = false;
  }

  return this.save();
};

/**
 * Add retention effort
 */
churnPredictionSchema.methods.addRetentionEffort = function (
  type,
  description,
  outcome,
  performedBy
) {
  this.retentionEfforts.push({
    date: new Date(),
    type,
    description,
    outcome,
    performedBy,
  });
  return this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Extract features and generate prediction for a patient
 */
churnPredictionSchema.statics.generatePrediction = async function (patientId, calculatedBy) {
  const startTime = Date.now();
  const Patient = mongoose.model('Patient');
  const Appointment = mongoose.model('Appointment');
  const Payment = mongoose.model('Payment');

  const patient = await Patient.findById(patientId);
  if (!patient) {
    throw new Error('Patient not found');
  }

  // Get all appointments
  const appointments = await Appointment.find({ patient: patientId }).sort({ startTime: 1 });

  if (appointments.length === 0) {
    throw new Error('No appointment history for this patient');
  }

  // Get payments
  const payments = await Payment.find({ patientId, status: 'completed' });

  const now = new Date();
  const prediction = new this({
    patient: patientId,
    predictionDate: now,
    calculatedBy,
  });

  // ==================== FEATURE EXTRACTION ====================

  // 1. ENGAGEMENT FEATURES
  const lastAppointment = appointments[appointments.length - 1];
  const firstAppointment = appointments[0];
  const daysSinceLastAppt = Math.floor((now - lastAppointment.startTime) / (1000 * 60 * 60 * 24));
  const patientTenure = Math.floor((now - firstAppointment.startTime) / (1000 * 60 * 60 * 24));

  const last90Days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const last180Days = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

  const appts90 = appointments.filter((a) => a.startTime >= last90Days).length;
  const appts180 = appointments.filter((a) => a.startTime >= last180Days).length;

  const appointmentFrequency = appointments.length / Math.max(patientTenure / 30, 1); // per month

  // Calculate trend
  const appts0_90 = appts90;
  const appts90_180 = appts180 - appts90;
  let appointmentTrend = 'stable';
  if (daysSinceLastAppt > 90) {
    appointmentTrend = 'inactive';
  } else if (appts0_90 < appts90_180 * 0.7) {
    appointmentTrend = 'declining';
  } else if (appts0_90 > appts90_180 * 1.3) {
    appointmentTrend = 'increasing';
  }

  // Calculate average days between appointments
  let totalGap = 0;
  for (let i = 1; i < appointments.length; i += 1) {
    totalGap += (appointments[i].startTime - appointments[i - 1].startTime) / (1000 * 60 * 60 * 24);
  }
  const avgDaysBetween = appointments.length > 1 ? totalGap / (appointments.length - 1) : 0;

  prediction.engagementFeatures = {
    daysSinceLastAppointment: daysSinceLastAppt,
    appointmentFrequency,
    appointmentTrend,
    totalLifetimeAppointments: appointments.length,
    averageDaysBetweenAppointments: avgDaysBetween,
    last90DaysAppointments: appts90,
    last180DaysAppointments: appts180,
    engagementScore: Math.min(100, Math.max(0, 100 - daysSinceLastAppt / 2)),
  };

  // 2. APPOINTMENT BEHAVIOR
  const completed = appointments.filter((a) => a.status === 'completed').length;
  const cancelled = appointments.filter((a) => a.status === 'cancelled').length;
  const noShows = appointments.filter((a) => a.status === 'no-show').length;

  prediction.appointmentBehavior = {
    cancellationRate: (cancelled / appointments.length) * 100,
    noShowRate: (noShows / appointments.length) * 100,
    completionRate: (completed / appointments.length) * 100,
    lastMinuteCancellations: appointments.filter(
      (a) =>
        a.status === 'cancelled' &&
        a.cancelledAt &&
        a.startTime - a.cancelledAt < 24 * 60 * 60 * 1000
    ).length,
    reschedulingFrequency: 0, // Would need reschedule tracking
    averageAdvanceBooking: 7, // Placeholder
    bookingConsistency:
      avgDaysBetween < 40 ? 'regular' : avgDaysBetween < 70 ? 'irregular' : 'sporadic',
  };

  // 3. PAYMENT BEHAVIOR
  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const avgPayment = payments.length > 0 ? totalRevenue / payments.length : 0;

  prediction.paymentBehavior = {
    totalRevenue,
    averagePaymentAmount: avgPayment,
    outstandingBalance: 0, // Would need billing system integration
    paymentTimeliness: 85, // Placeholder
    latePaymentCount: 0,
    paymentMethodChanges: 0,
    declinedPayments: 0,
  };

  // 4. COMMUNICATION FEATURES
  prediction.communicationFeatures = {
    emailResponseRate: 50, // Placeholder - would need message tracking
    smsResponseRate: 60,
    reminderResponseRate: 70,
    daysSinceLastContact: daysSinceLastAppt,
    communicationPreference: 'email',
    unsubscribedFromMarketing: false,
    complaintsCount: 0,
  };

  // 5. RELATIONSHIP FEATURES
  const practitioners = [...new Set(appointments.map((a) => a.practitioner?.toString()))];
  const currentPractitioner = lastAppointment.practitioner;
  const practitionerAppts = appointments.filter(
    (a) => a.practitioner?.toString() === currentPractitioner?.toString()
  ).length;

  prediction.relationshipFeatures = {
    patientTenure,
    practitionerChanges: practitioners.length - 1,
    currentPractitioner,
    practitionerRetentionRate: (practitionerAppts / appointments.length) * 100,
    referralSource: 'organic',
    hasReferredOthers: false,
  };

  // 6. TREATMENT FEATURES
  const serviceTypes = [...new Set(appointments.map((a) => a.serviceType).filter(Boolean))];
  const primaryService = serviceTypes[0] || 'General';

  prediction.treatmentFeatures = {
    primaryServiceType: primaryService,
    serviceTypeDiversity: serviceTypes.length,
    treatmentPlanCompliance: 70, // Placeholder
    hasActiveTreatmentPlan: daysSinceLastAppt < 30,
    treatmentOutcomeSatisfaction: 4, // Placeholder
  };

  // 7. TEMPORAL FEATURES
  prediction.temporalFeatures = {
    currentMonth: now.getMonth() + 1,
    currentQuarter: Math.ceil((now.getMonth() + 1) / 3),
    dayOfWeek: now.getDay(),
    seasonalPatternScore: 50,
  };

  // 8. COMPETITIVE FEATURES
  prediction.competitiveFeatures = {
    nearbyCompetitorCount: 3,
    marketSaturation: 'medium',
    priceComparison: 'competitive',
  };

  // ==================== CALCULATE RISK ====================
  prediction.calculateChurnRisk();
  prediction.identifyIndicators();
  prediction.generateRetentionStrategy();

  prediction.calculationDuration = Date.now() - startTime;

  return prediction;
};

/**
 * Calculate model accuracy metrics
 */
churnPredictionSchema.statics.calculateModelAccuracy = async function (startDate, endDate) {
  const predictions = await this.find({
    predictionDate: { $gte: startDate, $lte: endDate },
    'actualOutcome.churned': { $exists: true },
  });

  if (predictions.length === 0) {
    return {
      totalPredictions: 0,
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1Score: 0,
    };
  }

  let truePositives = 0;
  let falsePositives = 0;
  let trueNegatives = 0;
  let falseNegatives = 0;

  predictions.forEach((pred) => {
    const predictedChurn = pred.churnRisk.level === 'High' || pred.churnRisk.level === 'Critical';
    const actualChurn = pred.actualOutcome.churned;

    if (predictedChurn && actualChurn) truePositives += 1;
    else if (predictedChurn && !actualChurn) falsePositives += 1;
    else if (!predictedChurn && !actualChurn) trueNegatives += 1;
    else if (!predictedChurn && actualChurn) falseNegatives += 1;
  });

  const accuracy = (truePositives + trueNegatives) / predictions.length;
  const precision = truePositives / (truePositives + falsePositives) || 0;
  const recall = truePositives / (truePositives + falseNegatives) || 0;
  const f1Score = (2 * precision * recall) / (precision + recall) || 0;

  return {
    totalPredictions: predictions.length,
    accuracy: accuracy * 100,
    precision,
    recall,
    f1Score,
    truePositives,
    falsePositives,
    trueNegatives,
    falseNegatives,
  };
};

/**
 * Get patients at risk
 */
churnPredictionSchema.statics.getPatientsAtRisk = async function (riskLevel = null, limit = 50) {
  const query = {};

  if (riskLevel) {
    query['churnRisk.level'] = riskLevel;
  } else {
    query['churnRisk.level'] = { $in: ['High', 'Critical'] };
  }

  return this.find(query)
    .populate('patient', 'firstName lastName email phone')
    .populate('relationshipFeatures.currentPractitioner', 'firstName lastName')
    .sort({ 'churnRisk.score': -1 })
    .limit(limit);
};

module.exports = mongoose.model('ChurnPrediction', churnPredictionSchema);
