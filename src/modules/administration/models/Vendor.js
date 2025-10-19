const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
/**
 * Vendor Model
 * Represents suppliers/vendors providing inventory items and services
 */
const vendorSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: true,
      trim: true,
    },
    vendorCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        'Medical Supplies',
        'Equipment',
        'Pharmaceuticals',
        'Services',
        'Office Supplies',
        'Technology',
        'Facilities',
        'Other',
      ],
      default: 'Medical Supplies',
    },

    // Contact Information
    contact: {
      primaryContact: String,
      email: {
        type: String,
        lowercase: true,
        trim: true,
      },
      phone: String,
      alternatePhone: String,
      fax: String,
      website: String,
    },

    // Address
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: {
        type: String,
        default: 'USA',
      },
    },

    // Business Details
    business: {
      taxId: String,
      registrationNumber: String,
      businessType: {
        type: String,
        enum: ['Manufacturer', 'Distributor', 'Wholesaler', 'Retailer', 'Service Provider'],
      },
      yearEstablished: Number,
      certifications: [String],
    },

    // Payment Terms
    paymentTerms: {
      creditTerms: {
        type: String,
        default: 'Net 30',
      },
      creditLimit: Number,
      paymentMethod: {
        type: String,
        enum: ['Credit Card', 'ACH', 'Check', 'Wire Transfer', 'Cash'],
        default: 'ACH',
      },
      earlyPaymentDiscount: Number,
      latePaymentPenalty: Number,
    },

    // Shipping
    shipping: {
      defaultLeadTimeDays: {
        type: Number,
        default: 7,
      },
      minimumOrderAmount: Number,
      shippingCost: Number,
      freeShippingThreshold: Number,
      returnPolicy: String,
      shippingMethods: [String],
    },

    // Categories and Products
    categories: [String],
    productLines: [String],

    // Performance Metrics (automatically updated)
    metrics: {
      totalOrders: {
        type: Number,
        default: 0,
      },
      totalSpent: {
        type: Number,
        default: 0,
      },
      averageOrderValue: {
        type: Number,
        default: 0,
      },
      onTimeDeliveryRate: {
        type: Number,
        default: 100,
      },
      qualityRating: {
        type: Number,
        default: 5,
        min: 0,
        max: 5,
      },
      lastOrderDate: Date,
    },

    // Status
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Suspended', 'Pending'],
      default: 'Active',
    },
    preferred: {
      type: Boolean,
      default: false,
    },

    // Notes and Documents
    notes: String,
    internalNotes: String,
    documents: [
      {
        name: String,
        type: String,
        url: String,
        uploadDate: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Relationships
    accountManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

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
// DUPLICATE INDEX - Auto-commented by deduplication tool
// vendorSchema.index({ name: 1 });
vendorSchema.index({ vendorCode: 1 });
vendorSchema.index({ type: 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// vendorSchema.index({ status: 1 });
vendorSchema.index({ preferred: 1 });
vendorSchema.index({ 'contact.email': 1 });

// Virtual for full address
vendorSchema.virtual('fullAddress').get(function () {
  const { street, city, state, zipCode, country } = this.address;
  return [street, city, state, zipCode, country].filter(Boolean).join(', ');
});

// Method to update metrics
vendorSchema.methods.updateMetrics = async function () {
  const PurchaseOrder = mongoose.model('PurchaseOrder');

  const orders = await PurchaseOrder.find({ vendor: this._id });

  this.metrics.totalOrders = orders.length;
  this.metrics.totalSpent = orders
    .filter((o) => o.status === 'completed')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  if (this.metrics.totalOrders > 0) {
    this.metrics.averageOrderValue = this.metrics.totalSpent / this.metrics.totalOrders;
  }

  const completedOrders = orders.filter((o) => o.status === 'completed');
  if (completedOrders.length > 0) {
    const onTimeOrders = completedOrders.filter(
      (o) =>
        o.actualDeliveryDate &&
        o.expectedDeliveryDate &&
        o.actualDeliveryDate <= o.expectedDeliveryDate
    );
    this.metrics.onTimeDeliveryRate = (onTimeOrders.length / completedOrders.length) * 100;
  }

  const lastOrder = orders.sort((a, b) => b.orderDate - a.orderDate)[0];
  if (lastOrder) {
    this.metrics.lastOrderDate = lastOrder.orderDate;
  }

  return this.save();
};

module.exports = mongoose.model('Vendor', vendorSchema);
