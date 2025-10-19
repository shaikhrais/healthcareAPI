const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
/**
 * IP Block Model
 *
 * Tracks blocked and suspicious IP addresses
 */

const ipBlockSchema = new mongoose.Schema(
  {
    ipAddress: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // Block status
    status: {
      type: String,
      enum: ['warned', 'throttled', 'blocked', 'whitelisted'],
      default: 'warned',
      index: true,
    },
    // Reason for block
    reason: {
      type: String,
      enum: [
        'brute_force',
        'too_many_requests',
        'suspicious_activity',
        'malicious_payload',
        'manual_block',
        'automated_threat',
        'spam',
        'ddos',
      ],
      required: true,
    },
    // Violation tracking
    violations: {
      count: {
        type: Number,
        default: 1,
      },
      lastViolation: {
        type: Date,
        default: Date.now,
      },
      violationHistory: [
        {
          timestamp: Date,
          reason: String,
          endpoint: String,
          userAgent: String,
        },
      ],
    },
    // Block details
    blockedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    isPermanent: {
      type: Boolean,
      default: false,
    },
    // Who blocked this IP
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    blockedBySystem: {
      type: Boolean,
      default: true,
    },
    // Request tracking
    requestCount: {
      type: Number,
      default: 0,
    },
    lastRequest: {
      type: Date,
      default: Date.now,
    },
    // Location and metadata
    location: {
      country: String,
      region: String,
      city: String,
      latitude: Number,
      longitude: Number,
    },
    metadata: {
      userAgent: String,
      referrer: String,
      endpoint: String,
    },
    // Notes and evidence
    notes: String,
    evidence: [
      {
        timestamp: Date,
        description: String,
        data: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
// DUPLICATE INDEX - Auto-commented by deduplication tool
// ipBlockSchema.index({ status: 1, expiresAt: 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// ipBlockSchema.index({ createdAt: -1 });
ipBlockSchema.index({ 'violations.count': -1 });

// Instance methods

/**
 * Check if block is expired
 */
ipBlockSchema.methods.isExpired = function () {
  if (this.isPermanent) return false;
  if (!this.expiresAt) return false;
  return this.expiresAt < new Date();
};

/**
 * Check if IP is currently blocked
 */
ipBlockSchema.methods.isBlocked = function () {
  if (this.status === 'whitelisted') return false;
  if (this.status === 'blocked') {
    return this.isPermanent || !this.isExpired();
  }
  return false;
};

/**
 * Add violation
 */
ipBlockSchema.methods.addViolation = async function (reason, endpoint, userAgent) {
  this.violations.count += 1;
  this.violations.lastViolation = new Date();
  this.violations.violationHistory.push({
    timestamp: new Date(),
    reason,
    endpoint,
    userAgent,
  });

  // Auto-escalate based on violation count
  if (this.violations.count >= 10 && this.status === 'warned') {
    this.status = 'throttled';
  } else if (this.violations.count >= 20 && this.status === 'throttled') {
    this.status = 'blocked';
    this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  }

  return await this.save();
};

/**
 * Unblock IP
 */
ipBlockSchema.methods.unblock = async function (unblockerId) {
  this.status = 'warned';
  this.expiresAt = null;
  this.notes = `Unblocked by admin: ${unblockerId}`;
  return await this.save();
};

/**
 * Whitelist IP
 */
ipBlockSchema.methods.whitelist = async function (adminId) {
  this.status = 'whitelisted';
  this.expiresAt = null;
  this.isPermanent = false;
  this.blockedBy = adminId;
  this.blockedBySystem = false;
  return await this.save();
};

// Static methods

/**
 * Check if IP is blocked
 */
ipBlockSchema.statics.isIpBlocked = async function (ipAddress) {
  const block = await this.findOne({ ipAddress });

  if (!block) return { blocked: false };

  // Check whitelist
  if (block.status === 'whitelisted') {
    return { blocked: false, whitelisted: true };
  }

  // Check if expired
  if (block.isExpired()) {
    await block.unblock('system');
    return { blocked: false, expired: true };
  }

  // Check if blocked
  if (block.isBlocked()) {
    return {
      blocked: true,
      reason: block.reason,
      expiresAt: block.expiresAt,
      isPermanent: block.isPermanent,
    };
  }

  return { blocked: false, status: block.status };
};

/**
 * Block an IP address
 */
ipBlockSchema.statics.blockIp = async function (ipAddress, reason, options = {}) {
  const block = await this.findOne({ ipAddress });

  if (block) {
    block.status = 'blocked';
    block.reason = reason;
    block.blockedAt = new Date();
    block.isPermanent = options.permanent || false;
    block.expiresAt = options.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000);
    block.blockedBy = options.blockedBy;
    block.blockedBySystem = !options.blockedBy;
    block.notes = options.notes;

    if (options.evidence) {
      block.evidence.push(options.evidence);
    }

    return await block.save();
  }

  return await this.create({
    ipAddress,
    status: 'blocked',
    reason,
    isPermanent: options.permanent || false,
    expiresAt: options.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000),
    blockedBy: options.blockedBy,
    blockedBySystem: !options.blockedBy,
    notes: options.notes,
    metadata: options.metadata,
    location: options.location,
    evidence: options.evidence ? [options.evidence] : [],
  });
};

/**
 * Record a violation
 */
ipBlockSchema.statics.recordViolation = async function (ipAddress, reason, endpoint, userAgent) {
  let block = await this.findOne({ ipAddress });

  if (!block) {
    block = await this.create({
      ipAddress,
      status: 'warned',
      reason,
      violations: {
        count: 1,
        lastViolation: new Date(),
        violationHistory: [
          {
            timestamp: new Date(),
            reason,
            endpoint,
            userAgent,
          },
        ],
      },
      metadata: { endpoint, userAgent },
    });
  } else {
    await block.addViolation(reason, endpoint, userAgent);
  }

  return block;
};

/**
 * Get blocked IPs
 */
ipBlockSchema.statics.getBlockedIps = async function (options = {}) {
  const query = { status: 'blocked' };

  if (!options.includeExpired) {
    query.$or = [{ isPermanent: true }, { expiresAt: { $gt: new Date() } }];
  }

  return await this.find(query)
    .sort({ blockedAt: -1 })
    .limit(options.limit || 100);
};

/**
 * Clean up expired blocks
 */
ipBlockSchema.statics.cleanupExpired = async function () {
  const result = await this.updateMany(
    {
      status: 'blocked',
      isPermanent: false,
      expiresAt: { $lt: new Date() },
    },
    {
      $set: { status: 'warned' },
    }
  );

  return result.modifiedCount;
};

/**
 * Get IP statistics
 */
ipBlockSchema.statics.getStats = async function () {
  const total = await this.countDocuments();
  const blocked = await this.countDocuments({ status: 'blocked' });
  const throttled = await this.countDocuments({ status: 'throttled' });
  const whitelisted = await this.countDocuments({ status: 'whitelisted' });
  const warned = await this.countDocuments({ status: 'warned' });

  const topViolators = await this.find()
    .sort({ 'violations.count': -1 })
    .limit(10)
    .select('ipAddress violations.count status');

  return {
    total,
    blocked,
    throttled,
    whitelisted,
    warned,
    topViolators,
  };
};

module.exports = mongoose.model('IpBlock', ipBlockSchema);
