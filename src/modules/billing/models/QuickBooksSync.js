/* eslint-disable camelcase */
const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * QuickBooks Sync Model
 * TASK-15.14 - QuickBooks Sync
 *
 * Manages QuickBooks Online integration and synchronization
 * Features:
 * - OAuth 2.0 authentication
 * - Invoice synchronization
 * - Customer sync
 * - Payment tracking
 * - Chart of accounts mapping
 * - Tax rate management
 * - Vendor management
 * - Journal entries
 * - Reports generation
 * - Conflict resolution
 * - Sync scheduling
 * - Error handling and retry
 */

// eslint-disable-next-line no-unused-vars

const quickBooksSyncSchema = new mongoose.Schema(
  {
    // Organization
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      unique: true,
      index: true,
    },

    // QuickBooks Company Info
    quickbooksCompany: {
      realmId: {
        type: String,
        required: true,
        index: true,
      },
      companyName: String,
      country: String,
      currency: String,
      fiscalYearStart: String,
    },

    // OAuth Credentials
    oauth: {
      accessToken: {
        type: String,
        required: true,
      },
      refreshToken: {
        type: String,
        required: true,
      },
      tokenType: {
        type: String,
        default: 'Bearer',
      },
      expiresAt: {
        type: Date,
        required: true,
      },
      refreshTokenExpiresAt: Date,
    },

    // Connection Status
    status: {
      type: String,
      enum: ['connected', 'disconnected', 'error', 'expired', 'syncing'],
      default: 'connected',
      index: true,
    },

    // Sync Configuration
    syncConfig: {
      // What to sync
      syncInvoices: {
        type: Boolean,
        default: true,
      },
      syncCustomers: {
        type: Boolean,
        default: true,
      },
      syncPayments: {
        type: Boolean,
        default: true,
      },
      syncExpenses: {
        type: Boolean,
        default: false,
      },
      syncVendors: {
        type: Boolean,
        default: false,
      },

      // Sync direction
      direction: {
        type: String,
        enum: ['one_way_to_qb', 'one_way_from_qb', 'two_way'],
        default: 'one_way_to_qb',
      },

      // Sync frequency
      autoSync: {
        type: Boolean,
        default: true,
      },
      syncInterval: {
        type: String,
        enum: ['realtime', 'hourly', 'daily', 'weekly', 'manual'],
        default: 'hourly',
      },

      // Conflict resolution
      conflictResolution: {
        type: String,
        enum: ['qb_wins', 'expojane_wins', 'manual', 'newest_wins'],
        default: 'expojane_wins',
      },
    },

    // Entity Mappings
    mappings: {
      // Customer mapping
      customers: [
        {
          expoJaneId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Patient',
          },
          quickbooksId: String,
          displayName: String,
          lastSynced: Date,
        },
      ],

      // Invoice mapping
      invoices: [
        {
          expoJaneId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Invoice',
          },
          quickbooksId: String,
          docNumber: String,
          lastSynced: Date,
          syncVersion: Number,
        },
      ],

      // Payment mapping
      payments: [
        {
          expoJaneId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Payment',
          },
          quickbooksId: String,
          lastSynced: Date,
        },
      ],

      // Chart of Accounts mapping
      accounts: [
        {
          expoJaneCategory: String,
          quickbooksAccountId: String,
          quickbooksAccountName: String,
          accountType: String,
        },
      ],

      // Tax rate mapping
      taxRates: [
        {
          expoJaneTaxRate: Number,
          quickbooksTaxRateId: String,
          quickbooksTaxRateName: String,
        },
      ],
    },

    // Sync History
    syncHistory: [
      {
        syncId: String,
        startedAt: {
          type: Date,
          default: Date.now,
        },
        completedAt: Date,
        status: {
          type: String,
          enum: ['in_progress', 'completed', 'failed', 'partial'],
        },
        entityType: {
          type: String,
          enum: ['customers', 'invoices', 'payments', 'expenses', 'all'],
        },
        direction: {
          type: String,
          enum: ['to_qb', 'from_qb'],
        },
        stats: {
          created: Number,
          updated: Number,
          deleted: Number,
          skipped: Number,
          failed: Number,
        },
        errors: [
          {
            entityId: String,
            entityType: String,
            errorMessage: String,
            errorCode: String,
            timestamp: Date,
          },
        ],
      },
    ],

    // Sync Queue (pending syncs)
    syncQueue: [
      {
        entityType: {
          type: String,
          enum: ['customer', 'invoice', 'payment', 'expense'],
        },
        entityId: mongoose.Schema.Types.ObjectId,
        operation: {
          type: String,
          enum: ['create', 'update', 'delete'],
        },
        priority: {
          type: Number,
          default: 5,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
        attempts: {
          type: Number,
          default: 0,
        },
        lastAttemptAt: Date,
        error: String,
      },
    ],

    // Last Sync Times
    lastSync: {
      customers: Date,
      invoices: Date,
      payments: Date,
      expenses: Date,
      vendors: Date,
      fullSync: Date,
    },

    // Statistics
    stats: {
      totalSyncs: {
        type: Number,
        default: 0,
      },
      successfulSyncs: {
        type: Number,
        default: 0,
      },
      failedSyncs: {
        type: Number,
        default: 0,
      },
      totalInvoicesSynced: {
        type: Number,
        default: 0,
      },
      totalCustomersSynced: {
        type: Number,
        default: 0,
      },
      totalPaymentsSynced: {
        type: Number,
        default: 0,
      },
      lastError: String,
      lastErrorAt: Date,
    },

    // Webhooks
    webhooks: {
      enabled: {
        type: Boolean,
        default: false,
      },
      verifierToken: String,
      lastWebhookAt: Date,
    },

    // Settings
    settings: {
      // Invoice settings
      invoicePrefix: String,
      invoiceNumberStart: Number,
      defaultPaymentTerms: String,

      // Customer settings
      createCustomerOnInvoice: {
        type: Boolean,
        default: true,
      },

      // Email settings
      sendInvoiceEmailsFromQB: {
        type: Boolean,
        default: false,
      },

      // Sync settings
      batchSize: {
        type: Number,
        default: 50,
      },
      retryAttempts: {
        type: Number,
        default: 3,
      },
      retryDelay: {
        type: Number,
        default: 60000, // 1 minute
      },
    },

    // Metadata
    metadata: mongoose.Schema.Types.Mixed,

    // Connected by
    connectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Disconnected info
    disconnectedAt: Date,
    disconnectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    disconnectReason: String,
  },
  {
    timestamps: true,
  }
);

// ==================== INDEXES ====================

quickBooksSyncSchema.index({ 'quickbooksCompany.realmId': 1 });
quickBooksSyncSchema.index({ status: 1, 'oauth.expiresAt': 1 });
quickBooksSyncSchema.index({ 'syncConfig.autoSync': 1, 'lastSync.fullSync': 1 });

// ==================== VIRTUAL FIELDS ====================

quickBooksSyncSchema.virtual('isConnected').get(function () {
  return this.status === 'connected' && new Date() < this.oauth.expiresAt;
});

quickBooksSyncSchema.virtual('needsTokenRefresh').get(function () {
  // Refresh if token expires in less than 1 hour
  const oneHour = 60 * 60 * 1000;
  return new Date(this.oauth.expiresAt).getTime() - Date.now() < oneHour;
});

quickBooksSyncSchema.virtual('syncSuccessRate').get(function () {
  if (this.stats.totalSyncs === 0) return 0;
  return ((this.stats.successfulSyncs / this.stats.totalSyncs) * 100).toFixed(2);
});

// ==================== INSTANCE METHODS ====================

/**
 * Refresh OAuth token
 */
quickBooksSyncSchema.methods.refreshOAuthToken = async function (newTokenData) {
  this.oauth.accessToken = newTokenData.access_token;
  this.oauth.refreshToken = newTokenData.refresh_token;
  this.oauth.expiresAt = new Date(Date.now() + newTokenData.expires_in * 1000);

  if (newTokenData.refresh_token_expires_in) {
    this.oauth.refreshTokenExpiresAt = new Date(
      Date.now() + newTokenData.refresh_token_expires_in * 1000
    );
  }

  this.status = 'connected';
  return this.save();
};

/**
 * Add customer mapping
 */
quickBooksSyncSchema.methods.addCustomerMapping = function (expoJaneId, quickbooksId, displayName) {
  // Remove existing mapping if any
  this.mappings.customers = this.mappings.customers.filter(
    (m) => m.expoJaneId?.toString() !== expoJaneId.toString()
  );

  this.mappings.customers.push({
    expoJaneId,
    quickbooksId,
    displayName,
    lastSynced: new Date(),
  });

  return this.save();
};

/**
 * Add invoice mapping
 */
quickBooksSyncSchema.methods.addInvoiceMapping = function (expoJaneId, quickbooksId, docNumber) {
  this.mappings.invoices = this.mappings.invoices.filter(
    (m) => m.expoJaneId?.toString() !== expoJaneId.toString()
  );

  this.mappings.invoices.push({
    expoJaneId,
    quickbooksId,
    docNumber,
    lastSynced: new Date(),
    syncVersion: 1,
  });

  return this.save();
};

/**
 * Add payment mapping
 */
quickBooksSyncSchema.methods.addPaymentMapping = function (expoJaneId, quickbooksId) {
  this.mappings.payments = this.mappings.payments.filter(
    (m) => m.expoJaneId?.toString() !== expoJaneId.toString()
  );

  this.mappings.payments.push({
    expoJaneId,
    quickbooksId,
    lastSynced: new Date(),
  });

  return this.save();
};

/**
 * Get customer mapping
 */
quickBooksSyncSchema.methods.getCustomerMapping = function (expoJaneId) {
  return this.mappings.customers.find((m) => m.expoJaneId?.toString() === expoJaneId.toString());
};

/**
 * Get invoice mapping
 */
quickBooksSyncSchema.methods.getInvoiceMapping = function (expoJaneId) {
  return this.mappings.invoices.find((m) => m.expoJaneId?.toString() === expoJaneId.toString());
};

/**
 * Add to sync queue
 */
quickBooksSyncSchema.methods.addToSyncQueue = function (
  entityType,
  entityId,
  operation,
  priority = 5
) {
  // Check if already in queue
  const existing = this.syncQueue.find(
    (item) => item.entityId.toString() === entityId.toString() && item.entityType === entityType
  );

  if (existing) {
    existing.operation = operation;
    existing.priority = priority;
  } else {
    this.syncQueue.push({
      entityType,
      entityId,
      operation,
      priority,
      addedAt: new Date(),
    });
  }

  // Sort by priority (higher first)
  this.syncQueue.sort((a, b) => b.priority - a.priority);

  return this.save();
};

/**
 * Remove from sync queue
 */
quickBooksSyncSchema.methods.removeFromSyncQueue = function (entityId) {
  this.syncQueue = this.syncQueue.filter(
    (item) => item.entityId.toString() !== entityId.toString()
  );
  return this.save();
};

/**
 * Start sync
 */
quickBooksSyncSchema.methods.startSync = async function (entityType, direction = 'to_qb') {
  const syncId = crypto.randomBytes(16).toString('hex');

  const syncRecord = {
    syncId,
    startedAt: new Date(),
    status: 'in_progress',
    entityType,
    direction,
    stats: {
      created: 0,
      updated: 0,
      deleted: 0,
      skipped: 0,
      failed: 0,
    },
    errors: [],
  };

  this.syncHistory.unshift(syncRecord);

  // Keep only last 100 sync records
  if (this.syncHistory.length > 100) {
    this.syncHistory = this.syncHistory.slice(0, 100);
  }

  this.status = 'syncing';
  this.stats.totalSyncs += 1;

  await this.save();

  return syncId;
};

/**
 * Complete sync
 */
quickBooksSyncSchema.methods.completeSync = async function (syncId, stats, errors = []) {
  const syncRecord = this.syncHistory.find((s) => s.syncId === syncId);

  if (!syncRecord) {
    throw new Error('Sync record not found');
  }

  syncRecord.completedAt = new Date();
  syncRecord.status = errors.length > 0 ? 'partial' : 'completed';
  syncRecord.stats = stats;
  syncRecord.errors = errors;

  // Update last sync time
  if (syncRecord.entityType !== 'all') {
    this.lastSync[syncRecord.entityType] = new Date();
  } else {
    this.lastSync.fullSync = new Date();
  }

  // Update statistics
  if (syncRecord.status === 'completed') {
    this.stats.successfulSyncs += 1;
  } else {
    this.stats.failedSyncs += 1;
  }

  if (syncRecord.entityType === 'invoices' || syncRecord.entityType === 'all') {
    this.stats.totalInvoicesSynced += stats.created + stats.updated;
  }

  if (syncRecord.entityType === 'customers' || syncRecord.entityType === 'all') {
    this.stats.totalCustomersSynced += stats.created + stats.updated;
  }

  if (syncRecord.entityType === 'payments' || syncRecord.entityType === 'all') {
    this.stats.totalPaymentsSynced += stats.created + stats.updated;
  }

  this.status = 'connected';

  return this.save();
};

/**
 * Fail sync
 */
quickBooksSyncSchema.methods.failSync = async function (syncId, error) {
  const syncRecord = this.syncHistory.find((s) => s.syncId === syncId);

  if (syncRecord) {
    syncRecord.completedAt = new Date();
    syncRecord.status = 'failed';
    syncRecord.errors.push({
      errorMessage: error.message || error,
      timestamp: new Date(),
    });
  }

  this.status = 'error';
  this.stats.failedSyncs += 1;
  this.stats.lastError = error.message || error;
  this.stats.lastErrorAt = new Date();

  return this.save();
};

/**
 * Disconnect from QuickBooks
 */
quickBooksSyncSchema.methods.disconnect = async function (userId, reason) {
  this.status = 'disconnected';
  this.disconnectedAt = new Date();
  this.disconnectedBy = userId;
  this.disconnectReason = reason;

  // Clear sensitive data
  this.oauth.accessToken = null;
  this.oauth.refreshToken = null;

  return this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Create connection
 */
quickBooksSyncSchema.statics.createConnection = async function (connectionData) {
  return this.create({
    organization: connectionData.organization,
    quickbooksCompany: connectionData.company,
    oauth: {
      accessToken: connectionData.accessToken,
      refreshToken: connectionData.refreshToken,
      tokenType: connectionData.tokenType || 'Bearer',
      expiresAt: new Date(Date.now() + connectionData.expiresIn * 1000),
    },
    connectedBy: connectionData.userId,
  });
};

/**
 * Get connection by organization
 */
quickBooksSyncSchema.statics.getByOrganization = async function (organizationId) {
  return this.findOne({ organization: organizationId });
};

/**
 * Get connections needing token refresh
 */
quickBooksSyncSchema.statics.getConnectionsNeedingRefresh = async function () {
  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);

  return this.find({
    status: 'connected',
    'oauth.expiresAt': { $lt: oneHourFromNow },
  });
};

/**
 * Get connections needing sync
 */
quickBooksSyncSchema.statics.getConnectionsNeedingSync = async function () {
  const now = new Date();

  return this.find({
    status: 'connected',
    'syncConfig.autoSync': true,
    $or: [
      {
        'syncConfig.syncInterval': 'hourly',
        'lastSync.fullSync': { $lt: new Date(now - 60 * 60 * 1000) },
      },
      {
        'syncConfig.syncInterval': 'daily',
        'lastSync.fullSync': { $lt: new Date(now - 24 * 60 * 60 * 1000) },
      },
    ],
  });
};

/**
 * Get sync statistics
 */
quickBooksSyncSchema.statics.getSyncStatistics = async function (organizationId) {
  const connection = await this.getByOrganization(organizationId);

  if (!connection) {
    return null;
  }

  const recentSyncs = connection.syncHistory.slice(0, 10);

  return {
    isConnected: connection.isConnected,
    status: connection.status,
    totalSyncs: connection.stats.totalSyncs,
    successfulSyncs: connection.stats.successfulSyncs,
    failedSyncs: connection.stats.failedSyncs,
    successRate: connection.syncSuccessRate,
    lastSync: connection.lastSync.fullSync,
    totalInvoicesSynced: connection.stats.totalInvoicesSynced,
    totalCustomersSynced: connection.stats.totalCustomersSynced,
    totalPaymentsSynced: connection.stats.totalPaymentsSynced,
    pendingQueueItems: connection.syncQueue.length,
    recentSyncs,
  };
};

// ==================== PRE-SAVE HOOKS ====================

quickBooksSyncSchema.pre('save', function (next) {
  // Generate webhook verifier token if webhooks enabled and no token exists
  if (this.webhooks.enabled && !this.webhooks.verifierToken) {
    this.webhooks.verifierToken = crypto.randomBytes(32).toString('hex');
  }

  next();
});

module.exports = mongoose.model('QuickBooksSync', quickBooksSyncSchema);
