const mongoose = require('mongoose');

/**
 * StartupMetrics Model
 * TASK-14.24 - Startup Time Optimization
 *
 * Tracks and analyzes app startup performance
 * Features:
 * - Cold start, warm start, hot start tracking
 * - Time-to-interactive (TTI) measurement
 * - Splash screen duration
 * - Phase-by-phase breakdown
 * - Resource loading times
 * - Performance bottleneck detection
 * - Device and OS correlation
 * - Optimization recommendations
 */

// eslint-disable-next-line no-unused-vars

const startupMetricsSchema = new mongoose.Schema(
  {
    // Session Information
    sessionId: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // App Information
    appVersion: {
      type: String,
      required: true,
    },
    buildNumber: String,

    // Device Information
    device: {
      platform: {
        type: String,
        enum: ['ios', 'android'],
        required: true,
      },
      model: String,
      osVersion: String,
      manufacturer: String,
      memory: Number, // MB
      storage: {
        total: Number, // MB
        available: Number, // MB
      },
    },

    // Startup Type
    startupType: {
      type: String,
      enum: ['cold', 'warm', 'hot'],
      required: true,
    },

    // Overall Timing (all in milliseconds)
    timing: {
      // Total startup time
      total: {
        type: Number,
        required: true,
      },

      // Time to interactive (when user can interact)
      timeToInteractive: Number,

      // Time to first render
      timeToFirstRender: Number,

      // Time to content ready
      timeToContentReady: Number,

      // Splash screen duration
      splashScreenDuration: Number,
    },

    // Detailed Phase Breakdown (ms)
    phases: {
      // App initialization
      initialization: {
        duration: Number,
        startTime: Number,
        endTime: Number,
      },

      // JavaScript bundle loading
      bundleLoad: {
        duration: Number,
        startTime: Number,
        endTime: Number,
        size: Number, // bytes
      },

      // Native module initialization
      nativeModules: {
        duration: Number,
        startTime: Number,
        endTime: Number,
        modules: [
          {
            name: String,
            duration: Number,
          },
        ],
      },

      // React Native bridge setup
      bridgeSetup: {
        duration: Number,
        startTime: Number,
        endTime: Number,
      },

      // React component mounting
      reactMount: {
        duration: Number,
        startTime: Number,
        endTime: Number,
      },

      // API calls during startup
      apiCalls: {
        duration: Number,
        startTime: Number,
        endTime: Number,
        calls: [
          {
            endpoint: String,
            duration: Number,
            status: Number,
          },
        ],
      },

      // Asset loading
      assetLoading: {
        duration: Number,
        startTime: Number,
        endTime: Number,
        assets: [
          {
            type: String,
            path: String,
            duration: Number,
            size: Number,
          },
        ],
      },

      // Authentication check
      authCheck: {
        duration: Number,
        startTime: Number,
        endTime: Number,
      },

      // Data hydration (AsyncStorage, cache)
      dataHydration: {
        duration: Number,
        startTime: Number,
        endTime: Number,
        itemsLoaded: Number,
      },

      // Screen rendering
      screenRender: {
        duration: Number,
        startTime: Number,
        endTime: Number,
        screenName: String,
      },
    },

    // Performance Metrics
    performance: {
      // Memory usage
      memory: {
        initial: Number, // MB
        peak: Number, // MB
        average: Number, // MB
      },

      // CPU usage
      cpu: {
        average: Number, // Percentage
        peak: Number, // Percentage
      },

      // Frame drops during startup
      frameDrops: Number,

      // JS thread blocked time
      jsThreadBlocked: Number, // ms

      // Main thread blocked time
      mainThreadBlocked: Number, // ms
    },

    // Network Performance
    network: {
      type: {
        type: String,
        enum: ['wifi', '4g', '5g', '3g', '2g', 'offline', 'unknown'],
      },
      latency: Number, // ms
      bandwidth: Number, // Mbps
    },

    // Bottlenecks Detected
    bottlenecks: [
      {
        phase: String,
        description: String,
        duration: Number, // ms
        severity: {
          type: String,
          enum: ['critical', 'high', 'medium', 'low'],
        },
        suggestion: String,
      },
    ],

    // Optimization Opportunities
    optimizations: [
      {
        type: {
          type: String,
          enum: [
            'lazy_load_modules',
            'reduce_bundle_size',
            'optimize_images',
            'defer_api_calls',
            'enable_hermes',
            'reduce_native_modules',
            'optimize_splash',
            'cache_assets',
            'preload_critical',
            'reduce_initial_state',
          ],
        },
        description: String,
        estimatedImprovement: Number, // ms
        priority: {
          type: String,
          enum: ['high', 'medium', 'low'],
        },
        implemented: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // User Experience
    userExperience: {
      perceived: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor'],
      },
      exitedBeforeReady: Boolean,
      timeToFirstInteraction: Number, // ms
    },

    // Comparison Benchmarks
    benchmarks: {
      industry: {
        average: Number, // ms
        percentile: Number, // 0-100
      },
      app: {
        average: Number, // ms for this app
        improvement: Number, // % compared to previous
      },
    },

    // Flags
    isFirstLaunch: Boolean,
    isAfterUpdate: Boolean,
    isCrashRecovery: Boolean,
    isBackgroundLaunch: Boolean,

    // Timestamp
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // Metadata
    metadata: {
      timezone: String,
      locale: String,
      connectionQuality: String,
    },

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

startupMetricsSchema.index({ startupType: 1, timestamp: -1 });
startupMetricsSchema.index({ 'device.platform': 1, timestamp: -1 });
startupMetricsSchema.index({ appVersion: 1, timestamp: -1 });
startupMetricsSchema.index({ 'timing.total': 1 });
startupMetricsSchema.index({ userId: 1, timestamp: -1 });

// ==================== VIRTUAL FIELDS ====================

startupMetricsSchema.virtual('totalSeconds').get(function () {
  return (this.timing.total / 1000).toFixed(2);
});

startupMetricsSchema.virtual('isFast').get(function () {
  // Fast: < 2s cold, < 1s warm, < 0.5s hot
  const thresholds = { cold: 2000, warm: 1000, hot: 500 };
  return this.timing.total < thresholds[this.startupType];
});

startupMetricsSchema.virtual('performanceRating').get(function () {
  const time = this.timing.total;
  const type = this.startupType;

  if (type === 'cold') {
    if (time < 2000) return 'excellent';
    if (time < 3000) return 'good';
    if (time < 5000) return 'fair';
    return 'poor';
  }
  if (type === 'warm') {
    if (time < 1000) return 'excellent';
    if (time < 1500) return 'good';
    if (time < 2500) return 'fair';
    return 'poor';
  } // hot
  if (time < 500) return 'excellent';
  if (time < 1000) return 'good';
  if (time < 1500) return 'fair';
  return 'poor';
});

// ==================== INSTANCE METHODS ====================

/**
 * Get startup summary
 */
startupMetricsSchema.methods.getSummary = function () {
  return {
    sessionId: this.sessionId,
    type: this.startupType,
    total: {
      ms: this.timing.total,
      seconds: this.totalSeconds,
    },
    timeToInteractive: this.timing.timeToInteractive,
    rating: this.performanceRating,
    isFast: this.isFast,
    device: {
      platform: this.device.platform,
      model: this.device.model,
    },
    bottlenecks: this.bottlenecks.length,
    optimizations: this.optimizations.filter((o) => !o.implemented).length,
  };
};

/**
 * Get slowest phases
 */
startupMetricsSchema.methods.getSlowestPhases = function (limit = 5) {
  const phases = [];

  Object.entries(this.phases).forEach(([name, phase]) => {
    if (phase && phase.duration) {
      phases.push({
        name,
        duration: phase.duration,
        percentage: ((phase.duration / this.timing.total) * 100).toFixed(2),
      });
    }
  });

  return phases.sort((a, b) => b.duration - a.duration).slice(0, limit);
};

/**
 * Get critical bottlenecks
 */
startupMetricsSchema.methods.getCriticalBottlenecks = function () {
  return this.bottlenecks
    .filter((b) => b.severity === 'critical' || b.severity === 'high')
    .sort((a, b) => b.duration - a.duration)
    .map((b) => ({
      phase: b.phase,
      description: b.description,
      duration: b.duration,
      severity: b.severity,
      suggestion: b.suggestion,
    }));
};

/**
 * Get optimization recommendations
 */
startupMetricsSchema.methods.getRecommendations = function () {
  return this.optimizations
    .filter((o) => !o.implemented)
    .sort((a, b) => b.estimatedImprovement - a.estimatedImprovement)
    .map((o) => ({
      type: o.type,
      description: o.description,
      improvement: {
        ms: o.estimatedImprovement,
        seconds: (o.estimatedImprovement / 1000).toFixed(2),
      },
      priority: o.priority,
    }));
};

/**
 * Calculate potential improvement
 */
startupMetricsSchema.methods.calculatePotentialImprovement = function () {
  const total = this.optimizations
    .filter((o) => !o.implemented)
    .reduce((sum, o) => sum + o.estimatedImprovement, 0);

  const newTime = Math.max(0, this.timing.total - total);

  return {
    current: {
      ms: this.timing.total,
      seconds: this.totalSeconds,
      rating: this.performanceRating,
    },
    potential: {
      ms: newTime,
      seconds: (newTime / 1000).toFixed(2),
      rating: this.calculateRatingForTime(newTime),
    },
    improvement: {
      ms: total,
      seconds: (total / 1000).toFixed(2),
      percentage: ((total / this.timing.total) * 100).toFixed(2),
    },
  };
};

/**
 * Helper: Calculate rating for specific time
 */
startupMetricsSchema.methods.calculateRatingForTime = function (time) {
  const type = this.startupType;

  if (type === 'cold') {
    if (time < 2000) return 'excellent';
    if (time < 3000) return 'good';
    if (time < 5000) return 'fair';
    return 'poor';
  }
  if (type === 'warm') {
    if (time < 1000) return 'excellent';
    if (time < 1500) return 'good';
    if (time < 2500) return 'fair';
    return 'poor';
  }
  if (time < 500) return 'excellent';
  if (time < 1000) return 'good';
  if (time < 1500) return 'fair';
  return 'poor';
};

// ==================== STATIC METHODS ====================

/**
 * Get average startup time
 */
startupMetricsSchema.statics.getAverageTime = async function (filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: '$startupType',
        avgTime: { $avg: '$timing.total' },
        minTime: { $min: '$timing.total' },
        maxTime: { $max: '$timing.total' },
        count: { $sum: 1 },
      },
    },
  ];

  return this.aggregate(pipeline);
};

/**
 * Get startup time trend
 */
startupMetricsSchema.statics.getTimeTrend = async function (platform, days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const metrics = await this.find({
    'device.platform': platform,
    timestamp: { $gte: since },
  }).sort({ timestamp: 1 });

  return metrics.map((m) => ({
    timestamp: m.timestamp,
    total: m.timing.total,
    type: m.startupType,
    rating: m.performanceRating,
  }));
};

/**
 * Get performance statistics
 */
startupMetricsSchema.statics.getPerformanceStats = async function (filters = {}) {
  const metrics = await this.find(filters);

  if (metrics.length === 0) {
    return {
      count: 0,
      message: 'No data available',
    };
  }

  const times = metrics.map((m) => m.timing.total);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const sorted = times.sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p90 = sorted[Math.floor(sorted.length * 0.9)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];

  return {
    count: metrics.length,
    average: avg.toFixed(2),
    median: p50,
    percentiles: { p50, p90, p95, p99 },
    min: Math.min(...times),
    max: Math.max(...times),
    byType: {
      cold: metrics.filter((m) => m.startupType === 'cold').length,
      warm: metrics.filter((m) => m.startupType === 'warm').length,
      hot: metrics.filter((m) => m.startupType === 'hot').length,
    },
    ratings: {
      excellent: metrics.filter((m) => m.performanceRating === 'excellent').length,
      good: metrics.filter((m) => m.performanceRating === 'good').length,
      fair: metrics.filter((m) => m.performanceRating === 'fair').length,
      poor: metrics.filter((m) => m.performanceRating === 'poor').length,
    },
  };
};

/**
 * Get common bottlenecks
 */
startupMetricsSchema.statics.getCommonBottlenecks = async function (limit = 10) {
  const pipeline = [
    { $unwind: '$bottlenecks' },
    {
      $group: {
        _id: '$bottlenecks.phase',
        count: { $sum: 1 },
        avgDuration: { $avg: '$bottlenecks.duration' },
        severity: { $first: '$bottlenecks.severity' },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit },
  ];

  return this.aggregate(pipeline);
};

module.exports = mongoose.model('StartupMetrics', startupMetricsSchema);
