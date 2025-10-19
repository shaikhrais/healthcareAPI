const mongoose = require('mongoose');

/**
 * Assistance Application Model
 *
 * Tracks individual patient applications for financial assistance programs
 * including eligibility determination, documentation, and approval workflow
 */

// eslint-disable-next-line no-unused-vars

const assistanceApplicationSchema = new mongoose.Schema(
  {
    // Application identification
    applicationNumber: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    // Associated records
    program: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FinancialAssistanceProgram',
      required: true,
      index: true,
    },

    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },

    // Associated financial records
    claims: [
      {
        claimId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Claim',
        },
        claimNumber: String,
        serviceDate: Date,
        amount: Number,
      },
    ],

    invoices: [
      {
        invoiceNumber: String,
        invoiceDate: Date,
        amount: Number,
      },
    ],

    // Application status
    status: {
      type: String,
      enum: [
        'draft', // Started but not submitted
        'submitted', // Submitted, awaiting review
        'under_review', // Being reviewed
        'pending_documents', // Awaiting additional documentation
        'pending_verification', // Awaiting income/asset verification
        'pending_approval', // Ready for approval decision
        'approved', // Approved
        'active', // Active assistance in use
        'denied', // Denied
        'expired', // Approval expired
        'exhausted', // Assistance fully used
        'appealed', // Denial appealed
        'cancelled', // Cancelled by patient
      ],
      default: 'draft',
      required: true,
      index: true,
    },

    statusHistory: [
      {
        status: String,
        changedDate: { type: Date, default: Date.now },
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        reason: String,
        notes: String,
      },
    ],

    // Applicant information
    applicant: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      dateOfBirth: Date,
      ssn: String, // Last 4 digits only

      contactInfo: {
        email: String,
        phone: String,
        alternatePhone: String,
        address: {
          street: String,
          apartment: String,
          city: String,
          state: String,
          zipCode: String,
        },
      },

      employmentStatus: {
        type: String,
        enum: [
          'employed',
          'unemployed',
          'self_employed',
          'retired',
          'disabled',
          'student',
          'other',
        ],
      },

      employerName: String,
      occupation: String,
    },

    // Household information
    household: {
      householdSize: {
        type: Number,
        required: true,
        min: 1,
      },

      members: [
        {
          relationship: {
            type: String,
            enum: ['self', 'spouse', 'child', 'parent', 'sibling', 'other'],
          },
          firstName: String,
          lastName: String,
          dateOfBirth: Date,
          employed: Boolean,
          income: Number,
        },
      ],

      totalHouseholdIncome: {
        type: Number,
        required: true,
        min: 0,
      },

      incomeFrequency: {
        type: String,
        enum: ['annual', 'monthly', 'biweekly', 'weekly'],
        default: 'annual',
      },

      // Income breakdown
      incomeSources: [
        {
          source: {
            type: String,
            enum: [
              'employment',
              'self_employment',
              'social_security',
              'disability',
              'unemployment',
              'pension',
              'investment',
              'rental',
              'alimony',
              'child_support',
              'other',
            ],
          },
          amount: Number,
          frequency: String,
          description: String,
        },
      ],

      // Monthly expenses
      monthlyExpenses: {
        housing: Number,
        utilities: Number,
        food: Number,
        transportation: Number,
        medical: Number,
        debt: Number,
        other: Number,
        total: Number,
      },
    },

    // Assets
    assets: {
      liquidAssets: {
        checkingAccounts: Number,
        savingsAccounts: Number,
        cashOnHand: Number,
        stocks: Number,
        bonds: Number,
        other: Number,
        total: Number,
      },

      realEstate: {
        primaryResidence: {
          owned: Boolean,
          value: Number,
          mortgage: Number,
        },
        otherProperties: [
          {
            type: String,
            value: Number,
            mortgage: Number,
          },
        ],
      },

      vehicles: [
        {
          year: Number,
          make: String,
          model: String,
          value: Number,
          loanBalance: Number,
        },
      ],

      otherAssets: [
        {
          description: String,
          value: Number,
        },
      ],
    },

    // Insurance information
    insurance: {
      status: {
        type: String,
        enum: ['insured', 'uninsured', 'underinsured'],
      },

      primaryInsurance: {
        carrierName: String,
        policyNumber: String,
        groupNumber: String,
        effectiveDate: Date,
        policyType: String,
      },

      secondaryInsurance: {
        carrierName: String,
        policyNumber: String,
        groupNumber: String,
      },

      hasHealthExchange: Boolean,
      medicareEligible: Boolean,
      medicaidEligible: Boolean,
      appliedForPublicCoverage: Boolean,
    },

    // Medical necessity and circumstances
    medicalCircumstances: {
      reasonForCare: String,
      diagnosis: String,
      urgency: {
        type: String,
        enum: ['emergency', 'urgent', 'routine'],
      },

      catastrophicExpenses: {
        type: Boolean,
        default: false,
      },

      totalMedicalDebt: Number,

      priorDenials: Boolean,
      denialReasons: String,

      specialCircumstances: String,
    },

    // Financial details
    financial: {
      requestedAmount: {
        type: Number,
        required: true,
        min: 0,
      },

      // Calculated eligibility
      eligibilityDetermination: {
        percentOfFPL: Number,
        fplForHousehold: Number,
        eligibilityTier: String,
        recommendedDiscount: Number,
        calculatedDate: Date,
        calculatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },

      // Approved assistance
      approvedDiscount: Number,
      approvedPercentage: Number,
      approvedAmount: Number, // Original amount minus discount

      // Usage tracking
      usedAmount: {
        type: Number,
        default: 0,
      },

      remainingAmount: Number,

      // Effective dates
      effectiveDate: Date,
      expirationDate: Date,
    },

    // Documentation
    documents: [
      {
        documentType: {
          type: String,
          enum: [
            'proof_of_income',
            'tax_return',
            'pay_stubs',
            'bank_statements',
            'unemployment_letter',
            'social_security_statement',
            'disability_statement',
            'proof_of_residency',
            'government_id',
            'insurance_cards',
            'medical_bills',
            'denial_letter',
            'application_form',
            'other',
          ],
          required: true,
        },

        fileName: String,
        fileUrl: String,
        fileSize: Number,
        mimeType: String,

        uploadedDate: {
          type: Date,
          default: Date.now,
        },

        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },

        verified: {
          type: Boolean,
          default: false,
        },

        verifiedDate: Date,
        verifiedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },

        notes: String,
      },
    ],

    // Self-attestation
    selfAttestation: {
      used: {
        type: Boolean,
        default: false,
      },

      attestationDate: Date,

      attestationText: String,

      signature: String, // Base64 or URL

      ipAddress: String,
      userAgent: String,
    },

    // Verification
    verification: {
      incomeVerified: {
        type: Boolean,
        default: false,
      },

      incomeVerificationMethod: {
        type: String,
        enum: ['documents', 'third_party', 'employer_contact', 'self_attestation'],
      },

      incomeVerifiedDate: Date,
      incomeVerifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },

      residencyVerified: Boolean,
      residencyVerifiedDate: Date,

      identityVerified: Boolean,
      identityVerifiedDate: Date,

      verificationNotes: String,
    },

    // Review and approval
    review: {
      assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
      },

      assignedDate: Date,

      reviewStartedDate: Date,
      reviewCompletedDate: Date,

      reviewNotes: String,

      recommendation: {
        type: String,
        enum: ['approve', 'deny', 'request_more_info'],
      },

      recommendationReason: String,
    },

    // Approval decision
    approval: {
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },

      approvalDate: Date,

      approvalNotes: String,

      // Second approval (if required)
      secondApprovalRequired: Boolean,

      secondApprovedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },

      secondApprovalDate: Date,
    },

    // Denial
    denial: {
      deniedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },

      denialDate: Date,

      denialReasons: [
        {
          type: String,
          enum: [
            'exceeds_income_limit',
            'exceeds_asset_limit',
            'outside_service_area',
            'insured_patient',
            'ineligible_service',
            'insufficient_documentation',
            'prior_assistance_limit',
            'program_budget_exceeded',
            'duplicate_application',
            'other',
          ],
        },
      ],

      denialNotes: String,

      appealable: {
        type: Boolean,
        default: true,
      },

      appealDeadline: Date,
    },

    // Appeal
    appeal: {
      appealed: {
        type: Boolean,
        default: false,
      },

      appealDate: Date,

      appealReason: String,

      appealDocuments: [String],

      appealReviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },

      appealReviewDate: Date,

      appealDecision: {
        type: String,
        enum: ['upheld', 'overturned'],
      },

      appealDecisionNotes: String,
    },

    // Usage tracking (for ongoing assistance)
    usage: [
      {
        usageDate: Date,

        claimId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Claim',
        },

        invoiceId: String,

        serviceDate: Date,
        serviceDescription: String,

        originalAmount: Number,
        discountAmount: Number,
        patientResponsibility: Number,

        recordedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },

        notes: String,
      },
    ],

    // Alerts and notifications
    alerts: [
      {
        type: String,
        message: String,
        severity: String,
        createdAt: { type: Date, default: Date.now },
        acknowledged: Boolean,
      },
    ],

    // Communication log
    communications: [
      {
        date: {
          type: Date,
          default: Date.now,
        },

        method: {
          type: String,
          enum: ['phone', 'email', 'mail', 'in_person', 'portal'],
        },

        direction: {
          type: String,
          enum: ['inbound', 'outbound'],
        },

        subject: String,
        summary: String,

        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],

    // Consent and agreements
    consents: {
      informationRelease: {
        agreed: Boolean,
        agreedDate: Date,
        signature: String,
      },

      creditCheck: {
        agreed: Boolean,
        agreedDate: Date,
        signature: String,
      },

      programTerms: {
        agreed: Boolean,
        agreedDate: Date,
        signature: String,
      },
    },

    // Workflow tracking
    submittedDate: Date,

    applicationMethod: {
      type: String,
      enum: ['online', 'paper', 'in_person', 'phone', 'mail'],
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    notes: String,
    internalNotes: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
assistanceApplicationSchema.index({ patient: 1, status: 1 });
assistanceApplicationSchema.index({ program: 1, status: 1 });
assistanceApplicationSchema.index({ status: 1, submittedDate: -1 });
assistanceApplicationSchema.index({ 'review.assignedTo': 1, status: 1 });
assistanceApplicationSchema.index({ submittedDate: -1 });

// Pre-save middleware
assistanceApplicationSchema.pre('save', function (next) {
  // Generate application number if not present
  if (!this.applicationNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    this.applicationNumber = `APP-${timestamp}-${random}`;
  }

  // Calculate remaining amount
  if (this.financial.approvedDiscount) {
    this.financial.remainingAmount = this.financial.approvedDiscount - this.financial.usedAmount;

    // Check if exhausted
    if (this.financial.remainingAmount <= 0 && this.status === 'active') {
      this.status = 'exhausted';
      this.addStatusHistory('exhausted', null, 'Assistance fully used');
    }
  }

  // Check expiration
  if (
    this.financial.expirationDate &&
    new Date() > this.financial.expirationDate &&
    this.status === 'active'
  ) {
    this.status = 'expired';
    this.addStatusHistory('expired', null, 'Assistance expired');
  }

  // Calculate total household income in annual terms
  if (this.household.totalHouseholdIncome && this.household.incomeFrequency !== 'annual') {
    const multipliers = {
      monthly: 12,
      biweekly: 26,
      weekly: 52,
    };

    const multiplier = multipliers[this.household.incomeFrequency] || 1;
    this.household.annualIncome = this.household.totalHouseholdIncome * multiplier;
  } else {
    this.household.annualIncome = this.household.totalHouseholdIncome;
  }

  next();
});

// Instance methods

/**
 * Submit application
 */
assistanceApplicationSchema.methods.submit = function () {
  this.status = 'submitted';
  this.submittedDate = new Date();
  this.addStatusHistory('submitted', null, 'Application submitted');
};

/**
 * Add status history
 */
assistanceApplicationSchema.methods.addStatusHistory = function (status, userId, reason, notes) {
  this.statusHistory.push({
    status,
    changedDate: new Date(),
    changedBy: userId,
    reason,
    notes,
  });
};

/**
 * Calculate eligibility
 */
assistanceApplicationSchema.methods.calculateEligibility = async function (userId) {
  const FinancialAssistanceProgram = require('./FinancialAssistanceProgram');

  const program = await FinancialAssistanceProgram.findById(this.program);

  if (!program) {
    throw new Error('Program not found');
  }

  // Check income eligibility
  const incomeCheck = program.checkIncomeEligibility(
    this.household.annualIncome,
    this.household.householdSize
  );

  if (!incomeCheck.eligible) {
    return {
      eligible: false,
      reason: incomeCheck.reason,
    };
  }

  // Store eligibility determination
  this.financial.eligibilityDetermination = {
    percentOfFPL: incomeCheck.percentOfFPL,
    fplForHousehold: incomeCheck.fplForHousehold,
    eligibilityTier: incomeCheck.tier,
    recommendedDiscount: incomeCheck.discountPercentage,
    calculatedDate: new Date(),
    calculatedBy: userId,
  };

  return {
    eligible: true,
    discountPercentage: incomeCheck.discountPercentage,
    eligibilityDetails: this.financial.eligibilityDetermination,
  };
};

/**
 * Approve application
 */
assistanceApplicationSchema.methods.approve = function (approvedAmount, approvalData, userId) {
  this.status = 'approved';

  const discountAmount = this.financial.requestedAmount - approvedAmount;
  const discountPercentage = (discountAmount / this.financial.requestedAmount) * 100;

  this.financial.approvedDiscount = discountAmount;
  this.financial.approvedPercentage = discountPercentage;
  this.financial.approvedAmount = approvedAmount;
  this.financial.usedAmount = 0;
  this.financial.remainingAmount = discountAmount;

  this.approval.approvedBy = userId;
  this.approval.approvalDate = new Date();
  this.approval.approvalNotes = approvalData.notes;

  // Set effective and expiration dates
  this.financial.effectiveDate = approvalData.effectiveDate || new Date();

  if (approvalData.expirationDate) {
    this.financial.expirationDate = approvalData.expirationDate;
  }

  this.addStatusHistory('approved', userId, 'Application approved');
};

/**
 * Deny application
 */
assistanceApplicationSchema.methods.deny = function (denialReasons, denialNotes, userId) {
  this.status = 'denied';

  this.denial.deniedBy = userId;
  this.denial.denialDate = new Date();
  this.denial.denialReasons = denialReasons;
  this.denial.denialNotes = denialNotes;

  // Set appeal deadline (30 days)
  const appealDeadline = new Date();
  appealDeadline.setDate(appealDeadline.getDate() + 30);
  this.denial.appealDeadline = appealDeadline;

  this.addStatusHistory('denied', userId, denialReasons.join(', '));
};

/**
 * Record usage
 */
assistanceApplicationSchema.methods.recordUsage = function (usageData) {
  this.usage.push({
    usageDate: usageData.usageDate || new Date(),
    claimId: usageData.claimId,
    invoiceId: usageData.invoiceId,
    serviceDate: usageData.serviceDate,
    serviceDescription: usageData.serviceDescription,
    originalAmount: usageData.originalAmount,
    discountAmount: usageData.discountAmount,
    patientResponsibility: usageData.patientResponsibility,
    recordedBy: usageData.recordedBy,
    notes: usageData.notes,
  });

  this.financial.usedAmount += usageData.discountAmount;

  // Activate if approved but not yet active
  if (this.status === 'approved') {
    this.status = 'active';
    this.addStatusHistory('active', usageData.recordedBy, 'First usage recorded');
  }
};

/**
 * Get application summary
 */
assistanceApplicationSchema.methods.getApplicationSummary = function () {
  return {
    applicationNumber: this.applicationNumber,
    status: this.status,
    submittedDate: this.submittedDate,
    applicant: {
      name: `${this.applicant.firstName} ${this.applicant.lastName}`,
      contact: this.applicant.contactInfo.email || this.applicant.contactInfo.phone,
    },
    household: {
      size: this.household.householdSize,
      annualIncome: this.household.annualIncome,
    },
    financial: {
      requestedAmount: this.financial.requestedAmount,
      approvedDiscount: this.financial.approvedDiscount,
      approvedPercentage: this.financial.approvedPercentage,
      usedAmount: this.financial.usedAmount,
      remainingAmount: this.financial.remainingAmount,
    },
    eligibility: this.financial.eligibilityDetermination,
    documentsSubmitted: this.documents.length,
    documentsVerified: this.documents.filter((d) => d.verified).length,
  };
};

// Static methods

/**
 * Get pending applications
 */
assistanceApplicationSchema.statics.getPendingApplications = function () {
  return this.find({
    status: { $in: ['submitted', 'under_review', 'pending_verification', 'pending_approval'] },
  })
    .populate('program', 'programName programCode')
    .populate('patient', 'firstName lastName email')
    .populate('review.assignedTo', 'firstName lastName')
    .sort({ submittedDate: 1 });
};

/**
 * Get assigned applications
 */
assistanceApplicationSchema.statics.getAssignedApplications = function (userId) {
  return this.find({
    'review.assignedTo': userId,
    status: { $in: ['under_review', 'pending_verification', 'pending_approval'] },
  })
    .populate('program', 'programName programCode')
    .populate('patient', 'firstName lastName')
    .sort({ submittedDate: 1 });
};

/**
 * Get patient applications
 */
assistanceApplicationSchema.statics.getPatientApplications = function (patientId) {
  return this.find({ patient: patientId })
    .populate('program', 'programName programCode programType')
    .sort({ submittedDate: -1 });
};

/**
 * Get active assistance for patient
 */
assistanceApplicationSchema.statics.getActiveAssistanceForPatient = function (patientId) {
  return this.find({
    patient: patientId,
    status: 'active',
    'financial.remainingAmount': { $gt: 0 },
    $or: [
      { 'financial.expirationDate': { $gte: new Date() } },
      { 'financial.expirationDate': null },
    ],
  }).populate('program', 'programName programCode');
};

/**
 * Get application statistics
 */
assistanceApplicationSchema.statics.getApplicationStatistics = async function (
  programId,
  startDate,
  endDate
) {
  const filter = {};

  if (programId) filter.program = programId;

  if (startDate || endDate) {
    filter.submittedDate = {};
    if (startDate) filter.submittedDate.$gte = new Date(startDate);
    if (endDate) filter.submittedDate.$lte = new Date(endDate);
  }

  const [totalApplications, byStatus, financials] = await Promise.all([
    this.countDocuments(filter),

    this.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),

    this.aggregate([
      { $match: { ...filter, status: { $in: ['approved', 'active', 'exhausted'] } } },
      {
        $group: {
          _id: null,
          totalRequested: { $sum: '$financial.requestedAmount' },
          totalApproved: { $sum: '$financial.approvedDiscount' },
          totalUsed: { $sum: '$financial.usedAmount' },
        },
      },
    ]),
  ]);

  const financialData = financials[0] || {
    totalRequested: 0,
    totalApproved: 0,
    totalUsed: 0,
  };

  const approvalCount = byStatus.find(
    (s) => s._id === 'approved' || s._id === 'active' || s._id === 'exhausted'
  );
  const denialCount = byStatus.find((s) => s._id === 'denied');

  const approvalRate =
    totalApplications > 0
      ? (((approvalCount?.count || 0) / totalApplications) * 100).toFixed(1)
      : 0;

  return {
    period: { startDate, endDate },
    totalApplications,
    byStatus: byStatus.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    approvalRate: `${approvalRate}%`,
    financial: {
      totalRequested: financialData.totalRequested,
      totalApproved: financialData.totalApproved,
      totalUsed: financialData.totalUsed,
      utilizationRate:
        financialData.totalApproved > 0
          ? `${((financialData.totalUsed / financialData.totalApproved) * 100).toFixed(1)}%`
          : '0%',
    },
  };
};

const AssistanceApplication = mongoose.model('AssistanceApplication', assistanceApplicationSchema);

module.exports = AssistanceApplication;
