const express = require('express');


const Translation = require('../models/Translation');
const Locale = require('../models/Locale');
/**
 * Internationalization (i18n) Routes
 * TASK-14.18 - Language/locale support
 *
 * Comprehensive i18n and locale management endpoints
 * Features:
 * - Translation management (CRUD)
 * - Locale configuration
 * - Bulk import/export
 * - Translation statistics
 * - Language switching
 */

const router = express.Router();
// Mock middleware (replace with actual auth middleware)
const protect = (req, res, next) => {
  req.user = {
    _id: 'mock-user-id',
    organization: 'mock-org-id',
    role: 'admin',
    firstName: 'John',
    lastName: 'Doe',
  };
  next();
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this resource',
      });
    }
    next();
  };
};

// ============================================
// LOCALE MANAGEMENT
// ============================================

/**
 * @route   GET /api/i18n/locales
 * @desc    Get all available locales
 * @access  Public
 */
router.get('/locales', async (req, res) => {
  try {
    const { enabled } = req.query;

    const query = {};
    if (enabled === 'true') query.enabled = true;

    const locales = await Locale.find(query).sort({ isDefault: -1, englishName: 1 });

    res.json({
      success: true,
      data: locales,
      count: locales.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/i18n/locales/enabled
 * @desc    Get enabled locales
 * @access  Public
 */
router.get('/locales/enabled', async (req, res) => {
  try {
    const locales = await Locale.getEnabled(req.user?.organization);

    res.json({
      success: true,
      data: locales,
      count: locales.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/i18n/locales/default
 * @desc    Get default locale
 * @access  Public
 */
router.get('/locales/default', async (req, res) => {
  try {
    const locale = await Locale.getDefault(req.user?.organization);

    if (!locale) {
      return res.status(404).json({
        success: false,
        error: 'No default locale found',
      });
    }

    res.json({
      success: true,
      data: locale,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/i18n/locales/:code
 * @desc    Get locale by code
 * @access  Public
 */
router.get('/locales/:code', async (req, res) => {
  try {
    const locale = await Locale.findOne({
      code: req.params.code.toUpperCase(),
    });

    if (!locale) {
      return res.status(404).json({
        success: false,
        error: 'Locale not found',
      });
    }

    res.json({
      success: true,
      data: locale,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/i18n/locales
 * @desc    Create new locale
 * @access  Private (Admin)
 */
router.post('/locales', protect, authorize('admin'), async (req, res) => {
  try {
    const localeData = {
      ...req.body,
      createdBy: req.user._id,
      updatedBy: req.user._id,
      organization: req.user.organization,
    };

    const locale = await Locale.create(localeData);

    res.status(201).json({
      success: true,
      data: locale,
      message: 'Locale created successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/i18n/locales/:code
 * @desc    Update locale
 * @access  Private (Admin)
 */
router.put('/locales/:code', protect, authorize('admin'), async (req, res) => {
  try {
    const locale = await Locale.findOneAndUpdate(
      { code: req.params.code.toUpperCase() },
      { ...req.body, updatedBy: req.user._id },
      { new: true, runValidators: true }
    );

    if (!locale) {
      return res.status(404).json({
        success: false,
        error: 'Locale not found',
      });
    }

    res.json({
      success: true,
      data: locale,
      message: 'Locale updated successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/i18n/locales/:code/set-default
 * @desc    Set default locale
 * @access  Private (Admin)
 */
router.post('/locales/:code/set-default', protect, authorize('admin'), async (req, res) => {
  try {
    const locale = await Locale.setDefault(req.params.code);

    if (!locale) {
      return res.status(404).json({
        success: false,
        error: 'Locale not found',
      });
    }

    res.json({
      success: true,
      data: locale,
      message: 'Default locale set successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/i18n/locales/initialize
 * @desc    Initialize default locales
 * @access  Private (Admin)
 */
router.post('/locales/initialize', protect, authorize('admin'), async (req, res) => {
  try {
    const created = await Locale.createDefaults();

    res.json({
      success: true,
      data: created,
      message: `Initialized ${created.length} default locales`,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// TRANSLATION MANAGEMENT
// ============================================

/**
 * @route   GET /api/i18n/translations
 * @desc    Get translations for specific language and namespace
 * @access  Public
 */
router.get('/translations', async (req, res) => {
  try {
    const { language = 'en', namespace, fallback = 'en' } = req.query;

    let translations;

    if (namespace) {
      translations = await Translation.getNamespaceTranslations(namespace, language, fallback);
    } else {
      translations = await Translation.getAllTranslations(language, fallback);
    }

    res.json({
      success: true,
      data: translations,
      language,
      namespace: namespace || 'all',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/i18n/translations/:key
 * @desc    Get specific translation
 * @access  Public
 */
router.get('/translations/:key', async (req, res) => {
  try {
    const { language = 'en', namespace = 'common', fallback = 'en' } = req.query;

    const translation = await Translation.findOne({
      key: req.params.key,
      namespace,
    });

    if (!translation) {
      return res.status(404).json({
        success: false,
        error: 'Translation not found',
      });
    }

    res.json({
      success: true,
      data: {
        key: translation.key,
        namespace: translation.namespace,
        translation: translation.getTranslation(language, fallback),
        availableLanguages: translation.availableLanguages,
        allTranslations: Object.fromEntries(translation.translations),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/i18n/translations
 * @desc    Create new translation
 * @access  Private (Admin, Translator)
 */
router.post('/translations', protect, authorize('admin', 'translator'), async (req, res) => {
  try {
    const { key, namespace = 'common', translations, description, context, variables } = req.body;

    const translationData = {
      key,
      namespace,
      translations: new Map(Object.entries(translations || {})),
      description,
      context,
      variables,
      createdBy: req.user._id,
      updatedBy: req.user._id,
      organization: req.user.organization,
    };

    const translation = await Translation.create(translationData);

    res.status(201).json({
      success: true,
      data: translation,
      message: 'Translation created successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/i18n/translations/:key
 * @desc    Update translation
 * @access  Private (Admin, Translator)
 */
router.put('/translations/:key', protect, authorize('admin', 'translator'), async (req, res) => {
  try {
    const { namespace = 'common', language, value, translations } = req.body;

    const translation = await Translation.findOne({
      key: req.params.key,
      namespace,
    });

    if (!translation) {
      return res.status(404).json({
        success: false,
        error: 'Translation not found',
      });
    }

    if (language && value) {
      // Update single language
      await translation.setTranslation(language, value, req.user._id);
    } else if (translations) {
      // Update multiple languages
      await translation.bulkSetTranslations(translations, req.user._id);
    }

    res.json({
      success: true,
      data: translation,
      message: 'Translation updated successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/i18n/translations/:key
 * @desc    Delete translation
 * @access  Private (Admin)
 */
router.delete('/translations/:key', protect, authorize('admin'), async (req, res) => {
  try {
    const { namespace = 'common' } = req.query;

    const translation = await Translation.findOneAndDelete({
      key: req.params.key,
      namespace,
    });

    if (!translation) {
      return res.status(404).json({
        success: false,
        error: 'Translation not found',
      });
    }

    res.json({
      success: true,
      message: 'Translation deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// BULK OPERATIONS
// ============================================

/**
 * @route   POST /api/i18n/translations/import
 * @desc    Import translations from JSON
 * @access  Private (Admin)
 */
router.post('/translations/import', protect, authorize('admin'), async (req, res) => {
  try {
    const { data, namespace = 'common', language = 'en' } = req.body;

    if (!data || typeof data !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid data format',
      });
    }

    const results = await Translation.importTranslations(data, {
      namespace,
      language,
      userId: req.user._id,
      organization: req.user.organization,
    });

    res.json({
      success: true,
      data: results,
      message: `Imported ${results.created + results.updated} translations`,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/i18n/translations/export
 * @desc    Export translations to JSON
 * @access  Private (Admin)
 */
router.get('/translations/export', protect, authorize('admin'), async (req, res) => {
  try {
    const { language = 'en', namespace, status } = req.query;

    const translations = await Translation.exportTranslations(language, {
      namespace,
      status: status ? status.split(',') : undefined,
    });

    res.json({
      success: true,
      data: translations,
      language,
      namespace: namespace || 'all',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// ANALYTICS & STATISTICS
// ============================================

/**
 * @route   GET /api/i18n/stats
 * @desc    Get translation statistics
 * @access  Private (Admin)
 */
router.get('/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const translationStats = await Translation.getStats(req.user.organization);
    const localeStats = await Locale.getStats();

    res.json({
      success: true,
      data: {
        translations: translationStats,
        locales: localeStats,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/i18n/missing
 * @desc    Get missing translations for language
 * @access  Private (Admin, Translator)
 */
router.get('/missing', protect, authorize('admin', 'translator'), async (req, res) => {
  try {
    const { language, namespace } = req.query;

    if (!language) {
      return res.status(400).json({
        success: false,
        error: 'Language parameter is required',
      });
    }

    const missing = await Translation.findMissingTranslations(language, namespace);

    res.json({
      success: true,
      data: missing,
      count: missing.length,
      language,
      namespace: namespace || 'all',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/i18n/search
 * @desc    Search translations
 * @access  Private
 */
router.get('/search', protect, async (req, res) => {
  try {
    const { q: searchTerm, language = 'en', namespace, limit } = req.query;

    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        error: 'Search term is required',
      });
    }

    const results = await Translation.searchTranslations(searchTerm, {
      language,
      namespace,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    res.json({
      success: true,
      data: results,
      count: results.length,
      searchTerm,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/i18n/locales/:code/update-progress
 * @desc    Update translation progress for locale
 * @access  Private (Admin)
 */
router.post('/locales/:code/update-progress', protect, authorize('admin'), async (req, res) => {
  try {
    const locale = await Locale.findOne({
      code: req.params.code.toUpperCase(),
    });

    if (!locale) {
      return res.status(404).json({
        success: false,
        error: 'Locale not found',
      });
    }

    await locale.updateTranslationProgress();

    res.json({
      success: true,
      data: {
        code: locale.code,
        translationProgress: locale.translationProgress,
        totalKeys: locale.totalKeys,
        translatedKeys: locale.translatedKeys,
      },
      message: 'Translation progress updated',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// USER PREFERENCES
// ============================================

/**
 * @route   GET /api/i18n/user/locale
 * @desc    Get user's preferred locale
 * @access  Private
 */
router.get('/user/locale', protect, async (req, res) => {
  try {
    // In production, get from user profile
    const userLocale = req.user.locale || 'en';

    const locale = await Locale.findOne({
      code: userLocale.toUpperCase(),
      enabled: true,
    });

    if (!locale) {
      // Fallback to default
      const defaultLocale = await Locale.getDefault();
      return res.json({
        success: true,
        data: defaultLocale,
      });
    }

    res.json({
      success: true,
      data: locale,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/i18n/user/locale
 * @desc    Set user's preferred locale
 * @access  Private
 */
router.post('/user/locale', protect, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Locale code is required',
      });
    }

    const locale = await Locale.findOne({
      code: code.toUpperCase(),
      enabled: true,
    });

    if (!locale) {
      return res.status(404).json({
        success: false,
        error: 'Locale not found or not enabled',
      });
    }

    // In production, save to user profile
    // await User.findByIdAndUpdate(req.user._id, { locale: code.toUpperCase() });

    res.json({
      success: true,
      data: locale,
      message: 'Locale preference saved',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// FORMAT UTILITIES
// ============================================

/**
 * @route   POST /api/i18n/format/date
 * @desc    Format date according to locale
 * @access  Public
 */
router.post('/format/date', async (req, res) => {
  try {
    const { date, locale: localeCode = 'EN', format = 'medium' } = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Date is required',
      });
    }

    const locale = await Locale.findOne({ code: localeCode.toUpperCase() });
    if (!locale) {
      return res.status(404).json({
        success: false,
        error: 'Locale not found',
      });
    }

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format',
      });
    }

    const formatted = locale.formatDate(dateObj, format);

    res.json({
      success: true,
      data: {
        formatted,
        locale: localeCode,
        format,
        originalDate: date,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/i18n/format/currency
 * @desc    Format currency according to locale
 * @access  Public
 */
router.post('/format/currency', async (req, res) => {
  try {
    const { amount, locale: localeCode = 'EN' } = req.body;

    if (amount === undefined || amount === null) {
      return res.status(400).json({
        success: false,
        error: 'Amount is required',
      });
    }

    if (typeof amount !== 'number' && typeof amount !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Amount must be a number',
      });
    }

    const locale = await Locale.findOne({ code: localeCode.toUpperCase() });
    if (!locale) {
      return res.status(404).json({
        success: false,
        error: 'Locale not found',
      });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount format',
      });
    }

    const formatted = locale.formatCurrency(numericAmount);

    res.json({
      success: true,
      data: {
        formatted,
        locale: localeCode,
        originalAmount: amount,
        numericAmount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/i18n/format/number
 * @desc    Format number according to locale
 * @access  Public
 */
router.post('/format/number', async (req, res) => {
  try {
    const { number, locale: localeCode = 'EN' } = req.body;

    if (number === undefined || number === null) {
      return res.status(400).json({
        success: false,
        error: 'Number is required',
      });
    }

    if (typeof number !== 'number' && typeof number !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Number must be numeric',
      });
    }

    const locale = await Locale.findOne({ code: localeCode.toUpperCase() });
    if (!locale) {
      return res.status(404).json({
        success: false,
        error: 'Locale not found',
      });
    }

    const numericValue = parseFloat(number);
    if (isNaN(numericValue)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid number format',
      });
    }

    const formatted = locale.formatNumber(numericValue);

    res.json({
      success: true,
      data: {
        formatted,
        locale: localeCode,
        originalNumber: number,
        numericValue,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/i18n/init
 * @desc    Initialize i18n system with default data
 * @access  Private (Admin)
 */
router.post('/init', protect, authorize('admin'), async (req, res) => {
  try {
    // Initialize default locales
    const locales = await Locale.createDefaults();

    // Create basic translation keys
    const basicTranslations = {
      'common.welcome': {
        EN: 'Welcome',
        ES: 'Bienvenido',
        FR: 'Bienvenue',
        DE: 'Willkommen',
        AR: 'أهلاً وسهلاً',
        ZH: '欢迎',
      },
      'common.loading': {
        EN: 'Loading...',
        ES: 'Cargando...',
        FR: 'Chargement...',
        DE: 'Laden...',
        AR: 'جار التحميل...',
        ZH: '加载中...',
      },
      'auth.login': {
        EN: 'Log In',
        ES: 'Iniciar sesión',
        FR: 'Se connecter',
        DE: 'Anmelden',
        AR: 'تسجيل الدخول',
        ZH: '登录',
      },
      'auth.logout': {
        EN: 'Log Out',
        ES: 'Cerrar sesión',
        FR: 'Se déconnecter',
        DE: 'Abmelden',
        AR: 'تسجيل الخروج',
        ZH: '退出登录',
      },
      'settings.language': {
        EN: 'Language',
        ES: 'Idioma',
        FR: 'Langue',
        DE: 'Sprache',
        AR: 'اللغة',
        ZH: '语言',
      },
    };

    let translationsCreated = 0;
    for (const [key, translations] of Object.entries(basicTranslations)) {
      const namespace = key.split('.')[0];
      
      try {
        await Translation.create({
          key,
          namespace,
          translations: new Map(Object.entries(translations)),
          status: 'approved',
          createdBy: req.user._id,
        });
        translationsCreated++;
      } catch (error) {
        // Skip if already exists
        console.log(`Translation ${key} already exists`);
      }
    }

    res.json({
      success: true,
      message: 'i18n system initialized successfully',
      data: {
        localesCreated: locales.length,
        translationsCreated,
        totalLocales: await Locale.countDocuments(),
        totalTranslations: await Translation.countDocuments(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
