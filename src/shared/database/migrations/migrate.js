const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');


const { MigrationTracker } = require('./utils/MigrationTracker');
const MigrationBase = require('../utils/MigrationBase');
const MigrationHelper = require('../utils/MigrationHelper');
#!/usr/bin/env node

/**
 * Migration Runner
 *
 * Usage:
 *   node migrate.js up              - Run all pending migrations
 *   node migrate.js down            - Rollback last migration
 *   node migrate.js down --all      - Rollback all migrations
 *   node migrate.js status          - Show migration status
 *   node migrate.js create <name>   - Create a new migration file
 *   node migrate.js list            - List all migrations
 *   node migrate.js history         - Show migration history
 */

// eslint-disable-next-line no-unused-vars

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MIGRATIONS_DIR = path.join(__dirname, 'pending');
const COMPLETED_DIR = path.join(__dirname, 'completed');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/expojane';

class MigrationRunner {
  constructor() {
    this.mongoose = mongoose;
  }

  async connect() {
    try {
      await mongoose.connect(MONGODB_URI);
      console.log('Connected to MongoDB');
    } catch (err) {
      console.error('Failed to connect to MongoDB:', err);
      throw err;
    }
  }

  async disconnect() {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }

  async getPendingMigrations() {
    const files = await fs.readdir(MIGRATIONS_DIR);
    const migrations = files.filter((f) => f.endsWith('.js')).sort();

    const pending = [];

    for (const file of migrations) {
      const name = path.basename(file, '.js');
      const hasBeenApplied = await MigrationTracker.hasBeenApplied(name);

      if (!hasBeenApplied) {
        pending.push({
          name,
          file: path.join(MIGRATIONS_DIR, file),
        });
      }
    }

    return pending;
  }

  async runMigration(migrationPath) {
    const name = path.basename(migrationPath, '.js');
    console.log(`\nRunning migration: ${name}`);

    const MigrationClass = require(migrationPath);
    const migration = new MigrationClass(this.mongoose);

    const startTime = Date.now();

    try {
      // Validate migration
      const isValid = await migration.validate();
      if (!isValid) {
        throw new Error('Migration validation failed');
      }

      // Run migration
      const result = await migration.up();
      const executionTime = Date.now() - startTime;

      // Record success
      await MigrationTracker.recordMigration(
        name,
        migration.version || '1.0.0',
        migration.description || '',
        migration.author || '',
        executionTime,
        result
      );

      console.log(`Migration ${name} completed in ${executionTime}ms`);

      // Move to completed directory
      const completedPath = path.join(COMPLETED_DIR, path.basename(migrationPath));
      await fs.rename(migrationPath, completedPath);

      return { success: true, name, executionTime };
    } catch (err) {
      const executionTime = Date.now() - startTime;

      // Record failure
      await MigrationTracker.recordFailure(
        name,
        migration.version || '1.0.0',
        migration.description || '',
        migration.author || '',
        executionTime,
        err
      );

      console.error(`Migration ${name} failed:`, err.message);
      throw err;
    }
  }

  async rollbackMigration(name) {
    console.log(`\nRolling back migration: ${name}`);

    // Find migration file in completed directory
    const completedPath = path.join(COMPLETED_DIR, `${name}.js`);

    try {
      await fs.access(completedPath);
    } catch (err) {
      throw new Error(`Migration file not found: ${name}`);
    }

    const MigrationClass = require(completedPath);
    const migration = new MigrationClass(this.mongoose);

    try {
      // Run rollback
      const result = await migration.down();

      // Record rollback
      await MigrationTracker.recordRollback(name);

      console.log(`Migration ${name} rolled back successfully`);

      // Move back to pending directory
      const pendingPath = path.join(MIGRATIONS_DIR, path.basename(completedPath));
      await fs.rename(completedPath, pendingPath);

      return { success: true, name };
    } catch (err) {
      console.error(`Rollback failed for ${name}:`, err.message);
      throw err;
    }
  }

  async up() {
    console.log('Running pending migrations...');

    const pending = await this.getPendingMigrations();

    if (pending.length === 0) {
      console.log('No pending migrations');
      return;
    }

    console.log(`Found ${pending.length} pending migration(s)`);

    for (const migration of pending) {
      await this.runMigration(migration.file);
    }

    console.log('\nAll migrations completed successfully!');
  }

  async down(all = false) {
    const applied = await MigrationTracker.getAppliedMigrations();

    if (applied.length === 0) {
      console.log('No migrations to rollback');
      return;
    }

    if (all) {
      console.log(`Rolling back ${applied.length} migration(s)...`);

      // Rollback in reverse order
      for (let i = applied.length - 1; i >= 0; i -= 1) {
        await this.rollbackMigration(applied[i].name);
      }

      console.log('\nAll migrations rolled back!');
    } else {
      // Rollback last migration
      const last = applied[applied.length - 1];
      await this.rollbackMigration(last.name);
    }
  }

  async status() {
    console.log('\nMigration Status\n');

    const stats = await MigrationTracker.getStats();
    const applied = await MigrationTracker.getAppliedMigrations();
    const pending = await this.getPendingMigrations();
    const failed = await MigrationTracker.getFailedMigrations();

    console.log(`Total migrations: ${stats.total}`);
    console.log(`Completed: ${stats.completed}`);
    console.log(`Failed: ${stats.failed}`);
    console.log(`Rolled back: ${stats.rolledBack}`);
    console.log(`Pending: ${pending.length}\n`);

    if (applied.length > 0) {
      console.log('Applied migrations:');
      applied.forEach((m) => {
        console.log(`  ✓ ${m.name} (${new Date(m.appliedAt).toLocaleString()})`);
      });
      console.log();
    }

    if (pending.length > 0) {
      console.log('Pending migrations:');
      pending.forEach((m) => {
        console.log(`  ○ ${m.name}`);
      });
      console.log();
    }

    if (failed.length > 0) {
      console.log('Failed migrations:');
      failed.forEach((m) => {
        console.log(`  ✗ ${m.name} - ${m.error}`);
      });
      console.log();
    }
  }

  async list() {
    console.log('\nAll Migrations\n');

    const pendingFiles = await fs.readdir(MIGRATIONS_DIR);
    const completedFiles = await fs.readdir(COMPLETED_DIR);

    console.log('Pending:');
    pendingFiles
      .filter((f) => f.endsWith('.js'))
      .forEach((f) => console.log(`  ○ ${path.basename(f, '.js')}`));

    console.log('\nCompleted:');
    completedFiles
      .filter((f) => f.endsWith('.js'))
      .forEach((f) => console.log(`  ✓ ${path.basename(f, '.js')}`));

    console.log();
  }

  async history(limit = 20) {
    console.log('\nMigration History\n');

    const history = await MigrationTracker.getHistory(limit);

    if (history.length === 0) {
      console.log('No migration history');
      return;
    }

    history.forEach((m) => {
      const status = m.status === 'completed' ? '✓' : m.status === 'failed' ? '✗' : '↺';
      const date = new Date(m.appliedAt).toLocaleString();
      console.log(`${status} ${m.name} (${m.status}) - ${date}`);
      if (m.description) {
        console.log(`  ${m.description}`);
      }
      if (m.status === 'failed' && m.error) {
        console.log(`  Error: ${m.error}`);
      }
    });

    console.log();
  }

  async create(name) {
    if (!name) {
      console.error('Error: Migration name is required');
      process.exit(1);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `${timestamp}_${name}.js`;
    const filepath = path.join(MIGRATIONS_DIR, filename);

    const template = `/**
 * Migration: ${name}
 * Created: ${new Date().toISOString()}
 */

class ${this.toPascalCase(name)} extends MigrationBase {
  constructor(mongoose) {
    super(mongoose);

    this.version = '1.0.0';
    this.description = '${name}';
    this.author = 'Your Name';
  }

  async up() {
    this.log('Running migration: ${name}');

    // TODO: Implement migration logic

    return { success: true };
  }

  async down() {
    this.log('Rolling back migration: ${name}');

    // TODO: Implement rollback logic

    return { success: true };
  }
}

module.exports = ${this.toPascalCase(name)};
`;

    await fs.writeFile(filepath, template);
    console.log(`Created migration: ${filename}`);
  }

  toPascalCase(str) {
    return str
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }
}

// CLI Handler
async function main() {
  const command = process.argv[2];
  const runner = new MigrationRunner();

  try {
    await runner.connect();

    switch (command) {
      case 'up':
        await runner.up();
        break;

      case 'down':
        const all = process.argv.includes('--all');
        await runner.down(all);
        break;

      case 'status':
        await runner.status();
        break;

      case 'list':
        await runner.list();
        break;

      case 'history':
        const limit = parseInt(process.argv[3], 10) || 20;
        await runner.history(limit);
        break;

      case 'create':
        const name = process.argv[3];
        await runner.create(name);
        break;

      default:
        console.log(`
Migration Runner

Usage:
  node migrate.js up              - Run all pending migrations
  node migrate.js down            - Rollback last migration
  node migrate.js down --all      - Rollback all migrations
  node migrate.js status          - Show migration status
  node migrate.js create <name>   - Create a new migration file
  node migrate.js list            - List all migrations
  node migrate.js history [limit] - Show migration history
        `);
    }

    await runner.disconnect();
  } catch (err) {
    console.error('Error:', err);
    await runner.disconnect();
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = MigrationRunner;
