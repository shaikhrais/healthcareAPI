const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
/**
 * Sprint Model
 * Manages 2-week development sprints with goals, tasks, and velocity tracking
 */
const sprintSchema = new mongoose.Schema(
  {
    sprintId: {
      type: String,
      required: true,
      unique: true,
      // Format: SPRINT-001, SPRINT-002, etc.
    },
    sprintNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    name: {
      type: String,
      required: true,
      // e.g., "Sprint 1: Foundation & Authentication"
    },
    status: {
      type: String,
      enum: ['planning', 'active', 'completed', 'cancelled'],
      default: 'planning',
      index: true,
    },
    // Execution Status
    executionStatus: {
      type: String,
      enum: ['pending', 'in-progress', 'executed', 'partially-executed', 'failed', 'on-hold'],
      default: 'pending',
      index: true,
    },
    executionDetails: {
      startedAt: Date,
      completedAt: Date,
      executionProgress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      tasksExecuted: {
        type: Number,
        default: 0,
      },
      tasksFailed: {
        type: Number,
        default: 0,
      },
      executionNotes: String,
    },
    // Status Flags
    flags: {
      isBlocked: {
        type: Boolean,
        default: false,
      },
      isAtRisk: {
        type: Boolean,
        default: false,
      },
      needsAttention: {
        type: Boolean,
        default: false,
      },
      hasBlockingIssues: {
        type: Boolean,
        default: false,
      },
      isBehindSchedule: {
        type: Boolean,
        default: false,
      },
    },
    description: {
      type: String,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    duration: {
      type: Number,
      default: 14, // days
    },
    goals: [
      {
        description: String,
        completed: {
          type: Boolean,
          default: false,
        },
        priority: {
          type: String,
          enum: ['critical', 'high', 'medium', 'low'],
          default: 'medium',
        },
      },
    ],
    focus: {
      type: String,
      // Main focus area: "Authentication", "Patient Management", etc.
    },
    modules: [
      {
        type: String,
        // Modules covered in this sprint
      },
    ],
    // Capacity Planning
    capacity: {
      totalStoryPoints: {
        type: Number,
        default: 0,
      },
      plannedVelocity: {
        type: Number,
        // Expected story points to complete
      },
      actualVelocity: {
        type: Number,
        default: 0,
        // Actual completed story points
      },
      teamCapacity: {
        type: Number,
        // Available working hours
      },
    },
    // Task References
    tasks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DevelopmentTask',
      },
    ],
    taskSummary: {
      total: {
        type: Number,
        default: 0,
      },
      completed: {
        type: Number,
        default: 0,
      },
      inProgress: {
        type: Number,
        default: 0,
      },
      todo: {
        type: Number,
        default: 0,
      },
      blocked: {
        type: Number,
        default: 0,
      },
    },
    // Team Assignment
    team: [
      {
        member: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        role: String,
        allocation: {
          type: Number,
          min: 0,
          max: 100,
          // Percentage allocation
        },
        tasksAssigned: {
          type: Number,
          default: 0,
        },
      },
    ],
    // Sprint Metrics
    metrics: {
      burndownData: [
        {
          date: Date,
          remainingPoints: Number,
          completedPoints: Number,
          idealRemaining: Number,
        },
      ],
      cumulativeFlow: [
        {
          date: Date,
          todo: Number,
          inProgress: Number,
          done: Number,
        },
      ],
      velocityTrend: Number,
      completionRate: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
    },
    // Sprint Review
    review: {
      conducted: {
        type: Boolean,
        default: false,
      },
      date: Date,
      attendees: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      accomplishments: [String],
      challenges: [String],
      improvements: [String],
      stakeholderFeedback: [
        {
          stakeholder: String,
          feedback: String,
          date: Date,
        },
      ],
    },
    // Sprint Retrospective
    retrospective: {
      conducted: {
        type: Boolean,
        default: false,
      },
      date: Date,
      whatWentWell: [String],
      whatNeedsImprovement: [String],
      actionItems: [
        {
          item: String,
          assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
          status: {
            type: String,
            enum: ['pending', 'in_progress', 'completed'],
            default: 'pending',
          },
        },
      ],
    },
    // Dependencies
    dependencies: {
      blockingIssues: [
        {
          description: String,
          severity: {
            type: String,
            enum: ['critical', 'high', 'medium', 'low'],
          },
          status: {
            type: String,
            enum: ['open', 'in_progress', 'resolved'],
          },
          resolvedDate: Date,
        },
      ],
      externalDependencies: [
        {
          dependency: String,
          expectedDate: Date,
          status: {
            type: String,
            enum: ['pending', 'received', 'delayed'],
          },
        },
      ],
    },
    // Risk Management
    risks: [
      {
        description: String,
        probability: {
          type: String,
          enum: ['low', 'medium', 'high'],
        },
        impact: {
          type: String,
          enum: ['low', 'medium', 'high'],
        },
        mitigation: String,
        status: {
          type: String,
          enum: ['identified', 'monitoring', 'mitigated', 'occurred'],
        },
      },
    ],
    // Notes and Documentation
    notes: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Technical Documentation
    technicalDetails: {
      type: mongoose.Schema.Types.Mixed,
      // Stores comprehensive technical information for the sprint
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
sprintSchema.index({ sprintNumber: 1 });
sprintSchema.index({ status: 1, startDate: 1 });
sprintSchema.index({ startDate: 1, endDate: 1 });

// Virtual for sprint duration in days
sprintSchema.virtual('durationDays').get(function () {
  if (this.startDate && this.endDate) {
    return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
  }
  return 0;
});

// Virtual for days remaining
sprintSchema.virtual('daysRemaining').get(function () {
  if (this.status !== 'active') return 0;
  const now = new Date();
  if (now > this.endDate) return 0;
  return Math.ceil((this.endDate - now) / (1000 * 60 * 60 * 24));
});

// Virtual for sprint progress percentage
sprintSchema.virtual('progressPercentage').get(function () {
  if (this.capacity.totalStoryPoints === 0) return 0;
  return Math.round((this.capacity.actualVelocity / this.capacity.totalStoryPoints) * 100);
});

// Static Methods

// Get active sprint
sprintSchema.statics.getActiveSprint = async function () {
  return this.findOne({ status: 'active' })
    .populate('tasks')
    .populate('team.member', 'firstName lastName email role')
    .populate('createdBy', 'firstName lastName');
};

// Get upcoming sprints
sprintSchema.statics.getUpcomingSprints = async function (limit = 5) {
  return this.find({
    status: 'planning',
    startDate: { $gte: new Date() },
  })
    .sort({ startDate: 1 })
    .limit(limit)
    .populate('createdBy', 'firstName lastName');
};

// Get sprint history
sprintSchema.statics.getSprintHistory = async function (limit = 10) {
  return this.find({ status: 'completed' })
    .sort({ endDate: -1 })
    .limit(limit)
    .select(
      'sprintId sprintNumber name startDate endDate capacity.actualVelocity metrics.completionRate'
    );
};

// Get sprint by number
sprintSchema.statics.getBySprintNumber = async function (number) {
  return this.findOne({ sprintNumber: number })
    .populate('tasks')
    .populate('team.member', 'firstName lastName email role');
};

// Calculate team velocity trend
sprintSchema.statics.getVelocityTrend = async function (count = 6) {
  const sprints = await this.find({ status: 'completed' })
    .sort({ sprintNumber: -1 })
    .limit(count)
    .select('sprintNumber capacity.actualVelocity');

  const velocities = sprints.map((s) => s.capacity.actualVelocity || 0);
  const avg = velocities.reduce((a, b) => a + b, 0) / velocities.length;

  return {
    sprints: sprints.reverse(),
    average: Math.round(avg),
    trend:
      velocities.length >= 2
        ? velocities[0] > velocities[velocities.length - 1]
          ? 'improving'
          : 'declining'
        : 'stable',
  };
};

// Instance Methods

// Update task summary
sprintSchema.methods.updateTaskSummary = async function () {
  const DevelopmentTask = mongoose.model('DevelopmentTask');
  const tasks = await DevelopmentTask.find({ sprint: this._id });

  this.taskSummary.total = tasks.length;
  this.taskSummary.completed = tasks.filter((t) => t.status === 'completed').length;
  this.taskSummary.inProgress = tasks.filter((t) => t.status === 'in_progress').length;
  this.taskSummary.todo = tasks.filter((t) => t.status === 'todo').length;
  this.taskSummary.blocked = tasks.filter((t) => t.isBlocked).length;

  this.capacity.actualVelocity = tasks
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  this.metrics.completionRate =
    this.capacity.totalStoryPoints > 0
      ? Math.round((this.capacity.actualVelocity / this.capacity.totalStoryPoints) * 100)
      : 0;

  return this.save();
};

// Add burndown data point
sprintSchema.methods.addBurndownDataPoint = async function () {
  const DevelopmentTask = mongoose.model('DevelopmentTask');
  const tasks = await DevelopmentTask.find({ sprint: this._id });

  const completedPoints = tasks
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  const remainingPoints = this.capacity.totalStoryPoints - completedPoints;

  const daysPassed = Math.ceil((new Date() - this.startDate) / (1000 * 60 * 60 * 24));
  const idealRemaining =
    this.capacity.totalStoryPoints - (this.capacity.totalStoryPoints / this.duration) * daysPassed;

  this.metrics.burndownData.push({
    date: new Date(),
    remainingPoints,
    completedPoints,
    idealRemaining: Math.max(0, idealRemaining),
  });

  return this.save();
};

// Start sprint
sprintSchema.methods.startSprint = async function () {
  if (this.status !== 'planning') {
    throw new Error('Sprint must be in planning status to start');
  }

  // End any currently active sprint
  await this.constructor.updateMany({ status: 'active' }, { status: 'completed' });

  this.status = 'active';
  this.startDate = new Date();
  this.endDate = new Date(Date.now() + this.duration * 24 * 60 * 60 * 1000);

  // Initialize burndown chart
  await this.addBurndownDataPoint();

  return this.save();
};

// Complete sprint
sprintSchema.methods.completeSprint = async function () {
  if (this.status !== 'active') {
    throw new Error('Only active sprints can be completed');
  }

  this.status = 'completed';
  await this.updateTaskSummary();

  // Add final burndown point
  await this.addBurndownDataPoint();

  return this.save();
};

// Get sprint health status
sprintSchema.methods.getHealthStatus = function () {
  const { daysRemaining } = this;
  const progress = this.progressPercentage;
  const expectedProgress = ((this.duration - daysRemaining) / this.duration) * 100;

  if (progress >= expectedProgress - 10) return 'green'; // On track
  if (progress >= expectedProgress - 25) return 'yellow'; // At risk
  return 'red'; // Behind schedule
};

// Pre-save middleware
sprintSchema.pre('save', function (next) {
  // Auto-generate sprintId if not set
  if (!this.sprintId && this.sprintNumber) {
    this.sprintId = `SPRINT-${String(this.sprintNumber).padStart(3, '0')}`;
  }

  // Calculate total story points from tasks
  if (this.tasks && this.tasks.length > 0 && !this.capacity.totalStoryPoints) {
    // This will be updated when tasks are populated
  }

  next();
});

module.exports = mongoose.model('Sprint', sprintSchema);
