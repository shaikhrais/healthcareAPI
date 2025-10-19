const mongoose = require('mongoose');

/**
 * SyncState Model
 * Tracks synchronization state for offline mobile clients
 */
const syncStateSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    deviceId: {
      type: String,
      required: true,
      index: true,
    },
    deviceType: {
      type: String,
      enum: ['ios', 'android', 'web'],
      required: true,
    },
    lastSyncTimestamp: {
      type: Date,
      default: Date.now,
    },
    syncVersion: {
      type: Number,
      default: 1,
    },
    // Track sync state for different data types
    syncStates: {
      appointments: {
        lastSync: { type: Date, default: Date.now },
        version: { type: Number, default: 0 },
        pendingChanges: { type: Number, default: 0 },
      },
      patients: {
        lastSync: { type: Date, default: Date.now },
        version: { type: Number, default: 0 },
        pendingChanges: { type: Number, default: 0 },
      },
      clinicalNotes: {
        lastSync: { type: Date, default: Date.now },
        version: { type: Number, default: 0 },
        pendingChanges: { type: Number, default: 0 },
      },
      messages: {
        lastSync: { type: Date, default: Date.now },
        version: { type: Number, default: 0 },
        pendingChanges: { type: Number, default: 0 },
      },
      documents: {
        lastSync: { type: Date, default: Date.now },
        version: { type: Number, default: 0 },
        pendingChanges: { type: Number, default: 0 },
      },
    },
    // Device capabilities
    capabilities: {
      offlineStorage: { type: Boolean, default: true },
      backgroundSync: { type: Boolean, default: false },
      biometricAuth: { type: Boolean, default: false },
      pushNotifications: { type: Boolean, default: false },
    },
    // Network and sync settings
    syncSettings: {
      autoSync: { type: Boolean, default: true },
      syncOnWifiOnly: { type: Boolean, default: false },
      maxOfflineDays: { type: Number, default: 7 },
      conflictResolution: {
        type: String,
        enum: ['server_wins', 'client_wins', 'manual_resolve'],
        default: 'server_wins',
      },
    },
    // Connection status
    isOnline: { type: Boolean, default: true },
    lastOnline: { type: Date, default: Date.now },
    connectionQuality: {
      type: String,
      enum: ['excellent', 'good', 'poor', 'offline'],
      default: 'excellent',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for efficient querying
syncStateSchema.index({ user: 1, deviceId: 1 }, { unique: true });
syncStateSchema.index({ lastSyncTimestamp: -1 });
syncStateSchema.index({ isOnline: 1, lastOnline: -1 });

// Virtual for total pending changes
syncStateSchema.virtual('totalPendingChanges').get(function () {
  const syncStates = this.syncStates || {};
  return Object.values(syncStates).reduce((total, state) => {
    return total + (state.pendingChanges || 0);
  }, 0);
});

// Method to update sync state for a specific data type
syncStateSchema.methods.updateSyncState = function (dataType, changes = {}) {
  if (!this.syncStates) {
    this.syncStates = {};
  }
  
  if (!this.syncStates[dataType]) {
    this.syncStates[dataType] = {
      lastSync: new Date(),
      version: 0,
      pendingChanges: 0,
    };
  }

  Object.assign(this.syncStates[dataType], changes);
  this.lastSyncTimestamp = new Date();
  this.markModified('syncStates');
  
  return this.save();
};

// Method to mark device as online/offline
syncStateSchema.methods.updateConnectionStatus = function (isOnline, quality = 'excellent') {
  this.isOnline = isOnline;
  this.connectionQuality = quality;
  
  if (isOnline) {
    this.lastOnline = new Date();
  }
  
  return this.save();
};

// Method to get sync delta since last sync
syncStateSchema.methods.getSyncDelta = function (dataType) {
  const syncState = this.syncStates[dataType];
  if (!syncState) {
    return { lastSync: new Date(0), version: 0 };
  }
  
  return {
    lastSync: syncState.lastSync,
    version: syncState.version,
    pendingChanges: syncState.pendingChanges,
  };
};

// Static method to find or create sync state
syncStateSchema.statics.findOrCreate = async function (userId, deviceId, deviceType) {
  let syncState = await this.findOne({ user: userId, deviceId });
  
  if (!syncState) {
    syncState = new this({
      user: userId,
      deviceId,
      deviceType,
      syncStates: {
        appointments: { lastSync: new Date(0), version: 0, pendingChanges: 0 },
        patients: { lastSync: new Date(0), version: 0, pendingChanges: 0 },
        clinicalNotes: { lastSync: new Date(0), version: 0, pendingChanges: 0 },
        messages: { lastSync: new Date(0), version: 0, pendingChanges: 0 },
        documents: { lastSync: new Date(0), version: 0, pendingChanges: 0 },
      },
    });
    await syncState.save();
  }
  
  return syncState;
};

// Static method to cleanup old sync states
syncStateSchema.statics.cleanupOldStates = async function (daysOld = 30) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  
  const result = await this.deleteMany({
    lastOnline: { $lt: cutoffDate },
    isOnline: false,
  });
  
  return result.deletedCount;
};

module.exports = mongoose.model('SyncState', syncStateSchema);