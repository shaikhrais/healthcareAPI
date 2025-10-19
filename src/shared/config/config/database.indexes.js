const mongoose = require('mongoose');

const logger = require('./logger.config');
/**
 * Database Indexing Configuration
 * Optimizes query performance for production workloads
 */

// eslint-disable-next-line no-unused-vars

// eslint-disable-next-line no-unused-vars
/**
 * Create indexes for all models
 * Call this function after database connection is established
 */
async function createIndexes() {
  try {
    logger.info('Creating database indexes...');

    const User = mongoose.model('User');
    const Patient = mongoose.model('Patient');
    const Appointment = mongoose.model('Appointment');
    const Treatment = mongoose.model('Treatment');
    const Shift = mongoose.model('Shift');
    const Waitlist = mongoose.model('Waitlist');

    // ===== User Indexes =====
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ role: 1 });
    await User.collection.createIndex({ active: 1 });
    await User.collection.createIndex({ createdAt: -1 });

    // ===== Patient Indexes =====
    await Patient.collection.createIndex({ email: 1 }, { unique: true });
    await Patient.collection.createIndex({ phone: 1 });
    await Patient.collection.createIndex({ firstName: 1, lastName: 1 });
    await Patient.collection.createIndex({ active: 1 });
    await Patient.collection.createIndex({ createdAt: -1 });

    // Text search index for patient search
    await Patient.collection.createIndex(
      {
        firstName: 'text',
        lastName: 'text',
        email: 'text',
        phone: 'text',
      },
      { name: 'patient_search' }
    );

    // ===== Appointment Indexes =====
    // Primary query patterns
    await Appointment.collection.createIndex({ startTime: 1 });
    await Appointment.collection.createIndex({ endTime: 1 });
    await Appointment.collection.createIndex({ practitioner: 1, startTime: 1 });
    await Appointment.collection.createIndex({ patient: 1, startTime: -1 });
    await Appointment.collection.createIndex({ status: 1, startTime: 1 });
    await Appointment.collection.createIndex({ treatment: 1 });

    // Compound indexes for common queries
    await Appointment.collection.createIndex({ practitioner: 1, startTime: 1, status: 1 });
    await Appointment.collection.createIndex({ patient: 1, status: 1, startTime: -1 });

    // Date range queries
    await Appointment.collection.createIndex({ startTime: 1, endTime: 1 });

    // Created/updated tracking
    await Appointment.collection.createIndex({ createdAt: -1 });
    await Appointment.collection.createIndex({ updatedAt: -1 });

    // ===== Treatment Indexes =====
    await Treatment.collection.createIndex({ name: 1 }, { unique: true });
    await Treatment.collection.createIndex({ category: 1 });
    await Treatment.collection.createIndex({ active: 1 });
    await Treatment.collection.createIndex({ onlineBookingEnabled: 1 });
    await Treatment.collection.createIndex({ price: 1 });

    // ===== Shift Indexes =====
    await Shift.collection.createIndex({ practitioner: 1, date: 1 });
    await Shift.collection.createIndex({ date: 1, practitioner: 1 });
    await Shift.collection.createIndex({ practitioner: 1, date: 1, status: 1 });
    await Shift.collection.createIndex({ status: 1 });
    await Shift.collection.createIndex({ isRecurring: 1 });
    await Shift.collection.createIndex({ recurringParent: 1 });

    // Date range queries for shifts
    await Shift.collection.createIndex({ date: 1 });

    // ===== Waitlist Indexes =====
    await Waitlist.collection.createIndex({ patient: 1 });
    await Waitlist.collection.createIndex({ treatment: 1 });
    await Waitlist.collection.createIndex({ preferredPractitioner: 1 });
    await Waitlist.collection.createIndex({ status: 1 });
    await Waitlist.collection.createIndex({ priority: -1 });
    await Waitlist.collection.createIndex({ createdAt: 1 });

    // Compound index for active waitlist entries
    await Waitlist.collection.createIndex({ status: 1, priority: -1, createdAt: 1 });

    logger.info('Database indexes created successfully');

    // Log index statistics
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const collection of collections) {
      const indexes = await mongoose.connection.db.collection(collection.name).indexes();
      logger.info(`Collection: ${collection.name}, Indexes: ${indexes.length}`);
    }
  } catch (error) {
    logger.error('Error creating database indexes', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Get database statistics
 */
async function getDatabaseStats() {
  try {
    const stats = await mongoose.connection.db.stats();
    return {
      database: stats.db,
      collections: stats.collections,
      dataSize: `${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`,
      indexSize: `${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`,
      totalSize: `${((stats.dataSize + stats.indexSize) / 1024 / 1024).toFixed(2)} MB`,
      indexes: stats.indexes,
      avgObjSize: `${(stats.avgObjSize / 1024).toFixed(2)} KB`,
    };
  } catch (error) {
    logger.error('Error getting database stats', { error: error.message });
    throw error;
  }
}

/**
 * Analyze slow queries
 */
async function enableQueryProfiling() {
  try {
    // Enable profiling level 1 (log slow queries > 100ms)
    await mongoose.connection.db.setProfilingLevel(1, { slowms: 100 });
    logger.info('Query profiling enabled (threshold: 100ms)');
  } catch (error) {
    logger.error('Error enabling query profiling', { error: error.message });
  }
}

/**
 * Get slow queries from system.profile
 */
async function getSlowQueries(limit = 10) {
  try {
    const profiler = mongoose.connection.db.collection('system.profile');
    const slowQueries = await profiler
      .find({ millis: { $gt: 100 } })
      .sort({ millis: -1 })
      .limit(limit)
      .toArray();

    return slowQueries.map((query) => ({
      operation: query.op,
      namespace: query.ns,
      duration: `${query.millis}ms`,
      timestamp: query.ts,
      command: query.command,
    }));
  } catch (error) {
    logger.error('Error fetching slow queries', { error: error.message });
    return [];
  }
}

module.exports = {
  createIndexes,
  getDatabaseStats,
  enableQueryProfiling,
  getSlowQueries,
};
