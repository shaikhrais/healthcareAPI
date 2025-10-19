const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
const insuranceSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    isPrimary: {
      type: Boolean,
      default: true,
    },
    provider: {
      type: String,
      required: true,
      index: true,
    },
    policyNumber: {
      type: String,
      required: true,
      index: true,
    },
    groupNumber: {
      type: String,
    },
    subscriberId: {
      type: String,
    },
    subscriberName: {
      firstName: String,
      lastName: String,
      relationship: {
        type: String,
        enum: ['self', 'spouse', 'parent', 'child', 'other'],
      },
    },
    subscriberDOB: {
      type: Date,
    },
    effectiveDate: {
      type: Date,
      required: true,
    },
    expirationDate: {
      type: Date,
    },
    insuranceType: {
      type: String,
      enum: ['private', 'medicare', 'medicaid', 'workers_comp', 'other'],
      default: 'private',
    },
    planType: {
      type: String,
      enum: ['HMO', 'PPO', 'EPO', 'POS', 'HDHP', 'other'],
    },
    copay: {
      type: Number,
      min: 0,
    },
    deductible: {
      type: Number,
      min: 0,
    },
    deductibleMet: {
      type: Number,
      default: 0,
    },
    outOfPocketMax: {
      type: Number,
    },
    coverage: {
      preventive: {
        type: Number,
        default: 100, // percentage
      },
      basic: {
        type: Number,
        default: 80,
      },
      major: {
        type: Number,
        default: 50,
      },
      emergency: {
        type: Number,
        default: 80,
      },
    },
    verification: {
      status: {
        type: String,
        enum: ['not_verified', 'verified', 'invalid', 'expired', 'pending'],
        default: 'not_verified',
        index: true,
      },
      verifiedAt: Date,
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      eligibilityResponse: mongoose.Schema.Types.Mixed,
      nextVerificationDate: Date,
      autoVerify: {
        type: Boolean,
        default: false,
      },
    },
    contactInfo: {
      phone: String,
      claimsPhone: String,
      website: String,
      address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
      },
    },
    notes: {
      type: String,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending', 'terminated'],
      default: 'active',
      index: true,
    },
    cardImages: {
      front: String, // URL or path to image
      back: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for finding patient's primary insurance
insuranceSchema.index({ patientId: 1, isPrimary: 1 });

// Check if insurance is currently valid
insuranceSchema.methods.isValid = function () {
  const now = new Date();
  return (
    this.status === 'active' &&
    this.effectiveDate <= now &&
    (!this.expirationDate || this.expirationDate >= now) &&
    this.verification.status === 'verified'
  );
};

// Check if verification is needed
insuranceSchema.methods.needsVerification = function () {
  if (this.verification.status === 'not_verified') return true;
  if (this.verification.status === 'expired') return true;
  if (
    this.verification.nextVerificationDate &&
    this.verification.nextVerificationDate < new Date()
  ) {
    return true;
  }
  return false;
};

// Calculate remaining deductible
insuranceSchema.methods.getRemainingDeductible = function () {
  return Math.max(0, (this.deductible || 0) - (this.deductibleMet || 0));
};

// Get patient's primary insurance
insuranceSchema.statics.getPrimaryInsurance = async function (patientId) {
  return this.findOne({ patientId, isPrimary: true, status: 'active' });
};

// Get all active insurances for patient
insuranceSchema.statics.getActiveInsurances = async function (patientId) {
  return this.find({ patientId, status: 'active' }).sort({ isPrimary: -1, createdAt: 1 });
};

// Get insurances needing verification
insuranceSchema.statics.getNeedingVerification = async function () {
  const now = new Date();
  return this.find({
    status: 'active',
    $or: [
      { 'verification.status': 'not_verified' },
      { 'verification.status': 'expired' },
      { 'verification.nextVerificationDate': { $lte: now } },
    ],
  }).populate('patientId', 'firstName lastName dateOfBirth');
};

// Get expiring insurances (within next 30 days)
insuranceSchema.statics.getExpiringSoon = async function (days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  return this.find({
    status: 'active',
    expirationDate: {
      $gte: new Date(),
      $lte: futureDate,
    },
  }).populate('patientId', 'firstName lastName');
};

// Auto-update status based on dates
insuranceSchema.pre('save', function (next) {
  const now = new Date();

  // Auto-expire if past expiration date
  if (this.expirationDate && this.expirationDate < now && this.status === 'active') {
    this.status = 'inactive';
    this.verification.status = 'expired';
  }

  // Set next verification date if verified (verify every 90 days)
  if (this.verification.status === 'verified' && !this.verification.nextVerificationDate) {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 90);
    this.verification.nextVerificationDate = nextDate;
  }

  next();
});

module.exports = mongoose.model('Insurance', insuranceSchema);
