const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../server');
const DeepLink = require('../models/DeepLink');
/* eslint-env jest */
/**
 * Deep Links API Tests
 * TASK-14.9 - Deep Linking & Universal Links
 *
 * Tests for:
 * - Deep link creation and short code generation
 * - Universal links (iOS) and App Links (Android)
 * - Click tracking and analytics
 * - Install and conversion tracking
 * - Campaign management
 * - Platform-specific URL generation (AASA, assetlinks.json)
 * - Link expiration and status management
 * - Deferred deep linking
 */

// eslint-disable-next-line no-unused-vars
describe('Deep Links API - TASK-14.9', () => {
  let testUserId;
  let testOrgId;
  let testDeepLink;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/expojane-test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await DeepLink.deleteMany({});

    testUserId = new mongoose.Types.ObjectId();
    testOrgId = new mongoose.Types.ObjectId();

    // Create a test deep link
    testDeepLink = await DeepLink.create({
      shortCode: 'TEST1234',
      fullUrl: 'https://expojane.app/l/TEST1234',
      type: 'universal',
      destination: {
        screen: 'appointments/view',
        params: {
          appointmentId: '123',
        },
        fallbackUrl: 'https://expojane.app/appointments/123',
      },
      platforms: {
        ios: {
          enabled: true,
          appStoreUrl: 'https://apps.apple.com/app/expojane/id123456789',
          bundleId: 'com.expojane.app',
          teamId: 'ABCDEF1234',
          minVersion: '2.0.0',
        },
        android: {
          enabled: true,
          playStoreUrl: 'https://play.google.com/store/apps/details?id=com.expojane.app',
          packageName: 'com.expojane.app',
          sha256CertFingerprint:
            'AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99',
          minVersion: '2.0.0',
        },
        web: {
          enabled: true,
          url: 'https://expojane.app',
        },
      },
      title: 'View Appointment',
      description: 'Open your appointment details',
      campaign: {
        name: 'Q1 2024',
        source: 'email',
        medium: 'notification',
      },
      createdBy: testUserId,
      organization: testOrgId,
      status: 'active',
    });
  });

  // ==================== CREATE DEEP LINK ====================

  describe('POST /api/deep-links', () => {
    it('should create a new deep link with auto-generated short code', async () => {
      const linkData = {
        type: 'universal',
        destination: {
          screen: 'patients/profile',
          params: {
            patientId: '456',
          },
          fallbackUrl: 'https://expojane.app/patients/456',
        },
        platforms: {
          ios: {
            enabled: true,
            bundleId: 'com.expojane.app',
          },
          android: {
            enabled: true,
            packageName: 'com.expojane.app',
          },
        },
        title: 'Patient Profile',
        description: 'View patient profile',
      };

      const response = await request(app)
        .post('/api/deep-links')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send(linkData)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('shortCode');
      expect(response.body.shortCode).toHaveLength(8);
      expect(response.body.type).toBe('universal');
      expect(response.body.destination.screen).toBe('patients/profile');
      expect(response.body.status).toBe('active');
      expect(response.body).toHaveProperty('fullUrl');
      expect(response.body.fullUrl).toContain(response.body.shortCode);
    });

    it('should create a deep link with campaign tracking', async () => {
      const linkData = {
        type: 'universal',
        destination: {
          screen: 'appointments/book',
        },
        campaign: {
          name: 'Summer Campaign',
          source: 'instagram',
          medium: 'social',
          content: 'story-ad',
          term: 'dental-booking',
        },
        utmParams: {
          utm_source: 'instagram',
          utm_medium: 'social',
          utm_campaign: 'summer-2024',
          utm_content: 'story-ad',
          utm_term: 'dental-booking',
        },
      };

      const response = await request(app)
        .post('/api/deep-links')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send(linkData)
        .expect(201);

      expect(response.body.campaign.name).toBe('Summer Campaign');
      expect(response.body.campaign.source).toBe('instagram');
      expect(response.body.utmParams.utm_campaign).toBe('summer-2024');
    });

    it('should create a deferred deep link', async () => {
      const linkData = {
        type: 'deferred',
        destination: {
          screen: 'referral/welcome',
          params: {
            referralCode: 'ABC123',
          },
        },
        behavior: {
          preferApp: true,
          forceInstall: true,
          preserveAfterInstall: true,
        },
      };

      const response = await request(app)
        .post('/api/deep-links')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send(linkData)
        .expect(201);

      expect(response.body.type).toBe('deferred');
      expect(response.body.behavior.forceInstall).toBe(true);
      expect(response.body.behavior.preserveAfterInstall).toBe(true);
    });

    it('should create a deep link with expiration', async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const linkData = {
        destination: {
          screen: 'promo/special',
        },
        expiresAt,
        maxClicks: 1000,
        maxUniqueClicks: 500,
      };

      const response = await request(app)
        .post('/api/deep-links')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send(linkData)
        .expect(201);

      expect(new Date(response.body.expiresAt).getTime()).toBe(expiresAt.getTime());
      expect(response.body.maxClicks).toBe(1000);
      expect(response.body.maxUniqueClicks).toBe(500);
    });

    it('should create a deep link with social media tags', async () => {
      const linkData = {
        destination: {
          screen: 'blog/article',
          params: {
            articleId: '789',
          },
        },
        socialTags: {
          ogTitle: 'How to Improve Your Dental Health',
          ogDescription: 'Expert tips for maintaining healthy teeth and gums',
          ogImage: 'https://expojane.app/images/dental-health.jpg',
          ogType: 'article',
          twitterCard: 'summary_large_image',
          twitterTitle: 'Dental Health Tips',
          twitterDescription: 'Expert advice from our dental professionals',
          twitterImage: 'https://expojane.app/images/dental-health-twitter.jpg',
        },
      };

      const response = await request(app)
        .post('/api/deep-links')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send(linkData)
        .expect(201);

      expect(response.body.socialTags.ogTitle).toBe('How to Improve Your Dental Health');
      expect(response.body.socialTags.twitterCard).toBe('summary_large_image');
    });

    it('should reject link creation without destination', async () => {
      const linkData = {
        type: 'universal',
        title: 'Missing Destination',
      };

      await request(app)
        .post('/api/deep-links')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send(linkData)
        .expect(400);
    });
  });

  // ==================== GET DEEP LINK ====================

  describe('GET /api/deep-links/:id', () => {
    it('should get a deep link by ID', async () => {
      const response = await request(app)
        .get(`/api/deep-links/${testDeepLink._id}`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body._id).toBe(testDeepLink._id.toString());
      expect(response.body.shortCode).toBe('TEST1234');
      expect(response.body.destination.screen).toBe('appointments/view');
    });

    it('should return 404 for non-existent link', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await request(app)
        .get(`/api/deep-links/${fakeId}`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(404);
    });
  });

  describe('GET /api/deep-links/code/:shortCode', () => {
    it('should get a deep link by short code', async () => {
      const response = await request(app).get('/api/deep-links/code/TEST1234').expect(200);

      expect(response.body.shortCode).toBe('TEST1234');
      expect(response.body.destination.screen).toBe('appointments/view');
      expect(response.body.status).toBe('active');
    });

    it('should return 404 for non-existent short code', async () => {
      await request(app).get('/api/deep-links/code/INVALID').expect(404);
    });

    it('should not return inactive links', async () => {
      await DeepLink.findByIdAndUpdate(testDeepLink._id, {
        status: 'disabled',
      });

      await request(app).get('/api/deep-links/code/TEST1234').expect(404);
    });
  });

  // ==================== CLICK TRACKING ====================

  describe('POST /api/deep-links/code/:shortCode/click', () => {
    it('should track a click on a deep link', async () => {
      const clickData = {
        platform: 'ios',
        device: {
          model: 'iPhone 14 Pro',
          os: 'iOS',
          osVersion: '17.0',
          browser: 'Safari',
        },
        location: {
          country: 'United States',
          region: 'California',
          city: 'San Francisco',
        },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        referrer: 'https://google.com',
      };

      const response = await request(app)
        .post('/api/deep-links/code/TEST1234/click')
        .send(clickData)
        .expect(200);

      expect(response.body.analytics.totalClicks).toBe(1);
      expect(response.body.analytics.uniqueClicks).toBe(1);
      expect(response.body.analytics.clicksByPlatform.ios).toBe(1);
      expect(response.body.clicks).toHaveLength(1);
      expect(response.body.clicks[0].platform).toBe('ios');
      expect(response.body.clicks[0].isUnique).toBe(true);
    });

    it('should detect non-unique clicks from same IP', async () => {
      const clickData = {
        platform: 'android',
        ipAddress: '192.168.1.100',
      };

      // First click
      await request(app).post('/api/deep-links/code/TEST1234/click').send(clickData).expect(200);

      // Second click from same IP
      const response = await request(app)
        .post('/api/deep-links/code/TEST1234/click')
        .send(clickData)
        .expect(200);

      expect(response.body.analytics.totalClicks).toBe(2);
      expect(response.body.analytics.uniqueClicks).toBe(1); // Still 1 unique
      expect(response.body.clicks[1].isUnique).toBe(false);
    });

    it('should track clicks by platform', async () => {
      await request(app)
        .post('/api/deep-links/code/TEST1234/click')
        .send({ platform: 'ios', ipAddress: '192.168.1.1' })
        .expect(200);

      await request(app)
        .post('/api/deep-links/code/TEST1234/click')
        .send({ platform: 'android', ipAddress: '192.168.1.2' })
        .expect(200);

      const response = await request(app)
        .post('/api/deep-links/code/TEST1234/click')
        .send({ platform: 'web', ipAddress: '192.168.1.3' })
        .expect(200);

      expect(response.body.analytics.clicksByPlatform.ios).toBe(1);
      expect(response.body.analytics.clicksByPlatform.android).toBe(1);
      expect(response.body.analytics.clicksByPlatform.web).toBe(1);
    });

    it('should track clicks by country', async () => {
      await request(app)
        .post('/api/deep-links/code/TEST1234/click')
        .send({
          platform: 'ios',
          location: { country: 'United States' },
          ipAddress: '192.168.1.1',
        })
        .expect(200);

      const response = await request(app)
        .post('/api/deep-links/code/TEST1234/click')
        .send({
          platform: 'ios',
          location: { country: 'United States' },
          ipAddress: '192.168.1.2',
        })
        .expect(200);

      const usaEntry = response.body.analytics.clicksByCountry.find(
        (c) => c.country === 'United States'
      );
      expect(usaEntry.count).toBe(2);
    });

    it('should reject clicks on expired links', async () => {
      await DeepLink.findByIdAndUpdate(testDeepLink._id, {
        expiresAt: new Date(Date.now() - 1000), // Expired
      });

      await request(app)
        .post('/api/deep-links/code/TEST1234/click')
        .send({ platform: 'ios', ipAddress: '192.168.1.1' })
        .expect(400);
    });

    it('should reject clicks when max clicks reached', async () => {
      await DeepLink.findByIdAndUpdate(testDeepLink._id, {
        maxClicks: 1,
      });

      // First click
      await request(app)
        .post('/api/deep-links/code/TEST1234/click')
        .send({ platform: 'ios', ipAddress: '192.168.1.1' })
        .expect(200);

      // Second click should fail
      await request(app)
        .post('/api/deep-links/code/TEST1234/click')
        .send({ platform: 'ios', ipAddress: '192.168.1.2' })
        .expect(400);
    });

    it('should update lastClicked timestamp', async () => {
      const beforeClick = new Date();

      const response = await request(app)
        .post('/api/deep-links/code/TEST1234/click')
        .send({ platform: 'ios', ipAddress: '192.168.1.1' })
        .expect(200);

      const lastClicked = new Date(response.body.analytics.lastClicked);
      expect(lastClicked.getTime()).toBeGreaterThanOrEqual(beforeClick.getTime());
    });
  });

  // ==================== INSTALL & CONVERSION TRACKING ====================

  describe('POST /api/deep-links/:id/install', () => {
    it('should track an app install', async () => {
      const response = await request(app)
        .post(`/api/deep-links/${testDeepLink._id}/install`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.analytics.installs).toBe(1);
    });

    it('should increment install count on multiple installs', async () => {
      await request(app)
        .post(`/api/deep-links/${testDeepLink._id}/install`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      const response = await request(app)
        .post(`/api/deep-links/${testDeepLink._id}/install`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.analytics.installs).toBe(2);
    });
  });

  describe('POST /api/deep-links/:id/conversion', () => {
    it('should track a conversion', async () => {
      const response = await request(app)
        .post(`/api/deep-links/${testDeepLink._id}/conversion`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.analytics.conversions).toBe(1);
    });
  });

  // ==================== LIST & FILTER ====================

  describe('GET /api/deep-links', () => {
    beforeEach(async () => {
      await DeepLink.create([
        {
          shortCode: 'LINK001',
          type: 'universal',
          destination: { screen: 'screen1' },
          status: 'active',
          createdBy: testUserId,
          organization: testOrgId,
        },
        {
          shortCode: 'LINK002',
          type: 'deep',
          destination: { screen: 'screen2' },
          status: 'paused',
          createdBy: testUserId,
          organization: testOrgId,
        },
      ]);
    });

    it('should list all deep links for organization', async () => {
      const response = await request(app)
        .get('/api/deep-links')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body).toHaveLength(3); // Including testDeepLink
    });

    it('should filter links by status', async () => {
      const response = await request(app)
        .get('/api/deep-links?status=active')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body.every((link) => link.status === 'active')).toBe(true);
    });

    it('should filter links by type', async () => {
      const response = await request(app)
        .get('/api/deep-links?type=universal')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.every((link) => link.type === 'universal')).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/deep-links?limit=2&skip=1')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body).toHaveLength(2);
    });
  });

  describe('GET /api/deep-links/active', () => {
    it('should return only active links', async () => {
      await DeepLink.create({
        shortCode: 'EXPIRED',
        destination: { screen: 'screen1' },
        status: 'active',
        expiresAt: new Date(Date.now() - 1000),
        createdBy: testUserId,
        organization: testOrgId,
      });

      const response = await request(app)
        .get('/api/deep-links/active')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.every((link) => link.status === 'active')).toBe(true);
      expect(response.body.some((link) => link.shortCode === 'EXPIRED')).toBe(false);
    });
  });

  // ==================== UPDATE & DELETE ====================

  describe('PUT /api/deep-links/:id', () => {
    it('should update a deep link', async () => {
      const updates = {
        title: 'Updated Title',
        description: 'Updated description',
        maxClicks: 5000,
      };

      const response = await request(app)
        .put(`/api/deep-links/${testDeepLink._id}`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send(updates)
        .expect(200);

      expect(response.body.title).toBe('Updated Title');
      expect(response.body.description).toBe('Updated description');
      expect(response.body.maxClicks).toBe(5000);
    });

    it('should not allow updating shortCode', async () => {
      await request(app)
        .put(`/api/deep-links/${testDeepLink._id}`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send({ shortCode: 'NEWCODE' })
        .expect(400);
    });
  });

  describe('PUT /api/deep-links/:id/pause', () => {
    it('should pause a deep link', async () => {
      const response = await request(app)
        .put(`/api/deep-links/${testDeepLink._id}/pause`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.status).toBe('paused');
    });
  });

  describe('PUT /api/deep-links/:id/resume', () => {
    it('should resume a paused link', async () => {
      await testDeepLink.pause();

      const response = await request(app)
        .put(`/api/deep-links/${testDeepLink._id}/resume`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.status).toBe('active');
    });
  });

  describe('DELETE /api/deep-links/:id', () => {
    it('should disable a deep link (soft delete)', async () => {
      const response = await request(app)
        .delete(`/api/deep-links/${testDeepLink._id}`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.status).toBe('disabled');
    });
  });

  // ==================== CAMPAIGN MANAGEMENT ====================

  describe('GET /api/deep-links/campaign/:campaignName', () => {
    beforeEach(async () => {
      await DeepLink.create([
        {
          shortCode: 'CAMP001',
          destination: { screen: 'promo' },
          campaign: { name: 'Summer Sale' },
          createdBy: testUserId,
          organization: testOrgId,
        },
        {
          shortCode: 'CAMP002',
          destination: { screen: 'promo2' },
          campaign: { name: 'Summer Sale' },
          createdBy: testUserId,
          organization: testOrgId,
        },
      ]);
    });

    it('should get all links for a campaign', async () => {
      const response = await request(app)
        .get('/api/deep-links/campaign/Summer%20Sale')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body.every((link) => link.campaign.name === 'Summer Sale')).toBe(true);
    });
  });

  describe('GET /api/deep-links/campaign/:campaignName/analytics', () => {
    it('should get campaign analytics', async () => {
      await DeepLink.create([
        {
          shortCode: 'CAMP1',
          destination: { screen: 'promo' },
          campaign: { name: 'Q1 2024' },
          analytics: {
            totalClicks: 100,
            uniqueClicks: 80,
            installs: 10,
            conversions: 5,
          },
          createdBy: testUserId,
          organization: testOrgId,
        },
        {
          shortCode: 'CAMP2',
          destination: { screen: 'promo2' },
          campaign: { name: 'Q1 2024' },
          analytics: {
            totalClicks: 200,
            uniqueClicks: 150,
            installs: 20,
            conversions: 15,
          },
          createdBy: testUserId,
          organization: testOrgId,
        },
      ]);

      const response = await request(app)
        .get('/api/deep-links/campaign/Q1%202024/analytics')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.totalLinks).toBe(2);
      expect(response.body.totalClicks).toBe(300);
      expect(response.body.totalUniqueClicks).toBe(230);
      expect(response.body.totalInstalls).toBe(30);
      expect(response.body.totalConversions).toBe(20);
      expect(response.body.conversionRate).toBeCloseTo(8.7, 1); // 20/230 * 100
    });
  });

  // ==================== ANALYTICS ====================

  describe('GET /api/deep-links/:id/analytics', () => {
    it('should get analytics summary for a link', async () => {
      // Add some clicks
      await testDeepLink.trackClick({
        platform: 'ios',
        ipAddress: '192.168.1.1',
      });
      await testDeepLink.trackClick({
        platform: 'android',
        ipAddress: '192.168.1.2',
      });

      const response = await request(app)
        .get(`/api/deep-links/${testDeepLink._id}/analytics`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.totalClicks).toBe(2);
      expect(response.body.uniqueClicks).toBe(2);
      expect(response.body.clicksByPlatform.ios).toBe(1);
      expect(response.body.clicksByPlatform.android).toBe(1);
    });
  });

  describe('GET /api/deep-links/analytics/summary', () => {
    beforeEach(async () => {
      await DeepLink.create([
        {
          shortCode: 'LINK1',
          destination: { screen: 's1' },
          analytics: {
            totalClicks: 500,
            uniqueClicks: 400,
            installs: 50,
            conversions: 25,
          },
          createdBy: testUserId,
          organization: testOrgId,
        },
        {
          shortCode: 'LINK2',
          destination: { screen: 's2' },
          analytics: {
            totalClicks: 300,
            uniqueClicks: 250,
            installs: 30,
            conversions: 20,
          },
          createdBy: testUserId,
          organization: testOrgId,
        },
      ]);
    });

    it('should get overall analytics summary', async () => {
      const response = await request(app)
        .get('/api/deep-links/analytics/summary')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.totalLinks).toBe(3); // Including testDeepLink
      expect(response.body.totalClicks).toBe(800);
      expect(response.body.totalUniqueClicks).toBe(650);
      expect(response.body.totalInstalls).toBe(80);
      expect(response.body.totalConversions).toBe(45);
    });
  });

  describe('GET /api/deep-links/analytics/top-performers', () => {
    beforeEach(async () => {
      await DeepLink.create([
        {
          shortCode: 'TOP1',
          destination: { screen: 's1' },
          analytics: { totalClicks: 1000 },
          status: 'active',
          createdBy: testUserId,
          organization: testOrgId,
        },
        {
          shortCode: 'TOP2',
          destination: { screen: 's2' },
          analytics: { totalClicks: 2000 },
          status: 'active',
          createdBy: testUserId,
          organization: testOrgId,
        },
        {
          shortCode: 'TOP3',
          destination: { screen: 's3' },
          analytics: { totalClicks: 500 },
          status: 'active',
          createdBy: testUserId,
          organization: testOrgId,
        },
      ]);
    });

    it('should get top performing links', async () => {
      const response = await request(app)
        .get('/api/deep-links/analytics/top-performers?limit=2')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].shortCode).toBe('TOP2');
      expect(response.body[0].analytics.totalClicks).toBe(2000);
      expect(response.body[1].shortCode).toBe('TOP1');
    });

    it('should support different metrics', async () => {
      await DeepLink.findOneAndUpdate({ shortCode: 'TOP1' }, { 'analytics.conversions': 500 });

      const response = await request(app)
        .get('/api/deep-links/analytics/top-performers?metric=conversions&limit=1')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body[0].shortCode).toBe('TOP1');
    });
  });

  // ==================== PLATFORM-SPECIFIC URL GENERATION ====================

  describe('GET /api/deep-links/generate/apple-app-site-association', () => {
    it('should generate AASA file for iOS Universal Links', async () => {
      const response = await request(app)
        .get('/api/deep-links/generate/apple-app-site-association')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body).toHaveProperty('applinks');
      expect(response.body.applinks).toHaveProperty('apps');
      expect(response.body.applinks).toHaveProperty('details');
      expect(Array.isArray(response.body.applinks.apps)).toBe(true);
      expect(response.body.applinks.details).toBeInstanceOf(Array);
    });

    it('should include all active iOS-enabled deep links in AASA', async () => {
      await DeepLink.create({
        shortCode: 'IOS001',
        destination: { screen: 'test' },
        platforms: {
          ios: {
            enabled: true,
            bundleId: 'com.expojane.app',
            teamId: 'TEAMID123',
          },
        },
        status: 'active',
        createdBy: testUserId,
        organization: testOrgId,
      });

      const response = await request(app)
        .get('/api/deep-links/generate/apple-app-site-association')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      const { details } = response.body.applinks;
      expect(details.length).toBeGreaterThan(0);
      expect(details[0]).toHaveProperty('appID');
      expect(details[0]).toHaveProperty('paths');
    });
  });

  describe('GET /api/deep-links/generate/assetlinks', () => {
    it('should generate assetlinks.json for Android App Links', async () => {
      const response = await request(app)
        .get('/api/deep-links/generate/assetlinks')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('relation');
        expect(response.body[0]).toHaveProperty('target');
        expect(response.body[0].target).toHaveProperty('namespace');
        expect(response.body[0].target).toHaveProperty('package_name');
        expect(response.body[0].target).toHaveProperty('sha256_cert_fingerprints');
      }
    });

    it('should include all active Android-enabled deep links', async () => {
      await DeepLink.create({
        shortCode: 'AND001',
        destination: { screen: 'test' },
        platforms: {
          android: {
            enabled: true,
            packageName: 'com.expojane.app',
            sha256CertFingerprint:
              'AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99',
          },
        },
        status: 'active',
        createdBy: testUserId,
        organization: testOrgId,
      });

      const response = await request(app)
        .get('/api/deep-links/generate/assetlinks')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  // ==================== URL METHODS ====================

  describe('GET /api/deep-links/:id/urls', () => {
    it('should get all URL formats for a link', async () => {
      const response = await request(app)
        .get(`/api/deep-links/${testDeepLink._id}/urls`)
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body).toHaveProperty('shortUrl');
      expect(response.body).toHaveProperty('deepLinkUrl');
      expect(response.body).toHaveProperty('universalLink');
      expect(response.body).toHaveProperty('appLink');

      expect(response.body.shortUrl).toContain('TEST1234');
      expect(response.body.deepLinkUrl).toMatch(/^expojane:\/\//);
      expect(response.body.universalLink).toMatch(/^https:\/\//);
    });
  });

  // ==================== ADMIN OPERATIONS ====================

  describe('POST /api/deep-links/admin/cleanup-expired', () => {
    it('should mark expired links as expired', async () => {
      await DeepLink.create([
        {
          shortCode: 'EXP001',
          destination: { screen: 's1' },
          status: 'active',
          expiresAt: new Date(Date.now() - 1000),
          createdBy: testUserId,
          organization: testOrgId,
        },
        {
          shortCode: 'EXP002',
          destination: { screen: 's2' },
          status: 'active',
          expiresAt: new Date(Date.now() + 1000000),
          createdBy: testUserId,
          organization: testOrgId,
        },
      ]);

      const response = await request(app)
        .post('/api/deep-links/admin/cleanup-expired')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(200);

      expect(response.body.modified).toBe(1);

      const expiredLink = await DeepLink.findOne({ shortCode: 'EXP001' });
      expect(expiredLink.status).toBe('expired');
    });
  });

  describe('POST /api/deep-links/admin/cleanup-clicks', () => {
    it('should remove old click history', async () => {
      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // 100 days ago

      await DeepLink.findByIdAndUpdate(testDeepLink._id, {
        $push: {
          clicks: {
            timestamp: oldDate,
            platform: 'ios',
            ipAddress: '192.168.1.1',
          },
        },
      });

      const response = await request(app)
        .post('/api/deep-links/admin/cleanup-clicks')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send({ daysToKeep: 90 })
        .expect(200);

      expect(response.body.modified).toBeGreaterThan(0);

      const updatedLink = await DeepLink.findById(testDeepLink._id);
      const oldClicks = updatedLink.clicks.filter(
        (click) => click.timestamp.getTime() === oldDate.getTime()
      );
      expect(oldClicks).toHaveLength(0);
    });
  });

  // ==================== ERROR HANDLING ====================

  describe('Error Handling', () => {
    it('should handle invalid ObjectId format', async () => {
      await request(app)
        .get('/api/deep-links/invalid-id')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .expect(500);
    });

    it('should require authentication headers', async () => {
      await request(app)
        .post('/api/deep-links')
        .send({
          destination: { screen: 'test' },
        })
        .expect(401);
    });

    it('should validate required fields on creation', async () => {
      await request(app)
        .post('/api/deep-links')
        .set('x-user-id', testUserId.toString())
        .set('x-organization-id', testOrgId.toString())
        .send({
          title: 'Missing Destination',
        })
        .expect(400);
    });
  });

  // ==================== VIRTUAL FIELDS ====================

  describe('Virtual Fields', () => {
    it('should calculate isExpired correctly', async () => {
      const link = await DeepLink.create({
        shortCode: 'VIRTUAL1',
        destination: { screen: 'test' },
        expiresAt: new Date(Date.now() - 1000),
        createdBy: testUserId,
        organization: testOrgId,
      });

      expect(link.isExpired).toBe(true);
    });

    it('should calculate isActive correctly', async () => {
      expect(testDeepLink.isActive).toBe(true);

      testDeepLink.status = 'paused';
      expect(testDeepLink.isActive).toBe(false);
    });

    it('should calculate clickRate correctly', async () => {
      await testDeepLink.trackClick({ platform: 'ios', ipAddress: '192.168.1.1' });
      await testDeepLink.trackClick({ platform: 'ios', ipAddress: '192.168.1.1' }); // Duplicate

      expect(testDeepLink.clickRate).toBe(50); // 1 unique / 2 total * 100
    });

    it('should calculate conversionRate correctly', async () => {
      await testDeepLink.trackClick({ platform: 'ios', ipAddress: '192.168.1.1' });
      await testDeepLink.trackClick({ platform: 'ios', ipAddress: '192.168.1.2' });
      await testDeepLink.trackConversion();

      expect(testDeepLink.conversionRate).toBe(50); // 1 conversion / 2 unique clicks * 100
    });
  });
});
