const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
/**
 * Project Report Model
 * High-end reports for stakeholders, managers, and owners
 */
const projectReportSchema = new mongoose.Schema(
  {
    // Report Identification
    reportId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    reportType: {
      type: String,
      enum: [
        'executive-summary',
        'status-report',
        'financial-report',
        'progress-report',
        'risk-report',
        'milestone-report',
        'resource-utilization',
        'stakeholder-report',
        'custom',
      ],
      required: true,
      index: true,
    },
    reportTitle: {
      type: String,
      required: true,
    },

    // Project Reference
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },

    // Report Period
    reportPeriod: {
      startDate: Date,
      endDate: Date,
      label: String, // e.g., "Q3 2024", "Week 42"
    },

    // Report Status
    status: {
      type: String,
      enum: ['draft', 'pending-review', 'approved', 'published', 'archived'],
      default: 'draft',
      index: true,
    },

    // Executive Summary
    executiveSummary: {
      overview: String,
      keyHighlights: [String],
      majorConcerns: [String],
      recommendations: [String],
      nextSteps: [String],
    },

    // Project Status Summary
    projectStatus: {
      currentPhase: String,
      overallHealth: {
        type: String,
        enum: ['green', 'yellow', 'red'],
      },
      progressPercentage: Number,
      statusSummary: String,
      keyAchievements: [String],
      plannedVsActual: {
        scheduleVariance: Number, // days ahead/behind
        budgetVariance: Number, // percentage over/under
        scopeChanges: Number,
      },
    },

    // Financial Summary
    financialSummary: {
      totalBudget: Number,
      spentToDate: Number,
      remaining: Number,
      forecastedTotal: Number,
      budgetUtilization: Number, // percentage
      majorExpenditures: [
        {
          category: String,
          amount: Number,
          description: String,
        },
      ],
      costSavings: [
        {
          description: String,
          amount: Number,
        },
      ],
      budgetRisks: [String],
    },

    // Progress Metrics
    progressMetrics: {
      milestonesTotal: Number,
      milestonesCompleted: Number,
      milestonesUpcoming: Number,
      milestonesDelayed: Number,
      tasksTotal: Number,
      tasksCompleted: Number,
      tasksInProgress: Number,
      tasksBlocked: Number,
      deliverablesTotal: Number,
      deliverablesCompleted: Number,
    },

    // KPIs (Key Performance Indicators)
    kpis: [
      {
        name: String,
        description: String,
        target: Number,
        actual: Number,
        unit: String,
        trend: {
          type: String,
          enum: ['up', 'down', 'stable'],
        },
        status: {
          type: String,
          enum: ['on-track', 'at-risk', 'off-track'],
        },
      },
    ],

    // Risks & Issues
    risksAndIssues: {
      activeRisks: Number,
      criticalRisks: Number,
      mitigatedRisks: Number,
      openIssues: Number,
      criticalIssues: Number,
      resolvedIssues: Number,
      topRisks: [
        {
          description: String,
          severity: String,
          mitigation: String,
          owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
        },
      ],
      topIssues: [
        {
          title: String,
          description: String,
          severity: String,
          status: String,
          assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
        },
      ],
    },

    // Resource Utilization
    resourceUtilization: {
      teamSize: Number,
      avgAllocation: Number, // percentage
      underutilized: [{ name: String, allocation: Number }],
      overallocated: [{ name: String, allocation: Number }],
      skillGaps: [String],
      resourceRequests: [String],
    },

    // Timeline & Schedule
    schedule: {
      projectStart: Date,
      projectPlannedEnd: Date,
      projectForecastedEnd: Date,
      currentStage: String,
      completedStages: [String],
      upcomingMilestones: [
        {
          name: String,
          date: Date,
          status: String,
        },
      ],
      delayedItems: [
        {
          type: String, // 'milestone', 'task', 'deliverable'
          name: String,
          originalDate: Date,
          revisedDate: Date,
          reason: String,
        },
      ],
    },

    // Stakeholder-specific sections
    stakeholderNotes: [
      {
        stakeholder: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        note: String,
        visibility: {
          type: String,
          enum: ['private', 'executive-only', 'all-stakeholders'],
        },
      },
    ],

    // Quality Metrics
    qualityMetrics: {
      defectsDensity: Number,
      testCoverage: Number,
      codeQuality: String,
      userSatisfaction: Number,
      performanceMetrics: [
        {
          metric: String,
          value: Number,
          unit: String,
        },
      ],
    },

    // Change Management
    changeManagement: {
      totalChangeRequests: Number,
      approvedChanges: Number,
      pendingChanges: Number,
      rejectedChanges: Number,
      majorChanges: [
        {
          description: String,
          impact: String,
          status: String,
          approvedDate: Date,
        },
      ],
    },

    // Charts & Visualizations Data
    chartData: {
      burndownChart: [
        {
          date: Date,
          planned: Number,
          actual: Number,
        },
      ],
      budgetTrend: [
        {
          period: String,
          budgeted: Number,
          spent: Number,
        },
      ],
      progressOverTime: [
        {
          date: Date,
          percentage: Number,
        },
      ],
      riskHeatmap: [
        {
          category: String,
          severity: Number,
          probability: Number,
        },
      ],
    },

    // Recommendations & Actions
    recommendations: [
      {
        category: {
          type: String,
          enum: ['budget', 'schedule', 'resources', 'scope', 'quality', 'risk'],
        },
        recommendation: String,
        priority: {
          type: String,
          enum: ['low', 'medium', 'high', 'critical'],
        },
        actionItems: [String],
        owner: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],

    // Attachments
    attachments: [
      {
        name: String,
        type: String,
        url: String,
        size: Number,
        uploadedAt: Date,
      },
    ],

    // Distribution & Recipients
    distribution: {
      recipients: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      sentDate: Date,
      viewedBy: [
        {
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
          viewedAt: Date,
        },
      ],
    },

    // Report Metadata
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    publishedAt: Date,

    // Custom Sections
    customSections: [
      {
        title: String,
        content: String,
        order: Number,
      },
    ],

    // Version Control
    version: {
      type: String,
      default: '1.0',
    },
    previousVersion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProjectReport',
    },

    // Notes
    notes: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
projectReportSchema.index({ project: 1, reportType: 1, createdAt: -1 });
projectReportSchema.index({ status: 1, publishedAt: -1 });
projectReportSchema.index({ 'reportPeriod.startDate': 1, 'reportPeriod.endDate': 1 });
projectReportSchema.index({ 'distribution.recipients': 1 });

// Static methods

// Get reports by project
projectReportSchema.statics.getByProject = async function (projectId, reportType = null) {
  const query = { project: projectId };
  if (reportType) query.reportType = reportType;

  return this.find(query)
    .populate('generatedBy', 'firstName lastName')
    .populate('approvedBy', 'firstName lastName')
    .sort({ createdAt: -1 });
};

// Get latest report for project
projectReportSchema.statics.getLatestReport = async function (projectId, reportType = null) {
  const query = { project: projectId, status: 'published' };
  if (reportType) query.reportType = reportType;

  return this.findOne(query)
    .populate('generatedBy', 'firstName lastName')
    .populate('approvedBy', 'firstName lastName')
    .sort({ publishedAt: -1 });
};

// Get reports for stakeholder
projectReportSchema.statics.getForStakeholder = async function (userId) {
  return this.find({
    'distribution.recipients': userId,
    status: 'published',
  })
    .populate('project', 'projectName projectId')
    .populate('generatedBy', 'firstName lastName')
    .sort({ publishedAt: -1 });
};

// Generate executive summary report
projectReportSchema.statics.generateExecutiveSummary = async function (projectId, userId) {
  const Project = mongoose.model('Project');
  const project = await Project.findById(projectId)
    .populate('projectOwner')
    .populate('projectManager')
    .populate('currentStage');

  if (!project) {
    throw new Error('Project not found');
  }

  const reportId = `RPT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

  const report = new this({
    reportId,
    reportType: 'executive-summary',
    reportTitle: `Executive Summary - ${project.projectName}`,
    project: projectId,
    reportPeriod: {
      startDate: project.startDate,
      endDate: new Date(),
      label: `As of ${new Date().toLocaleDateString()}`,
    },
    projectStatus: {
      currentPhase: project.currentStage?.stageName || 'N/A',
      overallHealth: project.healthStatus,
      progressPercentage: project.progress.overall,
      statusSummary: `Project is ${project.status}`,
      plannedVsActual: {
        scheduleVariance: project.scheduleVariance || 0,
        budgetVariance: project.budgetUtilization || 0,
        scopeChanges: 0,
      },
    },
    financialSummary: {
      totalBudget: project.budget.total,
      spentToDate: project.budget.spent,
      remaining: project.budget.remaining,
      forecastedTotal: project.budget.total,
      budgetUtilization: Math.round((project.budget.spent / project.budget.total) * 100),
      majorExpenditures: [],
      costSavings: [],
      budgetRisks: [],
    },
    progressMetrics: {
      milestonesTotal: project.progress.milestones?.total || 0,
      milestonesCompleted: project.progress.milestones?.completed || 0,
      tasksTotal: project.progress.tasks?.total || 0,
      tasksCompleted: project.progress.tasks?.completed || 0,
      tasksInProgress: project.progress.tasks?.inProgress || 0,
      tasksBlocked: project.progress.tasks?.blocked || 0,
    },
    risksAndIssues: {
      activeRisks: project.risks.filter((r) => r.status !== 'resolved').length,
      criticalRisks: project.risks.filter((r) => r.severity === 'critical').length,
      openIssues: project.issues.filter((i) => i.status === 'open').length,
      criticalIssues: project.issues.filter((i) => i.severity === 'critical').length,
      topRisks: project.risks.slice(0, 5),
      topIssues: project.issues.slice(0, 5),
    },
    generatedBy: userId,
    status: 'draft',
  });

  return report.save();
};

// Instance methods

// Publish report
projectReportSchema.methods.publish = async function (userId) {
  this.status = 'published';
  this.publishedAt = new Date();
  this.distribution.sentDate = new Date();
  return this.save();
};

// Approve report
projectReportSchema.methods.approve = async function (userId) {
  this.status = 'approved';
  this.approvedBy = userId;
  this.approvedAt = new Date();
  return this.save();
};

// Mark as viewed
projectReportSchema.methods.markAsViewed = async function (userId) {
  const alreadyViewed = this.distribution.viewedBy.some(
    (v) => v.user.toString() === userId.toString()
  );

  if (!alreadyViewed) {
    this.distribution.viewedBy.push({
      user: userId,
      viewedAt: new Date(),
    });
    return this.save();
  }

  return this;
};

module.exports = mongoose.model('ProjectReport', projectReportSchema);
