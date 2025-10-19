const mongoose = require('mongoose');

/**
 * Locale Model
 * TASK-14.18 - Language/locale support
 *
 * Manages locale/language settings and configurations
 * Features:
 * - Language metadata
 * - Regional formats (date, time, currency, numbers)
 * - RTL support
 * - Locale-specific settings
 */

// eslint-disable-next-line no-unused-vars

const localeSchema = new mongoose.Schema(
  {
    // Language Code (ISO 639-1)
    code: {
      type: String,
      required: [true, 'Language code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[a-z]{2}$/i, 'Invalid language code format'],
      index: true,
    },

    // Language Information
    name: {
      type: String,
      required: [true, 'Language name is required'],
      trim: true,
    },
    nativeName: {
      type: String,
      required: true,
      trim: true,
    },
    englishName: {
      type: String,
      required: true,
      trim: true,
    },

    // Regional Code (ISO 3166-1)
    region: {
      type: String,
      uppercase: true,
      trim: true,
    },
    fullCode: {
      type: String,
      unique: true,
      trim: true,
      // e.g., en-US, es-MX, fr-CA
    },

    // Text Direction
    direction: {
      type: String,
      enum: ['ltr', 'rtl'],
      default: 'ltr',
    },

    // Status
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    inBeta: {
      type: Boolean,
      default: false,
    },

    // Format Settings
    formats: {
      date: {
        short: {
          type: String,
          default: 'MM/DD/YYYY',
        },
        medium: {
          type: String,
          default: 'MMM DD, YYYY',
        },
        long: {
          type: String,
          default: 'MMMM DD, YYYY',
        },
        full: {
          type: String,
          default: 'dddd, MMMM DD, YYYY',
        },
      },
      time: {
        short: {
          type: String,
          default: 'h:mm A',
        },
        medium: {
          type: String,
          default: 'h:mm:ss A',
        },
        long: {
          type: String,
          default: 'h:mm:ss A z',
        },
      },
      currency: {
        symbol: {
          type: String,
          default: '$',
        },
        position: {
          type: String,
          enum: ['before', 'after'],
          default: 'before',
        },
        decimal: {
          type: String,
          default: '.',
        },
        thousand: {
          type: String,
          default: ',',
        },
        precision: {
          type: Number,
          default: 2,
        },
      },
      number: {
        decimal: {
          type: String,
          default: '.',
        },
        thousand: {
          type: String,
          default: ',',
        },
      },
    },

    // Pluralization Rules
    pluralRules: {
      type: String,
      enum: ['zero', 'one', 'two', 'few', 'many', 'other'],
    },

    // Calendar Settings
    calendar: {
      firstDayOfWeek: {
        type: Number,
        min: 0,
        max: 6,
        default: 0, // Sunday
      },
      weekendDays: {
        type: [Number],
        default: [0, 6], // Sunday, Saturday
      },
    },

    // Translation Progress
    translationProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    totalKeys: {
      type: Number,
      default: 0,
    },
    translatedKeys: {
      type: Number,
      default: 0,
    },

    // Contributors
    translators: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        role: {
          type: String,
          enum: ['translator', 'reviewer', 'maintainer'],
          default: 'translator',
        },
        contributions: {
          type: Number,
          default: 0,
        },
      },
    ],

    // Display Options
    flag: String, // Unicode flag emoji
    icon: String, // Icon URL or identifier

    // SEO & Metadata
    metadata: {
      seoCode: String, // hreflang code
      charset: {
        type: String,
        default: 'UTF-8',
      },
      htmlLang: String,
    },

    // Organization-specific
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },

    // Management
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// ==================== INDEXES ====================

localeSchema.index({ enabled: 1, isDefault: 1 });
localeSchema.index({ organization: 1, enabled: 1 });
localeSchema.index({ fullCode: 1 }, { unique: true, sparse: true });

// ==================== VIRTUAL FIELDS ====================

localeSchema.virtual('displayName').get(function () {
  return `${this.nativeName} (${this.englishName})`;
});

localeSchema.virtual('isRTL').get(function () {
  return this.direction === 'rtl';
});

// ==================== INSTANCE METHODS ====================

/**
 * Format date according to locale
 */
localeSchema.methods.formatDate = function (date, format = 'medium') {
  const formatString = this.formats.date[format] || this.formats.date.medium;
  // In production, use a library like moment.js or date-fns with locale
  return date.toLocaleDateString(this.fullCode || this.code);
};

/**
 * Format time according to locale
 */
localeSchema.methods.formatTime = function (date, format = 'short') {
  const formatString = this.formats.time[format] || this.formats.time.short;
  return date.toLocaleTimeString(this.fullCode || this.code);
};

/**
 * Format currency according to locale
 */
localeSchema.methods.formatCurrency = function (amount) {
  const { symbol, position, decimal, thousand, precision } = this.formats.currency;

  const formatted = amount
    .toFixed(precision)
    .replace('.', decimal)
    .replace(/\B(?=(\d{3})+(?!\d))/g, thousand);

  return position === 'before' ? `${symbol}${formatted}` : `${formatted}${symbol}`;
};

/**
 * Format number according to locale
 */
localeSchema.methods.formatNumber = function (number) {
  const { decimal, thousand } = this.formats.number;

  return number
    .toString()
    .replace('.', decimal)
    .replace(/\B(?=(\d{3})+(?!\d))/g, thousand);
};

/**
 * Update translation progress
 */
localeSchema.methods.updateTranslationProgress = async function () {
  const Translation = mongoose.model('Translation');

  const allTranslations = await Translation.find({
    status: { $in: ['approved', 'needs_update'] },
  });

  this.totalKeys = allTranslations.length;
  this.translatedKeys = allTranslations.filter((t) => t.hasTranslation(this.code)).length;

  this.translationProgress = this.totalKeys > 0 ? (this.translatedKeys / this.totalKeys) * 100 : 0;

  return this.save();
};

/**
 * Add translator
 */
localeSchema.methods.addTranslator = async function (userId, role = 'translator') {
  const existing = this.translators.find((t) => t.userId.toString() === userId.toString());

  if (existing) {
    existing.role = role;
  } else {
    this.translators.push({
      userId,
      role,
      contributions: 0,
    });
  }

  return this.save();
};

/**
 * Increment translator contributions
 */
localeSchema.methods.incrementContributions = async function (userId) {
  const translator = this.translators.find((t) => t.userId.toString() === userId.toString());

  if (translator) {
    translator.contributions += 1;
  } else {
    this.translators.push({
      userId,
      role: 'translator',
      contributions: 1,
    });
  }

  return this.save();
};

// ==================== STATIC METHODS ====================

/**
 * Get enabled locales
 */
localeSchema.statics.getEnabled = async function (organizationId = null) {
  const query = { enabled: true };
  if (organizationId) query.organization = organizationId;

  return this.find(query).sort({ isDefault: -1, englishName: 1 });
};

/**
 * Get default locale
 */
localeSchema.statics.getDefault = async function (organizationId = null) {
  const query = { enabled: true, isDefault: true };
  if (organizationId) query.organization = organizationId;

  let locale = await this.findOne(query);

  if (!locale) {
    // Fallback to English
    locale = await this.findOne({ code: 'EN', enabled: true });
  }

  return locale;
};

/**
 * Set default locale
 */
localeSchema.statics.setDefault = async function (code) {
  // Remove default from all locales
  await this.updateMany({}, { isDefault: false });

  // Set new default
  const locale = await this.findOneAndUpdate(
    { code: code.toUpperCase() },
    { isDefault: true, enabled: true },
    { new: true }
  );

  return locale;
};

/**
 * Create default locales
 */
localeSchema.statics.createDefaults = async function () {
  const defaults = [
    {
      code: 'EN',
      name: 'English',
      nativeName: 'English',
      englishName: 'English',
      fullCode: 'en-US',
      region: 'US',
      direction: 'ltr',
      enabled: true,
      isDefault: true,
      flag: '🇺🇸',
      translationProgress: 100,
    },
    {
      code: 'ES',
      name: 'Español',
      nativeName: 'Español',
      englishName: 'Spanish',
      fullCode: 'es-ES',
      region: 'ES',
      direction: 'ltr',
      enabled: true,
      flag: '🇪🇸',
      formats: {
        date: {
          short: 'DD/MM/YYYY',
          medium: 'DD MMM YYYY',
          long: 'DD [de] MMMM [de] YYYY',
          full: 'dddd, DD [de] MMMM [de] YYYY',
        },
        currency: {
          symbol: '€',
          position: 'after',
          decimal: ',',
          thousand: '.',
          precision: 2,
        },
        number: {
          decimal: ',',
          thousand: '.',
        },
      },
    },
    {
      code: 'FR',
      name: 'Français',
      nativeName: 'Français',
      englishName: 'French',
      fullCode: 'fr-FR',
      region: 'FR',
      direction: 'ltr',
      enabled: true,
      flag: '🇫🇷',
      formats: {
        date: {
          short: 'DD/MM/YYYY',
          medium: 'DD MMM YYYY',
          long: 'DD MMMM YYYY',
          full: 'dddd DD MMMM YYYY',
        },
        currency: {
          symbol: '€',
          position: 'after',
          decimal: ',',
          thousand: ' ',
          precision: 2,
        },
        number: {
          decimal: ',',
          thousand: ' ',
        },
      },
      calendar: {
        firstDayOfWeek: 1, // Monday
      },
    },
    {
      code: 'DE',
      name: 'Deutsch',
      nativeName: 'Deutsch',
      englishName: 'German',
      fullCode: 'de-DE',
      region: 'DE',
      direction: 'ltr',
      enabled: true,
      flag: '🇩🇪',
      formats: {
        date: {
          short: 'DD.MM.YYYY',
          medium: 'DD. MMM YYYY',
          long: 'DD. MMMM YYYY',
          full: 'dddd, DD. MMMM YYYY',
        },
        time: {
          short: 'HH:mm',
          medium: 'HH:mm:ss',
          long: 'HH:mm:ss z',
        },
        currency: {
          symbol: '€',
          position: 'after',
          decimal: ',',
          thousand: '.',
          precision: 2,
        },
        number: {
          decimal: ',',
          thousand: '.',
        },
      },
      calendar: {
        firstDayOfWeek: 1, // Monday
      },
    },
    {
      code: 'AR',
      name: 'العربية',
      nativeName: 'العربية',
      englishName: 'Arabic',
      fullCode: 'ar-SA',
      region: 'SA',
      direction: 'rtl',
      enabled: true,
      flag: '🇸🇦',
      calendar: {
        firstDayOfWeek: 6, // Saturday
        weekendDays: [5, 6], // Friday, Saturday
      },
    },
    {
      code: 'ZH',
      name: '中文',
      nativeName: '中文',
      englishName: 'Chinese',
      fullCode: 'zh-CN',
      region: 'CN',
      direction: 'ltr',
      enabled: true,
      flag: '🇨🇳',
      formats: {
        date: {
          short: 'YYYY/MM/DD',
          medium: 'YYYY年MM月DD日',
          long: 'YYYY年MM月DD日',
          full: 'YYYY年MM月DD日 dddd',
        },
        currency: {
          symbol: '¥',
          position: 'before',
          decimal: '.',
          thousand: ',',
          precision: 2,
        },
      },
    },
  ];

  const created = [];

  for (const localeData of defaults) {
    const existing = await this.findOne({ code: localeData.code });
    if (!existing) {
      const locale = await this.create(localeData);
      created.push(locale);
    }
  }

  return created;
};

/**
 * Get locale statistics
 */
localeSchema.statics.getStats = async function () {
  const locales = await this.find();

  return {
    total: locales.length,
    enabled: locales.filter((l) => l.enabled).length,
    rtl: locales.filter((l) => l.direction === 'rtl').length,
    averageProgress: locales.reduce((sum, l) => sum + l.translationProgress, 0) / locales.length,
    byProgress: {
      complete: locales.filter((l) => l.translationProgress === 100).length,
      inProgress: locales.filter((l) => l.translationProgress > 0 && l.translationProgress < 100)
        .length,
      notStarted: locales.filter((l) => l.translationProgress === 0).length,
    },
  };
};

module.exports = mongoose.model('Locale', localeSchema);
