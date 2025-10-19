const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
/**
 * Project Model
 * Comprehensive project management with stages, planning, and tracking
 */
const projectSchema = new mongoose.Schema(
  {
    // Basic Information
    projectId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    projectName: {
      type: String,
      required: true,
    },
    projectCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    description: {
      type: String,
      required: true,
    },
    projectType: {
      type: String,
      enum: ['software', 'infrastructure', 'clinical', 'research', 'business', 'other'],
      required: true,
    },

    // Project Status
    status: {
      type: String,
      enum: ['planning', 'active', 'on-hold', 'completed', 'cancelled', 'archived'],
      default: 'planning',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },
    healthStatus: {
      type: String,
      enum: ['green', 'yellow', 'red'],
      default: 'green',
      description: 'Overall project health indicator',
    },

    // Dates & Timeline
    startDate: {
      type: Date,
      index: true,
    },
    plannedEndDate: {
      type: Date,
      index: true,
    },
    actualEndDate: Date,
    lastUpdated: {
      type: Date,
      default: Date.now,
    },

    // Team & Roles
    projectOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    projectManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    teamMembers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        role: {
          type: String,
          enum: ['developer', 'designer', 'tester', 'analyst', 'architect', 'consultant', 'other'],
        },
        allocation: {
          type: Number, // Percentage (0-100)
          min: 0,
          max: 100,
        },
        joinedDate: Date,
        leftDate: Date,
      },
    ],
    stakeholders: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        role: {
          type: String,
          enum: ['executive', 'sponsor', 'client', 'advisor', 'observer'],
        },
        accessLevel: {
          type: String,
          enum: ['full', 'reports-only', 'summary-only'],
          default: 'summary-only',
        },
      },
    ],

    // Budget & Resources
    budget: {
      total: {
        type: Number,
        default: 0,
      },
      spent: {
        type: Number,
        default: 0,
      },
      remaining: {
        type: Number,
        default: 0,
      },
      currency: {
        type: String,
        default: 'USD',
      },
      lastUpdated: Date,
    },

    // Current Stage
    currentStage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProjectStage',
    },

    // Progress Metrics
    progress: {
      overall: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      milestones: {
        total: Number,
        completed: Number,
      },
      tasks: {
        total: Number,
        completed: Number,
        inProgress: Number,
        blocked: Number,
      },
    },

    // Objectives & Goals
    objectives: [
      {
        title: String,
        description: String,
        completed: {
          type: Boolean,
          default: false,
        },
        completedDate: Date,
        kpi: {
          metric: String,
          target: Number,
          actual: Number,
          unit: String,
        },
      },
    ],

    // Risks & Issues
    risks: [
      {
        description: String,
        severity: {
          type: String,
          enum: ['low', 'medium', 'high', 'critical'],
        },
        probability: {
          type: String,
          enum: ['low', 'medium', 'high'],
        },
        mitigation: String,
        status: {
          type: String,
          enum: ['identified', 'mitigated', 'occurred', 'resolved'],
        },
        identifiedDate: Date,
        resolvedDate: Date,
      },
    ],

    issues: [
      {
        title: String,
        description: String,
        severity: {
          type: String,
          enum: ['low', 'medium', 'high', 'critical'],
        },
        status: {
          type: String,
          enum: ['open', 'in-progress', 'resolved', 'closed'],
        },
        assignedTo: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        reportedDate: Date,
        resolvedDate: Date,
      },
    ],

    // Dependencies
    dependencies: [
      {
        dependsOn: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Project',
        },
        type: {
          type: String,
          enum: ['blocks', 'blocked-by', 'related'],
        },
        description: String,
      },
    ],

    // Deliverables
    deliverables: [
      {
        name: String,
        description: String,
        dueDate: Date,
        completed: {
          type: Boolean,
          default: false,
        },
        completedDate: Date,
        files: [
          {
            filename: String,
            url: String,
            uploadedAt: Date,
          },
        ],
      },
    ],

    // Tags & Categories
    tags: [String],
    department: {
      type: String,
      enum: ['engineering', 'clinical', 'operations', 'finance', 'marketing', 'hr', 'other'],
    },

    // Reporting Configuration
    reportingSettings: {
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly'],
        default: 'weekly',
      },
      recipients: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      includeFinancials: {
        type: Boolean,
        default: true,
      },
      includeRisks: {
        type: Boolean,
        default: true,
      },
      customMetrics: [String],
    },

    // Metadata
    isArchived: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Custom Fields
    customFields: [
      {
        key: String,
        value: mongoose.Schema.Types.Mixed,
        type: {
          type: String,
          enum: ['text', 'number', 'date', 'boolean', 'list'],
        },
      },
    ],

    // Notes & Comments
    notes: [
      {
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        content: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
        isPrivate: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
projectSchema.index({ projectOwner: 1, status: 1 });
projectSchema.index({ projectManager: 1, status: 1 });
projectSchema.index({ status: 1, priority: 1, startDate: -1 });
projectSchema.index({ department: 1, status: 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// projectSchema.index({ tags: 1 });
projectSchema.index({ 'stakeholders.user': 1 });

// Virtual for progress percentage
projectSchema.virtual('completionPercentage').get(function () {
  if (this.progress.tasks.total === 0) return 0;
  return Math.round((this.progress.tasks.completed / this.progress.tasks.total) * 100);
});

// Virtual for budget utilization
projectSchema.virtual('budgetUtilization').get(function () {
  if (this.budget.total === 0) return 0;
  return Math.round((this.budget.spent / this.budget.total) * 100);
});

// Virtual for schedule variance
projectSchema.virtual('scheduleVariance').get(function () {
  if (!this.plannedEndDate) return null;
  const now = new Date();
  const planned = new Date(this.plannedEndDate);
  return Math.ceil((planned - now) / (1000 * 60 * 60 * 24)); // Days
});

// Static methods

// Get projects by owner
projectSchema.statics.getByOwner = async function (ownerId, status = null) {
  const query = { projectOwner: ownerId };
  if (status) query.status = status;
  return this.find(query)
    .populate('projectManager', 'firstName lastName email')
    .populate('currentStage')
    .sort({ startDate: -1 });
};

// Get projects by manager
projectSchema.statics.getByManager = async function (managerId, status = null) {
  const query = { projectManager: managerId };
  if (status) query.status = status;
  return this.find(query)
    .populate('projectOwner', 'firstName lastName email')
    .populate('currentStage')
    .sort({ startDate: -1 });
};

// Get active projects
projectSchema.statics.getActiveProjects = async function () {
  return this.find({ status: 'active', isArchived: false })
    .populate('projectOwner', 'firstName lastName')
    .populate('projectManager', 'firstName lastName')
    .populate('currentStage')
    .sort({ priority: -1, startDate: -1 });
};

// Get at-risk projects
projectSchema.statics.getAtRiskProjects = async function () {
  return this.find({
    status: 'active',
    healthStatus: { $in: ['yellow', 'red'] },
  })
    .populate('projectOwner', 'firstName lastName')
    .populate('projectManager', 'firstName lastName')
    .sort({ healthStatus: 1, priority: -1 });
};

// Get overbudget projects
projectSchema.statics.getOverbudgetProjects = async function () {
  return this.find({
    status: 'active',
    $expr: { $gt: ['$budget.spent', '$budget.total'] },
  })
    .populate('projectOwner', 'firstName lastName')
    .populate('projectManager', 'firstName lastName')
    .sort({ 'budget.spent': -1 });
};

// Get projects by stakeholder
projectSchema.statics.getByStakeholder = async function (userId) {
  return this.find({
    'stakeholders.user': userId,
    isArchived: false,
  })
    .populate('projectOwner', 'firstName lastName')
    .populate('projectManager', 'firstName lastName')
    .sort({ startDate: -1 });
};

// Executive summary statistics
projectSchema.statics.getExecutiveSummary = async function (filters = {}) {
  const matchStage = { isArchived: false };

  if (filters.department) matchStage.department = filters.department;
  if (filters.status) matchStage.status = filters.status;

  const summary = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalBudget: { $sum: '$budget.total' },
        totalSpent: { $sum: '$budget.spent' },
        avgProgress: { $avg: '$progress.overall' },
      },
    },
  ]);

  const healthSummary = await this.aggregate([
    { $match: { ...matchStage, status: 'active' } },
    {
      $group: {
        _id: '$healthStatus',
        count: { $sum: 1 },
      },
    },
  ]);

  return {
    byStatus: summary,
    byHealth: healthSummary,
  };
};

// Instance methods

// Update progress
projectSchema.methods.updateProgress = async function () {
  // This would typically query related tasks/milestones
  // For now, we'll just recalculate based on stored values
  if (this.progress.tasks.total > 0) {
    this.progress.overall = Math.round(
      (this.progress.tasks.completed / this.progress.tasks.total) * 100
    );
  }

  // Update budget remaining
  this.budget.remaining = this.budget.total - this.budget.spent;

  return this.save();
};

// Add team member
projectSchema.methods.addTeamMember = function (userId, role, allocation = 100) {
  this.teamMembers.push({
    user: userId,
    role,
    allocation,
    joinedDate: new Date(),
  });
  return this.save();
};

// Remove team member
projectSchema.methods.removeTeamMember = function (userId) {
  const member = this.teamMembers.find((m) => m.user.toString() === userId.toString());
  if (member) {
    member.leftDate = new Date();
  }
  return this.save();
};

// Add risk
projectSchema.methods.addRisk = function (risk) {
  this.risks.push({
    ...risk,
    identifiedDate: new Date(),
    status: 'identified',
  });
  return this.save();
};

// Add issue
projectSchema.methods.addIssue = function (issue) {
  this.issues.push({
    ...issue,
    reportedDate: new Date(),
    status: 'open',
  });

  // Update health status based on issue severity
  if (issue.severity === 'critical' && this.healthStatus === 'green') {
    this.healthStatus = 'yellow';
  }

  return this.save();
};

// Pre-save middleware
projectSchema.pre('save', function (next) {
  this.lastUpdated = new Date();

  // Auto-calculate budget remaining
  if (this.budget.total && this.budget.spent) {
    this.budget.remaining = this.budget.total - this.budget.spent;
  }

  next();
});

module.exports = mongoose.model('Project', projectSchema);
