/**
 * Migration Helper Utilities
 *
 * Common utilities for data transformations and migrations
 */

class MigrationHelper {
  /**
   * Transform data using a mapping function
   */
  static async transformData(model, query, transformFn, batchSize = 100) {
    const cursor = model.find(query).cursor();
    let count = 0;
    const errors = [];

    for await (const doc of cursor) {
      try {
        const transformed = await transformFn(doc);
        if (transformed !== false) {
          await doc.save();
          count += 1;
        }
      } catch (err) {
        errors.push({
          id: doc._id,
          error: err.message,
        });
      }

      if (count % batchSize === 0) {
        console.log(`Transformed ${count} documents...`);
      }
    }

    return { count, errors };
  }

  /**
   * Add a field to all documents in a collection
   */
  static async addField(model, fieldName, defaultValue, query = {}) {
    const update = { [fieldName]: defaultValue };
    const result = await model.updateMany(
      { ...query, [fieldName]: { $exists: false } },
      { $set: update }
    );

    return {
      matched: result.matchedCount,
      modified: result.modifiedCount,
    };
  }

  /**
   * Remove a field from all documents in a collection
   */
  static async removeField(model, fieldName, query = {}) {
    const result = await model.updateMany(query, { $unset: { [fieldName]: '' } });

    return {
      matched: result.matchedCount,
      modified: result.modifiedCount,
    };
  }

  /**
   * Rename a field in all documents
   */
  static async renameField(model, oldName, newName, query = {}) {
    const result = await model.updateMany(query, { $rename: { [oldName]: newName } });

    return {
      matched: result.matchedCount,
      modified: result.modifiedCount,
    };
  }

  /**
   * Copy data from one field to another
   */
  static async copyField(model, sourceField, targetField, query = {}) {
    const docs = await model.find(query);
    let count = 0;

    for (const doc of docs) {
      if (doc[sourceField] !== undefined) {
        doc[targetField] = doc[sourceField];
        await doc.save();
        count += 1;
      }
    }

    return { count };
  }

  /**
   * Create an index on a collection
   */
  static async createIndex(model, fields, options = {}) {
    return await model.createIndexes([{ key: fields, ...options }]);
  }

  /**
   * Drop an index from a collection
   */
  static async dropIndex(model, indexName) {
    return await model.collection.dropIndex(indexName);
  }

  /**
   * Validate documents against schema
   */
  static async validateDocuments(model, query = {}) {
    const docs = await model.find(query);
    const invalid = [];

    for (const doc of docs) {
      try {
        await doc.validate();
      } catch (err) {
        invalid.push({
          id: doc._id,
          errors: err.errors,
        });
      }
    }

    return {
      total: docs.length,
      valid: docs.length - invalid.length,
      invalid: invalid.length,
      invalidDocs: invalid,
    };
  }

  /**
   * Migrate data from one collection to another
   */
  static async migrateCollection(sourceModel, targetModel, transformFn = null) {
    const sourceDocs = await sourceModel.find({});
    let migrated = 0;
    const errors = [];

    for (const doc of sourceDocs) {
      try {
        const data = transformFn ? await transformFn(doc.toObject()) : doc.toObject();
        delete data._id; // Let MongoDB generate new IDs

        await targetModel.create(data);
        migrated += 1;
      } catch (err) {
        errors.push({
          id: doc._id,
          error: err.message,
        });
      }
    }

    return {
      total: sourceDocs.length,
      migrated,
      failed: errors.length,
      errors,
    };
  }

  /**
   * Bulk update documents
   */
  static async bulkUpdate(model, updates) {
    const bulkOps = updates.map((update) => ({
      updateOne: {
        filter: update.filter,
        update: update.update,
        upsert: update.upsert || false,
      },
    }));

    const result = await model.bulkWrite(bulkOps);

    return {
      matched: result.matchedCount,
      modified: result.modifiedCount,
      upserted: result.upsertedCount,
    };
  }

  /**
   * Create unique constraint
   */
  static async createUniqueConstraint(model, fields) {
    return await model.collection.createIndex(fields, { unique: true });
  }

  /**
   * Remove duplicate documents based on a field
   */
  static async removeDuplicates(model, field) {
    const pipeline = [
      {
        $group: {
          _id: `$${field}`,
          ids: { $push: '$_id' },
          count: { $sum: 1 },
        },
      },
      {
        $match: { count: { $gt: 1 } },
      },
    ];

    const duplicates = await model.aggregate(pipeline);
    let removed = 0;

    for (const dup of duplicates) {
      // Keep first, remove rest
      const idsToRemove = dup.ids.slice(1);
      await model.deleteMany({ _id: { $in: idsToRemove } });
      removed += idsToRemove.length;
    }

    return {
      duplicateGroups: duplicates.length,
      documentsRemoved: removed,
    };
  }

  /**
   * Sanitize string fields (trim, lowercase, etc.)
   */
  static async sanitizeStringFields(model, fields, options = {}) {
    const { trim = true, lowercase = false } = options;
    const docs = await model.find({});
    let count = 0;

    for (const doc of docs) {
      let modified = false;

      for (const field of fields) {
        if (doc[field] && typeof doc[field] === 'string') {
          let value = doc[field];

          if (trim) value = value.trim();
          if (lowercase) value = value.toLowerCase();

          if (value !== doc[field]) {
            doc[field] = value;
            modified = true;
          }
        }
      }

      if (modified) {
        await doc.save();
        count += 1;
      }
    }

    return { count };
  }

  /**
   * Update references when IDs change
   */
  static async updateReferences(model, refField, oldId, newId) {
    const result = await model.updateMany({ [refField]: oldId }, { $set: { [refField]: newId } });

    return {
      matched: result.matchedCount,
      modified: result.modifiedCount,
    };
  }

  /**
   * Archive old documents to a separate collection
   */
  static async archiveOldDocuments(sourceModel, archiveModel, dateCutoff, dateField = 'createdAt') {
    const oldDocs = await sourceModel.find({
      [dateField]: { $lt: dateCutoff },
    });

    let archived = 0;
    const errors = [];

    for (const doc of oldDocs) {
      try {
        const data = doc.toObject();
        await archiveModel.create(data);
        await doc.remove();
        archived += 1;
      } catch (err) {
        errors.push({
          id: doc._id,
          error: err.message,
        });
      }
    }

    return {
      total: oldDocs.length,
      archived,
      failed: errors.length,
      errors,
    };
  }
}

module.exports = MigrationHelper;
