const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
/**
 * Anomaly Model
 *
 * Detects and tracks unusual patterns in practice operations using statistical
 * methods and machine learning techniques.
 *
 * Detection Methods:
 * - Z-Score (standard deviations from mean)
 * - IQR (Interquartile Range outlier detection)
 * - Moving Average (trend deviation)
 * - Percentage Change (sudden spikes/drops)
 * - Time Series Forecasting (Prophet-like predictions)
 */

const anomalySchema = new mongoose.Schema(
  {
    // Anomaly Identification
    anomalyType: {
      type: String,
      required: true,
      enum: [
        'revenue_drop',
        'revenue_spike',
        'appointment_cancellation_spike',
        'no_show_spike',
        'patient_churn_spike',
        'booking_drop',
        'payment_failure_spike',
        'system_performance',
        'security_breach',
        'data_quality',
        'inventory_shortage',
        'staff_utilization_drop',
        'review_sentiment_drop',
        'custom',
      ],
      index: true,
    },

    // Metric Information
    metric: {
      name: {
        type: String,
        required: true,
      },
      value: {
        type: Number,
        required: true,
      },
      expectedValue: {
        type: Number,
      },
      previousValue: {
        type: Number,
      },
      unit: {
        type: String, // 'currency', 'percentage', 'count', 'seconds'
        default: 'count',
      },
    },

    // Statistical Analysis
    statistics: {
      mean: Number,
      median: Number,
      stdDev: Number,
      zScore: Number,
      percentileRank: Number,
      percentageChange: Number,
      deviation: Number, // Absolute deviation from expected
    },

    // Detection Method
    detectionMethod: {
      type: String,
      enum: ['z_score', 'iqr', 'moving_average', 'percentage_change', 'threshold', 'ml_model'],
      required: true,
    },

    // Severity Assessment
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true,
      index: true,
    },
    confidence: {
      type: Number, // 0-100
      default: 0,
    },

    // Time Information
    detectedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    dataPointDate: {
      type: Date,
      required: true,
      index: true,
    },
    timeWindow: {
      type: String, // '1h', '24h', '7d', '30d'
      required: true,
    },

    // Context
    context: {
      description: String,
      possibleCauses: [String],
      affectedEntities: [
        {
          entityType: String, // 'patient', 'practitioner', 'appointment', 'service'
          entityId: mongoose.Schema.Types.ObjectId,
          entityName: String,
        },
      ],
      relatedMetrics: [
        {
          metricName: String,
          value: Number,
          change: Number,
        },
      ],
    },

    // Alert Status
    status: {
      type: String,
      enum: ['new', 'acknowledged', 'investigating', 'resolved', 'false_positive'],
      default: 'new',
      index: true,
    },

    // Alert Actions
    alerts: [
      {
        channel: {
          type: String,
          enum: ['email', 'sms', 'push', 'slack', 'in_app'],
        },
        recipient: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        sentAt: Date,
        delivered: Boolean,
        opened: Boolean,
      },
    ],

    // Investigation
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    investigation: {
      startedAt: Date,
      notes: [
        {
          note: String,
          addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
          addedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      rootCause: String,
      resolution: String,
      resolvedAt: Date,
      resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },

    // Recommendations
    recommendations: [
      {
        action: String,
        priority: {
          type: String,
          enum: ['low', 'medium', 'high', 'urgent'],
        },
        estimated_impact: String,
      },
    ],

    // Pattern Recognition
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringPattern: {
      frequency: String, // 'daily', 'weekly', 'monthly'
      occurrences: Number,
      lastOccurrence: Date,
    },

    // False Positive Tracking
    markedAsFalsePositive: {
      type: Boolean,
      default: false,
    },
    falsePositiveReason: String,

    // Metadata
    rawData: mongoose.Schema.Types.Mixed, // Store original data for analysis
    tags: [String],
  },
  {
    timestamps: true,
  }
);

// ==================== INDEXES ====================

anomalySchema.index({ detectedAt: -1 });
anomalySchema.index({ anomalyType: 1, detectedAt: -1 });
anomalySchema.index({ severity: 1, status: 1 });
anomalySchema.index({ status: 1, detectedAt: -1 });
anomalySchema.index({ assignedTo: 1, status: 1 });

// ==================== METHODS ====================

/**
 * Calculate severity based on deviation and impact
 */
anomalySchema.methods.calculateSeverity = function () {
  let severityScore = 0;

  // Factor 1: Statistical significance (z-score)
  if (this.statistics.zScore) {
    const absZScore = Math.abs(this.statistics.zScore);
    if (absZScore > 3)
      severityScore += 40; // 3+ std devs
    else if (absZScore > 2)
      severityScore += 30; // 2-3 std devs
    else if (absZScore > 1.5)
      severityScore += 20; // 1.5-2 std devs
    else severityScore += 10;
  }

  // Factor 2: Percentage change
  if (this.statistics.percentageChange) {
    const absChange = Math.abs(this.statistics.percentageChange);
    if (absChange > 50) severityScore += 30;
    else if (absChange > 30) severityScore += 20;
    else if (absChange > 15) severityScore += 10;
    else severityScore += 5;
  }

  // Factor 3: Business impact (anomaly type)
  const highImpactTypes = [
    'revenue_drop',
    'security_breach',
    'payment_failure_spike',
    'system_performance',
  ];
  const mediumImpactTypes = [
    'appointment_cancellation_spike',
    'no_show_spike',
    'booking_drop',
    'patient_churn_spike',
  ];

  if (highImpactTypes.includes(this.anomalyType)) severityScore += 30;
  else if (mediumImpactTypes.includes(this.anomalyType)) severityScore += 20;
  else severityScore += 10;

  // Assign severity level
  if (severityScore >= 80) this.severity = 'critical';
  else if (severityScore >= 60) this.severity = 'high';
  else if (severityScore >= 40) this.severity = 'medium';
  else this.severity = 'low';

  // Calculate confidence (0-100)
  this.confidence = Math.min(severityScore, 100);
};

/**
 * Generate context and recommendations
 */
anomalySchema.methods.generateContext = function () {
  const recommendations = [];
  const possibleCauses = [];

  switch (this.anomalyType) {
    case 'revenue_drop':
      possibleCauses.push(
        'Decreased appointment volume',
        'Lower service pricing',
        'Increased cancellations',
        'Seasonal variation',
        'Payment processing issues'
      );
      recommendations.push(
        {
          action: 'Review appointment booking trends',
          priority: 'high',
          estimated_impact: 'Identify booking issues',
        },
        {
          action: 'Check for system outages or errors',
          priority: 'high',
          estimated_impact: 'Resolve technical problems',
        },
        {
          action: 'Analyze cancellation patterns',
          priority: 'medium',
          estimated_impact: 'Reduce cancellations',
        }
      );
      break;

    case 'appointment_cancellation_spike':
      possibleCauses.push(
        'Practitioner unavailability',
        'System issues',
        'Weather/external events',
        'Patient dissatisfaction',
        'Reminder system failure'
      );
      recommendations.push(
        {
          action: 'Contact patients to understand reasons',
          priority: 'high',
          estimated_impact: 'Improve retention',
        },
        {
          action: 'Review practitioner schedules',
          priority: 'medium',
          estimated_impact: 'Optimize availability',
        }
      );
      break;

    case 'no_show_spike':
      possibleCauses.push(
        'Reminder system not working',
        'Seasonal patterns',
        'Patient engagement issues',
        'Booking confirmation problems'
      );
      recommendations.push(
        {
          action: 'Verify reminder system is working',
          priority: 'urgent',
          estimated_impact: 'Reduce no-shows',
        },
        {
          action: 'Implement confirmation calls for high-risk patients',
          priority: 'high',
          estimated_impact: 'Improve attendance',
        }
      );
      break;

    case 'booking_drop':
      possibleCauses.push(
        'Marketing campaign ended',
        'Website/booking system issues',
        'Competitor activity',
        'Seasonal decline',
        'Negative reviews'
      );
      recommendations.push(
        {
          action: 'Test booking system functionality',
          priority: 'urgent',
          estimated_impact: 'Restore booking capability',
        },
        {
          action: 'Review recent marketing changes',
          priority: 'high',
          estimated_impact: 'Identify marketing gaps',
        }
      );
      break;

    case 'payment_failure_spike':
      possibleCauses.push(
        'Payment processor outage',
        'Card expiration wave',
        'Fraud detection false positives',
        'System integration issues'
      );
      recommendations.push(
        {
          action: 'Check payment processor status',
          priority: 'urgent',
          estimated_impact: 'Resolve payment issues',
        },
        {
          action: 'Contact patients with failed payments',
          priority: 'high',
          estimated_impact: 'Recover revenue',
        }
      );
      break;

    case 'security_breach':
      possibleCauses.push(
        'Unauthorized access attempts',
        'Data exfiltration',
        'Suspicious login patterns',
        'Malware detection'
      );
      recommendations.push(
        {
          action: 'Immediately review security logs',
          priority: 'urgent',
          estimated_impact: 'Prevent data loss',
        },
        {
          action: 'Reset passwords for affected accounts',
          priority: 'urgent',
          estimated_impact: 'Secure accounts',
        },
        {
          action: 'Contact security team/vendor',
          priority: 'urgent',
          estimated_impact: 'Expert investigation',
        }
      );
      break;
  }

  this.context.possibleCauses = possibleCauses;
  this.recommendations = recommendations;
  this.context.description = this.generateDescription();
};

/**
 * Generate human-readable description
 */
anomalySchema.methods.generateDescription = function () {
  const metricName = this.metric.name;
  const { value } = this.metric;
  const change = this.statistics.percentageChange;
  const expected = this.metric.expectedValue;

  let description = `Detected ${this.severity} severity anomaly in ${metricName}. `;

  if (change) {
    const direction = change > 0 ? 'increase' : 'decrease';
    description += `${Math.abs(change).toFixed(1)}% ${direction} from expected. `;
  }

  if (expected) {
    description += `Current value: ${value}, Expected: ${expected}. `;
  }

  if (this.statistics.zScore) {
    description += `Statistical significance: ${Math.abs(this.statistics.zScore).toFixed(2)} standard deviations. `;
  }

  return description;
};

/**
 * Send alerts to configured channels
 */
anomalySchema.methods.sendAlerts = async function (recipients) {
  // This would integrate with email/SMS/push notification services
  const alertChannels = ['email', 'in_app']; // Could be 'sms', 'push', 'slack'

  for (const recipient of recipients) {
    for (const channel of alertChannels) {
      this.alerts.push({
        channel,
        recipient: recipient._id,
        sentAt: new Date(),
        delivered: false,
        opened: false,
      });
    }
  }

  await this.save();
  return this.alerts;
};

/**
 * Acknowledge anomaly
 */
anomalySchema.methods.acknowledge = function (userId) {
  this.status = 'acknowledged';
  this.assignedTo = userId;
  this.investigation.startedAt = new Date();
  return this.save();
};

/**
 * Add investigation note
 */
anomalySchema.methods.addNote = function (note, userId) {
  this.investigation.notes.push({
    note,
    addedBy: userId,
    addedAt: new Date(),
  });
  return this.save();
};

/**
 * Resolve anomaly
 */
anomalySchema.methods.resolve = function (resolution, rootCause, userId) {
  this.status = 'resolved';
  this.investigation.resolution = resolution;
  this.investigation.rootCause = rootCause;
  this.investigation.resolvedAt = new Date();
  this.investigation.resolvedBy = userId;
  return this.save();
};

/**
 * Mark as false positive
 */
anomalySchema.methods.markFalsePositive = function (reason) {
  this.status = 'false_positive';
  this.markedAsFalsePositive = true;
  this.falsePositiveReason = reason;
  return this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Detect anomaly using Z-Score method
 */
anomalySchema.statics.detectWithZScore = async function (
  metricName,
  currentValue,
  historicalValues,
  threshold = 2.0
) {
  // Calculate statistics
  const n = historicalValues.length;
  const mean = historicalValues.reduce((sum, val) => sum + val, 0) / n;
  const variance = historicalValues.reduce((sum, val) => sum + (val - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);
  const zScore = stdDev > 0 ? (currentValue - mean) / stdDev : 0;

  // Check if anomaly
  if (Math.abs(zScore) > threshold) {
    return {
      isAnomaly: true,
      statistics: {
        mean,
        stdDev,
        zScore,
        percentageChange: ((currentValue - mean) / mean) * 100,
      },
      expectedValue: mean,
    };
  }

  return { isAnomaly: false };
};

/**
 * Detect anomaly using IQR method
 */
anomalySchema.statics.detectWithIQR = async function (metricName, currentValue, historicalValues) {
  const sorted = [...historicalValues].sort((a, b) => a - b);
  const n = sorted.length;

  const q1Index = Math.floor(n * 0.25);
  const q3Index = Math.floor(n * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;

  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  if (currentValue < lowerBound || currentValue > upperBound) {
    const median = sorted[Math.floor(n / 2)];
    return {
      isAnomaly: true,
      statistics: {
        median,
        percentageChange: ((currentValue - median) / median) * 100,
      },
      expectedValue: median,
    };
  }

  return { isAnomaly: false };
};

/**
 * Detect anomaly using percentage change threshold
 */
anomalySchema.statics.detectWithThreshold = async function (
  metricName,
  currentValue,
  previousValue,
  threshold = 30 // 30% change
) {
  if (!previousValue || previousValue === 0) {
    return { isAnomaly: false };
  }

  const percentageChange = ((currentValue - previousValue) / previousValue) * 100;

  if (Math.abs(percentageChange) > threshold) {
    return {
      isAnomaly: true,
      statistics: {
        percentageChange,
      },
      expectedValue: previousValue,
    };
  }

  return { isAnomaly: false };
};

/**
 * Create and save anomaly record
 */
anomalySchema.statics.createAnomaly = async function (anomalyData) {
  const anomaly = new this(anomalyData);
  anomaly.calculateSeverity();
  anomaly.generateContext();
  await anomaly.save();
  return anomaly;
};

/**
 * Get active anomalies (not resolved/false positive)
 */
anomalySchema.statics.getActiveAnomalies = async function (filters = {}) {
  const query = {
    status: { $in: ['new', 'acknowledged', 'investigating'] },
    ...filters,
  };

  return this.find(query)
    .populate('assignedTo', 'firstName lastName email')
    .sort({ severity: -1, detectedAt: -1 })
    .limit(50);
};

/**
 * Get anomaly statistics
 */
anomalySchema.statics.getStatistics = async function (startDate, endDate) {
  const anomalies = await this.find({
    detectedAt: { $gte: startDate, $lte: endDate },
  });

  const stats = {
    total: anomalies.length,
    bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
    byStatus: { new: 0, acknowledged: 0, investigating: 0, resolved: 0, false_positive: 0 },
    byType: {},
    avgResolutionTime: 0,
    falsePositiveRate: 0,
  };

  let totalResolutionTime = 0;
  let resolvedCount = 0;

  anomalies.forEach((anomaly) => {
    stats.bySeverity[anomaly.severity]++;
    stats.byStatus[anomaly.status]++;
    stats.byType[anomaly.anomalyType] = (stats.byType[anomaly.anomalyType] || 0) + 1;

    if (anomaly.status === 'resolved' && anomaly.investigation.resolvedAt) {
      const resolutionTime =
        (anomaly.investigation.resolvedAt - anomaly.detectedAt) / (1000 * 60 * 60); // hours
      totalResolutionTime += resolutionTime;
      resolvedCount += 1;
    }
  });

  stats.avgResolutionTime = resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0;
  stats.falsePositiveRate =
    anomalies.length > 0 ? (stats.byStatus.false_positive / anomalies.length) * 100 : 0;

  return stats;
};

module.exports = mongoose.model('Anomaly', anomalySchema);
