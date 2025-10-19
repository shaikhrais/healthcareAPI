const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
/**
 * InventoryTransaction Model
 * Tracks all inventory movements (stock in, stock out, adjustments)
 */
const inventoryTransactionSchema = new mongoose.Schema(
  {
    // Item Reference
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: true,
    },

    // Transaction Details
    transactionType: {
      type: String,
      required: true,
      enum: [
        'purchase', // Stock received from supplier
        'sale', // Sold to patient/customer
        'adjustment', // Manual stock adjustment
        'return', // Return to supplier
        'waste', // Expired/damaged/disposed
        'transfer', // Transfer between locations
        'usage', // Used in treatment/service
        'initial', // Initial stock count
      ],
    },

    // Quantity
    quantity: {
      type: Number,
      required: true,
    },
    unit: String,

    // Before and After Stock Levels
    stockBefore: Number,
    stockAfter: Number,

    // Financial
    unitCost: Number,
    totalCost: {
      type: Number,
      default: 0,
    },
    unitPrice: Number, // Selling price for sales
    totalPrice: Number, // Total selling price

    // Reference Documents
    referenceType: {
      type: String,
      enum: ['purchase_order', 'invoice', 'appointment', 'manual', 'other'],
    },
    referenceId: mongoose.Schema.Types.ObjectId,
    invoiceNumber: String,
    purchaseOrderNumber: String,

    // Transaction Context
    supplier: {
      name: String,
      contactPerson: String,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
    },
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
    },

    // Location
    fromLocation: String,
    toLocation: String,

    // Additional Details
    notes: String,
    reason: String, // For adjustments, waste, etc.
    batchNumber: String,
    expiryDate: Date,

    // Metadata
    transactionDate: {
      type: Date,
      default: Date.now,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approved: {
      type: Boolean,
      default: true, // Auto-approved by default
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
inventoryTransactionSchema.index({ item: 1, transactionDate: -1 });
inventoryTransactionSchema.index({ transactionType: 1, transactionDate: -1 });
inventoryTransactionSchema.index({ transactionDate: -1 });
inventoryTransactionSchema.index({ patient: 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// inventoryTransactionSchema.index({ appointment: 1 });
inventoryTransactionSchema.index({ recordedBy: 1 });

// Compound index for turnover analysis
inventoryTransactionSchema.index({ item: 1, transactionType: 1, transactionDate: -1 });

// Pre-save hook to calculate totals
inventoryTransactionSchema.pre('save', function (next) {
  if (this.quantity && this.unitCost) {
    this.totalCost = this.quantity * this.unitCost;
  }
  if (this.quantity && this.unitPrice) {
    this.totalPrice = this.quantity * this.unitPrice;
  }
  next();
});

// Static method to get transactions for an item in a period
inventoryTransactionSchema.statics.getItemTransactions = async function (
  itemId,
  startDate,
  endDate,
  transactionTypes = null
) {
  const query = {
    item: itemId,
    transactionDate: {
      $gte: startDate,
      $lte: endDate,
    },
  };

  if (transactionTypes && transactionTypes.length > 0) {
    query.transactionType = { $in: transactionTypes };
  }

  return this.find(query).sort({ transactionDate: 1 });
};

// Static method to calculate stock movement for period
inventoryTransactionSchema.statics.calculateMovement = async function (itemId, startDate, endDate) {
  const transactions = await this.aggregate([
    {
      $match: {
        item: mongoose.Types.ObjectId(itemId),
        transactionDate: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $group: {
        _id: '$transactionType',
        totalQuantity: { $sum: '$quantity' },
        totalCost: { $sum: '$totalCost' },
        totalRevenue: { $sum: '$totalPrice' },
        count: { $sum: 1 },
      },
    },
  ]);

  return transactions;
};

module.exports = mongoose.model('InventoryTransaction', inventoryTransactionSchema);
