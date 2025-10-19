
const MigrationBase = require('../utils/MigrationBase');
/**
 * Migration Template: Seed Data
 *
 * Use this template to seed initial or test data
 */

class SeedDataMigration extends MigrationBase {
  constructor(mongoose) {
    super(mongoose);

    // Migration metadata
    this.version = '1.0.0';
    this.description = 'Seed initial data';
    this.author = 'Your Name';

    // Configuration
    this.modelName = 'YourModel';
  }

  /**
   * Define your seed data here
   */
  getSeedData() {
    return [
      // Example seed data
      // {
      //   name: 'Sample Item 1',
      //   description: 'Description 1',
      //   active: true
      // },
      // {
      //   name: 'Sample Item 2',
      //   description: 'Description 2',
      //   active: true
      // }
    ];
  }

  async up() {
    this.log('Starting seed data migration');

    const Model = this.models[this.modelName];
    if (!Model) {
      throw new Error(`Model ${this.modelName} not found`);
    }

    const seedData = this.getSeedData();
    this.log(`Seeding ${seedData.length} items...`);

    const created = [];
    const errors = [];

    for (const item of seedData) {
      try {
        // Check if item already exists (optional)
        // const exists = await Model.findOne({ name: item.name });
        // if (exists) {
        //   this.log(`Skipping existing item: ${item.name}`, 'warn');
        //   continue;
        // }

        const doc = await Model.create(item);
        created.push(doc._id);
      } catch (err) {
        errors.push({
          item,
          error: err.message,
        });
        this.log(`Error creating item: ${err.message}`, 'error');
      }
    }

    this.log(`Created ${created.length} items`, 'success');

    if (errors.length > 0) {
      this.log(`${errors.length} errors occurred`, 'warn');
    }

    return {
      total: seedData.length,
      created: created.length,
      failed: errors.length,
      createdIds: created,
      errors,
    };
  }

  async down() {
    this.log('Rolling back seed data');

    const Model = this.models[this.modelName];
    const seedData = this.getSeedData();

    // Remove seeded items
    // Note: This assumes you can identify seeded items by some unique field

    // Example: Remove by name
    // const names = seedData.map(item => item.name);
    // const result = await Model.deleteMany({ name: { $in: names } });

    // Or: Store the created IDs during up() and remove by ID
    // const result = await Model.deleteMany({ _id: { $in: createdIds } });

    this.log('Seed data removed', 'success');
    return { message: 'Seed data rollback completed' };
  }
}

module.exports = SeedDataMigration;
