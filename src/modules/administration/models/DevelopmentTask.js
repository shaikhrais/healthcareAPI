const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
/**
 * DevelopmentTask Model
 * Represents individual development tasks from the project plan
 * Links to sprints and tracks detailed implementation progress
 */
const developmentTaskSchema = new mongoose.Schema(
  {
    taskId: {
      type: String,
      required: true,
      unique: true,
      // Format: TASK-{sprintNumber}.{taskNumber}
      // Example: TASK-1.1 = Sprint 1, Task 1
      //          TASK-2.3 = Sprint 2, Task 3
      //          TASK-3.5 = Sprint 3, Task 5
    },
    moduleId: {
      type: String,
      required: true,
      index: true,
      // e.g., "1" for Authentication, "2" for User Management
    },
    moduleName: {
      type: String,
      required: true,
      index: true,
      // e.g., "Authentication & Authorization"
    },
    taskNumber: {
      type: String,
      required: true,
      // e.g., "1.1", "1.2"
    },
    title: {
      type: String,
      required: true,
      // e.g., "User Registration System"
    },
    description: {
      type: String,
      required: true,
    },
    technicalRequirements: [
      {
        requirement: String,
        completed: {
          type: Boolean,
          default: false,
        },
      },
    ],
    // Sprint Assignment
    sprint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sprint',
      index: true,
    },
    sprintNumber: {
      type: Number,
      index: true,
    },
    // Task Details
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'in_review', 'testing', 'completed', 'blocked', 'cancelled'],
      default: 'todo',
      index: true,
    },
    storyPoints: {
      type: Number,
      required: true,
      min: 0,
      max: 21,
      // Fibonacci: 1, 2, 3, 5, 8, 13, 21
    },
    estimatedDuration: {
      days: Number,
      hours: Number,
    },
    actualDuration: {
      days: Number,
      hours: Number,
    },
    // Assignment
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    assignedRole: {
      type: String,
      // e.g., "Senior Backend Engineer", "UI/UX Designer"
    },
    // Subtasks
    subtasks: [
      {
        title: {
          type: String,
          required: true,
        },
        description: String,
        estimatedHours: Number,
        actualHours: Number,
        completed: {
          type: Boolean,
          default: false,
        },
        completedAt: Date,
        assignedTo: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        order: Number,
      },
    ],
    // Test Cases
    testCases: [
      {
        testId: String,
        testName: String,
        input: String,
        expectedOutput: String,
        acceptanceCriteria: [String],
        status: {
          type: String,
          enum: ['pending', 'passed', 'failed', 'skipped'],
          default: 'pending',
        },
        executedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        executedAt: Date,
        notes: String,
      },
    ],
    // Dependencies
    dependencies: [
      {
        taskId: {
          type: String,
          // Reference to another task by taskId
        },
        type: {
          type: String,
          enum: ['blocks', 'blocked_by', 'related_to'],
        },
        description: String,
      },
    ],
    isBlocked: {
      type: Boolean,
      default: false,
      index: true,
    },
    blockedReason: String,
    blockedDate: Date,
    // Files
    filesToCreate: [
      {
        path: String,
        type: {
          type: String,
          enum: [
            'model',
            'route',
            'controller',
            'service',
            'middleware',
            'component',
            'page',
            'test',
            'config',
            'other',
          ],
        },
        status: {
          type: String,
          enum: ['pending', 'created', 'reviewed', 'merged'],
          default: 'pending',
        },
        createdAt: Date,
      },
    ],
    filesToModify: [
      {
        path: String,
        changes: String,
        status: {
          type: String,
          enum: ['pending', 'modified', 'reviewed', 'merged'],
          default: 'pending',
        },
        modifiedAt: Date,
      },
    ],
    // Code Review
    codeReview: {
      required: {
        type: Boolean,
        default: true,
      },
      reviewer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      status: {
        type: String,
        enum: ['pending', 'in_review', 'changes_requested', 'approved', 'not_required'],
        default: 'pending',
      },
      comments: [
        {
          author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
          comment: String,
          severity: {
            type: String,
            enum: ['blocker', 'major', 'minor', 'suggestion'],
          },
          resolved: {
            type: Boolean,
            default: false,
          },
          createdAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      approvedAt: Date,
    },
    // Quality Assurance
    qa: {
      required: {
        type: Boolean,
        default: true,
      },
      tester: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      status: {
        type: String,
        enum: ['pending', 'in_testing', 'failed', 'passed', 'not_required'],
        default: 'pending',
      },
      testResults: [
        {
          testCase: String,
          result: {
            type: String,
            enum: ['passed', 'failed', 'skipped'],
          },
          notes: String,
          testedAt: Date,
        },
      ],
      passedAt: Date,
    },
    // Git Integration
    gitBranch: String,
    pullRequest: {
      url: String,
      number: Number,
      status: {
        type: String,
        enum: ['open', 'merged', 'closed', 'draft'],
      },
      createdAt: Date,
      mergedAt: Date,
    },
    commits: [
      {
        hash: String,
        message: String,
        author: String,
        date: Date,
      },
    ],
    // Progress Tracking
    progress: {
      percentage: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      lastUpdated: Date,
    },
    // Time Tracking
    timeTracking: {
      startedAt: Date,
      completedAt: Date,
      totalHoursSpent: {
        type: Number,
        default: 0,
      },
      timeEntries: [
        {
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
          hours: Number,
          description: String,
          date: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },
    // Documentation
    documentation: {
      required: {
        type: Boolean,
        default: false,
      },
      status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'not_required'],
        default: 'pending',
      },
      links: [
        {
          title: String,
          url: String,
          type: {
            type: String,
            enum: ['api_docs', 'technical_spec', 'user_guide', 'readme', 'other'],
          },
        },
      ],
    },
    // Comments and Notes
    comments: [
      {
        user: {
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
    notes: String,
    // Metadata
    tags: [String],
    labels: [
      {
        name: String,
        color: String,
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Compound Indexes
developmentTaskSchema.index({ moduleId: 1, taskNumber: 1 });
developmentTaskSchema.index({ sprint: 1, status: 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// developmentTaskSchema.index({ assignedTo: 1, status: 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// developmentTaskSchema.index({ priority: 1, status: 1 });
developmentTaskSchema.index({ sprintNumber: 1, status: 1 });

// Virtual: Completion percentage based on subtasks
developmentTaskSchema.virtual('subtaskCompletionPercentage').get(function () {
  if (!this.subtasks || this.subtasks.length === 0) return 0;
  const completed = this.subtasks.filter((st) => st.completed).length;
  return Math.round((completed / this.subtasks.length) * 100);
});

// Virtual: Test case pass rate
developmentTaskSchema.virtual('testPassRate').get(function () {
  if (!this.testCases || this.testCases.length === 0) return 0;
  const passed = this.testCases.filter((tc) => tc.status === 'passed').length;
  return Math.round((passed / this.testCases.length) * 100);
});

// Virtual: Is overdue
developmentTaskSchema.virtual('isOverdue').get(function () {
  if (this.status === 'completed') return false;
  const { sprint } = this;
  if (!sprint || !sprint.endDate) return false;
  return new Date() > sprint.endDate;
});

// Static Methods

// Get tasks by module
developmentTaskSchema.statics.getByModule = async function (moduleId, status = null) {
  const query = { moduleId };
  if (status) query.status = status;

  return this.find(query)
    .populate('assignedTo', 'firstName lastName email role')
    .populate('sprint', 'sprintId sprintNumber name status')
    .sort({ taskNumber: 1 });
};

// Get tasks by sprint
developmentTaskSchema.statics.getBySprint = async function (sprintId, status = null) {
  const query = { sprint: sprintId };
  if (status) query.status = status;

  return this.find(query)
    .populate('assignedTo', 'firstName lastName email role')
    .sort({ moduleId: 1, taskNumber: 1 });
};

// Get tasks assigned to user
developmentTaskSchema.statics.getMyTasks = async function (userId, status = null) {
  const query = { assignedTo: userId };
  if (status) {
    query.status = status;
  } else {
    query.status = { $in: ['todo', 'in_progress', 'in_review'] };
  }

  return this.find(query)
    .populate('sprint', 'sprintId sprintNumber name status startDate endDate')
    .sort({ priority: -1, 'sprint.endDate': 1 });
};

// Get blocked tasks
developmentTaskSchema.statics.getBlockedTasks = async function (sprintId = null) {
  const query = { isBlocked: true, status: { $ne: 'completed' } };
  if (sprintId) query.sprint = sprintId;

  return this.find(query)
    .populate('assignedTo', 'firstName lastName email')
    .populate('sprint', 'sprintId sprintNumber name');
};

// Get tasks ready for review
developmentTaskSchema.statics.getTasksForReview = async function () {
  return this.find({
    status: 'in_review',
    'codeReview.status': { $in: ['pending', 'in_review'] },
  })
    .populate('assignedTo', 'firstName lastName email')
    .populate('codeReview.reviewer', 'firstName lastName email')
    .populate('sprint', 'sprintId name');
};

// Get tasks ready for QA
developmentTaskSchema.statics.getTasksForQA = async function () {
  return this.find({
    status: 'testing',
    'qa.status': { $in: ['pending', 'in_testing'] },
  })
    .populate('assignedTo', 'firstName lastName email')
    .populate('qa.tester', 'firstName lastName email')
    .populate('sprint', 'sprintId name');
};

// Get critical tasks
developmentTaskSchema.statics.getCriticalTasks = async function (sprintId = null) {
  const query = {
    priority: 'critical',
    status: { $in: ['todo', 'in_progress', 'blocked'] },
  };
  if (sprintId) query.sprint = sprintId;

  return this.find(query)
    .populate('assignedTo', 'firstName lastName')
    .populate('sprint', 'sprintId name endDate')
    .sort({ isBlocked: -1 });
};

// Instance Methods

// Update progress based on subtasks
developmentTaskSchema.methods.updateProgress = async function () {
  if (this.subtasks && this.subtasks.length > 0) {
    const completed = this.subtasks.filter((st) => st.completed).length;
    this.progress.percentage = Math.round((completed / this.subtasks.length) * 100);
  } else if (this.status === 'completed') {
    this.progress.percentage = 100;
  }
  this.progress.lastUpdated = new Date();
  return this.save();
};

// Check if task can start (dependencies met)
developmentTaskSchema.methods.canStart = async function () {
  if (this.dependencies.length === 0) return true;

  const blockingDeps = this.dependencies.filter((d) => d.type === 'blocked_by');
  if (blockingDeps.length === 0) return true;

  for (const dep of blockingDeps) {
    const blockingTask = await this.constructor.findOne({ taskId: dep.taskId });
    if (!blockingTask || blockingTask.status !== 'completed') {
      return false;
    }
  }

  return true;
};

// Start task
developmentTaskSchema.methods.startTask = async function (userId) {
  const canStart = await this.canStart();
  if (!canStart) {
    throw new Error('Cannot start task: dependencies not met');
  }

  if (this.isBlocked) {
    throw new Error('Cannot start task: task is blocked');
  }

  this.status = 'in_progress';
  this.timeTracking.startedAt = new Date();
  if (userId) this.assignedTo = userId;

  return this.save();
};

// Complete task
developmentTaskSchema.methods.completeTask = async function () {
  // Check if all subtasks are completed
  if (this.subtasks.length > 0) {
    const allCompleted = this.subtasks.every((st) => st.completed);
    if (!allCompleted) {
      throw new Error('Cannot complete task: not all subtasks are completed');
    }
  }

  // Check if code review is approved
  if (this.codeReview.required && this.codeReview.status !== 'approved') {
    throw new Error('Cannot complete task: code review not approved');
  }

  // Check if QA testing is passed
  if (this.qa.required && this.qa.status !== 'passed') {
    throw new Error('Cannot complete task: QA testing not passed');
  }

  this.status = 'completed';
  this.timeTracking.completedAt = new Date();
  this.progress.percentage = 100;

  return this.save();
};

// Block task
developmentTaskSchema.methods.blockTask = async function (reason) {
  this.isBlocked = true;
  this.blockedReason = reason;
  this.blockedDate = new Date();
  this.status = 'blocked';

  return this.save();
};

// Unblock task
developmentTaskSchema.methods.unblockTask = async function () {
  this.isBlocked = false;
  this.blockedReason = null;
  this.blockedDate = null;
  this.status = 'in_progress';

  return this.save();
};

// Add time entry
developmentTaskSchema.methods.logTime = async function (userId, hours, description) {
  this.timeTracking.timeEntries.push({
    user: userId,
    hours,
    description,
  });

  this.timeTracking.totalHoursSpent += hours;

  return this.save();
};

// Pre-save middleware
developmentTaskSchema.pre('save', async function (next) {
  // Auto-update progress
  if (this.isModified('subtasks')) {
    if (this.subtasks.length > 0) {
      const completed = this.subtasks.filter((st) => st.completed).length;
      this.progress.percentage = Math.round((completed / this.subtasks.length) * 100);
      this.progress.lastUpdated = new Date();
    }
  }

  // Auto-complete if all subtasks done and reviews passed
  if (this.isModified('subtasks') || this.isModified('codeReview') || this.isModified('qa')) {
    const allSubtasksDone = this.subtasks.length === 0 || this.subtasks.every((st) => st.completed);
    const reviewPassed = !this.codeReview.required || this.codeReview.status === 'approved';
    const qaPassed = !this.qa.required || this.qa.status === 'passed';

    if (allSubtasksDone && reviewPassed && qaPassed && this.status === 'in_progress') {
      this.status = 'completed';
      this.timeTracking.completedAt = new Date();
      this.progress.percentage = 100;
    }
  }

  next();
});

module.exports = mongoose.model('DevelopmentTask', developmentTaskSchema);
