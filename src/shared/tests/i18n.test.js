const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../server');
const Translation = require('../models/Translation');
const Locale = require('../models/Locale');
/* eslint-env jest */
/**
 * i18n API Tests
 * TASK-14.18 - Language/locale support
 *
 * Comprehensive test suite for internationalization endpoints
 */

// eslint-disable-next-line no-unused-vars
describe('i18n API', () => {
  beforeAll(async () => {
    await mongoose.connect(
      process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/expojane-test'
    );
  });

  afterAll(async () => {
    await Translation.deleteMany({});
    await Locale.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Translation.deleteMany({});
    await Locale.deleteMany({});
  });

  // ============================================
  // LOCALE MANAGEMENT TESTS
  // ============================================

  describe('POST /api/i18n/locales/initialize', () => {
    it('should initialize default locales', async () => {
      const response = await request(app).post('/api/i18n/locales/initialize').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.message).toContain('Initialized');
    });
  });

  describe('GET /api/i18n/locales', () => {
    beforeEach(async () => {
      await Locale.createDefaults();
    });

    it('should get all locales', async () => {
      const response = await request(app).get('/api/i18n/locales').expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBeGreaterThan(0);
    });

    it('should filter enabled locales', async () => {
      const response = await request(app).get('/api/i18n/locales?enabled=true').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every((l) => l.enabled === true)).toBe(true);
    });
  });

  describe('GET /api/i18n/locales/default', () => {
    beforeEach(async () => {
      await Locale.createDefaults();
    });

    it('should get default locale', async () => {
      const response = await request(app).get('/api/i18n/locales/default').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isDefault).toBe(true);
    });
  });

  describe('GET /api/i18n/locales/:code', () => {
    beforeEach(async () => {
      await Locale.createDefaults();
    });

    it('should get locale by code', async () => {
      const response = await request(app).get('/api/i18n/locales/EN').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.code).toBe('EN');
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('nativeName');
    });

    it('should fail with invalid code', async () => {
      const response = await request(app).get('/api/i18n/locales/INVALID').expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/i18n/locales/:code/set-default', () => {
    beforeEach(async () => {
      await Locale.createDefaults();
    });

    it('should set default locale', async () => {
      const response = await request(app).post('/api/i18n/locales/ES/set-default').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.code).toBe('ES');
      expect(response.body.data.isDefault).toBe(true);

      // Verify previous default is no longer default
      const en = await Locale.findOne({ code: 'EN' });
      expect(en.isDefault).toBe(false);
    });
  });

  // ============================================
  // TRANSLATION MANAGEMENT TESTS
  // ============================================

  describe('POST /api/i18n/translations', () => {
    it('should create new translation', async () => {
      const translationData = {
        key: 'welcome_message',
        namespace: 'common',
        translations: {
          en: 'Welcome',
          es: 'Bienvenido',
          fr: 'Bienvenue',
        },
        description: 'Welcome message on home screen',
      };

      const response = await request(app)
        .post('/api/i18n/translations')
        .send(translationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.key).toBe('welcome_message');
      expect(response.body.data.translations.size).toBe(3);
    });

    it('should fail with duplicate key in same namespace', async () => {
      const translationData = {
        key: 'test_key',
        namespace: 'common',
        translations: { en: 'Test' },
      };

      // Create first
      await request(app).post('/api/i18n/translations').send(translationData).expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/i18n/translations')
        .send(translationData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/i18n/translations', () => {
    beforeEach(async () => {
      await Translation.create([
        {
          key: 'hello',
          namespace: 'common',
          translations: new Map([
            ['en', 'Hello'],
            ['es', 'Hola'],
          ]),
        },
        {
          key: 'goodbye',
          namespace: 'common',
          translations: new Map([
            ['en', 'Goodbye'],
            ['es', 'Adiós'],
          ]),
        },
        {
          key: 'login',
          namespace: 'auth',
          translations: new Map([
            ['en', 'Login'],
            ['es', 'Iniciar sesión'],
          ]),
        },
      ]);
    });

    it('should get all translations for language', async () => {
      const response = await request(app).get('/api/i18n/translations?language=en').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.common).toBeDefined();
      expect(response.body.data.common.hello).toBe('Hello');
      expect(response.body.data.auth).toBeDefined();
    });

    it('should get translations for specific namespace', async () => {
      const response = await request(app)
        .get('/api/i18n/translations?language=es&namespace=auth')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.login).toBe('Iniciar sesión');
    });

    it('should use fallback language', async () => {
      const response = await request(app)
        .get('/api/i18n/translations?language=de&fallback=en')
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should return English translations as fallback
      expect(response.body.data.common.hello).toBe('Hello');
    });
  });

  describe('PUT /api/i18n/translations/:key', () => {
    beforeEach(async () => {
      await Translation.create({
        key: 'test_key',
        namespace: 'common',
        translations: new Map([['en', 'Test']]),
      });
    });

    it('should update single language translation', async () => {
      const response = await request(app)
        .put('/api/i18n/translations/test_key')
        .send({
          namespace: 'common',
          language: 'es',
          value: 'Prueba',
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify update
      const translation = await Translation.findOne({
        key: 'test_key',
        namespace: 'common',
      });
      expect(translation.translations.get('es')).toBe('Prueba');
    });

    it('should update multiple languages', async () => {
      const response = await request(app)
        .put('/api/i18n/translations/test_key')
        .send({
          namespace: 'common',
          translations: {
            es: 'Prueba',
            fr: 'Test',
            de: 'Test',
          },
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      const translation = await Translation.findOne({
        key: 'test_key',
        namespace: 'common',
      });
      expect(translation.translations.get('es')).toBe('Prueba');
      expect(translation.translations.get('fr')).toBe('Test');
      expect(translation.translations.get('de')).toBe('Test');
    });
  });

  describe('DELETE /api/i18n/translations/:key', () => {
    beforeEach(async () => {
      await Translation.create({
        key: 'delete_test',
        namespace: 'common',
        translations: new Map([['en', 'Delete Me']]),
      });
    });

    it('should delete translation', async () => {
      const response = await request(app)
        .delete('/api/i18n/translations/delete_test?namespace=common')
        .expect(200);

      expect(response.body.success).toBe(true);

      const translation = await Translation.findOne({
        key: 'delete_test',
        namespace: 'common',
      });
      expect(translation).toBeNull();
    });
  });

  // ============================================
  // BULK OPERATIONS TESTS
  // ============================================

  describe('POST /api/i18n/translations/import', () => {
    it('should import translations from JSON', async () => {
      const importData = {
        data: {
          key1: 'Value 1',
          key2: 'Value 2',
          key3: 'Value 3',
        },
        namespace: 'test',
        language: 'en',
      };

      const response = await request(app)
        .post('/api/i18n/translations/import')
        .send(importData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.created).toBe(3);

      // Verify imported
      const translations = await Translation.find({ namespace: 'test' });
      expect(translations).toHaveLength(3);
    });

    it('should update existing translations on import', async () => {
      // Create existing
      await Translation.create({
        key: 'existing_key',
        namespace: 'test',
        translations: new Map([['en', 'Old Value']]),
      });

      const importData = {
        data: {
          existing_key: 'New Value',
          new_key: 'Value',
        },
        namespace: 'test',
        language: 'en',
      };

      const response = await request(app)
        .post('/api/i18n/translations/import')
        .send(importData)
        .expect(200);

      expect(response.body.data.created).toBe(1);
      expect(response.body.data.updated).toBe(1);

      const translation = await Translation.findOne({
        key: 'existing_key',
        namespace: 'test',
      });
      expect(translation.translations.get('en')).toBe('New Value');
    });
  });

  describe('GET /api/i18n/translations/export', () => {
    beforeEach(async () => {
      await Translation.create([
        {
          key: 'export1',
          namespace: 'common',
          translations: new Map([['en', 'Export 1']]),
          status: 'approved',
        },
        {
          key: 'export2',
          namespace: 'common',
          translations: new Map([['en', 'Export 2']]),
          status: 'approved',
        },
      ]);
    });

    it('should export translations to JSON', async () => {
      const response = await request(app)
        .get('/api/i18n/translations/export?language=en')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.common).toBeDefined();
      expect(response.body.data.common.export1).toBe('Export 1');
      expect(response.body.data.common.export2).toBe('Export 2');
    });

    it('should export specific namespace', async () => {
      const response = await request(app)
        .get('/api/i18n/translations/export?language=en&namespace=common')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.export1).toBe('Export 1');
    });
  });

  // ============================================
  // STATISTICS TESTS
  // ============================================

  describe('GET /api/i18n/stats', () => {
    beforeEach(async () => {
      await Locale.createDefaults();
      await Translation.create([
        {
          key: 'key1',
          namespace: 'common',
          translations: new Map([['en', 'Value 1']]),
          status: 'approved',
        },
        {
          key: 'key2',
          namespace: 'auth',
          translations: new Map([['en', 'Value 2']]),
          status: 'pending_review',
        },
      ]);
    });

    it('should get translation statistics', async () => {
      const response = await request(app).get('/api/i18n/stats').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('translations');
      expect(response.body.data).toHaveProperty('locales');
      expect(response.body.data.translations.total).toBe(2);
      expect(response.body.data.locales.total).toBeGreaterThan(0);
    });
  });

  describe('GET /api/i18n/missing', () => {
    beforeEach(async () => {
      await Translation.create([
        {
          key: 'complete',
          namespace: 'common',
          translations: new Map([
            ['en', 'Complete'],
            ['es', 'Completo'],
          ]),
        },
        {
          key: 'incomplete',
          namespace: 'common',
          translations: new Map([['en', 'Incomplete']]),
        },
      ]);
    });

    it('should find missing translations', async () => {
      const response = await request(app).get('/api/i18n/missing?language=es').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].key).toBe('incomplete');
    });

    it('should filter by namespace', async () => {
      await Translation.create({
        key: 'auth_key',
        namespace: 'auth',
        translations: new Map([['en', 'Auth Key']]),
      });

      const response = await request(app)
        .get('/api/i18n/missing?language=es&namespace=auth')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every((t) => t.namespace === 'auth')).toBe(true);
    });
  });

  describe('GET /api/i18n/search', () => {
    beforeEach(async () => {
      await Translation.create([
        {
          key: 'login_button',
          namespace: 'auth',
          translations: new Map([['en', 'Login']]),
          description: 'Button to log in',
        },
        {
          key: 'logout_button',
          namespace: 'auth',
          translations: new Map([['en', 'Logout']]),
          description: 'Button to log out',
        },
        {
          key: 'welcome',
          namespace: 'common',
          translations: new Map([['en', 'Welcome']]),
        },
      ]);
    });

    it('should search translations by key', async () => {
      const response = await request(app).get('/api/i18n/search?q=login').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].key).toContain('login');
    });

    it('should search by description', async () => {
      const response = await request(app).get('/api/i18n/search?q=button').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // MODEL METHODS TESTS
  // ============================================

  describe('Translation Model Methods', () => {
    it('should get translation with fallback', async () => {
      const translation = await Translation.create({
        key: 'test',
        namespace: 'common',
        translations: new Map([
          ['en', 'Test'],
          ['es', 'Prueba'],
        ]),
        defaultLanguage: 'en',
      });

      // Get existing language
      expect(translation.getTranslation('es')).toBe('Prueba');

      // Get with fallback
      expect(translation.getTranslation('fr', 'en')).toBe('Test');

      // Get with default fallback
      expect(translation.getTranslation('de')).toBe('Test');
    });

    it('should check if translation exists', async () => {
      const translation = await Translation.create({
        key: 'test',
        namespace: 'common',
        translations: new Map([['en', 'Test']]),
      });

      expect(translation.hasTranslation('en')).toBe(true);
      expect(translation.hasTranslation('es')).toBe(false);
    });

    it('should get missing translations', async () => {
      const translation = await Translation.create({
        key: 'test',
        namespace: 'common',
        translations: new Map([
          ['en', 'Test'],
          ['es', 'Prueba'],
        ]),
      });

      const languages = ['en', 'es', 'fr', 'de'];
      const missing = translation.getMissingTranslations(languages);

      expect(missing).toEqual(['fr', 'de']);
    });
  });

  describe('Locale Model Methods', () => {
    beforeEach(async () => {
      await Locale.createDefaults();
    });

    it('should format currency', async () => {
      const en = await Locale.findOne({ code: 'EN' });
      expect(en.formatCurrency(1234.56)).toBe('$1,234.56');

      const es = await Locale.findOne({ code: 'ES' });
      expect(es.formatCurrency(1234.56)).toContain('€');
    });

    it('should identify RTL locales', async () => {
      const ar = await Locale.findOne({ code: 'AR' });
      expect(ar.isRTL).toBe(true);

      const en = await Locale.findOne({ code: 'EN' });
      expect(en.isRTL).toBe(false);
    });
  });
});
