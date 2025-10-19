const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
const checkInSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    practitionerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    checkInTime: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['waiting', 'in_room', 'with_practitioner', 'completed', 'no_show'],
      default: 'waiting',
      index: true,
    },
    roomNumber: {
      type: String,
    },
    estimatedWaitTime: {
      type: Number, // in minutes
      default: 5,
    },
    actualWaitTime: {
      type: Number, // in minutes
    },
    checkInMethod: {
      type: String,
      enum: ['front_desk', 'self_service', 'mobile_app'],
      default: 'front_desk',
    },
    checkInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: {
      type: String,
    },
    vitals: {
      bloodPressure: String,
      heartRate: Number,
      temperature: Number,
      weight: Number,
      height: Number,
    },
    symptoms: [String],
    completedAt: {
      type: Date,
    },
    notificationsSent: {
      practitioner: {
        type: Boolean,
        default: false,
      },
      patient: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Calculate actual wait time when status changes to 'with_practitioner'
checkInSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status === 'with_practitioner' && !this.actualWaitTime) {
    this.actualWaitTime = Math.round((new Date() - this.checkInTime) / 60000); // Convert to minutes
  }
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  next();
});

// Get waiting queue for a practitioner
checkInSchema.statics.getWaitingQueue = async function (practitionerId) {
  return this.find({
    practitionerId,
    status: { $in: ['waiting', 'in_room'] },
  })
    .populate('patientId', 'firstName lastName')
    .populate('appointmentId', 'date time')
    .sort({ checkInTime: 1 });
};

// Get today's check-ins
checkInSchema.statics.getTodayCheckIns = async function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return this.find({
    checkInTime: { $gte: today, $lt: tomorrow },
  })
    .populate('patientId', 'firstName lastName')
    .populate('practitionerId', 'firstName lastName')
    .populate('appointmentId', 'date time')
    .sort({ checkInTime: -1 });
};

// Get average wait time for a practitioner
checkInSchema.statics.getAverageWaitTime = async function (practitionerId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const result = await this.aggregate([
    {
      $match: {
        practitionerId: mongoose.Types.ObjectId(practitionerId),
        actualWaitTime: { $exists: true, $ne: null },
        checkInTime: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: null,
        avgWaitTime: { $avg: '$actualWaitTime' },
        minWaitTime: { $min: '$actualWaitTime' },
        maxWaitTime: { $max: '$actualWaitTime' },
      },
    },
  ]);

  return result[0] || { avgWaitTime: 0, minWaitTime: 0, maxWaitTime: 0 };
};

// Get waiting room status
checkInSchema.statics.getWaitingRoomStatus = async function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await this.aggregate([
    {
      $match: {
        checkInTime: { $gte: today },
        status: { $in: ['waiting', 'in_room', 'with_practitioner'] },
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const status = {
    waiting: 0,
    in_room: 0,
    with_practitioner: 0,
    total: 0,
  };

  result.forEach((item) => {
    status[item._id] = item.count;
    status.total += item.count;
  });

  return status;
};

module.exports = mongoose.model('CheckIn', checkInSchema);
