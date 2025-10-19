const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Referral Model
 * TASK-14.16 - Share app with friends
 *
 * Manages user referrals and invite tracking
 * Features:
 * - Referral code generation
 * - Invite tracking
 * - Reward management
 * - Conversion tracking
 * - Social sharing analytics
 */

// eslint-disable-next-line no-unused-vars

const referralSchema = new mongoose.Schema(
  {
    // Referrer Information
    referrerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Referrer ID is required'],
      index: true,
    },
    referrerType: {
      type: String,
      enum: ['patient', 'staff', 'practitioner', 'admin'],
      required: true,
    },

    // Referral Code
    referralCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    customCode: {
      type: String,
      uppercase: true,
      sparse: true, // Allows null values but must be unique if set
      unique: true,
    },

    // Referred User Information
    referredUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    referredUserEmail: String,
    referredUserPhone: String,
    referredUserName: String,

    // Status
    status: {
      type: String,
      enum: ['pending', 'signed_up', 'completed_action', 'rewarded', 'expired', 'invalid'],
      default: 'pending',
      index: true,
    },

    // Tracking
    source: {
      type: String,
      enum: [
        'email',
        'sms',
        'whatsapp',
        'facebook',
        'twitter',
        'instagram',
        'linkedin',
        'copy_link',
        'qr_code',
        'in_app',
        'other',
      ],
    },
    campaign: String,
    metadata: mongoose.Schema.Types.Mixed,

    // Conversion Tracking
    inviteSentAt: Date,
    clickedAt: Date,
    signedUpAt: Date,
    completedActionAt: Date, // e.g., first appointment booked
    rewardedAt: Date,

    // Device & Location Tracking
    clickMetadata: {
      ipAddress: String,
      userAgent: String,
      device: {
        type: String,
        enum: ['mobile', 'tablet', 'desktop', 'unknown'],
      },
      location: {
        city: String,
        state: String,
        country: String,
      },
    },

    // Rewards
    referrerReward: {
      type: {
        type: String,
        enum: ['credits', 'discount', 'free_service', 'points', 'cash', 'gift_card'],
      },
      amount: Number,
      description: String,
      claimed: {
        type: Boolean,
        default: false,
      },
      claimedAt: Date,
    },
    referredUserReward: {
      type: {
        type: String,
        enum: ['credits', 'discount', 'free_service', 'points', 'cash', 'gift_card'],
      },
      amount: Number,
      description: String,
      claimed: {
        type: Boolean,
        default: false,
      },
      claimedAt: Date,
    },

    // Expiration
    expiresAt: Date,
    isActive: {
      type: Boolean,
      default: true,
    },

    // Notes
    notes: String,
    adminNotes: String,

    // Organization
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
  },
  {
    timestamps: true,
  }
);

// ==================== INDEXES ====================

referralSchema.index({ referrerId: 1, status: 1 });
referralSchema.index({ referralCode: 1, isActive: 1 });
referralSchema.index({ referredUserId: 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// referralSchema.index({ organization: 1, status: 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// referralSchema.index({ createdAt: -1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// referralSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// ==================== VIRTUAL FIELDS ====================

referralSchema.virtual('isExpired').get(function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

referralSchema.virtual('isConverted').get(function () {
  return this.status === 'completed_action' || this.status === 'rewarded';
});

referralSchema.virtual('conversionTime').get(function () {
  if (!this.inviteSentAt || !this.signedUpAt) return null;
  return this.signedUpAt - this.inviteSentAt;
});

referralSchema.virtual('referralLink').get(function () {
  const baseUrl = process.env.APP_URL || 'https://app.expojane.com';
  return `${baseUrl}/signup?ref=${this.referralCode}`;
});

// ==================== INSTANCE METHODS ====================

/**
 * Record click on referral link
 */
referralSchema.methods.recordClick = async function (metadata = {}) {
  this.clickedAt = new Date();
  this.clickMetadata = metadata;

  if (this.status === 'pending') {
    // Don't change status, just record the click
  }

  return this.save();
};

/**
 * Mark as signed up
 */
referralSchema.methods.markSignedUp = async function (userId) {
  this.status = 'signed_up';
  this.signedUpAt = new Date();
  this.referredUserId = userId;
  return this.save();
};

/**
 * Mark action as completed (e.g., first appointment)
 */
referralSchema.methods.markActionCompleted = async function () {
  this.status = 'completed_action';
  this.completedActionAt = new Date();
  return this.save();
};

/**
 * Mark rewards as distributed
 */
referralSchema.methods.markRewarded = async function () {
  this.status = 'rewarded';
  this.rewardedAt = new Date();
  return this.save();
};

/**
 * Claim referrer reward
 */
referralSchema.methods.claimReferrerReward = async function () {
  if (!this.referrerReward || this.referrerReward.claimed) {
    throw new Error('Reward already claimed or not available');
  }

  this.referrerReward.claimed = true;
  this.referrerReward.claimedAt = new Date();
  return this.save();
};

/**
 * Claim referred user reward
 */
referralSchema.methods.claimReferredUserReward = async function () {
  if (!this.referredUserReward || this.referredUserReward.claimed) {
    throw new Error('Reward already claimed or not available');
  }

  this.referredUserReward.claimed = true;
  this.referredUserReward.claimedAt = new Date();
  return this.save();
};

/**
 * Check if expired and update status
 */
referralSchema.methods.checkExpiration = async function () {
  if (this.isExpired && this.status === 'pending') {
    this.status = 'expired';
    this.isActive = false;
    return this.save();
  }
  return this;
};

// ==================== STATIC METHODS ====================

/**
 * Generate unique referral code
 */
referralSchema.statics.generateReferralCode = async function (length = 8) {
  let code;
  let isUnique = false;

  while (!isUnique) {
    // Generate random alphanumeric code
    code = crypto
      .randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length)
      .toUpperCase();

    // Check if code already exists
    const existing = await this.findOne({ referralCode: code });
    if (!existing) {
      isUnique = true;
    }
  }

  return code;
};

/**
 * Create referral for user
 */
referralSchema.statics.createForUser = async function (userId, userType, options = {}) {
  const referralCode = options.customCode || (await this.generateReferralCode());

  const referral = await this.create({
    referrerId: userId,
    referrerType: userType,
    referralCode,
    customCode: options.customCode || null,
    source: options.source || 'in_app',
    campaign: options.campaign,
    expiresAt: options.expiresAt,
    referrerReward: options.referrerReward,
    referredUserReward: options.referredUserReward,
    organization: options.organization,
  });

  return referral;
};

/**
 * Get referrals by user
 */
referralSchema.statics.getByUser = async function (userId, filters = {}) {
  const query = { referrerId: userId };

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.isActive !== undefined) {
    query.isActive = filters.isActive;
  }

  return this.find(query)
    .populate('referredUserId', 'firstName lastName email')
    .sort({ createdAt: -1 });
};

/**
 * Get referral by code
 */
referralSchema.statics.getByCode = async function (code) {
  return this.findOne({
    $or: [{ referralCode: code.toUpperCase() }, { customCode: code.toUpperCase() }],
    isActive: true,
  }).populate('referrerId', 'firstName lastName email');
};

/**
 * Get referral statistics for user
 */
referralSchema.statics.getStats = async function (userId) {
  const referrals = await this.find({ referrerId: userId });

  const stats = {
    total: referrals.length,
    pending: 0,
    signedUp: 0,
    completed: 0,
    rewarded: 0,
    expired: 0,
    conversionRate: 0,
    totalRewardsEarned: 0,
    totalRewardsClaimed: 0,
    averageConversionTime: 0,
  };

  let totalConversionTime = 0;
  let conversionCount = 0;

  referrals.forEach((ref) => {
    stats[ref.status]++;

    if (ref.referrerReward && ref.referrerReward.amount) {
      stats.totalRewardsEarned += ref.referrerReward.amount;
      if (ref.referrerReward.claimed) {
        stats.totalRewardsClaimed += ref.referrerReward.amount;
      }
    }

    if (ref.inviteSentAt && ref.signedUpAt) {
      totalConversionTime += ref.signedUpAt - ref.inviteSentAt;
      conversionCount += 1;
    }
  });

  const converted = stats.signedUp + stats.completed + stats.rewarded;
  stats.conversionRate = stats.total > 0 ? (converted / stats.total) * 100 : 0;

  stats.averageConversionTime = conversionCount > 0 ? totalConversionTime / conversionCount : 0;

  return stats;
};

/**
 * Get top referrers
 */
referralSchema.statics.getTopReferrers = async function (limit = 10, organizationId = null) {
  const matchStage = {
    status: { $in: ['signed_up', 'completed_action', 'rewarded'] },
  };

  if (organizationId) {
    matchStage.organization = organizationId;
  }

  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: '$referrerId',
        referralCount: { $sum: 1 },
        completedCount: {
          $sum: {
            $cond: [{ $in: ['$status', ['completed_action', 'rewarded']] }, 1, 0],
          },
        },
        totalRewards: {
          $sum: '$referrerReward.amount',
        },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $project: {
        _id: 1,
        userName: {
          $concat: ['$user.firstName', ' ', '$user.lastName'],
        },
        userEmail: '$user.email',
        referralCount: 1,
        completedCount: 1,
        totalRewards: 1,
        conversionRate: {
          $multiply: [{ $divide: ['$completedCount', '$referralCount'] }, 100],
        },
      },
    },
    { $sort: { referralCount: -1 } },
    { $limit: limit },
  ];

  return this.aggregate(pipeline);
};

/**
 * Get referral analytics
 */
referralSchema.statics.getAnalytics = async function (filters = {}) {
  const matchStage = {};

  if (filters.organizationId) {
    matchStage.organization = filters.organizationId;
  }

  if (filters.startDate || filters.endDate) {
    matchStage.createdAt = {};
    if (filters.startDate) matchStage.createdAt.$gte = filters.startDate;
    if (filters.endDate) matchStage.createdAt.$lte = filters.endDate;
  }

  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalReferrals: { $sum: 1 },
        totalClicks: {
          $sum: { $cond: [{ $ne: ['$clickedAt', null] }, 1, 0] },
        },
        totalSignups: {
          $sum: {
            $cond: [{ $in: ['$status', ['signed_up', 'completed_action', 'rewarded']] }, 1, 0],
          },
        },
        totalCompleted: {
          $sum: {
            $cond: [{ $in: ['$status', ['completed_action', 'rewarded']] }, 1, 0],
          },
        },
        totalRewarded: {
          $sum: { $cond: [{ $eq: ['$status', 'rewarded'] }, 1, 0] },
        },
        totalRewardsDistributed: {
          $sum: '$referrerReward.amount',
        },
        sourceBreakdown: {
          $push: '$source',
        },
      },
    },
  ];

  const result = await this.aggregate(pipeline);

  if (result.length === 0) {
    return {
      totalReferrals: 0,
      totalClicks: 0,
      totalSignups: 0,
      totalCompleted: 0,
      totalRewarded: 0,
      clickThroughRate: 0,
      signupConversionRate: 0,
      completionRate: 0,
      totalRewardsDistributed: 0,
    };
  }

  const data = result[0];

  return {
    totalReferrals: data.totalReferrals,
    totalClicks: data.totalClicks,
    totalSignups: data.totalSignups,
    totalCompleted: data.totalCompleted,
    totalRewarded: data.totalRewarded,
    clickThroughRate: data.totalReferrals > 0 ? (data.totalClicks / data.totalReferrals) * 100 : 0,
    signupConversionRate: data.totalClicks > 0 ? (data.totalSignups / data.totalClicks) * 100 : 0,
    completionRate: data.totalSignups > 0 ? (data.totalCompleted / data.totalSignups) * 100 : 0,
    totalRewardsDistributed: data.totalRewardsDistributed || 0,
  };
};

// ==================== PRE-SAVE HOOK ====================

referralSchema.pre('save', async function (next) {
  // Check expiration
  if (this.isExpired && this.status === 'pending') {
    this.status = 'expired';
    this.isActive = false;
  }

  next();
});

module.exports = mongoose.model('Referral', referralSchema);
