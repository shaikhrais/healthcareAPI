const mongoose = require('mongoose');

/**
 * Family Member Model
 *
 * Manages family relationships and dependent accounts
 * Features:
 * - Link family members to primary account holder
 * - Manage dependent information
 * - Share insurance and payment methods
 * - Family-wide appointment scheduling
 * - Access control and permissions
 * - Emergency contacts
 */

// eslint-disable-next-line no-unused-vars

const familyMemberSchema = new mongoose.Schema(
  {
    // Primary Account Holder (Parent/Guardian)
    primaryPatientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },

    // Family Member Information
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      index: true,
    }, // If member has their own patient account

    // If member doesn't have patient account yet, store basic info
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
    },

    // Relationship to Primary Account Holder
    relationship: {
      type: String,
      required: true,
      enum: [
        'spouse',
        'partner',
        'child',
        'parent',
        'grandparent',
        'grandchild',
        'sibling',
        'other_dependent',
        'other',
      ],
    },
    relationshipDetails: {
      type: String, // Additional details if relationship is 'other'
    },

    // Legal Guardian Information (if member is a minor)
    isMinor: {
      type: Boolean,
      default: false,
    },
    legalGuardians: [
      {
        guardianId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Patient',
        },
        name: String,
        relationship: String,
        phone: String,
        email: String,
        isPrimary: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // Permissions and Access Control
    permissions: {
      canScheduleAppointments: {
        type: Boolean,
        default: false,
      },
      canViewMedicalRecords: {
        type: Boolean,
        default: false,
      },
      canMakePayments: {
        type: Boolean,
        default: false,
      },
      canUpdateProfile: {
        type: Boolean,
        default: false,
      },
      canReceiveNotifications: {
        type: Boolean,
        default: true,
      },
      canAccessPortal: {
        type: Boolean,
        default: false,
      },
    },

    // Consent and Authorization
    consents: [
      {
        consentType: {
          type: String,
          enum: [
            'medical_treatment',
            'information_sharing',
            'privacy_policy',
            'financial_responsibility',
            'portal_access',
          ],
        },
        consentGivenBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Patient',
        },
        consentDate: {
          type: Date,
          default: Date.now,
        },
        consentDocument: String, // URL to signed consent form
        expirationDate: Date,
      },
    ],

    // Shared Resources
    sharedResources: {
      shareInsurance: {
        type: Boolean,
        default: false,
      },
      insuranceCardId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InsuranceCard',
      },
      sharePaymentMethods: {
        type: Boolean,
        default: false,
      },
      paymentMethodIds: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'PaymentMethod',
        },
      ],
      shareAddress: {
        type: Boolean,
        default: true,
      },
    },

    // Address (if different from primary)
    address: {
      street: String,
      unit: String,
      city: String,
      state: String,
      zipCode: String,
      country: {
        type: String,
        default: 'USA',
      },
      isSameAsPrimary: {
        type: Boolean,
        default: true,
      },
    },

    // Emergency Contact (if different from primary)
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
      alternatePhone: String,
      email: String,
    },

    // Medical Information Summary
    medicalInfo: {
      allergies: [String],
      medications: [String],
      chronicConditions: [String],
      specialNeeds: String,
      notes: String,
    },

    // Preferences
    preferences: {
      preferredLanguage: {
        type: String,
        default: 'en',
      },
      communicationPreference: {
        type: String,
        enum: ['email', 'sms', 'phone', 'portal'],
        default: 'email',
      },
      receiveReminders: {
        type: Boolean,
        default: true,
      },
      receivePromotions: {
        type: Boolean,
        default: false,
      },
    },

    // Status
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending', 'removed'],
      default: 'active',
      index: true,
    },
    activatedAt: Date,
    inactivatedAt: Date,
    inactivatedReason: String,

    // Invitation (if member is invited to create their own account)
    invitation: {
      status: {
        type: String,
        enum: ['not_sent', 'sent', 'accepted', 'declined', 'expired'],
        default: 'not_sent',
      },
      sentAt: Date,
      acceptedAt: Date,
      declinedAt: Date,
      expiresAt: Date,
      invitationToken: String,
      invitationEmail: String,
    },

    // Account Linking
    accountLinking: {
      hasOwnAccount: {
        type: Boolean,
        default: false,
      },
      linkedAt: Date,
      linkingMethod: {
        type: String,
        enum: ['invitation', 'manual', 'automatic'],
      },
    },

    // Activity Tracking
    lastAppointment: Date,
    totalAppointments: {
      type: Number,
      default: 0,
    },
    upcomingAppointments: {
      type: Number,
      default: 0,
    },

    // Notes and Tags
    notes: String,
    tags: [String],
    flags: [
      {
        type: {
          type: String,
          enum: ['needs_consent', 'missing_info', 'insurance_expired', 'guardian_needed'],
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
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
    },
  },
  {
    timestamps: true,
  }
);

// ==================== INDEXES ====================

familyMemberSchema.index({ primaryPatientId: 1, status: 1 });
familyMemberSchema.index({ patientId: 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// familyMemberSchema.index({ organization: 1, status: 1 });
familyMemberSchema.index({ email: 1 });
familyMemberSchema.index({ 'invitation.status': 1 });

// ==================== VIRTUAL FIELDS ====================

familyMemberSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

familyMemberSchema.virtual('age').get(function () {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
});

familyMemberSchema.virtual('isAdult').get(function () {
  return this.age >= 18;
});

familyMemberSchema.virtual('needsGuardianConsent').get(function () {
  return this.isMinor && this.legalGuardians.length === 0;
});

// ==================== INSTANCE METHODS ====================

/**
 * Create patient account for family member
 */
familyMemberSchema.methods.createPatientAccount = async function () {
  const Patient = require('./Patient');

  // Check if already has an account
  if (this.patientId) {
    throw new Error('Family member already has a patient account');
  }

  // Create new patient
  const patient = new Patient({
    firstName: this.firstName,
    lastName: this.lastName,
    dateOfBirth: this.dateOfBirth,
    gender: this.gender,
    email: this.email,
    phone: this.phone,
    address: this.address.isSameAsPrimary ? undefined : this.address,
    emergencyContact: this.emergencyContact,
    organization: this.organization,
    accountType: 'dependent',
    primaryAccountHolder: this.primaryPatientId,
  });

  await patient.save();

  // Link to this family member
  this.patientId = patient._id;
  this.accountLinking.hasOwnAccount = true;
  this.accountLinking.linkedAt = new Date();
  this.accountLinking.linkingMethod = 'manual';

  await this.save();

  return patient;
};

/**
 * Send invitation to create account
 */
familyMemberSchema.methods.sendInvitation = async function () {
  if (!this.email) {
    throw new Error('Email is required to send invitation');
  }

  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');

  this.invitation.status = 'sent';
  this.invitation.sentAt = new Date();
  this.invitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  this.invitation.invitationToken = token;
  this.invitation.invitationEmail = this.email;

  await this.save();

  // In production, send email with invitation link
  // await emailService.sendFamilyInvitation(this);

  return token;
};

/**
 * Accept invitation
 */
familyMemberSchema.methods.acceptInvitation = async function (patientId) {
  if (this.invitation.status !== 'sent') {
    throw new Error('No pending invitation');
  }

  if (this.invitation.expiresAt < new Date()) {
    this.invitation.status = 'expired';
    await this.save();
    throw new Error('Invitation has expired');
  }

  this.invitation.status = 'accepted';
  this.invitation.acceptedAt = new Date();
  this.patientId = patientId;
  this.accountLinking.hasOwnAccount = true;
  this.accountLinking.linkedAt = new Date();
  this.accountLinking.linkingMethod = 'invitation';
  this.status = 'active';
  this.activatedAt = new Date();

  await this.save();
};

/**
 * Update permissions
 */
familyMemberSchema.methods.updatePermissions = async function (permissions) {
  Object.keys(permissions).forEach((key) => {
    if (this.permissions[key] !== undefined) {
      this.permissions[key] = permissions[key];
    }
  });

  await this.save();
};

/**
 * Add consent
 */
familyMemberSchema.methods.addConsent = function (
  consentType,
  givenBy,
  documentUrl,
  expirationDate
) {
  this.consents.push({
    consentType,
    consentGivenBy: givenBy,
    consentDate: new Date(),
    consentDocument: documentUrl,
    expirationDate,
  });

  // Remove flags if consent added
  if (consentType === 'medical_treatment') {
    this.flags = this.flags.filter((f) => f.type !== 'needs_consent' || f.resolvedAt);
  }
};

/**
 * Check if consent is valid
 */
familyMemberSchema.methods.hasValidConsent = function (consentType) {
  const consent = this.consents.find(
    (c) => c.consentType === consentType && (!c.expirationDate || c.expirationDate > new Date())
  );

  return !!consent;
};

/**
 * Remove family member
 */
familyMemberSchema.methods.remove = async function (reason) {
  this.status = 'removed';
  this.inactivatedAt = new Date();
  this.inactivatedReason = reason;

  await this.save();
};

/**
 * Add flag
 */
familyMemberSchema.methods.addFlag = function (type, message, severity = 'medium') {
  this.flags.push({
    type,
    message,
    severity,
  });
};

/**
 * Resolve flag
 */
familyMemberSchema.methods.resolveFlag = function (flagId) {
  const flag = this.flags.id(flagId);
  if (flag) {
    flag.resolvedAt = new Date();
  }
};

/**
 * Update appointment counts
 */
familyMemberSchema.methods.updateAppointmentCounts = async function () {
  const Appointment = require('./Appointment');

  const [total, upcoming] = await Promise.all([
    Appointment.countDocuments({
      patient: this.patientId,
      status: 'completed',
    }),
    Appointment.countDocuments({
      patient: this.patientId,
      status: { $in: ['scheduled', 'confirmed'] },
      startTime: { $gte: new Date() },
    }),
  ]);

  this.totalAppointments = total;
  this.upcomingAppointments = upcoming;

  const lastAppt = await Appointment.findOne({
    patient: this.patientId,
    status: 'completed',
  }).sort({ endTime: -1 });

  if (lastAppt) {
    this.lastAppointment = lastAppt.endTime;
  }

  await this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Get family members for primary patient
 */
familyMemberSchema.statics.getFamilyMembers = async function (
  primaryPatientId,
  includeInactive = false
) {
  const query = {
    primaryPatientId,
  };

  if (!includeInactive) {
    query.status = 'active';
  }

  return this.find(query)
    .populate('patientId', 'firstName lastName email phone')
    .populate('primaryPatientId', 'firstName lastName')
    .sort({ relationship: 1, lastName: 1, firstName: 1 });
};

/**
 * Get family member by patient ID
 */
familyMemberSchema.statics.getByPatientId = async function (patientId) {
  return this.findOne({ patientId })
    .populate('primaryPatientId', 'firstName lastName email phone')
    .populate('patientId', 'firstName lastName email phone');
};

/**
 * Get pending invitations
 */
familyMemberSchema.statics.getPendingInvitations = async function (primaryPatientId) {
  return this.find({
    primaryPatientId,
    'invitation.status': 'sent',
    'invitation.expiresAt': { $gt: new Date() },
  });
};

/**
 * Find by invitation token
 */
familyMemberSchema.statics.findByInvitationToken = async function (token) {
  return this.findOne({
    'invitation.invitationToken': token,
    'invitation.status': 'sent',
    'invitation.expiresAt': { $gt: new Date() },
  });
};

/**
 * Get minors without guardian consent
 */
familyMemberSchema.statics.getMinorsNeedingConsent = async function (organizationId) {
  return this.find({
    organization: organizationId,
    isMinor: true,
    status: 'active',
    consents: { $size: 0 },
  })
    .populate('primaryPatientId', 'firstName lastName email phone')
    .sort({ dateOfBirth: -1 });
};

/**
 * Get family statistics
 */
familyMemberSchema.statics.getFamilyStatistics = async function (primaryPatientId) {
  const members = await this.find({ primaryPatientId });

  return {
    totalMembers: members.length,
    activeMembers: members.filter((m) => m.status === 'active').length,
    minors: members.filter((m) => m.isMinor).length,
    withOwnAccount: members.filter((m) => m.accountLinking.hasOwnAccount).length,
    pendingInvitations: members.filter((m) => m.invitation.status === 'sent').length,
    needingConsent: members.filter((m) => m.needsGuardianConsent).length,
  };
};

/**
 * Search family members across organization
 */
familyMemberSchema.statics.searchMembers = async function (organizationId, searchTerm) {
  const regex = new RegExp(searchTerm, 'i');

  return this.find({
    organization: organizationId,
    $or: [{ firstName: regex }, { lastName: regex }, { email: regex }, { phone: regex }],
  })
    .populate('primaryPatientId', 'firstName lastName')
    .populate('patientId', 'firstName lastName')
    .limit(20);
};

// ==================== PRE-SAVE HOOKS ====================

familyMemberSchema.pre('save', function (next) {
  // Determine if minor
  if (this.dateOfBirth) {
    this.isMinor = this.age < 18;
  }

  // Add guardian consent flag if needed
  if (
    this.isMinor &&
    this.legalGuardians.length === 0 &&
    !this.hasValidConsent('medical_treatment')
  ) {
    if (!this.flags.some((f) => f.type === 'guardian_needed' && !f.resolvedAt)) {
      this.addFlag('guardian_needed', 'Minor requires legal guardian information', 'high');
    }
    if (!this.flags.some((f) => f.type === 'needs_consent' && !f.resolvedAt)) {
      this.addFlag('needs_consent', 'Guardian consent required for medical treatment', 'high');
    }
  }

  // Check for missing information
  if (!this.email && !this.phone && this.status === 'active') {
    if (!this.flags.some((f) => f.type === 'missing_info' && !f.resolvedAt)) {
      this.addFlag('missing_info', 'Missing contact information', 'medium');
    }
  }

  // Set activation date
  if (this.isModified('status') && this.status === 'active' && !this.activatedAt) {
    this.activatedAt = new Date();
  }

  next();
});

module.exports = mongoose.model('FamilyMember', familyMemberSchema);
