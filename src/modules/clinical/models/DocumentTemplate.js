const mongoose = require('mongoose');

/**
 * Document Template Model
 *
 * Manages reusable document templates for e-signatures
 * Features:
 * - Template creation and versioning
 * - Placeholder support
 * - Required signature configuration
 * - Template categories
 */

// eslint-disable-next-line no-unused-vars

const documentTemplateSchema = new mongoose.Schema(
  {
    // Template Information
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    documentType: {
      type: String,
      required: true,
      enum: [
        'consent_form',
        'treatment_plan',
        'privacy_policy',
        'financial_agreement',
        'release_form',
        'hipaa_authorization',
        'insurance_assignment',
        'payment_authorization',
        'other',
      ],
    },

    // Content
    content: {
      type: String, // HTML or plain text with placeholders
      required: true,
    },
    placeholders: [
      {
        key: {
          type: String,
          required: true,
        }, // e.g., "patient_name", "date", "practitioner_name"
        label: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          enum: ['text', 'date', 'number', 'email', 'phone'],
          default: 'text',
        },
        required: {
          type: Boolean,
          default: true,
        },
        defaultValue: String,
      },
    ],

    // Signature Requirements
    requiredSignatures: [
      {
        type: {
          type: String,
          required: true,
          enum: ['patient', 'guardian', 'witness', 'practitioner', 'staff'],
        },
        name: String,
        email: String,
        order: {
          type: Number,
          default: 1,
        }, // Signing order (1, 2, 3...)
      },
    ],

    // Template Settings
    expirationDays: {
      type: Number,
      default: 30,
    }, // Default expiration in days
    allowDecline: {
      type: Boolean,
      default: true,
    },
    requireVerification: {
      type: Boolean,
      default: false,
    },
    verificationMethod: {
      type: String,
      enum: ['email', 'sms', 'none'],
      default: 'none',
    },

    // Versioning
    version: {
      type: Number,
      default: 1,
    },
    previousVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DocumentTemplate',
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    // Usage Statistics
    usageCount: {
      type: Number,
      default: 0,
    },
    lastUsedAt: {
      type: Date,
    },

    // Metadata
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: String,
      enum: ['intake', 'treatment', 'financial', 'legal', 'administrative', 'other'],
      default: 'other',
    },
    tags: [String],
  },
  {
    timestamps: true,
  }
);

// ==================== INDEXES ====================

documentTemplateSchema.index({ organization: 1, isActive: 1 });
documentTemplateSchema.index({ documentType: 1, isActive: 1 });
documentTemplateSchema.index({ category: 1, isActive: 1 });

// ==================== INSTANCE METHODS ====================

/**
 * Create new version of template
 */
documentTemplateSchema.methods.createNewVersion = async function (updates, userId) {
  // Mark current version as inactive
  this.isActive = false;
  await this.save();

  // Create new version
  const newVersion = new this.constructor({
    ...this.toObject(),
    _id: undefined,
    ...updates,
    version: this.version + 1,
    previousVersionId: this._id,
    isActive: true,
    createdBy: userId,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return newVersion.save();
};

/**
 * Increment usage count
 */
documentTemplateSchema.methods.recordUsage = async function () {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  return this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Get active templates for organization
 */
documentTemplateSchema.statics.getActive = async function (organizationId, filters = {}) {
  const query = {
    organization: organizationId,
    isActive: true,
  };

  if (filters.documentType) query.documentType = filters.documentType;
  if (filters.category) query.category = filters.category;

  return this.find(query).sort({ title: 1 });
};

/**
 * Get popular templates
 */
documentTemplateSchema.statics.getPopular = async function (organizationId, limit = 10) {
  return this.find({
    organization: organizationId,
    isActive: true,
  })
    .sort({ usageCount: -1 })
    .limit(limit);
};

module.exports = mongoose.model('DocumentTemplate', documentTemplateSchema);
