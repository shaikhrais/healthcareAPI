const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
/**
 * Project Stage Model
 * Represents different stages/phases in a project lifecycle
 */
const projectStageSchema = new mongoose.Schema(
  {
    // Stage Identification
    stageName: {
      type: String,
      required: true,
    },
    stageOrder: {
      type: Number,
      required: true,
    },
    stageType: {
      type: String,
      enum: [
        'initiation',
        'planning',
        'design',
        'development',
        'testing',
        'deployment',
        'maintenance',
        'closure',
        'custom',
      ],
      default: 'custom',
    },

    // Project Reference
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },

    // Stage Status
    status: {
      type: String,
      enum: ['not-started', 'in-progress', 'on-hold', 'completed', 'skipped'],
      default: 'not-started',
      index: true,
    },

    // Dates & Timeline
    plannedStartDate: Date,
    plannedEndDate: Date,
    actualStartDate: Date,
    actualEndDate: Date,
    estimatedDuration: {
      type: Number, // in days
      default: 0,
    },

    // Stage Details
    description: String,
    objectives: [String],

    // Deliverables for this stage
    deliverables: [
      {
        name: String,
        description: String,
        status: {
          type: String,
          enum: ['pending', 'in-progress', 'completed', 'cancelled'],
          default: 'pending',
        },
        completedDate: Date,
      },
    ],

    // Stage Metrics
    progress: {
      percentage: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      tasksTotal: {
        type: Number,
        default: 0,
      },
      tasksCompleted: {
        type: Number,
        default: 0,
      },
    },

    // Budget for this stage
    budget: {
      allocated: {
        type: Number,
        default: 0,
      },
      spent: {
        type: Number,
        default: 0,
      },
    },

    // Team assigned to this stage
    assignedTeam: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        role: String,
      },
    ],

    // Stage Gates/Checkpoints
    gateReview: {
      required: {
        type: Boolean,
        default: false,
      },
      completed: {
        type: Boolean,
        default: false,
      },
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      reviewDate: Date,
      reviewNotes: String,
      approved: Boolean,
    },

    // Prerequisites
    prerequisites: [
      {
        description: String,
        completed: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // Dependencies
    dependsOn: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProjectStage',
      },
    ],

    // Stage Milestones
    milestones: [
      {
        name: String,
        description: String,
        targetDate: Date,
        completed: {
          type: Boolean,
          default: false,
        },
        completedDate: Date,
      },
    ],

    // Issues specific to this stage
    issues: [
      {
        description: String,
        severity: {
          type: String,
          enum: ['low', 'medium', 'high', 'critical'],
        },
        status: {
          type: String,
          enum: ['open', 'in-progress', 'resolved'],
        },
        reportedDate: Date,
        resolvedDate: Date,
      },
    ],

    // Documents & Attachments
    documents: [
      {
        name: String,
        type: String,
        url: String,
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        uploadedAt: Date,
      },
    ],

    // Stage Notes
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
      },
    ],

    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
projectStageSchema.index({ project: 1, stageOrder: 1 });
projectStageSchema.index({ project: 1, status: 1 });
projectStageSchema.index({ status: 1, plannedEndDate: 1 });

// Virtuals

// Check if stage is overdue
projectStageSchema.virtual('isOverdue').get(function () {
  if (this.status === 'completed' || !this.plannedEndDate) return false;
  return new Date() > new Date(this.plannedEndDate);
});

// Calculate actual duration
projectStageSchema.virtual('actualDuration').get(function () {
  if (!this.actualStartDate) return 0;
  const endDate = this.actualEndDate || new Date();
  return Math.ceil((endDate - this.actualStartDate) / (1000 * 60 * 60 * 24));
});

// Static methods

// Get stages by project
projectStageSchema.statics.getByProject = async function (projectId) {
  return this.find({ project: projectId })
    .populate('assignedTeam.user', 'firstName lastName')
    .populate('gateReview.reviewedBy', 'firstName lastName')
    .sort({ stageOrder: 1 });
};

// Get current stage for project
projectStageSchema.statics.getCurrentStage = async function (projectId) {
  return this.findOne({
    project: projectId,
    status: 'in-progress',
  }).sort({ stageOrder: 1 });
};

// Get upcoming stages
projectStageSchema.statics.getUpcomingStages = async function (projectId) {
  return this.find({
    project: projectId,
    status: 'not-started',
  }).sort({ stageOrder: 1 });
};

// Get completed stages
projectStageSchema.statics.getCompletedStages = async function (projectId) {
  return this.find({
    project: projectId,
    status: 'completed',
  }).sort({ stageOrder: 1 });
};

// Instance methods

// Start stage
projectStageSchema.methods.startStage = async function (userId) {
  // Check if prerequisites are met
  const unmetPrereqs = this.prerequisites.filter((p) => !p.completed);
  if (unmetPrereqs.length > 0) {
    throw new Error('Cannot start stage: Prerequisites not met');
  }

  // Check if dependent stages are completed
  if (this.dependsOn && this.dependsOn.length > 0) {
    const dependencies = await this.constructor.find({
      _id: { $in: this.dependsOn },
    });

    const incompleteDeps = dependencies.filter((d) => d.status !== 'completed');
    if (incompleteDeps.length > 0) {
      throw new Error('Cannot start stage: Dependent stages not completed');
    }
  }

  this.status = 'in-progress';
  this.actualStartDate = new Date();
  this.lastModifiedBy = userId;

  return this.save();
};

// Complete stage
projectStageSchema.methods.completeStage = async function (userId) {
  // Check if gate review is required and completed
  if (this.gateReview.required && !this.gateReview.approved) {
    throw new Error('Cannot complete stage: Gate review approval required');
  }

  this.status = 'completed';
  this.actualEndDate = new Date();
  this.progress.percentage = 100;
  this.lastModifiedBy = userId;

  return this.save();
};

// Update progress
projectStageSchema.methods.updateProgress = function () {
  if (this.progress.tasksTotal > 0) {
    this.progress.percentage = Math.round(
      (this.progress.tasksCompleted / this.progress.tasksTotal) * 100
    );
  }
  return this.save();
};

// Add milestone
projectStageSchema.methods.addMilestone = function (milestone) {
  this.milestones.push({
    ...milestone,
    completed: false,
  });
  return this.save();
};

// Complete milestone
projectStageSchema.methods.completeMilestone = function (milestoneId) {
  const milestone = this.milestones.id(milestoneId);
  if (milestone) {
    milestone.completed = true;
    milestone.completedDate = new Date();
  }
  return this.save();
};

// Pre-save middleware
projectStageSchema.pre('save', function (next) {
  // Auto-calculate progress if tasks are updated
  if (this.isModified('progress.tasksTotal') || this.isModified('progress.tasksCompleted')) {
    if (this.progress.tasksTotal > 0) {
      this.progress.percentage = Math.round(
        (this.progress.tasksCompleted / this.progress.tasksTotal) * 100
      );
    }
  }

  next();
});

module.exports = mongoose.model('ProjectStage', projectStageSchema);
