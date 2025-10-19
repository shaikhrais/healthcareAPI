const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// eslint-disable-next-line no-unused-vars
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: [
        'owner', // Practice Owner - Highest level access
        'full_access', // Full access to everything
        'admin_billing', // Administrative / All Billing
        'admin_scheduling', // Scheduling Administrator
        'admin_reports', // Reports and Analytics Admin
        'practitioner_frontdesk', // Practitioner / Front Desk
        'practitioner_limited', // Practitioner (Limited)
        'frontdesk_only', // Front Desk Only (no practitioner access)
        'billing_only', // Billing Specialist Only
        'scheduler_only', // Scheduler/Coordinator Only
        'support_staff', // Support Staff (basic access)
        'patient', // Patient portal access
        'no_access', // No administrative access
      ],
      default: 'practitioner_limited',
    },
    services: [
      {
        type: String,
        enum: [
          'RMT',
          'RPT',
          'Physiotherapy',
          'Massage Therapy',
          'Acupuncture',
          'Chiropractic',
          'Administrative',
        ],
      },
    ],
    permissions: {
      accessBilling: {
        type: Boolean,
        default: false,
      },
      viewChartsShared: {
        type: Boolean,
        default: false,
      },
      manageShifts: {
        type: Boolean,
        default: false,
      },
    },
    phone: String,
    avatar: String,
    timezone: {
      type: String,
      default: 'America/New_York',
    },
    preferences: {
      notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        push: { type: Boolean, default: true },
      },
      theme: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'auto',
      },
    },
    active: {
      type: Boolean,
      default: true,
    },
    // Password reset fields
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    // Email verification fields
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    // Phone verification fields
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    phoneVerificationCode: String,
    phoneVerificationExpires: Date,
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Don't return password in JSON
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema);
