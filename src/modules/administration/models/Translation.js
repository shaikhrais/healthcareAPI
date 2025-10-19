const mongoose = require('mongoose');

/**
 * Translation Model
 * TASK-14.18 - Language/locale support
 *
 * Manages translations for multi-language support
 * Features:
 * - Translation key-value storage
 * - Multiple language support
 * - Namespace organization
 * - Fallback language support
 * - Version control
 * - Translation status tracking
 */

// eslint-disable-next-line no-unused-vars

const translationSchema = new mongoose.Schema(
  {
    // Key and Namespace
    key: {
      type: String,
      required: [true, 'Translation key is required'],
      trim: true,
      index: true,
    },
    namespace: {
      type: String,
      required: true,
      default: 'common',
      enum: [
        'common',
        'auth',
        'dashboard',
        'appointments',
        'patients',
        'settings',
        'errors',
        'validation',
        'notifications',
        'calendar',
        'forms',
        'buttons',
        'messages',
      ],
      index: true,
    },

    // Translations by Language
    translations: {
      type: Map,
      of: String,
      required: true,
    },

    // Default Language
    defaultLanguage: {
      type: String,
      default: 'en',
    },

    // Context and Description
    context: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    notes: String,

    // Pluralization Support
    pluralForms: {
      type: Map,
      of: {
        zero: String,
        one: String,
        two: String,
        few: String,
        many: String,
        other: String,
      },
    },

    // Variables/Interpolation
    variables: [
      {
        name: String,
        type: {
          type: String,
          enum: ['string', 'number', 'date', 'currency'],
        },
        description: String,
      },
    ],

    // Status
    status: {
      type: String,
      enum: ['draft', 'pending_review', 'approved', 'needs_update', 'deprecated'],
      default: 'approved',
      index: true,
    },

    // Version Control
    version: {
      type: Number,
      default: 1,
    },
    previousVersions: [
      {
        version: Number,
        translations: Map,
        updatedAt: Date,
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],

    // Metadata
    category: String,
    tags: [String],

    // Usage Tracking
    usageCount: {
      type: Number,
      default: 0,
    },
    lastUsedAt: Date,

    // Management
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
  },
  {
    timestamps: true,
  }
);

// ==================== INDEXES ====================

translationSchema.index({ key: 1, namespace: 1 }, { unique: true });
translationSchema.index({ namespace: 1, status: 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// translationSchema.index({ organization: 1 });
// DUPLICATE INDEX - Auto-commented by deduplication tool
// translationSchema.index({ tags: 1 });

// ==================== VIRTUAL FIELDS ====================

translationSchema.virtual('availableLanguages').get(function () {
  return Array.from(this.translations.keys());
});

translationSchema.virtual('completeness').get(function () {
  const total = this.availableLanguages.length;
  const completed = this.availableLanguages.filter(
    (lang) => this.translations.get(lang) && this.translations.get(lang).trim() !== ''
  ).length;
  return total > 0 ? (completed / total) * 100 : 0;
});

// ==================== INSTANCE METHODS ====================

/**
 * Get translation for specific language
 */
translationSchema.methods.getTranslation = function (language, fallbackLanguage = 'en') {
  let translation = this.translations.get(language);

  if (!translation && fallbackLanguage) {
    translation = this.translations.get(fallbackLanguage);
  }

  if (!translation) {
    translation = this.translations.get(this.defaultLanguage);
  }

  return translation || this.key;
};

/**
 * Set translation for specific language
 */
translationSchema.methods.setTranslation = async function (language, value, userId = null) {
  // Store previous version
  if (this.translations.has(language)) {
    this.previousVersions.push({
      version: this.version,
      translations: new Map(this.translations),
      updatedAt: new Date(),
      updatedBy: userId,
    });
    this.version += 1;
  }

  this.translations.set(language, value);
  this.updatedBy = userId;

  return this.save();
};

/**
 * Add multiple translations at once
 */
translationSchema.methods.bulkSetTranslations = async function (translationsObj, userId = null) {
  // Store previous version
  this.previousVersions.push({
    version: this.version,
    translations: new Map(this.translations),
    updatedAt: new Date(),
    updatedBy: userId,
  });
  this.version += 1;

  Object.entries(translationsObj).forEach(([lang, value]) => {
    this.translations.set(lang, value);
  });

  this.updatedBy = userId;
  return this.save();
};

/**
 * Record usage
 */
translationSchema.methods.recordUsage = async function () {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  return this.save();
};

/**
 * Check if translation exists for language
 */
translationSchema.methods.hasTranslation = function (language) {
  return (
    this.translations.has(language) &&
    this.translations.get(language) &&
    this.translations.get(language).trim() !== ''
  );
};

/**
 * Get missing translations
 */
translationSchema.methods.getMissingTranslations = function (languages) {
  return languages.filter((lang) => !this.hasTranslation(lang));
};

// ==================== STATIC METHODS ====================

/**
 * Get translations for specific namespace and language
 */
translationSchema.statics.getNamespaceTranslations = async function (
  namespace,
  language,
  fallbackLanguage = 'en'
) {
  const translations = await this.find({
    namespace,
    status: { $in: ['approved', 'needs_update'] },
  });

  const result = {};

  translations.forEach((trans) => {
    result[trans.key] = trans.getTranslation(language, fallbackLanguage);
  });

  return result;
};

/**
 * Get all translations for language
 */
translationSchema.statics.getAllTranslations = async function (language, fallbackLanguage = 'en') {
  const translations = await this.find({
    status: { $in: ['approved', 'needs_update'] },
  });

  const result = {};

  translations.forEach((trans) => {
    if (!result[trans.namespace]) {
      result[trans.namespace] = {};
    }
    result[trans.namespace][trans.key] = trans.getTranslation(language, fallbackLanguage);
  });

  return result;
};

/**
 * Import translations from JSON
 */
translationSchema.statics.importTranslations = async function (data, options = {}) {
  const { namespace = 'common', language = 'en', userId = null, organization = null } = options;

  const results = {
    created: 0,
    updated: 0,
    errors: [],
  };

  for (const [key, value] of Object.entries(data)) {
    try {
      let translation = await this.findOne({ key, namespace });

      if (translation) {
        await translation.setTranslation(language, value, userId);
        results.updated += 1;
      } else {
        translation = await this.create({
          key,
          namespace,
          translations: new Map([[language, value]]),
          defaultLanguage: language,
          createdBy: userId,
          updatedBy: userId,
          organization,
          status: 'approved',
        });
        results.created += 1;
      }
    } catch (error) {
      results.errors.push({
        key,
        error: error.message,
      });
    }
  }

  return results;
};

/**
 * Export translations to JSON
 */
translationSchema.statics.exportTranslations = async function (language, options = {}) {
  const { namespace = null, status = ['approved', 'needs_update'] } = options;

  const query = { status: { $in: status } };
  if (namespace) query.namespace = namespace;

  const translations = await this.find(query);

  const result = {};

  translations.forEach((trans) => {
    const translation = trans.getTranslation(language);

    if (namespace) {
      result[trans.key] = translation;
    } else {
      if (!result[trans.namespace]) {
        result[trans.namespace] = {};
      }
      result[trans.namespace][trans.key] = translation;
    }
  });

  return result;
};

/**
 * Get translation statistics
 */
translationSchema.statics.getStats = async function (organizationId = null) {
  const query = organizationId ? { organization: organizationId } : {};

  const translations = await this.find(query);

  const stats = {
    total: translations.length,
    byNamespace: {},
    byStatus: {},
    languages: new Set(),
    completeness: {},
    mostUsed: [],
  };

  translations.forEach((trans) => {
    // Count by namespace
    stats.byNamespace[trans.namespace] = (stats.byNamespace[trans.namespace] || 0) + 1;

    // Count by status
    stats.byStatus[trans.status] = (stats.byStatus[trans.status] || 0) + 1;

    // Track languages
    trans.availableLanguages.forEach((lang) => stats.languages.add(lang));

    // Calculate completeness per language
    trans.availableLanguages.forEach((lang) => {
      if (!stats.completeness[lang]) {
        stats.completeness[lang] = { total: 0, completed: 0 };
      }
      stats.completeness[lang].total += 1;
      if (trans.hasTranslation(lang)) {
        stats.completeness[lang].completed += 1;
      }
    });
  });

  // Convert Set to Array
  stats.languages = Array.from(stats.languages);

  // Calculate completeness percentages
  Object.keys(stats.completeness).forEach((lang) => {
    const data = stats.completeness[lang];
    stats.completeness[lang].percentage = data.total > 0 ? (data.completed / data.total) * 100 : 0;
  });

  // Get most used translations
  stats.mostUsed = translations
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 10)
    .map((t) => ({
      key: t.key,
      namespace: t.namespace,
      usageCount: t.usageCount,
      lastUsedAt: t.lastUsedAt,
    }));

  return stats;
};

/**
 * Find missing translations
 */
translationSchema.statics.findMissingTranslations = async function (language, namespace = null) {
  const query = { status: { $in: ['approved', 'needs_update'] } };
  if (namespace) query.namespace = namespace;

  const translations = await this.find(query);

  return translations
    .filter((trans) => !trans.hasTranslation(language))
    .map((trans) => ({
      key: trans.key,
      namespace: trans.namespace,
      defaultTranslation: trans.getTranslation(trans.defaultLanguage),
    }));
};

/**
 * Search translations
 */
translationSchema.statics.searchTranslations = async function (searchTerm, options = {}) {
  const { language = 'en', namespace = null, limit = 50 } = options;

  const query = {
    $or: [
      { key: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { context: { $regex: searchTerm, $options: 'i' } },
    ],
    status: { $in: ['approved', 'needs_update'] },
  };

  if (namespace) query.namespace = namespace;

  const translations = await this.find(query).limit(limit);

  return translations.map((trans) => ({
    key: trans.key,
    namespace: trans.namespace,
    translation: trans.getTranslation(language),
    description: trans.description,
    context: trans.context,
  }));
};

module.exports = mongoose.model('Translation', translationSchema);
