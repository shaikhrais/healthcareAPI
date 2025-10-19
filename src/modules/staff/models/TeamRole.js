const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
/**
 * Team Role Model
 * Defines roles, responsibilities, salaries, and requirements
 */
const teamRoleSchema = new mongoose.Schema(
  {
    // Role Identification
    roleId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    roleName: {
      type: String,
      required: true,
    },
    roleCategory: {
      type: String,
      enum: [
        'executive',
        'management',
        'engineering',
        'design',
        'product',
        'quality-assurance',
        'devops',
        'data',
        'security',
        'support',
        'operations',
        'sales-marketing',
      ],
      required: true,
      index: true,
    },

    // Role Level
    level: {
      type: String,
      enum: ['intern', 'junior', 'mid', 'senior', 'lead', 'principal', 'executive'],
      required: true,
    },

    // Responsibilities
    responsibilities: {
      primary: [String],
      secondary: [String],
      keyDeliverables: [String],
    },

    // Required Skills
    requiredSkills: {
      technical: [
        {
          skill: String,
          level: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced', 'expert'],
          },
          mandatory: Boolean,
        },
      ],
      soft: [String],
      tools: [String],
      certifications: [String],
    },

    // Experience Requirements
    experience: {
      minYears: Number,
      maxYears: Number,
      preferredIndustries: [String],
      mustHaveExperience: [String],
    },

    // Compensation
    compensation: {
      // Salary ranges in USD per year
      salaryRange: {
        min: Number,
        max: Number,
        currency: {
          type: String,
          default: 'USD',
        },
      },
      equity: {
        min: Number, // Percentage
        max: Number,
      },
      benefits: [String],
      bonusStructure: {
        type: String,
        eligible: Boolean,
        targetPercentage: Number,
      },
    },

    // Team Structure
    reportsTo: {
      type: String, // Role ID
      ref: 'TeamRole',
    },
    manages: [
      {
        type: String, // Role IDs
        ref: 'TeamRole',
      },
    ],

    // Work Details
    workType: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'consultant', 'intern'],
      default: 'full-time',
    },
    location: {
      type: String,
      enum: ['on-site', 'remote', 'hybrid'],
      default: 'hybrid',
    },
    timeCommitment: {
      hoursPerWeek: Number,
      overtime: Boolean,
    },

    // Dashboard Configuration
    dashboardAccess: {
      modules: [String], // Which modules they can access
      permissions: {
        view: [String],
        create: [String],
        edit: [String],
        delete: [String],
        approve: [String],
      },
      widgets: [
        {
          widgetName: String,
          widgetType: String,
          priority: Number,
          customizable: Boolean,
        },
      ],
      reports: [String], // Which reports they can access
    },

    // KPIs & Metrics
    kpis: [
      {
        kpiName: String,
        description: String,
        target: mongoose.Schema.Types.Mixed,
        measurement: String,
        frequency: String,
      },
    ],

    // Growth Path
    careerPath: {
      nextRoles: [String], // Role IDs
      requiredForPromotion: [String],
      typicalTimeInRole: Number, // months
    },

    // Headcount
    headcount: {
      current: {
        type: Number,
        default: 0,
      },
      planned: {
        type: Number,
        default: 0,
      },
      needed: {
        type: Number,
        default: 1,
      },
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
    },

    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
teamRoleSchema.index({ roleCategory: 1, level: 1 });
teamRoleSchema.index({ isActive: 1, priority: 1 });

// Virtuals

// Calculate average salary
teamRoleSchema.virtual('averageSalary').get(function () {
  if (!this.compensation.salaryRange) return 0;
  return (this.compensation.salaryRange.min + this.compensation.salaryRange.max) / 2;
});

// Total compensation cost (salary + equity + benefits estimate)
teamRoleSchema.virtual('totalCompensation').get(function () {
  const salary = this.averageSalary;
  const benefitsCost = salary * 0.25; // Estimate 25% for benefits
  const equityValue = this.compensation.equity
    ? ((this.compensation.equity.min + this.compensation.equity.max) / 2) * 10000
    : 0;

  return salary + benefitsCost + equityValue;
});

// Static methods

// Get roles by category
teamRoleSchema.statics.getByCategory = async function (category) {
  return this.find({ roleCategory: category, isActive: true }).sort({ level: -1 });
};

// Get all critical roles
teamRoleSchema.statics.getCriticalRoles = async function () {
  return this.find({ priority: 'critical', isActive: true }).sort({ 'headcount.needed': -1 });
};

// Calculate total team cost
teamRoleSchema.statics.calculateTeamCost = async function (roleIds = null) {
  const query = { isActive: true };
  if (roleIds) {
    query.roleId = { $in: roleIds };
  }

  const roles = await this.find(query);

  let totalCost = 0;
  const breakdown = [];

  roles.forEach((role) => {
    const roleCost = role.totalCompensation * role.headcount.needed;
    totalCost += roleCost;

    breakdown.push({
      role: role.roleName,
      headcount: role.headcount.needed,
      costPerPerson: role.totalCompensation,
      totalCost: roleCost,
    });
  });

  return {
    totalAnnualCost: totalCost,
    breakdown,
    rolesCount: roles.length,
    totalHeadcount: roles.reduce((sum, r) => sum + r.headcount.needed, 0),
  };
};

// Get roles needing hiring
teamRoleSchema.statics.getRolesNeedingHiring = async function () {
  return this.find({
    isActive: true,
    $expr: { $gt: ['$headcount.needed', '$headcount.current'] },
  }).sort({ priority: -1, 'headcount.needed': -1 });
};

// Instance methods

// Check if role needs more people
teamRoleSchema.methods.needsHiring = function () {
  return this.headcount.needed > this.headcount.current;
};

// Get hiring gap
teamRoleSchema.methods.getHiringGap = function () {
  return Math.max(0, this.headcount.needed - this.headcount.current);
};

module.exports = mongoose.model('TeamRole', teamRoleSchema);
