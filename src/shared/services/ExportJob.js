const path = require('path');
const fs = require('fs').promises;
const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
/**
 * ExportJob Model
 *
 * Manages async data exports for large datasets with support for Excel, CSV, and PDF formats.
 * Uses background job processing to handle large exports without blocking the API.
 */

const exportJobSchema = new mongoose.Schema(
  {
    // Job identification
    jobId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Export configuration
    exportType: {
      type: String,
      required: true,
      enum: [
        'appointments',
        'patients',
        'payments',
        'practitioners',
        'inventory',
        'analytics_report',
        'service_line_analysis',
        'churn_predictions',
        'attribution_report',
        'anomalies',
        'custom_query',
      ],
      index: true,
    },

    format: {
      type: String,
      required: true,
      enum: ['excel', 'csv', 'pdf'],
      default: 'csv',
    },

    // User information
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Filters and parameters
    filters: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    columns: [String], // Specific columns to export
    dateRange: {
      startDate: Date,
      endDate: Date,
    },

    // Job status
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },

    // Progress tracking
    progress: {
      total: {
        type: Number,
        default: 0,
      },
      processed: {
        type: Number,
        default: 0,
      },
      percentage: {
        type: Number,
        default: 0,
      },
    },

    // Timing information
    startedAt: Date,
    completedAt: Date,
    estimatedCompletionTime: Date,
    processingDuration: Number, // milliseconds

    // File information
    file: {
      filename: String,
      path: String,
      size: Number, // bytes
      mimeType: String,
      downloadUrl: String,
    },

    // Error handling
    error: {
      message: String,
      stack: String,
      code: String,
    },

    // Metadata
    recordCount: {
      type: Number,
      default: 0,
    },
    chunkSize: {
      type: Number,
      default: 1000, // Process in chunks
    },

    // Download tracking
    downloads: [
      {
        downloadedAt: Date,
        ipAddress: String,
        userAgent: String,
      },
    ],
    downloadCount: {
      type: Number,
      default: 0,
    },

    // Expiration
    expiresAt: {
      type: Date,
      index: true,
    },
    autoDelete: {
      type: Boolean,
      default: true,
    },

    // Notifications
    notifyOnComplete: {
      type: Boolean,
      default: true,
    },
    notificationSent: {
      type: Boolean,
      default: false,
    },

    // Additional options
    options: {
      includeHeaders: {
        type: Boolean,
        default: true,
      },
      formatting: {
        dateFormat: String,
        numberFormat: String,
        timezone: String,
      },
      compression: {
        type: Boolean,
        default: false,
      },
      password: String, // For protected files
    },

    tags: [String],
    notes: String,
  },
  {
    timestamps: true,
  }
);

// ==================== INDEXES ====================

exportJobSchema.index({ requestedBy: 1, createdAt: -1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// exportJobSchema.index({ status: 1, createdAt: -1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// exportJobSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
exportJobSchema.index({ jobId: 1, requestedBy: 1 });

// ==================== METHODS ====================

/**
 * Start processing the export job
 */
exportJobSchema.methods.startProcessing = function () {
  this.status = 'processing';
  this.startedAt = new Date();
  this.progress.processed = 0;
  this.progress.percentage = 0;
  return this.save();
};

/**
 * Update progress
 */
exportJobSchema.methods.updateProgress = function (processed, total) {
  this.progress.processed = processed;
  this.progress.total = total;
  this.progress.percentage = total > 0 ? Math.round((processed / total) * 100) : 0;

  // Estimate completion time based on current progress
  if (this.startedAt && this.progress.percentage > 0) {
    const elapsed = Date.now() - this.startedAt.getTime();
    const totalEstimated = (elapsed / this.progress.percentage) * 100;
    const remaining = totalEstimated - elapsed;
    this.estimatedCompletionTime = new Date(Date.now() + remaining);
  }

  return this.save();
};

/**
 * Mark as completed
 */
exportJobSchema.methods.complete = function (fileInfo) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.progress.percentage = 100;

  if (this.startedAt) {
    this.processingDuration = this.completedAt - this.startedAt;
  }

  if (fileInfo) {
    this.file = {
      filename: fileInfo.filename,
      path: fileInfo.path,
      size: fileInfo.size,
      mimeType: fileInfo.mimeType,
      downloadUrl: fileInfo.downloadUrl,
    };
  }

  // Set expiration (default: 7 days)
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  return this.save();
};

/**
 * Mark as failed
 */
exportJobSchema.methods.fail = function (error) {
  this.status = 'failed';
  this.completedAt = new Date();

  if (this.startedAt) {
    this.processingDuration = this.completedAt - this.startedAt;
  }

  this.error = {
    message: error.message || 'Unknown error',
    stack: error.stack,
    code: error.code,
  };

  return this.save();
};

/**
 * Cancel the export job
 */
exportJobSchema.methods.cancel = function () {
  if (this.status === 'pending' || this.status === 'processing') {
    this.status = 'cancelled';
    this.completedAt = new Date();
    return this.save();
  }
  throw new Error('Cannot cancel job with status: ' + this.status);
};

/**
 * Record a download
 */
exportJobSchema.methods.recordDownload = function (downloadInfo) {
  this.downloads.push({
    downloadedAt: new Date(),
    ipAddress: downloadInfo.ipAddress,
    userAgent: downloadInfo.userAgent,
  });
  this.downloadCount += 1;
  return this.save();
};

/**
 * Delete export file
 */
exportJobSchema.methods.deleteFile = async function () {
  if (this.file && this.file.path) {
    try {
      await fs.unlink(this.file.path);
      this.file = undefined;
      await this.save();
      return true;
    } catch (error) {
      console.error('Error deleting export file:', error);
      return false;
    }
  }
  return false;
};

/**
 * Check if job is expired
 */
exportJobSchema.methods.isExpired = function () {
  return this.expiresAt && this.expiresAt < new Date();
};

/**
 * Extend expiration
 */
exportJobSchema.methods.extendExpiration = function (days = 7) {
  this.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Create a new export job
 */
exportJobSchema.statics.createJob = async function (jobData) {
  const jobId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const job = new this({
    jobId,
    exportType: jobData.exportType,
    format: jobData.format || 'csv',
    requestedBy: jobData.requestedBy,
    filters: jobData.filters || {},
    columns: jobData.columns || [],
    dateRange: jobData.dateRange,
    options: jobData.options || {},
    tags: jobData.tags || [],
    notes: jobData.notes,
  });

  await job.save();
  return job;
};

/**
 * Get user's export jobs
 */
exportJobSchema.statics.getUserJobs = async function (userId, filters = {}) {
  const query = {
    requestedBy: userId,
    ...filters,
  };

  return this.find(query).sort({ createdAt: -1 }).limit(50);
};

/**
 * Get pending jobs for processing
 */
exportJobSchema.statics.getPendingJobs = async function (limit = 10) {
  return this.find({ status: 'pending' }).sort({ createdAt: 1 }).limit(limit);
};

/**
 * Clean up expired jobs
 */
exportJobSchema.statics.cleanupExpired = async function () {
  const expiredJobs = await this.find({
    status: 'completed',
    expiresAt: { $lt: new Date() },
    autoDelete: true,
  });

  let deleted = 0;
  for (const job of expiredJobs) {
    await job.deleteFile();
    await job.deleteOne();
    deleted += 1;
  }

  return deleted;
};

/**
 * Get export statistics
 */
exportJobSchema.statics.getStatistics = async function (startDate, endDate) {
  const query = {};
  if (startDate && endDate) {
    query.createdAt = { $gte: startDate, $lte: endDate };
  }

  const jobs = await this.find(query);

  const stats = {
    total: jobs.length,
    byStatus: {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    },
    byFormat: {
      excel: 0,
      csv: 0,
      pdf: 0,
    },
    byType: {},
    totalRecords: 0,
    totalDownloads: 0,
    totalSize: 0,
    avgProcessingTime: 0,
    failureRate: 0,
  };

  let totalProcessingTime = 0;
  let processedCount = 0;

  jobs.forEach((job) => {
    stats.byStatus[job.status]++;
    stats.byFormat[job.format]++;
    stats.byType[job.exportType] = (stats.byType[job.exportType] || 0) + 1;
    stats.totalRecords += job.recordCount || 0;
    stats.totalDownloads += job.downloadCount || 0;
    stats.totalSize += job.file?.size || 0;

    if (job.processingDuration) {
      totalProcessingTime += job.processingDuration;
      processedCount += 1;
    }
  });

  stats.avgProcessingTime = processedCount > 0 ? totalProcessingTime / processedCount : 0;
  stats.failureRate = jobs.length > 0 ? (stats.byStatus.failed / jobs.length) * 100 : 0;

  return stats;
};

/**
 * Cancel all pending jobs for a user
 */
exportJobSchema.statics.cancelUserJobs = async function (userId) {
  const jobs = await this.find({
    requestedBy: userId,
    status: { $in: ['pending', 'processing'] },
  });

  for (const job of jobs) {
    await job.cancel();
  }

  return jobs.length;
};

// ==================== HOOKS ====================

// Pre-save hook to generate filename
exportJobSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status === 'completed' && !this.file.filename) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const extension = this.format === 'excel' ? 'xlsx' : this.format;
    this.file.filename = `${this.exportType}_${timestamp}.${extension}`;
  }
  next();
});

module.exports = mongoose.model('ExportJob', exportJobSchema);
