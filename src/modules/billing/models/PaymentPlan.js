const mongoose = require('mongoose');

/**
 * Payment Plan Model
 *
 * Manages patient payment plans with installment tracking
 */

// eslint-disable-next-line no-unused-vars

const paymentPlanSchema = new mongoose.Schema(
  {
    // Plan identification
    planNumber: {
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
    },

    // Associated claims/invoices
    claims: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Claim',
      },
    ],

    invoices: [
      {
        invoiceNumber: String,
        amount: Number,
        serviceDate: Date,
      },
    ],

    // Financial details
    financial: {
      totalAmount: {
        type: Number,
        required: true,
        min: 0,
      },

      downPayment: {
        type: Number,
        default: 0,
        min: 0,
      },

      downPaymentPaid: {
        type: Boolean,
        default: false,
      },

      downPaymentDate: Date,

      financedAmount: {
        type: Number,
        required: true,
        min: 0,
      },

      interestRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },

      totalInterest: {
        type: Number,
        default: 0,
      },

      totalWithInterest: {
        type: Number,
        required: true,
      },

      amountPaid: {
        type: Number,
        default: 0,
      },

      remainingBalance: {
        type: Number,
        required: true,
      },
    },

    // Plan terms
    terms: {
      numberOfPayments: {
        type: Number,
        required: true,
        min: 1,
        max: 60, // Maximum 60 months
      },

      paymentAmount: {
        type: Number,
        required: true,
        min: 0,
      },

      paymentFrequency: {
        type: String,
        enum: ['weekly', 'biweekly', 'monthly', 'quarterly'],
        default: 'monthly',
      },

      firstPaymentDate: {
        type: Date,
        required: true,
      },

      finalPaymentDate: {
        type: Date,
        required: true,
      },

      autoPayEnabled: {
        type: Boolean,
        default: false,
      },

      lateFeeAmount: Number,
      lateFeeDays: { type: Number, default: 15 }, // Days after due date
    },

    // Installments
    installments: [
      {
        installmentNumber: {
          type: Number,
          required: true,
        },

        dueDate: {
          type: Date,
          required: true,
          index: true,
        },

        amount: {
          type: Number,
          required: true,
        },

        principalAmount: Number,
        interestAmount: Number,

        status: {
          type: String,
          enum: ['pending', 'paid', 'overdue', 'partial', 'missed', 'waived'],
          default: 'pending',
          index: true,
        },

        paidAmount: {
          type: Number,
          default: 0,
        },

        paidDate: Date,

        paymentMethod: {
          type: String,
          enum: ['credit_card', 'debit_card', 'ach', 'check', 'cash', 'other'],
        },

        transactionId: String,

        lateFee: Number,

        notes: String,
      },
    ],

    // Plan status
    status: {
      type: String,
      enum: [
        'draft',
        'pending_approval',
        'active',
        'completed',
        'defaulted',
        'cancelled',
        'suspended',
      ],
      default: 'draft',
      required: true,
      index: true,
    },

    // Affordability assessment
    affordabilityAssessment: {
      monthlyIncome: Number,
      monthlyExpenses: Number,
      discretionaryIncome: Number,
      recommendedPayment: Number,
      affordabilityScore: Number, // 0-100
      assessmentDate: Date,
      assessmentNotes: String,
    },

    // Payment method
    paymentMethod: {
      type: {
        type: String,
        enum: ['credit_card', 'debit_card', 'ach', 'check', 'cash', 'autopay'],
      },
      cardLast4: String,
      cardBrand: String,
      accountLast4: String,
      routingNumber: String,
    },

    // Alerts and notifications
    alerts: [
      {
        type: {
          type: String,
          enum: [
            'upcoming_payment',
            'overdue_payment',
            'missed_payment',
            'plan_complete',
            'default_warning',
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
      },
    ],

    // Default tracking
    defaultTracking: {
      missedPayments: { type: Number, default: 0 },
      consecutiveMissed: { type: Number, default: 0 },
      totalLateFees: { type: Number, default: 0 },
      defaultDate: Date,
      defaultReason: String,
      sentToCollections: { type: Boolean, default: false },
      collectionsDate: Date,
    },

    // Modification history
    modifications: [
      {
        date: { type: Date, default: Date.now },
        type: {
          type: String,
          enum: ['payment_amount', 'due_date', 'suspended', 'resumed', 'terms_extended'],
        },
        previousValue: String,
        newValue: String,
        reason: String,
        modifiedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],

    // Agreement
    agreement: {
      signedDate: Date,
      signedBy: String, // Patient name
      signature: String, // Base64 or URL to signature image
      ipAddress: String,
      userAgent: String,
      terms: String, // Full terms text
      accepted: { type: Boolean, default: false },
    },

    // Workflow
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    approvedAt: Date,

    notes: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
// DUPLICATE INDEX - Auto-commented by deduplication tool
// paymentPlanSchema.index({ patient: 1, status: 1 });
paymentPlanSchema.index({ 'installments.dueDate': 1, 'installments.status': 1 });
paymentPlanSchema.index({ 'terms.firstPaymentDate': 1 });
paymentPlanSchema.index({ status: 1, 'financial.remainingBalance': 1 });

// Pre-save middleware
paymentPlanSchema.pre('save', function (next) {
  // Generate plan number if not present
  if (!this.planNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    this.planNumber = `PP-${timestamp}-${random}`;
  }

  // Calculate remaining balance
  this.financial.remainingBalance = this.financial.totalWithInterest - this.financial.amountPaid;

  // Update installment statuses
  const now = new Date();
  this.installments.forEach((installment) => {
    if (installment.status === 'pending' && installment.dueDate < now) {
      installment.status = 'overdue';
    }
  });

  next();
});

// Instance methods

/**
 * Record payment for installment
 */
paymentPlanSchema.methods.recordPayment = function (installmentNumber, paymentData) {
  const installment = this.installments.find((i) => i.installmentNumber === installmentNumber);

  if (!installment) {
    throw new Error('Installment not found');
  }

  installment.paidAmount = (installment.paidAmount || 0) + paymentData.amount;
  installment.paidDate = paymentData.date || new Date();
  installment.paymentMethod = paymentData.method;
  installment.transactionId = paymentData.transactionId;

  if (installment.paidAmount >= installment.amount) {
    installment.status = 'paid';
  } else {
    installment.status = 'partial';
  }

  // Update plan totals
  this.financial.amountPaid += paymentData.amount;
  this.financial.remainingBalance = this.financial.totalWithInterest - this.financial.amountPaid;

  // Reset consecutive missed if payment made
  this.defaultTracking.consecutiveMissed = 0;

  // Check if plan is complete
  if (this.financial.remainingBalance <= 0) {
    this.status = 'completed';
  }
};

/**
 * Check if payment is overdue
 */
paymentPlanSchema.methods.hasOverduePayments = function () {
  const now = new Date();
  return this.installments.some(
    (i) => (i.status === 'pending' || i.status === 'partial') && i.dueDate < now
  );
};

/**
 * Get next due payment
 */
paymentPlanSchema.methods.getNextDuePayment = function () {
  const now = new Date();
  return this.installments
    .filter((i) => i.status === 'pending' && i.dueDate >= now)
    .sort((a, b) => a.dueDate - b.dueDate)[0];
};

/**
 * Get overdue installments
 */
paymentPlanSchema.methods.getOverdueInstallments = function () {
  const now = new Date();
  return this.installments.filter(
    (i) => (i.status === 'pending' || i.status === 'partial') && i.dueDate < now
  );
};

/**
 * Calculate late fees
 */
paymentPlanSchema.methods.calculateLateFees = function () {
  const now = new Date();
  let totalLateFees = 0;

  this.installments.forEach((installment) => {
    if (
      (installment.status === 'pending' || installment.status === 'partial') &&
      installment.dueDate < now
    ) {
      const daysLate = Math.floor((now - installment.dueDate) / (1000 * 60 * 60 * 24));

      if (daysLate >= this.terms.lateFeeDays && !installment.lateFee) {
        installment.lateFee = this.terms.lateFeeAmount || 0;
        totalLateFees += installment.lateFee;
      }
    }
  });

  this.defaultTracking.totalLateFees += totalLateFees;
  return totalLateFees;
};

/**
 * Add alert
 */
paymentPlanSchema.methods.addAlert = function (type, message, severity = 'info') {
  this.alerts.push({
    type,
    message,
    severity,
    createdAt: new Date(),
    acknowledged: false,
  });
};

/**
 * Suspend plan
 */
paymentPlanSchema.methods.suspend = function (reason, userId) {
  this.status = 'suspended';
  this.modifications.push({
    date: new Date(),
    type: 'suspended',
    reason,
    modifiedBy: userId,
  });
};

/**
 * Resume plan
 */
paymentPlanSchema.methods.resume = function (userId) {
  this.status = 'active';
  this.modifications.push({
    date: new Date(),
    type: 'resumed',
    modifiedBy: userId,
  });
};

/**
 * Mark as defaulted
 */
paymentPlanSchema.methods.markAsDefaulted = function (reason) {
  this.status = 'defaulted';
  this.defaultTracking.defaultDate = new Date();
  this.defaultTracking.defaultReason = reason;

  this.addAlert('default_warning', `Payment plan defaulted: ${reason}`, 'critical');
};

/**
 * Get payment schedule
 */
paymentPlanSchema.methods.getPaymentSchedule = function () {
  return this.installments.map((installment) => ({
    number: installment.installmentNumber,
    dueDate: installment.dueDate,
    amount: installment.amount,
    principal: installment.principalAmount,
    interest: installment.interestAmount,
    status: installment.status,
    paidAmount: installment.paidAmount,
    paidDate: installment.paidDate,
  }));
};

/**
 * Get payment summary
 */
paymentPlanSchema.methods.getPaymentSummary = function () {
  const paid = this.installments.filter((i) => i.status === 'paid').length;
  const overdue = this.installments.filter((i) => i.status === 'overdue').length;
  const remaining = this.installments.filter((i) => i.status === 'pending').length;

  return {
    totalPayments: this.installments.length,
    paidPayments: paid,
    overduePayments: overdue,
    remainingPayments: remaining,
    totalAmount: this.financial.totalAmount,
    amountPaid: this.financial.amountPaid,
    remainingBalance: this.financial.remainingBalance,
    percentComplete: ((this.financial.amountPaid / this.financial.totalWithInterest) * 100).toFixed(
      2
    ),
    nextPaymentDue: this.getNextDuePayment(),
  };
};

// Static methods

/**
 * Get active plans for patient
 */
paymentPlanSchema.statics.getActiveForPatient = function (patientId) {
  return this.find({
    patient: patientId,
    status: 'active',
  }).sort({ createdAt: -1 });
};

/**
 * Get plans with upcoming payments
 */
paymentPlanSchema.statics.getUpcomingPayments = function (daysAhead = 7) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  return this.find({
    status: 'active',
    installments: {
      $elemMatch: {
        status: 'pending',
        dueDate: { $gte: now, $lte: futureDate },
      },
    },
  }).populate('patient', 'firstName lastName email phone');
};

/**
 * Get overdue plans
 */
paymentPlanSchema.statics.getOverduePlans = function () {
  const now = new Date();

  return this.find({
    status: 'active',
    installments: {
      $elemMatch: {
        status: { $in: ['pending', 'partial'] },
        dueDate: { $lt: now },
      },
    },
  }).populate('patient', 'firstName lastName');
};

/**
 * Get statistics
 */
paymentPlanSchema.statics.getStatistics = async function (startDate, endDate) {
  const filter = { status: { $ne: 'draft' } };
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const [
    totalPlans,
    activePlans,
    completedPlans,
    defaultedPlans,
    byStatus,
    totalFinanced,
    totalCollected,
  ] = await Promise.all([
    this.countDocuments(filter),
    this.countDocuments({ ...filter, status: 'active' }),
    this.countDocuments({ ...filter, status: 'completed' }),
    this.countDocuments({ ...filter, status: 'defaulted' }),
    this.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    this.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$financial.totalWithInterest' } } },
    ]),
    this.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$financial.amountPaid' } } },
    ]),
  ]);

  const totalFinancedAmount = totalFinanced[0]?.total || 0;
  const totalCollectedAmount = totalCollected[0]?.total || 0;
  const collectionRate =
    totalFinancedAmount > 0 ? ((totalCollectedAmount / totalFinancedAmount) * 100).toFixed(2) : 0;

  return {
    period: { startDate, endDate },
    totalPlans,
    activePlans,
    completedPlans,
    defaultedPlans,
    byStatus: byStatus.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    totalFinanced: totalFinancedAmount,
    totalCollected: totalCollectedAmount,
    collectionRate: `${collectionRate}%`,
  };
};

const PaymentPlan = mongoose.model('PaymentPlan', paymentPlanSchema);

module.exports = PaymentPlan;
