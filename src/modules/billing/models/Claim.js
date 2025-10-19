const mongoose = require('mongoose');

/**
 * Claim Model
 *
 * Represents an insurance claim for billing and payments
 */

// eslint-disable-next-line no-unused-vars

const procedureSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    charge: {
      type: Number,
      required: true,
      min: 0,
    },
    units: {
      type: Number,
      default: 1,
      min: 1,
    },
    modifiers: [
      {
        type: String,
        trim: true,
      },
    ],
    diagnosisPointers: [
      {
        type: Number,
        min: 1,
      },
    ],
    placeOfService: {
      type: String,
      trim: true,
    },
    serviceDate: {
      type: Date,
    },
  },
  { _id: false }
);

const claimSchema = new mongoose.Schema(
  {
    // Claim identification
    claimNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    // Status
    status: {
      type: String,
      enum: ['draft', 'scrubbing', 'ready', 'submitted', 'accepted', 'rejected', 'paid', 'denied'],
      default: 'draft',
      required: true,
    },

    submissionStatus: {
      type: String,
      enum: ['not_submitted', 'pending', 'clearing_house', 'sent_to_payer', 'acknowledged'],
      default: 'not_submitted',
    },

    // Patient information
    patient: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      firstName: {
        type: String,
        required: true,
        trim: true,
      },
      lastName: {
        type: String,
        required: true,
        trim: true,
      },
      dateOfBirth: {
        type: Date,
        required: true,
      },
      gender: {
        type: String,
        enum: ['M', 'F', 'U', 'male', 'female', 'unknown'],
        required: true,
      },
      address: {
        street: { type: String, trim: true },
        street2: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        zipCode: { type: String, trim: true },
        country: { type: String, default: 'US', trim: true },
      },
      phone: {
        type: String,
        trim: true,
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
      },
    },

    // Provider information
    provider: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      firstName: {
        type: String,
        trim: true,
      },
      lastName: {
        type: String,
        trim: true,
      },
      npi: {
        type: String,
        required: true,
        trim: true,
      },
      taxId: {
        type: String,
        required: true,
        trim: true,
      },
      specialty: {
        type: String,
        trim: true,
      },
      address: {
        street: { type: String, trim: true },
        street2: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        zipCode: { type: String, trim: true },
      },
      phone: {
        type: String,
        trim: true,
      },
    },

    // Facility information
    facility: {
      name: {
        type: String,
        trim: true,
      },
      npi: {
        type: String,
        trim: true,
      },
      address: {
        street: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        zipCode: { type: String, trim: true },
      },
    },

    // Insurance information
    insurance: {
      payerId: {
        type: String,
        required: true,
        trim: true,
      },
      payerName: {
        type: String,
        trim: true,
      },
      policyNumber: {
        type: String,
        required: true,
        trim: true,
      },
      groupNumber: {
        type: String,
        trim: true,
      },
      planName: {
        type: String,
        trim: true,
      },
      relationshipToInsured: {
        type: String,
        enum: ['self', 'spouse', 'child', 'other'],
        default: 'self',
      },
      insured: {
        firstName: { type: String, trim: true },
        lastName: { type: String, trim: true },
        dateOfBirth: { type: Date },
      },
      coverageStart: {
        type: Date,
      },
      coverageEnd: {
        type: Date,
      },
      timelyFilingLimit: {
        type: Number,
        default: 90, // days
      },
    },

    // Secondary insurance (if applicable)
    secondaryInsurance: {
      hasSecondary: {
        type: Boolean,
        default: false,
      },
      payerId: {
        type: String,
        trim: true,
      },
      payerName: {
        type: String,
        trim: true,
      },
      policyNumber: {
        type: String,
        trim: true,
      },
      groupNumber: {
        type: String,
        trim: true,
      },
      planName: {
        type: String,
        trim: true,
      },
      relationshipToInsured: {
        type: String,
        enum: ['self', 'spouse', 'child', 'other'],
      },
      insured: {
        firstName: { type: String, trim: true },
        lastName: { type: String, trim: true },
        dateOfBirth: { type: Date },
      },
      coverageStart: {
        type: Date,
      },
      coverageEnd: {
        type: Date,
      },
      timelyFilingLimit: {
        type: Number,
        default: 90,
      },
      cobOrder: {
        type: Number, // 2 for secondary, 3 for tertiary
        default: 2,
      },
    },

    // Coordination of Benefits (COB)
    cob: {
      isPrimary: {
        type: Boolean,
        default: true,
      },
      isSecondary: {
        type: Boolean,
        default: false,
      },
      primaryClaimId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Claim',
      },
      secondaryClaimId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Claim',
      },
      primaryPayment: {
        amount: { type: Number, default: 0 },
        date: { type: Date },
        eobReceived: { type: Boolean, default: false },
        eobDocument: { type: String }, // URL or file path
      },
      patientResponsibilityFromPrimary: {
        type: Number,
        default: 0,
      },
      secondaryFilingDate: {
        type: Date,
      },
    },

    // Service information
    serviceDate: {
      type: Date,
      required: true,
    },

    serviceDateEnd: {
      type: Date,
    },

    placeOfService: {
      type: String,
      required: true,
    },

    // Diagnosis codes
    diagnosisCodes: [
      {
        type: String,
        required: true,
        trim: true,
      },
    ],

    // Procedure codes
    procedures: {
      type: [procedureSchema],
      required: true,
      validate: {
        validator(v) {
          return v && v.length > 0;
        },
        message: 'At least one procedure is required',
      },
    },

    // Billing information
    totalCharges: {
      type: Number,
      required: true,
      min: 0,
    },

    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },

    patientResponsibility: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Authorization
    priorAuthNumber: {
      type: String,
      trim: true,
    },

    referralNumber: {
      type: String,
      trim: true,
    },

    // Additional information
    notes: {
      type: String,
      trim: true,
    },

    attachments: [
      {
        type: {
          type: String,
          enum: ['medical_records', 'lab_results', 'imaging', 'authorization', 'other'],
        },
        filename: String,
        url: String,
        uploadDate: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Scrubbing information
    scrubbing: {
      lastScrubDate: {
        type: Date,
      },
      status: {
        type: String,
        enum: ['not_scrubbed', 'pass', 'pass_with_warnings', 'fail', 'fixed'],
        default: 'not_scrubbed',
      },
      errorCount: {
        type: Number,
        default: 0,
      },
      warningCount: {
        type: Number,
        default: 0,
      },
      autoFixedCount: {
        type: Number,
        default: 0,
      },
      report: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ScrubReport',
      },
    },

    // Submission tracking
    submission: {
      submittedDate: {
        type: Date,
      },
      submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      clearingHouse: {
        type: String,
        trim: true,
      },
      trackingNumber: {
        type: String,
        trim: true,
      },
      acknowledgedDate: {
        type: Date,
      },
    },

    // Payment tracking
    payment: {
      receivedDate: {
        type: Date,
      },
      checkNumber: {
        type: String,
        trim: true,
      },
      eraNumber: {
        type: String,
        trim: true,
      },
      adjustments: [
        {
          code: String,
          amount: Number,
          reason: String,
        },
      ],
      denialReason: {
        type: String,
        trim: true,
      },
      denialCode: {
        type: String,
        trim: true,
      },
    },

    // Resubmission tracking
    resubmission: {
      isResubmission: {
        type: Boolean,
        default: false,
      },
      originalClaimId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Claim',
      },
      resubmissionReason: {
        type: String,
        trim: true,
      },
      resubmissionCount: {
        type: Number,
        default: 0,
      },
    },

    // Audit trail
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Metadata
    metadata: {
      source: {
        type: String,
        enum: ['manual', 'ehr', 'api', 'import'],
        default: 'manual',
      },
      version: {
        type: Number,
        default: 1,
      },
      tags: [
        {
          type: String,
          trim: true,
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
claimSchema.index({ 'patient.id': 1, serviceDate: -1 });
claimSchema.index({ status: 1, submissionStatus: 1 });
claimSchema.index({ serviceDate: 1 });
claimSchema.index({ 'insurance.payerId': 1 });
claimSchema.index({ 'provider.id': 1, serviceDate: -1 });
claimSchema.index({ claimNumber: 1 });
claimSchema.index({ 'scrubbing.status': 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// claimSchema.index({ createdAt: -1 });
claimSchema.index({ 'cob.isPrimary': 1, 'secondaryInsurance.hasSecondary': 1, status: 1 });
claimSchema.index({ 'cob.primaryClaimId': 1 });
claimSchema.index({ 'cob.secondaryClaimId': 1 });

// Virtual for full patient name
claimSchema.virtual('patient.fullName').get(function () {
  return `${this.patient.firstName} ${this.patient.lastName}`;
});

// Virtual for full provider name
claimSchema.virtual('provider.fullName').get(function () {
  return `${this.provider.firstName || ''} ${this.provider.lastName || ''}`.trim();
});

// Virtual for calculated totals
claimSchema.virtual('calculatedTotalCharges').get(function () {
  return this.procedures.reduce((sum, proc) => sum + proc.charge * (proc.units || 1), 0);
});

// Pre-save middleware
claimSchema.pre('save', async function (next) {
  // Generate claim number if not exists
  if (!this.claimNumber && this.isNew) {
    const count = await mongoose.model('Claim').countDocuments();
    const timestamp = Date.now().toString().slice(-6);
    this.claimNumber = `CLM-${timestamp}-${(count + 1).toString().padStart(5, '0')}`;
  }

  // Calculate total charges if not set
  if (!this.totalCharges || this.totalCharges === 0) {
    this.totalCharges = this.calculatedTotalCharges;
  }

  // Set service date end if not set
  if (!this.serviceDateEnd) {
    this.serviceDateEnd = this.serviceDate;
  }

  next();
});

// Instance methods

/**
 * Check if claim is ready for submission
 */
claimSchema.methods.isReadyForSubmission = function () {
  return (
    this.scrubbing.status === 'pass' ||
    this.scrubbing.status === 'pass_with_warnings' ||
    this.scrubbing.status === 'fixed'
  );
};

/**
 * Check if claim is within timely filing limit
 */
claimSchema.methods.isWithinTimelyFiling = function () {
  const timelyFilingLimit = this.insurance.timelyFilingLimit || 90;
  const daysSinceService = Math.floor(
    (Date.now() - this.serviceDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysSinceService <= timelyFilingLimit;
};

/**
 * Get days until timely filing deadline
 */
claimSchema.methods.getDaysUntilTimelyFiling = function () {
  const timelyFilingLimit = this.insurance.timelyFilingLimit || 90;
  const daysSinceService = Math.floor(
    (Date.now() - this.serviceDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.max(0, timelyFilingLimit - daysSinceService);
};

/**
 * Mark as submitted
 */
claimSchema.methods.markAsSubmitted = function (submittedBy, trackingNumber = null) {
  this.status = 'submitted';
  this.submissionStatus = 'pending';
  this.submission.submittedDate = new Date();
  this.submission.submittedBy = submittedBy;
  if (trackingNumber) {
    this.submission.trackingNumber = trackingNumber;
  }
};

/**
 * Mark as paid
 */
claimSchema.methods.markAsPaid = function (amount, checkNumber = null, eraNumber = null) {
  this.status = 'paid';
  this.amountPaid = amount;
  this.payment.receivedDate = new Date();
  if (checkNumber) this.payment.checkNumber = checkNumber;
  if (eraNumber) this.payment.eraNumber = eraNumber;
};

/**
 * Mark as denied
 */
claimSchema.methods.markAsDenied = function (reason, code = null) {
  this.status = 'denied';
  this.payment.denialReason = reason;
  if (code) this.payment.denialCode = code;
};

/**
 * Create resubmission claim
 */
claimSchema.methods.createResubmission = async function (reason, changes = {}) {
  const resubmissionData = this.toObject();
  delete resubmissionData._id;
  delete resubmissionData.claimNumber;
  delete resubmissionData.submission;
  delete resubmissionData.payment;
  delete resubmissionData.createdAt;
  delete resubmissionData.updatedAt;

  // Apply changes
  Object.assign(resubmissionData, changes);

  // Set resubmission fields
  resubmissionData.status = 'draft';
  resubmissionData.resubmission = {
    isResubmission: true,
    originalClaimId: this._id,
    resubmissionReason: reason,
    resubmissionCount: (this.resubmission?.resubmissionCount || 0) + 1,
  };

  const Claim = mongoose.model('Claim');
  return new Claim(resubmissionData);
};

// Static methods

/**
 * Get claims pending scrubbing
 */
claimSchema.statics.getPendingScrubbing = function () {
  return this.find({
    status: 'draft',
    'scrubbing.status': { $in: ['not_scrubbed', 'fail'] },
  });
};

/**
 * Get ready to submit claims
 */
claimSchema.statics.getReadyToSubmit = function () {
  return this.find({
    status: { $in: ['draft', 'ready'] },
    'scrubbing.status': { $in: ['pass', 'pass_with_warnings', 'fixed'] },
  });
};

/**
 * Get claims by status
 */
claimSchema.statics.getByStatus = function (status) {
  return this.find({ status });
};

/**
 * Get claims approaching timely filing deadline
 */
claimSchema.statics.getApproachingDeadline = function (daysThreshold = 10) {
  const now = new Date();

  return this.find({
    status: { $in: ['draft', 'ready', 'scrubbing'] },
  }).then((claims) => {
    return claims.filter((claim) => {
      const daysRemaining = claim.getDaysUntilTimelyFiling();
      return daysRemaining <= daysThreshold && daysRemaining > 0;
    });
  });
};

/**
 * Get primary claims ready for secondary filing
 */
claimSchema.statics.getReadyForSecondary = function () {
  return this.find({
    'cob.isPrimary': true,
    'secondaryInsurance.hasSecondary': true,
    'cob.primaryPayment.eobReceived': true,
    'cob.secondaryClaimId': { $exists: false },
    status: 'paid',
  });
};

/**
 * Get claims with secondary insurance
 */
claimSchema.statics.getWithSecondaryInsurance = function () {
  return this.find({
    'secondaryInsurance.hasSecondary': true,
  });
};

const Claim = mongoose.model('Claim', claimSchema);

module.exports = Claim;
