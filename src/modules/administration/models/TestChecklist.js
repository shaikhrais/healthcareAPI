const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
/**
 * Master Test Checklist Schema
 * Defines all tests that need to be performed for verification
 */
const testChecklistSchema = new mongoose.Schema(
  {
    // Test identification
    testId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    testName: {
      type: String,
      required: true,
    },
    testDescription: {
      type: String,
      required: true,
    },

    // Test categorization
    category: {
      type: String,
      enum: [
        'functional', // Feature works as expected
        'ui_ux', // UI/UX verification
        'integration', // Integration between components
        'api', // API endpoint testing
        'security', // Security checks
        'performance', // Performance testing
        'accessibility', // Accessibility compliance
        'data_validation', // Data integrity checks
        'regression', // Regression testing
        'smoke', // Basic functionality
        'e2e', // End-to-end flow
      ],
      required: true,
      index: true,
    },

    module: {
      type: String,
      enum: [
        'authentication',
        'appointments',
        'patients',
        'staff',
        'schedule',
        'payments',
        'insurance',
        'clinical_notes',
        'messaging',
        'notifications',
        'waitlist',
        'treatments',
        'reports',
        'analytics',
        'checkin',
        'tasks',
        'general',
      ],
      required: true,
      index: true,
    },

    // Test details
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
      index: true,
    },

    // Test steps - What needs to be checked
    testSteps: [
      {
        stepNumber: Number,
        description: String,
        expectedResult: String,
      },
    ],

    // Prerequisites
    prerequisites: [
      {
        type: String,
      },
    ],

    // Test data requirements
    testDataRequirements: {
      requiresLogin: {
        type: Boolean,
        default: true,
      },
      requiredRole: {
        type: String,
        enum: ['admin', 'doctor', 'receptionist', 'staff', 'patient', 'any'],
      },
      requiresPatientData: Boolean,
      requiresAppointmentData: Boolean,
      customData: [String],
    },

    // Automation details
    canBeAutomated: {
      type: Boolean,
      default: false,
    },
    automationScript: String, // Path to automation script if exists

    // Assignment preferences
    preferredAssignmentType: {
      type: String,
      enum: ['ai', 'operator', 'both'],
      default: 'operator',
    },

    estimatedTimeMinutes: {
      type: Number,
      default: 5,
    },

    // Related information
    relatedFeature: String,
    relatedTicket: String,
    tags: [String],

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },

    // Versioning
    version: {
      type: String,
      default: '1.0',
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
testChecklistSchema.index({ category: 1, module: 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// testChecklistSchema.index({ priority: 1, isActive: 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// testChecklistSchema.index({ tags: 1 });

// Static methods
testChecklistSchema.statics.getTestsByModule = async function (module, priority = null) {
  const query = { module, isActive: true };
  if (priority) {
    query.priority = priority;
  }
  return this.find(query).sort({ priority: -1, testId: 1 });
};

testChecklistSchema.statics.getTestsByCategory = async function (category) {
  return this.find({ category, isActive: true }).sort({ priority: -1 });
};

testChecklistSchema.statics.getCriticalTests = async function () {
  return this.find({ priority: 'critical', isActive: true }).sort({ module: 1 });
};

testChecklistSchema.statics.getAutomatableTests = async function () {
  return this.find({ canBeAutomated: true, isActive: true }).sort({ module: 1 });
};

module.exports = mongoose.model('TestChecklist', testChecklistSchema);
