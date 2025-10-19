const mongoose = require('mongoose');
const crypto = require('crypto');

const mfaDeviceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  deviceType: {
    type: String,
    enum: ['totp', 'sms', 'email', 'backup_codes'],
    required: true
  },

  name: {
    type: String,
    required: true,
    trim: true,
    maxLength: 50
  },

  // TOTP-specific fields
  secret: {
    type: String, // Base32 encoded secret for TOTP
    select: false // Never include in queries by default
  },

  qrCodeUrl: {
    type: String,
    select: false
  },

  // SMS/Email-specific fields
  target: {
    type: String, // Phone number or email address
    trim: true
  },

  // Backup codes
  backupCodes: [{
    code: {
      type: String,
      select: false
    },
    used: {
      type: Boolean,
      default: false
    },
    usedAt: Date
  }],

  isActive: {
    type: Boolean,
    default: true
  },

  isVerified: {
    type: Boolean,
    default: false
  },

  lastUsed: {
    type: Date
  },

  useCount: {
    type: Number,
    default: 0
  },

  // Device info for tracking
  deviceInfo: {
    userAgent: String,
    ipAddress: String,
    location: String
  },

  // Security settings
  settings: {
    allowRememberDevice: {
      type: Boolean,
      default: true
    },
    
    backupCodesGenerated: {
      type: Date
    },
    
    lastBackupCodeUsed: {
      type: Date
    }
  }
}, {
  timestamps: true
});

// Indexes
mfaDeviceSchema.index({ user: 1, deviceType: 1 });
mfaDeviceSchema.index({ user: 1, isActive: 1 });
mfaDeviceSchema.index({ 'backupCodes.code': 1 });

// Virtual for masked target (phone/email)
mfaDeviceSchema.virtual('maskedTarget').get(function() {
  if (!this.target) return null;
  
  if (this.deviceType === 'sms') {
    // Mask phone number: +1234567890 -> +123***7890
    return this.target.replace(/(\+\d{3})\d*(\d{4})/, '$1***$2');
  } else if (this.deviceType === 'email') {
    // Mask email: user@example.com -> u***@example.com
    const [username, domain] = this.target.split('@');
    return `${username.charAt(0)}***@${domain}`;
  }
  
  return this.target;
});

// Instance method to generate backup codes
mfaDeviceSchema.methods.generateBackupCodes = function() {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    codes.push({
      code: crypto.randomBytes(4).toString('hex').toUpperCase(),
      used: false
    });
  }
  
  this.backupCodes = codes;
  this.settings.backupCodesGenerated = new Date();
  
  return codes.map(c => c.code);
};

// Instance method to verify backup code
mfaDeviceSchema.methods.verifyBackupCode = function(code) {
  const backupCode = this.backupCodes.find(bc => 
    bc.code.toLowerCase() === code.toLowerCase() && !bc.used
  );
  
  if (!backupCode) {
    return false;
  }
  
  backupCode.used = true;
  backupCode.usedAt = new Date();
  this.settings.lastBackupCodeUsed = new Date();
  this.lastUsed = new Date();
  this.useCount += 1;
  
  return true;
};

// Instance method to record usage
mfaDeviceSchema.methods.recordUsage = function() {
  this.lastUsed = new Date();
  this.useCount += 1;
};

// Static method to get user's active MFA devices
mfaDeviceSchema.statics.getUserDevices = function(userId, includeInactive = false) {
  const query = { user: userId };
  if (!includeInactive) {
    query.isActive = true;
  }
  
  return this.find(query)
    .select('+secret +backupCodes') // Include sensitive fields if needed
    .sort({ createdAt: -1 });
};

// Static method to check if user has MFA enabled
mfaDeviceSchema.statics.hasMFAEnabled = function(userId) {
  return this.countDocuments({
    user: userId,
    isActive: true,
    isVerified: true
  }).then(count => count > 0);
};

// Static method to get primary MFA device
mfaDeviceSchema.statics.getPrimaryDevice = function(userId) {
  return this.findOne({
    user: userId,
    isActive: true,
    isVerified: true,
    deviceType: { $in: ['totp', 'sms'] }
  }).sort({ lastUsed: -1, createdAt: -1 });
};

module.exports = mongoose.model('MFADevice', mfaDeviceSchema);