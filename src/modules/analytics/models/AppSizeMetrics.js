const mongoose = require('mongoose');

/**
 * AppSizeMetrics Model
 * TASK-14.23 - App Size Optimization
 *
 * Tracks and analyzes app size metrics over time
 * Features:
 * - Build size tracking (IPA, APK, AAB)
 * - Asset size analysis
 * - Bundle size breakdown
 * - Size reduction recommendations
 * - Historical tracking
 * - Platform comparisons
 * - Download size vs install size
 * - Over-the-air update sizes
 */

// eslint-disable-next-line no-unused-vars

const appSizeMetricsSchema = new mongoose.Schema(
  {
    // Build Information
    version: {
      type: String,
      required: true,
      index: true,
    },
    buildNumber: {
      type: String,
      required: true,
      index: true,
    },
    platform: {
      type: String,
      enum: ['ios', 'android'],
      required: true,
    },
    buildType: {
      type: String,
      enum: ['debug', 'release', 'production'],
      default: 'release',
    },

    // Size Metrics (all in bytes)
    sizes: {
      // Total Sizes
      downloadSize: {
        type: Number,
        required: true, // Size user downloads from store
      },
      installSize: {
        type: Number,
        required: true, // Size after installation
      },

      // iOS Specific
      ipaSize: Number, // IPA file size
      appThinning: {
        universal: Number,
        iphone: Number,
        ipad: Number,
      },

      // Android Specific
      apkSize: Number, // APK file size
      aabSize: Number, // Android App Bundle size
      splitApks: {
        arm64: Number,
        arm32: Number,
        x86: Number,
        x86_64: Number,
      },

      // OTA Update Size
      otaUpdateSize: Number, // Size of over-the-air update
    },

    // Breakdown by Category
    breakdown: {
      code: {
        javascript: Number,
        native: Number,
        total: Number,
      },
      assets: {
        images: Number,
        fonts: Number,
        videos: Number,
        audio: Number,
        documents: Number,
        total: Number,
      },
      libraries: {
        node_modules: Number,
        native_modules: Number,
        total: Number,
      },
      resources: {
        config: Number,
        data: Number,
        other: Number,
        total: Number,
      },
    },

    // Detailed Asset Analysis
    assets: [
      {
        path: String,
        type: {
          type: String,
          enum: ['image', 'font', 'video', 'audio', 'document', 'other'],
        },
        size: Number,
        compressed: Boolean,
        optimized: Boolean,
        unused: Boolean,
      },
    ],

    // Bundle Analysis
    bundles: [
      {
        name: String,
        size: Number,
        modules: [
          {
            name: String,
            size: Number,
          },
        ],
      },
    ],

    // Largest Dependencies
    largestDependencies: [
      {
        name: String,
        version: String,
        size: Number,
        isDevDependency: Boolean,
        alternatives: [String], // Lighter alternatives
      },
    ],

    // Optimization Opportunities
    optimizations: [
      {
        type: {
          type: String,
          enum: [
            'compress_images',
            'remove_unused_assets',
            'lazy_load_modules',
            'tree_shake_dependencies',
            'minify_code',
            'optimize_fonts',
            'reduce_video_quality',
            'enable_hermes',
            'remove_dev_dependencies',
            'split_bundles',
          ],
        },
        description: String,
        estimatedSavings: Number, // Bytes
        priority: {
          type: String,
          enum: ['high', 'medium', 'low'],
          default: 'medium',
        },
        implemented: {
          type: Boolean,
          default: false,
        },
        implementedAt: Date,
      },
    ],

    // Comparison with Previous Build
    comparison: {
      previousVersion: String,
      sizeChange: Number, // Bytes (positive = increase, negative = decrease)
      percentageChange: Number,
      significantChanges: [
        {
          category: String,
          change: Number,
          reason: String,
        },
      ],
    },

    // Store Limits & Warnings
    storeCompliance: {
      ios: {
        withinLimit: Boolean,
        limit: {
          type: Number,
          default: 4000000000, // 4GB App Store limit
        },
        otaLimit: {
          type: Number,
          default: 200000000, // 200MB cellular download limit
        },
        exceedsOtaLimit: Boolean,
      },
      android: {
        withinLimit: Boolean,
        limit: {
          type: Number,
          default: 150000000, // 150MB APK limit
        },
        aabLimit: {
          type: Number,
          default: 150000000, // 150MB AAB limit
        },
      },
    },

    // Performance Metrics
    performance: {
      buildTime: Number, // Seconds
      compressionRatio: Number,
      assetCompressionRatio: Number,
    },

    // Metadata
    analyzedAt: {
      type: Date,
      default: Date.now,
    },
    analyzedBy: String,
    branch: String,
    commit: String,
    ciPipeline: String,

    // Notes & Actions
    notes: String,
    actionItems: [
      {
        description: String,
        assignedTo: String,
        status: {
          type: String,
          enum: ['pending', 'in-progress', 'completed'],
          default: 'pending',
        },
        completedAt: Date,
      },
    ],

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

appSizeMetricsSchema.index({ version: 1, buildNumber: 1, platform: 1 });
appSizeMetricsSchema.index({ analyzedAt: -1 });
appSizeMetricsSchema.index({ platform: 1, analyzedAt: -1 });

// ==================== VIRTUAL FIELDS ====================

appSizeMetricsSchema.virtual('downloadSizeMB').get(function () {
  return (this.sizes.downloadSize / 1024 / 1024).toFixed(2);
});

appSizeMetricsSchema.virtual('installSizeMB').get(function () {
  return (this.sizes.installSize / 1024 / 1024).toFixed(2);
});

appSizeMetricsSchema.virtual('totalOptimizationPotential').get(function () {
  return this.optimizations
    .filter((o) => !o.implemented)
    .reduce((sum, o) => sum + o.estimatedSavings, 0);
});

appSizeMetricsSchema.virtual('optimizationsPotentialMB').get(function () {
  return (this.totalOptimizationPotential / 1024 / 1024).toFixed(2);
});

// ==================== INSTANCE METHODS ====================

/**
 * Get size summary
 */
appSizeMetricsSchema.methods.getSummary = function () {
  return {
    version: this.version,
    buildNumber: this.buildNumber,
    platform: this.platform,
    downloadSize: {
      bytes: this.sizes.downloadSize,
      mb: this.downloadSizeMB,
    },
    installSize: {
      bytes: this.sizes.installSize,
      mb: this.installSizeMB,
    },
    breakdown: {
      code: this.breakdown.code.total,
      assets: this.breakdown.assets.total,
      libraries: this.breakdown.libraries.total,
    },
    optimizations: {
      available: this.optimizations.filter((o) => !o.implemented).length,
      implemented: this.optimizations.filter((o) => o.implemented).length,
      potentialSavings: {
        bytes: this.totalOptimizationPotential,
        mb: this.optimizationsPotentialMB,
      },
    },
    compliance: {
      ios: this.storeCompliance.ios.withinLimit,
      android: this.storeCompliance.android.withinLimit,
    },
  };
};

/**
 * Get top opportunities for size reduction
 */
appSizeMetricsSchema.methods.getTopOpportunities = function (limit = 5) {
  return this.optimizations
    .filter((o) => !o.implemented)
    .sort((a, b) => b.estimatedSavings - a.estimatedSavings)
    .slice(0, limit)
    .map((o) => ({
      type: o.type,
      description: o.description,
      savings: {
        bytes: o.estimatedSavings,
        mb: (o.estimatedSavings / 1024 / 1024).toFixed(2),
      },
      priority: o.priority,
    }));
};

/**
 * Mark optimization as implemented
 */
appSizeMetricsSchema.methods.markOptimizationImplemented = async function (optimizationType) {
  const optimization = this.optimizations.find((o) => o.type === optimizationType);
  if (!optimization) {
    throw new Error('Optimization not found');
  }

  optimization.implemented = true;
  optimization.implementedAt = new Date();

  return this.save();
};

/**
 * Compare with previous build
 */
appSizeMetricsSchema.methods.compareWithPrevious = async function () {
  const previous = await this.constructor
    .findOne({
      platform: this.platform,
      analyzedAt: { $lt: this.analyzedAt },
    })
    .sort({ analyzedAt: -1 });

  if (!previous) {
    return {
      hasComparison: false,
      message: 'No previous build to compare',
    };
  }

  const sizeChange = this.sizes.downloadSize - previous.sizes.downloadSize;
  const percentageChange = (sizeChange / previous.sizes.downloadSize) * 100;

  return {
    hasComparison: true,
    previous: {
      version: previous.version,
      buildNumber: previous.buildNumber,
      downloadSize: previous.sizes.downloadSize,
    },
    current: {
      version: this.version,
      buildNumber: this.buildNumber,
      downloadSize: this.sizes.downloadSize,
    },
    change: {
      bytes: sizeChange,
      mb: (sizeChange / 1024 / 1024).toFixed(2),
      percentage: percentageChange.toFixed(2),
      increased: sizeChange > 0,
    },
  };
};

/**
 * Get largest assets
 */
appSizeMetricsSchema.methods.getLargestAssets = function (limit = 10) {
  return this.assets
    .sort((a, b) => b.size - a.size)
    .slice(0, limit)
    .map((a) => ({
      path: a.path,
      type: a.type,
      size: {
        bytes: a.size,
        mb: (a.size / 1024 / 1024).toFixed(2),
      },
      compressed: a.compressed,
      optimized: a.optimized,
      unused: a.unused,
    }));
};

/**
 * Get unused assets
 */
appSizeMetricsSchema.methods.getUnusedAssets = function () {
  return this.assets
    .filter((a) => a.unused)
    .map((a) => ({
      path: a.path,
      type: a.type,
      size: {
        bytes: a.size,
        mb: (a.size / 1024 / 1024).toFixed(2),
      },
    }));
};

/**
 * Calculate potential savings from all optimizations
 */
appSizeMetricsSchema.methods.calculateTotalSavings = function () {
  const unimplemented = this.optimizations.filter((o) => !o.implemented);
  const totalSavings = unimplemented.reduce((sum, o) => sum + o.estimatedSavings, 0);
  const newSize = this.sizes.downloadSize - totalSavings;

  return {
    currentSize: {
      bytes: this.sizes.downloadSize,
      mb: this.downloadSizeMB,
    },
    potentialSize: {
      bytes: newSize,
      mb: (newSize / 1024 / 1024).toFixed(2),
    },
    savings: {
      bytes: totalSavings,
      mb: (totalSavings / 1024 / 1024).toFixed(2),
      percentage: ((totalSavings / this.sizes.downloadSize) * 100).toFixed(2),
    },
  };
};

// ==================== STATIC METHODS ====================

/**
 * Get latest metrics for platform
 */
appSizeMetricsSchema.statics.getLatest = async function (platform) {
  return this.findOne({ platform }).sort({ analyzedAt: -1 });
};

/**
 * Get size trend over time
 */
appSizeMetricsSchema.statics.getSizeTrend = async function (platform, limit = 10) {
  const metrics = await this.find({ platform }).sort({ analyzedAt: -1 }).limit(limit);

  return metrics.map((m) => ({
    version: m.version,
    buildNumber: m.buildNumber,
    downloadSize: {
      bytes: m.sizes.downloadSize,
      mb: m.downloadSizeMB,
    },
    installSize: {
      bytes: m.sizes.installSize,
      mb: m.installSizeMB,
    },
    analyzedAt: m.analyzedAt,
  }));
};

/**
 * Get overall statistics
 */
appSizeMetricsSchema.statics.getOverallStats = async function () {
  const ios = await this.getLatest('ios');
  const android = await this.getLatest('android');

  return {
    ios: ios ? ios.getSummary() : null,
    android: android ? android.getSummary() : null,
    comparison:
      ios && android
        ? {
            iosSmallerBy: {
              bytes: android.sizes.downloadSize - ios.sizes.downloadSize,
              mb: ((android.sizes.downloadSize - ios.sizes.downloadSize) / 1024 / 1024).toFixed(2),
            },
          }
        : null,
  };
};

/**
 * Get recommendations across all builds
 */
appSizeMetricsSchema.statics.getGlobalRecommendations = async function () {
  const latest = await this.find().sort({ analyzedAt: -1 }).limit(2); // Latest iOS and Android

  const allOptimizations = latest.flatMap((m) => m.optimizations.filter((o) => !o.implemented));

  // Group by type and aggregate savings
  const grouped = {};
  allOptimizations.forEach((opt) => {
    if (!grouped[opt.type]) {
      grouped[opt.type] = {
        type: opt.type,
        description: opt.description,
        totalSavings: 0,
        count: 0,
        priority: opt.priority,
      };
    }
    grouped[opt.type].totalSavings += opt.estimatedSavings;
    grouped[opt.type].count += 1;
  });

  return Object.values(grouped)
    .sort((a, b) => b.totalSavings - a.totalSavings)
    .map((g) => ({
      ...g,
      totalSavings: {
        bytes: g.totalSavings,
        mb: (g.totalSavings / 1024 / 1024).toFixed(2),
      },
    }));
};

module.exports = mongoose.model('AppSizeMetrics', appSizeMetricsSchema);
