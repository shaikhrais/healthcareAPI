const mongoose = require('mongoose');

/**
 * Prior Authorization Model
 *
 * Manages prior authorization requests and approvals for medical services
 */

// eslint-disable-next-line no-unused-vars

const priorAuthorizationSchema = new mongoose.Schema(
  {
    // Authorization identification
    authorizationNumber: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      index: true,
    },

    referenceNumber: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
      // External reference number from insurance company
    },

    // Associated entities
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },

    patientInfo: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      dateOfBirth: { type: Date, required: true },
      memberId: { type: String, required: true },
      phone: String,
    },

    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    providerInfo: {
      npi: { type: String, required: true },
      name: { type: String, required: true },
      phone: String,
      fax: String,
    },

    facility: {
      name: String,
      npi: String,
      address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
      },
      phone: String,
    },

    // Insurance information
    insurance: {
      payerId: { type: String, required: true },
      payerName: { type: String, required: true },
      policyNumber: { type: String, required: true },
      groupNumber: String,
      planName: String,
      planType: {
        type: String,
        enum: ['HMO', 'PPO', 'EPO', 'POS', 'HDHP', 'Medicare', 'Medicaid', 'Other'],
      },
      phoneNumber: String,
      faxNumber: String,
      authorizationPhone: String, // Dedicated auth line
    },

    // Service details
    serviceType: {
      type: String,
      enum: [
        'inpatient_admission',
        'outpatient_surgery',
        'diagnostic_test',
        'imaging',
        'durable_medical_equipment',
        'home_health',
        'skilled_nursing',
        'physical_therapy',
        'occupational_therapy',
        'speech_therapy',
        'mental_health',
        'substance_abuse',
        'prescription_drug',
        'specialty_medication',
        'specialist_visit',
        'procedure',
        'other',
      ],
      required: true,
      index: true,
    },

    serviceDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    // Procedure/diagnosis codes
    procedureCodes: [
      {
        code: { type: String, required: true },
        codeType: { type: String, enum: ['CPT', 'HCPCS', 'ICD-10-PCS'], default: 'CPT' },
        description: String,
        quantity: { type: Number, default: 1 },
        modifier: String,
      },
    ],

    diagnosisCodes: [
      {
        code: { type: String, required: true },
        codeType: { type: String, enum: ['ICD-10', 'ICD-9'], default: 'ICD-10' },
        description: String,
        isPrimary: { type: Boolean, default: false },
      },
    ],

    // Clinical information
    clinical: {
      diagnosis: String,
      symptoms: String,
      clinicalJustification: String,
      medicalNecessity: String,
      previousTreatments: String,
      attachedDocuments: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'ClaimAttachment',
        },
      ],
    },

    // Service dates and frequency
    serviceDetails: {
      requestedStartDate: { type: Date, required: true },
      requestedEndDate: Date,
      urgency: {
        type: String,
        enum: ['routine', 'urgent', 'emergency'],
        default: 'routine',
      },
      numberOfVisits: Number,
      frequency: String, // e.g., "3x per week", "every 2 weeks"
      duration: String, // e.g., "4 weeks", "6 months"
      location: {
        type: String,
        enum: [
          'office',
          'hospital_inpatient',
          'hospital_outpatient',
          'home',
          'skilled_nursing',
          'other',
        ],
      },
    },

    // Authorization status
    status: {
      type: String,
      enum: [
        'draft',
        'pending_submission',
        'submitted',
        'in_review',
        'approved',
        'partial_approval',
        'denied',
        'expired',
        'cancelled',
        'appealed',
        'appeal_approved',
        'appeal_denied',
      ],
      default: 'draft',
      required: true,
      index: true,
    },

    // Authorization decision
    decision: {
      approved: Boolean,
      approvedDate: Date,
      approvedBy: String, // Insurance reviewer name

      deniedDate: Date,
      denialReason: String,
      denialCode: String,

      effectiveDate: { type: Date, index: true },
      expirationDate: { type: Date, index: true },

      authorizedServices: [
        {
          procedureCode: String,
          description: String,
          quantity: Number,
          quantityUsed: { type: Number, default: 0 },
          quantityRemaining: Number,
          startDate: Date,
          endDate: Date,
        },
      ],

      conditions: [String], // Conditions or restrictions on the authorization
      notes: String,
    },

    // Partial approval details (when some services approved, others denied)
    partialApproval: {
      approvedServices: [
        {
          procedureCode: String,
          quantity: Number,
          notes: String,
        },
      ],
      deniedServices: [
        {
          procedureCode: String,
          denialReason: String,
        },
      ],
    },

    // Submission tracking
    submission: {
      method: {
        type: String,
        enum: ['phone', 'fax', 'portal', 'edi', 'mail', 'email'],
      },
      submittedDate: Date,
      submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      confirmationNumber: String,
      contactPerson: String,
      contactPhone: String,
      expectedResponseDate: Date,
      followUpDate: Date,
    },

    // Communication log
    communications: [
      {
        date: { type: Date, default: Date.now },
        type: {
          type: String,
          enum: ['phone', 'fax', 'email', 'portal', 'mail', 'in_person'],
        },
        direction: {
          type: String,
          enum: ['inbound', 'outbound'],
        },
        contactPerson: String,
        contactPhone: String,
        subject: String,
        notes: String,
        outcome: String,
        followUpRequired: Boolean,
        followUpDate: Date,
        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],

    // Appeal information
    appeal: {
      isAppealed: { type: Boolean, default: false },
      appealDate: Date,
      appealReason: String,
      appealSubmittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      appealDocuments: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'ClaimAttachment',
        },
      ],
      appealDecisionDate: Date,
      appealDecision: String,
      appealOutcome: {
        type: String,
        enum: ['approved', 'partial_approval', 'denied', 'pending'],
      },
    },

    // Utilization tracking
    utilization: [
      {
        claim: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Claim',
        },
        serviceDate: Date,
        procedureCode: String,
        quantity: { type: Number, default: 1 },
        notes: String,
        recordedAt: { type: Date, default: Date.now },
      },
    ],

    // Alerts and notifications
    alerts: [
      {
        type: {
          type: String,
          enum: [
            'expiring_soon',
            'expired',
            'utilization_threshold',
            'follow_up_needed',
            'denial',
            'other',
          ],
        },
        message: String,
        severity: {
          type: String,
          enum: ['info', 'warning', 'critical'],
        },
        createdAt: { type: Date, default: Date.now },
        acknowledged: { type: Boolean, default: false },
        acknowledgedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        acknowledgedAt: Date,
      },
    ],

    // Workflow tracking
    workflow: {
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      reviewedAt: Date,
      statusHistory: [
        {
          status: String,
          date: { type: Date, default: Date.now },
          changedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
          reason: String,
          notes: String,
        },
      ],
    },

    // Priority and flags
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
      index: true,
    },

    flags: {
      requiresReview: { type: Boolean, default: false },
      requiresManagerApproval: { type: Boolean, default: false },
      isPeerToPeerScheduled: { type: Boolean, default: false },
      peerToPeerDate: Date,
      hasComplications: { type: Boolean, default: false },
      isReconsideration: { type: Boolean, default: false },
    },

    // Tags and notes
    tags: [String],
    internalNotes: String,
    externalNotes: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
// DUPLICATE INDEX - Auto-commented by deduplication tool
// priorAuthorizationSchema.index({ patient: 1, status: 1 });
priorAuthorizationSchema.index({ provider: 1, status: 1 });
priorAuthorizationSchema.index({ 'insurance.payerId': 1, status: 1 });
priorAuthorizationSchema.index({ 'decision.effectiveDate': 1, 'decision.expirationDate': 1 });
priorAuthorizationSchema.index({ 'serviceDetails.requestedStartDate': 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// priorAuthorizationSchema.index({ priority: 1, status: 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// priorAuthorizationSchema.index({ createdAt: -1 });

// Pre-save middleware
priorAuthorizationSchema.pre('save', function (next) {
  // Generate authorization number if not present
  if (!this.authorizationNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    this.authorizationNumber = `PA-${timestamp}-${random}`;
  }

  // Update quantity remaining for authorized services
  if (this.decision.authorizedServices && this.decision.authorizedServices.length > 0) {
    this.decision.authorizedServices.forEach((service) => {
      if (service.quantity && service.quantityUsed !== undefined) {
        service.quantityRemaining = service.quantity - service.quantityUsed;
      }
    });
  }

  // Auto-expire if expiration date passed
  if (this.decision.expirationDate && new Date() > this.decision.expirationDate) {
    if (this.status === 'approved' || this.status === 'partial_approval') {
      this.status = 'expired';
    }
  }

  next();
});

// Instance methods

/**
 * Check if authorization is active
 */
priorAuthorizationSchema.methods.isActive = function () {
  if (this.status !== 'approved' && this.status !== 'partial_approval') {
    return false;
  }

  if (!this.decision.effectiveDate || !this.decision.expirationDate) {
    return false;
  }

  const now = new Date();
  return now >= this.decision.effectiveDate && now <= this.decision.expirationDate;
};

/**
 * Check if authorization is expiring soon
 */
priorAuthorizationSchema.methods.isExpiringSoon = function (daysThreshold = 30) {
  if (!this.decision.expirationDate) return false;

  const now = new Date();
  const daysUntilExpiration = Math.ceil(
    (this.decision.expirationDate - now) / (1000 * 60 * 60 * 24)
  );

  return daysUntilExpiration > 0 && daysUntilExpiration <= daysThreshold;
};

/**
 * Get days until expiration
 */
priorAuthorizationSchema.methods.getDaysUntilExpiration = function () {
  if (!this.decision.expirationDate) return null;

  const now = new Date();
  const days = Math.ceil((this.decision.expirationDate - now) / (1000 * 60 * 60 * 24));

  return days;
};

/**
 * Check if utilization is near limit
 */
priorAuthorizationSchema.methods.isUtilizationNearLimit = function (thresholdPercent = 80) {
  if (!this.decision.authorizedServices || this.decision.authorizedServices.length === 0) {
    return false;
  }

  return this.decision.authorizedServices.some((service) => {
    if (!service.quantity || service.quantity === 0) return false;
    const utilizationPercent = (service.quantityUsed / service.quantity) * 100;
    return utilizationPercent >= thresholdPercent;
  });
};

/**
 * Add communication log entry
 */
priorAuthorizationSchema.methods.logCommunication = function (data) {
  this.communications.push({
    date: data.date || new Date(),
    type: data.type,
    direction: data.direction,
    contactPerson: data.contactPerson,
    contactPhone: data.contactPhone,
    subject: data.subject,
    notes: data.notes,
    outcome: data.outcome,
    followUpRequired: data.followUpRequired,
    followUpDate: data.followUpDate,
    performedBy: data.performedBy,
  });
};

/**
 * Add status change to history
 */
priorAuthorizationSchema.methods.changeStatus = function (newStatus, userId, reason, notes) {
  const oldStatus = this.status;
  this.status = newStatus;

  this.workflow.statusHistory.push({
    status: newStatus,
    date: new Date(),
    changedBy: userId,
    reason,
    notes,
  });

  this.workflow.lastModifiedBy = userId;

  // Auto-add alerts for certain status changes
  if (newStatus === 'denied') {
    this.addAlert('denial', 'Authorization was denied', 'critical');
  } else if (newStatus === 'expired') {
    this.addAlert('expired', 'Authorization has expired', 'warning');
  }
};

/**
 * Record utilization
 */
priorAuthorizationSchema.methods.recordUtilization = function (utilizationData) {
  this.utilization.push({
    claim: utilizationData.claimId,
    serviceDate: utilizationData.serviceDate,
    procedureCode: utilizationData.procedureCode,
    quantity: utilizationData.quantity || 1,
    notes: utilizationData.notes,
    recordedAt: new Date(),
  });

  // Update quantityUsed in authorized services
  const service = this.decision.authorizedServices?.find(
    (s) => s.procedureCode === utilizationData.procedureCode
  );

  if (service) {
    service.quantityUsed = (service.quantityUsed || 0) + (utilizationData.quantity || 1);
    service.quantityRemaining = service.quantity - service.quantityUsed;

    // Check if near limit
    if (this.isUtilizationNearLimit()) {
      this.addAlert(
        'utilization_threshold',
        `Authorization utilization at ${Math.round((service.quantityUsed / service.quantity) * 100)}%`,
        'warning'
      );
    }
  }
};

/**
 * Add alert
 */
priorAuthorizationSchema.methods.addAlert = function (type, message, severity = 'info') {
  this.alerts.push({
    type,
    message,
    severity,
    createdAt: new Date(),
    acknowledged: false,
  });
};

/**
 * Acknowledge alert
 */
priorAuthorizationSchema.methods.acknowledgeAlert = function (alertId, userId) {
  const alert = this.alerts.id(alertId);
  if (alert) {
    alert.acknowledged = true;
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date();
  }
};

/**
 * Submit for approval
 */
priorAuthorizationSchema.methods.submit = function (userId, method, confirmationNumber) {
  this.status = 'submitted';
  this.submission = {
    method,
    submittedDate: new Date(),
    submittedBy: userId,
    confirmationNumber,
  };

  this.changeStatus('submitted', userId, 'Submitted for authorization', null);
};

/**
 * Approve authorization
 */
priorAuthorizationSchema.methods.approve = function (approvalData, userId) {
  this.status = 'approved';

  this.decision = {
    approved: true,
    approvedDate: new Date(),
    approvedBy: approvalData.approvedBy,
    effectiveDate: approvalData.effectiveDate,
    expirationDate: approvalData.expirationDate,
    authorizedServices: approvalData.authorizedServices || [],
    conditions: approvalData.conditions || [],
    notes: approvalData.notes,
  };

  this.changeStatus('approved', userId, 'Authorization approved', approvalData.notes);
};

/**
 * Deny authorization
 */
priorAuthorizationSchema.methods.deny = function (denialData, userId) {
  this.status = 'denied';

  this.decision = {
    approved: false,
    deniedDate: new Date(),
    denialReason: denialData.reason,
    denialCode: denialData.code,
    notes: denialData.notes,
  };

  this.changeStatus('denied', userId, denialData.reason, denialData.notes);
  this.addAlert('denial', `Denied: ${denialData.reason}`, 'critical');
};

/**
 * Initiate appeal
 */
priorAuthorizationSchema.methods.initiateAppeal = function (appealData, userId) {
  this.status = 'appealed';

  this.appeal = {
    isAppealed: true,
    appealDate: new Date(),
    appealReason: appealData.reason,
    appealSubmittedBy: userId,
    appealDocuments: appealData.documents || [],
    appealOutcome: 'pending',
  };

  this.changeStatus('appealed', userId, 'Appeal initiated', appealData.reason);
};

// Static methods

/**
 * Get active authorizations for patient
 */
priorAuthorizationSchema.statics.getActiveForPatient = function (patientId) {
  const now = new Date();
  return this.find({
    patient: patientId,
    status: { $in: ['approved', 'partial_approval'] },
    'decision.effectiveDate': { $lte: now },
    'decision.expirationDate': { $gte: now },
  }).sort({ 'decision.expirationDate': 1 });
};

/**
 * Get expiring authorizations
 */
priorAuthorizationSchema.statics.getExpiring = function (daysThreshold = 30) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysThreshold);

  return this.find({
    status: { $in: ['approved', 'partial_approval'] },
    'decision.expirationDate': {
      $gte: now,
      $lte: futureDate,
    },
  })
    .populate('patient', 'firstName lastName')
    .populate('provider', 'firstName lastName')
    .sort({ 'decision.expirationDate': 1 });
};

/**
 * Get expired authorizations
 */
priorAuthorizationSchema.statics.getExpired = function () {
  const now = new Date();
  return this.find({
    status: { $in: ['approved', 'partial_approval'] },
    'decision.expirationDate': { $lt: now },
  });
};

/**
 * Get pending authorizations
 */
priorAuthorizationSchema.statics.getPending = function () {
  return this.find({
    status: { $in: ['submitted', 'in_review'] },
  })
    .populate('patient', 'firstName lastName')
    .populate('provider', 'firstName lastName')
    .sort({ 'submission.submittedDate': 1 });
};

/**
 * Get authorizations requiring follow-up
 */
priorAuthorizationSchema.statics.getRequiringFollowUp = function () {
  const now = new Date();
  return this.find({
    status: { $in: ['submitted', 'in_review'] },
    'submission.followUpDate': { $lte: now },
  })
    .populate('patient', 'firstName lastName')
    .sort({ 'submission.followUpDate': 1 });
};

/**
 * Get statistics
 */
priorAuthorizationSchema.statics.getStatistics = async function (startDate, endDate) {
  const filter = {};
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const [total, byStatus, byServiceType, approved, denied, pending, expired] = await Promise.all([
    this.countDocuments(filter),
    this.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    this.aggregate([{ $match: filter }, { $group: { _id: '$serviceType', count: { $sum: 1 } } }]),
    this.countDocuments({ ...filter, status: 'approved' }),
    this.countDocuments({ ...filter, status: 'denied' }),
    this.countDocuments({ ...filter, status: { $in: ['submitted', 'in_review'] } }),
    this.countDocuments({ ...filter, status: 'expired' }),
  ]);

  const totalDecided = approved + denied;
  const approvalRate = totalDecided > 0 ? ((approved / totalDecided) * 100).toFixed(2) : 0;

  return {
    total,
    byStatus: byStatus.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    byServiceType: byServiceType.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    approved,
    denied,
    pending,
    expired,
    approvalRate,
  };
};

const PriorAuthorization = mongoose.model('PriorAuthorization', priorAuthorizationSchema);

module.exports = PriorAuthorization;
