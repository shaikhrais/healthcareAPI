const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
/**
 * Team Member Model
 * Individual team member details, assignment, and performance
 */
const teamMemberSchema = new mongoose.Schema(
  {
    // Member Identification
    employeeId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Link to User
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Role Assignment
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TeamRole',
      required: true,
      index: true,
    },
    department: {
      type: String,
      enum: [
        'executive',
        'engineering',
        'product',
        'design',
        'qa',
        'devops',
        'data',
        'security',
        'operations',
        'sales',
        'marketing',
        'hr',
        'finance',
      ],
      required: true,
    },

    // Employment Details
    employment: {
      type: {
        type: String,
        enum: ['full-time', 'part-time', 'contract', 'consultant', 'intern'],
        required: true,
      },
      startDate: {
        type: Date,
        required: true,
      },
      endDate: Date,
      status: {
        type: String,
        enum: ['active', 'on-leave', 'notice-period', 'terminated', 'resigned'],
        default: 'active',
        index: true,
      },
      location: {
        type: String,
        enum: ['on-site', 'remote', 'hybrid'],
      },
    },

    // Compensation
    compensation: {
      baseSalary: {
        type: Number,
        required: true,
      },
      currency: {
        type: String,
        default: 'USD',
      },
      equity: {
        percentage: Number,
        vestingSchedule: String,
      },
      bonuses: [
        {
          type: String,
          amount: Number,
          date: Date,
          reason: String,
        },
      ],
      raises: [
        {
          previousSalary: Number,
          newSalary: Number,
          percentage: Number,
          effectiveDate: Date,
          reason: String,
        },
      ],
    },

    // Reporting Structure
    reportsTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TeamMember',
    },
    directReports: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TeamMember',
      },
    ],

    // Skills & Expertise
    skills: [
      {
        skillName: String,
        level: {
          type: String,
          enum: ['beginner', 'intermediate', 'advanced', 'expert'],
        },
        yearsOfExperience: Number,
        lastAssessed: Date,
      },
    ],
    certifications: [
      {
        name: String,
        issuedBy: String,
        issuedDate: Date,
        expiryDate: Date,
        credentialId: String,
      },
    ],

    // Work Allocation
    allocation: {
      currentProjects: [
        {
          project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project',
          },
          percentage: Number, // % of time
          role: String,
          startDate: Date,
          endDate: Date,
        },
      ],
      availability: {
        type: Number, // % available
        min: 0,
        max: 100,
        default: 100,
      },
      workload: {
        type: String,
        enum: ['under-utilized', 'optimal', 'over-loaded', 'burnout-risk'],
        default: 'optimal',
      },
    },

    // Performance
    performance: {
      currentRating: {
        type: Number,
        min: 1,
        max: 5,
      },
      reviews: [
        {
          reviewDate: Date,
          reviewer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TeamMember',
          },
          rating: Number,
          strengths: [String],
          areasForImprovement: [String],
          goals: [String],
          comments: String,
        },
      ],
      kpiScores: [
        {
          kpiName: String,
          target: Number,
          actual: Number,
          period: String,
          date: Date,
        },
      ],
      achievements: [
        {
          title: String,
          description: String,
          date: Date,
          impact: String,
        },
      ],
    },

    // Goals & Development
    goals: [
      {
        goal: String,
        category: {
          type: String,
          enum: ['skill-development', 'project-delivery', 'leadership', 'innovation', 'other'],
        },
        targetDate: Date,
        status: {
          type: String,
          enum: ['not-started', 'in-progress', 'completed', 'cancelled'],
        },
        progress: Number, // 0-100
        notes: String,
      },
    ],

    training: [
      {
        courseName: String,
        provider: String,
        startDate: Date,
        completionDate: Date,
        status: {
          type: String,
          enum: ['planned', 'in-progress', 'completed', 'cancelled'],
        },
        cost: Number,
      },
    ],

    // Attendance & Time
    attendance: {
      totalDays: {
        type: Number,
        default: 0,
      },
      presentDays: {
        type: Number,
        default: 0,
      },
      leaveTaken: {
        type: Number,
        default: 0,
      },
      leaveBalance: {
        type: Number,
        default: 20, // Standard 20 days
      },
    },

    leaves: [
      {
        type: {
          type: String,
          enum: ['vacation', 'sick', 'personal', 'parental', 'unpaid'],
        },
        startDate: Date,
        endDate: Date,
        days: Number,
        status: {
          type: String,
          enum: ['pending', 'approved', 'rejected', 'cancelled'],
        },
        reason: String,
        approvedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'TeamMember',
        },
      },
    ],

    // Dashboard Customization
    dashboardPreferences: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'light',
      },
      widgets: [
        {
          widgetId: String,
          position: Number,
          size: String,
          visible: Boolean,
        },
      ],
      defaultView: String,
      notifications: {
        email: Boolean,
        push: Boolean,
        inApp: Boolean,
      },
    },

    // Notes & Comments
    notes: [
      {
        date: Date,
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        note: String,
        category: String,
        isPrivate: Boolean,
      },
    ],

    // Metadata
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
teamMemberSchema.index({ department: 1, 'employment.status': 1 });
teamMemberSchema.index({ role: 1, isActive: 1 });
teamMemberSchema.index({ reportsTo: 1 });

// Virtuals

// Calculate tenure
teamMemberSchema.virtual('tenure').get(function () {
  if (!this.employment.startDate) return 0;
  const endDate = this.employment.endDate || new Date();
  const months = (endDate - this.employment.startDate) / (1000 * 60 * 60 * 24 * 30);
  return Math.floor(months);
});

// Total compensation
teamMemberSchema.virtual('totalCompensation').get(function () {
  const salary = this.compensation.baseSalary;
  const bonusTotal = this.compensation.bonuses.reduce((sum, b) => sum + b.amount, 0);
  return salary + bonusTotal;
});

// Utilization rate
teamMemberSchema.virtual('utilizationRate').get(function () {
  const totalAllocation = this.allocation.currentProjects.reduce((sum, p) => sum + p.percentage, 0);
  return Math.min(totalAllocation, 100);
});

// Static methods

// Get team by department
teamMemberSchema.statics.getByDepartment = async function (department) {
  return this.find({
    department,
    'employment.status': 'active',
    isActive: true,
  })
    .populate('role')
    .populate('user', 'firstName lastName email')
    .populate('reportsTo', 'employeeId')
    .sort({ 'employment.startDate': 1 });
};

// Get team members by role
teamMemberSchema.statics.getByRole = async function (roleId) {
  return this.find({
    role: roleId,
    'employment.status': 'active',
    isActive: true,
  })
    .populate('user', 'firstName lastName email')
    .sort({ 'employment.startDate': 1 });
};

// Calculate department cost
teamMemberSchema.statics.calculateDepartmentCost = async function (department) {
  const members = await this.find({
    department,
    'employment.status': 'active',
    isActive: true,
  });

  const totalCost = members.reduce((sum, member) => {
    return sum + member.totalCompensation;
  }, 0);

  return {
    department,
    headcount: members.length,
    totalAnnualCost: totalCost,
    averageSalary: members.length > 0 ? totalCost / members.length : 0,
  };
};

// Get overallocated members
teamMemberSchema.statics.getOverallocated = async function () {
  return this.find({
    'employment.status': 'active',
    isActive: true,
    'allocation.workload': { $in: ['over-loaded', 'burnout-risk'] },
  })
    .populate('role')
    .populate('user', 'firstName lastName email');
};

// Get members needing review
teamMemberSchema.statics.getNeedingReview = async function () {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  return this.find({
    'employment.status': 'active',
    isActive: true,
    $or: [
      { 'performance.reviews': { $size: 0 } },
      { 'performance.reviews.0.reviewDate': { $lt: sixMonthsAgo } },
    ],
  })
    .populate('role')
    .populate('user', 'firstName lastName email');
};

// Instance methods

// Add performance review
teamMemberSchema.methods.addPerformanceReview = function (reviewData) {
  this.performance.reviews.unshift(reviewData);
  this.performance.currentRating = reviewData.rating;
  return this.save();
};

// Allocate to project
teamMemberSchema.methods.allocateToProject = function (projectId, percentage, role) {
  const existingAllocation = this.allocation.currentProjects.find(
    (p) => p.project.toString() === projectId.toString()
  );

  if (existingAllocation) {
    existingAllocation.percentage = percentage;
  } else {
    this.allocation.currentProjects.push({
      project: projectId,
      percentage,
      role,
      startDate: new Date(),
    });
  }

  // Update workload status
  const totalAllocation = this.allocation.currentProjects.reduce((sum, p) => sum + p.percentage, 0);

  if (totalAllocation < 70) {
    this.allocation.workload = 'under-utilized';
  } else if (totalAllocation <= 100) {
    this.allocation.workload = 'optimal';
  } else if (totalAllocation <= 120) {
    this.allocation.workload = 'over-loaded';
  } else {
    this.allocation.workload = 'burnout-risk';
  }

  return this.save();
};

// Request leave
teamMemberSchema.methods.requestLeave = function (leaveData) {
  this.leaves.push({
    ...leaveData,
    status: 'pending',
  });
  return this.save();
};

// Approve leave
teamMemberSchema.methods.approveLeave = function (leaveId, approverId) {
  const leave = this.leaves.id(leaveId);
  if (leave) {
    leave.status = 'approved';
    leave.approvedBy = approverId;
    this.attendance.leaveBalance -= leave.days;
    this.attendance.leaveTaken += leave.days;
  }
  return this.save();
};

module.exports = mongoose.model('TeamMember', teamMemberSchema);
