const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
/**
 * VendorPerformance Model
 * Stores comprehensive vendor performance analysis
 */
const vendorPerformanceSchema = new mongoose.Schema(
  {
    // Vendor Reference
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    vendorName: String,
    vendorType: String,

    // Analysis Period
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      required: true,
    },
    periodType: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly', 'custom'],
      default: 'monthly',
    },

    // Order Metrics
    orderMetrics: {
      totalOrders: {
        type: Number,
        default: 0,
      },
      completedOrders: {
        type: Number,
        default: 0,
      },
      cancelledOrders: {
        type: Number,
        default: 0,
      },
      pendingOrders: {
        type: Number,
        default: 0,
      },
      completionRate: {
        type: Number,
        default: 0,
      },
      averageOrderValue: {
        type: Number,
        default: 0,
      },
      totalOrderValue: {
        type: Number,
        default: 0,
      },
    },

    // Delivery Performance
    deliveryMetrics: {
      onTimeDeliveries: {
        type: Number,
        default: 0,
      },
      lateDeliveries: {
        type: Number,
        default: 0,
      },
      onTimeRate: {
        type: Number,
        default: 100,
      },
      averageDaysLate: {
        type: Number,
        default: 0,
      },
      averageLeadTime: {
        type: Number,
        default: 0,
      },
      leadTimeVariance: {
        type: Number,
        default: 0,
      },
    },

    // Quality Metrics
    qualityMetrics: {
      totalItemsOrdered: {
        type: Number,
        default: 0,
      },
      totalItemsReceived: {
        type: Number,
        default: 0,
      },
      defectiveItems: {
        type: Number,
        default: 0,
      },
      defectRate: {
        type: Number,
        default: 0,
      },
      qualityChecksPerformed: {
        type: Number,
        default: 0,
      },
      qualityChecksPassed: {
        type: Number,
        default: 0,
      },
      averageQualityRating: {
        type: Number,
        default: 5,
      },
    },

    // Financial Metrics
    financialMetrics: {
      totalSpent: {
        type: Number,
        default: 0,
      },
      totalPaid: {
        type: Number,
        default: 0,
      },
      outstandingBalance: {
        type: Number,
        default: 0,
      },
      averagePaymentDays: {
        type: Number,
        default: 0,
      },
      earlyPaymentsMade: {
        type: Number,
        default: 0,
      },
      latePaymentsMade: {
        type: Number,
        default: 0,
      },
      discountsReceived: {
        type: Number,
        default: 0,
      },
      priceCompetitiveness: {
        type: Number,
        default: 0, // Score 0-100
      },
    },

    // Responsiveness Metrics
    responsivenessMetrics: {
      averageResponseTime: {
        type: Number,
        default: 0, // in hours
      },
      issuesReported: {
        type: Number,
        default: 0,
      },
      issuesResolved: {
        type: Number,
        default: 0,
      },
      issueResolutionRate: {
        type: Number,
        default: 100,
      },
      communicationRating: {
        type: Number,
        default: 5,
      },
    },

    // Compliance Metrics
    complianceMetrics: {
      documentsRequired: {
        type: Number,
        default: 0,
      },
      documentsProvided: {
        type: Number,
        default: 0,
      },
      complianceRate: {
        type: Number,
        default: 100,
      },
      certificationsValid: {
        type: Boolean,
        default: true,
      },
      auditsPassed: {
        type: Number,
        default: 0,
      },
      auditsFailed: {
        type: Number,
        default: 0,
      },
    },

    // Overall Performance Score
    overallScore: {
      deliveryScore: {
        type: Number,
        default: 0,
      },
      qualityScore: {
        type: Number,
        default: 0,
      },
      financialScore: {
        type: Number,
        default: 0,
      },
      responsivenessScore: {
        type: Number,
        default: 0,
      },
      complianceScore: {
        type: Number,
        default: 0,
      },
      totalScore: {
        type: Number,
        default: 0,
      },
      grade: {
        type: String,
        enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'],
      },
    },

    // Performance Indicators
    performance: {
      excellent: {
        type: Boolean,
        default: false,
      },
      good: {
        type: Boolean,
        default: false,
      },
      needsImprovement: {
        type: Boolean,
        default: false,
      },
      poor: {
        type: Boolean,
        default: false,
      },
      recommended: {
        type: Boolean,
        default: true,
      },
    },

    // Strengths and Weaknesses
    analysis: {
      strengths: [String],
      weaknesses: [String],
      recommendations: [String],
      riskLevel: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Critical'],
        default: 'Low',
      },
      alerts: [
        {
          type: String,
          severity: {
            type: String,
            enum: ['info', 'warning', 'error', 'critical'],
          },
          message: String,
        },
      ],
    },

    // Comparison with Period
    comparison: {
      previousPeriodScore: Number,
      scoreChange: Number,
      trend: {
        type: String,
        enum: ['Improving', 'Stable', 'Declining'],
      },
    },

    // Metadata
    calculatedAt: {
      type: Date,
      default: Date.now,
    },
    calculatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
vendorPerformanceSchema.index({ vendor: 1, periodStart: 1, periodEnd: 1 });
vendorPerformanceSchema.index({ periodType: 1 });
vendorPerformanceSchema.index({ 'overallScore.totalScore': -1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// vendorPerformanceSchema.index({ calculatedAt: -1 });

// Virtual for period duration
vendorPerformanceSchema.virtual('periodDurationDays').get(function () {
  if (this.periodStart && this.periodEnd) {
    return Math.ceil((this.periodEnd - this.periodStart) / (1000 * 60 * 60 * 24));
  }
  return 0;
});

// Method to calculate all scores
vendorPerformanceSchema.methods.calculateScores = function () {
  // Delivery Score (0-100)
  // Weighted: On-time rate (70%), Lead time consistency (30%)
  const onTimeScore = this.deliveryMetrics.onTimeRate * 0.7;
  const leadTimeScore = Math.max(0, 100 - this.deliveryMetrics.leadTimeVariance) * 0.3;
  this.overallScore.deliveryScore = onTimeScore + leadTimeScore;

  // Quality Score (0-100)
  // Weighted: Defect rate (60%), Quality ratings (40%)
  const defectScore = Math.max(0, 100 - this.qualityMetrics.defectRate * 10);
  const qualityRatingScore = (this.qualityMetrics.averageQualityRating / 5) * 100;
  this.overallScore.qualityScore = defectScore * 0.6 + qualityRatingScore * 0.4;

  // Financial Score (0-100)
  // Weighted: Payment timeliness (50%), Price competitiveness (50%)
  const paymentScore = Math.max(0, 100 - Math.abs(this.financialMetrics.averagePaymentDays - 30));
  this.overallScore.financialScore =
    paymentScore * 0.5 + this.financialMetrics.priceCompetitiveness * 0.5;

  // Responsiveness Score (0-100)
  // Weighted: Issue resolution rate (60%), Communication rating (40%)
  const resolutionScore = this.responsivenessMetrics.issueResolutionRate;
  const commScore = (this.responsivenessMetrics.communicationRating / 5) * 100;
  this.overallScore.responsivenessScore = resolutionScore * 0.6 + commScore * 0.4;

  // Compliance Score (0-100)
  this.overallScore.complianceScore = this.complianceMetrics.complianceRate;

  // Total Score (weighted average)
  this.overallScore.totalScore =
    this.overallScore.deliveryScore * 0.3 +
    this.overallScore.qualityScore * 0.3 +
    this.overallScore.financialScore * 0.15 +
    this.overallScore.responsivenessScore * 0.15 +
    this.overallScore.complianceScore * 0.1;

  // Assign Grade
  const score = this.overallScore.totalScore;
  if (score >= 97) this.overallScore.grade = 'A+';
  else if (score >= 93) this.overallScore.grade = 'A';
  else if (score >= 90) this.overallScore.grade = 'A-';
  else if (score >= 87) this.overallScore.grade = 'B+';
  else if (score >= 83) this.overallScore.grade = 'B';
  else if (score >= 80) this.overallScore.grade = 'B-';
  else if (score >= 77) this.overallScore.grade = 'C+';
  else if (score >= 73) this.overallScore.grade = 'C';
  else if (score >= 70) this.overallScore.grade = 'C-';
  else if (score >= 60) this.overallScore.grade = 'D';
  else this.overallScore.grade = 'F';

  // Set performance indicators
  this.performance.excellent = score >= 90;
  this.performance.good = score >= 75 && score < 90;
  this.performance.needsImprovement = score >= 60 && score < 75;
  this.performance.poor = score < 60;
  this.performance.recommended = score >= 75;

  // Generate analysis
  this.generateAnalysis();
};

// Method to generate analysis, strengths, weaknesses
vendorPerformanceSchema.methods.generateAnalysis = function () {
  this.analysis.strengths = [];
  this.analysis.weaknesses = [];
  this.analysis.recommendations = [];
  this.analysis.alerts = [];

  // Analyze delivery
  if (this.deliveryMetrics.onTimeRate >= 95) {
    this.analysis.strengths.push('Excellent on-time delivery record');
  } else if (this.deliveryMetrics.onTimeRate < 80) {
    this.analysis.weaknesses.push('Poor on-time delivery performance');
    this.analysis.recommendations.push('Discuss delivery improvement plan with vendor');
    this.analysis.alerts.push({
      type: 'delivery',
      severity: 'warning',
      message: `On-time delivery rate is ${this.deliveryMetrics.onTimeRate.toFixed(1)}%`,
    });
  }

  // Analyze quality
  if (this.qualityMetrics.defectRate > 5) {
    this.analysis.weaknesses.push('High defect rate in received items');
    this.analysis.recommendations.push('Implement stricter quality inspections');
    this.analysis.alerts.push({
      type: 'quality',
      severity: 'error',
      message: `Defect rate is ${this.qualityMetrics.defectRate.toFixed(1)}%`,
    });
  } else if (this.qualityMetrics.defectRate < 1) {
    this.analysis.strengths.push('Consistently high quality products');
  }

  // Analyze pricing
  if (this.financialMetrics.priceCompetitiveness >= 80) {
    this.analysis.strengths.push('Competitive pricing');
  } else if (this.financialMetrics.priceCompetitiveness < 60) {
    this.analysis.weaknesses.push('Pricing not competitive');
    this.analysis.recommendations.push('Negotiate better pricing or find alternative vendors');
  }

  // Analyze responsiveness
  if (this.responsivenessMetrics.issueResolutionRate < 80) {
    this.analysis.weaknesses.push('Low issue resolution rate');
    this.analysis.recommendations.push('Establish better communication channels');
  }

  // Risk Assessment
  let riskFactors = 0;
  if (this.deliveryMetrics.onTimeRate < 80) riskFactors += 1;
  if (this.qualityMetrics.defectRate > 5) riskFactors += 1;
  if (this.overallScore.totalScore < 70) riskFactors += 1;
  if (this.orderMetrics.completionRate < 85) riskFactors += 1;

  if (riskFactors >= 3) {
    this.analysis.riskLevel = 'Critical';
    this.analysis.alerts.push({
      type: 'risk',
      severity: 'critical',
      message: 'Multiple performance issues detected - consider vendor review',
    });
  } else if (riskFactors === 2) {
    this.analysis.riskLevel = 'High';
  } else if (riskFactors === 1) {
    this.analysis.riskLevel = 'Medium';
  } else {
    this.analysis.riskLevel = 'Low';
  }
};

// Static method to generate performance analysis
vendorPerformanceSchema.statics.generateAnalysis = async function (
  vendorId,
  periodStart,
  periodEnd,
  periodType = 'custom'
) {
  const Vendor = mongoose.model('Vendor');
  const PurchaseOrder = mongoose.model('PurchaseOrder');

  const vendor = await Vendor.findById(vendorId);
  if (!vendor) {
    throw new Error('Vendor not found');
  }

  // Get all purchase orders in period
  const orders = await PurchaseOrder.find({
    vendor: vendorId,
    orderDate: {
      $gte: periodStart,
      $lte: periodEnd,
    },
  });

  const analysis = new this({
    vendor: vendorId,
    vendorName: vendor.name,
    vendorType: vendor.type,
    periodStart,
    periodEnd,
    periodType,
  });

  // Calculate order metrics
  analysis.orderMetrics.totalOrders = orders.length;
  analysis.orderMetrics.completedOrders = orders.filter((o) => o.status === 'Completed').length;
  analysis.orderMetrics.cancelledOrders = orders.filter((o) => o.status === 'Cancelled').length;
  analysis.orderMetrics.pendingOrders = orders.filter((o) =>
    ['Draft', 'Pending', 'Approved', 'Ordered'].includes(o.status)
  ).length;

  if (analysis.orderMetrics.totalOrders > 0) {
    analysis.orderMetrics.completionRate =
      (analysis.orderMetrics.completedOrders / analysis.orderMetrics.totalOrders) * 100;
  }

  analysis.orderMetrics.totalOrderValue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  if (analysis.orderMetrics.totalOrders > 0) {
    analysis.orderMetrics.averageOrderValue =
      analysis.orderMetrics.totalOrderValue / analysis.orderMetrics.totalOrders;
  }

  // Calculate delivery metrics
  const deliveredOrders = orders.filter((o) => o.actualDeliveryDate && o.expectedDeliveryDate);
  if (deliveredOrders.length > 0) {
    analysis.deliveryMetrics.onTimeDeliveries = deliveredOrders.filter(
      (o) => o.deliveryPerformance.onTime
    ).length;
    analysis.deliveryMetrics.lateDeliveries =
      deliveredOrders.length - analysis.deliveryMetrics.onTimeDeliveries;
    analysis.deliveryMetrics.onTimeRate =
      (analysis.deliveryMetrics.onTimeDeliveries / deliveredOrders.length) * 100;

    // Calculate average days late
    const lateOrders = deliveredOrders.filter((o) => !o.deliveryPerformance.onTime);
    if (lateOrders.length > 0) {
      analysis.deliveryMetrics.averageDaysLate =
        lateOrders.reduce((sum, o) => sum + (o.deliveryPerformance.daysLate || 0), 0) /
        lateOrders.length;
    }

    // Calculate average lead time
    const leadTimes = deliveredOrders.map((o) => {
      const orderTime = new Date(o.orderDate).getTime();
      const deliveryTime = new Date(o.actualDeliveryDate).getTime();
      return Math.ceil((deliveryTime - orderTime) / (1000 * 60 * 60 * 24));
    });

    analysis.deliveryMetrics.averageLeadTime =
      leadTimes.reduce((sum, lt) => sum + lt, 0) / leadTimes.length;

    // Calculate lead time variance (standard deviation)
    const avgLeadTime = analysis.deliveryMetrics.averageLeadTime;
    const variance =
      leadTimes.reduce((sum, lt) => sum + (lt - avgLeadTime) ** 2, 0) / leadTimes.length;
    analysis.deliveryMetrics.leadTimeVariance = Math.sqrt(variance);
  }

  // Calculate quality metrics
  orders.forEach((order) => {
    order.items.forEach((item) => {
      analysis.qualityMetrics.totalItemsOrdered += item.quantity;
      analysis.qualityMetrics.totalItemsReceived += item.receivedQuantity || 0;
    });
  });

  const qualityCheckedOrders = orders.filter(
    (o) => o.qualityCheck && o.qualityCheck.passed !== undefined
  );
  if (qualityCheckedOrders.length > 0) {
    analysis.qualityMetrics.qualityChecksPerformed = qualityCheckedOrders.length;
    analysis.qualityMetrics.qualityChecksPassed = qualityCheckedOrders.filter(
      (o) => o.qualityCheck.passed
    ).length;

    // Calculate defect rate
    const totalDefects = qualityCheckedOrders.reduce(
      (sum, o) => sum + (o.qualityCheck.defectRate || 0),
      0
    );
    analysis.qualityMetrics.defectRate = totalDefects / qualityCheckedOrders.length;

    // Average quality rating
    const ratingsOrders = qualityCheckedOrders.filter((o) => o.deliveryPerformance.rating);
    if (ratingsOrders.length > 0) {
      analysis.qualityMetrics.averageQualityRating =
        ratingsOrders.reduce((sum, o) => sum + o.deliveryPerformance.rating, 0) /
        ratingsOrders.length;
    }
  }

  // Calculate financial metrics
  const completedOrders = orders.filter((o) => o.status === 'Completed');
  analysis.financialMetrics.totalSpent = completedOrders.reduce(
    (sum, o) => sum + (o.totalAmount || 0),
    0
  );
  analysis.financialMetrics.totalPaid = completedOrders.reduce(
    (sum, o) => sum + (o.amountPaid || 0),
    0
  );
  analysis.financialMetrics.outstandingBalance =
    analysis.financialMetrics.totalSpent - analysis.financialMetrics.totalPaid;

  const paidOrders = completedOrders.filter((o) => o.payment && o.payment.paidDate);
  if (paidOrders.length > 0) {
    const paymentDays = paidOrders.map((o) => {
      const orderTime = new Date(o.orderDate).getTime();
      const paidTime = new Date(o.payment.paidDate).getTime();
      return Math.ceil((paidTime - orderTime) / (1000 * 60 * 60 * 24));
    });

    analysis.financialMetrics.averagePaymentDays =
      paymentDays.reduce((sum, d) => sum + d, 0) / paymentDays.length;
  }

  // Set price competitiveness (placeholder - would compare with other vendors)
  analysis.financialMetrics.priceCompetitiveness = 75; // Default mid-range

  // Calculate all scores
  analysis.calculateScores();

  return analysis;
};

module.exports = mongoose.model('VendorPerformance', vendorPerformanceSchema);
