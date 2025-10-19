const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
const paymentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'credit_card', 'debit_card', 'insurance', 'check', 'e_transfer'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded', 'partial'],
      default: 'pending',
      index: true,
    },
    transactionId: {
      type: String,
      unique: true,
      sparse: true, // Only unique if exists
    },
    stripePaymentIntentId: {
      type: String,
      sparse: true,
    },
    stripeChargeId: {
      type: String,
      sparse: true,
    },
    cardLast4: {
      type: String,
    },
    cardBrand: {
      type: String,
    },
    receiptUrl: {
      type: String,
    },
    receiptNumber: {
      type: String,
      unique: true,
    },
    description: {
      type: String,
    },
    notes: {
      type: String,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    refundedAmount: {
      type: Number,
      default: 0,
    },
    refundReason: {
      type: String,
    },
    metadata: {
      type: Map,
      of: String,
    },
  },
  {
    timestamps: true,
  }
);

// Generate receipt number
paymentSchema.pre('save', async function (next) {
  if (!this.receiptNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const count = await mongoose.model('Payment').countDocuments({
      createdAt: {
        $gte: new Date(year, date.getMonth(), 1),
        $lt: new Date(year, date.getMonth() + 1, 1),
      },
    });
    this.receiptNumber = `RCP-${year}${month}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// Indexes for common queries
// DUPLICATE INDEX - Auto-commented by deduplication tool
// paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ processedBy: 1, createdAt: -1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// paymentSchema.index({ status: 1, createdAt: -1 });

// Calculate total paid for a patient
paymentSchema.statics.getTotalPaid = async function (patientId) {
  const result = await this.aggregate([
    {
      $match: {
        patientId: mongoose.Types.ObjectId(patientId),
        status: 'completed',
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
      },
    },
  ]);
  return result.length > 0 ? result[0].total : 0;
};

// Get payment history for patient
paymentSchema.statics.getPatientHistory = async function (patientId, limit = 10) {
  return this.find({ patientId })
    .populate('processedBy', 'firstName lastName')
    .populate('appointmentId', 'date time')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Get daily revenue
paymentSchema.statics.getDailyRevenue = async function (date = new Date()) {
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));

  const result = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfDay, $lte: endOfDay },
        status: 'completed',
      },
    },
    {
      $group: {
        _id: '$paymentMethod',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  return result;
};

module.exports = mongoose.model('Payment', paymentSchema);
