const mongoose = require('mongoose');

/**
 * Collections Agency Model
 *
 * Manages collection agency partnerships and integrations
 * for external debt collection
 */

// eslint-disable-next-line no-unused-vars

const collectionsAgencySchema = new mongoose.Schema(
  {
    // Agency identification
    agencyCode: {
      type: String,
      unique: true,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    agencyName: {
      type: String,
      required: true,
      trim: true,
    },

    // Contact information
    contact: {
      primaryContact: String,
      email: String,
      phone: String,
      fax: String,

      address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: { type: String, default: 'USA' },
      },

      website: String,
    },

    // Integration configuration
    integration: {
      method: {
        type: String,
        enum: ['api', 'sftp', 'email', 'manual', 'web_portal'],
        required: true,
      },

      // API integration
      api: {
        enabled: Boolean,
        baseUrl: String,
        apiKey: String, // Encrypted
        apiSecret: String, // Encrypted
        authType: {
          type: String,
          enum: ['basic', 'bearer', 'api_key', 'oauth2'],
        },
        webhookUrl: String,
        webhookSecret: String,
      },

      // SFTP integration
      sftp: {
        enabled: Boolean,
        host: String,
        port: { type: Number, default: 22 },
        username: String,
        password: String, // Encrypted
        remotePath: String,
        fileFormat: {
          type: String,
          enum: ['csv', 'fixed_width', 'xml', 'json'],
        },
      },

      // Email integration
      email: {
        enabled: Boolean,
        placementEmail: String,
        statusUpdateEmail: String,
        paymentEmail: String,
      },

      // Web portal
      webPortal: {
        enabled: Boolean,
        loginUrl: String,
        username: String,
        password: String, // Encrypted
      },
    },

    // Financial terms
    financialTerms: {
      commissionType: {
        type: String,
        enum: ['percentage', 'flat_fee', 'tiered'],
        default: 'percentage',
      },

      commissionRate: {
        type: Number,
        min: 0,
        max: 100,
        default: 30,
      },

      // Tiered commission rates
      tieredRates: [
        {
          minAmount: Number,
          maxAmount: Number,
          rate: Number,
        },
      ],

      flatFee: Number,

      minimumFee: Number,
      maximumFee: Number,

      // Payment terms
      paymentTerms: {
        type: String,
        enum: ['immediate', 'net_15', 'net_30', 'net_60', 'monthly'],
      },

      // Contingency vs non-contingency
      contingencyBased: {
        type: Boolean,
        default: true,
      },
    },

    // Service level agreement
    sla: {
      placementResponseTime: Number, // Hours
      statusUpdateFrequency: {
        type: String,
        enum: ['daily', 'weekly', 'biweekly', 'monthly'],
      },
      minimumContactAttempts: Number,
      reportingDay: Number, // Day of month
      guaranteedCollectionRate: Number, // Percentage
    },

    // Placement rules
    placementRules: {
      minDebtAmount: {
        type: Number,
        default: 0,
      },

      maxDebtAmount: Number,

      allowedAgingBuckets: [
        {
          type: String,
          enum: ['0-30', '31-60', '61-90', '91-120', '121-180', '181-365', '365+'],
        },
      ],

      excludedStates: [String],

      allowedDebtTypes: [
        {
          type: String,
          enum: [
            'patient_responsibility',
            'uninsured',
            'insurance_denial',
            'payment_plan_default',
            'coordination_of_benefits',
            'other',
          ],
        },
      ],

      autoPlacement: {
        enabled: Boolean,
        minAmount: Number,
        minDaysPastDue: Number,
        maxInternalAttempts: Number,
      },
    },

    // Performance metrics
    performance: {
      totalAccountsPlaced: {
        type: Number,
        default: 0,
      },

      totalAmountPlaced: {
        type: Number,
        default: 0,
      },

      totalCollected: {
        type: Number,
        default: 0,
      },

      totalCommissionPaid: {
        type: Number,
        default: 0,
      },

      activeAccounts: {
        type: Number,
        default: 0,
      },

      collectionRate: {
        type: Number,
        default: 0,
      },

      avgDaysToCollect: {
        type: Number,
        default: 0,
      },

      successRate: {
        type: Number,
        default: 0,
      },

      lastCalculated: Date,
    },

    // Status
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'terminated'],
      default: 'active',
      required: true,
      index: true,
    },

    // Contract information
    contract: {
      contractNumber: String,
      startDate: Date,
      endDate: Date,
      renewalDate: Date,

      autoRenewal: {
        type: Boolean,
        default: false,
      },

      noticePeriodDays: Number,

      terminationClause: String,

      documents: [
        {
          name: String,
          documentType: String,
          url: String,
          uploadedDate: Date,
        },
      ],
    },

    // Compliance and licensing
    compliance: {
      licensed: Boolean,
      licenseNumber: String,
      licenseState: String,
      licenseExpiryDate: Date,

      bondedAmount: Number,
      bondExpiryDate: Date,

      fdcpaCertified: Boolean,
      hipaaCompliant: Boolean,

      backgroundCheckCompleted: Boolean,
      backgroundCheckDate: Date,

      insuranceCertificate: String,
      insuranceExpiryDate: Date,

      complianceNotes: [String],
    },

    // Alerts
    alerts: [
      {
        type: {
          type: String,
          enum: [
            'license_expiry',
            'bond_expiry',
            'contract_renewal',
            'poor_performance',
            'compliance_issue',
            'integration_error',
          ],
        },
        message: String,
        severity: {
          type: String,
          enum: ['info', 'warning', 'critical'],
        },
        createdAt: { type: Date, default: Date.now },
        acknowledged: { type: Boolean, default: false },
        acknowledgedAt: Date,
        acknowledgedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],

    // Sync tracking
    lastSync: {
      placementSync: Date,
      statusSync: Date,
      paymentSync: Date,
      reportSync: Date,
    },

    syncStatus: {
      status: {
        type: String,
        enum: ['healthy', 'warning', 'error', 'disconnected'],
      },
      lastError: String,
      lastErrorDate: Date,
      consecutiveErrors: { type: Number, default: 0 },
    },

    // Workflow
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
collectionsAgencySchema.index({ status: 1, 'performance.collectionRate': -1 });
collectionsAgencySchema.index({ 'integration.method': 1, status: 1 });

// Pre-save middleware
collectionsAgencySchema.pre('save', function (next) {
  // Generate agency code if not present
  if (!this.agencyCode) {
    const name = this.agencyName
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 8)
      .toUpperCase();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    this.agencyCode = `${name}-${random}`;
  }

  next();
});

// Instance methods

/**
 * Calculate commission for amount
 */
collectionsAgencySchema.methods.calculateCommission = function (collectedAmount) {
  if (this.financialTerms.commissionType === 'flat_fee') {
    return this.financialTerms.flatFee || 0;
  }

  if (this.financialTerms.commissionType === 'tiered') {
    // Find applicable tier
    const tier = this.financialTerms.tieredRates.find(
      (t) =>
        collectedAmount >= (t.minAmount || 0) && (!t.maxAmount || collectedAmount <= t.maxAmount)
    );

    if (tier) {
      return collectedAmount * (tier.rate / 100);
    }
  }

  // Default: percentage
  let commission = collectedAmount * (this.financialTerms.commissionRate / 100);

  // Apply min/max limits
  if (this.financialTerms.minimumFee && commission < this.financialTerms.minimumFee) {
    commission = this.financialTerms.minimumFee;
  }

  if (this.financialTerms.maximumFee && commission > this.financialTerms.maximumFee) {
    commission = this.financialTerms.maximumFee;
  }

  return commission;
};

/**
 * Check if debt is eligible for placement
 */
collectionsAgencySchema.methods.isEligibleForPlacement = function (badDebt) {
  const rules = this.placementRules;

  // Check amount limits
  if (rules.minDebtAmount && badDebt.financial.currentBalance < rules.minDebtAmount) {
    return { eligible: false, reason: 'Below minimum debt amount' };
  }

  if (rules.maxDebtAmount && badDebt.financial.currentBalance > rules.maxDebtAmount) {
    return { eligible: false, reason: 'Exceeds maximum debt amount' };
  }

  // Check aging bucket
  if (rules.allowedAgingBuckets && rules.allowedAgingBuckets.length > 0) {
    if (!rules.allowedAgingBuckets.includes(badDebt.financial.agingBucket)) {
      return { eligible: false, reason: 'Aging bucket not allowed' };
    }
  }

  // Check debt type
  if (rules.allowedDebtTypes && rules.allowedDebtTypes.length > 0) {
    if (!rules.allowedDebtTypes.includes(badDebt.classification.type)) {
      return { eligible: false, reason: 'Debt type not allowed' };
    }
  }

  // Check excluded states
  if (rules.excludedStates && rules.excludedStates.length > 0) {
    // Would need to check patient state from badDebt.patientInfo
    // This is a simplified check
  }

  return { eligible: true };
};

/**
 * Update performance metrics
 */
collectionsAgencySchema.methods.updatePerformanceMetrics = async function () {
  const AgencyPlacement = require('./AgencyPlacement');

  const placements = await AgencyPlacement.find({ agency: this._id });

  this.performance.totalAccountsPlaced = placements.length;
  this.performance.activeAccounts = placements.filter((p) => p.status === 'active').length;

  this.performance.totalAmountPlaced = placements.reduce(
    (sum, p) => sum + p.financial.placedAmount,
    0
  );

  this.performance.totalCollected = placements.reduce(
    (sum, p) => sum + p.financial.collectedAmount,
    0
  );

  this.performance.totalCommissionPaid = placements.reduce(
    (sum, p) => sum + p.financial.commissionPaid,
    0
  );

  this.performance.collectionRate =
    this.performance.totalAmountPlaced > 0
      ? (this.performance.totalCollected / this.performance.totalAmountPlaced) * 100
      : 0;

  // Calculate average days to collect
  const collectedPlacements = placements.filter(
    (p) => p.financial.collectedAmount > 0 && p.collection.firstCollectionDate
  );

  if (collectedPlacements.length > 0) {
    const totalDays = collectedPlacements.reduce((sum, p) => {
      const days = Math.floor(
        (p.collection.firstCollectionDate - p.placementDate) / (1000 * 60 * 60 * 24)
      );
      return sum + days;
    }, 0);

    this.performance.avgDaysToCollect = Math.floor(totalDays / collectedPlacements.length);
  }

  // Calculate success rate (accounts with any collection)
  const successfulAccounts = placements.filter((p) => p.financial.collectedAmount > 0).length;
  this.performance.successRate =
    placements.length > 0 ? (successfulAccounts / placements.length) * 100 : 0;

  this.performance.lastCalculated = new Date();
};

/**
 * Add alert
 */
collectionsAgencySchema.methods.addAlert = function (type, message, severity = 'info') {
  this.alerts.push({
    type,
    message,
    severity,
    createdAt: new Date(),
    acknowledged: false,
  });
};

/**
 * Check for expiring licenses/bonds
 */
collectionsAgencySchema.methods.checkExpirations = function () {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Check license expiry
  if (this.compliance.licenseExpiryDate && this.compliance.licenseExpiryDate <= thirtyDaysFromNow) {
    this.addAlert('license_expiry', 'License expiring within 30 days', 'warning');
  }

  // Check bond expiry
  if (this.compliance.bondExpiryDate && this.compliance.bondExpiryDate <= thirtyDaysFromNow) {
    this.addAlert('bond_expiry', 'Bond expiring within 30 days', 'warning');
  }

  // Check contract renewal
  if (this.contract.renewalDate && this.contract.renewalDate <= thirtyDaysFromNow) {
    this.addAlert('contract_renewal', 'Contract renewal due within 30 days', 'info');
  }

  // Check insurance expiry
  if (
    this.compliance.insuranceExpiryDate &&
    this.compliance.insuranceExpiryDate <= thirtyDaysFromNow
  ) {
    this.addAlert('compliance_issue', 'Insurance expiring within 30 days', 'warning');
  }
};

/**
 * Get performance summary
 */
collectionsAgencySchema.methods.getPerformanceSummary = function () {
  return {
    agencyCode: this.agencyCode,
    agencyName: this.agencyName,
    status: this.status,
    performance: {
      totalAccountsPlaced: this.performance.totalAccountsPlaced,
      activeAccounts: this.performance.activeAccounts,
      totalAmountPlaced: this.performance.totalAmountPlaced,
      totalCollected: this.performance.totalCollected,
      collectionRate: this.performance.collectionRate.toFixed(2) + '%',
      avgDaysToCollect: this.performance.avgDaysToCollect,
      successRate: this.performance.successRate.toFixed(2) + '%',
    },
    syncStatus: this.syncStatus.status,
    lastSync: this.lastSync,
  };
};

// Static methods

/**
 * Get active agencies
 */
collectionsAgencySchema.statics.getActiveAgencies = function () {
  return this.find({ status: 'active' }).sort({ 'performance.collectionRate': -1 });
};

/**
 * Get best performing agency
 */
collectionsAgencySchema.statics.getBestPerforming = function () {
  return this.findOne({ status: 'active' }).sort({
    'performance.collectionRate': -1,
    'performance.successRate': -1,
  });
};

/**
 * Get agencies with alerts
 */
collectionsAgencySchema.statics.getAgenciesWithAlerts = function () {
  return this.find({
    alerts: {
      $elemMatch: {
        acknowledged: false,
        severity: { $in: ['warning', 'critical'] },
      },
    },
  });
};

/**
 * Get agencies requiring sync
 */
collectionsAgencySchema.statics.getRequiringSync = function () {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  return this.find({
    status: 'active',
    $or: [{ 'lastSync.statusSync': { $lt: oneDayAgo } }, { 'lastSync.statusSync': null }],
  });
};

const CollectionsAgency = mongoose.model('CollectionsAgency', collectionsAgencySchema);

module.exports = CollectionsAgency;
