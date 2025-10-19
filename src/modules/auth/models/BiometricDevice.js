const mongoose = require('mongoose');

/**
 * BiometricDevice Model
 * Stores biometric authentication data for mobile devices
 */
const biometricDeviceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    deviceId: {
      type: String,
      required: true,
      index: true,
    },
    deviceName: {
      type: String,
      trim: true,
    },
    biometricType: {
      type: String,
      enum: ['face_id', 'touch_id', 'fingerprint', 'voice_print'],
      required: true,
    },
    // Cryptographic data
    publicKey: {
      type: String,
      required: true,
    },
    biometricDataHash: {
      type: String,
      required: true, // Hashed biometric template/data
    },
    biometricTokenHash: {
      type: String,
      required: true, // Hashed token for additional security
    },
    // Device information
    deviceInfo: {
      platform: { type: String, enum: ['ios', 'android'], required: true },
      osVersion: String,
      appVersion: String,
      deviceModel: String,
      screenResolution: String,
      securityLevel: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium',
      },
    },
    // Security and usage tracking
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
    lastUsed: {
      type: Date,
      default: Date.now,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    failedAttempts: {
      type: Number,
      default: 0,
    },
    lastFailedAttempt: Date,
    // Suspension/deactivation
    suspendedAt: Date,
    suspensionReason: String,
    deactivatedAt: Date,
    deactivationReason: String,
    reactivatedAt: Date,
    // Challenge for authentication
    currentChallenge: String,
    challengeExpiry: Date,
    // Security settings
    settings: {
      requireFallback: {
        type: Boolean,
        default: true, // Require password fallback
      },
      maxFailedAttempts: {
        type: Number,
        default: 5,
      },
      lockoutDuration: {
        type: Number,
        default: 5 * 60 * 1000, // 5 minutes in milliseconds
      },
      sessionDuration: {
        type: Number,
        default: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
      },
    },
    // Metadata
    metadata: {
      enrollmentQuality: {
        type: String,
        enum: ['poor', 'fair', 'good', 'excellent'],
        default: 'good',
      },
      lastSecurityUpdate: Date,
      trustScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 50,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for efficient querying
biometricDeviceSchema.index({ user: 1, deviceId: 1, biometricType: 1 }, { unique: true });
biometricDeviceSchema.index({ isActive: 1, lastUsed: -1 });
biometricDeviceSchema.index({ challengeExpiry: 1 }, { expireAfterSeconds: 0 });

// Virtual for device display name
biometricDeviceSchema.virtual('displayName').get(function () {
  if (this.deviceName) {
    return this.deviceName;
  }
  
  const typeNames = {
    face_id: 'Face ID',
    touch_id: 'Touch ID',
    fingerprint: 'Fingerprint',
    voice_print: 'Voice Print',
  };
  
  return `${typeNames[this.biometricType] || this.biometricType} - ${this.deviceInfo?.deviceModel || 'Unknown Device'}`;
});

// Virtual for security status
biometricDeviceSchema.virtual('securityStatus').get(function () {
  if (!this.isActive) {
    return 'inactive';
  }
  
  if (this.failedAttempts >= this.settings.maxFailedAttempts) {
    return 'locked';
  }
  
  if (this.suspendedAt) {
    return 'suspended';
  }
  
  const daysSinceLastUse = (Date.now() - this.lastUsed.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceLastUse > 30) {
    return 'stale';
  }
  
  return 'active';
});

// Method to check if device is locked due to failed attempts
biometricDeviceSchema.methods.isLocked = function () {
  if (this.failedAttempts < this.settings.maxFailedAttempts) {
    return false;
  }
  
  if (!this.lastFailedAttempt) {
    return true;
  }
  
  const timeSinceLastAttempt = Date.now() - this.lastFailedAttempt.getTime();
  return timeSinceLastAttempt < this.settings.lockoutDuration;
};

// Method to record failed attempt
biometricDeviceSchema.methods.recordFailedAttempt = function () {
  this.failedAttempts += 1;
  this.lastFailedAttempt = new Date();
  
  if (this.failedAttempts >= this.settings.maxFailedAttempts) {
    this.isActive = false;
    this.suspendedAt = new Date();
    this.suspensionReason = 'Too many failed attempts';
  }
  
  return this.save();
};

// Method to record successful use
biometricDeviceSchema.methods.recordSuccessfulUse = function () {
  this.lastUsed = new Date();
  this.usageCount += 1;
  this.failedAttempts = 0; // Reset failed attempts
  this.lastFailedAttempt = undefined;
  
  // Update trust score on successful use
  if (this.metadata.trustScore < 100) {
    this.metadata.trustScore = Math.min(100, this.metadata.trustScore + 1);
  }
  
  return this.save();
};

// Method to generate challenge
biometricDeviceSchema.methods.generateChallenge = function () {
  const crypto = require('crypto');
  const challenge = crypto.randomBytes(32).toString('base64');
  
  this.currentChallenge = challenge;
  this.challengeExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  
  return this.save().then(() => challenge);
};

// Method to validate challenge
biometricDeviceSchema.methods.validateChallenge = function (challenge) {
  if (!this.currentChallenge || !this.challengeExpiry) {
    return false;
  }
  
  if (Date.now() > this.challengeExpiry.getTime()) {
    return false;
  }
  
  return this.currentChallenge === challenge;
};

// Method to clear challenge
biometricDeviceSchema.methods.clearChallenge = function () {
  this.currentChallenge = undefined;
  this.challengeExpiry = undefined;
  return this.save();
};

// Method to update trust score
biometricDeviceSchema.methods.updateTrustScore = function (adjustment) {
  this.metadata.trustScore = Math.max(0, Math.min(100, this.metadata.trustScore + adjustment));
  return this.save();
};

// Method to suspend device
biometricDeviceSchema.methods.suspend = function (reason) {
  this.isActive = false;
  this.suspendedAt = new Date();
  this.suspensionReason = reason;
  return this.save();
};

// Method to reactivate device
biometricDeviceSchema.methods.reactivate = function () {
  this.isActive = true;
  this.suspendedAt = undefined;
  this.suspensionReason = undefined;
  this.reactivatedAt = new Date();
  this.failedAttempts = 0;
  this.lastFailedAttempt = undefined;
  return this.save();
};

// Static method to find active devices for user
biometricDeviceSchema.statics.findActiveForUser = function (userId) {
  return this.find({
    user: userId,
    isActive: true,
  }).sort({ lastUsed: -1 });
};

// Static method to find by device and type
biometricDeviceSchema.statics.findByDeviceAndType = function (deviceId, biometricType) {
  return this.findOne({
    deviceId,
    biometricType,
    isActive: true,
  }).populate('user');
};

// Static method to cleanup old inactive devices
biometricDeviceSchema.statics.cleanupOldDevices = async function (daysOld = 90) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  
  const result = await this.deleteMany({
    isActive: false,
    $or: [
      { deactivatedAt: { $lt: cutoffDate } },
      { suspendedAt: { $lt: cutoffDate } },
    ],
  });
  
  return result.deletedCount;
};

// Static method to get user statistics
biometricDeviceSchema.statics.getUserStats = function (userId) {
  return this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$biometricType',
        count: { $sum: 1 },
        activeCount: {
          $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] },
        },
        totalUsage: { $sum: '$usageCount' },
        avgTrustScore: { $avg: '$metadata.trustScore' },
        lastUsed: { $max: '$lastUsed' },
      },
    },
  ]);
};

// Pre-save middleware to update security metadata
biometricDeviceSchema.pre('save', function (next) {
  if (this.isModified('isActive') && this.isActive) {
    this.metadata.lastSecurityUpdate = new Date();
  }
  next();
});

// Don't return sensitive data in JSON
biometricDeviceSchema.methods.toJSON = function () {
  const device = this.toObject();
  delete device.biometricDataHash;
  delete device.biometricTokenHash;
  delete device.publicKey;
  delete device.currentChallenge;
  return device;
};

module.exports = mongoose.model('BiometricDevice', biometricDeviceSchema);