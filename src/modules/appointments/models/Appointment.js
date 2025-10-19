const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    practitioner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    serviceType: {
      type: String,
      enum: [
        'RMT',
        'RPT',
        'Physiotherapy',
        'Massage Therapy',
        'Acupuncture',
        'Chiropractic',
        'General',
      ],
    },
    appointmentType: {
      type: String,
      required: true,
      enum: ['consultation', 'follow-up', 'checkup', 'procedure', 'other'],
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number, // in minutes
      required: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'],
      default: 'scheduled',
    },
    notes: String,
    symptoms: [String],
    diagnosis: String,
    treatment: String,
    prescription: [
      {
        medication: String,
        dosage: String,
        frequency: String,
        duration: String,
      },
    ],
    location: {
      type: String,
      default: 'Main Office',
    },
    virtual: {
      type: Boolean,
      default: false,
    },
    meetingLink: String,
    reminders: [
      {
        type: {
          type: String,
          enum: ['email', 'sms', 'push'],
        },
        sentAt: Date,
        status: String,
      },
    ],
    // Recurrence
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurrencePattern: {
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'biweekly', 'monthly'],
      },
      interval: Number,
      endDate: Date,
      occurrences: Number,
    },
    recurringParent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
    },

    // Tracking
    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    bookedVia: {
      type: String,
      enum: ['admin', 'online', 'phone', 'walk_in'],
      default: 'admin',
    },
    confirmationSent: Date,
    cancelledAt: Date,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    cancellationReason: String,

    // Chart
    chartCompleted: {
      type: Boolean,
      default: false,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
appointmentSchema.index({ practitioner: 1, startTime: 1 });
appointmentSchema.index({ patient: 1, startTime: 1 });
appointmentSchema.index({ status: 1, startTime: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
