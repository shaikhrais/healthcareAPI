const mongoose = require('mongoose');

/**
 * Patient Responsibility Estimate Model
 *
 * Stores patient cost estimates and responsibility calculations
 */

// eslint-disable-next-line no-unused-vars

const patientResponsibilityEstimateSchema = new mongoose.Schema(
  {
    // Estimate identification
    estimateNumber: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      index: true,
    },

    // Associated entities
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },

    patientInfo: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      dateOfBirth: Date,
      memberId: String,
    },

    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    providerInfo: {
      npi: String,
      name: String,
      specialty: String,
    },

    // Insurance information
    insurance: {
      payerId: { type: String, required: true },
      payerName: { type: String, required: true },
      policyNumber: { type: String, required: true },
      groupNumber: String,
      planName: String,
      planType: {
        type: String,
        enum: ['HMO', 'PPO', 'EPO', 'POS', 'HDHP', 'Medicare', 'Medicaid', 'Commercial', 'Other'],
      },
      isPrimary: { type: Boolean, default: true },
      coverageLevel: {
        type: String,
        enum: ['individual', 'family', 'employee_spouse', 'employee_children'],
      },
    },

    // Secondary insurance (if applicable)
    secondaryInsurance: {
      hasSecondary: { type: Boolean, default: false },
      payerId: String,
      payerName: String,
      policyNumber: String,
      planName: String,
    },

    // Service details
    serviceInfo: {
      serviceType: {
        type: String,
        enum: [
          'office_visit',
          'procedure',
          'surgery',
          'diagnostic_test',
          'imaging',
          'lab_work',
          'therapy',
          'preventive_care',
          'emergency',
          'urgent_care',
          'hospitalization',
          'other',
        ],
        required: true,
      },
      serviceDescription: { type: String, required: true },
      scheduledDate: Date,
      placeOfService: {
        type: String,
        enum: [
          'office',
          'hospital_outpatient',
          'hospital_inpatient',
          'emergency',
          'urgent_care',
          'home',
          'telehealth',
          'other',
        ],
      },
      isPreventive: { type: Boolean, default: false },
    },

    // Procedure codes and charges
    procedureCodes: [
      {
        code: { type: String, required: true },
        codeType: { type: String, enum: ['CPT', 'HCPCS'], default: 'CPT' },
        description: String,
        quantity: { type: Number, default: 1 },
        chargeAmount: { type: Number, required: true }, // Provider's standard charge
        allowedAmount: Number, // Insurance allowed amount (if known)
        modifier: String,
      },
    ],

    diagnosisCodes: [
      {
        code: { type: String, required: true },
        codeType: { type: String, enum: ['ICD-10', 'ICD-9'], default: 'ICD-10' },
        description: String,
        isPrimary: { type: Boolean, default: false },
      },
    ],

    // Total charges
    charges: {
      totalCharges: { type: Number, required: true }, // Sum of all procedure charges
      totalAllowedAmount: Number, // Sum of insurance allowed amounts
      contractedRate: Number, // If in-network, contracted rate
      nonContractedRate: Number, // If out-of-network, non-contracted rate
    },

    // Insurance benefit details
    benefits: {
      // Deductible
      deductible: {
        individual: Number,
        family: Number,
        individualMet: { type: Number, default: 0 },
        familyMet: { type: Number, default: 0 },
        individualRemaining: Number,
        familyRemaining: Number,
        appliesTo: {
          type: String,
          enum: ['individual', 'family', 'both'],
        },
      },

      // Out-of-pocket maximum
      outOfPocketMax: {
        individual: Number,
        family: Number,
        individualMet: { type: Number, default: 0 },
        familyMet: { type: Number, default: 0 },
        individualRemaining: Number,
        familyRemaining: Number,
      },

      // Copay
      copay: {
        hasCopay: { type: Boolean, default: false },
        amount: Number,
        appliesBeforeDeductible: { type: Boolean, default: true },
      },

      // Coinsurance
      coinsurance: {
        hasCoinsurance: { type: Boolean, default: false },
        patientPercentage: Number, // e.g., 20 for 20%
        insurancePercentage: Number, // e.g., 80 for 80%
        appliesAfterDeductible: { type: Boolean, default: true },
      },

      // Network status
      networkStatus: {
        type: String,
        enum: ['in_network', 'out_of_network', 'unknown'],
        default: 'unknown',
      },

      // Coverage status
      isCovered: { type: Boolean, default: true },
      requiresPriorAuth: { type: Boolean, default: false },
      priorAuthStatus: {
        type: String,
        enum: ['not_required', 'pending', 'approved', 'denied'],
      },

      // Special notes
      exclusions: [String],
      limitations: [String],
      notes: String,
    },

    // Patient responsibility calculation
    patientResponsibility: {
      // Deductible portion
      deductibleAmount: { type: Number, default: 0 },

      // Copay portion
      copayAmount: { type: Number, default: 0 },

      // Coinsurance portion
      coinsuranceAmount: { type: Number, default: 0 },

      // Non-covered amount
      nonCoveredAmount: { type: Number, default: 0 },

      // Out-of-network penalty
      outOfNetworkPenalty: { type: Number, default: 0 },

      // Total estimated patient responsibility
      estimatedTotal: { type: Number, required: true },

      // Minimum and maximum estimates (range)
      minimumEstimate: Number,
      maximumEstimate: Number,

      // Breakdown by procedure
      breakdownByProcedure: [
        {
          procedureCode: String,
          chargeAmount: Number,
          allowedAmount: Number,
          deductible: Number,
          copay: Number,
          coinsurance: Number,
          patientOwes: Number,
        },
      ],
    },

    // Insurance payment estimate
    insurancePayment: {
      primaryInsuranceEstimate: Number,
      secondaryInsuranceEstimate: Number,
      totalInsuranceEstimate: Number,
    },

    // Eligibility verification
    eligibilityVerification: {
      verified: { type: Boolean, default: false },
      verifiedDate: Date,
      verificationMethod: {
        type: String,
        enum: ['real_time', 'phone', 'portal', 'manual', 'not_verified'],
      },
      eligibilityStatus: {
        type: String,
        enum: ['active', 'inactive', 'unknown'],
      },
      effectiveDate: Date,
      terminationDate: Date,
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      verificationResponse: mongoose.Schema.Types.Mixed, // Store raw API response
    },

    // Estimate status
    status: {
      type: String,
      enum: [
        'draft',
        'pending_verification',
        'verified',
        'provided_to_patient',
        'accepted',
        'declined',
        'expired',
        'superseded',
      ],
      default: 'draft',
      index: true,
    },

    // Accuracy and confidence
    accuracy: {
      confidenceLevel: {
        type: String,
        enum: ['high', 'medium', 'low'],
        default: 'medium',
      },
      accuracyScore: { type: Number, min: 0, max: 100 }, // 0-100%
      estimateMethod: {
        type: String,
        enum: ['real_time_verification', 'historical_data', 'manual_calculation', 'standard_rates'],
      },
      factors: [String], // Factors affecting accuracy
      assumptions: [String], // Assumptions made in calculation
      disclaimers: [String],
    },

    // Historical comparison
    historical: {
      hasHistoricalClaims: { type: Boolean, default: false },
      similarClaimCount: Number,
      averagePatientPaid: Number,
      averageInsurancePaid: Number,
      variancePercentage: Number,
    },

    // Payment arrangements
    paymentInfo: {
      paymentRequired: {
        type: String,
        enum: ['before_service', 'at_time_of_service', 'after_service', 'none'],
      },
      depositRequired: Boolean,
      depositAmount: Number,
      paymentPlanAvailable: Boolean,
      paymentPlanTerms: String,
      financialAssistanceAvailable: Boolean,
    },

    // Communication with patient
    communication: {
      providedToPatient: { type: Boolean, default: false },
      providedDate: Date,
      providedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      deliveryMethod: {
        type: String,
        enum: ['in_person', 'email', 'phone', 'portal', 'mail'],
      },
      patientAcknowledged: { type: Boolean, default: false },
      acknowledgedDate: Date,
      patientQuestions: [String],
      patientConcerns: [String],
    },

    // Actual vs. Estimate (after service)
    actual: {
      hasActualClaim: { type: Boolean, default: false },
      claim: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Claim',
      },
      actualCharges: Number,
      actualInsurancePayment: Number,
      actualPatientResponsibility: Number,
      variance: Number, // Actual - Estimated
      variancePercentage: Number,
      varianceReason: String,
    },

    // Validity period
    validityPeriod: {
      validFrom: { type: Date, default: Date.now },
      validUntil: Date,
      isExpired: { type: Boolean, default: false },
    },

    // Superseded by newer estimate
    supersededBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PatientResponsibilityEstimate',
    },

    // Workflow
    workflow: {
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      reviewedAt: Date,
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      approvedAt: Date,
    },

    // Notes
    internalNotes: String,
    patientNotes: String,
    tags: [String],
  },
  {
    timestamps: true,
  }
);

// Indexes
// DUPLICATE INDEX - Auto-commented by deduplication tool
// patientResponsibilityEstimateSchema.index({ patient: 1, status: 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// patientResponsibilityEstimateSchema.index({ 'insurance.payerId': 1 });
patientResponsibilityEstimateSchema.index({ 'serviceInfo.scheduledDate': 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// patientResponsibilityEstimateSchema.index({ createdAt: -1 });
patientResponsibilityEstimateSchema.index({ 'validityPeriod.validUntil': 1 });

// Pre-save middleware
patientResponsibilityEstimateSchema.pre('save', function (next) {
  // Generate estimate number if not present
  if (!this.estimateNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    this.estimateNumber = `EST-${timestamp}-${random}`;
  }

  // Calculate validity period (default 30 days)
  if (!this.validityPeriod.validUntil) {
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);
    this.validityPeriod.validUntil = validUntil;
  }

  // Check if expired
  if (this.validityPeriod.validUntil && new Date() > this.validityPeriod.validUntil) {
    this.validityPeriod.isExpired = true;
    if (this.status === 'verified' || this.status === 'pending_verification') {
      this.status = 'expired';
    }
  }

  // Calculate remaining deductible
  if (this.benefits.deductible) {
    const ded = this.benefits.deductible;
    if (ded.individual !== undefined && ded.individualMet !== undefined) {
      ded.individualRemaining = Math.max(0, ded.individual - ded.individualMet);
    }
    if (ded.family !== undefined && ded.familyMet !== undefined) {
      ded.familyRemaining = Math.max(0, ded.family - ded.familyMet);
    }
  }

  // Calculate remaining out-of-pocket
  if (this.benefits.outOfPocketMax) {
    const oop = this.benefits.outOfPocketMax;
    if (oop.individual !== undefined && oop.individualMet !== undefined) {
      oop.individualRemaining = Math.max(0, oop.individual - oop.individualMet);
    }
    if (oop.family !== undefined && oop.familyMet !== undefined) {
      oop.familyRemaining = Math.max(0, oop.family - oop.familyMet);
    }
  }

  // Calculate variance if actual data exists
  if (this.actual.hasActualClaim && this.actual.actualPatientResponsibility) {
    this.actual.variance =
      this.actual.actualPatientResponsibility - this.patientResponsibility.estimatedTotal;
    if (this.patientResponsibility.estimatedTotal > 0) {
      this.actual.variancePercentage =
        (this.actual.variance / this.patientResponsibility.estimatedTotal) * 100;
    }
  }

  next();
});

// Instance methods

/**
 * Check if estimate is still valid
 */
patientResponsibilityEstimateSchema.methods.isValid = function () {
  return (
    !this.validityPeriod.isExpired &&
    new Date() <= this.validityPeriod.validUntil &&
    this.status !== 'expired' &&
    this.status !== 'superseded'
  );
};

/**
 * Get days until expiration
 */
patientResponsibilityEstimateSchema.methods.getDaysUntilExpiration = function () {
  if (!this.validityPeriod.validUntil) return null;

  const now = new Date();
  const days = Math.ceil((this.validityPeriod.validUntil - now) / (1000 * 60 * 60 * 24));

  return days;
};

/**
 * Mark as provided to patient
 */
patientResponsibilityEstimateSchema.methods.markAsProvidedToPatient = function (userId, method) {
  this.communication.providedToPatient = true;
  this.communication.providedDate = new Date();
  this.communication.providedBy = userId;
  this.communication.deliveryMethod = method;

  if (this.status === 'verified') {
    this.status = 'provided_to_patient';
  }
};

/**
 * Mark as acknowledged by patient
 */
patientResponsibilityEstimateSchema.methods.markAsAcknowledged = function () {
  this.communication.patientAcknowledged = true;
  this.communication.acknowledgedDate = new Date();

  if (this.status === 'provided_to_patient') {
    this.status = 'accepted';
  }
};

/**
 * Link actual claim data
 */
patientResponsibilityEstimateSchema.methods.linkActualClaim = function (claimData) {
  this.actual.hasActualClaim = true;
  this.actual.claim = claimData.claimId;
  this.actual.actualCharges = claimData.totalCharges;
  this.actual.actualInsurancePayment = claimData.insurancePayment;
  this.actual.actualPatientResponsibility = claimData.patientResponsibility;
  this.actual.varianceReason = claimData.varianceReason;
};

/**
 * Supersede with new estimate
 */
patientResponsibilityEstimateSchema.methods.supersede = function (newEstimateId) {
  this.status = 'superseded';
  this.supersededBy = newEstimateId;
};

/**
 * Calculate accuracy score based on actual vs. estimate
 */
patientResponsibilityEstimateSchema.methods.calculateAccuracyScore = function () {
  if (!this.actual.hasActualClaim) return null;

  const estimated = this.patientResponsibility.estimatedTotal;
  const actual = this.actual.actualPatientResponsibility;

  if (estimated === 0 && actual === 0) return 100;
  if (estimated === 0) return 0;

  const variance = Math.abs(estimated - actual);
  const percentageError = (variance / actual) * 100;

  // Score: 100 - percentage error, minimum 0
  const score = Math.max(0, 100 - percentageError);

  this.accuracy.accuracyScore = Math.round(score);
  return this.accuracy.accuracyScore;
};

/**
 * Format estimate for patient display
 */
patientResponsibilityEstimateSchema.methods.formatForPatient = function () {
  return {
    estimateNumber: this.estimateNumber,
    date: this.createdAt,
    validUntil: this.validityPeriod.validUntil,
    service: {
      type: this.serviceInfo.serviceType,
      description: this.serviceInfo.serviceDescription,
      scheduledDate: this.serviceInfo.scheduledDate,
    },
    charges: {
      totalCharges: this.charges.totalCharges,
      insuranceWillPay: this.insurancePayment.primaryInsuranceEstimate,
      youWillPay: this.patientResponsibility.estimatedTotal,
      estimateRange: {
        minimum: this.patientResponsibility.minimumEstimate,
        maximum: this.patientResponsibility.maximumEstimate,
      },
    },
    breakdown: {
      deductible: this.patientResponsibility.deductibleAmount,
      copay: this.patientResponsibility.copayAmount,
      coinsurance: this.patientResponsibility.coinsuranceAmount,
      nonCovered: this.patientResponsibility.nonCoveredAmount,
    },
    benefits: {
      deductibleRemaining: this.benefits.deductible?.individualRemaining,
      outOfPocketRemaining: this.benefits.outOfPocketMax?.individualRemaining,
      networkStatus: this.benefits.networkStatus,
    },
    disclaimers: this.accuracy.disclaimers,
    confidenceLevel: this.accuracy.confidenceLevel,
  };
};

// Static methods

/**
 * Get estimates for patient
 */
patientResponsibilityEstimateSchema.statics.getForPatient = function (patientId, options = {}) {
  const query = { patient: patientId };

  if (options.status) query.status = options.status;
  if (options.validOnly) {
    query['validityPeriod.isExpired'] = false;
    query['validityPeriod.validUntil'] = { $gte: new Date() };
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

/**
 * Get expiring estimates
 */
patientResponsibilityEstimateSchema.statics.getExpiring = function (daysThreshold = 7) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysThreshold);

  return this.find({
    status: { $in: ['verified', 'provided_to_patient'] },
    'validityPeriod.isExpired': false,
    'validityPeriod.validUntil': {
      $gte: now,
      $lte: futureDate,
    },
  })
    .populate('patient', 'firstName lastName')
    .sort({ 'validityPeriod.validUntil': 1 });
};

/**
 * Get accuracy statistics
 */
patientResponsibilityEstimateSchema.statics.getAccuracyStats = async function (startDate, endDate) {
  const filter = {
    'actual.hasActualClaim': true,
  };

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const estimates = await this.find(filter);

  if (estimates.length === 0) {
    return {
      count: 0,
      averageAccuracy: 0,
      averageVariance: 0,
    };
  }

  let totalAccuracy = 0;
  let totalVariance = 0;
  let overestimated = 0;
  let underestimated = 0;

  estimates.forEach((est) => {
    if (est.accuracy.accuracyScore) {
      totalAccuracy += est.accuracy.accuracyScore;
    }
    if (est.actual.variance !== undefined) {
      totalVariance += Math.abs(est.actual.variance);
      if (est.actual.variance > 0) underestimated += 1;
      else if (est.actual.variance < 0) overestimated += 1;
    }
  });

  return {
    count: estimates.length,
    averageAccuracy: (totalAccuracy / estimates.length).toFixed(2),
    averageVariance: (totalVariance / estimates.length).toFixed(2),
    overestimated,
    underestimated,
    accurate: estimates.length - overestimated - underestimated,
  };
};

/**
 * Get statistics
 */
patientResponsibilityEstimateSchema.statics.getStatistics = async function (startDate, endDate) {
  const filter = {};
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const [total, byStatus, byServiceType, averageEstimate, verifiedCount] = await Promise.all([
    this.countDocuments(filter),
    this.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    this.aggregate([
      { $match: filter },
      { $group: { _id: '$serviceInfo.serviceType', count: { $sum: 1 } } },
    ]),
    this.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          avgEstimate: { $avg: '$patientResponsibility.estimatedTotal' },
        },
      },
    ]),
    this.countDocuments({ ...filter, 'eligibilityVerification.verified': true }),
  ]);

  return {
    total,
    byStatus: byStatus.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    byServiceType: byServiceType.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    averageEstimate: averageEstimate[0]?.avgEstimate || 0,
    verified: verifiedCount,
    verificationRate: total > 0 ? ((verifiedCount / total) * 100).toFixed(2) : 0,
  };
};

const PatientResponsibilityEstimate = mongoose.model(
  'PatientResponsibilityEstimate',
  patientResponsibilityEstimateSchema
);

module.exports = PatientResponsibilityEstimate;
