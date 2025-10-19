const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
/**
 * PurchaseOrder Model
 * Tracks orders placed with vendors
 */
const purchaseOrderSchema = new mongoose.Schema(
  {
    // Order Information
    poNumber: {
      type: String,
      unique: true,
      required: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },

    // Order Details
    orderDate: {
      type: Date,
      default: Date.now,
    },
    expectedDeliveryDate: Date,
    actualDeliveryDate: Date,
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Line Items
    items: [
      {
        inventoryItem: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'InventoryItem',
        },
        description: String,
        quantity: {
          type: Number,
          required: true,
        },
        unit: String,
        unitPrice: {
          type: Number,
          required: true,
        },
        totalPrice: Number,
        receivedQuantity: {
          type: Number,
          default: 0,
        },
        status: {
          type: String,
          enum: ['Pending', 'Partial', 'Received', 'Cancelled'],
          default: 'Pending',
        },
      },
    ],

    // Financial Details
    subtotal: Number,
    tax: Number,
    shippingCost: Number,
    discount: Number,
    totalAmount: Number,
    amountPaid: {
      type: Number,
      default: 0,
    },

    // Status
    status: {
      type: String,
      enum: [
        'Draft',
        'Pending',
        'Approved',
        'Ordered',
        'Partial',
        'Received',
        'Completed',
        'Cancelled',
      ],
      default: 'Draft',
    },

    // Quality and Performance
    qualityCheck: {
      passed: Boolean,
      checkedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      checkedDate: Date,
      notes: String,
      defectRate: {
        type: Number,
        default: 0,
      },
    },

    // Delivery Performance
    deliveryPerformance: {
      onTime: Boolean,
      daysLate: Number,
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      notes: String,
    },

    // Payment
    payment: {
      method: String,
      terms: String,
      dueDate: Date,
      paidDate: Date,
      referenceNumber: String,
    },

    // Shipping
    shipping: {
      trackingNumber: String,
      carrier: String,
      shippingMethod: String,
      shippedDate: Date,
      deliveredDate: Date,
    },

    // Notes
    notes: String,
    internalNotes: String,

    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
purchaseOrderSchema.index({ poNumber: 1 });
purchaseOrderSchema.index({ vendor: 1, orderDate: -1 });
purchaseOrderSchema.index({ status: 1 });
purchaseOrderSchema.index({ orderDate: -1 });
purchaseOrderSchema.index({ expectedDeliveryDate: 1 });

// Pre-save hook to calculate totals
purchaseOrderSchema.pre('save', function (next) {
  // Calculate item totals
  this.items.forEach((item) => {
    item.totalPrice = item.quantity * item.unitPrice;
  });

  // Calculate order totals
  this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  this.totalAmount =
    this.subtotal + (this.tax || 0) + (this.shippingCost || 0) - (this.discount || 0);

  // Check if all items received
  const allItemsReceived = this.items.every((item) => item.receivedQuantity >= item.quantity);
  if (allItemsReceived && this.status !== 'Completed' && this.status !== 'Cancelled') {
    this.status = 'Received';
  }

  // Calculate delivery performance
  if (this.actualDeliveryDate && this.expectedDeliveryDate) {
    const expectedTime = this.expectedDeliveryDate.getTime();
    const actualTime = this.actualDeliveryDate.getTime();
    this.deliveryPerformance.onTime = actualTime <= expectedTime;

    if (actualTime > expectedTime) {
      const diffDays = Math.ceil((actualTime - expectedTime) / (1000 * 60 * 60 * 24));
      this.deliveryPerformance.daysLate = diffDays;
    } else {
      this.deliveryPerformance.daysLate = 0;
    }
  }

  next();
});

// Static method to generate PO number
purchaseOrderSchema.statics.generatePONumber = async function () {
  const year = new Date().getFullYear();
  const count = await this.countDocuments({
    poNumber: new RegExp(`^PO-${year}-`),
  });
  return `PO-${year}-${String(count + 1).padStart(5, '0')}`;
};

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
