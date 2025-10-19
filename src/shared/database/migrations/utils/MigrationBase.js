/**
 * Base Migration Class
 *
 * All migrations should extend this class and implement:
 * - up(): Apply the migration
 * - down(): Rollback the migration
 */

class MigrationBase {
  constructor(mongoose) {
    this.mongoose = mongoose;
    this.models = mongoose.models;
    this.connection = mongoose.connection;

    // Migration metadata
    this.name = this.constructor.name;
    this.version = null;
    this.description = '';
    this.author = '';
    this.createdAt = new Date();
  }

  /**
   * Execute the migration
   * @returns {Promise<Object>} Migration result with statistics
   */
  async up() {
    throw new Error('Migration must implement up() method');
  }

  /**
   * Rollback the migration
   * @returns {Promise<Object>} Rollback result
   */
  async down() {
    throw new Error('Migration must implement down() method');
  }

  /**
   * Validate migration before running
   * @returns {Promise<boolean>}
   */
  async validate() {
    return true;
  }

  /**
   * Log migration progress
   */
  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.name}]`;

    switch (type) {
      case 'error':
        console.error(`${prefix} ERROR:`, message);
        break;
      case 'warn':
        console.warn(`${prefix} WARN:`, message);
        break;
      case 'success':
        console.log(`${prefix} SUCCESS:`, message);
        break;
      default:
        console.log(`${prefix} INFO:`, message);
    }
  }

  /**
   * Execute a batch operation with progress tracking
   */
  async executeBatch(items, operation, batchSize = 100) {
    const total = items.length;
    let processed = 0;
    const errors = [];

    this.log(`Processing ${total} items in batches of ${batchSize}...`);

    for (let i = 0; i < total; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      try {
        await Promise.all(
          batch.map(async (item) => {
            try {
              await operation(item);
              processed += 1;
            } catch (err) {
              errors.push({ item, error: err.message });
            }
          })
        );

        const progress = ((processed / total) * 100).toFixed(2);
        this.log(`Progress: ${processed}/${total} (${progress}%)`);
      } catch (err) {
        this.log(`Batch processing error: ${err.message}`, 'error');
      }
    }

    return {
      total,
      processed,
      failed: errors.length,
      errors,
    };
  }

  /**
   * Check if a collection exists
   */
  async collectionExists(collectionName) {
    const collections = await this.connection.db.listCollections().toArray();
    return collections.some((col) => col.name === collectionName);
  }

  /**
   * Create a backup of a collection
   */
  async backupCollection(collectionName) {
    const backupName = `${collectionName}_backup_${Date.now()}`;
    this.log(`Creating backup: ${collectionName} -> ${backupName}`);

    const docs = await this.connection.db.collection(collectionName).find({}).toArray();
    await this.connection.db.collection(backupName).insertMany(docs);

    this.log(`Backup created: ${docs.length} documents`, 'success');
    return backupName;
  }

  /**
   * Restore from a backup collection
   */
  async restoreFromBackup(originalCollection, backupCollection) {
    this.log(`Restoring ${originalCollection} from ${backupCollection}`);

    // Clear original collection
    await this.connection.db.collection(originalCollection).deleteMany({});

    // Restore from backup
    const docs = await this.connection.db.collection(backupCollection).find({}).toArray();
    if (docs.length > 0) {
      await this.connection.db.collection(originalCollection).insertMany(docs);
    }

    this.log(`Restored ${docs.length} documents`, 'success');
  }

  /**
   * Drop a backup collection
   */
  async dropBackup(backupCollection) {
    await this.connection.db.collection(backupCollection).drop();
    this.log(`Dropped backup: ${backupCollection}`);
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats(collectionName) {
    const stats = await this.connection.db.collection(collectionName).stats();
    return {
      count: stats.count,
      size: stats.size,
      avgObjSize: stats.avgObjSize,
    };
  }
}

module.exports = MigrationBase;
