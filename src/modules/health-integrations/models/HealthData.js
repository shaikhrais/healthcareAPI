const mongoose = require('mongoose');

/**
 * HealthData Model
 * Stores health data from various sources (Apple Health, Google Fit, etc.)
 */
const healthDataSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      index: true,
    },
    // Data source information
    source: {
      platform: {
        type: String,
        enum: ['apple_health', 'google_fit', 'fitbit', 'samsung_health', 'manual', 'device'],
        required: true,
      },
      appName: String,
      deviceModel: String,
      version: String,
      sourceId: String, // External ID from the platform
    },
    // Data type and category
    dataType: {
      type: String,
      enum: [
        // Vitals
        'heart_rate', 'blood_pressure', 'body_temperature', 'respiratory_rate', 'oxygen_saturation',
        // Body measurements
        'weight', 'height', 'bmi', 'body_fat_percentage', 'muscle_mass', 'bone_mass',
        // Activity
        'steps', 'distance', 'calories_burned', 'active_minutes', 'exercise_minutes',
        'floors_climbed', 'sedentary_minutes',
        // Sleep
        'sleep_duration', 'sleep_efficiency', 'deep_sleep', 'light_sleep', 'rem_sleep', 'awake_time',
        // Nutrition
        'water_intake', 'calorie_intake', 'protein', 'carbohydrates', 'fat', 'fiber',
        // Mental health
        'stress_level', 'mood', 'anxiety_level',
        // Medical
        'blood_glucose', 'medication_taken', 'symptoms',
        // Women's health
        'menstrual_cycle', 'ovulation',
        // Environmental
        'uv_exposure', 'noise_level',
      ],
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['vitals', 'activity', 'sleep', 'nutrition', 'mental_health', 'medical', 'body_measurements'],
      required: true,
    },
    // Data values
    value: {
      numeric: Number,
      text: String,
      boolean: Boolean,
      // For complex data like blood pressure
      complex: {
        systolic: Number,
        diastolic: Number,
        // Add other complex value fields as needed
      },
    },
    unit: {
      type: String,
      enum: [
        'bpm', 'mmHg', 'celsius', 'fahrenheit', 'percent', 'mg/dl', 'kg', 'lbs', 'cm', 'ft', 'in',
        'steps', 'meters', 'km', 'miles', 'calories', 'minutes', 'hours', 'ml', 'oz', 'grams',
        'mg', 'mcg', 'iu', 'score',
      ],
    },
    // Timestamp information
    recordedAt: {
      type: Date,
      required: true,
      index: true,
    },
    syncedAt: {
      type: Date,
      default: Date.now,
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
    // Data quality and validation
    quality: {
      accuracy: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium',
      },
      confidence: {
        type: Number,
        min: 0,
        max: 100,
        default: 80,
      },
      validated: {
        type: Boolean,
        default: false,
      },
      validatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      validatedAt: Date,
    },
    // Metadata
    metadata: {
      duration: Number, // For activities, sleep, etc.
      location: {
        latitude: Number,
        longitude: Number,
        altitude: Number,
      },
      weather: {
        temperature: Number,
        humidity: Number,
        conditions: String,
      },
      tags: [String],
      notes: String,
    },
    // Sync and processing status
    status: {
      type: String,
      enum: ['pending', 'processed', 'validated', 'flagged', 'ignored'],
      default: 'pending',
    },
    flags: [{
      type: {
        type: String,
        enum: ['outlier', 'duplicate', 'invalid_range', 'missing_context', 'manual_review'],
      },
      reason: String,
      flaggedAt: { type: Date, default: Date.now },
      flaggedBy: String, // System or user ID
      resolved: { type: Boolean, default: false },
      resolvedAt: Date,
      resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    }],
    // Integration with clinical records
    clinicalContext: {
      appointmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment',
      },
      clinicalNoteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ClinicalNote',
      },
      relevantToConditions: [String], // ICD-10 codes or condition names
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for efficient querying
healthDataSchema.index({ user: 1, dataType: 1, recordedAt: -1 });
healthDataSchema.index({ patient: 1, category: 1, recordedAt: -1 });
healthDataSchema.index({ 'source.platform': 1, 'source.sourceId': 1 });
healthDataSchema.index({ status: 1, recordedAt: -1 });
healthDataSchema.index({ 'flags.type': 1, 'flags.resolved': 1 });

// Virtual for formatted value
healthDataSchema.virtual('formattedValue').get(function () {
  if (this.value.complex) {
    // Handle complex values like blood pressure
    if (this.dataType === 'blood_pressure') {
      return `${this.value.complex.systolic}/${this.value.complex.diastolic} ${this.unit}`;
    }
    return JSON.stringify(this.value.complex);
  }
  
  if (this.value.numeric !== undefined) {
    return `${this.value.numeric} ${this.unit || ''}`.trim();
  }
  
  if (this.value.text) {
    return this.value.text;
  }
  
  if (this.value.boolean !== undefined) {
    return this.value.boolean ? 'Yes' : 'No';
  }
  
  return 'N/A';
});

// Virtual for data age
healthDataSchema.virtual('dataAge').get(function () {
  const now = new Date();
  const recorded = new Date(this.recordedAt);
  const diffMs = now - recorded;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
});

// Method to validate data range
healthDataSchema.methods.validateRange = function () {
  const ranges = {
    heart_rate: { min: 30, max: 220 },
    weight: { min: 20, max: 300 }, // kg
    steps: { min: 0, max: 100000 },
    blood_glucose: { min: 50, max: 500 }, // mg/dl
    body_temperature: { min: 35, max: 42 }, // celsius
    // Add more ranges as needed
  };
  
  const range = ranges[this.dataType];
  if (!range || this.value.numeric === undefined) {
    return true; // No validation rule or not numeric
  }
  
  const value = this.value.numeric;
  const isValid = value >= range.min && value <= range.max;
  
  if (!isValid) {
    this.flags.push({
      type: 'invalid_range',
      reason: `Value ${value} is outside expected range ${range.min}-${range.max}`,
      flaggedBy: 'system',
    });
    this.status = 'flagged';
  }
  
  return isValid;
};

// Method to detect potential duplicates
healthDataSchema.methods.checkForDuplicates = async function () {
  const duplicateQuery = {
    user: this.user,
    dataType: this.dataType,
    recordedAt: {
      $gte: new Date(this.recordedAt.getTime() - 5 * 60 * 1000), // 5 minutes before
      $lte: new Date(this.recordedAt.getTime() + 5 * 60 * 1000), // 5 minutes after
    },
    _id: { $ne: this._id },
  };
  
  const duplicates = await this.constructor.find(duplicateQuery);
  
  if (duplicates.length > 0) {
    this.flags.push({
      type: 'duplicate',
      reason: `Found ${duplicates.length} similar records within 5 minutes`,
      flaggedBy: 'system',
    });
    this.status = 'flagged';
    await this.save();
  }
  
  return duplicates;
};

// Method to flag as outlier
healthDataSchema.methods.flagAsOutlier = function (reason) {
  this.flags.push({
    type: 'outlier',
    reason: reason || 'Statistical outlier detected',
    flaggedBy: 'system',
  });
  this.status = 'flagged';
  return this.save();
};

// Method to resolve flag
healthDataSchema.methods.resolveFlag = function (flagIndex, userId) {
  if (this.flags[flagIndex]) {
    this.flags[flagIndex].resolved = true;
    this.flags[flagIndex].resolvedAt = new Date();
    this.flags[flagIndex].resolvedBy = userId;
    
    // Check if all flags are resolved
    const unresolvedFlags = this.flags.filter(flag => !flag.resolved);
    if (unresolvedFlags.length === 0) {
      this.status = 'validated';
    }
  }
  return this.save();
};

// Static method to get user's latest data by type
healthDataSchema.statics.getLatestByType = function (userId, dataType, limit = 10) {
  return this.find({
    user: userId,
    dataType,
    status: { $ne: 'ignored' },
  })
    .sort({ recordedAt: -1 })
    .limit(limit);
};

// Static method to get data in date range
healthDataSchema.statics.getInDateRange = function (userId, startDate, endDate, options = {}) {
  const query = {
    user: userId,
    recordedAt: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
    status: { $ne: 'ignored' },
  };
  
  if (options.dataType) {
    query.dataType = options.dataType;
  }
  
  if (options.category) {
    query.category = options.category;
  }
  
  return this.find(query).sort({ recordedAt: -1 });
};

// Static method to get aggregate statistics
healthDataSchema.statics.getStats = function (userId, dataType, days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        dataType,
        recordedAt: { $gte: startDate },
        status: { $ne: 'ignored' },
      },
    },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        avg: { $avg: '$value.numeric' },
        min: { $min: '$value.numeric' },
        max: { $max: '$value.numeric' },
        latest: { $max: '$recordedAt' },
        earliest: { $min: '$recordedAt' },
      },
    },
  ]);
};

// Static method to cleanup old data
healthDataSchema.statics.cleanupOldData = async function (daysToKeep = 365) {
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
  
  const result = await this.deleteMany({
    recordedAt: { $lt: cutoffDate },
    status: { $in: ['ignored', 'flagged'] },
  });
  
  return result.deletedCount;
};

// Pre-save middleware for validation
healthDataSchema.pre('save', function (next) {
  // Validate data range if it's a new record
  if (this.isNew) {
    this.validateRange();
  }
  
  // Set category based on dataType if not provided
  if (!this.category) {
    const categoryMap = {
      heart_rate: 'vitals',
      blood_pressure: 'vitals',
      steps: 'activity',
      weight: 'body_measurements',
      sleep_duration: 'sleep',
      // Add more mappings as needed
    };
    this.category = categoryMap[this.dataType] || 'medical';
  }
  
  next();
});

module.exports = mongoose.model('HealthData', healthDataSchema);