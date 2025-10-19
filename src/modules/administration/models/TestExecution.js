const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
/**
 * Test Execution Schema
 * Tracks individual test executions, assignments, and results
 */
const testExecutionSchema = new mongoose.Schema(
  {
    // Reference to master test
    testChecklist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TestChecklist',
      required: true,
      index: true,
    },

    // Execution identification
    executionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // What is being tested
    testContext: {
      feature: String,
      buildVersion: String,
      environment: {
        type: String,
        enum: ['development', 'staging', 'production', 'local'],
        default: 'development',
      },
      platform: {
        type: String,
        enum: ['web', 'ios', 'android', 'api'],
      },
      browser: String, // Chrome, Firefox, Safari, etc.
      deviceInfo: String,
    },

    // Assignment details
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignmentType: {
      type: String,
      enum: ['ai', 'operator'],
      required: true,
      index: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // Execution status
    status: {
      type: String,
      enum: [
        'assigned', // Test assigned but not started
        'in_progress', // Test execution in progress
        'passed', // Test passed
        'failed', // Test failed
        'blocked', // Test blocked by dependencies
        'skipped', // Test skipped
        'needs_review', // Results need review
        'cancelled', // Test cancelled
      ],
      default: 'assigned',
      index: true,
    },

    // Execution timing
    startedAt: Date,
    completedAt: Date,
    actualTimeMinutes: Number,

    // Test results
    testResult: {
      passed: Boolean,
      passedSteps: [Number], // Array of step numbers that passed
      failedSteps: [Number], // Array of step numbers that failed

      // Detailed results for each step
      stepResults: [
        {
          stepNumber: Number,
          status: {
            type: String,
            enum: ['pass', 'fail', 'skip', 'blocked'],
          },
          actualResult: String,
          notes: String,
          screenshot: String, // URL or path to screenshot
        },
      ],
    },

    // Issues found
    issuesFound: [
      {
        severity: {
          type: String,
          enum: ['critical', 'high', 'medium', 'low'],
        },
        description: String,
        reproductionSteps: String,
        screenshots: [String],
        videoUrl: String,
        logFiles: [String],
        reportedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Execution notes
    executionNotes: String,
    testerComments: String,

    // AI-specific data (if executed by AI)
    aiExecutionData: {
      model: String, // AI model used
      confidence: Number, // Confidence score 0-100
      automationScript: String,
      rawOutput: String,
      requiresHumanVerification: {
        type: Boolean,
        default: false,
      },
    },

    // Verification & Review
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: Date,
    reviewNotes: String,
    reviewStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'needs_retest'],
    },

    // Related data
    relatedBug: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task', // Using existing Task model for bug tracking
    },
    relatedTestRun: String, // Batch/suite identifier

    // Attachments & Evidence
    attachments: [
      {
        type: {
          type: String,
          enum: ['screenshot', 'video', 'log', 'document', 'other'],
        },
        filename: String,
        url: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Retry information
    retryCount: {
      type: Number,
      default: 0,
    },
    previousExecutionId: String, // If this is a retry

    // Metrics
    metrics: {
      pageLoadTime: Number,
      responseTime: Number,
      errorCount: Number,
      warningCount: Number,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
testExecutionSchema.index({ status: 1, assignedTo: 1, assignedAt: -1 });
testExecutionSchema.index({ testChecklist: 1, status: 1, createdAt: -1 });
testExecutionSchema.index({ 'testContext.environment': 1, status: 1 });
testExecutionSchema.index({ assignmentType: 1, status: 1 });

// Virtual for duration
testExecutionSchema.virtual('duration').get(function () {
  if (this.startedAt && this.completedAt) {
    return Math.round((this.completedAt - this.startedAt) / (1000 * 60)); // minutes
  }
  return null;
});

// Static methods

// Get tests assigned to specific user
testExecutionSchema.statics.getMyTests = async function (userId, status = null) {
  const query = { assignedTo: userId };
  if (status) {
    query.status = status;
  }
  return this.find(query)
    .populate('testChecklist')
    .populate('assignedBy', 'firstName lastName')
    .sort({ assignedAt: -1 });
};

// Get tests by status
testExecutionSchema.statics.getByStatus = async function (status, assignmentType = null) {
  const query = { status };
  if (assignmentType) {
    query.assignmentType = assignmentType;
  }
  return this.find(query)
    .populate('testChecklist')
    .populate('assignedTo', 'firstName lastName')
    .sort({ priority: -1, assignedAt: -1 });
};

// Get failed tests
testExecutionSchema.statics.getFailedTests = async function (startDate = null) {
  const query = { status: 'failed' };
  if (startDate) {
    query.completedAt = { $gte: startDate };
  }
  return this.find(query)
    .populate('testChecklist')
    .populate('assignedTo', 'firstName lastName')
    .sort({ completedAt: -1 });
};

// Get tests needing review
testExecutionSchema.statics.getTestsNeedingReview = async function () {
  return this.find({
    $or: [
      { status: 'needs_review' },
      { 'aiExecutionData.requiresHumanVerification': true, reviewStatus: 'pending' },
    ],
  })
    .populate('testChecklist')
    .populate('assignedTo', 'firstName lastName')
    .sort({ completedAt: -1 });
};

// Get test statistics
testExecutionSchema.statics.getStatistics = async function (filters = {}) {
  const matchStage = {};

  if (filters.startDate) {
    matchStage.createdAt = { $gte: new Date(filters.startDate) };
  }
  if (filters.endDate) {
    matchStage.createdAt = { ...matchStage.createdAt, $lte: new Date(filters.endDate) };
  }
  if (filters.assignmentType) {
    matchStage.assignmentType = filters.assignmentType;
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgTime: { $avg: '$actualTimeMinutes' },
      },
    },
  ]);
};

// Instance methods

// Start test execution
testExecutionSchema.methods.startExecution = function () {
  this.status = 'in_progress';
  this.startedAt = new Date();
  return this.save();
};

// Complete test execution
testExecutionSchema.methods.completeExecution = function (result, notes = '') {
  this.status = result.passed ? 'passed' : 'failed';
  this.completedAt = new Date();
  this.testResult = result;
  this.executionNotes = notes;

  if (this.startedAt) {
    this.actualTimeMinutes = Math.round((Date.now() - this.startedAt.getTime()) / (1000 * 60));
  }

  return this.save();
};

// Add issue
testExecutionSchema.methods.addIssue = function (issue) {
  if (!this.issuesFound) {
    this.issuesFound = [];
  }
  this.issuesFound.push(issue);
  return this.save();
};

// Pre-save middleware
testExecutionSchema.pre('save', function (next) {
  // Auto-calculate duration if both times are set
  if (this.startedAt && this.completedAt && !this.actualTimeMinutes) {
    this.actualTimeMinutes = Math.round((this.completedAt - this.startedAt) / (1000 * 60));
  }

  next();
});

module.exports = mongoose.model('TestExecution', testExecutionSchema);
