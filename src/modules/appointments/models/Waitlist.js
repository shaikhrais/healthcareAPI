const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
const waitlistSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    practitioner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    treatment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Treatment',
    },

    // Preferences
    preferredDays: [
      {
        type: Number, // 0-6 (Sunday-Saturday)
        min: 0,
        max: 6,
      },
    ],
    preferredTimeOfDay: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'any'],
      default: 'any',
    },
    earliestDate: Date,
    latestDate: Date,

    // Status
    status: {
      type: String,
      enum: ['active', 'contacted', 'booked', 'expired', 'cancelled'],
      default: 'active',
    },

    // Notifications
    notified: {
      type: Boolean,
      default: false,
    },
    notifiedAt: Date,
    lastNotified: Date,

    notes: String,
    priority: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
// DUPLICATE INDEX - Auto-commented by deduplication tool
// waitlistSchema.index({ patient: 1, status: 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// waitlistSchema.index({ practitioner: 1, status: 1 });
waitlistSchema.index({ status: 1, createdAt: 1 });

module.exports = mongoose.model('Waitlist', waitlistSchema);
