const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
const deviceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    deviceFingerprint: {
      type: String,
      required: true,
      index: true,
    },
    deviceType: {
      type: String,
      enum: ['mobile', 'tablet', 'desktop', 'tv', 'unknown'],
      default: 'unknown',
    },
    platform: {
      type: String, // iOS, Android, Windows, MacOS, Linux, etc.
    },
    browser: {
      type: String, // Chrome, Safari, Firefox, etc.
    },
    userAgent: {
      type: String,
      required: true,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    location: {
      country: String,
      region: String,
      city: String,
      latitude: Number,
      longitude: Number,
      timezone: String,
    },
    firstSeen: {
      type: Date,
      default: Date.now,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isTrusted: {
      type: Boolean,
      default: false, // First login requires verification
    },
    loginCount: {
      type: Number,
      default: 1,
    },
    deviceName: {
      type: String, // User-friendly name like "iPhone 14 Pro"
    },
    notificationSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
deviceSchema.index({ user: 1, deviceFingerprint: 1 });
deviceSchema.index({ user: 1, lastSeen: -1 });
deviceSchema.index({ isActive: 1, lastSeen: -1 });

// Method to update last seen
deviceSchema.methods.updateLastSeen = function () {
  this.lastSeen = new Date();
  this.loginCount += 1;
  return this.save();
};

// Method to mark as trusted
deviceSchema.methods.markAsTrusted = function () {
  this.isTrusted = true;
  return this.save();
};

// Static method to find or create device
deviceSchema.statics.findOrCreateDevice = async function (userId, deviceData) {
  const device = await this.findOne({
    user: userId,
    deviceFingerprint: deviceData.deviceFingerprint,
  });

  if (device) {
    // Update existing device
    device.lastSeen = new Date();
    device.loginCount += 1;
    device.ipAddress = deviceData.ipAddress;
    if (deviceData.location) {
      device.location = deviceData.location;
    }
    await device.save();
    return { device, isNew: false };
  }
  // Create new device
  const newDevice = await this.create({
    user: userId,
    ...deviceData,
    firstSeen: new Date(),
    lastSeen: new Date(),
    loginCount: 1,
  });
  return { device: newDevice, isNew: true };
};

// Static method to get user's active devices
deviceSchema.statics.getUserDevices = async function (userId) {
  return this.find({ user: userId, isActive: true }).sort({ lastSeen: -1 });
};

// Static method to deactivate old devices (not seen in 90 days)
deviceSchema.statics.deactivateOldDevices = async function () {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  return this.updateMany({ lastSeen: { $lt: ninetyDaysAgo }, isActive: true }, { isActive: false });
};

module.exports = mongoose.model('Device', deviceSchema);
