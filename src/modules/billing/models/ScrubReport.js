const mongoose = require('mongoose');

/**
 * Scrub Report Model
 *
 * Stores claim scrubbing results and audit trail
 */

// eslint-disable-next-line no-unused-vars

const issueSchema = new mongoose.Schema(
  {
    ruleId: {
      type: String,
      required: true,
    },
    ruleName: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      enum: ['error', 'warning', 'info'],
      required: true,
    },
    field: {
      type: String,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
    },
    expectedValue: {
      type: mongoose.Schema.Types.Mixed,
    },
    message: {
      type: String,
      required: true,
    },
    autoFixable: {
      type: Boolean,
      default: false,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const fixedIssueSchema = new mongoose.Schema(
  {
    ruleId: {
      type: String,
      required: true,
    },
    ruleName: {
      type: String,
      required: true,
    },
    changes: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    message: {
      type: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const scrubReportSchema = new mongoose.Schema(
  {
    // Associated claim
    claim: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Claim',
      required: true,
      index: true,
    },

    claimNumber: {
      type: String,
      index: true,
    },

    // Scrubbing result
    status: {
      type: String,
      enum: ['pass', 'pass_with_warnings', 'fail', 'fixed'],
      required: true,
      index: true,
    },

    // Issues found
    errors: [issueSchema],

    warnings: [issueSchema],

    info: [issueSchema],

    // Fixed issues
    fixedIssues: [fixedIssueSchema],

    // Summary statistics
    summary: {
      totalChecks: {
        type: Number,
        default: 0,
      },
      errorCount: {
        type: Number,
        default: 0,
      },
      warningCount: {
        type: Number,
        default: 0,
      },
      infoCount: {
        type: Number,
        default: 0,
      },
      fixedCount: {
        type: Number,
        default: 0,
      },
      autoFixableCount: {
        type: Number,
        default: 0,
      },
    },

    // Category breakdown
    categories: {
      type: Map,
      of: {
        errors: { type: Number, default: 0 },
        warnings: { type: Number, default: 0 },
        info: { type: Number, default: 0 },
      },
      default: {},
    },

    // Scrubbing configuration
    config: {
      autoFix: {
        type: Boolean,
        default: false,
      },
      categories: [
        {
          type: String,
        },
      ],
      skipWarnings: {
        type: Boolean,
        default: false,
      },
    },

    // Performance metrics
    duration: {
      type: Number, // milliseconds
      default: 0,
    },

    // Scrubbing metadata
    scrubbedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    scrubbedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // Claim snapshot at time of scrubbing
    claimSnapshot: {
      type: mongoose.Schema.Types.Mixed,
    },

    // Actions taken
    actions: [
      {
        action: {
          type: String,
          enum: ['scrubbed', 'auto_fixed', 'manual_fix', 'approved', 'rejected', 'resubmitted'],
        },
        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        notes: {
          type: String,
        },
      },
    ],

    // Recommendations
    recommendations: [
      {
        priority: {
          type: String,
          enum: ['critical', 'high', 'medium', 'low'],
        },
        action: {
          type: String,
        },
        message: {
          type: String,
        },
        details: {
          type: String,
        },
      },
    ],

    // Version tracking
    version: {
      type: Number,
      default: 1,
    },

    // Previous report (for tracking changes)
    previousReport: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ScrubReport',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
scrubReportSchema.index({ claim: 1, scrubbedAt: -1 });
scrubReportSchema.index({ status: 1, scrubbedAt: -1 });
scrubReportSchema.index({ 'summary.errorCount': 1 });
scrubReportSchema.index({ scrubbedBy: 1, scrubbedAt: -1 });

// Virtuals

/**
 * Check if claim can be submitted
 */
scrubReportSchema.virtual('canSubmit').get(function () {
  return this.status !== 'fail';
});

/**
 * Check if review is required
 */
scrubReportSchema.virtual('reviewRequired').get(function () {
  return this.status === 'fixed' || this.status === 'pass_with_warnings';
});

/**
 * Get pass rate
 */
scrubReportSchema.virtual('passRate').get(function () {
  if (this.summary.totalChecks === 0) return 100;
  const passed = this.summary.totalChecks - this.summary.errorCount;
  return ((passed / this.summary.totalChecks) * 100).toFixed(2);
});

// Instance methods

/**
 * Add action to report
 */
scrubReportSchema.methods.addAction = function (action, performedBy, notes = null) {
  this.actions.push({
    action,
    performedBy,
    timestamp: new Date(),
    notes,
  });
};

/**
 * Get top issues
 */
scrubReportSchema.methods.getTopIssues = function (limit = 5) {
  const categoryIssues = [];

  for (const [category, counts] of this.categories) {
    categoryIssues.push({
      category,
      total: counts.errors + counts.warnings,
      errors: counts.errors,
      warnings: counts.warnings,
    });
  }

  return categoryIssues.sort((a, b) => b.total - a.total).slice(0, limit);
};

/**
 * Get errors by category
 */
scrubReportSchema.methods.getErrorsByCategory = function (category) {
  return this.errors.filter((error) => error.category === category);
};

/**
 * Get warnings by category
 */
scrubReportSchema.methods.getWarningsByCategory = function (category) {
  return this.warnings.filter((warning) => warning.category === category);
};

/**
 * Compare with previous report
 */
scrubReportSchema.methods.compareWithPrevious = async function () {
  if (!this.previousReport) {
    return {
      hasChanges: false,
      message: 'No previous report to compare',
    };
  }

  const ScrubReport = mongoose.model('ScrubReport');
  const previous = await ScrubReport.findById(this.previousReport);

  if (!previous) {
    return {
      hasChanges: false,
      message: 'Previous report not found',
    };
  }

  const comparison = {
    hasChanges: true,
    statusChanged: this.status !== previous.status,
    errorCountDelta: this.summary.errorCount - previous.summary.errorCount,
    warningCountDelta: this.summary.warningCount - previous.summary.warningCount,
    fixedCountDelta: this.summary.fixedCount - previous.summary.fixedCount,
    newErrors: [],
    resolvedErrors: [],
    newWarnings: [],
    resolvedWarnings: [],
  };

  // Find new errors
  for (const error of this.errors) {
    const existed = previous.errors.some((e) => e.ruleId === error.ruleId);
    if (!existed) {
      comparison.newErrors.push(error);
    }
  }

  // Find resolved errors
  for (const error of previous.errors) {
    const stillExists = this.errors.some((e) => e.ruleId === error.ruleId);
    if (!stillExists) {
      comparison.resolvedErrors.push(error);
    }
  }

  // Find new warnings
  for (const warning of this.warnings) {
    const existed = previous.warnings.some((w) => w.ruleId === warning.ruleId);
    if (!existed) {
      comparison.newWarnings.push(warning);
    }
  }

  // Find resolved warnings
  for (const warning of previous.warnings) {
    const stillExists = this.warnings.some((w) => w.ruleId === warning.ruleId);
    if (!stillExists) {
      comparison.resolvedWarnings.push(warning);
    }
  }

  return comparison;
};

/**
 * Generate summary text
 */
scrubReportSchema.methods.generateSummary = function () {
  const parts = [];

  if (this.status === 'pass') {
    parts.push('✓ Claim passed all validations');
  } else if (this.status === 'pass_with_warnings') {
    parts.push(`⚠ Claim passed with ${this.summary.warningCount} warning(s)`);
  } else if (this.status === 'fail') {
    parts.push(`✗ Claim failed with ${this.summary.errorCount} error(s)`);
  } else if (this.status === 'fixed') {
    parts.push(`✓ ${this.summary.fixedCount} issue(s) were automatically fixed`);
  }

  if (this.summary.errorCount > 0) {
    parts.push(`${this.summary.errorCount} error(s) must be corrected`);
  }

  if (this.summary.autoFixableCount > 0) {
    parts.push(`${this.summary.autoFixableCount} issue(s) can be auto-fixed`);
  }

  return parts.join('. ');
};

// Static methods

/**
 * Get latest report for claim
 */
scrubReportSchema.statics.getLatestForClaim = function (claimId) {
  return this.findOne({ claim: claimId }).sort({ scrubbedAt: -1 }).exec();
};

/**
 * Get all reports for claim
 */
scrubReportSchema.statics.getAllForClaim = function (claimId) {
  return this.find({ claim: claimId }).sort({ scrubbedAt: -1 }).exec();
};

/**
 * Get reports by status
 */
scrubReportSchema.statics.getByStatus = function (status, limit = 100) {
  return this.find({ status })
    .sort({ scrubbedAt: -1 })
    .limit(limit)
    .populate('claim', 'claimNumber patient.firstName patient.lastName serviceDate')
    .exec();
};

/**
 * Get statistics for date range
 */
scrubReportSchema.statics.getStatistics = async function (startDate, endDate) {
  const reports = await this.find({
    scrubbedAt: {
      $gte: startDate,
      $lte: endDate,
    },
  });

  const stats = {
    totalReports: reports.length,
    byStatus: {
      pass: 0,
      pass_with_warnings: 0,
      fail: 0,
      fixed: 0,
    },
    totalErrors: 0,
    totalWarnings: 0,
    totalFixed: 0,
    averageDuration: 0,
    passRate: 0,
    autoFixRate: 0,
    commonErrors: {},
    commonWarnings: {},
    categoryStats: {},
  };

  for (const report of reports) {
    stats.byStatus[report.status]++;
    stats.totalErrors += report.summary.errorCount;
    stats.totalWarnings += report.summary.warningCount;
    stats.totalFixed += report.summary.fixedCount;
    stats.averageDuration += report.duration;

    // Track common errors
    for (const error of report.errors) {
      stats.commonErrors[error.ruleId] = stats.commonErrors[error.ruleId] || {
        ruleId: error.ruleId,
        ruleName: error.ruleName,
        count: 0,
      };
      stats.commonErrors[error.ruleId].count += 1;
    }

    // Track common warnings
    for (const warning of report.warnings) {
      stats.commonWarnings[warning.ruleId] = stats.commonWarnings[warning.ruleId] || {
        ruleId: warning.ruleId,
        ruleName: warning.ruleName,
        count: 0,
      };
      stats.commonWarnings[warning.ruleId].count += 1;
    }

    // Track category stats
    for (const [category, counts] of report.categories) {
      if (!stats.categoryStats[category]) {
        stats.categoryStats[category] = { errors: 0, warnings: 0, info: 0 };
      }
      stats.categoryStats[category].errors += counts.errors;
      stats.categoryStats[category].warnings += counts.warnings;
      stats.categoryStats[category].info += counts.info;
    }
  }

  // Calculate averages and rates
  if (reports.length > 0) {
    stats.averageDuration = Math.round(stats.averageDuration / reports.length);
    const passCount =
      stats.byStatus.pass + stats.byStatus.pass_with_warnings + stats.byStatus.fixed;
    stats.passRate = ((passCount / reports.length) * 100).toFixed(2);

    const totalIssues = stats.totalErrors + stats.totalFixed;
    if (totalIssues > 0) {
      stats.autoFixRate = ((stats.totalFixed / totalIssues) * 100).toFixed(2);
    }
  }

  // Convert to arrays and sort
  stats.commonErrors = Object.values(stats.commonErrors)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  stats.commonWarnings = Object.values(stats.commonWarnings)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return stats;
};

/**
 * Get claims needing attention
 */
scrubReportSchema.statics.getNeedingAttention = function () {
  return this.find({
    status: { $in: ['fail', 'pass_with_warnings'] },
  })
    .sort({ 'summary.errorCount': -1, scrubbedAt: -1 })
    .limit(50)
    .populate('claim', 'claimNumber patient.firstName patient.lastName serviceDate status')
    .exec();
};

const ScrubReport = mongoose.model('ScrubReport', scrubReportSchema);

module.exports = ScrubReport;
