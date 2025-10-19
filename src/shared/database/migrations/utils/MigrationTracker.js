const mongoose = require('mongoose');

/**
 * Migration Tracker
 *
 * Tracks which migrations have been applied to the database
 */

// eslint-disable-next-line no-unused-vars

const migrationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  version: {
    type: String,
    required: true,
  },
  description: String,
  author: String,
  appliedAt: {
    type: Date,
    default: Date.now,
  },
  executionTime: {
    type: Number, // milliseconds
    required: true,
  },
  status: {
    type: String,
    enum: ['completed', 'failed', 'rolled_back'],
    default: 'completed',
  },
  result: {
    type: mongoose.Schema.Types.Mixed,
  },
  error: String,
  rollbackAt: Date,
});

const Migration = mongoose.model('Migration', migrationSchema);

class MigrationTracker {
  /**
   * Check if a migration has been applied
   */
  static async hasBeenApplied(name) {
    const migration = await Migration.findOne({ name, status: 'completed' });
    return !!migration;
  }

  /**
   * Record a successful migration
   */
  static async recordMigration(name, version, description, author, executionTime, result) {
    return await Migration.create({
      name,
      version,
      description,
      author,
      executionTime,
      status: 'completed',
      result,
    });
  }

  /**
   * Record a failed migration
   */
  static async recordFailure(name, version, description, author, executionTime, error) {
    return await Migration.create({
      name,
      version,
      description,
      author,
      executionTime,
      status: 'failed',
      error: error.toString(),
    });
  }

  /**
   * Record a rollback
   */
  static async recordRollback(name) {
    return await Migration.findOneAndUpdate(
      { name, status: 'completed' },
      {
        status: 'rolled_back',
        rollbackAt: new Date(),
      },
      { new: true }
    );
  }

  /**
   * Get all applied migrations
   */
  static async getAppliedMigrations() {
    return await Migration.find({ status: 'completed' }).sort({ appliedAt: 1 });
  }

  /**
   * Get failed migrations
   */
  static async getFailedMigrations() {
    return await Migration.find({ status: 'failed' }).sort({ appliedAt: -1 });
  }

  /**
   * Get migration history
   */
  static async getHistory(limit = 50) {
    return await Migration.find().sort({ appliedAt: -1 }).limit(limit);
  }

  /**
   * Get migration by name
   */
  static async getMigration(name) {
    return await Migration.findOne({ name });
  }

  /**
   * Clear all migration records (use with caution!)
   */
  static async clearAll() {
    return await Migration.deleteMany({});
  }

  /**
   * Get migration statistics
   */
  static async getStats() {
    const total = await Migration.countDocuments();
    const completed = await Migration.countDocuments({ status: 'completed' });
    const failed = await Migration.countDocuments({ status: 'failed' });
    const rolledBack = await Migration.countDocuments({ status: 'rolled_back' });

    return {
      total,
      completed,
      failed,
      rolledBack,
    };
  }
}

module.exports = { MigrationTracker, Migration };
