const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },
    status: {
      type: String,
      enum: ['todo', 'in-progress', 'completed', 'cancelled'],
      default: 'todo',
      index: true,
    },
    // Execution Status Tracking
    executionStatus: {
      type: String,
      enum: ['pending', 'executing', 'executed', 'failed', 'blocked', 'on-hold'],
      default: 'pending',
      index: true,
    },
    executionDetails: {
      startedAt: Date,
      completedAt: Date,
      executedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      executionNotes: String,
      lastExecutionAttempt: Date,
      executionAttempts: {
        type: Number,
        default: 0,
      },
    },
    // Status Flags
    flags: {
      isBlocked: {
        type: Boolean,
        default: false,
      },
      isUrgent: {
        type: Boolean,
        default: false,
      },
      needsReview: {
        type: Boolean,
        default: false,
      },
      isArchived: {
        type: Boolean,
        default: false,
      },
      hasIssues: {
        type: Boolean,
        default: false,
      },
      isStarred: {
        type: Boolean,
        default: false,
      },
    },
    // Blocking Information
    blockingInfo: {
      isBlocked: {
        type: Boolean,
        default: false,
      },
      blockedBy: [
        {
          taskId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Task',
          },
          reason: String,
        },
      ],
      blockedSince: Date,
      blockingReason: String,
    },
    dueDate: {
      type: Date,
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    relatedTo: {
      type: String,
      enum: ['patient', 'appointment', 'general', 'treatment', 'insurance', 'payment'],
      default: 'general',
    },
    relatedId: mongoose.Schema.Types.ObjectId,
    tags: [String],
    completedAt: Date,
    // Enhanced workflow features
    category: {
      type: String,
      enum: ['clinical', 'administrative', 'billing', 'follow_up', 'reminder', 'other'],
      default: 'other',
      index: true,
    },
    estimatedTime: Number, // in minutes
    actualTime: Number, // in minutes
    dependencies: [
      {
        taskId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Task',
        },
        type: {
          type: String,
          enum: ['blocks', 'depends_on'],
        },
      },
    ],
    recurringTask: {
      isRecurring: {
        type: Boolean,
        default: false,
      },
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'],
      },
      endDate: Date,
      nextOccurrence: Date,
    },
    subtasks: [
      {
        title: String,
        completed: {
          type: Boolean,
          default: false,
        },
        order: Number,
      },
    ],
    attachments: [
      {
        filename: String,
        url: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    comments: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        comment: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    reminderSent: {
      type: Boolean,
      default: false,
    },
    lastReminderAt: Date,
    watchers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // Sprint reference for integration with sprint management
    sprint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sprint',
      index: true,
    },
    sprintNumber: {
      type: Number,
      index: true,
    },
    // Technical Documentation
    technicalDetails: {
      type: mongoose.Schema.Types.Mixed,
      // Stores comprehensive technical information for the task
    },
    // Progress Tracking
    progressTracking: {
      percentComplete: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      milestones: [
        {
          name: String,
          completed: {
            type: Boolean,
            default: false,
          },
          completedAt: Date,
          description: String,
        },
      ],
      checklistItems: [
        {
          item: String,
          checked: {
            type: Boolean,
            default: false,
          },
          checkedAt: Date,
          checkedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
        },
      ],
    },
    // Quality & Testing
    qualityMetrics: {
      codeReviewStatus: {
        type: String,
        enum: ['not-started', 'in-review', 'approved', 'changes-requested'],
        default: 'not-started',
      },
      testingStatus: {
        type: String,
        enum: ['not-started', 'in-progress', 'passed', 'failed'],
        default: 'not-started',
      },
      testCoverage: Number,
      bugsFound: {
        type: Number,
        default: 0,
      },
      bugsFixed: {
        type: Number,
        default: 0,
      },
    },
    // Effort & Time Tracking
    effortTracking: {
      estimatedHours: Number,
      actualHours: Number,
      remainingHours: Number,
      timeEntries: [
        {
          date: Date,
          hours: Number,
          description: String,
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
        },
      ],
    },
    // Additional Metadata
    metadata: {
      taskId: String, // e.g., TASK-18.1
      taskNumber: Number,
      moduleId: String,
      moduleName: String,
      storyPoints: Number,
      acceptanceCriteria: [String],
      definition_of_done: [String],
      labels: [String],
      externalLinks: [
        {
          name: String,
          url: String,
          type: String,
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
taskSchema.index({ assignedTo: 1, status: 1, dueDate: 1 });
taskSchema.index({ category: 1, status: 1 });
taskSchema.index({ 'recurringTask.nextOccurrence': 1, 'recurringTask.isRecurring': 1 });

// Get overdue tasks
taskSchema.statics.getOverdueTasks = async function (userId = null) {
  const query = {
    dueDate: { $lt: new Date() },
    status: { $in: ['todo', 'in-progress'] },
  };

  if (userId) {
    query.assignedTo = userId;
  }

  return this.find(query)
    .populate('assignedTo', 'firstName lastName')
    .populate('createdBy', 'firstName lastName')
    .sort({ dueDate: 1 });
};

// Get tasks due soon (within next 24 hours)
taskSchema.statics.getTasksDueSoon = async function (userId = null, hours = 24) {
  const now = new Date();
  const future = new Date(now.getTime() + hours * 60 * 60 * 1000);

  const query = {
    dueDate: { $gte: now, $lte: future },
    status: { $in: ['todo', 'in-progress'] },
  };

  if (userId) {
    query.assignedTo = userId;
  }

  return this.find(query).populate('assignedTo', 'firstName lastName').sort({ dueDate: 1 });
};

// Get my tasks
taskSchema.statics.getMyTasks = async function (userId, status = null) {
  const query = { assignedTo: userId };

  if (status) {
    query.status = status;
  } else {
    query.status = { $in: ['todo', 'in-progress'] };
  }

  return this.find(query)
    .populate('createdBy', 'firstName lastName')
    .sort({ priority: -1, dueDate: 1 });
};

// Get team tasks
taskSchema.statics.getTeamTasks = async function (status = null) {
  const query = {};

  if (status) {
    query.status = status;
  }

  return this.find(query)
    .populate('assignedTo', 'firstName lastName')
    .populate('createdBy', 'firstName lastName')
    .sort({ priority: -1, dueDate: 1 });
};

// Get tasks by category
taskSchema.statics.getByCategory = async function (category, userId = null) {
  const query = { category, status: { $in: ['todo', 'in-progress'] } };

  if (userId) {
    query.assignedTo = userId;
  }

  return this.find(query).populate('assignedTo', 'firstName lastName').sort({ dueDate: 1 });
};

// Get recurring tasks that need to be created
taskSchema.statics.getRecurringTasksDue = async function () {
  return this.find({
    'recurringTask.isRecurring': true,
    'recurringTask.nextOccurrence': { $lte: new Date() },
    status: { $ne: 'cancelled' },
  });
};

// Calculate completion percentage
taskSchema.methods.getCompletionPercentage = function () {
  if (!this.subtasks || this.subtasks.length === 0) {
    return this.status === 'completed' ? 100 : 0;
  }

  const completed = this.subtasks.filter((st) => st.completed).length;
  return Math.round((completed / this.subtasks.length) * 100);
};

// Check if task is blocked by dependencies
taskSchema.methods.isBlocked = async function () {
  if (!this.dependencies || this.dependencies.length === 0) {
    return false;
  }

  const blockingDeps = this.dependencies.filter((d) => d.type === 'blocks');

  for (const dep of blockingDeps) {
    const task = await this.constructor.findById(dep.taskId);
    if (task && task.status !== 'completed') {
      return true;
    }
  }

  return false;
};

// Method: Start task execution
taskSchema.methods.startExecution = function (userId) {
  this.executionStatus = 'executing';
  this.executionDetails = this.executionDetails || {};
  this.executionDetails.startedAt = new Date();
  this.executionDetails.executedBy = userId;
  this.executionDetails.executionAttempts = (this.executionDetails.executionAttempts || 0) + 1;
  this.executionDetails.lastExecutionAttempt = new Date();
  this.status = 'in-progress';
  return this.save();
};

// Method: Complete task execution
taskSchema.methods.completeExecution = function (notes = '') {
  this.executionStatus = 'executed';
  this.executionDetails = this.executionDetails || {};
  this.executionDetails.completedAt = new Date();
  this.executionDetails.executionNotes = notes;
  this.status = 'completed';
  this.completedAt = new Date();

  // Calculate actual hours if started
  if (this.executionDetails.startedAt) {
    const hours = (Date.now() - this.executionDetails.startedAt.getTime()) / (1000 * 60 * 60);
    this.effortTracking = this.effortTracking || {};
    this.effortTracking.actualHours = Math.round(hours * 100) / 100;
  }

  return this.save();
};

// Method: Fail task execution
taskSchema.methods.failExecution = function (reason) {
  this.executionStatus = 'failed';
  this.executionDetails = this.executionDetails || {};
  this.executionDetails.executionNotes = reason;
  this.flags = this.flags || {};
  this.flags.hasIssues = true;
  return this.save();
};

// Method: Block task
taskSchema.methods.blockTask = function (reason, blockingTaskId = null) {
  this.executionStatus = 'blocked';
  this.flags = this.flags || {};
  this.flags.isBlocked = true;
  this.blockingInfo = this.blockingInfo || {};
  this.blockingInfo.isBlocked = true;
  this.blockingInfo.blockedSince = new Date();
  this.blockingInfo.blockingReason = reason;

  if (blockingTaskId) {
    this.blockingInfo.blockedBy = this.blockingInfo.blockedBy || [];
    this.blockingInfo.blockedBy.push({ taskId: blockingTaskId, reason });
  }

  return this.save();
};

// Method: Unblock task
taskSchema.methods.unblockTask = function () {
  this.executionStatus = 'pending';
  this.flags = this.flags || {};
  this.flags.isBlocked = false;
  this.blockingInfo = this.blockingInfo || {};
  this.blockingInfo.isBlocked = false;
  this.blockingInfo.blockedSince = null;
  this.blockingInfo.blockedBy = [];
  return this.save();
};

// Method: Update progress
taskSchema.methods.updateProgress = function (percentComplete) {
  this.progressTracking = this.progressTracking || {};
  this.progressTracking.percentComplete = Math.min(100, Math.max(0, percentComplete));
  return this.save();
};

// Auto-update completed status when all subtasks are done
taskSchema.pre('save', function (next) {
  if (this.subtasks && this.subtasks.length > 0) {
    const allCompleted = this.subtasks.every((st) => st.completed);
    if (allCompleted && this.status !== 'completed') {
      this.status = 'completed';
      this.completedAt = new Date();
    }
  }

  // Set completion time
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();

    // Calculate actual time if started time was tracked
    if (this.createdAt) {
      this.actualTime = Math.round((Date.now() - this.createdAt.getTime()) / (1000 * 60));
    }
  }

  // Auto-update progress based on checklist
  if (
    this.progressTracking &&
    this.progressTracking.checklistItems &&
    this.progressTracking.checklistItems.length > 0
  ) {
    const checkedCount = this.progressTracking.checklistItems.filter((item) => item.checked).length;
    this.progressTracking.percentComplete = Math.round(
      (checkedCount / this.progressTracking.checklistItems.length) * 100
    );
  }

  next();
});

module.exports = mongoose.model('Task', taskSchema);
