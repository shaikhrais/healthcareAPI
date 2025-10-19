const mongoose = require('mongoose');

/**
 * Agency Placement Model
 *
 * Tracks individual bad debt accounts placed with collection agencies
 * including status updates, payments, and commission tracking
 */

// eslint-disable-next-line no-unused-vars

const agencyPlacementSchema = new mongoose.Schema(
  {
    // Identification
    placementNumber: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    // Associated records
    agency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CollectionsAgency',
      required: true,
      index: true,
    },

    badDebt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BadDebt',
      required: true,
      index: true,
    },

    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },

    // Agency reference numbers
    agencyReferenceNumber: {
      type: String,
      index: true,
    },

    agencyAccountNumber: String,

    // Placement details
    placementDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    placementMethod: {
      type: String,
      enum: ['api', 'sftp', 'email', 'manual', 'web_portal'],
      required: true,
    },

    // Financial details
    financial: {
      placedAmount: {
        type: Number,
        required: true,
        min: 0,
      },

      collectedAmount: {
        type: Number,
        default: 0,
        min: 0,
      },

      remainingBalance: {
        type: Number,
        required: true,
        min: 0,
      },

      commissionRate: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },

      commissionEarned: {
        type: Number,
        default: 0,
        min: 0,
      },

      commissionPaid: {
        type: Number,
        default: 0,
        min: 0,
      },

      commissionDue: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    // Status tracking
    status: {
      type: String,
      enum: [
        'pending_placement', // Queued for placement
        'placed', // Placed with agency
        'active', // Active collection
        'payment_plan', // On payment plan with agency
        'settled', // Settled
        'recalled', // Recalled by practice
        'returned', // Returned by agency
        'closed_collected', // Closed - fully collected
        'closed_uncollectible', // Closed - uncollectible
        'legal', // In legal action
        'bankruptcy', // Patient bankruptcy
        'deceased', // Patient deceased
      ],
      default: 'pending_placement',
      required: true,
      index: true,
    },

    statusHistory: [
      {
        status: String,
        changedDate: { type: Date, default: Date.now },
        changedBy: String,
        reason: String,
        notes: String,
      },
    ],

    // Collection activities
    collection: {
      firstContactDate: Date,
      firstCollectionDate: Date,
      lastContactDate: Date,
      lastCollectionDate: Date,

      contactAttempts: {
        type: Number,
        default: 0,
      },

      paymentReceived: {
        type: Boolean,
        default: false,
      },

      paymentPlanActive: {
        type: Boolean,
        default: false,
      },
    },

    // Payment tracking
    payments: [
      {
        paymentDate: {
          type: Date,
          required: true,
        },

        amount: {
          type: Number,
          required: true,
          min: 0,
        },

        paymentMethod: String,

        agencyTransactionId: String,

        commission: Number,

        notes: String,

        recordedDate: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Status updates from agency
    agencyUpdates: [
      {
        updateDate: {
          type: Date,
          required: true,
          default: Date.now,
        },

        updateType: {
          type: String,
          enum: [
            'status_change',
            'contact_attempt',
            'payment',
            'note',
            'payment_plan',
            'legal_action',
            'returned',
          ],
        },

        status: String,

        contactAttempt: {
          method: String,
          outcome: String,
          nextContactDate: Date,
        },

        message: String,

        data: mongoose.Schema.Types.Mixed,

        processedDate: Date,
        processed: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // Return/Recall details
    returnRecall: {
      type: {
        type: String,
        enum: ['recall', 'return'],
      },

      date: Date,

      reason: String,

      requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },

      approved: Boolean,
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      approvedDate: Date,

      processedDate: Date,

      notes: String,
    },

    // Settlement details (if applicable)
    settlement: {
      offered: Boolean,
      offerAmount: Number,
      offerDate: Date,

      accepted: Boolean,
      acceptedAmount: Number,
      acceptedDate: Date,

      paidAmount: Number,
      paidDate: Date,
    },

    // Legal action (if applicable)
    legalAction: {
      initiated: Boolean,
      initiatedDate: Date,
      type: String,
      caseNumber: String,
      status: String,
    },

    // Data sent to agency
    dataSent: {
      patientName: String,
      patientContact: {
        email: String,
        phone: String,
        address: String,
      },
      serviceDate: Date,
      originalCreditor: String,
      accountNumber: String,
      additionalInfo: mongoose.Schema.Types.Mixed,
    },

    // Sync tracking
    syncStatus: {
      lastSyncAttempt: Date,
      lastSuccessfulSync: Date,
      syncErrors: [
        {
          date: Date,
          error: String,
        },
      ],
      pendingSync: {
        type: Boolean,
        default: false,
      },
    },

    // Alerts and notes
    alerts: [
      {
        type: String,
        message: String,
        severity: String,
        createdAt: { type: Date, default: Date.now },
        acknowledged: Boolean,
      },
    ],

    notes: String,
    internalNotes: String,

    // Workflow
    placedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
agencyPlacementSchema.index({ agency: 1, status: 1 });
agencyPlacementSchema.index({ badDebt: 1 });
agencyPlacementSchema.index({ placementDate: -1 });
agencyPlacementSchema.index({ status: 1, 'financial.remainingBalance': -1 });
agencyPlacementSchema.index({ agencyReferenceNumber: 1 });

// Pre-save middleware
agencyPlacementSchema.pre('save', function (next) {
  // Generate placement number if not present
  if (!this.placementNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    this.placementNumber = `PLC-${timestamp}-${random}`;
  }

  // Update remaining balance
  this.financial.remainingBalance = this.financial.placedAmount - this.financial.collectedAmount;

  // Update commission due
  this.financial.commissionDue = this.financial.commissionEarned - this.financial.commissionPaid;

  next();
});

// Instance methods

/**
 * Record payment from agency
 */
agencyPlacementSchema.methods.recordPayment = function (paymentData) {
  const CollectionsAgency = require('./CollectionsAgency');

  // Add payment
  this.payments.push({
    paymentDate: paymentData.paymentDate || new Date(),
    amount: paymentData.amount,
    paymentMethod: paymentData.paymentMethod,
    agencyTransactionId: paymentData.agencyTransactionId,
    commission: paymentData.commission,
    notes: paymentData.notes,
  });

  // Update financial totals
  this.financial.collectedAmount += paymentData.amount;

  if (!this.collection.firstCollectionDate) {
    this.collection.firstCollectionDate = paymentData.paymentDate || new Date();
  }

  this.collection.lastCollectionDate = paymentData.paymentDate || new Date();
  this.collection.paymentReceived = true;

  // Calculate and update commission
  const commission =
    paymentData.commission || paymentData.amount * (this.financial.commissionRate / 100);
  this.financial.commissionEarned += commission;

  // Check if fully collected
  if (this.financial.remainingBalance <= 0) {
    this.status = 'closed_collected';
    this.addStatusHistory('closed_collected', 'system', 'Fully collected');
  }
};

/**
 * Record agency update
 */
agencyPlacementSchema.methods.recordAgencyUpdate = function (updateData) {
  this.agencyUpdates.push({
    updateDate: updateData.updateDate || new Date(),
    updateType: updateData.updateType,
    status: updateData.status,
    contactAttempt: updateData.contactAttempt,
    message: updateData.message,
    data: updateData.data,
    processed: false,
  });

  // Update contact tracking
  if (updateData.updateType === 'contact_attempt') {
    this.collection.contactAttempts += 1;
    this.collection.lastContactDate = updateData.updateDate || new Date();

    if (!this.collection.firstContactDate) {
      this.collection.firstContactDate = updateData.updateDate || new Date();
    }
  }

  // Update status if provided
  if (updateData.status && updateData.status !== this.status) {
    this.addStatusHistory(updateData.status, 'agency', updateData.message);
    this.status = updateData.status;
  }
};

/**
 * Recall placement
 */
agencyPlacementSchema.methods.recall = function (reason, userId) {
  this.returnRecall = {
    type: 'recall',
    date: new Date(),
    reason,
    requestedBy: userId,
    approved: false,
  };

  this.status = 'recalled';
  this.addStatusHistory('recalled', 'practice', reason);
};

/**
 * Mark as returned by agency
 */
agencyPlacementSchema.methods.returnToSender = function (reason) {
  this.returnRecall = {
    type: 'return',
    date: new Date(),
    reason,
    processedDate: new Date(),
  };

  this.status = 'returned';
  this.addStatusHistory('returned', 'agency', reason);
};

/**
 * Add status history
 */
agencyPlacementSchema.methods.addStatusHistory = function (status, changedBy, reason, notes) {
  this.statusHistory.push({
    status,
    changedDate: new Date(),
    changedBy,
    reason,
    notes,
  });
};

/**
 * Get placement summary
 */
agencyPlacementSchema.methods.getPlacementSummary = function () {
  const daysSincePlacement = Math.floor((new Date() - this.placementDate) / (1000 * 60 * 60 * 24));
  const collectionRate =
    this.financial.placedAmount > 0
      ? (this.financial.collectedAmount / this.financial.placedAmount) * 100
      : 0;

  return {
    placementNumber: this.placementNumber,
    agencyReferenceNumber: this.agencyReferenceNumber,
    status: this.status,
    placementDate: this.placementDate,
    daysSincePlacement,
    financial: {
      placedAmount: this.financial.placedAmount,
      collectedAmount: this.financial.collectedAmount,
      remainingBalance: this.financial.remainingBalance,
      collectionRate: collectionRate.toFixed(2) + '%',
      commissionEarned: this.financial.commissionEarned,
      commissionDue: this.financial.commissionDue,
    },
    collection: {
      firstContactDate: this.collection.firstContactDate,
      lastContactDate: this.collection.lastContactDate,
      contactAttempts: this.collection.contactAttempts,
      paymentReceived: this.collection.paymentReceived,
    },
    paymentCount: this.payments.length,
  };
};

// Static methods

/**
 * Get active placements for agency
 */
agencyPlacementSchema.statics.getActivePlacementsForAgency = function (agencyId) {
  return this.find({
    agency: agencyId,
    status: { $in: ['placed', 'active', 'payment_plan', 'legal'] },
  })
    .populate('badDebt', 'badDebtNumber financial')
    .populate('patient', 'firstName lastName')
    .sort({ placementDate: -1 });
};

/**
 * Get placements pending sync
 */
agencyPlacementSchema.statics.getPendingSync = function (agencyId) {
  return this.find({
    agency: agencyId,
    'syncStatus.pendingSync': true,
    status: { $nin: ['recalled', 'returned', 'closed_collected', 'closed_uncollectible'] },
  });
};

/**
 * Get placements with payments
 */
agencyPlacementSchema.statics.getPlacementsWithPayments = function (agencyId, startDate, endDate) {
  const filter = {
    agency: agencyId,
    payments: { $exists: true, $ne: [] },
  };

  if (startDate || endDate) {
    filter['payments.paymentDate'] = {};
    if (startDate) filter['payments.paymentDate'].$gte = new Date(startDate);
    if (endDate) filter['payments.paymentDate'].$lte = new Date(endDate);
  }

  return this.find(filter)
    .populate('badDebt', 'badDebtNumber patientInfo')
    .sort({ 'payments.paymentDate': -1 });
};

/**
 * Get placement statistics for agency
 */
agencyPlacementSchema.statics.getAgencyStatistics = async function (agencyId, startDate, endDate) {
  const filter = { agency: agencyId };

  if (startDate || endDate) {
    filter.placementDate = {};
    if (startDate) filter.placementDate.$gte = new Date(startDate);
    if (endDate) filter.placementDate.$lte = new Date(endDate);
  }

  const [totalPlacements, activePlacements, byStatus, financials] = await Promise.all([
    this.countDocuments(filter),

    this.countDocuments({
      ...filter,
      status: { $in: ['placed', 'active', 'payment_plan', 'legal'] },
    }),

    this.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),

    this.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalPlaced: { $sum: '$financial.placedAmount' },
          totalCollected: { $sum: '$financial.collectedAmount' },
          totalCommissionEarned: { $sum: '$financial.commissionEarned' },
          totalCommissionPaid: { $sum: '$financial.commissionPaid' },
        },
      },
    ]),
  ]);

  const financialData = financials[0] || {
    totalPlaced: 0,
    totalCollected: 0,
    totalCommissionEarned: 0,
    totalCommissionPaid: 0,
  };

  const collectionRate =
    financialData.totalPlaced > 0
      ? ((financialData.totalCollected / financialData.totalPlaced) * 100).toFixed(2)
      : 0;

  return {
    period: { startDate, endDate },
    totalPlacements,
    activePlacements,
    byStatus: byStatus.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    financial: {
      totalPlaced: financialData.totalPlaced,
      totalCollected: financialData.totalCollected,
      remainingBalance: financialData.totalPlaced - financialData.totalCollected,
      collectionRate: `${collectionRate}%`,
      commissionEarned: financialData.totalCommissionEarned,
      commissionPaid: financialData.totalCommissionPaid,
      commissionDue: financialData.totalCommissionEarned - financialData.totalCommissionPaid,
    },
  };
};

const AgencyPlacement = mongoose.model('AgencyPlacement', agencyPlacementSchema);

module.exports = AgencyPlacement;
