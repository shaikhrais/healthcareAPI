const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
const insuranceClaimSchema = new mongoose.Schema(
  {
    claimNumber: {
      type: String,
      unique: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    insuranceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Insurance',
      required: true,
      index: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      index: true,
    },
    practitionerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    serviceDate: {
      type: Date,
      required: true,
      index: true,
    },
    diagnosisCodes: [
      {
        code: String, // ICD-10 code
        description: String,
      },
    ],
    procedureCodes: [
      {
        code: String, // CPT code
        description: String,
        quantity: {
          type: Number,
          default: 1,
        },
        chargeAmount: {
          type: Number,
          required: true,
        },
      },
    ],
    totalBilledAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    totalApprovedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPaidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    patientResponsibility: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: [
        'draft',
        'submitted',
        'pending',
        'processing',
        'approved',
        'partially_approved',
        'denied',
        'appealed',
        'paid',
        'closed',
      ],
      default: 'draft',
      index: true,
    },
    submissionMethod: {
      type: String,
      enum: ['electronic', 'paper', 'portal'],
      default: 'electronic',
    },
    submittedAt: {
      type: Date,
      index: true,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    receivedAt: {
      type: Date,
    },
    processedAt: {
      type: Date,
    },
    paidAt: {
      type: Date,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },
    denialReason: {
      code: String,
      description: String,
    },
    adjustments: [
      {
        type: {
          type: String,
          enum: ['contractual', 'deductible', 'copay', 'coinsurance', 'other'],
        },
        amount: Number,
        reason: String,
        date: Date,
      },
    ],
    eob: {
      // Explanation of Benefits
      received: {
        type: Boolean,
        default: false,
      },
      receivedDate: Date,
      documentUrl: String,
    },
    claimNotes: [
      {
        note: String,
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        isInternal: {
          type: Boolean,
          default: true,
        },
      },
    ],
    appealInfo: {
      isAppealed: {
        type: Boolean,
        default: false,
      },
      appealDate: Date,
      appealReason: String,
      appealStatus: {
        type: String,
        enum: ['pending', 'approved', 'denied'],
      },
      appealOutcome: String,
    },
    electronicSubmission: {
      transactionId: String,
      clearinghouseId: String,
      claimStatusCode: String,
      lastChecked: Date,
    },
    remittanceAdvice: {
      received: Boolean,
      raNumber: String,
      receivedDate: Date,
      documentUrl: String,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate claim number
insuranceClaimSchema.pre('save', async function (next) {
  if (!this.claimNumber) {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const count = await this.constructor.countDocuments({
      createdAt: {
        $gte: new Date(year, new Date().getMonth(), 1),
      },
    });
    this.claimNumber = `CLM-${year}${month}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Calculate patient responsibility
insuranceClaimSchema.methods.calculatePatientResponsibility = function () {
  const approved = this.totalApprovedAmount || 0;
  const paid = this.totalPaidAmount || 0;
  const adjustments = this.adjustments.reduce((sum, adj) => {
    return sum + (adj.amount || 0);
  }, 0);

  this.patientResponsibility = Math.max(0, approved - paid - adjustments);
  return this.patientResponsibility;
};

// Check if claim is overdue (more than 30 days pending)
insuranceClaimSchema.methods.isOverdue = function () {
  if (!this.submittedAt || this.status === 'paid' || this.status === 'closed') {
    return false;
  }

  const daysPending = Math.floor((Date.now() - this.submittedAt) / (1000 * 60 * 60 * 24));
  return daysPending > 30;
};

// Get claims by status
insuranceClaimSchema.statics.getByStatus = async function (status) {
  return this.find({ status })
    .populate('patientId', 'firstName lastName')
    .populate('insuranceId', 'provider policyNumber')
    .populate('practitionerId', 'firstName lastName')
    .sort({ submittedAt: -1 });
};

// Get pending claims
insuranceClaimSchema.statics.getPendingClaims = async function () {
  return this.find({
    status: { $in: ['submitted', 'pending', 'processing'] },
  })
    .populate('patientId', 'firstName lastName')
    .populate('insuranceId', 'provider policyNumber')
    .sort({ submittedAt: 1 });
};

// Get overdue claims
insuranceClaimSchema.statics.getOverdueClaims = async function () {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return this.find({
    status: { $in: ['submitted', 'pending', 'processing'] },
    submittedAt: { $lte: thirtyDaysAgo },
  })
    .populate('patientId', 'firstName lastName')
    .populate('insuranceId', 'provider policyNumber')
    .sort({ submittedAt: 1 });
};

// Get denied claims
insuranceClaimSchema.statics.getDeniedClaims = async function () {
  return this.find({ status: 'denied' })
    .populate('patientId', 'firstName lastName')
    .populate('insuranceId', 'provider policyNumber')
    .sort({ processedAt: -1 });
};

// Get claims revenue summary
insuranceClaimSchema.statics.getRevenueSummary = async function (startDate, endDate) {
  const match = {
    serviceDate: { $gte: startDate, $lte: endDate },
  };

  const summary = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalBilled: { $sum: '$totalBilledAmount' },
        totalApproved: { $sum: '$totalApprovedAmount' },
        totalPaid: { $sum: '$totalPaidAmount' },
      },
    },
  ]);

  return summary;
};

// Get patient's claim history
insuranceClaimSchema.statics.getPatientClaims = async function (patientId, limit = 50) {
  return this.find({ patientId })
    .sort({ serviceDate: -1 })
    .limit(limit)
    .populate('insuranceId', 'provider policyNumber')
    .populate('practitionerId', 'firstName lastName');
};

// Get claims needing follow-up (submitted > 14 days ago, still pending)
insuranceClaimSchema.statics.getNeedingFollowup = async function () {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  return this.find({
    status: { $in: ['submitted', 'pending'] },
    submittedAt: { $lte: fourteenDaysAgo },
  })
    .populate('patientId', 'firstName lastName')
    .populate('insuranceId', 'provider policyNumber')
    .sort({ submittedAt: 1 });
};

module.exports = mongoose.model('InsuranceClaim', insuranceClaimSchema);
