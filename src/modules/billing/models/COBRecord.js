const mongoose = require('mongoose');

/**
 * COB Record Model
 *
 * Tracks coordination of benefits history and decisions
 */

// eslint-disable-next-line no-unused-vars

const insurancePlanSchema = new mongoose.Schema(
  {
    payerId: {
      type: String,
      required: true,
      trim: true,
    },
    payerName: {
      type: String,
      trim: true,
    },
    policyNumber: {
      type: String,
      required: true,
      trim: true,
    },
    groupNumber: {
      type: String,
      trim: true,
    },
    planName: {
      type: String,
      trim: true,
    },
    relationshipToInsured: {
      type: String,
      enum: ['self', 'spouse', 'child', 'other'],
      required: true,
    },
    insured: {
      firstName: { type: String, trim: true },
      lastName: { type: String, trim: true },
      dateOfBirth: { type: Date },
      ssn: { type: String, trim: true }, // Encrypted
      employerName: { type: String, trim: true },
      employmentStatus: {
        type: String,
        enum: ['active', 'retired', 'cobra', 'disabled', 'unemployed'],
      },
    },
    coverageType: {
      type: String,
      enum: [
        'commercial',
        'medicare',
        'medicaid',
        'tricare',
        'workers_comp',
        'auto_insurance',
        'other',
      ],
    },
    effectiveDate: {
      type: Date,
    },
    terminationDate: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    priority: {
      type: Number, // 1 = primary, 2 = secondary, 3 = tertiary
      min: 1,
      max: 10,
    },
  },
  { _id: false }
);

const cobDecisionSchema = new mongoose.Schema(
  {
    rule: {
      type: String,
      enum: [
        'self_coverage',
        'birthday_rule',
        'active_inactive',
        'medicare_working_aged',
        'medicare_esrd',
        'medicare_disabled',
        'gender_rule',
        'cobra_continuation',
        'custodial_parent',
        'court_order',
        'coordination_provision',
        'manual_override',
      ],
      required: true,
    },
    ruleDescription: {
      type: String,
      trim: true,
    },
    appliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    confidence: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'high',
    },
    reasoning: {
      type: String,
      trim: true,
    },
    overridden: {
      type: Boolean,
      default: false,
    },
    overrideReason: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const cobRecordSchema = new mongoose.Schema(
  {
    // Patient reference
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Service date (for time-specific COB)
    serviceDate: {
      type: Date,
      required: true,
      index: true,
    },

    // All insurance plans
    insurancePlans: {
      type: [insurancePlanSchema],
      validate: {
        validator(v) {
          return v && v.length > 0 && v.length <= 10;
        },
        message: 'Must have between 1 and 10 insurance plans',
      },
    },

    // Determined COB order
    cobOrder: [
      {
        planIndex: {
          type: Number,
          required: true,
        },
        priority: {
          type: Number,
          required: true,
        },
        payerId: {
          type: String,
          required: true,
        },
        policyNumber: {
          type: String,
          required: true,
        },
      },
    ],

    // Decision trail
    decisions: [cobDecisionSchema],

    // Primary decision
    primaryDecision: {
      planIndex: { type: Number },
      rule: { type: String },
      appliedAt: { type: Date },
    },

    // Status
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending_verification', 'conflict', 'needs_review'],
      default: 'active',
      index: true,
    },

    // Conflicts
    conflicts: [
      {
        type: {
          type: String,
          enum: [
            'multiple_primary',
            'date_overlap',
            'rule_conflict',
            'missing_information',
            'verification_failed',
          ],
        },
        description: {
          type: String,
          trim: true,
        },
        severity: {
          type: String,
          enum: ['critical', 'high', 'medium', 'low'],
        },
        resolved: {
          type: Boolean,
          default: false,
        },
        resolvedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        resolvedAt: {
          type: Date,
        },
        resolution: {
          type: String,
          trim: true,
        },
      },
    ],

    // Verification
    verification: {
      lastVerified: {
        type: Date,
      },
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      method: {
        type: String,
        enum: ['manual', 'eligibility_api', 'phone', 'portal', 'other'],
      },
      status: {
        type: String,
        enum: ['verified', 'unverified', 'failed', 'pending'],
      },
      notes: {
        type: String,
        trim: true,
      },
    },

    // Special situations
    specialSituations: [
      {
        type: {
          type: String,
          enum: [
            'workers_comp',
            'auto_accident',
            'litigation',
            'third_party_liability',
            'subrogation',
            'coordination_of_care',
          ],
        },
        active: {
          type: Boolean,
          default: true,
        },
        startDate: {
          type: Date,
        },
        endDate: {
          type: Date,
        },
        notes: {
          type: String,
          trim: true,
        },
        documents: [
          {
            type: { type: String },
            url: { type: String },
            uploadDate: { type: Date, default: Date.now },
          },
        ],
      },
    ],

    // Claims associated with this COB record
    claims: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Claim',
      },
    ],

    // Audit trail
    auditTrail: [
      {
        action: {
          type: String,
          enum: [
            'created',
            'updated',
            'verified',
            'conflict_detected',
            'conflict_resolved',
            'order_changed',
            'plan_added',
            'plan_removed',
            'manual_override',
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
        changes: {
          type: mongoose.Schema.Types.Mixed,
        },
        notes: {
          type: String,
          trim: true,
        },
      },
    ],

    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Effective dates
    effectiveDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    expirationDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
cobRecordSchema.index({ patient: 1, serviceDate: -1 });
cobRecordSchema.index({ patient: 1, effectiveDate: 1, expirationDate: 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// cobRecordSchema.index({ status: 1, createdAt: -1 });
cobRecordSchema.index({ 'insurancePlans.payerId': 1 });
cobRecordSchema.index({ 'conflicts.resolved': 1, 'conflicts.severity': 1 });

// Virtuals

/**
 * Get primary insurance
 */
cobRecordSchema.virtual('primaryInsurance').get(function () {
  if (this.cobOrder.length === 0) return null;
  const primaryOrder = this.cobOrder.find((o) => o.priority === 1);
  if (!primaryOrder) return null;
  return this.insurancePlans[primaryOrder.planIndex];
});

/**
 * Get secondary insurance
 */
cobRecordSchema.virtual('secondaryInsurance').get(function () {
  if (this.cobOrder.length < 2) return null;
  const secondaryOrder = this.cobOrder.find((o) => o.priority === 2);
  if (!secondaryOrder) return null;
  return this.insurancePlans[secondaryOrder.planIndex];
});

/**
 * Get tertiary insurance
 */
cobRecordSchema.virtual('tertiaryInsurance').get(function () {
  if (this.cobOrder.length < 3) return null;
  const tertiaryOrder = this.cobOrder.find((o) => o.priority === 3);
  if (!tertiaryOrder) return null;
  return this.insurancePlans[tertiaryOrder.planIndex];
});

/**
 * Check if has conflicts
 */
cobRecordSchema.virtual('hasConflicts').get(function () {
  return this.conflicts.some((c) => !c.resolved);
});

/**
 * Get unresolved conflicts
 */
cobRecordSchema.virtual('unresolvedConflicts').get(function () {
  return this.conflicts.filter((c) => !c.resolved);
});

// Instance methods

/**
 * Add insurance plan
 */
cobRecordSchema.methods.addInsurancePlan = function (plan, userId) {
  this.insurancePlans.push(plan);

  this.auditTrail.push({
    action: 'plan_added',
    performedBy: userId,
    changes: { plan },
    notes: `Added ${plan.payerName} - ${plan.policyNumber}`,
  });
};

/**
 * Remove insurance plan
 */
cobRecordSchema.methods.removeInsurancePlan = function (planIndex, userId, reason) {
  const removed = this.insurancePlans[planIndex];
  this.insurancePlans.splice(planIndex, 1);

  // Update COB order
  this.cobOrder = this.cobOrder.filter((o) => o.planIndex !== planIndex);

  this.auditTrail.push({
    action: 'plan_removed',
    performedBy: userId,
    changes: { removed },
    notes: reason || `Removed ${removed.payerName} - ${removed.policyNumber}`,
  });
};

/**
 * Update COB order
 */
cobRecordSchema.methods.updateCOBOrder = function (newOrder, decision, userId) {
  const oldOrder = [...this.cobOrder];
  this.cobOrder = newOrder;

  if (decision) {
    this.decisions.push(decision);
  }

  this.auditTrail.push({
    action: 'order_changed',
    performedBy: userId,
    changes: {
      from: oldOrder,
      to: newOrder,
      decision,
    },
  });
};

/**
 * Add conflict
 */
cobRecordSchema.methods.addConflict = function (conflict, userId) {
  this.conflicts.push(conflict);
  this.status = 'conflict';

  this.auditTrail.push({
    action: 'conflict_detected',
    performedBy: userId,
    changes: { conflict },
    notes: conflict.description,
  });
};

/**
 * Resolve conflict
 */
cobRecordSchema.methods.resolveConflict = function (conflictIndex, resolution, userId) {
  if (this.conflicts[conflictIndex]) {
    this.conflicts[conflictIndex].resolved = true;
    this.conflicts[conflictIndex].resolvedBy = userId;
    this.conflicts[conflictIndex].resolvedAt = new Date();
    this.conflicts[conflictIndex].resolution = resolution;

    // Check if all conflicts resolved
    if (!this.hasConflicts) {
      this.status = 'active';
    }

    this.auditTrail.push({
      action: 'conflict_resolved',
      performedBy: userId,
      changes: {
        conflict: this.conflicts[conflictIndex],
        resolution,
      },
    });
  }
};

/**
 * Verify COB
 */
cobRecordSchema.methods.verify = function (method, status, notes, userId) {
  this.verification = {
    lastVerified: new Date(),
    verifiedBy: userId,
    method,
    status,
    notes,
  };

  this.auditTrail.push({
    action: 'verified',
    performedBy: userId,
    changes: {
      method,
      status,
      notes,
    },
  });
};

/**
 * Check if effective for date
 */
cobRecordSchema.methods.isEffectiveFor = function (date) {
  const checkDate = new Date(date);

  if (checkDate < this.effectiveDate) {
    return false;
  }

  if (this.expirationDate && checkDate > this.expirationDate) {
    return false;
  }

  return true;
};

// Static methods

/**
 * Get active COB for patient and date
 */
cobRecordSchema.statics.getActiveForPatient = function (patientId, serviceDate = new Date()) {
  return this.findOne({
    patient: patientId,
    status: { $nin: ['inactive'] },
    effectiveDate: { $lte: serviceDate },
    $or: [
      { expirationDate: { $exists: false } },
      { expirationDate: null },
      { expirationDate: { $gte: serviceDate } },
    ],
  }).sort({ effectiveDate: -1 });
};

/**
 * Get all COB records for patient
 */
cobRecordSchema.statics.getAllForPatient = function (patientId) {
  return this.find({ patient: patientId }).sort({ effectiveDate: -1 });
};

/**
 * Get records with conflicts
 */
cobRecordSchema.statics.getWithConflicts = function () {
  return this.find({
    'conflicts.resolved': false,
  }).sort({ 'conflicts.severity': -1, createdAt: -1 });
};

/**
 * Get records needing verification
 */
cobRecordSchema.statics.getNeedingVerification = function (daysThreshold = 90) {
  const cutoffDate = new Date(Date.now() - daysThreshold * 24 * 60 * 60 * 1000);

  return this.find({
    status: 'active',
    $or: [
      { 'verification.lastVerified': { $lt: cutoffDate } },
      { 'verification.lastVerified': { $exists: false } },
    ],
  });
};

const COBRecord = mongoose.model('COBRecord', cobRecordSchema);

module.exports = COBRecord;
