const mongoose = require('mongoose');

/**
 * Fee Schedule Model
 *
 * Manages standard charges and fee schedules for price transparency
 */

// eslint-disable-next-line no-unused-vars

const feeScheduleSchema = new mongoose.Schema(
  {
    // Schedule identification
    scheduleName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    scheduleType: {
      type: String,
      enum: [
        'standard', // Standard fee schedule
        'medicare', // Medicare rates
        'medicaid', // Medicaid rates
        'contracted', // Insurance contracted rates
        'cash_discount', // Cash/self-pay discount
        'sliding_scale', // Income-based sliding scale
      ],
      required: true,
      index: true,
    },

    // Associated payer (for contracted rates)
    payer: {
      payerId: String,
      payerName: String,
      contractNumber: String,
      effectiveDate: Date,
      expirationDate: Date,
    },

    // Fee schedule items
    items: [
      {
        // Service identification
        procedureCode: {
          type: String,
          required: true,
          index: true,
        },

        codeType: {
          type: String,
          enum: ['CPT', 'HCPCS', 'CDT', 'ICD-10-PCS'],
          default: 'CPT',
        },

        modifier: String,

        description: {
          type: String,
          required: true,
        },

        // Pricing
        standardCharge: {
          type: Number,
          required: true,
          min: 0,
        },

        cashPrice: Number, // Discounted cash/self-pay price
        minimumNegotiatedRate: Number, // Lowest contracted rate
        maximumNegotiatedRate: Number, // Highest contracted rate
        deIdentifiedMinimum: Number, // De-identified minimum for transparency
        deIdentifiedMaximum: Number, // De-identified maximum for transparency

        // Additional charges
        facilityFee: Number,
        professionalFee: Number,
        technicalComponent: Number,

        // Service details
        serviceCategory: {
          type: String,
          enum: [
            'evaluation_management',
            'preventive_care',
            'diagnostic_test',
            'imaging',
            'laboratory',
            'surgery',
            'therapy',
            'behavioral_health',
            'medications',
            'procedures',
            'other',
          ],
        },

        // Unit information
        unitOfMeasure: {
          type: String,
          enum: ['visit', 'procedure', 'session', 'test', 'unit', 'day', 'hour'],
          default: 'procedure',
        },

        rvuValue: Number, // Relative Value Unit

        // Validity
        effectiveDate: Date,
        expirationDate: Date,
        isActive: { type: Boolean, default: true },

        // Notes
        notes: String,
        priorAuthRequired: { type: Boolean, default: false },
        bundledServices: [String], // Related CPT codes included in price
      },
    ],

    // Schedule metadata
    facility: {
      name: String,
      npi: String,
      taxId: String,
      address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
      },
    },

    // Validity period
    effectiveDate: {
      type: Date,
      required: true,
      index: true,
    },

    expirationDate: Date,

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Transparency compliance
    transparencyCompliance: {
      lastPublished: Date,
      publishedUrl: String,
      fileFormat: {
        type: String,
        enum: ['JSON', 'CSV', 'XML'],
      },
      includesPriorYearData: Boolean,
      machineReadable: { type: Boolean, default: true },
      consumerFriendly: Boolean,
    },

    // Update tracking
    version: {
      type: Number,
      default: 1,
    },

    supersededBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeeSchedule',
    },

    // Workflow
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    approvedAt: Date,

    notes: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
feeScheduleSchema.index({ scheduleName: 1, scheduleType: 1 });
feeScheduleSchema.index({ 'items.procedureCode': 1 });
feeScheduleSchema.index({ 'payer.payerId': 1 });
feeScheduleSchema.index({ effectiveDate: 1, expirationDate: 1 });

// Instance methods

/**
 * Get price for procedure code
 */
feeScheduleSchema.methods.getPriceForCode = function (procedureCode, priceType = 'standardCharge') {
  const item = this.items.find((i) => i.procedureCode === procedureCode && i.isActive);

  if (!item) return null;

  // Check validity
  const now = new Date();
  if (item.effectiveDate && now < item.effectiveDate) return null;
  if (item.expirationDate && now > item.expirationDate) return null;

  return {
    procedureCode: item.procedureCode,
    description: item.description,
    price: item[priceType],
    serviceCategory: item.serviceCategory,
    unitOfMeasure: item.unitOfMeasure,
    priorAuthRequired: item.priorAuthRequired,
  };
};

/**
 * Get price range for code across all payers
 */
feeScheduleSchema.methods.getPriceRange = function (procedureCode) {
  const item = this.items.find((i) => i.procedureCode === procedureCode && i.isActive);

  if (!item) return null;

  return {
    procedureCode: item.procedureCode,
    description: item.description,
    standardCharge: item.standardCharge,
    cashPrice: item.cashPrice,
    minimumNegotiatedRate: item.minimumNegotiatedRate,
    maximumNegotiatedRate: item.maximumNegotiatedRate,
    range:
      item.maximumNegotiatedRate && item.minimumNegotiatedRate
        ? `$${item.minimumNegotiatedRate} - $${item.maximumNegotiatedRate}`
        : null,
  };
};

/**
 * Check if schedule is currently valid
 */
feeScheduleSchema.methods.isValid = function () {
  const now = new Date();
  return (
    this.isActive &&
    now >= this.effectiveDate &&
    (!this.expirationDate || now <= this.expirationDate)
  );
};

/**
 * Get all prices for a service category
 */
feeScheduleSchema.methods.getPricesByCategory = function (category) {
  const now = new Date();

  return this.items
    .filter((item) => {
      if (!item.isActive) return false;
      if (item.serviceCategory !== category) return false;
      if (item.effectiveDate && now < item.effectiveDate) return false;
      if (item.expirationDate && now > item.expirationDate) return false;
      return true;
    })
    .map((item) => ({
      procedureCode: item.procedureCode,
      description: item.description,
      standardCharge: item.standardCharge,
      cashPrice: item.cashPrice,
      serviceCategory: item.serviceCategory,
    }));
};

/**
 * Export for transparency compliance
 */
feeScheduleSchema.methods.exportForTransparency = function () {
  return {
    facilityName: this.facility.name,
    facilityNPI: this.facility.npi,
    facilityAddress: this.facility.address,
    lastUpdated: this.updatedAt,
    effectiveDate: this.effectiveDate,
    standardCharges: this.items
      .filter((item) => item.isActive)
      .map((item) => ({
        code: item.procedureCode,
        codeType: item.codeType,
        description: item.description,
        standardCharge: item.standardCharge,
        cashPrice: item.cashPrice || item.standardCharge,
        minimumNegotiatedCharge: item.minimumNegotiatedRate,
        maximumNegotiatedCharge: item.maximumNegotiatedRate,
        deIdentifiedMinimum: item.deIdentifiedMinimum,
        deIdentifiedMaximum: item.deIdentifiedMaximum,
        serviceCategory: item.serviceCategory,
      })),
  };
};

/**
 * Supersede with new schedule
 */
feeScheduleSchema.methods.supersede = function (newScheduleId) {
  this.isActive = false;
  this.supersededBy = newScheduleId;
  this.expirationDate = new Date();
};

// Static methods

/**
 * Get active schedule by type
 */
feeScheduleSchema.statics.getActiveSchedule = function (scheduleType, payerId = null) {
  const query = {
    scheduleType,
    isActive: true,
    effectiveDate: { $lte: new Date() },
    $or: [{ expirationDate: { $exists: false } }, { expirationDate: { $gte: new Date() } }],
  };

  if (payerId) {
    query['payer.payerId'] = payerId;
  }

  return this.findOne(query).sort({ effectiveDate: -1 });
};

/**
 * Search for procedure prices
 */
feeScheduleSchema.statics.searchProcedures = async function (searchTerm, options = {}) {
  const query = {
    isActive: true,
    'items.isActive': true,
  };

  if (options.scheduleType) {
    query.scheduleType = options.scheduleType;
  }

  const schedules = await this.find(query);

  const results = [];

  schedules.forEach((schedule) => {
    schedule.items.forEach((item) => {
      if (!item.isActive) return;

      const matchesCode = item.procedureCode.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDescription = item.description.toLowerCase().includes(searchTerm.toLowerCase());

      if (matchesCode || matchesDescription) {
        results.push({
          scheduleType: schedule.scheduleType,
          payerName: schedule.payer?.payerName,
          procedureCode: item.procedureCode,
          description: item.description,
          standardCharge: item.standardCharge,
          cashPrice: item.cashPrice,
          serviceCategory: item.serviceCategory,
        });
      }
    });
  });

  return results;
};

/**
 * Get price comparison across schedules
 */
feeScheduleSchema.statics.comparePrice = async function (procedureCode) {
  const schedules = await this.find({
    isActive: true,
    'items.procedureCode': procedureCode,
    'items.isActive': true,
  });

  const comparison = {
    procedureCode,
    description: null,
    pricesBySchedule: [],
  };

  schedules.forEach((schedule) => {
    const item = schedule.items.find((i) => i.procedureCode === procedureCode && i.isActive);

    if (item) {
      if (!comparison.description) {
        comparison.description = item.description;
      }

      comparison.pricesBySchedule.push({
        scheduleType: schedule.scheduleType,
        scheduleName: schedule.scheduleName,
        payerName: schedule.payer?.payerName,
        standardCharge: item.standardCharge,
        cashPrice: item.cashPrice,
        minimumNegotiatedRate: item.minimumNegotiatedRate,
        maximumNegotiatedRate: item.maximumNegotiatedRate,
      });
    }
  });

  // Calculate statistics
  const prices = comparison.pricesBySchedule.map((p) => p.standardCharge).filter((p) => p);

  if (prices.length > 0) {
    comparison.statistics = {
      minimum: Math.min(...prices),
      maximum: Math.max(...prices),
      average: prices.reduce((a, b) => a + b, 0) / prices.length,
      median: prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)],
    };
  }

  return comparison;
};

/**
 * Get transparency compliance data
 */
feeScheduleSchema.statics.getTransparencyData = async function () {
  const standardSchedule = await this.getActiveSchedule('standard');

  if (!standardSchedule) {
    return null;
  }

  return standardSchedule.exportForTransparency();
};

/**
 * Get statistics
 */
feeScheduleSchema.statics.getStatistics = async function () {
  const [totalSchedules, activeSchedules, byType, totalServices] = await Promise.all([
    this.countDocuments(),
    this.countDocuments({ isActive: true }),
    this.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$scheduleType', count: { $sum: 1 } } },
    ]),
    this.aggregate([
      { $match: { isActive: true } },
      { $project: { itemCount: { $size: '$items' } } },
      { $group: { _id: null, total: { $sum: '$itemCount' } } },
    ]),
  ]);

  return {
    totalSchedules,
    activeSchedules,
    byType: byType.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    totalServices: totalServices[0]?.total || 0,
  };
};

const FeeSchedule = mongoose.model('FeeSchedule', feeScheduleSchema);

module.exports = FeeSchedule;
