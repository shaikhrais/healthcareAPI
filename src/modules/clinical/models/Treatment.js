const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
const treatmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    code: String,
    category: String,

    // Pricing
    price: {
      type: Number,
      required: true,
    },
    duration: {
      type: Number, // in minutes
      required: true,
    },

    // Tax
    taxable: {
      type: Boolean,
      default: true,
    },
    taxRate: Number,

    // Booking
    bookingEnabled: {
      type: Boolean,
      default: true,
    },
    onlineBookingEnabled: {
      type: Boolean,
      default: true,
    },

    // Capacity
    capacity: {
      type: Number,
      default: 1,
    },

    // Practitioners
    availableFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // Insurance
    insuranceBillable: {
      type: Boolean,
      default: false,
    },
    insuranceCodes: [
      {
        system: String,
        code: String,
      },
    ],

    description: String,
    color: String,

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
// DUPLICATE INDEX - Auto-commented by deduplication tool
// treatmentSchema.index({ name: 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// treatmentSchema.index({ active: 1 });

module.exports = mongoose.model('Treatment', treatmentSchema);
