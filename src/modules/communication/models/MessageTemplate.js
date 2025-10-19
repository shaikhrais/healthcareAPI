const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
const messageTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ['sms', 'email', 'both'],
      required: true,
    },
    category: {
      type: String,
      enum: [
        'appointment_reminder',
        'appointment_confirmation',
        'appointment_cancelled',
        'waitlist_notification',
        'general',
      ],
      required: true,
    },

    // Email fields
    emailSubject: String,
    emailBody: String,

    // SMS fields
    smsBody: String,

    // Template variables available: {{patientName}}, {{practitionerName}}, {{date}}, {{time}}, {{treatmentName}}, etc.
    variables: [
      {
        name: String,
        description: String,
      },
    ],

    active: {
      type: Boolean,
      default: true,
    },

    // Timing
    sendBefore: {
      value: Number, // e.g., 24
      unit: { type: String, enum: ['hours', 'days', 'weeks'] }, // e.g., 'hours'
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

module.exports = mongoose.model('MessageTemplate', messageTemplateSchema);
