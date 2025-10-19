const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../server');
const SocialLoginProvider = require('../models/SocialLoginProvider');
/* eslint-env jest */
// eslint-disable-next-line no-unused-vars
// Mock auth middleware
jest.mock('../middleware/auth', () => ({
  protect: (req, res, next) => {
    req.user = {
      _id: new mongoose.Types.ObjectId(),
      email: 'test@example.com',
      role: 'admin',
    };
    next();
  },
}));

describe('Social Login Providers API - TASK-15.18', () => {
  let organizationId;
  let userId;
  let configId;

  beforeAll(async () => {
    // Connect to test database
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/expojane_test';
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    // Cleanup and close connection
    await SocialLoginProvider.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear database before each test
    await SocialLoginProvider.deleteMany({});

    organizationId = new mongoose.Types.ObjectId();
    userId = new mongoose.Types.ObjectId();
  });

  describe('POST /api/social-login/initialize', () => {
    it('should initialize social login configuration', async () => {
      const response = await request(app)
        .post('/api/social-login/initialize')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send();

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.config).toBeDefined();
      expect(response.body.config.organization).toBe(organizationId.toString());

      configId = response.body.config._id;
    });

    it('should not allow duplicate initialization', async () => {
      // First initialization
      await request(app)
        .post('/api/social-login/initialize')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send();

      // Second initialization (should fail)
      const response = await request(app)
        .post('/api/social-login/initialize')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send();

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('GET /api/social-login/config', () => {
    beforeEach(async () => {
      await SocialLoginProvider.create({
        organization: organizationId,
        createdBy: userId,
      });
    });

    it('should get social login configuration', async () => {
      const response = await request(app)
        .get('/api/social-login/config')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.config).toBeDefined();
      expect(response.body.config.organization).toBe(organizationId.toString());
    });

    it('should mask sensitive credentials', async () => {
      // Update config with Google credentials
      await SocialLoginProvider.findOneAndUpdate(
        { organization: organizationId },
        {
          'providers.google': {
            enabled: true,
            clientId: 'google-client-id',
            clientSecret: 'super-secret-key',
            redirectUri: 'https://example.com/callback',
          },
        }
      );

      const response = await request(app)
        .get('/api/social-login/config')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.config.providers.google.clientSecret).toBe('***');
    });

    it('should return 404 if configuration does not exist', async () => {
      await SocialLoginProvider.deleteMany({});

      const response = await request(app)
        .get('/api/social-login/config')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/social-login/config', () => {
    beforeEach(async () => {
      await SocialLoginProvider.create({
        organization: organizationId,
        createdBy: userId,
      });
    });

    it('should update general configuration', async () => {
      const response = await request(app)
        .put('/api/social-login/config')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          allowSignup: false,
          allowLinking: true,
          requireEmailVerification: true,
          autoCreateUser: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.config.allowSignup).toBe(false);
      expect(response.body.config.requireEmailVerification).toBe(true);
    });
  });

  describe('POST /api/social-login/providers/:provider/enable', () => {
    beforeEach(async () => {
      await SocialLoginProvider.create({
        organization: organizationId,
        createdBy: userId,
      });
    });

    it('should enable Google provider', async () => {
      const response = await request(app)
        .post('/api/social-login/providers/google/enable')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          clientId: 'google-client-id-12345',
          clientSecret: 'google-client-secret',
          redirectUri: 'https://example.com/auth/google/callback',
          scopes: ['email', 'profile'],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('google');
    });

    it('should enable Facebook provider', async () => {
      const response = await request(app)
        .post('/api/social-login/providers/facebook/enable')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          appId: 'facebook-app-id',
          appSecret: 'facebook-app-secret',
          redirectUri: 'https://example.com/auth/facebook/callback',
          scopes: ['email', 'public_profile'],
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('facebook');
    });

    it('should enable Apple provider', async () => {
      const response = await request(app)
        .post('/api/social-login/providers/apple/enable')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          serviceId: 'com.example.app',
          teamId: 'TEAM123',
          keyId: 'KEY123',
          privateKey: 'private-key-content',
          redirectUri: 'https://example.com/auth/apple/callback',
          scopes: ['name', 'email'],
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('apple');
    });

    it('should reject invalid provider', async () => {
      const response = await request(app)
        .post('/api/social-login/providers/invalid/enable')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          clientId: 'test',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid provider');
    });
  });

  describe('POST /api/social-login/providers/:provider/disable', () => {
    beforeEach(async () => {
      const config = await SocialLoginProvider.create({
        organization: organizationId,
        createdBy: userId,
      });

      await config.enableProvider('google', {
        clientId: 'test-client-id',
        clientSecret: 'test-secret',
        redirectUri: 'https://example.com/callback',
      });
    });

    it('should disable provider', async () => {
      const response = await request(app)
        .post('/api/social-login/providers/google/disable')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('disabled');
    });
  });

  describe('GET /api/social-login/providers', () => {
    beforeEach(async () => {
      const config = await SocialLoginProvider.create({
        organization: organizationId,
        createdBy: userId,
      });

      await config.enableProvider('google', {
        clientId: 'google-id',
        clientSecret: 'google-secret',
        redirectUri: 'https://example.com/google',
      });

      await config.enableProvider('facebook', {
        appId: 'facebook-id',
        appSecret: 'facebook-secret',
        redirectUri: 'https://example.com/facebook',
      });
    });

    it('should get all providers configuration', async () => {
      const response = await request(app)
        .get('/api/social-login/providers')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.providers).toBeDefined();
      expect(response.body.providers.google.enabled).toBe(true);
      expect(response.body.providers.facebook.enabled).toBe(true);
    });

    it('should mask all sensitive credentials', async () => {
      const response = await request(app)
        .get('/api/social-login/providers')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.providers.google.clientSecret).toBe('***');
      expect(response.body.providers.facebook.appSecret).toBe('***');
    });
  });

  describe('POST /api/social-login/accounts/link', () => {
    beforeEach(async () => {
      await SocialLoginProvider.create({
        organization: organizationId,
        createdBy: userId,
      });
    });

    it('should link a social account to a user', async () => {
      const testUserId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post('/api/social-login/accounts/link')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          userId: testUserId.toString(),
          provider: 'google',
          providerId: 'google-user-12345',
          email: 'user@example.com',
          displayName: 'Test User',
          firstName: 'Test',
          lastName: 'User',
          profilePicture: 'https://example.com/avatar.jpg',
          accessToken: 'access-token-123',
          isEmailVerified: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('linked');
    });

    it('should require userId, provider, and providerId', async () => {
      const response = await request(app)
        .post('/api/social-login/accounts/link')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          provider: 'google',
          // Missing userId and providerId
        });

      expect(response.status).toBe(400);
    });

    it('should reject blocked email domains', async () => {
      // Update config to block a domain
      await SocialLoginProvider.findOneAndUpdate(
        { organization: organizationId },
        { 'config.blockedDomains': ['blocked.com'] }
      );

      const response = await request(app)
        .post('/api/social-login/accounts/link')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          userId: new mongoose.Types.ObjectId().toString(),
          provider: 'google',
          providerId: 'google-user-123',
          email: 'test@blocked.com',
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('not allowed');
    });
  });

  describe('POST /api/social-login/accounts/unlink', () => {
    beforeEach(async () => {
      const testUserId = new mongoose.Types.ObjectId();
      const config = await SocialLoginProvider.create({
        organization: organizationId,
        createdBy: userId,
      });

      await config.linkSocialAccount({
        userId: testUserId,
        provider: 'google',
        providerId: 'google-user-123',
        email: 'test@example.com',
      });
    });

    it('should unlink a social account', async () => {
      const config = await SocialLoginProvider.findOne({ organization: organizationId });
      const testUserId = config.socialAccounts[0].userId;

      const response = await request(app)
        .post('/api/social-login/accounts/unlink')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          userId: testUserId.toString(),
          provider: 'google',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('unlinked');
    });

    it('should require userId and provider', async () => {
      const response = await request(app)
        .post('/api/social-login/accounts/unlink')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          userId: new mongoose.Types.ObjectId().toString(),
          // Missing provider
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/social-login/accounts', () => {
    beforeEach(async () => {
      const user1 = new mongoose.Types.ObjectId();
      const user2 = new mongoose.Types.ObjectId();

      const config = await SocialLoginProvider.create({
        organization: organizationId,
        createdBy: userId,
      });

      await config.linkSocialAccount({
        userId: user1,
        provider: 'google',
        providerId: 'google-1',
        email: 'user1@example.com',
      });

      await config.linkSocialAccount({
        userId: user1,
        provider: 'facebook',
        providerId: 'facebook-1',
        email: 'user1@example.com',
      });

      await config.linkSocialAccount({
        userId: user2,
        provider: 'google',
        providerId: 'google-2',
        email: 'user2@example.com',
      });
    });

    it('should get all linked accounts', async () => {
      const response = await request(app)
        .get('/api/social-login/accounts')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.accounts).toBeDefined();
      expect(response.body.accounts.length).toBe(3);
      expect(response.body.total).toBe(3);
    });

    it('should filter accounts by userId', async () => {
      const config = await SocialLoginProvider.findOne({ organization: organizationId });
      const user1Id = config.socialAccounts[0].userId;

      const response = await request(app)
        .get(`/api/social-login/accounts?userId=${user1Id}`)
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.accounts.length).toBe(2);
    });

    it('should mask sensitive tokens', async () => {
      const response = await request(app)
        .get('/api/social-login/accounts')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      // Tokens should not be exposed or should be masked
      response.body.accounts.forEach((account) => {
        if (account.accessToken) {
          expect(account.accessToken).toContain('***');
        }
      });
    });
  });

  describe('GET /api/social-login/accounts/user/:userId', () => {
    beforeEach(async () => {
      const testUserId = new mongoose.Types.ObjectId();
      const config = await SocialLoginProvider.create({
        organization: organizationId,
        createdBy: userId,
      });

      await config.linkSocialAccount({
        userId: testUserId,
        provider: 'google',
        providerId: 'google-123',
        email: 'test@example.com',
        accessToken: 'google-access-token',
      });

      await config.linkSocialAccount({
        userId: testUserId,
        provider: 'facebook',
        providerId: 'facebook-123',
        email: 'test@example.com',
        accessToken: 'facebook-access-token',
      });
    });

    it('should get accounts for a specific user', async () => {
      const config = await SocialLoginProvider.findOne({ organization: organizationId });
      const testUserId = config.socialAccounts[0].userId;

      const response = await request(app)
        .get(`/api/social-login/accounts/user/${testUserId}`)
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.accounts).toBeDefined();
      expect(response.body.accounts.length).toBe(2);
      expect(response.body.total).toBe(2);
    });

    it('should mask tokens in user accounts', async () => {
      const config = await SocialLoginProvider.findOne({ organization: organizationId });
      const testUserId = config.socialAccounts[0].userId;

      const response = await request(app)
        .get(`/api/social-login/accounts/user/${testUserId}`)
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      response.body.accounts.forEach((account) => {
        if (account.accessToken) {
          expect(account.accessToken).toContain('***');
        }
      });
    });
  });

  describe('POST /api/social-login/login/record', () => {
    beforeEach(async () => {
      await SocialLoginProvider.create({
        organization: organizationId,
        createdBy: userId,
      });
    });

    it('should record a login event', async () => {
      const response = await request(app)
        .post('/api/social-login/login/record')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          userId: new mongoose.Types.ObjectId().toString(),
          provider: 'google',
          providerId: 'google-user-123',
          email: 'user@example.com',
          loginMethod: 'login',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          success: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('recorded');
    });

    it('should require provider and providerId', async () => {
      const response = await request(app)
        .post('/api/social-login/login/record')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          userId: new mongoose.Types.ObjectId().toString(),
          // Missing provider and providerId
        });

      expect(response.status).toBe(400);
    });

    it('should record failed login', async () => {
      const response = await request(app)
        .post('/api/social-login/login/record')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          provider: 'google',
          providerId: 'google-user-123',
          email: 'user@example.com',
          success: false,
          errorMessage: 'Invalid credentials',
        });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/social-login/history', () => {
    beforeEach(async () => {
      const testUserId = new mongoose.Types.ObjectId();
      const config = await SocialLoginProvider.create({
        organization: organizationId,
        createdBy: userId,
      });

      // Record multiple login events
      await config.recordLogin({
        userId: testUserId,
        provider: 'google',
        providerId: 'google-123',
        email: 'test@example.com',
        loginMethod: 'login',
        success: true,
      });

      await config.recordLogin({
        userId: testUserId,
        provider: 'facebook',
        providerId: 'facebook-123',
        email: 'test@example.com',
        loginMethod: 'login',
        success: true,
      });

      await config.recordLogin({
        userId: testUserId,
        provider: 'google',
        providerId: 'google-123',
        email: 'test@example.com',
        loginMethod: 'login',
        success: false,
        errorMessage: 'Authentication failed',
      });
    });

    it('should get login history', async () => {
      const response = await request(app)
        .get('/api/social-login/history')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.history).toBeDefined();
      expect(response.body.history.length).toBe(3);
    });

    it('should filter history by provider', async () => {
      const response = await request(app)
        .get('/api/social-login/history?provider=google')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.history.length).toBe(2);
      expect(response.body.history.every((h) => h.provider === 'google')).toBe(true);
    });

    it('should filter history by success', async () => {
      const response = await request(app)
        .get('/api/social-login/history?success=false')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.history.length).toBe(1);
      expect(response.body.history[0].success).toBe(false);
    });

    it('should support limit parameter', async () => {
      const response = await request(app)
        .get('/api/social-login/history?limit=2')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.history.length).toBe(2);
    });
  });

  describe('Security Settings', () => {
    beforeEach(async () => {
      await SocialLoginProvider.create({
        organization: organizationId,
        createdBy: userId,
      });
    });

    it('should get security settings', async () => {
      const response = await request(app)
        .get('/api/social-login/security')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.security).toBeDefined();
      expect(response.body.security.enableMFA).toBeDefined();
    });

    it('should update security settings', async () => {
      const response = await request(app)
        .put('/api/social-login/security')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          enableMFA: true,
          requireMFAForSocialLogin: true,
          maxLoginAttempts: 3,
          lockoutDuration: 1800,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.security.enableMFA).toBe(true);
      expect(response.body.security.maxLoginAttempts).toBe(3);
    });
  });

  describe('GET /api/social-login/stats', () => {
    beforeEach(async () => {
      const config = await SocialLoginProvider.create({
        organization: organizationId,
        createdBy: userId,
        stats: {
          totalLogins: 150,
          totalSignups: 50,
          totalLinkedAccounts: 100,
          failedLogins: 10,
          googleLogins: 80,
          facebookLogins: 40,
          appleLogins: 20,
          microsoftLogins: 10,
        },
      });

      // Enable some providers
      await config.enableProvider('google', {
        clientId: 'google-id',
        clientSecret: 'google-secret',
        redirectUri: 'https://example.com/google',
      });

      await config.enableProvider('facebook', {
        appId: 'facebook-id',
        appSecret: 'facebook-secret',
        redirectUri: 'https://example.com/facebook',
      });
    });

    it('should get overall statistics', async () => {
      const response = await request(app)
        .get('/api/social-login/stats')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats.totalLogins).toBe(150);
      expect(response.body.stats.totalSignups).toBe(50);
      expect(response.body.stats.totalLinkedAccounts).toBe(100);
      expect(response.body.stats.failedLogins).toBe(10);
      expect(response.body.stats.enabledProvidersCount).toBe(2);
      expect(response.body.stats.mostPopularProvider).toBe('google');
    });

    it('should include provider breakdown', async () => {
      const response = await request(app)
        .get('/api/social-login/stats')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.stats.providerBreakdown).toBeDefined();
      expect(response.body.stats.providerBreakdown.google).toBe(80);
      expect(response.body.stats.providerBreakdown.facebook).toBe(40);
    });

    it('should calculate success rate', async () => {
      const response = await request(app)
        .get('/api/social-login/stats')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      // Success rate = (150 - 10) / 150 = 93.33%
      expect(parseFloat(response.body.stats.loginSuccessRate)).toBeCloseTo(93.33, 1);
    });
  });

  describe('POST /api/social-login/verify-ip', () => {
    beforeEach(async () => {
      await SocialLoginProvider.create({
        organization: organizationId,
        createdBy: userId,
        security: {
          restrictToTrustedIPs: true,
          trustedIPs: ['192.168.1.1', '10.0.0.1'],
        },
      });
    });

    it('should verify trusted IP', async () => {
      const response = await request(app)
        .post('/api/social-login/verify-ip')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          ipAddress: '192.168.1.1',
        });

      expect(response.status).toBe(200);
      expect(response.body.isTrusted).toBe(true);
    });

    it('should reject untrusted IP', async () => {
      const response = await request(app)
        .post('/api/social-login/verify-ip')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          ipAddress: '203.0.113.1',
        });

      expect(response.status).toBe(200);
      expect(response.body.isTrusted).toBe(false);
    });

    it('should require ipAddress', async () => {
      const response = await request(app)
        .post('/api/social-login/verify-ip')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/social-login/verify-domain', () => {
    beforeEach(async () => {
      await SocialLoginProvider.create({
        organization: organizationId,
        createdBy: userId,
        config: {
          allowedDomains: ['allowed.com'],
          blockedDomains: ['blocked.com'],
        },
      });
    });

    it('should allow email from allowed domain', async () => {
      const response = await request(app)
        .post('/api/social-login/verify-domain')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          email: 'user@allowed.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.isAllowed).toBe(true);
      expect(response.body.domain).toBe('allowed.com');
    });

    it('should block email from blocked domain', async () => {
      const response = await request(app)
        .post('/api/social-login/verify-domain')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          email: 'user@blocked.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.isAllowed).toBe(false);
    });

    it('should reject email from non-allowed domain when allowlist is active', async () => {
      const response = await request(app)
        .post('/api/social-login/verify-domain')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({
          email: 'user@random.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.isAllowed).toBe(false);
    });

    it('should require email', async () => {
      const response = await request(app)
        .post('/api/social-login/verify-domain')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString())
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('Virtual Fields', () => {
    it('should calculate enabledProvidersCount', async () => {
      const config = await SocialLoginProvider.create({
        organization: organizationId,
        createdBy: userId,
      });

      await config.enableProvider('google', {
        clientId: 'id',
        clientSecret: 'secret',
        redirectUri: 'uri',
      });
      await config.enableProvider('facebook', {
        appId: 'id',
        appSecret: 'secret',
        redirectUri: 'uri',
      });
      await config.enableProvider('apple', {
        serviceId: 'id',
        teamId: 'team',
        keyId: 'key',
        privateKey: 'key',
        redirectUri: 'uri',
      });

      const response = await request(app)
        .get('/api/social-login/stats')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.stats.enabledProvidersCount).toBe(3);
    });

    it('should identify most popular provider', async () => {
      await SocialLoginProvider.create({
        organization: organizationId,
        createdBy: userId,
        stats: {
          googleLogins: 100,
          facebookLogins: 50,
          appleLogins: 200,
          microsoftLogins: 30,
        },
      });

      const response = await request(app)
        .get('/api/social-login/stats')
        .set('x-user-id', userId.toString())
        .set('x-organization-id', organizationId.toString());

      expect(response.status).toBe(200);
      expect(response.body.stats.mostPopularProvider).toBe('apple');
    });
  });

  describe('OAuth Flow Endpoints', () => {
    beforeEach(async () => {
      const config = await SocialLoginProvider.create({
        organization: organizationId,
        createdBy: userId,
      });

      await config.enableProvider('google', {
        clientId: 'google-client-id',
        clientSecret: 'google-secret',
        redirectUri: 'https://example.com/callback',
      });
    });

    it('should initiate auth flow', async () => {
      const response = await request(app).post('/api/social-login/auth/google').send({
        organizationId: organizationId.toString(),
        code: 'auth-code-123',
        state: 'random-state',
      });

      expect(response.status).toBe(200);
      expect(response.body.provider).toBe('google');
    });

    it('should reject disabled provider', async () => {
      const response = await request(app).post('/api/social-login/auth/facebook').send({
        organizationId: organizationId.toString(),
        code: 'auth-code-123',
      });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('not enabled');
    });

    it('should handle OAuth callback', async () => {
      const response = await request(app).post('/api/social-login/callback/google').send({
        code: 'authorization-code',
        state: 'state-value',
      });

      expect(response.status).toBe(200);
      expect(response.body.provider).toBe('google');
    });
  });
});
