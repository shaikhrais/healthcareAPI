const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
/**
 * Automation Workflow Model
 * Orchestrates the end-to-end automation process from idea to implementation
 */
const automationWorkflowSchema = new mongoose.Schema(
  {
    // Workflow Identification
    workflowId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    workflowName: {
      type: String,
      required: true,
    },

    // Workflow Type
    workflowType: {
      type: String,
      enum: [
        'simple-task', // Single task, single agent
        'multi-task', // Multiple related tasks
        'pipeline', // Sequential tasks
        'parallel', // Parallel tasks
        'collaborative', // Multiple agents working together
        'iterative', // Iterative refinement
        'end-to-end', // Complete feature from idea to deployment
      ],
      required: true,
    },

    // Workflow Status
    status: {
      type: String,
      enum: [
        'initialized',
        'analyzing',
        'planning',
        'executing',
        'testing',
        'reviewing',
        'deploying',
        'completed',
        'failed',
        'cancelled',
        'paused',
      ],
      default: 'initialized',
      index: true,
    },

    // Original Request/Idea
    originalRequest: {
      title: String,
      description: String,
      thoughtProcess: String,
      userIntent: String,
      expectedOutcome: String,
      businessValue: String,
      urgency: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
      },
    },

    // Workflow Phases
    phases: [
      {
        phaseName: String,
        phaseOrder: Number,
        status: {
          type: String,
          enum: ['pending', 'in-progress', 'completed', 'failed', 'skipped'],
        },
        startTime: Date,
        endTime: Date,
        assignedAgents: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'AutomationAgent',
          },
        ],
        tasks: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'AutomationTask',
          },
        ],
        output: mongoose.Schema.Types.Mixed,
        notes: String,
      },
    ],

    currentPhase: {
      type: Number,
      default: 0,
    },

    // Workflow Plan (AI-Generated)
    workflowPlan: {
      generatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AutomationAgent',
      },
      generatedAt: Date,

      approach: String,
      estimatedDuration: Number, // minutes
      estimatedComplexity: String,

      requiredAgents: [
        {
          agentType: String,
          specialization: String,
          role: String,
          estimatedTime: Number,
        },
      ],

      breakdown: [
        {
          phase: String,
          description: String,
          tasks: [String],
          dependencies: [String],
          estimatedTime: Number,
        },
      ],

      technologies: [String],
      frameworks: [String],
      externalDependencies: [String],

      risks: [
        {
          risk: String,
          severity: String,
          likelihood: String,
          mitigation: String,
        },
      ],

      alternativeApproaches: [
        {
          approach: String,
          pros: [String],
          cons: [String],
          score: Number,
        },
      ],
    },

    // Tasks in Workflow
    tasks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AutomationTask',
      },
    ],

    // Agents Involved
    agents: [
      {
        agent: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'AutomationAgent',
        },
        role: String,
        contribution: String,
        timeSpent: Number, // minutes
        tasksCompleted: Number,
      },
    ],

    // Progress Tracking
    progress: {
      overallPercentage: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      phasesCompleted: {
        type: Number,
        default: 0,
      },
      phasesTotal: {
        type: Number,
        default: 0,
      },
      tasksCompleted: {
        type: Number,
        default: 0,
      },
      tasksTotal: {
        type: Number,
        default: 0,
      },
    },

    // Timeline
    timeline: {
      requestedAt: Date,
      startedAt: Date,
      completedAt: Date,
      estimatedCompletion: Date,
      actualDuration: Number, // minutes
      estimatedDuration: Number, // minutes
    },

    // Deliverables
    deliverables: {
      codeGenerated: [
        {
          component: String,
          files: [String],
          linesOfCode: Number,
          language: String,
        },
      ],

      testsCreated: [
        {
          testSuite: String,
          testCount: Number,
          coverage: Number,
        },
      ],

      documentationGenerated: [
        {
          type: String,
          file: String,
          content: String,
        },
      ],

      apiEndpoints: [
        {
          method: String,
          path: String,
          description: String,
        },
      ],

      databaseChanges: [
        {
          type: String, // 'schema', 'migration', 'seed'
          description: String,
          applied: Boolean,
        },
      ],

      deploymentArtifacts: [
        {
          artifact: String,
          type: String,
          location: String,
        },
      ],
    },

    // Quality & Metrics
    qualityMetrics: {
      overallScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },

      codeQuality: {
        score: Number,
        complexity: Number,
        maintainability: Number,
        testCoverage: Number,
      },

      performance: {
        executionTime: Number,
        efficiency: Number,
      },

      compliance: {
        bestPractices: Number,
        securityScore: Number,
        accessibilityScore: Number,
      },

      userSatisfaction: {
        meetsRequirements: Boolean,
        qualityRating: Number, // 1-5
        feedback: String,
      },
    },

    // Validation & Testing
    validation: {
      automated: {
        passed: Boolean,
        totalTests: Number,
        passedTests: Number,
        failedTests: Number,
        testResults: [
          {
            testName: String,
            passed: Boolean,
            message: String,
          },
        ],
      },

      integration: {
        passed: Boolean,
        issues: [String],
      },

      humanReview: {
        required: Boolean,
        completed: Boolean,
        reviewedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        reviewedAt: Date,
        approved: Boolean,
        feedback: String,
        score: Number,
      },
    },

    // Collaboration & Communication
    collaboration: {
      agentCommunications: [
        {
          fromAgent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'AutomationAgent',
          },
          toAgent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'AutomationAgent',
          },
          message: String,
          timestamp: Date,
          messageType: String, // 'request', 'response', 'notification', 'question'
        },
      ],

      decisions: [
        {
          decision: String,
          madeBy: String, // 'agent' or 'human'
          agentId: mongoose.Schema.Types.ObjectId,
          rationale: String,
          alternatives: [String],
          timestamp: Date,
        },
      ],

      clarifications: [
        {
          question: String,
          askedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'AutomationAgent',
          },
          answeredBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
          answer: String,
          timestamp: Date,
        },
      ],
    },

    // Errors & Issues
    issues: [
      {
        timestamp: Date,
        phase: String,
        severity: {
          type: String,
          enum: ['low', 'medium', 'high', 'critical'],
        },
        description: String,
        affectedComponent: String,
        resolution: String,
        resolvedBy: String,
        resolved: Boolean,
      },
    ],

    // Learning & Improvement
    learningOutcomes: {
      patternsDiscovered: [String],
      bestPracticesApplied: [String],
      challengesFaced: [
        {
          challenge: String,
          solution: String,
          applicableToFuture: Boolean,
        },
      ],
      improvementSuggestions: [String],
      knowledgeGained: [
        {
          topic: String,
          insight: String,
          confidence: Number,
        },
      ],
    },

    // Execution Logs
    logs: [
      {
        timestamp: Date,
        level: String, // 'debug', 'info', 'warning', 'error'
        source: String, // agent ID or system component
        message: String,
        details: mongoose.Schema.Types.Mixed,
      },
    ],

    // Configuration
    settings: {
      autoProgress: {
        type: Boolean,
        default: true,
      },
      requireHumanApproval: {
        type: Boolean,
        default: false,
      },
      autoDeploy: {
        type: Boolean,
        default: false,
      },
      maxDuration: Number, // minutes
      maxRetries: {
        type: Number,
        default: 3,
      },
    },

    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    },
    tags: [String],
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
automationWorkflowSchema.index({ status: 1, createdAt: -1 });
automationWorkflowSchema.index({ createdBy: 1, status: 1 });
automationWorkflowSchema.index({ project: 1 });

// Virtuals

// Check if workflow is in progress
automationWorkflowSchema.virtual('isActive').get(function () {
  return ['analyzing', 'planning', 'executing', 'testing', 'reviewing'].includes(this.status);
});

// Calculate completion percentage
automationWorkflowSchema.virtual('completionPercentage').get(function () {
  if (this.progress.tasksTotal === 0) return 0;
  return Math.round((this.progress.tasksCompleted / this.progress.tasksTotal) * 100);
});

// Static methods

// Get active workflows
automationWorkflowSchema.statics.getActiveWorkflows = async function () {
  return this.find({
    status: { $in: ['analyzing', 'planning', 'executing', 'testing', 'reviewing'] },
    isArchived: false,
  })
    .populate('createdBy', 'firstName lastName')
    .populate('agents.agent')
    .sort({ createdAt: -1 });
};

// Get workflows by status
automationWorkflowSchema.statics.getByStatus = async function (status) {
  return this.find({ status, isArchived: false })
    .populate('createdBy', 'firstName lastName')
    .populate('agents.agent')
    .sort({ createdAt: -1 });
};

// Get workflows by user
automationWorkflowSchema.statics.getByUser = async function (userId) {
  return this.find({ createdBy: userId, isArchived: false }).sort({ createdAt: -1 });
};

// Get workflow statistics
automationWorkflowSchema.statics.getStatistics = async function () {
  const stats = await this.aggregate([
    { $match: { isArchived: false } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgDuration: { $avg: '$timeline.actualDuration' },
        avgQuality: { $avg: '$qualityMetrics.overallScore' },
      },
    },
  ]);

  return stats;
};

// Instance methods

// Start workflow
automationWorkflowSchema.methods.start = async function () {
  this.status = 'analyzing';
  this.timeline.startedAt = new Date();
  return this.save();
};

// Move to next phase
automationWorkflowSchema.methods.nextPhase = async function () {
  if (this.currentPhase < this.phases.length - 1) {
    // Complete current phase
    if (this.phases[this.currentPhase]) {
      this.phases[this.currentPhase].status = 'completed';
      this.phases[this.currentPhase].endTime = new Date();
    }

    // Move to next phase
    this.currentPhase += 1;
    this.phases[this.currentPhase].status = 'in-progress';
    this.phases[this.currentPhase].startTime = new Date();

    this.progress.phasesCompleted += 1;
  }

  return this.save();
};

// Update progress
automationWorkflowSchema.methods.updateProgress = async function () {
  // Recalculate progress
  if (this.progress.tasksTotal > 0) {
    this.progress.overallPercentage = Math.round(
      (this.progress.tasksCompleted / this.progress.tasksTotal) * 100
    );
  }

  return this.save();
};

// Add log
automationWorkflowSchema.methods.addLog = function (level, source, message, details = null) {
  this.logs.push({
    timestamp: new Date(),
    level,
    source,
    message,
    details,
  });
  return this.save();
};

// Record issue
automationWorkflowSchema.methods.recordIssue = function (phase, severity, description, component) {
  this.issues.push({
    timestamp: new Date(),
    phase,
    severity,
    description,
    affectedComponent: component,
    resolved: false,
  });
  return this.save();
};

// Complete workflow
automationWorkflowSchema.methods.complete = async function () {
  this.status = 'completed';
  this.timeline.completedAt = new Date();

  if (this.timeline.startedAt) {
    this.timeline.actualDuration = Math.round(
      (Date.now() - this.timeline.startedAt.getTime()) / (1000 * 60)
    );
  }

  this.progress.overallPercentage = 100;
  return this.save();
};

// Fail workflow
automationWorkflowSchema.methods.fail = async function (reason) {
  this.status = 'failed';
  this.addLog('error', 'system', `Workflow failed: ${reason}`);
  return this.save();
};

// Pause workflow
automationWorkflowSchema.methods.pause = async function () {
  this.status = 'paused';
  return this.save();
};

// Resume workflow
automationWorkflowSchema.methods.resume = async function () {
  this.status = 'executing';
  return this.save();
};

module.exports = mongoose.model('AutomationWorkflow', automationWorkflowSchema);
