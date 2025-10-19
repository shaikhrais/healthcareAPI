const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
const paymentGatewaySchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    // Stripe Configuration
    stripe: {
      enabled: {
        type: Boolean,
        default: false,
      },
      accountId: {
        type: String,
        sparse: true,
      },
      publishableKey: {
        type: String,
      },
      secretKey: {
        type: String,
        select: false, // Don't include in queries by default
      },
      webhookSecret: {
        type: String,
        select: false,
      },
      mode: {
        type: String,
        enum: ['test', 'live'],
        default: 'test',
      },
      supportedPaymentMethods: [
        {
          type: String,
          enum: ['card', 'apple_pay', 'google_pay', 'link', 'us_bank_account', 'afterpay_clearpay'],
        },
      ],
      paymentIntentSettings: {
        captureMethod: {
          type: String,
          enum: ['automatic', 'manual'],
          default: 'automatic',
        },
        statementDescriptor: {
          type: String,
          maxlength: 22,
        },
        receiptEmail: {
          type: Boolean,
          default: true,
        },
      },
      statistics: {
        totalTransactions: { type: Number, default: 0 },
        successfulTransactions: { type: Number, default: 0 },
        failedTransactions: { type: Number, default: 0 },
        totalAmountProcessed: { type: Number, default: 0 }, // in cents
        totalRefunded: { type: Number, default: 0 }, // in cents
      },
      lastSync: {
        type: Date,
      },
    },

    // Apple Pay Configuration
    applePay: {
      enabled: {
        type: Boolean,
        default: false,
      },
      merchantId: {
        type: String,
      },
      merchantName: {
        type: String,
      },
      domainVerification: {
        verified: {
          type: Boolean,
          default: false,
        },
        domains: [
          {
            domain: String,
            verifiedAt: Date,
          },
        ],
      },
      countryCode: {
        type: String,
        default: 'US',
      },
      currencyCode: {
        type: String,
        default: 'USD',
      },
      supportedNetworks: [
        {
          type: String,
          enum: ['amex', 'discover', 'masterCard', 'visa', 'chinaUnionPay', 'interac', 'jcb'],
        },
      ],
      capabilities: [
        {
          type: String,
          enum: ['supports3DS', 'supportsCredit', 'supportsDebit'],
        },
      ],
      statistics: {
        totalTransactions: { type: Number, default: 0 },
        successfulTransactions: { type: Number, default: 0 },
        failedTransactions: { type: Number, default: 0 },
        totalAmountProcessed: { type: Number, default: 0 },
      },
    },

    // Google Pay Configuration
    googlePay: {
      enabled: {
        type: Boolean,
        default: false,
      },
      merchantId: {
        type: String,
      },
      merchantName: {
        type: String,
      },
      gateway: {
        type: String,
        default: 'stripe', // Which gateway handles Google Pay (stripe, braintree, etc.)
      },
      gatewayMerchantId: {
        type: String,
      },
      environment: {
        type: String,
        enum: ['TEST', 'PRODUCTION'],
        default: 'TEST',
      },
      allowedCardNetworks: [
        {
          type: String,
          enum: ['AMEX', 'DISCOVER', 'INTERAC', 'JCB', 'MASTERCARD', 'VISA'],
        },
      ],
      allowedCardAuthMethods: [
        {
          type: String,
          enum: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
        },
      ],
      billingAddressRequired: {
        type: Boolean,
        default: false,
      },
      billingAddressFormat: {
        type: String,
        enum: ['MIN', 'FULL'],
        default: 'MIN',
      },
      statistics: {
        totalTransactions: { type: Number, default: 0 },
        successfulTransactions: { type: Number, default: 0 },
        failedTransactions: { type: Number, default: 0 },
        totalAmountProcessed: { type: Number, default: 0 },
      },
    },

    // Transactions Log
    transactions: [
      {
        transactionId: {
          type: String,
          required: true,
          index: true,
        },
        paymentMethod: {
          type: String,
          enum: [
            'stripe_card',
            'apple_pay',
            'google_pay',
            'stripe_link',
            'stripe_bank',
            'afterpay',
          ],
          required: true,
        },
        gatewayTransactionId: {
          type: String, // Stripe Payment Intent ID, etc.
          index: true,
        },
        patientId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Patient',
          index: true,
        },
        appointmentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Appointment',
        },
        amount: {
          type: Number,
          required: true, // in cents
        },
        currency: {
          type: String,
          default: 'USD',
        },
        status: {
          type: String,
          enum: [
            'pending',
            'processing',
            'succeeded',
            'failed',
            'canceled',
            'refunded',
            'partially_refunded',
          ],
          default: 'pending',
          index: true,
        },
        metadata: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
        paymentDetails: {
          cardBrand: String, // visa, mastercard, amex
          last4: String,
          expiryMonth: Number,
          expiryYear: Number,
          fingerprint: String,
          walletType: String, // apple_pay, google_pay
        },
        customerInfo: {
          email: String,
          name: String,
          phone: String,
          billingAddress: {
            line1: String,
            line2: String,
            city: String,
            state: String,
            postalCode: String,
            country: String,
          },
        },
        refunds: [
          {
            refundId: String,
            amount: Number, // in cents
            reason: {
              type: String,
              enum: ['duplicate', 'fraudulent', 'requested_by_customer', 'other'],
            },
            status: {
              type: String,
              enum: ['pending', 'succeeded', 'failed', 'canceled'],
            },
            createdAt: {
              type: Date,
              default: Date.now,
            },
            processedAt: Date,
          },
        ],
        errorMessage: String,
        errorCode: String,
        receiptUrl: String,
        receiptEmail: String,
        description: String,
        statementDescriptor: String,
        processedAt: Date,
        createdAt: {
          type: Date,
          default: Date.now,
          index: true,
        },
      },
    ],

    // Webhook Events Log
    webhookEvents: [
      {
        eventId: {
          type: String,
          required: true,
          unique: true,
        },
        eventType: {
          type: String,
          required: true,
        },
        source: {
          type: String,
          enum: ['stripe', 'apple_pay', 'google_pay'],
          required: true,
        },
        data: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
        processed: {
          type: Boolean,
          default: false,
        },
        processedAt: Date,
        error: String,
        receivedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Payment Links (Stripe-style)
    paymentLinks: [
      {
        linkId: {
          type: String,
          required: true,
          unique: true,
        },
        description: String,
        amount: Number, // in cents
        currency: {
          type: String,
          default: 'USD',
        },
        patientId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Patient',
        },
        status: {
          type: String,
          enum: ['active', 'completed', 'expired', 'canceled'],
          default: 'active',
        },
        url: String,
        expiresAt: Date,
        transactionId: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
        completedAt: Date,
      },
    ],

    // Customers (stored for recurring payments)
    customers: [
      {
        customerId: {
          type: String,
          required: true,
        },
        gateway: {
          type: String,
          enum: ['stripe', 'apple_pay', 'google_pay'],
          required: true,
        },
        gatewayCustomerId: {
          type: String,
          required: true,
        },
        patientId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Patient',
          required: true,
        },
        email: String,
        name: String,
        defaultPaymentMethod: String,
        paymentMethods: [
          {
            paymentMethodId: String,
            type: {
              type: String,
              enum: ['card', 'apple_pay', 'google_pay', 'us_bank_account'],
            },
            isDefault: {
              type: Boolean,
              default: false,
            },
            cardDetails: {
              brand: String,
              last4: String,
              expiryMonth: Number,
              expiryYear: Number,
            },
            createdAt: {
              type: Date,
              default: Date.now,
            },
          },
        ],
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Subscription Plans (if applicable)
    subscriptionPlans: [
      {
        planId: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        description: String,
        amount: {
          type: Number,
          required: true, // in cents
        },
        currency: {
          type: String,
          default: 'USD',
        },
        interval: {
          type: String,
          enum: ['day', 'week', 'month', 'year'],
          required: true,
        },
        intervalCount: {
          type: Number,
          default: 1,
        },
        trialPeriodDays: Number,
        active: {
          type: Boolean,
          default: true,
        },
        gatewayPlanId: String, // Stripe Price ID
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // General Settings
    settings: {
      defaultCurrency: {
        type: String,
        default: 'USD',
      },
      requireBillingAddress: {
        type: Boolean,
        default: false,
      },
      savePaymentMethods: {
        type: Boolean,
        default: true,
      },
      sendReceiptEmails: {
        type: Boolean,
        default: true,
      },
      allowPartialPayments: {
        type: Boolean,
        default: false,
      },
      minimumPaymentAmount: {
        type: Number,
        default: 50, // in cents ($0.50)
      },
      maximumPaymentAmount: {
        type: Number,
        default: 99999900, // in cents ($999,999.00)
      },
      taxRate: {
        type: Number,
        default: 0, // percentage
      },
      processingFeePercentage: {
        type: Number,
        default: 2.9, // Stripe's typical fee
      },
      processingFeeFixed: {
        type: Number,
        default: 30, // in cents
      },
      passFeesToCustomer: {
        type: Boolean,
        default: false,
      },
    },

    // Audit Trail
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
// DUPLICATE INDEX - Auto-commented by deduplication tool
// paymentGatewaySchema.index({ organization: 1, isDeleted: 1 });
paymentGatewaySchema.index({ 'transactions.transactionId': 1 });
paymentGatewaySchema.index({ 'transactions.status': 1 });
paymentGatewaySchema.index({ 'transactions.patientId': 1 });
paymentGatewaySchema.index({ 'transactions.createdAt': -1 });
paymentGatewaySchema.index({ 'customers.patientId': 1 });
paymentGatewaySchema.index({ 'webhookEvents.eventId': 1 });

// Virtual: Total Revenue
paymentGatewaySchema.virtual('totalRevenue').get(function () {
  const stripeRevenue = this.stripe.statistics.totalAmountProcessed || 0;
  const applePayRevenue = this.applePay.statistics.totalAmountProcessed || 0;
  const googlePayRevenue = this.googlePay.statistics.totalAmountProcessed || 0;
  return stripeRevenue + applePayRevenue + googlePayRevenue;
});

// Virtual: Total Transaction Count
paymentGatewaySchema.virtual('totalTransactionCount').get(function () {
  const stripeCount = this.stripe.statistics.totalTransactions || 0;
  const applePayCount = this.applePay.statistics.totalTransactions || 0;
  const googlePayCount = this.googlePay.statistics.totalTransactions || 0;
  return stripeCount + applePayCount + googlePayCount;
});

// Virtual: Overall Success Rate
paymentGatewaySchema.virtual('successRate').get(function () {
  const totalSuccessful =
    (this.stripe.statistics.successfulTransactions || 0) +
    (this.applePay.statistics.successfulTransactions || 0) +
    (this.googlePay.statistics.successfulTransactions || 0);

  const totalTransactions = this.totalTransactionCount;

  if (totalTransactions === 0) return 100;
  return ((totalSuccessful / totalTransactions) * 100).toFixed(2);
});

// Virtual: Active Payment Methods
paymentGatewaySchema.virtual('activePaymentMethods').get(function () {
  const methods = [];
  if (this.stripe.enabled) methods.push('stripe');
  if (this.applePay.enabled) methods.push('apple_pay');
  if (this.googlePay.enabled) methods.push('google_pay');
  return methods;
});

// Static Methods

// Get by Organization
paymentGatewaySchema.statics.getByOrganization = async function (organizationId) {
  return this.findOne({
    organization: organizationId,
    isDeleted: false,
  });
};

// Get Transaction History
paymentGatewaySchema.statics.getTransactionHistory = async function (organizationId, filters = {}) {
  const config = await this.findOne({ organization: organizationId, isDeleted: false });
  if (!config) return [];

  let { transactions } = config;

  if (filters.status) {
    transactions = transactions.filter((t) => t.status === filters.status);
  }

  if (filters.paymentMethod) {
    transactions = transactions.filter((t) => t.paymentMethod === filters.paymentMethod);
  }

  if (filters.patientId) {
    transactions = transactions.filter(
      (t) => t.patientId && t.patientId.toString() === filters.patientId.toString()
    );
  }

  if (filters.startDate || filters.endDate) {
    transactions = transactions.filter((t) => {
      const transDate = new Date(t.createdAt);
      if (filters.startDate && transDate < new Date(filters.startDate)) return false;
      if (filters.endDate && transDate > new Date(filters.endDate)) return false;
      return true;
    });
  }

  return transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

// Get Revenue Statistics
paymentGatewaySchema.statics.getRevenueStats = async function (organizationId, period = 'all') {
  const config = await this.findOne({ organization: organizationId, isDeleted: false });
  if (!config) return null;

  let startDate;
  const now = new Date();

  switch (period) {
    case 'today':
      startDate = new Date(now.setHours(0, 0, 0, 0));
      break;
    case 'week':
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case 'month':
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case 'year':
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    default:
      startDate = new Date(0); // All time
  }

  const filteredTransactions = config.transactions.filter(
    (t) => t.status === 'succeeded' && new Date(t.createdAt) >= startDate
  );

  const totalRevenue = filteredTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalRefunds = filteredTransactions.reduce((sum, t) => {
    return (
      sum +
      t.refunds.reduce(
        (refundSum, r) => (r.status === 'succeeded' ? refundSum + r.amount : refundSum),
        0
      )
    );
  }, 0);

  return {
    period,
    totalRevenue,
    totalRefunds,
    netRevenue: totalRevenue - totalRefunds,
    transactionCount: filteredTransactions.length,
    averageTransactionAmount:
      filteredTransactions.length > 0 ? totalRevenue / filteredTransactions.length : 0,
  };
};

// Instance Methods

// Add Transaction
paymentGatewaySchema.methods.addTransaction = async function (transactionData) {
  const transactionId =
    transactionData.transactionId || `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  this.transactions.push({
    ...transactionData,
    transactionId,
  });

  // Update statistics
  const gateway = transactionData.paymentMethod.includes('apple')
    ? 'applePay'
    : transactionData.paymentMethod.includes('google')
      ? 'googlePay'
      : 'stripe';

  this[gateway].statistics.totalTransactions += 1;

  if (transactionData.status === 'succeeded') {
    this[gateway].statistics.successfulTransactions += 1;
    this[gateway].statistics.totalAmountProcessed += transactionData.amount;
  } else if (transactionData.status === 'failed') {
    this[gateway].statistics.failedTransactions += 1;
  }

  return this.save();
};

// Update Transaction Status
paymentGatewaySchema.methods.updateTransactionStatus = async function (
  transactionId,
  status,
  additionalData = {}
) {
  const transaction = this.transactions.find((t) => t.transactionId === transactionId);
  if (!transaction) {
    throw new Error('Transaction not found');
  }

  const oldStatus = transaction.status;
  transaction.status = status;

  if (additionalData.errorMessage) {
    transaction.errorMessage = additionalData.errorMessage;
  }
  if (additionalData.errorCode) {
    transaction.errorCode = additionalData.errorCode;
  }
  if (status === 'succeeded') {
    transaction.processedAt = new Date();
  }

  // Update statistics
  const gateway = transaction.paymentMethod.includes('apple')
    ? 'applePay'
    : transaction.paymentMethod.includes('google')
      ? 'googlePay'
      : 'stripe';

  if (oldStatus !== 'succeeded' && status === 'succeeded') {
    this[gateway].statistics.successfulTransactions += 1;
    this[gateway].statistics.totalAmountProcessed += transaction.amount;
  } else if (oldStatus !== 'failed' && status === 'failed') {
    this[gateway].statistics.failedTransactions += 1;
  }

  return this.save();
};

// Add Refund to Transaction
paymentGatewaySchema.methods.addRefund = async function (transactionId, refundData) {
  const transaction = this.transactions.find((t) => t.transactionId === transactionId);
  if (!transaction) {
    throw new Error('Transaction not found');
  }

  if (transaction.status !== 'succeeded') {
    throw new Error('Can only refund succeeded transactions');
  }

  const refundId =
    refundData.refundId || `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  transaction.refunds.push({
    ...refundData,
    refundId,
  });

  // Update transaction status
  const totalRefunded = transaction.refunds.reduce(
    (sum, r) => (r.status === 'succeeded' ? sum + r.amount : sum),
    0
  );

  if (totalRefunded >= transaction.amount) {
    transaction.status = 'refunded';
  } else if (totalRefunded > 0) {
    transaction.status = 'partially_refunded';
  }

  // Update statistics
  const gateway = transaction.paymentMethod.includes('apple')
    ? 'applePay'
    : transaction.paymentMethod.includes('google')
      ? 'googlePay'
      : 'stripe';

  if (refundData.status === 'succeeded') {
    this[gateway].statistics.totalRefunded += refundData.amount;
  }

  return this.save();
};

// Add Customer
paymentGatewaySchema.methods.addCustomer = async function (customerData) {
  const customerId =
    customerData.customerId || `CUST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  this.customers.push({
    ...customerData,
    customerId,
  });

  return this.save();
};

// Add Payment Method to Customer
paymentGatewaySchema.methods.addPaymentMethod = async function (customerId, paymentMethodData) {
  const customer = this.customers.find((c) => c.customerId === customerId);
  if (!customer) {
    throw new Error('Customer not found');
  }

  // If this is set as default, unset other defaults
  if (paymentMethodData.isDefault) {
    customer.paymentMethods.forEach((pm) => {
      pm.isDefault = false;
    });
    customer.defaultPaymentMethod = paymentMethodData.paymentMethodId;
  }

  customer.paymentMethods.push(paymentMethodData);

  return this.save();
};

// Create Payment Link
paymentGatewaySchema.methods.createPaymentLink = async function (linkData) {
  const linkId = linkData.linkId || `LINK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Set expiration if not provided (default 7 days)
  if (!linkData.expiresAt) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    linkData.expiresAt = expiresAt;
  }

  this.paymentLinks.push({
    ...linkData,
    linkId,
  });

  return this.save();
};

// Record Webhook Event
paymentGatewaySchema.methods.recordWebhookEvent = async function (eventData) {
  this.webhookEvents.push(eventData);

  // Keep only last 1000 webhook events
  if (this.webhookEvents.length > 1000) {
    this.webhookEvents = this.webhookEvents.slice(-1000);
  }

  return this.save();
};

// Soft Delete
paymentGatewaySchema.methods.softDelete = async function (userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

// Restore
paymentGatewaySchema.methods.restore = async function () {
  this.isDeleted = false;
  this.deletedAt = null;
  this.deletedBy = null;
  return this.save();
};

module.exports = mongoose.model('PaymentGateway', paymentGatewaySchema);
