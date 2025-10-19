const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
const shiftSchema = new mongoose.Schema(
  {
    practitioner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Date and time
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String, // Format: "HH:mm" e.g., "09:00"
      required: true,
    },
    endTime: {
      type: String, // Format: "HH:mm" e.g., "17:00"
      required: true,
    },

    // Breaks during shift
    breaks: [
      {
        startTime: { type: String, required: true }, // "HH:mm"
        endTime: { type: String, required: true }, // "HH:mm"
        reason: { type: String, default: 'Break' },
      },
    ],

    // Location
    location: {
      type: String,
      default: 'Main Clinic',
    },

    // Recurrence
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurrencePattern: {
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'biweekly', 'monthly'],
        default: 'weekly',
      },
      daysOfWeek: [
        {
          type: Number,
          min: 0,
          max: 6,
        },
      ], // 0 = Sunday, 6 = Saturday
      endDate: Date,
      exceptions: [Date], // Dates to skip
    },
    recurringParent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift',
    },

    // Status
    status: {
      type: String,
      enum: ['scheduled', 'cancelled', 'completed'],
      default: 'scheduled',
    },

    // Availability settings
    bookable: {
      type: Boolean,
      default: true,
    },
    bufferBefore: {
      type: Number, // Minutes
      default: 0,
    },
    bufferAfter: {
      type: Number, // Minutes
      default: 0,
    },

    // Notes
    notes: String,

    // Tracking
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
shiftSchema.index({ practitioner: 1, date: 1 });
shiftSchema.index({ date: 1 });
shiftSchema.index({ practitioner: 1, status: 1 });

// Virtual for full date/time
shiftSchema.virtual('startDateTime').get(function () {
  const [hours, minutes] = this.startTime.split(':');
  const dt = new Date(this.date);
  dt.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
  return dt;
});

shiftSchema.virtual('endDateTime').get(function () {
  const [hours, minutes] = this.endTime.split(':');
  const dt = new Date(this.date);
  dt.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
  return dt;
});

// Method to check if time is available (not in break)
shiftSchema.methods.isTimeAvailable = function (time) {
  if (!this.breaks || this.breaks.length === 0) return true;

  for (const breakPeriod of this.breaks) {
    if (time >= breakPeriod.startTime && time < breakPeriod.endTime) {
      return false;
    }
  }
  return true;
};

// Method to get available time slots
shiftSchema.methods.getAvailableSlots = function (slotDuration = 30) {
  const slots = [];
  const [startHours, startMinutes] = this.startTime.split(':').map(Number);
  const [endHours, endMinutes] = this.endTime.split(':').map(Number);

  let currentMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = endHours * 60 + endMinutes;

  while (currentMinutes + slotDuration <= endTotalMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const minutes = currentMinutes % 60;
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    if (this.isTimeAvailable(timeStr)) {
      slots.push(timeStr);
    }

    currentMinutes += slotDuration;
  }

  return slots;
};

module.exports = mongoose.model('Shift', shiftSchema);
