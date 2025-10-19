const mongoose = require('mongoose');

/**
 * Badge Count Model
 * TASK-14.8 - App Badge Counts
 *
 * Manages app icon badge counts for iOS and Android
 * Features:
 * - Category-based badge counts
 * - Auto-increment/decrement
 * - Badge aggregation
 * - Custom badge rules
 * - Badge history tracking
 * - Multi-device support
 * - Real-time updates
 */

// eslint-disable-next-line no-unused-vars

const badgeCountSchema = new mongoose.Schema(
  {
    // User reference
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    // Total badge count (displayed on app icon)
    total: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Category-based counts
    categories: {
      // Appointments
      appointments: {
        unconfirmed: {
          type: Number,
          default: 0,
          min: 0,
        },
        upcoming: {
          type: Number,
          default: 0,
          min: 0,
        },
        reminders: {
          type: Number,
          default: 0,
          min: 0,
        },
        checkInReady: {
          type: Number,
          default: 0,
          min: 0,
        },
        total: {
          type: Number,
          default: 0,
          min: 0,
        },
      },

      // Messages
      messages: {
        unread: {
          type: Number,
          default: 0,
          min: 0,
        },
        directMessages: {
          type: Number,
          default: 0,
          min: 0,
        },
        groupMessages: {
          type: Number,
          default: 0,
          min: 0,
        },
        mentions: {
          type: Number,
          default: 0,
          min: 0,
        },
        total: {
          type: Number,
          default: 0,
          min: 0,
        },
      },

      // Notifications
      notifications: {
        unread: {
          type: Number,
          default: 0,
          min: 0,
        },
        actionRequired: {
          type: Number,
          default: 0,
          min: 0,
        },
        urgent: {
          type: Number,
          default: 0,
          min: 0,
        },
        total: {
          type: Number,
          default: 0,
          min: 0,
        },
      },

      // Billing & Payments
      billing: {
        unpaid: {
          type: Number,
          default: 0,
          min: 0,
        },
        overdue: {
          type: Number,
          default: 0,
          min: 0,
        },
        paymentFailed: {
          type: Number,
          default: 0,
          min: 0,
        },
        total: {
          type: Number,
          default: 0,
          min: 0,
        },
      },

      // Medical
      medical: {
        testResults: {
          type: Number,
          default: 0,
          min: 0,
        },
        prescriptions: {
          type: Number,
          default: 0,
          min: 0,
        },
        referrals: {
          type: Number,
          default: 0,
          min: 0,
        },
        total: {
          type: Number,
          default: 0,
          min: 0,
        },
      },

      // Tasks
      tasks: {
        pending: {
          type: Number,
          default: 0,
          min: 0,
        },
        overdue: {
          type: Number,
          default: 0,
          min: 0,
        },
        total: {
          type: Number,
          default: 0,
          min: 0,
        },
      },

      // Surveys
      surveys: {
        pending: {
          type: Number,
          default: 0,
          min: 0,
        },
        total: {
          type: Number,
          default: 0,
          min: 0,
        },
      },

      // Insurance
      insurance: {
        actionRequired: {
          type: Number,
          default: 0,
          min: 0,
        },
        expiringSoon: {
          type: Number,
          default: 0,
          min: 0,
        },
        total: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
    },

    // Badge Display Configuration
    config: {
      // Which categories to include in total count
      includedCategories: [
        {
          type: String,
          enum: [
            'appointments',
            'messages',
            'notifications',
            'billing',
            'medical',
            'tasks',
            'surveys',
            'insurance',
          ],
        },
      ],

      // Maximum badge count to display (e.g., 99+)
      maxDisplayCount: {
        type: Number,
        default: 99,
      },

      // Show badge even when count is 0
      showWhenZero: {
        type: Boolean,
        default: false,
      },

      // Auto-clear badges on app open
      autoClearOnOpen: {
        type: Boolean,
        default: false,
      },

      // Priority weights for categories (higher = more important)
      categoryWeights: {
        appointments: { type: Number, default: 1 },
        messages: { type: Number, default: 1 },
        notifications: { type: Number, default: 1 },
        billing: { type: Number, default: 2 }, // Higher priority
        medical: { type: Number, default: 2 },
        tasks: { type: Number, default: 1 },
        surveys: { type: Number, default: 0.5 },
        insurance: { type: Number, default: 1.5 },
      },
    },

    // Device-specific badge counts (for syncing across devices)
    devices: [
      {
        deviceId: {
          type: String,
          required: true,
        },
        platform: {
          type: String,
          enum: ['ios', 'android', 'web'],
        },
        lastSynced: {
          type: Date,
          default: Date.now,
        },
        badgeCount: {
          type: Number,
          default: 0,
        },
      },
    ],

    // Badge History (for analytics)
    history: [
      {
        timestamp: {
          type: Date,
          default: Date.now,
        },
        action: {
          type: String,
          enum: ['increment', 'decrement', 'set', 'clear', 'sync'],
        },
        category: String,
        subcategory: String,
        previousCount: Number,
        newCount: Number,
        delta: Number,
        reason: String,
      },
    ],

    // Statistics
    stats: {
      totalIncrements: {
        type: Number,
        default: 0,
      },
      totalDecrements: {
        type: Number,
        default: 0,
      },
      totalClears: {
        type: Number,
        default: 0,
      },
      lastIncrement: Date,
      lastDecrement: Date,
      lastClear: Date,
      highestCount: {
        type: Number,
        default: 0,
      },
      highestCountDate: Date,
      averageCount: {
        type: Number,
        default: 0,
      },
    },

    // Metadata
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    lastCleared: Date,
  },
  {
    timestamps: true,
  }
);

// ==================== INDEXES ====================

badgeCountSchema.index({ 'devices.deviceId': 1 });
badgeCountSchema.index({ lastUpdated: -1 });
badgeCountSchema.index({ total: -1 });

// ==================== VIRTUAL FIELDS ====================

badgeCountSchema.virtual('displayCount').get(function () {
  const max = this.config.maxDisplayCount;
  return this.total > max ? `${max}+` : this.total.toString();
});

badgeCountSchema.virtual('hasNotifications').get(function () {
  return this.total > 0;
});

badgeCountSchema.virtual('needsSync').get(function () {
  // Check if any device is out of sync
  return this.devices.some((device) => {
    const timeSinceSync = Date.now() - device.lastSynced.getTime();
    return timeSinceSync > 60000 || device.badgeCount !== this.total; // 1 minute
  });
});

// ==================== INSTANCE METHODS ====================

/**
 * Calculate total badge count from categories
 */
badgeCountSchema.methods.calculateTotal = function () {
  let total = 0;

  const includedCategories =
    this.config.includedCategories.length > 0
      ? this.config.includedCategories
      : [
          'appointments',
          'messages',
          'notifications',
          'billing',
          'medical',
          'tasks',
          'surveys',
          'insurance',
        ];

  includedCategories.forEach((category) => {
    if (this.categories[category]) {
      total += this.categories[category].total || 0;
    }
  });

  this.total = total;
  return total;
};

/**
 * Increment badge count for a category
 */
badgeCountSchema.methods.increment = function (category, subcategory, amount = 1, reason) {
  if (!this.categories[category]) {
    throw new Error(`Invalid category: ${category}`);
  }

  const previousTotal = this.total;
  const previousCategoryTotal = this.categories[category].total;

  if (subcategory) {
    if (this.categories[category][subcategory] === undefined) {
      throw new Error(`Invalid subcategory: ${subcategory}`);
    }
    this.categories[category][subcategory] += amount;
  }

  // Update category total
  this.categories[category].total += amount;

  // Recalculate total
  this.calculateTotal();

  // Add to history
  this.addToHistory('increment', category, subcategory, previousTotal, this.total, amount, reason);

  // Update stats
  this.stats.totalIncrements += amount;
  this.stats.lastIncrement = new Date();
  if (this.total > this.stats.highestCount) {
    this.stats.highestCount = this.total;
    this.stats.highestCountDate = new Date();
  }

  this.lastUpdated = new Date();
  return this.save();
};

/**
 * Decrement badge count for a category
 */
badgeCountSchema.methods.decrement = function (category, subcategory, amount = 1, reason) {
  if (!this.categories[category]) {
    throw new Error(`Invalid category: ${category}`);
  }

  const previousTotal = this.total;

  if (subcategory) {
    if (this.categories[category][subcategory] === undefined) {
      throw new Error(`Invalid subcategory: ${subcategory}`);
    }
    this.categories[category][subcategory] = Math.max(
      0,
      this.categories[category][subcategory] - amount
    );
  }

  // Update category total
  this.categories[category].total = Math.max(0, this.categories[category].total - amount);

  // Recalculate total
  this.calculateTotal();

  // Add to history
  this.addToHistory('decrement', category, subcategory, previousTotal, this.total, -amount, reason);

  // Update stats
  this.stats.totalDecrements += amount;
  this.stats.lastDecrement = new Date();

  this.lastUpdated = new Date();
  return this.save();
};

/**
 * Set badge count for a category
 */
badgeCountSchema.methods.setCount = function (category, subcategory, count, reason) {
  if (!this.categories[category]) {
    throw new Error(`Invalid category: ${category}`);
  }

  const previousTotal = this.total;

  if (subcategory) {
    if (this.categories[category][subcategory] === undefined) {
      throw new Error(`Invalid subcategory: ${subcategory}`);
    }
    const previousCount = this.categories[category][subcategory];
    this.categories[category][subcategory] = Math.max(0, count);

    // Adjust category total
    const delta = count - previousCount;
    this.categories[category].total = Math.max(0, this.categories[category].total + delta);
  } else {
    this.categories[category].total = Math.max(0, count);
  }

  // Recalculate total
  this.calculateTotal();

  // Add to history
  const delta = this.total - previousTotal;
  this.addToHistory('set', category, subcategory, previousTotal, this.total, delta, reason);

  this.lastUpdated = new Date();
  return this.save();
};

/**
 * Clear badge count for a category or all
 */
badgeCountSchema.methods.clear = function (category, subcategory, reason) {
  const previousTotal = this.total;

  if (category) {
    if (!this.categories[category]) {
      throw new Error(`Invalid category: ${category}`);
    }

    if (subcategory) {
      if (this.categories[category][subcategory] === undefined) {
        throw new Error(`Invalid subcategory: ${subcategory}`);
      }
      this.categories[category][subcategory] = 0;
    } else {
      // Clear entire category
      Object.keys(this.categories[category]).forEach((key) => {
        if (typeof this.categories[category][key] === 'number') {
          this.categories[category][key] = 0;
        }
      });
    }
  } else {
    // Clear all categories
    Object.keys(this.categories).forEach((cat) => {
      Object.keys(this.categories[cat]).forEach((key) => {
        if (typeof this.categories[cat][key] === 'number') {
          this.categories[cat][key] = 0;
        }
      });
    });
  }

  // Recalculate total
  this.calculateTotal();

  // Add to history
  this.addToHistory(
    'clear',
    category,
    subcategory,
    previousTotal,
    this.total,
    -previousTotal,
    reason
  );

  // Update stats
  this.stats.totalClears += 1;
  this.stats.lastClear = new Date();
  this.lastCleared = new Date();

  this.lastUpdated = new Date();
  return this.save();
};

/**
 * Sync badge count to device
 */
badgeCountSchema.methods.syncToDevice = function (deviceId, platform) {
  let device = this.devices.find((d) => d.deviceId === deviceId);

  if (!device) {
    device = {
      deviceId,
      platform,
      lastSynced: new Date(),
      badgeCount: this.total,
    };
    this.devices.push(device);
  } else {
    device.badgeCount = this.total;
    device.lastSynced = new Date();
  }

  // Add to history
  this.addToHistory(
    'sync',
    null,
    null,
    device.badgeCount,
    this.total,
    0,
    `Synced to device ${deviceId}`
  );

  return this.save();
};

/**
 * Add entry to history
 */
badgeCountSchema.methods.addToHistory = function (
  action,
  category,
  subcategory,
  previousCount,
  newCount,
  delta,
  reason
) {
  // Keep only last 100 history entries
  if (this.history.length >= 100) {
    this.history.shift();
  }

  this.history.push({
    timestamp: new Date(),
    action,
    category,
    subcategory,
    previousCount,
    newCount,
    delta,
    reason,
  });
};

/**
 * Get category summary
 */
badgeCountSchema.methods.getCategorySummary = function () {
  const summary = {};

  Object.keys(this.categories).forEach((category) => {
    summary[category] = {
      total: this.categories[category].total || 0,
      subcategories: {},
    };

    Object.keys(this.categories[category]).forEach((subcategory) => {
      if (subcategory !== 'total' && typeof this.categories[category][subcategory] === 'number') {
        summary[category].subcategories[subcategory] = this.categories[category][subcategory];
      }
    });
  });

  return summary;
};

/**
 * Get weighted priority score
 */
badgeCountSchema.methods.getPriorityScore = function () {
  let score = 0;

  Object.keys(this.categories).forEach((category) => {
    const weight = this.config.categoryWeights[category] || 1;
    const count = this.categories[category].total || 0;
    score += count * weight;
  });

  return score;
};

// ==================== STATIC METHODS ====================

/**
 * Get or create badge count for user
 */
badgeCountSchema.statics.getOrCreate = async function (userId) {
  let badgeCount = await this.findOne({ userId });

  if (!badgeCount) {
    badgeCount = await this.create({
      userId,
      config: {
        includedCategories: ['appointments', 'messages', 'notifications', 'billing', 'medical'],
      },
    });
  }

  return badgeCount;
};

/**
 * Increment badge for user
 */
badgeCountSchema.statics.incrementForUser = async function (
  userId,
  category,
  subcategory,
  amount = 1,
  reason
) {
  const badgeCount = await this.getOrCreate(userId);
  return badgeCount.increment(category, subcategory, amount, reason);
};

/**
 * Decrement badge for user
 */
badgeCountSchema.statics.decrementForUser = async function (
  userId,
  category,
  subcategory,
  amount = 1,
  reason
) {
  const badgeCount = await this.getOrCreate(userId);
  return badgeCount.decrement(category, subcategory, amount, reason);
};

/**
 * Clear badge for user
 */
badgeCountSchema.statics.clearForUser = async function (userId, category, subcategory, reason) {
  const badgeCount = await this.getOrCreate(userId);
  return badgeCount.clear(category, subcategory, reason);
};

/**
 * Get users with high badge counts
 */
badgeCountSchema.statics.getUsersWithHighCounts = async function (threshold = 10, limit = 100) {
  return this.find({ total: { $gte: threshold } })
    .sort({ total: -1 })
    .limit(limit)
    .populate('userId', 'firstName lastName email');
};

/**
 * Get badge analytics summary
 */
badgeCountSchema.statics.getAnalyticsSummary = async function () {
  const result = await this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        totalBadges: { $sum: '$total' },
        avgBadgeCount: { $avg: '$total' },
        maxBadgeCount: { $max: '$total' },
        usersWithBadges: {
          $sum: { $cond: [{ $gt: ['$total', 0] }, 1, 0] },
        },
      },
    },
  ]);

  return (
    result[0] || {
      totalUsers: 0,
      totalBadges: 0,
      avgBadgeCount: 0,
      maxBadgeCount: 0,
      usersWithBadges: 0,
    }
  );
};

/**
 * Clean up old history entries
 */
badgeCountSchema.statics.cleanupHistory = async function (daysToKeep = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  return this.updateMany(
    {},
    {
      $pull: {
        history: {
          timestamp: { $lt: cutoffDate },
        },
      },
    }
  );
};

// ==================== PRE-SAVE HOOKS ====================

badgeCountSchema.pre('save', function (next) {
  // Ensure all counts are non-negative
  Object.keys(this.categories).forEach((category) => {
    Object.keys(this.categories[category]).forEach((subcategory) => {
      if (typeof this.categories[category][subcategory] === 'number') {
        this.categories[category][subcategory] = Math.max(
          0,
          this.categories[category][subcategory]
        );
      }
    });
  });

  // Update average count
  if (this.stats.totalIncrements > 0 || this.stats.totalDecrements > 0) {
    const totalChanges = this.stats.totalIncrements + this.stats.totalDecrements;
    this.stats.averageCount = this.total / Math.max(1, totalChanges);
  }

  this.lastUpdated = new Date();

  next();
});

module.exports = mongoose.model('BadgeCount', badgeCountSchema);
