const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
/**
 * Session Model
 *
 * Tracks active user sessions for:
 * - Session revocation
 * - Multi-device management
 * - Security monitoring
 * - Activity tracking
 */

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // Hashed token for secure storage
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    // Device and location information
    deviceInfo: {
      userAgent: String,
      browser: String,
      os: String,
      device: String,
      platform: String,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    location: {
      country: String,
      region: String,
      city: String,
    },
    // Session status
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    // Session metadata
    lastActivity: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    // Revocation tracking
    revokedAt: Date,
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    revokedReason: {
      type: String,
      enum: [
        'user_logout',
        'user_revoked',
        'admin_revoked',
        'security',
        'expired',
        'password_change',
      ],
    },
    // Session type
    sessionType: {
      type: String,
      enum: ['web', 'mobile', 'api', 'admin'],
      default: 'web',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
sessionSchema.index({ user: 1, isActive: 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
sessionSchema.index({ tokenHash: 1, isActive: 1 });

// Instance methods

/**
 * Revoke this session
 */
sessionSchema.methods.revoke = async function (reason, revokedBy) {
  this.isActive = false;
  this.revokedAt = new Date();
  this.revokedReason = reason || 'user_logout';

  if (revokedBy) {
    this.revokedBy = revokedBy;
  }

  return await this.save();
};

/**
 * Update last activity timestamp
 */
sessionSchema.methods.updateActivity = async function () {
  this.lastActivity = new Date();
  return await this.save();
};

/**
 * Check if session is expired
 */
sessionSchema.methods.isExpired = function () {
  return this.expiresAt < new Date();
};

/**
 * Check if session is valid
 */
sessionSchema.methods.isValid = function () {
  return this.isActive && !this.isExpired();
};

// Static methods

/**
 * Create a new session
 */
sessionSchema.statics.createSession = async function (userId, token, tokenHash, sessionData) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (sessionData.expiryDays || 7));

  return await this.create({
    user: userId,
    token,
    tokenHash,
    ipAddress: sessionData.ipAddress,
    deviceInfo: sessionData.deviceInfo,
    location: sessionData.location,
    sessionType: sessionData.sessionType || 'web',
    expiresAt,
  });
};

/**
 * Find session by token hash
 */
sessionSchema.statics.findByTokenHash = async function (tokenHash) {
  return await this.findOne({ tokenHash, isActive: true });
};

/**
 * Get all active sessions for a user
 */
sessionSchema.statics.getActiveSessions = async function (userId) {
  return await this.find({
    user: userId,
    isActive: true,
    expiresAt: { $gt: new Date() },
  }).sort({ lastActivity: -1 });
};

/**
 * Revoke all sessions for a user
 */
sessionSchema.statics.revokeAllUserSessions = async function (userId, reason, revokedBy) {
  const result = await this.updateMany(
    { user: userId, isActive: true },
    {
      $set: {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: reason || 'user_logout',
        revokedBy: revokedBy || userId,
      },
    }
  );

  return result.modifiedCount;
};

/**
 * Revoke all sessions except current
 */
sessionSchema.statics.revokeOtherSessions = async function (userId, currentTokenHash, reason) {
  const result = await this.updateMany(
    {
      user: userId,
      isActive: true,
      tokenHash: { $ne: currentTokenHash },
    },
    {
      $set: {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: reason || 'user_revoked',
      },
    }
  );

  return result.modifiedCount;
};

/**
 * Clean up expired sessions
 */
sessionSchema.statics.cleanupExpired = async function () {
  const result = await this.updateMany(
    {
      isActive: true,
      expiresAt: { $lt: new Date() },
    },
    {
      $set: {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: 'expired',
      },
    }
  );

  return result.modifiedCount;
};

/**
 * Get session statistics for a user
 */
sessionSchema.statics.getUserSessionStats = async function (userId) {
  const activeSessions = await this.countDocuments({
    user: userId,
    isActive: true,
    expiresAt: { $gt: new Date() },
  });

  const totalSessions = await this.countDocuments({ user: userId });

  const recentActivity = await this.findOne({ user: userId })
    .sort({ lastActivity: -1 })
    .select('lastActivity');

  return {
    activeSessions,
    totalSessions,
    lastActivity: recentActivity?.lastActivity,
  };
};

module.exports = mongoose.model('Session', sessionSchema);
