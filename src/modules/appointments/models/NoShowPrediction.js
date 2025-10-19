const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
/**
 * NoShowPrediction Model
 * Stores individual appointment no-show predictions
 */
const noShowPredictionSchema = new mongoose.Schema(
  {
    // Appointment Reference
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    practitioner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Prediction Details
    predictionDate: {
      type: Date,
      default: Date.now,
    },
    appointmentDate: Date,

    // Risk Assessment
    riskScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    riskLevel: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Very High'],
      required: true,
    },
    probability: {
      type: Number,
      min: 0,
      max: 1,
    },

    // Features Used in Prediction
    features: {
      // Patient History Features
      patientNoShowRate: Number,
      patientCancellationRate: Number,
      patientTotalAppointments: Number,
      patientCompletedAppointments: Number,
      daysSinceLastAppointment: Number,
      daysSinceLastNoShow: Number,
      consecutiveCompletedAppointments: Number,

      // Appointment Characteristics
      appointmentType: String,
      serviceType: String,
      isVirtual: Boolean,
      duration: Number,
      dayOfWeek: String,
      timeOfDay: String,
      hourOfDay: Number,
      isWeekend: Boolean,
      isHoliday: Boolean,

      // Booking Characteristics
      daysInAdvance: Number,
      bookedVia: String,
      isRecurring: Boolean,
      confirmationSent: Boolean,
      remindersSent: Number,

      // Practitioner Features
      practitionerNoShowRate: Number,

      // Weather/External (placeholder)
      weatherCondition: String,
      temperature: Number,

      // Time-based Features
      monthOfYear: Number,
      seasonOfYear: String,
    },

    // Prediction Confidence
    confidence: {
      type: Number,
      min: 0,
      max: 1,
    },

    // Model Information
    modelVersion: {
      type: String,
      default: '1.0',
    },
    algorithmUsed: {
      type: String,
      enum: ['rule-based', 'logistic-regression', 'random-forest', 'neural-network', 'ensemble'],
      default: 'rule-based',
    },

    // Contributing Factors (top risk factors)
    riskFactors: [
      {
        factor: String,
        impact: {
          type: String,
          enum: ['High', 'Medium', 'Low'],
        },
        weight: Number,
        description: String,
      },
    ],

    // Recommendations
    recommendations: [
      {
        action: String,
        priority: {
          type: String,
          enum: ['High', 'Medium', 'Low'],
        },
        description: String,
      },
    ],

    // Actual Outcome (filled after appointment time)
    actualOutcome: {
      type: String,
      enum: ['attended', 'no-show', 'cancelled', 'pending'],
      default: 'pending',
    },
    actualOutcomeDate: Date,

    // Prediction Accuracy (after actual outcome known)
    predictionAccurate: Boolean,

    // Interventions Taken
    interventions: [
      {
        type: {
          type: String,
          enum: [
            'reminder-call',
            'reminder-sms',
            'reminder-email',
            'confirmation-required',
            'deposit-required',
            'other',
          ],
        },
        takenAt: Date,
        takenBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        notes: String,
        effective: Boolean,
      },
    ],

    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
// DUPLICATE INDEX - Auto-commented by deduplication tool
// noShowPredictionSchema.index({ appointment: 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// noShowPredictionSchema.index({ patient: 1, predictionDate: -1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// noShowPredictionSchema.index({ riskLevel: 1, appointmentDate: 1 });
noShowPredictionSchema.index({ riskScore: -1 });
noShowPredictionSchema.index({ actualOutcome: 1 });
noShowPredictionSchema.index({ appointmentDate: 1, riskLevel: 1 });

// Method to add intervention
noShowPredictionSchema.methods.addIntervention = function (interventionData) {
  this.interventions.push({
    ...interventionData,
    takenAt: new Date(),
  });
  return this.save();
};

// Method to update actual outcome
noShowPredictionSchema.methods.updateActualOutcome = function (outcome) {
  this.actualOutcome = outcome;
  this.actualOutcomeDate = new Date();

  // Determine if prediction was accurate
  if (outcome === 'attended') {
    this.predictionAccurate = this.riskLevel === 'Low' || this.riskLevel === 'Medium';
  } else if (outcome === 'no-show') {
    this.predictionAccurate = this.riskLevel === 'High' || this.riskLevel === 'Very High';
  }

  return this.save();
};

// Static method to calculate model accuracy
noShowPredictionSchema.statics.calculateModelAccuracy = async function (startDate, endDate) {
  const predictions = await this.find({
    appointmentDate: {
      $gte: startDate,
      $lte: endDate,
    },
    actualOutcome: { $in: ['attended', 'no-show'] },
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

  let truePositives = 0; // Predicted no-show, actual no-show
  let falsePositives = 0; // Predicted no-show, actual attended
  let trueNegatives = 0; // Predicted attend, actual attended
  let falseNegatives = 0; // Predicted attend, actual no-show

  predictions.forEach((pred) => {
    const predictedNoShow = pred.riskLevel === 'High' || pred.riskLevel === 'Very High';
    const actualNoShow = pred.actualOutcome === 'no-show';

    if (predictedNoShow && actualNoShow) truePositives += 1;
    else if (predictedNoShow && !actualNoShow) falsePositives += 1;
    else if (!predictedNoShow && !actualNoShow) trueNegatives += 1;
    else if (!predictedNoShow && actualNoShow) falseNegatives += 1;
  });

  const accuracy = (truePositives + trueNegatives) / predictions.length;
  const precision = truePositives / (truePositives + falsePositives) || 0;
  const recall = truePositives / (truePositives + falseNegatives) || 0;
  const f1Score = (2 * precision * recall) / (precision + recall) || 0;

  return {
    totalPredictions: predictions.length,
    accuracy: accuracy * 100,
    precision: precision * 100,
    recall: recall * 100,
    f1Score: f1Score * 100,
    truePositives,
    falsePositives,
    trueNegatives,
    falseNegatives,
  };
};

module.exports = mongoose.model('NoShowPrediction', noShowPredictionSchema);
