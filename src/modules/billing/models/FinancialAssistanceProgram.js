const mongoose = require('mongoose');

/**
 * Financial Assistance Program Model
 *
 * Manages charity care, sliding fee scales, and financial assistance
 * programs for qualifying patients
 */

// eslint-disable-next-line no-unused-vars

const financialAssistanceProgramSchema = new mongoose.Schema(
  {
    // Program identification
    programCode: {
      type: String,
      unique: true,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    programName: {
      type: String,
      required: true,
      trim: true,
    },

    description: String,

    // Program type
    programType: {
      type: String,
      enum: [
        'charity_care', // 100% discount for qualifying patients
        'sliding_fee_scale', // Discount based on income level
        'uninsured_discount', // Discount for uninsured patients
        'prompt_pay_discount', // Discount for payment within X days
        'hardship', // Financial hardship assistance
        'catastrophic', // Catastrophic medical expenses
        'community_benefit', // Community benefit program
        'grant_funded', // Grant-funded assistance
      ],
      required: true,
      index: true,
    },

    // Program status
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'archived'],
      default: 'active',
      required: true,
      index: true,
    },

    // Eligibility criteria
    eligibility: {
      // Income-based criteria
      income: {
        useFederalPovertyLevel: {
          type: Boolean,
          default: true,
        },

        // Federal Poverty Level (FPL) thresholds
        fplThresholds: [
          {
            minPercentFPL: Number, // e.g., 0 for charity care
            maxPercentFPL: Number, // e.g., 100 for charity care, 200 for sliding scale
            discountPercentage: {
              // Discount for this tier
              type: Number,
              min: 0,
              max: 100,
            },
            description: String,
          },
        ],

        // Alternative: Fixed income ranges (if not using FPL)
        incomeRanges: [
          {
            minAnnualIncome: Number,
            maxAnnualIncome: Number,
            discountPercentage: Number,
            description: String,
          },
        ],

        includeHouseholdSize: {
          type: Boolean,
          default: true,
        },
      },

      // Asset criteria
      assets: {
        considerAssets: {
          type: Boolean,
          default: false,
        },

        maxLiquidAssets: Number,
        excludedAssets: [String], // e.g., primary residence, one vehicle

        assetVerificationRequired: Boolean,
      },

      // Insurance status
      insuranceStatus: {
        allowInsured: {
          type: Boolean,
          default: false,
        },

        allowUninsured: {
          type: Boolean,
          default: true,
        },

        allowUnderinsured: {
          type: Boolean,
          default: true,
        },

        // If insured, require minimum out-of-pocket
        minOutOfPocket: Number,
      },

      // Geographic restrictions
      geographic: {
        serviceAreaOnly: {
          type: Boolean,
          default: false,
        },

        allowedZipCodes: [String],
        allowedCounties: [String],
        allowedStates: [String],

        requireProofOfResidency: Boolean,
      },

      // Service restrictions
      services: {
        eligibleServiceTypes: [
          {
            type: String,
            enum: [
              'emergency',
              'urgent',
              'preventive',
              'diagnostic',
              'treatment',
              'surgery',
              'maternity',
              'mental_health',
              'dental',
              'vision',
              'all',
            ],
          },
        ],

        excludedServiceTypes: [String],
        excludedCPTCodes: [String],
        excludedICDCodes: [String],
      },

      // Other criteria
      other: {
        minAge: Number,
        maxAge: Number,

        citizenshipRequired: {
          type: Boolean,
          default: false,
        },

        allowedCitizenshipStatus: [
          {
            type: String,
            enum: ['us_citizen', 'permanent_resident', 'refugee', 'asylee', 'other'],
          },
        ],

        priorAssistanceRestriction: {
          enabled: Boolean,
          maxApplicationsPerYear: Number,
          maxTotalAssistancePerYear: Number,
        },
      },
    },

    // Application requirements
    applicationRequirements: {
      // Required documentation
      requiredDocuments: [
        {
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
            'other',
          ],
        },
      ],

      // Income verification period
      incomeVerificationPeriod: {
        type: String,
        enum: ['current_month', 'last_month', 'last_3_months', 'last_6_months', 'last_year'],
        default: 'last_3_months',
      },

      // Application method
      applicationMethods: [
        {
          type: String,
          enum: ['online', 'paper', 'in_person', 'phone', 'mail'],
        },
      ],

      // Self-attestation allowed
      selfAttestationAllowed: {
        type: Boolean,
        default: false,
      },

      selfAttestationMaxAmount: Number,

      // Interview required
      interviewRequired: {
        type: Boolean,
        default: false,
      },
    },

    // Program limits
    limits: {
      // Per application
      maxDiscountPerApplication: Number,
      minBalanceForDiscount: Number,

      // Annual limits per patient
      maxApplicationsPerPatientPerYear: Number,
      maxAssistancePerPatientPerYear: Number,

      // Program-wide limits
      annualBudget: Number,
      monthlyBudget: Number,
      currentYearSpent: {
        type: Number,
        default: 0,
      },
      currentMonthSpent: {
        type: Number,
        default: 0,
      },
    },

    // Approval workflow
    approvalWorkflow: {
      autoApproveUnder: Number, // Auto-approve if discount under this amount

      requiresReview: {
        type: Boolean,
        default: true,
      },

      approverRoles: [
        {
          type: String,
          enum: ['owner', 'full_access', 'admin_billing', 'billing_only', 'financial_counselor'],
        },
      ],

      requiresSecondApproval: {
        enabled: Boolean,
        threshold: Number, // Require second approval if over this amount
      },

      appealProcess: {
        enabled: Boolean,
        maxAppeals: Number,
      },
    },

    // Validity period
    validityPeriod: {
      startDate: Date,
      endDate: Date,

      applicationsOpenDate: Date,
      applicationsCloseDate: Date,

      assistanceDuration: {
        type: String,
        enum: ['single_use', '30_days', '90_days', '6_months', '1_year', 'indefinite'],
        default: 'single_use',
      },
    },

    // Funding source
    fundingSource: {
      type: {
        type: String,
        enum: ['organization', 'grant', 'donation', 'government', 'insurance_surplus', 'other'],
      },

      grantName: String,
      grantNumber: String,
      grantAmount: Number,
      grantStartDate: Date,
      grantEndDate: Date,

      fundingNotes: String,
    },

    // Reporting requirements
    reporting: {
      requireIRS990Schedule: {
        type: Boolean,
        default: false,
      },

      communityBenefitReporting: {
        type: Boolean,
        default: false,
      },

      grantReporting: {
        type: Boolean,
        default: false,
      },

      reportingFrequency: {
        type: String,
        enum: ['monthly', 'quarterly', 'annually'],
      },
    },

    // Statistics
    statistics: {
      totalApplications: {
        type: Number,
        default: 0,
      },

      approvedApplications: {
        type: Number,
        default: 0,
      },

      deniedApplications: {
        type: Number,
        default: 0,
      },

      totalAssistanceProvided: {
        type: Number,
        default: 0,
      },

      uniquePatientsServed: {
        type: Number,
        default: 0,
      },

      averageAssistanceAmount: {
        type: Number,
        default: 0,
      },

      approvalRate: {
        type: Number,
        default: 0,
      },

      lastCalculated: Date,
    },

    // Alerts
    alerts: [
      {
        type: {
          type: String,
          enum: [
            'budget_warning',
            'budget_exceeded',
            'program_expiring',
            'grant_expiring',
            'compliance_issue',
          ],
        },
        message: String,
        severity: {
          type: String,
          enum: ['info', 'warning', 'critical'],
        },
        createdAt: { type: Date, default: Date.now },
        acknowledged: { type: Boolean, default: false },
      },
    ],

    // Audit trail
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    notes: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
financialAssistanceProgramSchema.index({ status: 1, programType: 1 });
financialAssistanceProgramSchema.index({
  'validityPeriod.startDate': 1,
  'validityPeriod.endDate': 1,
});

// Pre-save middleware
financialAssistanceProgramSchema.pre('save', function (next) {
  // Generate program code if not present
  if (!this.programCode) {
    const type = this.programType.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    this.programCode = `${type}-${timestamp}-${random}`;
  }

  // Check budget warnings
  if (this.limits.annualBudget) {
    const percentUsed = (this.limits.currentYearSpent / this.limits.annualBudget) * 100;

    if (percentUsed >= 90) {
      this.addAlert('budget_warning', `Annual budget ${percentUsed.toFixed(1)}% used`, 'critical');
    } else if (percentUsed >= 75) {
      this.addAlert('budget_warning', `Annual budget ${percentUsed.toFixed(1)}% used`, 'warning');
    }
  }

  // Check expiration
  if (this.validityPeriod.endDate) {
    const daysUntilExpiry = Math.floor(
      (this.validityPeriod.endDate - new Date()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
      this.addAlert('program_expiring', `Program expires in ${daysUntilExpiry} days`, 'warning');
    }
  }

  next();
});

// Instance methods

/**
 * Check if patient is eligible based on income
 */
financialAssistanceProgramSchema.methods.checkIncomeEligibility = function (
  annualIncome,
  householdSize
) {
  if (!this.eligibility.income.useFederalPovertyLevel) {
    // Use fixed income ranges
    const range = this.eligibility.income.incomeRanges.find(
      (r) =>
        annualIncome >= (r.minAnnualIncome || 0) &&
        (!r.maxAnnualIncome || annualIncome <= r.maxAnnualIncome)
    );

    if (range) {
      return {
        eligible: true,
        discountPercentage: range.discountPercentage,
        tier: range.description,
      };
    }

    return { eligible: false, reason: 'Income exceeds program limits' };
  }

  // Use Federal Poverty Level
  // 2024 FPL for contiguous US
  const fplBase = 15060; // Individual
  const fplPerAdditional = 5380; // Per additional person

  const fplForHousehold = fplBase + fplPerAdditional * (householdSize - 1);
  const percentOfFPL = (annualIncome / fplForHousehold) * 100;

  // Find matching tier
  const tier = this.eligibility.income.fplThresholds.find(
    (t) =>
      percentOfFPL >= (t.minPercentFPL || 0) &&
      (!t.maxPercentFPL || percentOfFPL <= t.maxPercentFPL)
  );

  if (tier) {
    return {
      eligible: true,
      discountPercentage: tier.discountPercentage,
      percentOfFPL: percentOfFPL.toFixed(1),
      fplForHousehold,
      tier: tier.description,
    };
  }

  return {
    eligible: false,
    reason: 'Income exceeds program limits',
    percentOfFPL: percentOfFPL.toFixed(1),
    fplForHousehold,
  };
};

/**
 * Check if patient has exceeded assistance limits
 */
financialAssistanceProgramSchema.methods.checkPatientLimits = async function (patientId) {
  const AssistanceApplication = require('./AssistanceApplication');

  // Get patient's applications for current year
  const startOfYear = new Date(new Date().getFullYear(), 0, 1);
  const applications = await AssistanceApplication.find({
    patient: patientId,
    program: this._id,
    status: { $in: ['approved', 'active'] },
    createdAt: { $gte: startOfYear },
  });

  const applicationCount = applications.length;
  const totalAssistance = applications.reduce(
    (sum, app) => sum + (app.financial.approvedDiscount || 0),
    0
  );

  const { limits } = this;

  // Check application count
  if (
    limits.maxApplicationsPerPatientPerYear &&
    applicationCount >= limits.maxApplicationsPerPatientPerYear
  ) {
    return {
      allowed: false,
      reason: 'Maximum applications per year reached',
      applicationCount,
      limit: limits.maxApplicationsPerPatientPerYear,
    };
  }

  // Check total assistance amount
  if (
    limits.maxAssistancePerPatientPerYear &&
    totalAssistance >= limits.maxAssistancePerPatientPerYear
  ) {
    return {
      allowed: false,
      reason: 'Maximum assistance per year reached',
      totalAssistance,
      limit: limits.maxAssistancePerPatientPerYear,
    };
  }

  return {
    allowed: true,
    applicationCount,
    totalAssistance,
    remainingApplications: limits.maxApplicationsPerPatientPerYear
      ? limits.maxApplicationsPerPatientPerYear - applicationCount
      : null,
    remainingAssistance: limits.maxAssistancePerPatientPerYear
      ? limits.maxAssistancePerPatientPerYear - totalAssistance
      : null,
  };
};

/**
 * Check if program has budget remaining
 */
financialAssistanceProgramSchema.methods.checkBudgetAvailability = function (requestedAmount) {
  // Check annual budget
  if (this.limits.annualBudget) {
    const remaining = this.limits.annualBudget - this.limits.currentYearSpent;

    if (requestedAmount > remaining) {
      return {
        available: false,
        reason: 'Annual budget exceeded',
        requested: requestedAmount,
        remaining,
      };
    }
  }

  // Check monthly budget
  if (this.limits.monthlyBudget) {
    const remaining = this.limits.monthlyBudget - this.limits.currentMonthSpent;

    if (requestedAmount > remaining) {
      return {
        available: false,
        reason: 'Monthly budget exceeded',
        requested: requestedAmount,
        remaining,
      };
    }
  }

  return { available: true };
};

/**
 * Add alert
 */
financialAssistanceProgramSchema.methods.addAlert = function (type, message, severity = 'info') {
  // Check if similar alert already exists
  const existingAlert = this.alerts.find(
    (a) =>
      a.type === type && !a.acknowledged && a.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000) // Within last 24 hours
  );

  if (!existingAlert) {
    this.alerts.push({
      type,
      message,
      severity,
      createdAt: new Date(),
      acknowledged: false,
    });
  }
};

/**
 * Update statistics
 */
financialAssistanceProgramSchema.methods.updateStatistics = async function () {
  const AssistanceApplication = require('./AssistanceApplication');

  const applications = await AssistanceApplication.find({ program: this._id });

  this.statistics.totalApplications = applications.length;
  this.statistics.approvedApplications = applications.filter(
    (a) => a.status === 'approved' || a.status === 'active'
  ).length;
  this.statistics.deniedApplications = applications.filter((a) => a.status === 'denied').length;

  this.statistics.totalAssistanceProvided = applications
    .filter((a) => a.status === 'approved' || a.status === 'active')
    .reduce((sum, a) => sum + (a.financial.approvedDiscount || 0), 0);

  // Get unique patients
  const uniquePatients = [...new Set(applications.map((a) => a.patient.toString()))];
  this.statistics.uniquePatientsServed = uniquePatients.length;

  this.statistics.averageAssistanceAmount =
    this.statistics.approvedApplications > 0
      ? this.statistics.totalAssistanceProvided / this.statistics.approvedApplications
      : 0;

  this.statistics.approvalRate =
    this.statistics.totalApplications > 0
      ? (this.statistics.approvedApplications / this.statistics.totalApplications) * 100
      : 0;

  this.statistics.lastCalculated = new Date();
};

/**
 * Get program summary
 */
financialAssistanceProgramSchema.methods.getProgramSummary = function () {
  const budgetRemaining = this.limits.annualBudget
    ? this.limits.annualBudget - this.limits.currentYearSpent
    : null;

  const budgetPercentUsed = this.limits.annualBudget
    ? (this.limits.currentYearSpent / this.limits.annualBudget) * 100
    : null;

  return {
    programCode: this.programCode,
    programName: this.programName,
    programType: this.programType,
    status: this.status,
    statistics: {
      totalApplications: this.statistics.totalApplications,
      approvedApplications: this.statistics.approvedApplications,
      approvalRate: this.statistics.approvalRate.toFixed(1) + '%',
      totalAssistanceProvided: this.statistics.totalAssistanceProvided,
      uniquePatientsServed: this.statistics.uniquePatientsServed,
      averageAssistanceAmount: this.statistics.averageAssistanceAmount,
    },
    budget: {
      annualBudget: this.limits.annualBudget,
      spent: this.limits.currentYearSpent,
      remaining: budgetRemaining,
      percentUsed: budgetPercentUsed ? budgetPercentUsed.toFixed(1) + '%' : null,
    },
    validity: {
      startDate: this.validityPeriod.startDate,
      endDate: this.validityPeriod.endDate,
      active: this.isActive(),
    },
  };
};

/**
 * Check if program is currently active
 */
financialAssistanceProgramSchema.methods.isActive = function () {
  if (this.status !== 'active') return false;

  const now = new Date();

  if (this.validityPeriod.startDate && now < this.validityPeriod.startDate) {
    return false;
  }

  if (this.validityPeriod.endDate && now > this.validityPeriod.endDate) {
    return false;
  }

  return true;
};

// Static methods

/**
 * Get active programs
 */
financialAssistanceProgramSchema.statics.getActivePrograms = function () {
  const now = new Date();

  return this.find({
    status: 'active',
    $or: [
      { 'validityPeriod.startDate': { $lte: now }, 'validityPeriod.endDate': { $gte: now } },
      { 'validityPeriod.startDate': null, 'validityPeriod.endDate': null },
      { 'validityPeriod.startDate': { $lte: now }, 'validityPeriod.endDate': null },
    ],
  }).sort({ programName: 1 });
};

/**
 * Get eligible programs for patient
 */
financialAssistanceProgramSchema.statics.getEligiblePrograms = async function (patientData) {
  const activePrograms = await this.getActivePrograms();
  const eligiblePrograms = [];

  for (const program of activePrograms) {
    // Check income eligibility
    if (patientData.annualIncome && patientData.householdSize) {
      const incomeCheck = program.checkIncomeEligibility(
        patientData.annualIncome,
        patientData.householdSize
      );

      if (!incomeCheck.eligible) continue;
    }

    // Check insurance status
    if (
      patientData.insuranceStatus === 'insured' &&
      !program.eligibility.insuranceStatus.allowInsured
    ) {
      continue;
    }

    if (
      patientData.insuranceStatus === 'uninsured' &&
      !program.eligibility.insuranceStatus.allowUninsured
    ) {
      continue;
    }

    // Check geographic restrictions
    if (
      program.eligibility.geographic.serviceAreaOnly &&
      program.eligibility.geographic.allowedZipCodes &&
      program.eligibility.geographic.allowedZipCodes.length > 0
    ) {
      if (!program.eligibility.geographic.allowedZipCodes.includes(patientData.zipCode)) {
        continue;
      }
    }

    eligiblePrograms.push(program);
  }

  return eligiblePrograms;
};

/**
 * Get programs with budget warnings
 */
financialAssistanceProgramSchema.statics.getProgramsWithBudgetWarnings = function () {
  return this.find({
    status: 'active',
    alerts: {
      $elemMatch: {
        type: { $in: ['budget_warning', 'budget_exceeded'] },
        acknowledged: false,
      },
    },
  });
};

/**
 * Get program statistics
 */
financialAssistanceProgramSchema.statics.getProgramStatistics = async function (
  startDate,
  endDate
) {
  const filter = { status: { $ne: 'archived' } };

  const programs = await this.find(filter);

  const totalPrograms = programs.length;
  const activePrograms = programs.filter((p) => p.status === 'active').length;

  const totalApplications = programs.reduce((sum, p) => sum + p.statistics.totalApplications, 0);

  const totalApproved = programs.reduce((sum, p) => sum + p.statistics.approvedApplications, 0);

  const totalAssistanceProvided = programs.reduce(
    (sum, p) => sum + p.statistics.totalAssistanceProvided,
    0
  );

  const uniquePatients = programs.reduce((sum, p) => sum + p.statistics.uniquePatientsServed, 0);

  const overallApprovalRate = totalApplications > 0 ? (totalApproved / totalApplications) * 100 : 0;

  return {
    period: { startDate, endDate },
    overview: {
      totalPrograms,
      activePrograms,
      totalApplications,
      totalApproved,
      totalAssistanceProvided,
      uniquePatientsServed: uniquePatients,
      overallApprovalRate: overallApprovalRate.toFixed(1) + '%',
    },
    byProgramType: programs.reduce((acc, p) => {
      if (!acc[p.programType]) {
        acc[p.programType] = {
          count: 0,
          applications: 0,
          approved: 0,
          totalAssistance: 0,
        };
      }

      acc[p.programType].count += 1;
      acc[p.programType].applications += p.statistics.totalApplications;
      acc[p.programType].approved += p.statistics.approvedApplications;
      acc[p.programType].totalAssistance += p.statistics.totalAssistanceProvided;

      return acc;
    }, {}),
  };
};

const FinancialAssistanceProgram = mongoose.model(
  'FinancialAssistanceProgram',
  financialAssistanceProgramSchema
);

module.exports = FinancialAssistanceProgram;
