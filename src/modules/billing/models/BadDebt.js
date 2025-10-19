const mongoose = require('mongoose');

/**
 * Bad Debt Model
 *
 * Tracks uncollectible accounts, write-offs, and collection activities
 * for healthcare billing
 */

// eslint-disable-next-line no-unused-vars

const badDebtSchema = new mongoose.Schema(
  {
    // Identification
    badDebtNumber: {
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
      email: String,
      phone: String,
      dateOfBirth: Date,
      ssn: String, // Last 4 digits only
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
        dueDate: Date,
        amount: Number,
      },
    ],

    paymentPlans: [
      {
        planId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'PaymentPlan',
        },
        planNumber: String,
        defaultDate: Date,
        amountDue: Number,
      },
    ],

    // Financial details
    financial: {
      originalAmount: {
        type: Number,
        required: true,
        min: 0,
      },

      writeOffAmount: {
        type: Number,
        default: 0,
        min: 0,
      },

      collectedAmount: {
        type: Number,
        default: 0,
        min: 0,
      },

      currentBalance: {
        type: Number,
        required: true,
        min: 0,
      },

      agingBucket: {
        type: String,
        enum: ['0-30', '31-60', '61-90', '91-120', '121-180', '181-365', '365+'],
        required: true,
        index: true,
      },

      daysPastDue: {
        type: Number,
        default: 0,
        min: 0,
      },

      firstBillingDate: {
        type: Date,
        required: true,
      },

      lastBillingDate: Date,

      lastPaymentDate: Date,
      lastPaymentAmount: Number,
    },

    // Bad debt classification
    classification: {
      type: {
        type: String,
        enum: [
          'patient_responsibility', // Patient balance after insurance
          'uninsured', // No insurance coverage
          'insurance_denial', // Insurance denied claim
          'payment_plan_default', // Defaulted payment plan
          'coordination_of_benefits', // COB issues
          'other',
        ],
        required: true,
        index: true,
      },

      reason: {
        type: String,
        enum: [
          'unable_to_pay',
          'unwilling_to_pay',
          'disputed_charges',
          'patient_deceased',
          'patient_relocated',
          'bankruptcy',
          'insurance_issues',
          'medical_necessity_denial',
          'coordination_of_benefits',
          'timely_filing',
          'other',
        ],
        required: true,
      },

      reasonDetails: String,
    },

    // Status tracking
    status: {
      type: String,
      enum: [
        'identified', // Newly identified as bad debt
        'in_collection', // Active collection efforts
        'external_collection', // Sent to external agency
        'legal_action', // Legal proceedings initiated
        'settlement_pending', // Settlement offer pending
        'settled', // Settled for less than full amount
        'written_off', // Written off as uncollectible
        'recovered', // Fully recovered
        'bankruptcy', // Patient filed bankruptcy
        'deceased', // Patient deceased
        'closed', // Account closed
      ],
      default: 'identified',
      required: true,
      index: true,
    },

    // Collection efforts
    collectionEfforts: [
      {
        date: {
          type: Date,
          required: true,
          default: Date.now,
        },

        type: {
          type: String,
          enum: [
            'phone_call',
            'email',
            'letter',
            'text_message',
            'patient_portal_message',
            'in_person',
            'legal_notice',
            'settlement_offer',
            'payment_received',
            'other',
          ],
          required: true,
        },

        method: {
          type: String,
          enum: ['internal', 'external_agency', 'legal'],
        },

        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },

        performedByName: String,

        outcome: {
          type: String,
          enum: [
            'contact_made',
            'no_answer',
            'left_message',
            'payment_promised',
            'payment_received',
            'dispute_raised',
            'refused_payment',
            'disconnected',
            'incorrect_contact',
            'other',
          ],
        },

        notes: String,

        nextFollowUpDate: Date,

        amountPromised: Number,
        amountCollected: Number,
      },
    ],

    // External collection agency
    externalCollection: {
      agencyName: String,
      agencyContact: String,
      agencyPhone: String,
      agencyEmail: String,

      sentDate: Date,
      sentAmount: Number,

      commissionRate: Number, // Percentage

      collectedAmount: Number,
      commissionPaid: Number,

      returnedDate: Date,
      returnedReason: String,

      status: {
        type: String,
        enum: ['active', 'returned', 'settled', 'closed'],
      },
    },

    // Legal action
    legalAction: {
      initiated: { type: Boolean, default: false },
      initiatedDate: Date,

      type: {
        type: String,
        enum: ['small_claims', 'civil_suit', 'judgment', 'garnishment', 'lien'],
      },

      caseNumber: String,
      courtName: String,
      attorneyName: String,
      attorneyFirm: String,

      filingFees: Number,
      attorneyFees: Number,

      judgmentDate: Date,
      judgmentAmount: Number,

      status: String,
      notes: String,
    },

    // Settlement
    settlement: {
      offered: { type: Boolean, default: false },
      offerDate: Date,
      offerAmount: Number,
      offerTerms: String,
      offerExpiryDate: Date,

      accepted: { type: Boolean, default: false },
      acceptedDate: Date,

      settledAmount: Number,
      settledDate: Date,
      settlementReason: String,

      paymentReceived: { type: Boolean, default: false },
      paymentReceivedDate: Date,
    },

    // Write-off details
    writeOff: {
      approved: { type: Boolean, default: false },
      approvedDate: Date,
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },

      amount: Number,
      reason: {
        type: String,
        enum: [
          'uncollectible',
          'small_balance',
          'cost_to_collect',
          'bankruptcy_discharge',
          'deceased',
          'statute_of_limitations',
          'settled',
          'other',
        ],
      },
      reasonDetails: String,

      accountingDate: Date, // Date recorded in accounting system
      fiscalYear: Number,
      fiscalQuarter: Number,
    },

    // Bankruptcy information
    bankruptcy: {
      filed: { type: Boolean, default: false },
      filingDate: Date,

      chapter: {
        type: String,
        enum: ['chapter_7', 'chapter_11', 'chapter_13'],
      },

      caseNumber: String,
      courtName: String,
      trustee: String,
      trusteeContact: String,

      claimFiledDate: Date,
      claimAmount: Number,

      discharged: { type: Boolean, default: false },
      dischargeDate: Date,

      amountRecovered: Number,
    },

    // Deceased patient information
    deceasedInfo: {
      confirmed: { type: Boolean, default: false },
      dateOfDeath: Date,
      deathCertificateReceived: Boolean,

      estateInfo: {
        hasEstate: Boolean,
        executorName: String,
        executorContact: String,
        claimFiled: Boolean,
        claimAmount: Number,
        amountRecovered: Number,
      },
    },

    // Alerts and flags
    alerts: [
      {
        type: {
          type: String,
          enum: [
            'high_value',
            'collection_opportunity',
            'settlement_opportunity',
            'legal_recommended',
            'bankruptcy_filed',
            'patient_deceased',
            'dispute_filed',
            'statute_of_limitations',
            'compliance_issue',
            'fraud_suspected',
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

    // Compliance tracking
    compliance: {
      fdcpaCompliant: { type: Boolean, default: true }, // Fair Debt Collection Practices Act

      lastContactDate: Date,
      contactCount: { type: Number, default: 0 },

      patientDisputedDebt: { type: Boolean, default: false },
      disputeDate: Date,
      disputeReason: String,
      disputeResolved: Boolean,
      disputeResolutionDate: Date,

      ceaseAndDesistReceived: { type: Boolean, default: false },
      ceaseAndDesistDate: Date,

      validationLetterSent: Boolean,
      validationLetterDate: Date,

      statuteOfLimitationsDate: Date,

      complianceNotes: [String],
    },

    // Assignment and workflow
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    assignedDate: Date,

    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },

    nextActionDate: {
      type: Date,
      index: true,
    },

    nextActionType: String,

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

    internalNotes: String, // Confidential notes not shared with patient
  },
  {
    timestamps: true,
  }
);

// Indexes
// DUPLICATE INDEX - Auto-commented by deduplication tool
// badDebtSchema.index({ patient: 1, status: 1 });
badDebtSchema.index({ 'financial.agingBucket': 1, status: 1 });
badDebtSchema.index({ status: 1, priority: 1 });
badDebtSchema.index({ status: 1, 'financial.currentBalance': -1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// badDebtSchema.index({ assignedTo: 1, status: 1 });
badDebtSchema.index({ nextActionDate: 1 });
badDebtSchema.index({ 'financial.firstBillingDate': 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// badDebtSchema.index({ createdAt: 1 });

// Pre-save middleware
badDebtSchema.pre('save', function (next) {
  // Generate bad debt number if not present
  if (!this.badDebtNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    this.badDebtNumber = `BD-${timestamp}-${random}`;
  }

  // Calculate days past due
  if (this.financial.firstBillingDate) {
    const now = new Date();
    const daysPastDue = Math.floor((now - this.financial.firstBillingDate) / (1000 * 60 * 60 * 24));
    this.financial.daysPastDue = daysPastDue;

    // Update aging bucket
    if (daysPastDue <= 30) {
      this.financial.agingBucket = '0-30';
    } else if (daysPastDue <= 60) {
      this.financial.agingBucket = '31-60';
    } else if (daysPastDue <= 90) {
      this.financial.agingBucket = '61-90';
    } else if (daysPastDue <= 120) {
      this.financial.agingBucket = '91-120';
    } else if (daysPastDue <= 180) {
      this.financial.agingBucket = '121-180';
    } else if (daysPastDue <= 365) {
      this.financial.agingBucket = '181-365';
    } else {
      this.financial.agingBucket = '365+';
    }
  }

  // Calculate current balance
  this.financial.currentBalance =
    this.financial.originalAmount - this.financial.writeOffAmount - this.financial.collectedAmount;

  next();
});

// Instance methods

/**
 * Add collection effort
 */
badDebtSchema.methods.addCollectionEffort = function (effortData) {
  this.collectionEfforts.push({
    date: effortData.date || new Date(),
    type: effortData.type,
    method: effortData.method || 'internal',
    performedBy: effortData.performedBy,
    performedByName: effortData.performedByName,
    outcome: effortData.outcome,
    notes: effortData.notes,
    nextFollowUpDate: effortData.nextFollowUpDate,
    amountPromised: effortData.amountPromised,
    amountCollected: effortData.amountCollected,
  });

  // Update compliance tracking
  this.compliance.lastContactDate = effortData.date || new Date();
  this.compliance.contactCount += 1;

  // Update financial if payment collected
  if (effortData.amountCollected && effortData.amountCollected > 0) {
    this.recordPayment(effortData.amountCollected, effortData.date);
  }

  // Set next action date if provided
  if (effortData.nextFollowUpDate) {
    this.nextActionDate = effortData.nextFollowUpDate;
    this.nextActionType = 'follow_up';
  }
};

/**
 * Record payment
 */
badDebtSchema.methods.recordPayment = function (amount, date = new Date()) {
  this.financial.collectedAmount += amount;
  this.financial.lastPaymentDate = date;
  this.financial.lastPaymentAmount = amount;

  // Check if fully recovered
  if (this.financial.currentBalance <= 0) {
    this.status = 'recovered';
  }

  this.addAlert('collection_opportunity', `Payment of $${amount.toFixed(2)} received`, 'info');
};

/**
 * Send to external collection
 */
badDebtSchema.methods.sendToExternalCollection = function (agencyData) {
  this.status = 'external_collection';

  this.externalCollection = {
    agencyName: agencyData.agencyName,
    agencyContact: agencyData.agencyContact,
    agencyPhone: agencyData.agencyPhone,
    agencyEmail: agencyData.agencyEmail,
    sentDate: new Date(),
    sentAmount: this.financial.currentBalance,
    commissionRate: agencyData.commissionRate || 30,
    status: 'active',
  };

  this.addAlert('collection_opportunity', `Sent to ${agencyData.agencyName}`, 'info');
};

/**
 * Initiate legal action
 */
badDebtSchema.methods.initiateLegalAction = function (legalData) {
  this.status = 'legal_action';

  this.legalAction = {
    initiated: true,
    initiatedDate: new Date(),
    type: legalData.type,
    caseNumber: legalData.caseNumber,
    courtName: legalData.courtName,
    attorneyName: legalData.attorneyName,
    attorneyFirm: legalData.attorneyFirm,
    filingFees: legalData.filingFees,
    attorneyFees: legalData.attorneyFees,
    status: 'filed',
  };

  this.addAlert('legal_recommended', `Legal action initiated: ${legalData.type}`, 'warning');
};

/**
 * Offer settlement
 */
badDebtSchema.methods.offerSettlement = function (offerAmount, terms, expiryDays = 30) {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + expiryDays);

  this.settlement = {
    offered: true,
    offerDate: new Date(),
    offerAmount,
    offerTerms: terms,
    offerExpiryDate: expiryDate,
    accepted: false,
  };

  this.status = 'settlement_pending';

  this.addAlert('settlement_opportunity', `Settlement offered: $${offerAmount.toFixed(2)}`, 'info');
};

/**
 * Accept settlement
 */
badDebtSchema.methods.acceptSettlement = function () {
  if (!this.settlement.offered) {
    throw new Error('No settlement offer exists');
  }

  this.settlement.accepted = true;
  this.settlement.acceptedDate = new Date();
  this.status = 'settled';

  this.addAlert('settlement_opportunity', 'Settlement accepted', 'info');
};

/**
 * Write off bad debt
 */
badDebtSchema.methods.writeOff = function (reason, reasonDetails, approvedBy) {
  const now = new Date();

  this.writeOff = {
    approved: true,
    approvedDate: now,
    approvedBy,
    amount: this.financial.currentBalance,
    reason,
    reasonDetails,
    accountingDate: now,
    fiscalYear: now.getFullYear(),
    fiscalQuarter: Math.floor(now.getMonth() / 3) + 1,
  };

  this.financial.writeOffAmount = this.financial.currentBalance;
  this.status = 'written_off';

  this.addAlert(
    'high_value',
    `Account written off: $${this.financial.currentBalance.toFixed(2)}`,
    'warning'
  );
};

/**
 * Mark patient as deceased
 */
badDebtSchema.methods.markAsDeceased = function (dateOfDeath, deathCertificateReceived = false) {
  this.deceasedInfo = {
    confirmed: true,
    dateOfDeath,
    deathCertificateReceived,
  };

  this.status = 'deceased';

  this.addAlert('patient_deceased', 'Patient confirmed deceased', 'critical');
};

/**
 * File bankruptcy
 */
badDebtSchema.methods.fileBankruptcy = function (bankruptcyData) {
  this.bankruptcy = {
    filed: true,
    filingDate: bankruptcyData.filingDate || new Date(),
    chapter: bankruptcyData.chapter,
    caseNumber: bankruptcyData.caseNumber,
    courtName: bankruptcyData.courtName,
    trustee: bankruptcyData.trustee,
    trusteeContact: bankruptcyData.trusteeContact,
  };

  this.status = 'bankruptcy';

  this.addAlert('bankruptcy_filed', `Bankruptcy filed: ${bankruptcyData.chapter}`, 'critical');
};

/**
 * Add alert
 */
badDebtSchema.methods.addAlert = function (type, message, severity = 'info') {
  this.alerts.push({
    type,
    message,
    severity,
    createdAt: new Date(),
    acknowledged: false,
  });
};

/**
 * Calculate collection rate
 */
badDebtSchema.methods.getCollectionRate = function () {
  if (this.financial.originalAmount === 0) return 0;
  return (this.financial.collectedAmount / this.financial.originalAmount) * 100;
};

/**
 * Get collection summary
 */
badDebtSchema.methods.getCollectionSummary = function () {
  return {
    badDebtNumber: this.badDebtNumber,
    patient: this.patientInfo,
    originalAmount: this.financial.originalAmount,
    collectedAmount: this.financial.collectedAmount,
    writeOffAmount: this.financial.writeOffAmount,
    currentBalance: this.financial.currentBalance,
    collectionRate: this.getCollectionRate().toFixed(2) + '%',
    daysPastDue: this.financial.daysPastDue,
    agingBucket: this.financial.agingBucket,
    status: this.status,
    effortCount: this.collectionEfforts.length,
    lastContactDate: this.compliance.lastContactDate,
  };
};

// Static methods

/**
 * Get bad debts by aging bucket
 */
badDebtSchema.statics.getByAgingBucket = function (agingBucket, status = 'in_collection') {
  return this.find({
    'financial.agingBucket': agingBucket,
    status,
  }).populate('patient', 'firstName lastName email phone');
};

/**
 * Get assigned bad debts
 */
badDebtSchema.statics.getAssignedDebts = function (userId) {
  return this.find({
    assignedTo: userId,
    status: { $in: ['identified', 'in_collection', 'settlement_pending'] },
  }).sort({ priority: -1, nextActionDate: 1 });
};

/**
 * Get high priority debts
 */
badDebtSchema.statics.getHighPriority = function (minAmount = 5000) {
  return this.find({
    status: { $in: ['identified', 'in_collection'] },
    'financial.currentBalance': { $gte: minAmount },
  }).sort({ 'financial.currentBalance': -1 });
};

/**
 * Get debts requiring action
 */
badDebtSchema.statics.getRequiringAction = function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return this.find({
    status: { $in: ['identified', 'in_collection', 'settlement_pending'] },
    nextActionDate: { $lte: today },
  })
    .populate('patient', 'firstName lastName email phone')
    .populate('assignedTo', 'firstName lastName email')
    .sort({ priority: -1, nextActionDate: 1 });
};

/**
 * Get statistics
 */
badDebtSchema.statics.getStatistics = async function (startDate, endDate) {
  const filter = {};
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const [
    totalCount,
    totalAmount,
    collectedAmount,
    writeOffAmount,
    byStatus,
    byAgingBucket,
    byClassification,
  ] = await Promise.all([
    this.countDocuments(filter),

    this.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$financial.originalAmount' } } },
    ]),

    this.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$financial.collectedAmount' } } },
    ]),

    this.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$financial.writeOffAmount' } } },
    ]),

    this.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          amount: { $sum: '$financial.currentBalance' },
        },
      },
    ]),

    this.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$financial.agingBucket',
          count: { $sum: 1 },
          amount: { $sum: '$financial.currentBalance' },
        },
      },
    ]),

    this.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$classification.type',
          count: { $sum: 1 },
          amount: { $sum: '$financial.originalAmount' },
        },
      },
    ]),
  ]);

  const totalAmountValue = totalAmount[0]?.total || 0;
  const collectedAmountValue = collectedAmount[0]?.total || 0;
  const writeOffAmountValue = writeOffAmount[0]?.total || 0;
  const collectionRate =
    totalAmountValue > 0 ? ((collectedAmountValue / totalAmountValue) * 100).toFixed(2) : 0;

  return {
    period: { startDate, endDate },
    overview: {
      totalCount,
      totalAmount: totalAmountValue,
      collectedAmount: collectedAmountValue,
      writeOffAmount: writeOffAmountValue,
      outstandingBalance: totalAmountValue - collectedAmountValue - writeOffAmountValue,
      collectionRate: `${collectionRate}%`,
    },
    byStatus: byStatus.reduce((acc, item) => {
      acc[item._id] = { count: item.count, amount: item.amount };
      return acc;
    }, {}),
    byAgingBucket: byAgingBucket.reduce((acc, item) => {
      acc[item._id] = { count: item.count, amount: item.amount };
      return acc;
    }, {}),
    byClassification: byClassification.reduce((acc, item) => {
      acc[item._id] = { count: item.count, amount: item.amount };
      return acc;
    }, {}),
  };
};

const BadDebt = mongoose.model('BadDebt', badDebtSchema);

module.exports = BadDebt;
