const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
const clinicalNoteSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      index: true,
    },
    practitionerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
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
    // SOAP Note Structure (Subjective, Objective, Assessment, Plan)
    soap: {
      subjective: {
        chiefComplaint: String,
        historyOfPresentIllness: String,
        symptoms: [String],
        patientStatement: String,
        duration: String,
        severity: {
          type: String,
          enum: ['mild', 'moderate', 'severe'],
        },
      },
      objective: {
        vitalSigns: {
          bloodPressure: String,
          heartRate: Number,
          temperature: Number,
          respiratoryRate: Number,
          oxygenSaturation: Number,
          weight: Number,
          height: Number,
          bmi: Number,
        },
        physicalExam: String,
        diagnosticResults: [String],
        observations: String,
      },
      assessment: {
        diagnosisCodes: [
          {
            code: String, // ICD-10
            description: String,
            type: {
              type: String,
              enum: ['primary', 'secondary', 'differential'],
            },
          },
        ],
        clinicalImpression: String,
        prognosis: String,
        riskFactors: [String],
      },
      plan: {
        treatmentPlan: String,
        medications: [
          {
            name: String,
            dosage: String,
            frequency: String,
            duration: String,
            instructions: String,
          },
        ],
        procedures: [
          {
            code: String, // CPT code
            description: String,
            scheduledDate: Date,
          },
        ],
        referrals: [
          {
            specialty: String,
            practitioner: String,
            reason: String,
            urgency: String,
          },
        ],
        followUp: {
          required: Boolean,
          timeframe: String,
          instructions: String,
        },
        patientEducation: String,
        restrictions: [String],
      },
    },
    // Alternative structured format for other note types
    freeText: {
      content: String,
      sections: [
        {
          heading: String,
          content: String,
          order: Number,
        },
      ],
    },
    // Additional clinical data
    reviewOfSystems: {
      constitutional: String,
      cardiovascular: String,
      respiratory: String,
      gastrointestinal: String,
      genitourinary: String,
      musculoskeletal: String,
      neurological: String,
      psychiatric: String,
      endocrine: String,
      hematologic: String,
      allergicImmunologic: String,
    },
    // Attachments
    attachments: [
      {
        type: {
          type: String,
          enum: ['image', 'lab_result', 'xray', 'document', 'other'],
        },
        url: String,
        filename: String,
        description: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Note metadata
    status: {
      type: String,
      enum: ['draft', 'completed', 'signed', 'amended', 'deleted'],
      default: 'draft',
      index: true,
    },
    signedAt: Date,
    signedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    electronicSignature: String,
    // Amendments and addendums
    amendments: [
      {
        amendedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        amendedAt: Date,
        reason: String,
        previousContent: mongoose.Schema.Types.Mixed,
        newContent: mongoose.Schema.Types.Mixed,
      },
    ],
    addendums: [
      {
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        addedAt: Date,
        content: String,
      },
    ],
    // Templates
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NoteTemplate',
    },
    // Privacy and compliance
    confidential: {
      type: Boolean,
      default: false,
    },
    sensitiveInfo: {
      type: Boolean,
      default: false,
    },
    tags: [String],
    // Collaboration
    sharedWith: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        sharedAt: Date,
        permissions: {
          type: String,
          enum: ['view', 'edit'],
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
clinicalNoteSchema.index({ patientId: 1, createdAt: -1 });
clinicalNoteSchema.index({ practitionerId: 1, createdAt: -1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// clinicalNoteSchema.index({ status: 1, createdAt: -1 });
clinicalNoteSchema.index({ 'soap.assessment.diagnosisCodes.code': 1 });

// Auto-calculate BMI if height and weight are provided
clinicalNoteSchema.pre('save', function (next) {
  if (this.soap?.objective?.vitalSigns?.weight && this.soap?.objective?.vitalSigns?.height) {
    const weightKg = this.soap.objective.vitalSigns.weight;
    const heightM = this.soap.objective.vitalSigns.height / 100; // convert cm to m
    this.soap.objective.vitalSigns.bmi = Number((weightKg / (heightM * heightM)).toFixed(1));
  }
  next();
});

// Get patient's clinical history
clinicalNoteSchema.statics.getPatientHistory = async function (patientId, limit = 50) {
  return this.find({ patientId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('practitionerId', 'firstName lastName specialty')
    .populate('appointmentId', 'date time');
};

// Get notes by practitioner
clinicalNoteSchema.statics.getPractitionerNotes = async function (practitionerId, options = {}) {
  const { limit = 50, status, noteType } = options;

  const query = { practitionerId };
  if (status) query.status = status;
  if (noteType) query.noteType = noteType;

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('patientId', 'firstName lastName dateOfBirth')
    .populate('appointmentId', 'date time');
};

// Get unsigned notes (needs review/signature)
clinicalNoteSchema.statics.getUnsignedNotes = async function (practitionerId) {
  return this.find({
    practitionerId,
    status: { $in: ['draft', 'completed'] },
  })
    .sort({ createdAt: -1 })
    .populate('patientId', 'firstName lastName')
    .populate('appointmentId', 'date time');
};

// Search notes by diagnosis code
clinicalNoteSchema.statics.searchByDiagnosis = async function (diagnosisCode) {
  return this.find({
    'soap.assessment.diagnosisCodes.code': diagnosisCode,
    status: 'signed',
  })
    .populate('patientId', 'firstName lastName')
    .populate('practitionerId', 'firstName lastName');
};

// Get notes requiring follow-up
clinicalNoteSchema.statics.getRequiringFollowUp = async function () {
  return this.find({
    'soap.plan.followUp.required': true,
    status: 'signed',
  })
    .populate('patientId', 'firstName lastName')
    .populate('practitionerId', 'firstName lastName')
    .sort({ createdAt: -1 });
};

// Sign note
clinicalNoteSchema.methods.signNote = async function (userId, signature) {
  this.status = 'signed';
  this.signedAt = new Date();
  this.signedBy = userId;
  this.electronicSignature = signature;
  return this.save();
};

// Amend note
clinicalNoteSchema.methods.amendNote = async function (userId, reason, updates) {
  const previousContent = this.toObject();

  this.amendments.push({
    amendedBy: userId,
    amendedAt: new Date(),
    reason,
    previousContent,
    newContent: updates,
  });

  // Apply updates
  Object.assign(this, updates);
  this.status = 'amended';

  return this.save();
};

// Add addendum
clinicalNoteSchema.methods.addAddendum = async function (userId, content) {
  this.addendums.push({
    addedBy: userId,
    addedAt: new Date(),
    content,
  });
  return this.save();
};

module.exports = mongoose.model('ClinicalNote', clinicalNoteSchema);
