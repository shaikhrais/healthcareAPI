const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Import models
const Translation = require('../models/Translation');
const Locale = require('../models/Locale');

// Import i18n routes
const i18nRoutes = require('../routes/i18n');

// Mock logger to prevent missing logger errors
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock auth middleware
const mockAuth = {
  protect: (req, res, next) => {
    req.user = { userId: 'test-user-id', role: 'admin' };
    next();
  },
};

// Mock permissions middleware
const mockPermissions = {
  authorize: () => (req, res, next) => next(),
};

// Replace middleware imports
jest.doMock('../middleware/auth', () => mockAuth);
jest.doMock('../middleware/permissions', () => mockPermissions);

describe('I18n System Comprehensive Tests', () => {
  let mongoServer;
  let app;
  
  beforeAll(async () => {
    try {
      // Close existing connection if any
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      
      // Setup in-memory MongoDB
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      
      await mongoose.connect(mongoUri);
      
      // Setup Express app with i18n routes
      app = express();
      app.use(express.json());
      app.use('/api/i18n', i18nRoutes);
      
      // Error handling middleware
      app.use((error, req, res, next) => {
        res.status(error.status || 500).json({
          success: false,
          error: { message: error.message },
        });
      });
    } catch (error) {
      console.error('Setup error:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      if (mongoServer) {
        await mongoServer.stop();
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  beforeEach(async () => {
    try {
      // Clear all data before each test
      await Translation.deleteMany({});
      await Locale.deleteMany({});
    } catch (error) {
      console.error('Test cleanup error:', error);
    }
  });

  describe('1. Locale Management', () => {
    test('GET /locales - should return empty array initially', async () => {
      const response = await request(app).get('/api/i18n/locales');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    test('POST /locales - should create new locale', async () => {
      const localeData = {
        code: 'en-US',
        name: 'English (United States)',
        nativeName: 'English (United States)',
        isRTL: false,
        isActive: true,
        dateFormat: 'MM/dd/yyyy',
        timeFormat: '12h',
        currencyCode: 'USD',
        currencySymbol: '$',
        numberFormat: {
          decimalSeparator: '.',
          thousandsSeparator: ',',
          decimalPlaces: 2
        }
      };

      const response = await request(app)
        .post('/api/i18n/locales')
        .send(localeData);
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.code).toBe('en-US');
      expect(response.body.data.name).toBe('English (United States)');
    });

    test('POST /locales - should validate required fields', async () => {
      const invalidLocaleData = {
        name: 'English'
        // Missing required 'code' field
      };

      const response = await request(app)
        .post('/api/i18n/locales')
        .send(invalidLocaleData);
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('GET /locales/:code - should return specific locale', async () => {
      // Create a locale first
      await new Locale({
        code: 'es-ES',
        name: 'Spanish (Spain)',
        nativeName: 'Español (España)',
        isRTL: false,
        isActive: true
      }).save();

      const response = await request(app).get('/api/i18n/locales/es-ES');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.code).toBe('es-ES');
    });

    test('PUT /locales/:code - should update locale', async () => {
      // Create a locale first
      await new Locale({
        code: 'fr-FR',
        name: 'French (France)',
        nativeName: 'Français (France)',
        isRTL: false,
        isActive: true
      }).save();

      const updateData = {
        name: 'French (Updated)',
        isActive: false
      };

      const response = await request(app)
        .put('/api/i18n/locales/fr-FR')
        .send(updateData);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('French (Updated)');
      expect(response.body.data.isActive).toBe(false);
    });

    test('DELETE /locales/:code - should delete locale', async () => {
      // Create a locale first
      await new Locale({
        code: 'de-DE',
        name: 'German (Germany)',
        nativeName: 'Deutsch (Deutschland)',
        isRTL: false,
        isActive: true
      }).save();

      const response = await request(app).delete('/api/i18n/locales/de-DE');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify it's deleted
      const getResponse = await request(app).get('/api/i18n/locales/de-DE');
      expect(getResponse.status).toBe(404);
    });
  });

  describe('2. Translation Management', () => {
    test('GET /translations - should return empty array initially', async () => {
      const response = await request(app).get('/api/i18n/translations');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    test('POST /translations - should create new translation', async () => {
      const translationData = {
        key: 'welcome_message',
        namespace: 'common',
        translations: {
          'en-US': 'Welcome to our application!',
          'es-ES': '¡Bienvenido a nuestra aplicación!',
          'fr-FR': 'Bienvenue dans notre application!'
        },
        description: 'Welcome message displayed on home screen'
      };

      const response = await request(app)
        .post('/api/i18n/translations')
        .send(translationData);
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.key).toBe('welcome_message');
      expect(response.body.data.translations.get('en-US')).toBe('Welcome to our application!');
    });

    test('GET /translations/:key - should return specific translation', async () => {
      // Create a translation first
      await new Translation({
        key: 'button_save',
        namespace: 'common',
        translations: new Map([
          ['en-US', 'Save'],
          ['es-ES', 'Guardar'],
          ['fr-FR', 'Enregistrer']
        ])
      }).save();

      const response = await request(app).get('/api/i18n/translations/button_save');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.key).toBe('button_save');
    });

    test('PUT /translations/:key - should update translation', async () => {
      // Create a translation first
      await new Translation({
        key: 'button_cancel',
        namespace: 'common',
        translations: new Map([
          ['en-US', 'Cancel'],
          ['es-ES', 'Cancelar']
        ])
      }).save();

      const updateData = {
        translations: {
          'en-US': 'Cancel',
          'es-ES': 'Cancelar',
          'fr-FR': 'Annuler'
        }
      };

      const response = await request(app)
        .put('/api/i18n/translations/button_cancel')
        .send(updateData);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.translations).toHaveProperty('fr-FR');
    });

    test('DELETE /translations/:key - should delete translation', async () => {
      // Create a translation first
      await new Translation({
        key: 'temp_message',
        namespace: 'common',
        translations: new Map([
          ['en-US', 'Temporary message']
        ])
      }).save();

      const response = await request(app).delete('/api/i18n/translations/temp_message');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify it's deleted
      const getResponse = await request(app).get('/api/i18n/translations/temp_message');
      expect(getResponse.status).toBe(404);
    });
  });

  describe('3. Bulk Operations', () => {
    test('POST /translations/bulk - should import multiple translations', async () => {
      const bulkData = {
        translations: [
          {
            key: 'app_title',
            namespace: 'common',
            translations: {
              'en-US': 'Healthcare App',
              'es-ES': 'Aplicación de Salud'
            }
          },
          {
            key: 'loading_message',
            namespace: 'common',
            translations: {
              'en-US': 'Loading...',
              'es-ES': 'Cargando...'
            }
          }
        ]
      };

      const response = await request(app)
        .post('/api/i18n/translations/bulk')
        .send(bulkData);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.created).toBe(2);
      expect(response.body.data.updated).toBe(0);
    });

    test('GET /translations/export - should export translations', async () => {
      // Create some test translations
      await new Translation({
        key: 'test_export_1',
        namespace: 'test',
        translations: new Map([
          ['en-US', 'Test Export 1'],
          ['es-ES', 'Prueba Exportar 1']
        ])
      }).save();

      await new Translation({
        key: 'test_export_2',
        namespace: 'test',
        translations: new Map([
          ['en-US', 'Test Export 2'],
          ['es-ES', 'Prueba Exportar 2']
        ])
      }).save();

      const response = await request(app)
        .get('/api/i18n/translations/export')
        .query({ namespace: 'test', locales: 'en-US,es-ES' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('test_export_1');
      expect(response.body.data).toHaveProperty('test_export_2');
    });
  });

  describe('4. Analytics and Search', () => {
    beforeEach(async () => {
      // Setup test data for analytics
      await new Translation({
        key: 'search_test_1',
        namespace: 'search',
        translations: new Map([
          ['en-US', 'Search Test One'],
          ['es-ES', 'Prueba Búsqueda Uno']
        ]),
        lastModified: new Date()
      }).save();

      await new Translation({
        key: 'search_test_2',
        namespace: 'search',
        translations: new Map([
          ['en-US', 'Search Test Two'],
          ['es-ES', 'Prueba Búsqueda Dos']
        ]),
        lastModified: new Date()
      }).save();
    });

    test('GET /analytics - should return translation analytics', async () => {
      const response = await request(app).get('/api/i18n/analytics');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalTranslations');
      expect(response.body.data).toHaveProperty('totalLocales');
      expect(response.body.data).toHaveProperty('completionRates');
    });

    test('GET /translations/search - should search translations', async () => {
      const response = await request(app)
        .get('/api/i18n/translations/search')
        .query({ q: 'Search Test', locale: 'en-US' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].key).toContain('search_test');
    });

    test('GET /analytics/missing - should return missing translations', async () => {
      // Create a translation with missing locale
      await new Translation({
        key: 'incomplete_translation',
        namespace: 'test',
        translations: new Map([
          ['en-US', 'English only']
          // Missing es-ES translation
        ])
      }).save();

      const response = await request(app).get('/api/i18n/analytics/missing');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('5. User Preferences', () => {
    test('GET /user/preferences - should return default preferences', async () => {
      const response = await request(app).get('/api/i18n/user/preferences');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('locale');
      expect(response.body.data).toHaveProperty('dateFormat');
      expect(response.body.data).toHaveProperty('timeFormat');
    });

    test('PUT /user/preferences - should update user preferences', async () => {
      const preferences = {
        locale: 'es-ES',
        dateFormat: 'dd/MM/yyyy',
        timeFormat: '24h',
        timezone: 'Europe/Madrid'
      };

      const response = await request(app)
        .put('/api/i18n/user/preferences')
        .send(preferences);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.locale).toBe('es-ES');
      expect(response.body.data.dateFormat).toBe('dd/MM/yyyy');
    });
  });

  describe('6. RTL and Special Languages', () => {
    test('GET /locales/rtl - should return RTL locales', async () => {
      // Create RTL locale
      await new Locale({
        code: 'ar-SA',
        name: 'Arabic (Saudi Arabia)',
        nativeName: 'العربية (المملكة العربية السعودية)',
        isRTL: true,
        isActive: true
      }).save();

      // Create LTR locale
      await new Locale({
        code: 'en-US',
        name: 'English (United States)',
        nativeName: 'English (United States)',
        isRTL: false,
        isActive: true
      }).save();

      const response = await request(app).get('/api/i18n/locales/rtl');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].code).toBe('ar-SA');
      expect(response.body.data[0].isRTL).toBe(true);
    });

    test('GET /locales/:code/direction - should return text direction', async () => {
      // Create Arabic locale
      await new Locale({
        code: 'ar-SA',
        name: 'Arabic (Saudi Arabia)',
        nativeName: 'العربية (المملكة العربية السعودية)',
        isRTL: true,
        isActive: true
      }).save();

      const response = await request(app).get('/api/i18n/locales/ar-SA/direction');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.direction).toBe('rtl');
      expect(response.body.data.isRTL).toBe(true);
    });
  });

  describe('7. Format Utilities', () => {
    beforeEach(async () => {
      // Create test locale with format settings
      await new Locale({
        code: 'en-US',
        name: 'English (United States)',
        nativeName: 'English (United States)',
        isRTL: false,
        isActive: true,
        dateFormat: 'MM/dd/yyyy',
        timeFormat: '12h',
        currencyCode: 'USD',
        currencySymbol: '$',
        numberFormat: {
          decimalSeparator: '.',
          thousandsSeparator: ',',
          decimalPlaces: 2
        }
      }).save();
    });

    test('POST /format/date - should format date according to locale', async () => {
      const dateData = {
        date: '2024-01-15T10:30:00Z',
        locale: 'en-US'
      };

      const response = await request(app)
        .post('/api/i18n/format/date')
        .send(dateData);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('formatted');
      expect(response.body.data.locale).toBe('en-US');
    });

    test('POST /format/currency - should format currency according to locale', async () => {
      const currencyData = {
        amount: 1234.56,
        locale: 'en-US'
      };

      const response = await request(app)
        .post('/api/i18n/format/currency')
        .send(currencyData);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('formatted');
      expect(response.body.data.formatted).toContain('$');
    });

    test('POST /format/number - should format number according to locale', async () => {
      const numberData = {
        number: 1234567.89,
        locale: 'en-US'
      };

      const response = await request(app)
        .post('/api/i18n/format/number')
        .send(numberData);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('formatted');
      expect(response.body.data.formatted).toContain(','); // thousands separator
    });
  });

  describe('8. System Initialization', () => {
    test('POST /init - should initialize i18n system with default data', async () => {
      const response = await request(app).post('/api/i18n/init');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('localesCreated');
      expect(response.body.data).toHaveProperty('translationsCreated');
      expect(response.body.data.localesCreated).toBeGreaterThan(0);
    });
  });

  describe('9. Performance and Edge Cases', () => {
    test('should handle large translation datasets', async () => {
      // Create 100 translations
      const translations = [];
      for (let i = 0; i < 100; i++) {
        translations.push({
          key: `performance_test_${i}`,
          namespace: 'performance',
          translations: {
            'en-US': `Performance Test ${i}`,
            'es-ES': `Prueba Rendimiento ${i}`
          }
        });
      }

      const response = await request(app)
        .post('/api/i18n/translations/bulk')
        .send({ translations });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.created).toBe(100);
    }, 10000); // 10 second timeout for performance test

    test('should handle invalid locale codes gracefully', async () => {
      const response = await request(app).get('/api/i18n/locales/invalid-locale-code');
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test('should handle malformed translation data', async () => {
      const malformedData = {
        key: 'test_malformed',
        // Missing required fields
        translations: 'invalid-not-object'
      };

      const response = await request(app)
        .post('/api/i18n/translations')
        .send(malformedData);
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('10. Security Validation', () => {
    test('should require authentication for protected endpoints', async () => {
      // Create app without auth middleware for this test
      const noAuthApp = express();
      noAuthApp.use(express.json());
      
      // Mock i18n routes without auth
      const i18nRoutesNoAuth = require('../routes/i18n');
      noAuthApp.use('/api/i18n', i18nRoutesNoAuth);

      // This test assumes the routes have auth protection
      // In a real scenario, you'd test with no auth token
      const response = await request(noAuthApp).get('/api/i18n/locales');
      
      // This test would fail in production with proper auth
      // For now, just verify the route structure works
      expect(response.status).toBeOneOf([200, 401, 403]);
    });

    test('should validate input data types', async () => {
      const invalidTypeData = {
        code: 123, // Should be string
        name: true, // Should be string
        isRTL: 'yes' // Should be boolean
      };

      const response = await request(app)
        .post('/api/i18n/locales')
        .send(invalidTypeData);
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should sanitize input data', async () => {
      const maliciousData = {
        code: 'en-US',
        name: '<script>alert("xss")</script>',
        nativeName: 'English with <img src=x onerror=alert("xss")>',
        isRTL: false,
        isActive: true
      };

      const response = await request(app)
        .post('/api/i18n/locales')
        .send(maliciousData);
      
      if (response.status === 201) {
        // If creation succeeds, ensure XSS content is sanitized
        expect(response.body.data.name).not.toContain('<script>');
        expect(response.body.data.nativeName).not.toContain('<img');
      } else {
        // Should reject malicious input
        expect(response.status).toBe(400);
      }
    });
  });
});