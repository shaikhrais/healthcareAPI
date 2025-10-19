
const MigrationBase = require('../utils/MigrationBase');
const MigrationHelper = require('../utils/MigrationHelper');
/**
 * Migration Template: Add Field
 *
 * Use this template to add a new field to an existing model
 */

class AddFieldMigration extends MigrationBase {
  constructor(mongoose) {
    super(mongoose);

    // Migration metadata
    this.version = '1.0.0';
    this.description = 'Add a new field to collection';
    this.author = 'Your Name';

    // Configuration
    this.modelName = 'YourModel'; // e.g., 'User', 'Patient'
    this.fieldName = 'newField';
    this.defaultValue = null; // or any default value
  }

  async up() {
    this.log('Starting migration: Add field');

    const Model = this.models[this.modelName];
    if (!Model) {
      throw new Error(`Model ${this.modelName} not found`);
    }

    // Backup collection
    const backupName = await this.backupCollection(Model.collection.name);

    try {
      // Add the field
      const result = await MigrationHelper.addField(Model, this.fieldName, this.defaultValue);

      this.log(`Added field to ${result.modified} documents`, 'success');

      // Optional: Drop backup if successful
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
    this.log('Rolling back migration: Remove field');

    const Model = this.models[this.modelName];

    // Remove the field
    const result = await MigrationHelper.removeField(Model, this.fieldName);

    this.log(`Removed field from ${result.modified} documents`, 'success');
    return result;
  }
}

module.exports = AddFieldMigration;
