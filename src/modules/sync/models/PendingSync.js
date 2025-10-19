const mongoose = require('mongoose');

/**
 * PendingSync Model
 * Tracks individual changes that need to be synchronized
 */
const pendingSyncSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    deviceId: {
      type: String,
      required: true,
    },
    // Data being synchronized
    dataType: {
      type: String,
      enum: ['appointment', 'patient', 'clinicalNote', 'message', 'document', 'payment'],
      required: true,
    },
    recordId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    // Operation details
    operation: {
      type: String,
      enum: ['create', 'update', 'delete'],
      required: true,
    },
    // Change data
    changeData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    originalData: {
      type: mongoose.Schema.Types.Mixed,
    },
    // Timestamps
    clientTimestamp: {
      type: Date,
      required: true,
    },
    serverTimestamp: {
      type: Date,
      default: Date.now,
    },
    // Sync status
    status: {
      type: String,
      enum: ['pending', 'syncing', 'completed', 'failed', 'conflict'],
      default: 'pending',
    },
    syncAttempts: {
      type: Number,
      default: 0,
    },
    lastAttempt: Date,
    errorMessage: String,
    // Conflict resolution
    conflictResolution: {
      type: String,
      enum: ['server_wins', 'client_wins', 'manual_resolve'],
    },
    conflictData: {
      serverVersion: mongoose.Schema.Types.Mixed,
      clientVersion: mongoose.Schema.Types.Mixed,
      resolvedVersion: mongoose.Schema.Types.Mixed,
    },
    // Priority and ordering
    priority: {
      type: Number,
      default: 5, // 1 = highest, 10 = lowest
    },
    sequence: {
      type: Number,
      required: true,
    },
    // Metadata
    metadata: {
      networkQuality: {
        type: String,
        enum: ['excellent', 'good', 'poor'],
      },
      retryCount: { type: Number, default: 0 },
      estimatedSize: Number, // in bytes
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
pendingSyncSchema.index({ user: 1, deviceId: 1, status: 1 });
pendingSyncSchema.index({ dataType: 1, recordId: 1 });
pendingSyncSchema.index({ clientTimestamp: 1 });
pendingSyncSchema.index({ priority: 1, sequence: 1 });
pendingSyncSchema.index({ status: 1, syncAttempts: 1 });

// Method to mark as syncing
pendingSyncSchema.methods.startSync = function () {
  this.status = 'syncing';
  this.syncAttempts += 1;
  this.lastAttempt = new Date();
  return this.save();
};

// Method to mark as completed
pendingSyncSchema.methods.markCompleted = function () {
  this.status = 'completed';
  return this.save();
};

// Method to mark as failed
pendingSyncSchema.methods.markFailed = function (errorMessage) {
  this.status = 'failed';
  this.errorMessage = errorMessage;
  this.metadata.retryCount = (this.metadata.retryCount || 0) + 1;
  return this.save();
};

// Method to mark as conflict
pendingSyncSchema.methods.markConflict = function (serverData, clientData) {
  this.status = 'conflict';
  this.conflictData = {
    serverVersion: serverData,
    clientVersion: clientData,
  };
  return this.save();
};

// Method to resolve conflict
pendingSyncSchema.methods.resolveConflict = function (resolution, resolvedData) {
  this.conflictResolution = resolution;
  this.conflictData.resolvedVersion = resolvedData;
  this.status = 'completed';
  return this.save();
};

// Static method to get pending syncs for user/device
pendingSyncSchema.statics.getPendingForDevice = function (userId, deviceId, options = {}) {
  const query = {
    user: userId,
    deviceId,
    status: { $in: ['pending', 'failed'] },
  };

  if (options.dataType) {
    query.dataType = options.dataType;
  }

  if (options.priority) {
    query.priority = { $lte: options.priority };
  }

  return this.find(query)
    .sort({ priority: 1, sequence: 1, clientTimestamp: 1 })
    .limit(options.limit || 100);
};

// Static method to get conflicts for user
pendingSyncSchema.statics.getConflictsForUser = function (userId, options = {}) {
  const query = {
    user: userId,
    status: 'conflict',
  };

  if (options.deviceId) {
    query.deviceId = options.deviceId;
  }

  return this.find(query)
    .sort({ clientTimestamp: -1 })
    .limit(options.limit || 50);
};

// Static method to cleanup old completed syncs
pendingSyncSchema.statics.cleanupCompleted = async function (daysOld = 7) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  
  const result = await this.deleteMany({
    status: 'completed',
    updatedAt: { $lt: cutoffDate },
  });
  
  return result.deletedCount;
};

// Static method to retry failed syncs
pendingSyncSchema.statics.retryFailed = async function (maxAttempts = 3) {
  const query = {
    status: 'failed',
    syncAttempts: { $lt: maxAttempts },
  };

  const result = await this.updateMany(query, {
    $set: { status: 'pending' },
  });

  return result.modifiedCount;
};

module.exports = mongoose.model('PendingSync', pendingSyncSchema);