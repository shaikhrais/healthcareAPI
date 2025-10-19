const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
/**
 * InventoryItem Model
 * Represents physical items tracked in the clinic's inventory
 * (Medical supplies, retail products, consumables, etc.)
 */
const inventoryItemSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    barcode: {
      type: String,
      sparse: true,
      trim: true,
    },
    description: String,

    // Categorization
    category: {
      type: String,
      required: true,
      enum: [
        'Medical Supplies',
        'Retail Products',
        'Consumables',
        'Equipment',
        'Pharmaceuticals',
        'Supplements',
        'Personal Care',
        'Office Supplies',
        'Other',
      ],
    },
    subcategory: String,
    tags: [String],

    // Inventory Tracking
    currentStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    unit: {
      type: String,
      default: 'unit',
      enum: ['unit', 'box', 'bottle', 'pack', 'kg', 'liter', 'case'],
    },
    reorderPoint: {
      type: Number,
      default: 10,
    },
    reorderQuantity: {
      type: Number,
      default: 50,
    },
    maxStockLevel: Number,
    minStockLevel: Number,

    // Pricing
    costPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    sellingPrice: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },

    // Supplier Information
    supplier: {
      name: String,
      contactPerson: String,
      email: String,
      phone: String,
      leadTimeDays: Number,
    },

    // Product Details
    manufacturer: String,
    lotNumber: String,
    expiryDate: Date,

    // Storage
    location: {
      type: String,
      default: 'Main Storage',
    },
    storageConditions: String,

    // Status
    active: {
      type: Boolean,
      default: true,
    },
    trackInventory: {
      type: Boolean,
      default: true,
    },
    allowNegativeStock: {
      type: Boolean,
      default: false,
    },

    // Metadata
    lastRestocked: Date,
    lastSold: Date,
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
inventoryItemSchema.index({ name: 1 });
inventoryItemSchema.index({ sku: 1 });
inventoryItemSchema.index({ category: 1 });
inventoryItemSchema.index({ active: 1 });
inventoryItemSchema.index({ currentStock: 1 });
inventoryItemSchema.index({ expiryDate: 1 });

// Virtual for stock value
inventoryItemSchema.virtual('stockValue').get(function () {
  return this.currentStock * this.costPrice;
});

// Virtual for low stock alert
inventoryItemSchema.virtual('isLowStock').get(function () {
  return this.currentStock <= this.reorderPoint;
});

// Virtual for profit margin
inventoryItemSchema.virtual('profitMargin').get(function () {
  if (!this.sellingPrice || this.costPrice === 0) return 0;
  return ((this.sellingPrice - this.costPrice) / this.costPrice) * 100;
});

// Method to check if item needs reordering
inventoryItemSchema.methods.needsReorder = function () {
  return this.trackInventory && this.currentStock <= this.reorderPoint;
};

// Method to update stock
inventoryItemSchema.methods.updateStock = function (quantity, type = 'add') {
  if (type === 'add') {
    this.currentStock += quantity;
    this.lastRestocked = new Date();
  } else if (type === 'subtract') {
    if (!this.allowNegativeStock && this.currentStock < quantity) {
      throw new Error('Insufficient stock');
    }
    this.currentStock -= quantity;
    this.lastSold = new Date();
  } else if (type === 'set') {
    this.currentStock = quantity;
  }
  return this.save();
};

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);
