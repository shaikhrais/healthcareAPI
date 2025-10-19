const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * E-Signature Model
 *
 * Manages electronic signatures for documents and forms
 * Features:
 * - Multiple document types
 * - Signature capture (canvas, image, typed)
 * - Multi-party signatures
 * - Audit trail
 * - Legal compliance
 * - PDF generation
 */

// eslint-disable-next-line no-unused-vars

const eSignatureSchema = new mongoose.Schema(
  {
    // Document Information
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
    documentTitle: {
      type: String,
      required: true,
    },
    documentContent: {
      type: String, // HTML or plain text content
      required: true,
    },
    documentUrl: {
      type: String, // URL to original document (PDF, etc.)
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DocumentTemplate',
    },

    // Patient/Signer Information
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },

    // Signature Fields (supports multiple signers)
    signatures: [
      {
        signerType: {
          type: String,
          required: true,
          enum: ['patient', 'guardian', 'witness', 'practitioner', 'staff'],
        },
        signerId: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: 'signatures.signerModel',
        },
        signerModel: {
          type: String,
          enum: ['Patient', 'User'],
        },
        signerName: {
          type: String,
          required: true,
        },
        signerEmail: {
          type: String,
        },
        signerPhone: {
          type: String,
        },

        // Signature Data
        signatureType: {
          type: String,
          required: true,
          enum: ['drawn', 'typed', 'image', 'biometric'],
        },
        signatureData: {
          type: String, // Base64 encoded image or text
          required: true,
        },
        signatureDataUrl: {
          type: String, // URL to stored signature image
        },

        // Signature Metadata
        signedAt: {
          type: Date,
          default: Date.now,
        },
        ipAddress: {
          type: String,
        },
        userAgent: {
          type: String,
        },
        deviceInfo: {
          platform: String, // iOS, Android, Web
          deviceModel: String,
          osVersion: String,
          appVersion: String,
        },
        location: {
          latitude: Number,
          longitude: Number,
          accuracy: Number,
        },

        // Biometric Data (if applicable)
        biometricData: {
          touchPressure: [Number], // Array of pressure values
          signatureSpeed: Number, // Average speed in pixels/second
          signatureDuration: Number, // Time taken to sign in milliseconds
          strokeCount: Number,
        },

        // Verification
        verified: {
          type: Boolean,
          default: false,
        },
        verificationMethod: {
          type: String,
          enum: ['email', 'sms', 'in_person', 'video_call', 'none'],
        },
        verificationCode: {
          type: String,
        },
        verifiedAt: {
          type: Date,
        },
      },
    ],

    // Status and Workflow
    status: {
      type: String,
      required: true,
      default: 'pending',
      enum: ['pending', 'partially_signed', 'fully_signed', 'declined', 'expired', 'voided'],
      index: true,
    },
    expiresAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    declinedAt: {
      type: Date,
    },
    declinedReason: {
      type: String,
    },
    voidedAt: {
      type: Date,
    },
    voidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    voidedReason: {
      type: String,
    },

    // Appointment/Visit Context
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
    },
    visitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Visit',
    },

    // Notifications
    notificationsSent: [
      {
        recipientType: String,
        recipientId: mongoose.Schema.Types.ObjectId,
        method: { type: String, enum: ['email', 'sms', 'push'] },
        sentAt: Date,
        status: String,
      },
    ],
    remindersSent: {
      type: Number,
      default: 0,
    },
    lastReminderAt: {
      type: Date,
    },

    // Security and Compliance
    securityHash: {
      type: String, // Hash of document content + signatures for tamper detection
    },
    encryptionKey: {
      type: String, // Encrypted key for additional security
    },

    // Audit Trail
    auditTrail: [
      {
        action: {
          type: String,
          enum: [
            'created',
            'viewed',
            'signed',
            'declined',
            'sent',
            'reminded',
            'voided',
            'downloaded',
          ],
        },
        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: 'auditTrail.performedByModel',
        },
        performedByModel: {
          type: String,
          enum: ['Patient', 'User'],
        },
        performedAt: {
          type: Date,
          default: Date.now,
        },
        ipAddress: String,
        userAgent: String,
        details: mongoose.Schema.Types.Mixed,
      },
    ],

    // Generated Documents
    signedDocumentUrl: {
      type: String, // URL to final signed PDF
    },
    signedDocumentHash: {
      type: String, // Hash of final signed document
    },
    certificateOfCompletion: {
      url: String,
      hash: String,
      generatedAt: Date,
    },

    // Metadata
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tags: [String],
    notes: String,
  },
  {
    timestamps: true,
  }
);

// ==================== INDEXES ====================

// DUPLICATE INDEX - Auto-commented by deduplication tool
// eSignatureSchema.index({ patientId: 1, createdAt: -1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// eSignatureSchema.index({ organization: 1, status: 1 });
eSignatureSchema.index({ appointmentId: 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// eSignatureSchema.index({ status: 1, expiresAt: 1 });
eSignatureSchema.index({ 'signatures.signerId': 1 });

// ==================== VIRTUAL FIELDS ====================

eSignatureSchema.virtual('isExpired').get(function () {
  return this.expiresAt && this.expiresAt < new Date() && this.status === 'pending';
});

eSignatureSchema.virtual('requiredSignatures').get(function () {
  return this.signatures.filter((s) => !s.signedAt).length;
});

eSignatureSchema.virtual('completionPercentage').get(function () {
  if (this.signatures.length === 0) return 0;
  const signed = this.signatures.filter((s) => s.signedAt).length;
  return (signed / this.signatures.length) * 100;
});

// ==================== INSTANCE METHODS ====================

/**
 * Add signature to document
 */
eSignatureSchema.methods.addSignature = async function (signatureData) {
  const {
    signerType,
    signerId,
    signerModel,
    signerName,
    signerEmail,
    signatureType,
    signatureData: sigData,
    ipAddress,
    userAgent,
    deviceInfo,
    location,
    biometricData,
  } = signatureData;

  // Find the signature slot
  const signatureIndex = this.signatures.findIndex(
    (s) => !s.signedAt && s.signerType === signerType
  );

  if (signatureIndex === -1) {
    throw new Error('No pending signature slot found for this signer type');
  }

  // Update signature
  this.signatures[signatureIndex] = {
    ...this.signatures[signatureIndex].toObject(),
    signerId,
    signerModel,
    signerName,
    signerEmail,
    signatureType,
    signatureData: sigData,
    signedAt: new Date(),
    ipAddress,
    userAgent,
    deviceInfo,
    location,
    biometricData,
  };

  // Add to audit trail
  this.auditTrail.push({
    action: 'signed',
    performedBy: signerId,
    performedByModel: signerModel,
    performedAt: new Date(),
    ipAddress,
    userAgent,
    details: {
      signerType,
      signatureType,
    },
  });

  // Update status
  this.updateStatus();

  // Generate security hash
  this.generateSecurityHash();

  return this.save();
};

/**
 * Update document status based on signatures
 */
eSignatureSchema.methods.updateStatus = function () {
  const totalSignatures = this.signatures.length;
  const signedCount = this.signatures.filter((s) => s.signedAt).length;

  if (signedCount === 0) {
    this.status = 'pending';
  } else if (signedCount < totalSignatures) {
    this.status = 'partially_signed';
  } else {
    this.status = 'fully_signed';
    this.completedAt = new Date();
  }
};

/**
 * Generate security hash for tamper detection
 */
eSignatureSchema.methods.generateSecurityHash = function () {
  const dataToHash = {
    documentContent: this.documentContent,
    signatures: this.signatures.map((s) => ({
      signerName: s.signerName,
      signatureData: s.signatureData,
      signedAt: s.signedAt,
    })),
  };

  this.securityHash = crypto.createHash('sha256').update(JSON.stringify(dataToHash)).digest('hex');
};

/**
 * Verify document integrity
 */
eSignatureSchema.methods.verifyIntegrity = function () {
  const currentHash = this.securityHash;
  this.generateSecurityHash();
  const newHash = this.securityHash;

  this.securityHash = currentHash; // Restore original

  return currentHash === newHash;
};

/**
 * Decline signing
 */
eSignatureSchema.methods.decline = async function (reason, userId) {
  this.status = 'declined';
  this.declinedAt = new Date();
  this.declinedReason = reason;

  this.auditTrail.push({
    action: 'declined',
    performedBy: userId,
    performedByModel: 'User',
    performedAt: new Date(),
    details: { reason },
  });

  return this.save();
};

/**
 * Void document
 */
eSignatureSchema.methods.void = async function (reason, userId) {
  this.status = 'voided';
  this.voidedAt = new Date();
  this.voidedBy = userId;
  this.voidedReason = reason;

  this.auditTrail.push({
    action: 'voided',
    performedBy: userId,
    performedByModel: 'User',
    performedAt: new Date(),
    details: { reason },
  });

  return this.save();
};

/**
 * Send notification to signer
 */
eSignatureSchema.methods.sendNotification = async function (recipientType, method = 'email') {
  // Implementation would integrate with notification service
  const notification = {
    recipientType,
    recipientId: this.patientId,
    method,
    sentAt: new Date(),
    status: 'sent',
  };

  this.notificationsSent.push(notification);

  this.auditTrail.push({
    action: 'sent',
    performedBy: this.createdBy,
    performedByModel: 'User',
    performedAt: new Date(),
    details: { method, recipientType },
  });

  return this.save();
};

/**
 * Send reminder
 */
eSignatureSchema.methods.sendReminder = async function (method = 'email') {
  this.remindersSent += 1;
  this.lastReminderAt = new Date();

  this.notificationsSent.push({
    recipientType: 'patient',
    recipientId: this.patientId,
    method,
    sentAt: new Date(),
    status: 'sent',
  });

  this.auditTrail.push({
    action: 'reminded',
    performedBy: this.createdBy,
    performedByModel: 'User',
    performedAt: new Date(),
    details: { method, reminderNumber: this.remindersSent },
  });

  return this.save();
};

/**
 * Generate signed PDF document
 */
eSignatureSchema.methods.generateSignedPDF = async function () {
  // Implementation would use PDF generation library (e.g., PDFKit, puppeteer)
  // This is a placeholder for the actual implementation

  const pdfUrl = `signed-documents/${this._id}_${Date.now()}.pdf`;
  this.signedDocumentUrl = pdfUrl;

  // Generate hash of the PDF
  this.signedDocumentHash = crypto
    .createHash('sha256')
    .update(pdfUrl + this.securityHash)
    .digest('hex');

  return this.save();
};

/**
 * Generate certificate of completion
 */
eSignatureSchema.methods.generateCertificate = async function () {
  if (this.status !== 'fully_signed') {
    throw new Error('Document must be fully signed to generate certificate');
  }

  const certificateUrl = `certificates/${this._id}_certificate.pdf`;
  const certificateHash = crypto
    .createHash('sha256')
    .update(certificateUrl + this.signedDocumentHash)
    .digest('hex');

  this.certificateOfCompletion = {
    url: certificateUrl,
    hash: certificateHash,
    generatedAt: new Date(),
  };

  return this.save();
};

/**
 * Add to audit trail
 */
eSignatureSchema.methods.addAuditEntry = function (action, userId, userModel, details = {}) {
  this.auditTrail.push({
    action,
    performedBy: userId,
    performedByModel: userModel,
    performedAt: new Date(),
    details,
  });
};

// ==================== STATIC METHODS ====================

/**
 * Get pending signatures for a patient
 */
eSignatureSchema.statics.getPendingForPatient = async function (patientId) {
  return this.find({
    patientId,
    status: { $in: ['pending', 'partially_signed'] },
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }],
  }).sort({ createdAt: -1 });
};

/**
 * Get signatures for appointment
 */
eSignatureSchema.statics.getForAppointment = async function (appointmentId) {
  return this.find({ appointmentId }).sort({ createdAt: -1 });
};

/**
 * Get expired signatures
 */
eSignatureSchema.statics.getExpired = async function () {
  return this.find({
    status: 'pending',
    expiresAt: { $lte: new Date() },
  });
};

/**
 * Get signatures requiring reminders
 */
eSignatureSchema.statics.getRequiringReminders = async function () {
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  return this.find({
    status: { $in: ['pending', 'partially_signed'] },
    $or: [{ lastReminderAt: { $lte: twoDaysAgo } }, { lastReminderAt: { $exists: false } }],
    remindersSent: { $lt: 3 }, // Max 3 reminders
    expiresAt: { $gt: new Date() },
  });
};

/**
 * Get signature statistics
 */
eSignatureSchema.statics.getStatistics = async function (organizationId, dateRange) {
  const { startDate, endDate } = dateRange;

  const stats = await this.aggregate([
    {
      $match: {
        organization: organizationId,
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const avgCompletionTime = await this.aggregate([
    {
      $match: {
        organization: organizationId,
        status: 'fully_signed',
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $project: {
        completionTime: {
          $subtract: ['$completedAt', '$createdAt'],
        },
      },
    },
    {
      $group: {
        _id: null,
        avgTime: { $avg: '$completionTime' },
      },
    },
  ]);

  return {
    byStatus: stats,
    avgCompletionTime: avgCompletionTime[0]?.avgTime || 0,
  };
};

/**
 * Create signature request from template
 */
eSignatureSchema.statics.createFromTemplate = async function (
  templateId,
  patientId,
  createdBy,
  additionalData = {}
) {
  const DocumentTemplate = require('./DocumentTemplate');
  const template = await DocumentTemplate.findById(templateId);

  if (!template) {
    throw new Error('Template not found');
  }

  // Replace placeholders in content with actual data
  let { content } = template;
  if (additionalData.placeholders) {
    Object.keys(additionalData.placeholders).forEach((key) => {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), additionalData.placeholders[key]);
    });
  }

  const signature = new this({
    documentType: template.documentType,
    documentTitle: template.title,
    documentContent: content,
    templateId,
    patientId,
    signatures: template.requiredSignatures.map((sig) => ({
      signerType: sig.type,
      signerName: sig.name || '',
      signerEmail: sig.email || '',
    })),
    expiresAt: additionalData.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    organization: additionalData.organization,
    locationId: additionalData.locationId,
    createdBy,
    appointmentId: additionalData.appointmentId,
    status: 'pending',
  });

  signature.generateSecurityHash();

  await signature.save();

  signature.auditTrail.push({
    action: 'created',
    performedBy: createdBy,
    performedByModel: 'User',
    performedAt: new Date(),
  });

  return signature.save();
};

// ==================== PRE-SAVE HOOK ====================

eSignatureSchema.pre('save', function (next) {
  // Check for expiration
  if (this.isExpired && this.status === 'pending') {
    this.status = 'expired';
  }

  // Update status based on signatures
  if (this.isModified('signatures')) {
    this.updateStatus();
  }

  next();
});

module.exports = mongoose.model('ESignature', eSignatureSchema);
