const mongoose = require('mongoose');

/**
 * Insurance Card Model
 *
 * Manages insurance card uploads and OCR data extraction
 * Features:
 * - Front and back image upload
 * - OCR text extraction
 * - Auto-populate insurance information
 * - Card verification
 * - Expiration tracking
 * - Multi-card support per patient
 */

// eslint-disable-next-line no-unused-vars

const insuranceCardSchema = new mongoose.Schema(
  {
    // Patient Information
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },

    // Card Type
    cardType: {
      type: String,
      required: true,
      enum: ['primary', 'secondary', 'tertiary'],
      default: 'primary',
    },

    // Insurance Information (extracted from card or manually entered)
    insuranceProvider: {
      type: String,
      required: true,
    },
    insuranceProviderCode: {
      type: String, // Standardized code (e.g., Aetna, BCBS)
    },
    planName: {
      type: String,
    },
    planType: {
      type: String,
      enum: ['HMO', 'PPO', 'EPO', 'POS', 'HDHP', 'other'],
    },

    // Member Information
    memberId: {
      type: String,
      required: true,
    },
    groupNumber: {
      type: String,
    },
    policyHolderName: {
      type: String,
    },
    policyHolderRelationship: {
      type: String,
      enum: ['self', 'spouse', 'parent', 'child', 'other'],
      default: 'self',
    },
    policyHolderDOB: {
      type: Date,
    },

    // Card Images
    frontImage: {
      url: {
        type: String,
        required: true,
      },
      filename: String,
      mimeType: String,
      size: Number, // in bytes
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
      thumbnailUrl: String,
    },
    backImage: {
      url: String,
      filename: String,
      mimeType: String,
      size: Number,
      uploadedAt: Date,
      thumbnailUrl: String,
    },

    // OCR Extraction
    ocrData: {
      frontExtracted: {
        type: Boolean,
        default: false,
      },
      backExtracted: {
        type: Boolean,
        default: false,
      },
      extractedAt: Date,

      // Raw OCR text
      frontText: String,
      backText: String,

      // Extracted fields
      extractedFields: {
        insuranceProvider: String,
        memberId: String,
        groupNumber: String,
        planName: String,
        policyHolderName: String,
        rxBin: String,
        rxPcn: String,
        rxGroup: String,
        customerServicePhone: String,
        claimsAddress: String,
        effectiveDate: Date,
        expirationDate: Date,
      },

      // Confidence scores (0-100)
      confidence: {
        overall: Number,
        insuranceProvider: Number,
        memberId: Number,
        groupNumber: Number,
      },

      // OCR processing status
      processingStatus: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending',
      },
      processingError: String,
    },

    // Prescription (Rx) Information
    rxInfo: {
      bin: String,
      pcn: String,
      group: String,
      memberId: String,
    },

    // Contact Information
    customerServicePhone: String,
    claimsPhone: String,
    claimsAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
    },

    // Dates
    effectiveDate: {
      type: Date,
    },
    expirationDate: {
      type: Date,
    },

    // Verification Status
    verificationStatus: {
      type: String,
      enum: ['not_verified', 'pending', 'verified', 'failed', 'expired'],
      default: 'not_verified',
      index: true,
    },
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verificationNotes: String,
    lastVerificationAttempt: Date,
    verificationAttempts: {
      type: Number,
      default: 0,
    },

    // Eligibility Check
    eligibilityChecked: {
      type: Boolean,
      default: false,
    },
    lastEligibilityCheck: Date,
    eligibilityStatus: {
      type: String,
      enum: ['active', 'inactive', 'pending', 'unknown'],
    },
    eligibilityDetails: mongoose.Schema.Types.Mixed,

    // Coverage Details
    coverageDetails: {
      deductible: {
        individual: Number,
        family: Number,
        met: Number,
      },
      outOfPocketMax: {
        individual: Number,
        family: Number,
        met: Number,
      },
      copay: {
        primaryCare: Number,
        specialist: Number,
        urgentCare: Number,
        emergencyRoom: Number,
      },
      coinsurance: Number, // percentage
    },

    // Status
    status: {
      type: String,
      enum: ['active', 'inactive', 'expired', 'replaced'],
      default: 'active',
      index: true,
    },
    replacedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InsuranceCard',
    },
    inactivatedAt: Date,
    inactivatedReason: String,

    // Upload Information
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    uploadSource: {
      type: String,
      enum: ['patient_portal', 'mobile_app', 'staff', 'integration'],
      default: 'mobile_app',
    },
    uploadDevice: {
      platform: String, // iOS, Android, Web
      deviceModel: String,
      osVersion: String,
      appVersion: String,
    },

    // Quality Check
    imageQuality: {
      frontQuality: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor'],
      },
      backQuality: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor'],
      },
      issues: [
        {
          type: {
            type: String,
            enum: ['blurry', 'glare', 'dark', 'cropped', 'rotated', 'illegible'],
          },
          severity: {
            type: String,
            enum: ['low', 'medium', 'high'],
          },
          side: {
            type: String,
            enum: ['front', 'back'],
          },
        },
      ],
      needsRetake: {
        type: Boolean,
        default: false,
      },
    },

    // Notes and Tags
    notes: String,
    tags: [String],
    flags: [
      {
        type: {
          type: String,
          enum: ['expiring_soon', 'expired', 'poor_quality', 'missing_info', 'verification_failed'],
        },
        message: String,
        severity: {
          type: String,
          enum: ['low', 'medium', 'high'],
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        resolvedAt: Date,
      },
    ],

    // Metadata
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// ==================== INDEXES ====================

insuranceCardSchema.index({ patientId: 1, cardType: 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// insuranceCardSchema.index({ patientId: 1, status: 1 });
insuranceCardSchema.index({ organization: 1, verificationStatus: 1 });
insuranceCardSchema.index({ expirationDate: 1, status: 1 });
insuranceCardSchema.index({ memberId: 1 });

// ==================== VIRTUAL FIELDS ====================

insuranceCardSchema.virtual('isExpired').get(function () {
  return this.expirationDate && this.expirationDate < new Date();
});

insuranceCardSchema.virtual('daysUntilExpiration').get(function () {
  if (!this.expirationDate) return null;
  const days = Math.ceil((this.expirationDate - new Date()) / (1000 * 60 * 60 * 24));
  return days;
});

insuranceCardSchema.virtual('isExpiringSoon').get(function () {
  const days = this.daysUntilExpiration;
  return days !== null && days > 0 && days <= 30;
});

insuranceCardSchema.virtual('needsVerification').get(function () {
  if (this.verificationStatus === 'verified') {
    // Re-verify every 90 days
    if (this.verifiedAt) {
      const daysSinceVerification = Math.ceil(
        (new Date() - this.verifiedAt) / (1000 * 60 * 60 * 24)
      );
      return daysSinceVerification > 90;
    }
  }
  return this.verificationStatus !== 'verified';
});

// ==================== INSTANCE METHODS ====================

/**
 * Process OCR extraction
 */
insuranceCardSchema.methods.processOCR = async function (side = 'front', ocrText) {
  // In production, this would call an OCR service (Google Vision, AWS Textract, etc.)
  // For now, we'll simulate extraction with basic pattern matching

  this.ocrData = this.ocrData || {};

  if (side === 'front') {
    this.ocrData.frontText = ocrText;
    this.ocrData.frontExtracted = true;
  } else {
    this.ocrData.backText = ocrText;
    this.ocrData.backExtracted = true;
  }

  // Extract fields using regex patterns
  const extractedFields = this.ocrData.extractedFields || {};

  // Member ID patterns
  const memberIdMatch = ocrText.match(/(?:Member ID|ID#|Member #):?\s*([A-Z0-9]{6,20})/i);
  if (memberIdMatch) {
    extractedFields.memberId = memberIdMatch[1];
  }

  // Group Number patterns
  const groupMatch = ocrText.match(/(?:Group #|Group Number|Grp):?\s*([A-Z0-9]{4,15})/i);
  if (groupMatch) {
    extractedFields.groupNumber = groupMatch[1];
  }

  // Insurance Provider
  const providers = ['Aetna', 'UnitedHealthcare', 'Blue Cross', 'Cigna', 'Humana', 'Kaiser'];
  const providerMatch = providers.find((p) => ocrText.toLowerCase().includes(p.toLowerCase()));
  if (providerMatch) {
    extractedFields.insuranceProvider = providerMatch;
  }

  // Rx BIN
  const binMatch = ocrText.match(/(?:BIN|Rx BIN):?\s*([0-9]{6})/i);
  if (binMatch) {
    extractedFields.rxBin = binMatch[1];
  }

  // Rx PCN
  const pcnMatch = ocrText.match(/(?:PCN|Rx PCN):?\s*([A-Z0-9]{2,10})/i);
  if (pcnMatch) {
    extractedFields.rxPcn = pcnMatch[1];
  }

  // Phone number
  const phoneMatch = ocrText.match(/(?:Customer Service|Phone|Call):?\s*([0-9\-\(\)\s]{10,20})/i);
  if (phoneMatch) {
    extractedFields.customerServicePhone = phoneMatch[1];
  }

  this.ocrData.extractedFields = extractedFields;
  this.ocrData.extractedAt = new Date();
  this.ocrData.processingStatus = 'completed';

  // Calculate confidence scores
  this.ocrData.confidence = {
    overall: 0,
    insuranceProvider: extractedFields.insuranceProvider ? 85 : 0,
    memberId: extractedFields.memberId ? 90 : 0,
    groupNumber: extractedFields.groupNumber ? 85 : 0,
  };

  const confidenceValues = Object.values(this.ocrData.confidence).filter((v) => v > 0);
  this.ocrData.confidence.overall =
    confidenceValues.length > 0
      ? confidenceValues.reduce((a, b) => a + b) / confidenceValues.length
      : 0;

  // Auto-populate fields if confidence is high
  if (this.ocrData.confidence.memberId >= 80 && extractedFields.memberId) {
    this.memberId = extractedFields.memberId;
  }
  if (this.ocrData.confidence.groupNumber >= 80 && extractedFields.groupNumber) {
    this.groupNumber = extractedFields.groupNumber;
  }
  if (this.ocrData.confidence.insuranceProvider >= 80 && extractedFields.insuranceProvider) {
    this.insuranceProvider = extractedFields.insuranceProvider;
  }
  if (extractedFields.rxBin) {
    this.rxInfo = this.rxInfo || {};
    this.rxInfo.bin = extractedFields.rxBin;
  }
  if (extractedFields.rxPcn) {
    this.rxInfo = this.rxInfo || {};
    this.rxInfo.pcn = extractedFields.rxPcn;
  }

  return this.save();
};

/**
 * Check image quality
 */
insuranceCardSchema.methods.checkImageQuality = async function (side = 'front', qualityMetrics) {
  // In production, this would use image analysis (OpenCV, AWS Rekognition, etc.)
  // qualityMetrics: { brightness, sharpness, size, rotation }

  const { brightness, sharpness, size, rotation } = qualityMetrics;

  let quality = 'good';
  const issues = [];

  // Check sharpness (blurriness)
  if (sharpness < 50) {
    quality = 'poor';
    issues.push({
      type: 'blurry',
      severity: 'high',
      side,
    });
  } else if (sharpness < 70) {
    quality = 'fair';
    issues.push({
      type: 'blurry',
      severity: 'medium',
      side,
    });
  }

  // Check brightness (too dark or glare)
  if (brightness < 40) {
    quality = quality === 'poor' ? 'poor' : 'fair';
    issues.push({
      type: 'dark',
      severity: 'medium',
      side,
    });
  } else if (brightness > 85) {
    quality = quality === 'poor' ? 'poor' : 'fair';
    issues.push({
      type: 'glare',
      severity: 'medium',
      side,
    });
  }

  // Check rotation
  if (Math.abs(rotation) > 10) {
    issues.push({
      type: 'rotated',
      severity: 'low',
      side,
    });
  }

  // Check size (resolution)
  if (size < 500 * 1024) {
    // Less than 500KB might be low resolution
    issues.push({
      type: 'illegible',
      severity: 'medium',
      side,
    });
  }

  if (side === 'front') {
    this.imageQuality.frontQuality = quality;
  } else {
    this.imageQuality.backQuality = quality;
  }

  this.imageQuality.issues = [...(this.imageQuality.issues || []), ...issues];
  this.imageQuality.needsRetake = quality === 'poor';

  return this.save();
};

/**
 * Verify insurance card
 */
insuranceCardSchema.methods.verify = async function (userId, notes) {
  this.verificationStatus = 'verified';
  this.verifiedAt = new Date();
  this.verifiedBy = userId;
  this.verificationNotes = notes;

  // Remove verification flags
  this.flags = this.flags.filter((f) => f.type !== 'verification_failed');

  return this.save();
};

/**
 * Mark verification as failed
 */
insuranceCardSchema.methods.markVerificationFailed = async function (reason) {
  this.verificationStatus = 'failed';
  this.lastVerificationAttempt = new Date();
  this.verificationAttempts += 1;

  this.flags.push({
    type: 'verification_failed',
    message: reason,
    severity: 'high',
  });

  return this.save();
};

/**
 * Check eligibility
 */
insuranceCardSchema.methods.checkEligibility = async function () {
  // In production, this would call insurance eligibility API (e.g., Change Healthcare, Availity)
  this.eligibilityChecked = true;
  this.lastEligibilityCheck = new Date();

  // Simulated response
  this.eligibilityStatus = 'active';
  this.eligibilityDetails = {
    coverageActive: true,
    effectiveDate: this.effectiveDate,
    terminationDate: this.expirationDate,
    checkedAt: new Date(),
  };

  return this.save();
};

/**
 * Replace card with new one
 */
insuranceCardSchema.methods.replaceWith = async function (newCardId) {
  this.status = 'replaced';
  this.replacedBy = newCardId;
  this.inactivatedAt = new Date();
  this.inactivatedReason = 'Replaced with updated card';

  return this.save();
};

/**
 * Mark card as expired
 */
insuranceCardSchema.methods.markAsExpired = async function () {
  this.status = 'expired';
  this.inactivatedAt = new Date();

  this.flags.push({
    type: 'expired',
    message: 'Insurance card has expired',
    severity: 'high',
  });

  return this.save();
};

/**
 * Add flag
 */
insuranceCardSchema.methods.addFlag = function (type, message, severity = 'medium') {
  this.flags.push({
    type,
    message,
    severity,
  });
};

/**
 * Resolve flag
 */
insuranceCardSchema.methods.resolveFlag = function (flagId) {
  const flag = this.flags.id(flagId);
  if (flag) {
    flag.resolvedAt = new Date();
  }
};

// ==================== STATIC METHODS ====================

/**
 * Get active card for patient
 */
insuranceCardSchema.statics.getActiveForPatient = async function (patientId, cardType = 'primary') {
  return this.findOne({
    patientId,
    cardType,
    status: 'active',
  }).sort({ createdAt: -1 });
};

/**
 * Get all cards for patient
 */
insuranceCardSchema.statics.getAllForPatient = async function (patientId) {
  return this.find({ patientId }).sort({ cardType: 1, createdAt: -1 });
};

/**
 * Get cards pending verification
 */
insuranceCardSchema.statics.getPendingVerification = async function (organizationId) {
  return this.find({
    organization: organizationId,
    verificationStatus: { $in: ['not_verified', 'pending'] },
    status: 'active',
  })
    .populate('patientId', 'firstName lastName email')
    .sort({ createdAt: -1 });
};

/**
 * Get expiring cards
 */
insuranceCardSchema.statics.getExpiringCards = async function (organizationId, daysThreshold = 30) {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

  return this.find({
    organization: organizationId,
    status: 'active',
    expirationDate: {
      $gte: new Date(),
      $lte: thresholdDate,
    },
  })
    .populate('patientId', 'firstName lastName email phone')
    .sort({ expirationDate: 1 });
};

/**
 * Get cards with quality issues
 */
insuranceCardSchema.statics.getCardsWithQualityIssues = async function (organizationId) {
  return this.find({
    organization: organizationId,
    status: 'active',
    'imageQuality.needsRetake': true,
  })
    .populate('patientId', 'firstName lastName')
    .sort({ createdAt: -1 });
};

/**
 * Get statistics
 */
insuranceCardSchema.statics.getStatistics = async function (organizationId, dateRange) {
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
        _id: '$verificationStatus',
        count: { $sum: 1 },
      },
    },
  ]);

  const totalCards = await this.countDocuments({
    organization: organizationId,
    status: 'active',
  });

  const cardsWithOCR = await this.countDocuments({
    organization: organizationId,
    'ocrData.processingStatus': 'completed',
  });

  return {
    byVerificationStatus: stats,
    totalActive: totalCards,
    withOCR: cardsWithOCR,
    ocrSuccessRate: totalCards > 0 ? (cardsWithOCR / totalCards) * 100 : 0,
  };
};

// ==================== PRE-SAVE HOOKS ====================

insuranceCardSchema.pre('save', function (next) {
  // Check for expiration
  if (this.isExpired && this.status === 'active') {
    this.status = 'expired';
    this.addFlag('expired', 'Insurance card has expired', 'high');
  }

  // Add expiring soon flag
  if (this.isExpiringSoon && !this.flags.some((f) => f.type === 'expiring_soon' && !f.resolvedAt)) {
    this.addFlag('expiring_soon', `Card expires in ${this.daysUntilExpiration} days`, 'medium');
  }

  // Add missing info flag if critical fields are missing
  if (this.status === 'active' && (!this.memberId || !this.insuranceProvider)) {
    if (!this.flags.some((f) => f.type === 'missing_info' && !f.resolvedAt)) {
      this.addFlag('missing_info', 'Missing critical insurance information', 'high');
    }
  }

  next();
});

module.exports = mongoose.model('InsuranceCard', insuranceCardSchema);
