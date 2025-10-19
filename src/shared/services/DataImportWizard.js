const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
const dataImportWizardSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    // Import Jobs
    importJobs: [
      {
        jobId: {
          type: String,
          required: true,
          unique: true,
        },
        name: {
          type: String,
          required: true,
        },
        description: String,
        sourceType: {
          type: String,
          enum: ['csv', 'excel', 'xlsx', 'xls', 'json', 'xml', 'tsv'],
          required: true,
        },
        targetEntity: {
          type: String,
          enum: [
            'patients',
            'appointments',
            'treatments',
            'staff',
            'inventory',
            'invoices',
            'custom',
          ],
          required: true,
        },
        fileName: String,
        fileSize: Number, // in bytes
        fileUrl: String,
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },

        // File Analysis
        analysis: {
          totalRows: Number,
          totalColumns: Number,
          detectedHeaders: [String],
          sampleRows: [
            {
              type: mongoose.Schema.Types.Mixed,
            },
          ],
          encoding: String,
          delimiter: String, // For CSV
          sheetNames: [String], // For Excel
          selectedSheet: String,
          dataTypes: {
            type: Map,
            of: String, // column name -> detected type
          },
        },

        // Column Mapping
        mapping: [
          {
            sourceColumn: {
              type: String,
              required: true,
            },
            targetField: {
              type: String,
              required: true,
            },
            transformation: {
              type: String,
              enum: [
                'none',
                'uppercase',
                'lowercase',
                'trim',
                'date_format',
                'number_format',
                'phone_format',
                'email_normalize',
                'custom',
              ],
            },
            customTransformation: String, // JavaScript expression
            defaultValue: mongoose.Schema.Types.Mixed,
            required: {
              type: Boolean,
              default: false,
            },
            validation: {
              type: {
                type: String,
                enum: ['string', 'number', 'email', 'phone', 'date', 'boolean', 'url', 'regex'],
              },
              pattern: String, // For regex validation
              min: Number,
              max: Number,
              options: [String], // For enum validation
            },
          },
        ],

        // Import Options
        options: {
          mode: {
            type: String,
            enum: ['insert', 'update', 'upsert', 'skip_duplicates'],
            default: 'insert',
          },
          batchSize: {
            type: Number,
            default: 100,
          },
          skipFirstRow: {
            type: Boolean,
            default: true,
          },
          trimWhitespace: {
            type: Boolean,
            default: true,
          },
          handleEmptyValues: {
            type: String,
            enum: ['null', 'empty_string', 'skip', 'default'],
            default: 'null',
          },
          duplicateKeyFields: [String], // Fields to check for duplicates
          stopOnError: {
            type: Boolean,
            default: false,
          },
          validateBeforeImport: {
            type: Boolean,
            default: true,
          },
          sendNotificationOnComplete: {
            type: Boolean,
            default: true,
          },
        },

        // Validation Results
        validation: {
          isValid: Boolean,
          validatedAt: Date,
          totalRecords: Number,
          validRecords: Number,
          invalidRecords: Number,
          errors: [
            {
              row: Number,
              column: String,
              value: mongoose.Schema.Types.Mixed,
              error: String,
              severity: {
                type: String,
                enum: ['error', 'warning', 'info'],
              },
            },
          ],
          warnings: [
            {
              row: Number,
              column: String,
              message: String,
            },
          ],
          summary: {
            missingRequiredFields: Number,
            invalidDataTypes: Number,
            duplicateRecords: Number,
            outOfRangeValues: Number,
          },
        },

        // Import Progress
        progress: {
          status: {
            type: String,
            enum: [
              'pending',
              'validating',
              'validated',
              'importing',
              'completed',
              'failed',
              'cancelled',
            ],
            default: 'pending',
          },
          totalRecords: Number,
          processedRecords: Number,
          successfulRecords: Number,
          failedRecords: Number,
          skippedRecords: Number,
          currentBatch: Number,
          totalBatches: Number,
          percentage: {
            type: Number,
            default: 0,
          },
          startedAt: Date,
          completedAt: Date,
          estimatedTimeRemaining: Number, // in seconds
          processingSpeed: Number, // records per second
        },

        // Import Results
        results: {
          insertedIds: [mongoose.Schema.Types.Mixed],
          updatedIds: [mongoose.Schema.Types.Mixed],
          failedRecords: [
            {
              row: Number,
              data: mongoose.Schema.Types.Mixed,
              error: String,
            },
          ],
          duplicatesFound: [
            {
              row: Number,
              existingId: mongoose.Schema.Types.Mixed,
              data: mongoose.Schema.Types.Mixed,
            },
          ],
          summary: {
            totalProcessed: Number,
            successful: Number,
            failed: Number,
            duplicates: Number,
            executionTime: Number, // in milliseconds
          },
        },

        // Error Handling
        errors: [
          {
            timestamp: {
              type: Date,
              default: Date.now,
            },
            phase: {
              type: String,
              enum: ['upload', 'analysis', 'validation', 'import'],
            },
            message: String,
            stack: String,
            recordNumber: Number,
          },
        ],

        // Rollback Information
        rollback: {
          enabled: {
            type: Boolean,
            default: true,
          },
          snapshotId: String,
          canRollback: Boolean,
          rolledBackAt: Date,
          rolledBackBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
        },

        createdAt: {
          type: Date,
          default: Date.now,
        },
        updatedAt: Date,
      },
    ],

    // Import Templates
    templates: [
      {
        templateId: {
          type: String,
          required: true,
          unique: true,
        },
        name: {
          type: String,
          required: true,
        },
        description: String,
        targetEntity: {
          type: String,
          required: true,
        },
        mapping: [
          {
            sourceColumn: String,
            targetField: String,
            transformation: String,
            validation: mongoose.Schema.Types.Mixed,
          },
        ],
        options: mongoose.Schema.Types.Mixed,
        isDefault: {
          type: Boolean,
          default: false,
        },
        usageCount: {
          type: Number,
          default: 0,
        },
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Import History
    history: [
      {
        historyId: String,
        jobId: String,
        action: {
          type: String,
          enum: ['created', 'validated', 'imported', 'cancelled', 'rolled_back', 'deleted'],
        },
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        targetEntity: String,
        recordsProcessed: Number,
        status: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Field Mappings (Global)
    fieldMappings: {
      patients: {
        type: Map,
        of: {
          label: String,
          type: String,
          required: Boolean,
          example: String,
        },
      },
      appointments: {
        type: Map,
        of: {
          label: String,
          type: String,
          required: Boolean,
          example: String,
        },
      },
      treatments: {
        type: Map,
        of: {
          label: String,
          type: String,
          required: Boolean,
          example: String,
        },
      },
      staff: {
        type: Map,
        of: {
          label: String,
          type: String,
          required: Boolean,
          example: String,
        },
      },
      inventory: {
        type: Map,
        of: {
          label: String,
          type: String,
          required: Boolean,
          example: String,
        },
      },
    },

    // Import Settings
    settings: {
      maxFileSize: {
        type: Number,
        default: 10485760, // 10MB
      },
      maxRows: {
        type: Number,
        default: 50000,
      },
      allowedFileTypes: [
        {
          type: String,
          default: ['csv', 'xlsx', 'xls'],
        },
      ],
      defaultBatchSize: {
        type: Number,
        default: 100,
      },
      retentionDays: {
        type: Number,
        default: 30, // How long to keep import data
      },
      enableRollback: {
        type: Boolean,
        default: true,
      },
      autoValidate: {
        type: Boolean,
        default: true,
      },
      notifyOnCompletion: {
        type: Boolean,
        default: true,
      },
      notifyOnErrors: {
        type: Boolean,
        default: true,
      },
    },

    // Analytics
    analytics: {
      totalImports: {
        type: Number,
        default: 0,
      },
      successfulImports: {
        type: Number,
        default: 0,
      },
      failedImports: {
        type: Number,
        default: 0,
      },
      totalRecordsImported: {
        type: Number,
        default: 0,
      },
      averageImportTime: Number, // in seconds
      popularEntities: [
        {
          entity: String,
          count: Number,
        },
      ],
      lastImportAt: Date,
    },

    // Audit Trail
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: Date,
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
// DUPLICATE INDEX - Auto-commented by deduplication tool
// dataImportWizardSchema.index({ organization: 1, isDeleted: 1 });
dataImportWizardSchema.index({ 'importJobs.jobId': 1 });
dataImportWizardSchema.index({ 'importJobs.status': 1 });
dataImportWizardSchema.index({ 'importJobs.uploadedBy': 1 });
dataImportWizardSchema.index({ 'templates.templateId': 1 });

// Virtual: Active Jobs
dataImportWizardSchema.virtual('activeJobs').get(function () {
  return this.importJobs.filter((j) =>
    ['pending', 'validating', 'importing'].includes(j.progress.status)
  );
});

// Virtual: Completed Jobs
dataImportWizardSchema.virtual('completedJobs').get(function () {
  return this.importJobs.filter((j) => j.progress.status === 'completed');
});

// Virtual: Success Rate
dataImportWizardSchema.virtual('successRate').get(function () {
  if (this.analytics.totalImports === 0) return 100;
  return ((this.analytics.successfulImports / this.analytics.totalImports) * 100).toFixed(2);
});

// Static Methods

// Get by Organization
dataImportWizardSchema.statics.getByOrganization = async function (organizationId) {
  return this.findOne({
    organization: organizationId,
    isDeleted: false,
  });
};

// Get Job by ID
dataImportWizardSchema.statics.getJob = async function (organizationId, jobId) {
  const wizard = await this.findOne({ organization: organizationId, isDeleted: false });
  if (!wizard) return null;
  return wizard.importJobs.find((j) => j.jobId === jobId);
};

// Get Jobs by Status
dataImportWizardSchema.statics.getJobsByStatus = async function (organizationId, status) {
  const wizard = await this.findOne({ organization: organizationId, isDeleted: false });
  if (!wizard) return [];
  return wizard.importJobs.filter((j) => j.progress.status === status);
};

// Instance Methods

// Create Import Job
dataImportWizardSchema.methods.createImportJob = async function (jobData) {
  const jobId = jobData.jobId || `JOB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  this.importJobs.push({
    ...jobData,
    jobId,
    progress: {
      status: 'pending',
      totalRecords: 0,
      processedRecords: 0,
      successfulRecords: 0,
      failedRecords: 0,
      percentage: 0,
    },
  });

  this.analytics.totalImports += 1;

  // Add to history
  this.history.push({
    historyId: `HIST-${Date.now()}`,
    jobId,
    action: 'created',
    userId: jobData.uploadedBy,
    targetEntity: jobData.targetEntity,
    status: 'pending',
  });

  return this.save();
};

// Update Job Analysis
dataImportWizardSchema.methods.updateJobAnalysis = async function (jobId, analysisData) {
  const job = this.importJobs.find((j) => j.jobId === jobId);
  if (!job) {
    throw new Error('Job not found');
  }

  job.analysis = {
    ...job.analysis,
    ...analysisData,
  };

  job.updatedAt = new Date();
  return this.save();
};

// Update Job Mapping
dataImportWizardSchema.methods.updateJobMapping = async function (jobId, mapping) {
  const job = this.importJobs.find((j) => j.jobId === jobId);
  if (!job) {
    throw new Error('Job not found');
  }

  job.mapping = mapping;
  job.updatedAt = new Date();
  return this.save();
};

// Validate Job
dataImportWizardSchema.methods.validateJob = async function (jobId, validationResults) {
  const job = this.importJobs.find((j) => j.jobId === jobId);
  if (!job) {
    throw new Error('Job not found');
  }

  job.validation = {
    ...validationResults,
    validatedAt: new Date(),
  };

  job.progress.status = job.validation.isValid ? 'validated' : 'failed';

  // Add to history
  this.history.push({
    historyId: `HIST-${Date.now()}`,
    jobId,
    action: 'validated',
    targetEntity: job.targetEntity,
    status: job.progress.status,
  });

  return this.save();
};

// Start Import
dataImportWizardSchema.methods.startImport = async function (jobId) {
  const job = this.importJobs.find((j) => j.jobId === jobId);
  if (!job) {
    throw new Error('Job not found');
  }

  if (job.progress.status !== 'validated') {
    throw new Error('Job must be validated before importing');
  }

  job.progress.status = 'importing';
  job.progress.startedAt = new Date();

  return this.save();
};

// Update Import Progress
dataImportWizardSchema.methods.updateImportProgress = async function (jobId, progressData) {
  const job = this.importJobs.find((j) => j.jobId === jobId);
  if (!job) {
    throw new Error('Job not found');
  }

  Object.assign(job.progress, progressData);

  // Calculate percentage
  if (job.progress.totalRecords > 0) {
    job.progress.percentage = Math.round(
      (job.progress.processedRecords / job.progress.totalRecords) * 100
    );
  }

  // Calculate processing speed
  if (job.progress.startedAt) {
    const elapsedSeconds = (Date.now() - job.progress.startedAt.getTime()) / 1000;
    if (elapsedSeconds > 0) {
      job.progress.processingSpeed = Math.round(job.progress.processedRecords / elapsedSeconds);

      // Estimate time remaining
      const remainingRecords = job.progress.totalRecords - job.progress.processedRecords;
      job.progress.estimatedTimeRemaining = Math.round(
        remainingRecords / job.progress.processingSpeed
      );
    }
  }

  return this.save();
};

// Complete Import
dataImportWizardSchema.methods.completeImport = async function (jobId, results) {
  const job = this.importJobs.find((j) => j.jobId === jobId);
  if (!job) {
    throw new Error('Job not found');
  }

  job.progress.status = 'completed';
  job.progress.completedAt = new Date();
  job.progress.percentage = 100;

  job.results = results;

  // Update analytics
  this.analytics.successfulImports += 1;
  this.analytics.totalRecordsImported += results.summary.successful;
  this.analytics.lastImportAt = new Date();

  if (job.progress.startedAt) {
    const executionTime = (Date.now() - job.progress.startedAt.getTime()) / 1000;
    if (this.analytics.averageImportTime) {
      this.analytics.averageImportTime = (this.analytics.averageImportTime + executionTime) / 2;
    } else {
      this.analytics.averageImportTime = executionTime;
    }
  }

  // Update popular entities
  const entityIndex = this.analytics.popularEntities.findIndex(
    (e) => e.entity === job.targetEntity
  );
  if (entityIndex > -1) {
    this.analytics.popularEntities[entityIndex].count += 1;
  } else {
    this.analytics.popularEntities.push({
      entity: job.targetEntity,
      count: 1,
    });
  }

  // Add to history
  this.history.push({
    historyId: `HIST-${Date.now()}`,
    jobId,
    action: 'imported',
    targetEntity: job.targetEntity,
    recordsProcessed: results.summary.totalProcessed,
    status: 'completed',
  });

  return this.save();
};

// Fail Import
dataImportWizardSchema.methods.failImport = async function (jobId, error) {
  const job = this.importJobs.find((j) => j.jobId === jobId);
  if (!job) {
    throw new Error('Job not found');
  }

  job.progress.status = 'failed';
  job.progress.completedAt = new Date();

  job.errors.push({
    timestamp: new Date(),
    phase: 'import',
    message: error.message || error,
    stack: error.stack,
  });

  this.analytics.failedImports += 1;

  return this.save();
};

// Cancel Import
dataImportWizardSchema.methods.cancelImport = async function (jobId, userId) {
  const job = this.importJobs.find((j) => j.jobId === jobId);
  if (!job) {
    throw new Error('Job not found');
  }

  job.progress.status = 'cancelled';
  job.progress.completedAt = new Date();

  // Add to history
  this.history.push({
    historyId: `HIST-${Date.now()}`,
    jobId,
    action: 'cancelled',
    userId,
    targetEntity: job.targetEntity,
    status: 'cancelled',
  });

  return this.save();
};

// Rollback Import
dataImportWizardSchema.methods.rollbackImport = async function (jobId, userId) {
  const job = this.importJobs.find((j) => j.jobId === jobId);
  if (!job) {
    throw new Error('Job not found');
  }

  if (!job.rollback.enabled || !job.rollback.canRollback) {
    throw new Error('Rollback not available for this job');
  }

  job.rollback.rolledBackAt = new Date();
  job.rollback.rolledBackBy = userId;
  job.rollback.canRollback = false;

  // Add to history
  this.history.push({
    historyId: `HIST-${Date.now()}`,
    jobId,
    action: 'rolled_back',
    userId,
    targetEntity: job.targetEntity,
    status: 'rolled_back',
  });

  return this.save();
};

// Create Template
dataImportWizardSchema.methods.createTemplate = async function (templateData) {
  const templateId = `TPL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  this.templates.push({
    ...templateData,
    templateId,
  });

  return this.save();
};

// Update Template
dataImportWizardSchema.methods.updateTemplate = async function (templateId, updateData) {
  const template = this.templates.find((t) => t.templateId === templateId);
  if (!template) {
    throw new Error('Template not found');
  }

  Object.assign(template, updateData);
  return this.save();
};

// Delete Template
dataImportWizardSchema.methods.deleteTemplate = async function (templateId) {
  const index = this.templates.findIndex((t) => t.templateId === templateId);
  if (index === -1) {
    throw new Error('Template not found');
  }

  this.templates.splice(index, 1);
  return this.save();
};

// Use Template
dataImportWizardSchema.methods.useTemplate = async function (templateId) {
  const template = this.templates.find((t) => t.templateId === templateId);
  if (!template) {
    throw new Error('Template not found');
  }

  template.usageCount += 1;
  return this.save();
};

// Delete Job
dataImportWizardSchema.methods.deleteJob = async function (jobId, userId) {
  const index = this.importJobs.findIndex((j) => j.jobId === jobId);
  if (index === -1) {
    throw new Error('Job not found');
  }

  const job = this.importJobs[index];

  // Add to history before deleting
  this.history.push({
    historyId: `HIST-${Date.now()}`,
    jobId,
    action: 'deleted',
    userId,
    targetEntity: job.targetEntity,
    status: job.progress.status,
  });

  this.importJobs.splice(index, 1);
  return this.save();
};

// Soft Delete
dataImportWizardSchema.methods.softDelete = async function (userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

// Restore
dataImportWizardSchema.methods.restore = async function () {
  this.isDeleted = false;
  this.deletedAt = null;
  this.deletedBy = null;
  return this.save();
};

module.exports = mongoose.model('DataImportWizard', dataImportWizardSchema);
