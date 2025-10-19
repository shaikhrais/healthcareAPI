const mongoose = require('mongoose');

/**
 * Claim Attachment Model
 *
 * Manages attachments for insurance claims (medical records, EOBs, etc.)
 */

// eslint-disable-next-line no-unused-vars

const claimAttachmentSchema = new mongoose.Schema(
  {
    // Associated claim
    claim: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Claim',
      required: true,
      index: true,
    },

    claimNumber: {
      type: String,
      index: true,
    },

    // File information
    filename: {
      type: String,
      required: true,
      trim: true,
    },

    originalFilename: {
      type: String,
      required: true,
      trim: true,
    },

    fileSize: {
      type: Number,
      required: true,
      min: 0,
    },

    mimeType: {
      type: String,
      required: true,
      trim: true,
    },

    fileExtension: {
      type: String,
      required: true,
      trim: true,
    },

    // Storage information
    storageType: {
      type: String,
      enum: ['local', 's3', 'azure', 'gcp'],
      default: 'local',
    },

    storagePath: {
      type: String,
      required: true,
      trim: true,
    },

    storageUrl: {
      type: String,
      trim: true,
    },

    // Attachment metadata
    attachmentType: {
      type: String,
      enum: [
        'medical_records',
        'lab_results',
        'radiology_report',
        'operative_report',
        'pathology_report',
        'consultation_report',
        'prescription',
        'authorization',
        'referral',
        'eob',
        'correspondence',
        'billing_statement',
        'patient_consent',
        'insurance_card',
        'photo_id',
        'other',
      ],
      required: true,
      index: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    // PWK (Paperwork) codes for electronic submission
    pwkReportType: {
      type: String,
      trim: true,
      // Examples: '03' = Report Justifying Treatment, '04' = Drugs Administered, etc.
    },

    pwkTransmissionCode: {
      type: String,
      enum: ['AA', 'BM', 'EL', 'EM', 'FT', 'FX'],
      // AA = Available on request at provider site
      // BM = By mail
      // EL = Electronically
      // EM = E-Mail
      // FT = File Transfer
      // FX = By Fax
      default: 'EL',
    },

    // Attachment control number (for electronic submission)
    attachmentControlNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    // Document metadata
    documentDate: {
      type: Date,
    },

    documentType: {
      type: String,
      trim: true,
    },

    pages: {
      type: Number,
      min: 1,
    },

    // Status
    status: {
      type: String,
      enum: ['pending', 'uploaded', 'validated', 'submitted', 'accepted', 'rejected', 'archived'],
      default: 'uploaded',
      index: true,
    },

    // Validation
    validation: {
      validated: {
        type: Boolean,
        default: false,
      },
      validatedAt: {
        type: Date,
      },
      validatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      validationErrors: [
        {
          code: { type: String },
          message: { type: String },
          severity: { type: String, enum: ['error', 'warning', 'info'] },
        },
      ],
      virusScan: {
        scanned: { type: Boolean, default: false },
        clean: { type: Boolean },
        scanDate: { type: Date },
        scanEngine: { type: String },
      },
    },

    // Submission tracking
    submission: {
      submitted: {
        type: Boolean,
        default: false,
      },
      submittedAt: {
        type: Date,
      },
      submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      submissionMethod: {
        type: String,
        enum: ['electronic', 'fax', 'mail', 'portal'],
      },
      trackingNumber: {
        type: String,
        trim: true,
      },
      accepted: {
        type: Boolean,
      },
      acceptedAt: {
        type: Date,
      },
      rejectionReason: {
        type: String,
        trim: true,
      },
    },

    // Access control
    isConfidential: {
      type: Boolean,
      default: false,
    },

    accessRestrictions: [
      {
        type: String,
        enum: ['provider_only', 'billing_only', 'admin_only', 'patient_restricted'],
      },
    ],

    // Encryption
    encrypted: {
      type: Boolean,
      default: false,
    },

    encryptionMethod: {
      type: String,
      trim: true,
    },

    // Retention
    retentionPeriod: {
      type: Number, // days
      default: 2555, // 7 years (HIPAA requirement)
    },

    expirationDate: {
      type: Date,
      index: true,
    },

    archived: {
      type: Boolean,
      default: false,
      index: true,
    },

    archivedAt: {
      type: Date,
    },

    // Audit trail
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    lastAccessedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    lastAccessedAt: {
      type: Date,
    },

    accessLog: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        action: {
          type: String,
          enum: ['view', 'download', 'edit', 'delete'],
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        ipAddress: {
          type: String,
        },
      },
    ],

    // Metadata
    tags: [
      {
        type: String,
        trim: true,
      },
    ],

    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
claimAttachmentSchema.index({ claim: 1, attachmentType: 1 });
claimAttachmentSchema.index({ uploadedBy: 1, createdAt: -1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// claimAttachmentSchema.index({ status: 1, createdAt: -1 });
claimAttachmentSchema.index({ expirationDate: 1 });
claimAttachmentSchema.index({ 'submission.submitted': 1, 'submission.accepted': 1 });

// Pre-save middleware
claimAttachmentSchema.pre('save', function (next) {
  // Generate attachment control number if electronic submission
  if (!this.attachmentControlNumber && this.pwkTransmissionCode === 'EL') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    this.attachmentControlNumber = `ATT-${timestamp}-${random}`.toUpperCase();
  }

  // Set expiration date based on retention period
  if (!this.expirationDate && this.retentionPeriod) {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + this.retentionPeriod);
    this.expirationDate = expirationDate;
  }

  next();
});

// Instance methods

/**
 * Log access
 */
claimAttachmentSchema.methods.logAccess = function (userId, action, ipAddress) {
  this.accessLog.push({
    user: userId,
    action,
    timestamp: new Date(),
    ipAddress,
  });

  this.lastAccessedBy = userId;
  this.lastAccessedAt = new Date();

  // Keep only last 100 access logs
  if (this.accessLog.length > 100) {
    this.accessLog = this.accessLog.slice(-100);
  }
};

/**
 * Mark as validated
 */
claimAttachmentSchema.methods.markAsValidated = function (userId, errors = []) {
  this.validation.validated = true;
  this.validation.validatedAt = new Date();
  this.validation.validatedBy = userId;
  this.validation.validationErrors = errors;

  if (errors.length === 0) {
    this.status = 'validated';
  }
};

/**
 * Mark as submitted
 */
claimAttachmentSchema.methods.markAsSubmitted = function (userId, method, trackingNumber = null) {
  this.submission.submitted = true;
  this.submission.submittedAt = new Date();
  this.submission.submittedBy = userId;
  this.submission.submissionMethod = method;
  if (trackingNumber) {
    this.submission.trackingNumber = trackingNumber;
  }
  this.status = 'submitted';
};

/**
 * Mark as accepted
 */
claimAttachmentSchema.methods.markAsAccepted = function () {
  this.submission.accepted = true;
  this.submission.acceptedAt = new Date();
  this.status = 'accepted';
};

/**
 * Mark as rejected
 */
claimAttachmentSchema.methods.markAsRejected = function (reason) {
  this.submission.accepted = false;
  this.submission.rejectionReason = reason;
  this.status = 'rejected';
};

/**
 * Archive attachment
 */
claimAttachmentSchema.methods.archive = function () {
  this.archived = true;
  this.archivedAt = new Date();
  this.status = 'archived';
};

/**
 * Check if expired
 */
claimAttachmentSchema.methods.isExpired = function () {
  if (!this.expirationDate) return false;
  return new Date() > this.expirationDate;
};

/**
 * Check if user has access
 */
claimAttachmentSchema.methods.hasAccess = function (userRole) {
  if (this.accessRestrictions.length === 0) return true;

  const roleMapping = {
    owner: ['provider_only', 'billing_only', 'admin_only'],
    admin: ['provider_only', 'billing_only', 'admin_only'],
    practitioner: ['provider_only'],
    billing: ['billing_only'],
    patient: [],
  };

  const allowedRestrictions = roleMapping[userRole] || [];

  return this.accessRestrictions.every((restriction) => allowedRestrictions.includes(restriction));
};

/**
 * Get file size in human readable format
 */
claimAttachmentSchema.methods.getFormattedFileSize = function () {
  const bytes = this.fileSize;
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / k ** i) * 100) / 100 + ' ' + sizes[i];
};

// Static methods

/**
 * Get attachments for claim
 */
claimAttachmentSchema.statics.getForClaim = function (claimId) {
  return this.find({ claim: claimId, archived: false }).sort({ createdAt: -1 });
};

/**
 * Get attachments by type
 */
claimAttachmentSchema.statics.getByType = function (claimId, attachmentType) {
  return this.find({
    claim: claimId,
    attachmentType,
    archived: false,
  }).sort({ createdAt: -1 });
};

/**
 * Get pending submissions
 */
claimAttachmentSchema.statics.getPendingSubmissions = function () {
  return this.find({
    status: 'validated',
    'submission.submitted': false,
    archived: false,
  }).populate('claim', 'claimNumber patient.firstName patient.lastName');
};

/**
 * Get expired attachments
 */
claimAttachmentSchema.statics.getExpired = function () {
  return this.find({
    expirationDate: { $lte: new Date() },
    archived: false,
  });
};

/**
 * Get statistics
 */
claimAttachmentSchema.statics.getStatistics = async function (startDate, endDate) {
  const filter = {};
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const [total, byType, byStatus, totalSize, submitted, accepted] = await Promise.all([
    this.countDocuments(filter),
    this.aggregate([
      { $match: filter },
      { $group: { _id: '$attachmentType', count: { $sum: 1 } } },
    ]),
    this.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    this.aggregate([{ $match: filter }, { $group: { _id: null, total: { $sum: '$fileSize' } } }]),
    this.countDocuments({ ...filter, 'submission.submitted': true }),
    this.countDocuments({ ...filter, 'submission.accepted': true }),
  ]);

  return {
    total,
    byType: byType.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    byStatus: byStatus.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    totalSize: totalSize[0]?.total || 0,
    submitted,
    accepted,
    acceptanceRate: submitted > 0 ? ((accepted / submitted) * 100).toFixed(2) : 0,
  };
};

const ClaimAttachment = mongoose.model('ClaimAttachment', claimAttachmentSchema);

module.exports = ClaimAttachment;
