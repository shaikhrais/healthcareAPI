const mongoose = require('mongoose');

/**
 * Document Model
 * TASK-14.4 - Document Camera & OCR
 *
 * Manages document capture, OCR text extraction, and document management
 * Features:
 * - Multi-page document support
 * - OCR text extraction with multiple providers
 * - Document classification
 * - Auto-rotation and enhancement
 * - Document verification
 * - Full-text search
 * - Audit trail
 * - HIPAA-compliant storage
 */

// eslint-disable-next-line no-unused-vars

const documentSchema = new mongoose.Schema(
  {
    // Basic Information
    title: {
      type: String,
      required: true,
    },
    description: String,

    // Document Type
    documentType: {
      type: String,
      required: true,
      enum: [
        'id_card', // Driver's license, state ID
        'insurance_card', // Health insurance card
        'prescription', // Prescription document
        'lab_result', // Lab test results
        'medical_record', // Medical records
        'consent_form', // Consent/waiver forms
        'invoice', // Medical invoice/bill
        'referral', // Doctor referral
        'authorization', // Insurance authorization
        'imaging', // X-ray, MRI, etc.
        'vaccination_record', // Vaccination card
        'other', // Other documents
      ],
      index: true,
    },

    // Document Category
    category: {
      type: String,
      enum: ['medical', 'administrative', 'financial', 'legal', 'personal'],
      default: 'medical',
    },

    // Associated Entities
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      index: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
    },
    practitionerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Document Pages (multi-page support)
    pages: [
      {
        pageNumber: {
          type: Number,
          required: true,
        },
        image: {
          url: {
            type: String,
            required: true,
          },
          filename: String,
          mimeType: String,
          size: Number, // bytes
          width: Number, // pixels
          height: Number, // pixels
          thumbnailUrl: String,
          uploadedAt: {
            type: Date,
            default: Date.now,
          },
        },

        // OCR Data per page
        ocr: {
          extracted: {
            type: Boolean,
            default: false,
          },
          extractedAt: Date,
          provider: {
            type: String,
            enum: ['google_vision', 'aws_textract', 'azure_cognitive', 'tesseract', 'manual'],
          },

          // Raw OCR text
          rawText: String,

          // Structured text with bounding boxes
          blocks: [
            {
              text: String,
              confidence: Number, // 0-100
              boundingBox: {
                x: Number,
                y: Number,
                width: Number,
                height: Number,
              },
              type: {
                type: String,
                enum: ['paragraph', 'line', 'word', 'table', 'signature'],
              },
            },
          ],

          // Detected entities (names, dates, medications, etc.)
          entities: [
            {
              type: {
                type: String,
                enum: [
                  'person_name',
                  'date',
                  'medication',
                  'dosage',
                  'diagnosis',
                  'procedure',
                  'organization',
                  'phone_number',
                  'email',
                  'address',
                  'member_id',
                  'policy_number',
                  'prescription_number',
                  'icd_code',
                  'cpt_code',
                ],
              },
              value: String,
              confidence: Number,
              position: {
                start: Number,
                end: Number,
              },
            },
          ],

          // Language detection
          language: {
            type: String,
            default: 'en',
          },

          // Confidence scores
          confidence: {
            overall: Number, // 0-100
            text: Number,
            layout: Number,
          },

          // Processing status
          status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed', 'manual_review'],
            default: 'pending',
          },
          processingError: String,
          processingTime: Number, // ms
        },

        // Image Quality Metrics
        quality: {
          score: {
            type: Number,
            min: 0,
            max: 100,
          },
          brightness: Number,
          sharpness: Number,
          contrast: Number,
          rotation: Number, // degrees
          issues: [
            {
              type: {
                type: String,
                enum: ['blurry', 'dark', 'glare', 'skewed', 'cropped', 'low_resolution'],
              },
              severity: {
                type: String,
                enum: ['low', 'medium', 'high'],
              },
            },
          ],
          needsRetake: {
            type: Boolean,
            default: false,
          },
        },

        // Processing flags
        enhanced: {
          type: Boolean,
          default: false,
        },
        autoRotated: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // Extracted Data (aggregated from all pages)
    extractedData: {
      // Common fields
      patientName: String,
      dateOfBirth: Date,
      documentDate: Date,
      issuer: String, // Organization that issued the document
      issuedDate: Date,
      expirationDate: Date,

      // ID-specific
      idNumber: String,
      idType: {
        type: String,
        enum: ['drivers_license', 'state_id', 'passport', 'other'],
      },
      state: String,

      // Insurance-specific
      insuranceProvider: String,
      memberId: String,
      groupNumber: String,
      planName: String,

      // Prescription-specific
      medicationName: String,
      dosage: String,
      prescribingDoctor: String,
      prescriptionNumber: String,
      refills: Number,

      // Lab results
      testName: String,
      testDate: Date,
      results: [
        {
          name: String,
          value: String,
          unit: String,
          referenceRange: String,
          flag: {
            type: String,
            enum: ['normal', 'high', 'low', 'critical'],
          },
        },
      ],

      // Custom fields (for flexibility)
      customFields: mongoose.Schema.Types.Mixed,
    },

    // Full-text search
    fullText: {
      type: String,
      index: 'text',
    },

    // Document Status
    status: {
      type: String,
      enum: ['draft', 'pending_review', 'verified', 'rejected', 'archived'],
      default: 'pending_review',
      index: true,
    },

    // Verification
    verified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verificationNotes: String,

    // Classification
    autoClassified: {
      type: Boolean,
      default: false,
    },
    classificationConfidence: Number, // 0-100
    suggestedType: String, // AI-suggested document type

    // Upload Information
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    uploadSource: {
      type: String,
      enum: ['mobile_camera', 'mobile_gallery', 'web_upload', 'scanner', 'fax', 'integration'],
      default: 'mobile_camera',
    },
    uploadDevice: {
      platform: String, // iOS, Android, Web
      deviceModel: String,
      osVersion: String,
      appVersion: String,
    },
    uploadLocation: {
      latitude: Number,
      longitude: Number,
      accuracy: Number,
    },

    // File Information
    fileSize: Number, // Total size in bytes
    pageCount: {
      type: Number,
      default: 1,
    },

    // Security & Compliance
    encrypted: {
      type: Boolean,
      default: false,
    },
    encryptionMethod: String,
    confidential: {
      type: Boolean,
      default: true,
    },
    hipaaCompliant: {
      type: Boolean,
      default: true,
    },

    // Access Control
    accessLevel: {
      type: String,
      enum: ['public', 'staff', 'practitioner', 'patient_only', 'restricted'],
      default: 'patient_only',
    },
    sharedWith: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        accessType: {
          type: String,
          enum: ['view', 'edit', 'download'],
        },
        sharedAt: {
          type: Date,
          default: Date.now,
        },
        expiresAt: Date,
      },
    ],

    // Tags and Categorization
    tags: [String],
    keywords: [String],

    // Flags and Alerts
    flags: [
      {
        type: {
          type: String,
          enum: [
            'poor_quality',
            'missing_pages',
            'ocr_failed',
            'sensitive_content',
            'requires_attention',
            'duplicate',
            'expired',
          ],
        },
        message: String,
        severity: {
          type: String,
          enum: ['low', 'medium', 'high', 'critical'],
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        resolvedAt: Date,
        resolvedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],

    // Audit Trail
    auditLog: [
      {
        action: {
          type: String,
          enum: [
            'created',
            'uploaded',
            'viewed',
            'edited',
            'downloaded',
            'shared',
            'deleted',
            'verified',
            'archived',
          ],
        },
        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        details: mongoose.Schema.Types.Mixed,
        ipAddress: String,
        userAgent: String,
      },
    ],

    // Notes and Comments
    notes: String,
    comments: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        text: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
        editedAt: Date,
      },
    ],

    // Related Documents
    relatedDocuments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
      },
    ],
    supersedes: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
    },
    supersededBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
    },

    // Retention Policy
    retentionPolicy: {
      type: String,
      enum: ['standard', 'extended', 'permanent'],
      default: 'standard',
    },
    retentionDate: Date, // Date when document can be deleted
    archived: {
      type: Boolean,
      default: false,
    },
    archivedAt: Date,

    // Organization
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

documentSchema.index({ patientId: 1, documentType: 1 });
documentSchema.index({ patientId: 1, status: 1 });
documentSchema.index({ organization: 1, documentType: 1 });
documentSchema.index({ organization: 1, status: 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// documentSchema.index({ uploadedBy: 1, createdAt: -1 });
documentSchema.index({ 'extractedData.documentDate': -1 });
documentSchema.index({ 'extractedData.expirationDate': 1 });
documentSchema.index({ tags: 1 });
documentSchema.index({ fullText: 'text' });

// ==================== VIRTUAL FIELDS ====================

documentSchema.virtual('isExpired').get(function () {
  return this.extractedData?.expirationDate && this.extractedData.expirationDate < new Date();
});

documentSchema.virtual('isComplete').get(function () {
  return this.pages.every((page) => page.ocr.status === 'completed');
});

documentSchema.virtual('ocrProgress').get(function () {
  if (this.pages.length === 0) return 0;
  const completed = this.pages.filter((p) => p.ocr.status === 'completed').length;
  return Math.round((completed / this.pages.length) * 100);
});

documentSchema.virtual('averageConfidence').get(function () {
  const confidences = this.pages
    .filter((p) => p.ocr.confidence?.overall)
    .map((p) => p.ocr.confidence.overall);

  if (confidences.length === 0) return 0;
  return Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length);
});

documentSchema.virtual('hasQualityIssues').get(function () {
  return this.pages.some((p) => p.quality.needsRetake);
});

// ==================== INSTANCE METHODS ====================

/**
 * Add page to document
 */
documentSchema.methods.addPage = function (imageData) {
  const pageNumber = this.pages.length + 1;

  this.pages.push({
    pageNumber,
    image: {
      url: imageData.url,
      filename: imageData.filename,
      mimeType: imageData.mimeType,
      size: imageData.size,
      width: imageData.width,
      height: imageData.height,
      thumbnailUrl: imageData.thumbnailUrl,
    },
    ocr: {
      status: 'pending',
    },
    quality: {},
  });

  this.pageCount = this.pages.length;
  this.fileSize = this.pages.reduce((sum, p) => sum + (p.image.size || 0), 0);

  return this.save();
};

/**
 * Process OCR for a page
 */
documentSchema.methods.processPageOCR = async function (pageNumber, ocrResult) {
  const page = this.pages.find((p) => p.pageNumber === pageNumber);
  if (!page) {
    throw new Error('Page not found');
  }

  page.ocr = {
    ...page.ocr,
    extracted: true,
    extractedAt: new Date(),
    provider: ocrResult.provider || 'google_vision',
    rawText: ocrResult.rawText,
    blocks: ocrResult.blocks || [],
    entities: ocrResult.entities || [],
    language: ocrResult.language || 'en',
    confidence: {
      overall: ocrResult.confidence?.overall || 0,
      text: ocrResult.confidence?.text || 0,
      layout: ocrResult.confidence?.layout || 0,
    },
    status: 'completed',
    processingTime: ocrResult.processingTime,
  };

  // Update full-text search index
  this.updateFullText();

  // Auto-extract common fields
  this.extractCommonFields();

  return this.save();
};

/**
 * Update full-text search index
 */
documentSchema.methods.updateFullText = function () {
  const allText = this.pages
    .filter((p) => p.ocr.rawText)
    .map((p) => p.ocr.rawText)
    .join(' ');

  this.fullText = allText;
};

/**
 * Extract common fields from OCR text
 */
documentSchema.methods.extractCommonFields = function () {
  const allText = this.fullText || '';

  if (!this.extractedData) {
    this.extractedData = {};
  }

  // Extract dates
  const dateRegex = /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/g;
  const dates = allText.match(dateRegex);
  if (dates && dates.length > 0 && !this.extractedData.documentDate) {
    // Use first date found
    this.extractedData.documentDate = new Date(dates[0]);
  }

  // Extract based on document type
  if (this.documentType === 'prescription') {
    this.extractPrescriptionData();
  } else if (this.documentType === 'insurance_card') {
    this.extractInsuranceData();
  } else if (this.documentType === 'id_card') {
    this.extractIDData();
  }
};

/**
 * Extract prescription-specific data
 */
documentSchema.methods.extractPrescriptionData = function () {
  const allText = this.fullText || '';

  // Extract medication name (usually after "Rx:" or in capital letters)
  const medRegex = /(?:Rx:|Medication:)\s*([A-Za-z]+)/i;
  const medMatch = allText.match(medRegex);
  if (medMatch) {
    this.extractedData.medicationName = medMatch[1];
  }

  // Extract dosage
  const dosageRegex = /(\d+\s*(?:mg|mcg|ml|g|units?))/i;
  const dosageMatch = allText.match(dosageRegex);
  if (dosageMatch) {
    this.extractedData.dosage = dosageMatch[1];
  }

  // Extract refills
  const refillsRegex = /(?:Refills?:)\s*(\d+)/i;
  const refillsMatch = allText.match(refillsRegex);
  if (refillsMatch) {
    this.extractedData.refills = parseInt(refillsMatch[1], 10);
  }
};

/**
 * Extract insurance card data
 */
documentSchema.methods.extractInsuranceData = function () {
  const allText = this.fullText || '';

  // Extract member ID
  const memberIdRegex = /(?:Member ID|ID#|Member #):?\s*([A-Z0-9]{6,20})/i;
  const memberIdMatch = allText.match(memberIdRegex);
  if (memberIdMatch) {
    this.extractedData.memberId = memberIdMatch[1];
  }

  // Extract group number
  const groupRegex = /(?:Group #|Group Number|Grp):?\s*([A-Z0-9]{4,15})/i;
  const groupMatch = allText.match(groupRegex);
  if (groupMatch) {
    this.extractedData.groupNumber = groupMatch[1];
  }

  // Extract insurance provider
  const providers = ['Aetna', 'UnitedHealthcare', 'Blue Cross', 'Cigna', 'Humana', 'Kaiser'];
  const providerMatch = providers.find((p) => allText.toLowerCase().includes(p.toLowerCase()));
  if (providerMatch) {
    this.extractedData.insuranceProvider = providerMatch;
  }
};

/**
 * Extract ID card data
 */
documentSchema.methods.extractIDData = function () {
  const allText = this.fullText || '';

  // Extract ID number
  const idRegex = /(?:ID|License|DL)\s*#:?\s*([A-Z0-9\-]{8,20})/i;
  const idMatch = allText.match(idRegex);
  if (idMatch) {
    this.extractedData.idNumber = idMatch[1];
  }

  // Extract state
  const states = [
    'AL',
    'AK',
    'AZ',
    'AR',
    'CA',
    'CO',
    'CT',
    'DE',
    'FL',
    'GA',
    'HI',
    'ID',
    'IL',
    'IN',
    'IA',
    'KS',
    'KY',
    'LA',
    'ME',
    'MD',
    'MA',
    'MI',
    'MN',
    'MS',
    'MO',
    'MT',
    'NE',
    'NV',
    'NH',
    'NJ',
    'NM',
    'NY',
    'NC',
    'ND',
    'OH',
    'OK',
    'OR',
    'PA',
    'RI',
    'SC',
    'SD',
    'TN',
    'TX',
    'UT',
    'VT',
    'VA',
    'WA',
    'WV',
    'WI',
    'WY',
  ];
  const stateMatch = states.find((s) => new RegExp(`\\b${s}\\b`).test(allText));
  if (stateMatch) {
    this.extractedData.state = stateMatch;
  }
};

/**
 * Assess image quality for a page
 */
documentSchema.methods.assessPageQuality = function (pageNumber, qualityMetrics) {
  const page = this.pages.find((p) => p.pageNumber === pageNumber);
  if (!page) {
    throw new Error('Page not found');
  }

  const { brightness, sharpness, contrast, rotation } = qualityMetrics;

  let score = 100;
  const issues = [];

  // Assess sharpness
  if (sharpness < 50) {
    score -= 30;
    issues.push({ type: 'blurry', severity: 'high' });
  } else if (sharpness < 70) {
    score -= 15;
    issues.push({ type: 'blurry', severity: 'medium' });
  }

  // Assess brightness
  if (brightness < 40) {
    score -= 20;
    issues.push({ type: 'dark', severity: 'medium' });
  } else if (brightness > 85) {
    score -= 20;
    issues.push({ type: 'glare', severity: 'medium' });
  }

  // Assess rotation
  if (Math.abs(rotation) > 10) {
    score -= 10;
    issues.push({ type: 'skewed', severity: 'low' });
  }

  page.quality = {
    score: Math.max(0, score),
    brightness,
    sharpness,
    contrast,
    rotation,
    issues,
    needsRetake: score < 50,
  };

  return this.save();
};

/**
 * Verify document
 */
documentSchema.methods.verify = async function (userId, notes) {
  this.verified = true;
  this.verifiedAt = new Date();
  this.verifiedBy = userId;
  this.verificationNotes = notes;
  this.status = 'verified';

  this.addAuditLog('verified', userId, { notes });

  return this.save();
};

/**
 * Add flag
 */
documentSchema.methods.addFlag = function (type, message, severity = 'medium') {
  this.flags.push({
    type,
    message,
    severity,
  });
};

/**
 * Resolve flag
 */
documentSchema.methods.resolveFlag = function (flagId, userId) {
  const flag = this.flags.id(flagId);
  if (flag) {
    flag.resolvedAt = new Date();
    flag.resolvedBy = userId;
  }
};

/**
 * Add audit log entry
 */
documentSchema.methods.addAuditLog = function (action, userId, details = {}) {
  this.auditLog.push({
    action,
    performedBy: userId,
    timestamp: new Date(),
    details,
  });
};

/**
 * Add comment
 */
documentSchema.methods.addComment = function (userId, text) {
  this.comments.push({
    userId,
    text,
  });
  return this.save();
};

/**
 * Archive document
 */
documentSchema.methods.archive = async function (userId) {
  this.archived = true;
  this.archivedAt = new Date();
  this.status = 'archived';

  this.addAuditLog('archived', userId);

  return this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Get documents for patient
 */
documentSchema.statics.getForPatient = async function (patientId, filters = {}) {
  const query = { patientId, archived: false };

  if (filters.documentType) {
    query.documentType = filters.documentType;
  }
  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.dateFrom) {
    query.createdAt = { $gte: filters.dateFrom };
  }

  return this.find(query).sort({ createdAt: -1 });
};

/**
 * Search documents
 */
documentSchema.statics.searchDocuments = async function (organizationId, searchQuery) {
  return this.find({
    organization: organizationId,
    $text: { $search: searchQuery },
    archived: false,
  }).sort({ score: { $meta: 'textScore' } });
};

/**
 * Get documents pending review
 */
documentSchema.statics.getPendingReview = async function (organizationId) {
  return this.find({
    organization: organizationId,
    status: 'pending_review',
    archived: false,
  })
    .populate('patientId', 'firstName lastName')
    .populate('uploadedBy', 'firstName lastName')
    .sort({ createdAt: -1 });
};

/**
 * Get documents with quality issues
 */
documentSchema.statics.getWithQualityIssues = async function (organizationId) {
  return this.find({
    organization: organizationId,
    'pages.quality.needsRetake': true,
    archived: false,
  })
    .populate('patientId', 'firstName lastName')
    .sort({ createdAt: -1 });
};

/**
 * Get statistics
 */
documentSchema.statics.getStatistics = async function (organizationId, dateRange) {
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
        _id: '$documentType',
        count: { $sum: 1 },
        avgConfidence: { $avg: '$classificationConfidence' },
      },
    },
  ]);

  const totalDocuments = await this.countDocuments({
    organization: organizationId,
    archived: false,
  });

  const withOCR = await this.countDocuments({
    organization: organizationId,
    'pages.ocr.status': 'completed',
  });

  const pendingReview = await this.countDocuments({
    organization: organizationId,
    status: 'pending_review',
  });

  return {
    byType: stats,
    total: totalDocuments,
    withOCR,
    pendingReview,
    ocrSuccessRate: totalDocuments > 0 ? (withOCR / totalDocuments) * 100 : 0,
  };
};

// ==================== PRE-SAVE HOOKS ====================

documentSchema.pre('save', function (next) {
  // Update full-text search if OCR completed
  if (this.isModified('pages')) {
    this.updateFullText();
  }

  // Auto-classify if not already classified
  if (!this.autoClassified && this.fullText) {
    this.autoClassifyDocument();
  }

  // Add quality issue flag if needed
  if (
    this.hasQualityIssues &&
    !this.flags.some((f) => f.type === 'poor_quality' && !f.resolvedAt)
  ) {
    this.addFlag('poor_quality', 'One or more pages have quality issues', 'medium');
  }

  next();
});

/**
 * Auto-classify document based on OCR text
 */
documentSchema.methods.autoClassifyDocument = function () {
  const text = this.fullText?.toLowerCase() || '';

  const classifications = {
    prescription: ['prescription', 'rx', 'medication', 'dosage', 'refills'],
    insurance_card: ['insurance', 'member id', 'group number', 'health plan'],
    id_card: ['driver', 'license', 'state id', 'identification'],
    lab_result: ['laboratory', 'test results', 'specimen', 'reference range'],
    vaccination_record: ['vaccination', 'immunization', 'vaccine', 'covid'],
  };

  let maxMatches = 0;
  let suggestedType = null;

  Object.entries(classifications).forEach(([type, keywords]) => {
    const matches = keywords.filter((keyword) => text.includes(keyword)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      suggestedType = type;
    }
  });

  if (suggestedType && maxMatches >= 2) {
    this.suggestedType = suggestedType;
    this.classificationConfidence = Math.min(95, maxMatches * 20);
    this.autoClassified = true;
  }
};

module.exports = mongoose.model('Document', documentSchema);
