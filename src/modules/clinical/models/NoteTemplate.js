const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
const noteTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },
    noteType: {
      type: String,
      enum: [
        'SOAP',
        'progress_note',
        'assessment',
        'treatment_plan',
        'consultation',
        'procedure_note',
        'discharge_summary',
        'follow_up',
        'initial_evaluation',
      ],
      required: true,
      index: true,
    },
    specialty: {
      type: String,
      enum: [
        'general',
        'cardiology',
        'dermatology',
        'orthopedics',
        'pediatrics',
        'psychiatry',
        'physical_therapy',
        'chiropractic',
        'other',
      ],
      default: 'general',
    },
    // Template structure mirrors ClinicalNote
    template: {
      soap: {
        subjective: {
          chiefComplaintTemplate: String,
          historyTemplate: String,
          commonSymptoms: [String],
          durationOptions: [String],
          severityRequired: Boolean,
        },
        objective: {
          vitalSignsRequired: [String], // e.g., ['bloodPressure', 'heartRate']
          physicalExamTemplate: String,
          commonFindings: [String],
        },
        assessment: {
          commonDiagnoses: [
            {
              code: String,
              description: String,
            },
          ],
          assessmentTemplate: String,
        },
        plan: {
          treatmentTemplate: String,
          commonMedications: [
            {
              name: String,
              defaultDosage: String,
              defaultFrequency: String,
              instructions: String,
            },
          ],
          commonProcedures: [
            {
              code: String,
              description: String,
            },
          ],
          followUpDefaults: {
            timeframe: String,
            instructions: String,
          },
          educationPoints: [String],
        },
      },
      freeTextTemplate: String,
      sections: [
        {
          heading: String,
          placeholder: String,
          required: Boolean,
          order: Number,
        },
      ],
    },
    // Macros/Quick text
    macros: [
      {
        trigger: String,
        expansion: String,
        description: String,
      },
    ],
    // Conditional logic
    conditionalFields: [
      {
        condition: String, // e.g., "if chiefComplaint contains 'pain'"
        showFields: [String],
        hideFields: [String],
      },
    ],
    // Default values
    defaults: mongoose.Schema.Types.Mixed,
    // Usage tracking
    usageCount: {
      type: Number,
      default: 0,
    },
    lastUsed: Date,
    // Template metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    tags: [String],
    category: {
      type: String,
      enum: ['clinical', 'administrative', 'billing', 'other'],
      default: 'clinical',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'archived'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
noteTemplateSchema.index({ specialty: 1, noteType: 1, status: 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// noteTemplateSchema.index({ createdBy: 1, status: 1 });
noteTemplateSchema.index({ isPublic: 1, status: 1 });

// Get templates by specialty
noteTemplateSchema.statics.getBySpecialty = async function (specialty, noteType = null) {
  const query = { specialty, status: 'active' };
  if (noteType) query.noteType = noteType;

  return this.find(query).sort({ usageCount: -1, name: 1 });
};

// Get public templates
noteTemplateSchema.statics.getPublicTemplates = async function (noteType = null) {
  const query = { isPublic: true, status: 'active' };
  if (noteType) query.noteType = noteType;

  return this.find(query).sort({ usageCount: -1, name: 1 });
};

// Get user's templates
noteTemplateSchema.statics.getUserTemplates = async function (userId) {
  return this.find({ createdBy: userId, status: 'active' }).sort({ lastUsed: -1, name: 1 });
};

// Get most used templates
noteTemplateSchema.statics.getMostUsed = async function (limit = 10) {
  return this.find({ status: 'active' }).sort({ usageCount: -1 }).limit(limit);
};

// Track template usage
noteTemplateSchema.methods.trackUsage = async function () {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

// Clone template
noteTemplateSchema.methods.clone = async function (userId, newName) {
  const cloned = new this.constructor({
    ...this.toObject(),
    _id: undefined,
    name: newName || `${this.name} (Copy)`,
    createdBy: userId,
    isPublic: false,
    isSystem: false,
    usageCount: 0,
    lastUsed: undefined,
    createdAt: undefined,
    updatedAt: undefined,
  });

  return cloned.save();
};

module.exports = mongoose.model('NoteTemplate', noteTemplateSchema);
