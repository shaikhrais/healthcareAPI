# Data Migration System

A comprehensive data migration framework for managing database schema changes, data transformations, and seeding operations.

## Overview

This migration system provides:

- **Version Control**: Track which migrations have been applied
- **Rollback Support**: Safely rollback migrations if needed
- **Backup & Restore**: Automatic backups before migrations
- **Batch Processing**: Efficiently handle large datasets
- **Error Handling**: Comprehensive error tracking and recovery
- **Templates**: Pre-built templates for common operations

## Directory Structure

```
migrations/
├── pending/          # Migrations waiting to be run
├── completed/        # Successfully applied migrations
├── templates/        # Migration templates
├── utils/           # Utility classes
│   ├── MigrationBase.js        # Base class for all migrations
│   ├── MigrationTracker.js     # Tracks migration history
│   └── MigrationHelper.js      # Helper utilities
└── migrate.js       # Migration runner CLI
```

## Quick Start

### 1. Create a New Migration

```bash
node migrations/migrate.js create add-user-avatar-field
```

This creates a new migration file in `migrations/pending/` with a timestamp prefix.

### 2. Edit the Migration

Open the created file and implement the `up()` and `down()` methods:

```javascript
class AddUserAvatarField extends MigrationBase {
  constructor(mongoose) {
    super(mongoose);
    this.version = '1.0.0';
    this.description = 'Add avatar field to User model';
    this.author = 'Your Name';
  }

  async up() {
    const User = this.models.User;

    const result = await MigrationHelper.addField(
      User,
      'avatar',
      null
    );

    return result;
  }

  async down() {
    const User = this.models.User;

    const result = await MigrationHelper.removeField(
      User,
      'avatar'
    );

    return result;
  }
}
```

### 3. Check Migration Status

```bash
node migrations/migrate.js status
```

### 4. Run Migrations

```bash
node migrations/migrate.js up
```

### 5. Rollback if Needed

```bash
# Rollback last migration
node migrations/migrate.js down

# Rollback all migrations
node migrations/migrate.js down --all
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `node migrate.js up` | Run all pending migrations |
| `node migrate.js down` | Rollback last migration |
| `node migrate.js down --all` | Rollback all migrations |
| `node migrate.js status` | Show migration status |
| `node migrate.js list` | List all migrations |
| `node migrate.js history` | Show migration history |
| `node migrate.js create <name>` | Create new migration |

## Migration Templates

### 1. Add Field Template

Use for adding new fields to existing models:

```javascript
const MigrationHelper = require('../utils/MigrationHelper');

async up() {
  const result = await MigrationHelper.addField(
    this.models.User,
    'phoneVerified',
    false
  );
  return result;
}
```

### 2. Data Transformation Template

Use for transforming existing data:

```javascript
async up() {
  const result = await MigrationHelper.transformData(
    this.models.Patient,
    {}, // query filter
    (doc) => {
      // Transform phone numbers to E.164 format
      if (doc.phone) {
        doc.phone = doc.phone.replace(/\D/g, '');
        if (!doc.phone.startsWith('+1')) {
          doc.phone = '+1' + doc.phone;
        }
      }
      return doc;
    }
  );
  return result;
}
```

### 3. Schema Change Template

Use for complex schema changes:

```javascript
async up() {
  const User = this.models.User;

  // Rename field
  await MigrationHelper.renameField(User, 'phone', 'phoneNumber');

  // Add index
  await MigrationHelper.createIndex(User, { email: 1 }, { unique: true });

  // Remove duplicates
  await MigrationHelper.removeDuplicates(User, 'email');

  return { success: true };
}
```

### 4. Seed Data Template

Use for seeding initial data:

```javascript
async up() {
  const Treatment = this.models.Treatment;

  const treatments = [
    { name: 'Initial Consultation', duration: 60, price: 150 },
    { name: 'Follow-up', duration: 30, price: 75 }
  ];

  const created = await Treatment.insertMany(treatments);
  return { created: created.length };
}
```

## MigrationBase Class

All migrations extend `MigrationBase` which provides:

### Methods

- `log(message, type)` - Log migration progress
- `executeBatch(items, operation, batchSize)` - Process items in batches
- `collectionExists(name)` - Check if collection exists
- `backupCollection(name)` - Create collection backup
- `restoreFromBackup(original, backup)` - Restore from backup
- `dropBackup(name)` - Remove backup collection
- `getCollectionStats(name)` - Get collection statistics

### Example Usage

```javascript
async up() {
  // Create backup before making changes
  const backupName = await this.backupCollection('users');

  try {
    // Make changes
    const result = await this.performMigration();

    // Drop backup if successful
    await this.dropBackup(backupName);

    return result;
  } catch (err) {
    // Restore from backup on error
    await this.restoreFromBackup('users', backupName);
    throw err;
  }
}
```

## MigrationHelper Utilities

The `MigrationHelper` class provides common operations:

### Field Operations

```javascript
// Add field
await MigrationHelper.addField(Model, 'fieldName', defaultValue);

// Remove field
await MigrationHelper.removeField(Model, 'fieldName');

// Rename field
await MigrationHelper.renameField(Model, 'oldName', 'newName');

// Copy field
await MigrationHelper.copyField(Model, 'source', 'target');
```

### Data Operations

```javascript
// Transform data
await MigrationHelper.transformData(Model, query, transformFn);

// Bulk update
await MigrationHelper.bulkUpdate(Model, updates);

// Remove duplicates
await MigrationHelper.removeDuplicates(Model, 'fieldName');

// Sanitize strings
await MigrationHelper.sanitizeStringFields(Model, ['name', 'email']);
```

### Index Operations

```javascript
// Create index
await MigrationHelper.createIndex(Model, { email: 1 }, { unique: true });

// Drop index
await MigrationHelper.dropIndex(Model, 'email_1');

// Create unique constraint
await MigrationHelper.createUniqueConstraint(Model, { email: 1 });
```

### Collection Operations

```javascript
// Migrate collection
await MigrationHelper.migrateCollection(SourceModel, TargetModel, transformFn);

// Archive old documents
await MigrationHelper.archiveOldDocuments(
  Model,
  ArchiveModel,
  cutoffDate,
  'createdAt'
);

// Update references
await MigrationHelper.updateReferences(Model, 'userId', oldId, newId);
```

## Best Practices

### 1. Always Create Backups

```javascript
async up() {
  const backupName = await this.backupCollection('collection_name');
  try {
    // Migration logic
  } catch (err) {
    await this.restoreFromBackup('collection_name', backupName);
    throw err;
  }
}
```

### 2. Use Batch Processing for Large Datasets

```javascript
const items = await Model.find({});
await this.executeBatch(items, async (item) => {
  // Process each item
}, 100); // batch size
```

### 3. Implement Proper Rollback

```javascript
async down() {
  // Reverse all changes made in up()
  // Be specific and test rollback logic
}
```

### 4. Add Descriptive Metadata

```javascript
constructor(mongoose) {
  super(mongoose);
  this.version = '1.0.0';
  this.description = 'Detailed description of what this migration does';
  this.author = 'Your Name';
}
```

### 5. Test Migrations

- Test on a copy of production data
- Verify rollback works correctly
- Check performance with large datasets
- Monitor memory usage

### 6. Use Transactions for Related Changes

```javascript
async up() {
  const session = await this.mongoose.startSession();
  session.startTransaction();

  try {
    // Multiple operations
    await Model1.updateMany({}, {}, { session });
    await Model2.updateMany({}, {}, { session });

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}
```

## Migration Naming Convention

Use descriptive names with timestamps:

```
YYYY-MM-DDTHH-MM-SS_descriptive-name.js
```

Examples:
- `2024-01-15T10-30-00_add-user-timezone-field.js`
- `2024-01-16T14-20-00_migrate-phone-number-format.js`
- `2024-01-17T09-00-00_seed-initial-treatments.js`

## Error Handling

Migrations automatically:
- Create backups before running
- Track execution time
- Record failures in the database
- Provide detailed error messages
- Support recovery through rollback

## Monitoring

Check migration history:

```bash
node migrations/migrate.js history
```

View failed migrations:

```bash
node migrations/migrate.js status
```

## Integration with CI/CD

Add to your deployment pipeline:

```bash
# Run migrations automatically
npm run migrate:up

# Or add to package.json
{
  "scripts": {
    "migrate:up": "node migrations/migrate.js up",
    "migrate:status": "node migrations/migrate.js status",
    "migrate:create": "node migrations/migrate.js create"
  }
}
```

## Troubleshooting

### Migration Stuck?

Check the migration tracker collection:

```javascript
db.migrations.find().sort({ appliedAt: -1 })
```

### Need to Manually Mark as Complete?

```javascript
const { MigrationTracker } = require('./utils/MigrationTracker');
await MigrationTracker.recordMigration(name, version, description, author, time, result);
```

### Failed Migration Won't Rollback?

Check if the file exists in `completed/` directory and manually move it back to `pending/`.

## Security Considerations

- Never commit sensitive data in seed migrations
- Review migrations before applying to production
- Always test rollback procedures
- Backup production database before running migrations
- Use environment variables for configuration

## Support

For issues or questions:
1. Check the migration history: `node migrate.js history`
2. Review the migration status: `node migrate.js status`
3. Check the logs for detailed error messages
4. Consult the templates in `templates/` directory

## Example Migrations

See the `templates/` directory for complete examples of:
- Adding fields
- Data transformations
- Schema changes
- Seeding data
