const mongoose = require('mongoose');

/**
 * BetaProgram Model
 * TASK-14.22 - Beta Testing (TestFlight/Play Beta)
 *
 * Manages beta testing programs and tester participation
 * Features:
 * - Beta tester enrollment and management
 * - TestFlight and Play Store Beta integration
 * - Build distribution tracking
 * - Feedback collection
 * - Crash reporting
 * - Feature flag management
 * - Tester groups and cohorts
 * - Analytics and metrics
 */

// eslint-disable-next-line no-unused-vars

const betaProgramSchema = new mongoose.Schema(
  {
    // Program Information
    name: {
      type: String,
      required: true,
      index: true,
    },
    description: String,
    version: {
      type: String,
      required: true,
      index: true,
    },
    buildNumber: {
      type: String,
      required: true,
    },
    platform: {
      type: String,
      enum: ['ios', 'android', 'both'],
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'closed', 'archived'],
      default: 'draft',
      index: true,
    },

    // Distribution
    distribution: {
      ios: {
        enabled: {
          type: Boolean,
          default: false,
        },
        testFlightUrl: String,
        publicLinkEnabled: {
          type: Boolean,
          default: false,
        },
        publicLink: String,
        maxTesters: {
          type: Number,
          default: 10000, // TestFlight limit
        },
        currentTesters: {
          type: Number,
          default: 0,
        },
        buildId: String,
        appStoreConnectId: String,
        expiryDate: Date,
      },
      android: {
        enabled: {
          type: Boolean,
          default: false,
        },
        playStoreUrl: String,
        track: {
          type: String,
          enum: ['internal', 'closed', 'open'],
          default: 'closed',
        },
        packageName: String,
        maxTesters: Number,
        currentTesters: {
          type: Number,
          default: 0,
        },
      },
    },

    // Tester Management
    testers: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        email: {
          type: String,
          required: true,
        },
        name: String,
        platform: {
          type: String,
          enum: ['ios', 'android'],
        },
        group: {
          type: String,
          enum: ['alpha', 'beta', 'internal', 'external'],
          default: 'beta',
        },
        status: {
          type: String,
          enum: ['invited', 'accepted', 'active', 'inactive', 'removed'],
          default: 'invited',
        },
        invitedAt: {
          type: Date,
          default: Date.now,
        },
        acceptedAt: Date,
        lastActiveAt: Date,
        installCount: {
          type: Number,
          default: 0,
        },
        feedbackCount: {
          type: Number,
          default: 0,
        },
        crashCount: {
          type: Number,
          default: 0,
        },
        deviceInfo: {
          model: String,
          osVersion: String,
          appVersion: String,
        },
      },
    ],

    // Feedback Collection
    feedback: [
      {
        testerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        type: {
          type: String,
          enum: ['bug', 'feature', 'improvement', 'praise', 'other'],
          default: 'bug',
        },
        severity: {
          type: String,
          enum: ['critical', 'high', 'medium', 'low'],
          default: 'medium',
        },
        title: {
          type: String,
          required: true,
        },
        description: String,
        reproSteps: [String],
        expectedBehavior: String,
        actualBehavior: String,
        screenshots: [String],
        deviceInfo: {
          platform: String,
          model: String,
          osVersion: String,
          appVersion: String,
          buildNumber: String,
        },
        status: {
          type: String,
          enum: ['new', 'acknowledged', 'in-progress', 'resolved', 'wont-fix', 'duplicate'],
          default: 'new',
        },
        priority: {
          type: String,
          enum: ['urgent', 'high', 'medium', 'low'],
          default: 'medium',
        },
        assignedTo: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        tags: [String],
        upvotes: {
          type: Number,
          default: 0,
        },
        submittedAt: {
          type: Date,
          default: Date.now,
        },
        resolvedAt: Date,
      },
    ],

    // Crash Reports
    crashes: [
      {
        testerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        crashId: {
          type: String,
          unique: true,
          sparse: true,
        },
        message: String,
        stackTrace: String,
        deviceInfo: {
          platform: String,
          model: String,
          osVersion: String,
          appVersion: String,
          buildNumber: String,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        resolved: {
          type: Boolean,
          default: false,
        },
        resolvedAt: Date,
        affectedUsers: {
          type: Number,
          default: 1,
        },
      },
    ],

    // Feature Flags
    featureFlags: [
      {
        name: {
          type: String,
          required: true,
        },
        description: String,
        enabled: {
          type: Boolean,
          default: false,
        },
        enabledForGroups: [
          {
            type: String,
            enum: ['alpha', 'beta', 'internal', 'external'],
          },
        ],
        enabledForUsers: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
        ],
        rolloutPercentage: {
          type: Number,
          min: 0,
          max: 100,
          default: 0,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Release Notes
    releaseNotes: {
      whatsNew: [String],
      bugFixes: [String],
      knownIssues: [String],
      improvements: [String],
    },

    // Testing Requirements
    requirements: {
      minOSVersion: {
        ios: String,
        android: String,
      },
      requiredTesting: [String], // e.g., ['login', 'checkout', 'notifications']
      testingDuration: {
        type: Number, // Days
        default: 7,
      },
      feedbackRequired: {
        type: Boolean,
        default: false,
      },
    },

    // Metrics & Analytics
    metrics: {
      totalDownloads: {
        type: Number,
        default: 0,
      },
      activeUsers: {
        type: Number,
        default: 0,
      },
      crashRate: {
        type: Number,
        default: 0,
      },
      feedbackRate: {
        type: Number,
        default: 0,
      },
      averageSessionDuration: Number, // Seconds
      retentionRate: {
        day1: Number,
        day7: Number,
        day30: Number,
      },
    },

    // Notifications
    notifications: {
      onNewBuild: {
        type: Boolean,
        default: true,
      },
      onFeedback: {
        type: Boolean,
        default: true,
      },
      onCrash: {
        type: Boolean,
        default: true,
      },
      emailList: [String],
      slackWebhook: String,
    },

    // Schedule
    schedule: {
      startDate: Date,
      endDate: Date,
      autoClose: {
        type: Boolean,
        default: false,
      },
    },

    // Organization
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// ==================== INDEXES ====================

betaProgramSchema.index({ status: 1, platform: 1 });
betaProgramSchema.index({ 'testers.email': 1 });
betaProgramSchema.index({ 'testers.status': 1 });
betaProgramSchema.index({ 'feedback.status': 1 });
betaProgramSchema.index({ version: 1, buildNumber: 1 });

// ==================== VIRTUAL FIELDS ====================

betaProgramSchema.virtual('isActive').get(function () {
  return this.status === 'active';
});

betaProgramSchema.virtual('totalTesters').get(function () {
  return this.testers.length;
});

betaProgramSchema.virtual('activeTesters').get(function () {
  return this.testers.filter((t) => t.status === 'active').length;
});

betaProgramSchema.virtual('pendingInvites').get(function () {
  return this.testers.filter((t) => t.status === 'invited').length;
});

betaProgramSchema.virtual('totalFeedback').get(function () {
  return this.feedback.length;
});

betaProgramSchema.virtual('unresolvedFeedback').get(function () {
  return this.feedback.filter((f) => f.status !== 'resolved' && f.status !== 'wont-fix').length;
});

betaProgramSchema.virtual('totalCrashes').get(function () {
  return this.crashes.length;
});

betaProgramSchema.virtual('unresolvedCrashes').get(function () {
  return this.crashes.filter((c) => !c.resolved).length;
});

// ==================== INSTANCE METHODS ====================

/**
 * Invite tester to beta program
 */
betaProgramSchema.methods.inviteTester = async function (
  userId,
  email,
  name,
  platform,
  group = 'beta'
) {
  // Check if already invited
  const existing = this.testers.find((t) => t.email === email);
  if (existing) {
    throw new Error('Tester already invited');
  }

  // Check capacity
  if (
    platform === 'ios' &&
    this.distribution.ios.currentTesters >= this.distribution.ios.maxTesters
  ) {
    throw new Error('iOS beta program is full');
  }

  this.testers.push({
    userId,
    email,
    name,
    platform,
    group,
    status: 'invited',
    invitedAt: new Date(),
  });

  // Update tester count
  if (platform === 'ios') {
    this.distribution.ios.currentTesters += 1;
  } else if (platform === 'android') {
    this.distribution.android.currentTesters += 1;
  }

  return this.save();
};

/**
 * Accept beta invitation
 */
betaProgramSchema.methods.acceptInvitation = async function (email) {
  const tester = this.testers.find((t) => t.email === email);
  if (!tester) {
    throw new Error('Tester not found');
  }

  if (tester.status !== 'invited') {
    throw new Error('Invitation already processed');
  }

  tester.status = 'accepted';
  tester.acceptedAt = new Date();

  return this.save();
};

/**
 * Mark tester as active (installed app)
 */
betaProgramSchema.methods.activateTester = async function (email, deviceInfo) {
  const tester = this.testers.find((t) => t.email === email);
  if (!tester) {
    throw new Error('Tester not found');
  }

  tester.status = 'active';
  tester.lastActiveAt = new Date();
  tester.installCount += 1;
  if (deviceInfo) {
    tester.deviceInfo = deviceInfo;
  }

  this.metrics.activeUsers = this.activeTesters;

  return this.save();
};

/**
 * Remove tester from beta program
 */
betaProgramSchema.methods.removeTester = async function (email) {
  const testerIndex = this.testers.findIndex((t) => t.email === email);
  if (testerIndex === -1) {
    throw new Error('Tester not found');
  }

  const tester = this.testers[testerIndex];
  const { platform } = tester;

  this.testers.splice(testerIndex, 1);

  // Update tester count
  if (platform === 'ios') {
    this.distribution.ios.currentTesters -= 1;
  } else if (platform === 'android') {
    this.distribution.android.currentTesters -= 1;
  }

  return this.save();
};

/**
 * Submit feedback
 */
betaProgramSchema.methods.submitFeedback = async function (testerId, feedbackData) {
  const tester = this.testers.find((t) => t.userId.toString() === testerId.toString());
  if (tester) {
    tester.feedbackCount += 1;
  }

  this.feedback.push({
    testerId,
    ...feedbackData,
    submittedAt: new Date(),
  });

  return this.save();
};

/**
 * Report crash
 */
betaProgramSchema.methods.reportCrash = async function (testerId, crashData) {
  const tester = this.testers.find((t) => t.userId.toString() === testerId.toString());
  if (tester) {
    tester.crashCount += 1;
  }

  // Check for duplicate crash
  const existingCrash = this.crashes.find(
    (c) =>
      c.message === crashData.message && c.deviceInfo?.platform === crashData.deviceInfo?.platform
  );

  if (existingCrash) {
    existingCrash.affectedUsers += 1;
    existingCrash.timestamp = new Date();
  } else {
    this.crashes.push({
      testerId,
      crashId: `crash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...crashData,
      timestamp: new Date(),
    });
  }

  // Update crash rate
  this.metrics.crashRate = this.crashes.length / Math.max(this.activeTesters, 1);

  return this.save();
};

/**
 * Check if feature is enabled for user
 */
betaProgramSchema.methods.isFeatureEnabled = function (featureName, userId, userGroup) {
  const feature = this.featureFlags.find((f) => f.name === featureName);
  if (!feature) {
    return false;
  }

  if (!feature.enabled) {
    return false;
  }

  // Check user-specific
  if (
    feature.enabledForUsers &&
    feature.enabledForUsers.some((id) => id.toString() === userId.toString())
  ) {
    return true;
  }

  // Check group
  if (feature.enabledForGroups && feature.enabledForGroups.includes(userGroup)) {
    return true;
  }

  // Check rollout percentage
  if (feature.rolloutPercentage > 0) {
    const hash = parseInt(userId.toString(10).slice(-8), 16);
    const bucket = hash % 100;
    return bucket < feature.rolloutPercentage;
  }

  return false;
};

/**
 * Get program statistics
 */
betaProgramSchema.methods.getStats = function () {
  return {
    testers: {
      total: this.totalTesters,
      active: this.activeTesters,
      invited: this.pendingInvites,
      byPlatform: {
        ios: this.testers.filter((t) => t.platform === 'ios').length,
        android: this.testers.filter((t) => t.platform === 'android').length,
      },
      byGroup: {
        alpha: this.testers.filter((t) => t.group === 'alpha').length,
        beta: this.testers.filter((t) => t.group === 'beta').length,
        internal: this.testers.filter((t) => t.group === 'internal').length,
        external: this.testers.filter((t) => t.group === 'external').length,
      },
    },
    feedback: {
      total: this.totalFeedback,
      unresolved: this.unresolvedFeedback,
      byType: {
        bug: this.feedback.filter((f) => f.type === 'bug').length,
        feature: this.feedback.filter((f) => f.type === 'feature').length,
        improvement: this.feedback.filter((f) => f.type === 'improvement').length,
      },
      bySeverity: {
        critical: this.feedback.filter((f) => f.severity === 'critical').length,
        high: this.feedback.filter((f) => f.severity === 'high').length,
        medium: this.feedback.filter((f) => f.severity === 'medium').length,
        low: this.feedback.filter((f) => f.severity === 'low').length,
      },
    },
    crashes: {
      total: this.totalCrashes,
      unresolved: this.unresolvedCrashes,
      affectedUsers: this.crashes.reduce((sum, c) => sum + c.affectedUsers, 0),
    },
    metrics: this.metrics,
  };
};

// ==================== STATIC METHODS ====================

/**
 * Get active beta programs
 */
betaProgramSchema.statics.getActivePrograms = async function (platform) {
  const query = { status: 'active' };
  if (platform) {
    query.$or = [{ platform }, { platform: 'both' }];
  }
  return this.find(query).sort({ createdAt: -1 });
};

/**
 * Find tester across programs
 */
betaProgramSchema.statics.findTester = async function (email) {
  return this.find({
    'testers.email': email,
  });
};

/**
 * Get overall statistics
 */
betaProgramSchema.statics.getOverallStats = async function () {
  const programs = await this.find();

  const totalTesters = new Set();
  let totalFeedback = 0;
  let totalCrashes = 0;

  programs.forEach((program) => {
    program.testers.forEach((t) => totalTesters.add(t.email));
    totalFeedback += program.feedback.length;
    totalCrashes += program.crashes.length;
  });

  return {
    programs: programs.length,
    activePrograms: programs.filter((p) => p.status === 'active').length,
    totalTesters: totalTesters.size,
    totalFeedback,
    totalCrashes,
  };
};

module.exports = mongoose.model('BetaProgram', betaProgramSchema);
