
const MigrationBase = require('../utils/MigrationBase');
const MigrationHelper = require('../utils/MigrationHelper');
/**
 * Migration Template: Data Transformation
 *
 * Use this template to transform existing data
 */

class DataTransformationMigration extends MigrationBase {
  constructor(mongoose) {
    super(mongoose);

    // Migration metadata
    this.version = '1.0.0';
    this.description = 'Transform data in collection';
    this.author = 'Your Name';

    // Configuration
    this.modelName = 'YourModel';
    this.batchSize = 100;
  }

  /**
   * Define your transformation logic here
   */
  transformDocument(doc) {
    // Example: Convert phone number format
    // if (doc.phone) {
    //   doc.phone = doc.phone.replace(/\D/g, '');
    // }

    // Example: Combine fields
    // doc.fullName = `${doc.firstName} ${doc.lastName}`;

    // Example: Convert string to number
    // if (typeof doc.age === 'string') {
    //   doc.age = parseInt(doc.age, 10);
    // }

    // Return false to skip this document
    // return false;

    return doc;
  }

  async up() {
    this.log('Starting data transformation migration');

    const Model = this.models[this.modelName];
    if (!Model) {
      throw new Error(`Model ${this.modelName} not found`);
    }

    // Backup collection
    const backupName = await this.backupCollection(Model.collection.name);

    try {
      // Transform data
      const result = await MigrationHelper.transformData(
        Model,
        {}, // query filter (empty = all documents)
        this.transformDocument.bind(this),
        this.batchSize
      );

      this.log(`Transformed ${result.count} documents`, 'success');

      if (result.errors.length > 0) {
        this.log(`${result.errors.length} errors occurred`, 'warn');
      }

      // Drop backup if successful
      await this.dropBackup(backupName);

      return result;
    } catch (err) {
      this.log(`Migration failed: ${err.message}`, 'error');
      // Restore from backup
      await this.restoreFromBackup(Model.collection.name, backupName);
      throw err;
    }
  }

  async down() {
    this.log('Rolling back data transformation');

    // Note: For complex transformations, you may need to store
    // the original values to properly rollback

    this.log('Manual rollback may be required', 'warn');
    return { message: 'Rollback not implemented for this migration' };
  }
}

module.exports = DataTransformationMigration;
