const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../server');
const Referral = require('../models/Referral');
/* eslint-env jest */
/**
 * Referrals API Tests
 * TASK-14.16 - Share app with friends
 *
 * Comprehensive test suite for referral endpoints
 */

// eslint-disable-next-line no-unused-vars
describe('Referrals API', () => {
  let referralCode;
  let referralId;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(
      process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/expojane-test'
    );
  });

  afterAll(async () => {
    // Clean up and close connection
    await Referral.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up before each test
    await Referral.deleteMany({});
  });

  // ============================================
  // REFERRAL CODE MANAGEMENT TESTS
  // ============================================

  describe('GET /api/referrals/my-code', () => {
    it('should generate referral code for new user', async () => {
      const response = await request(app).get('/api/referrals/my-code').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('referralCode');
      expect(response.body.data).toHaveProperty('referralLink');
      expect(response.body.data).toHaveProperty('referrerReward');
      expect(response.body.data).toHaveProperty('referredUserReward');
      expect(response.body.data.referralCode).toHaveLength(8);

      referralCode = response.body.data.referralCode;
    });

    it('should return existing referral code', async () => {
      // First request creates code
      const firstResponse = await request(app).get('/api/referrals/my-code').expect(200);

      const firstCode = firstResponse.body.data.referralCode;

      // Second request should return same code
      const secondResponse = await request(app).get('/api/referrals/my-code').expect(200);

      expect(secondResponse.body.data.referralCode).toBe(firstCode);
    });
  });

  describe('POST /api/referrals/custom-code', () => {
    it('should create custom referral code', async () => {
      const customCode = 'JOHN2025';

      const response = await request(app)
        .post('/api/referrals/custom-code')
        .send({ customCode })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.customCode).toBe(customCode);
    });

    it('should fail with duplicate custom code', async () => {
      const customCode = 'DUPLICATE';

      // Create first custom code
      await request(app).post('/api/referrals/custom-code').send({ customCode }).expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/referrals/custom-code')
        .send({ customCode })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already taken');
    });

    it('should fail with short custom code', async () => {
      const response = await request(app)
        .post('/api/referrals/custom-code')
        .send({ customCode: 'ABC' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('at least 4 characters');
    });
  });

  describe('GET /api/referrals/validate/:code', () => {
    beforeEach(async () => {
      // Create a referral code
      const referral = await Referral.createForUser(new mongoose.Types.ObjectId(), 'patient', {
        referrerReward: {
          type: 'credits',
          amount: 10,
          description: '$10 credit',
        },
        referredUserReward: {
          type: 'discount',
          amount: 20,
          description: '20% off',
        },
      });
      referralCode = referral.referralCode;
      referralId = referral._id;
    });

    it('should validate existing referral code', async () => {
      const response = await request(app)
        .get(`/api/referrals/validate/${referralCode}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.code).toBe(referralCode);
      expect(response.body.data).toHaveProperty('referrerName');
      expect(response.body.data).toHaveProperty('reward');
    });

    it('should fail with invalid code', async () => {
      const response = await request(app).get('/api/referrals/validate/INVALID').expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================
  // INVITE MANAGEMENT TESTS
  // ============================================

  describe('POST /api/referrals/send-invite', () => {
    it('should record sending an invite', async () => {
      const response = await request(app)
        .post('/api/referrals/send-invite')
        .send({
          email: 'friend@example.com',
          source: 'email',
          campaign: 'spring2025',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.referredUserEmail).toBe('friend@example.com');
      expect(response.body.data.source).toBe('email');
      expect(response.body.data.inviteSentAt).toBeDefined();
    });

    it('should create referral code if user does not have one', async () => {
      const response = await request(app)
        .post('/api/referrals/send-invite')
        .send({
          email: 'newuser@example.com',
          source: 'sms',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.referralCode).toBeDefined();
    });
  });

  describe('POST /api/referrals/track-click', () => {
    beforeEach(async () => {
      const referral = await Referral.createForUser(new mongoose.Types.ObjectId(), 'patient', {});
      referralCode = referral.referralCode;
      referralId = referral._id;
    });

    it('should track referral link click', async () => {
      const metadata = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        device: 'mobile',
      };

      const response = await request(app)
        .post('/api/referrals/track-click')
        .send({ code: referralCode, metadata })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify click was recorded
      const referral = await Referral.findById(referralId);
      expect(referral.clickedAt).toBeDefined();
      expect(referral.clickMetadata.ipAddress).toBe(metadata.ipAddress);
    });
  });

  describe('POST /api/referrals/complete-signup', () => {
    beforeEach(async () => {
      const referral = await Referral.createForUser(new mongoose.Types.ObjectId(), 'patient', {
        referredUserReward: {
          type: 'discount',
          amount: 20,
          description: '20% off',
        },
      });
      referralCode = referral.referralCode;
      referralId = referral._id;
    });

    it('should mark referral as signed up', async () => {
      const response = await request(app)
        .post('/api/referrals/complete-signup')
        .send({ referralCode })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('signed_up');
      expect(response.body.data.signedUpAt).toBeDefined();
      expect(response.body.reward).toBeDefined();

      // Verify in database
      const referral = await Referral.findById(referralId);
      expect(referral.status).toBe('signed_up');
    });

    it('should handle missing referral code', async () => {
      const response = await request(app)
        .post('/api/referrals/complete-signup')
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('No referral code');
    });
  });

  // ============================================
  // REFERRAL STATS TESTS
  // ============================================

  describe('GET /api/referrals/my-referrals', () => {
    beforeEach(async () => {
      const userId = new mongoose.Types.ObjectId();

      // Create multiple referrals
      await Referral.create([
        {
          referrerId: userId,
          referrerType: 'patient',
          referralCode: 'CODE001',
          status: 'pending',
        },
        {
          referrerId: userId,
          referrerType: 'patient',
          referralCode: 'CODE002',
          status: 'signed_up',
          signedUpAt: new Date(),
        },
        {
          referrerId: userId,
          referrerType: 'patient',
          referralCode: 'CODE003',
          status: 'completed_action',
          completedActionAt: new Date(),
        },
      ]);
    });

    it('should get all user referrals', async () => {
      const response = await request(app).get('/api/referrals/my-referrals').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.count).toBe(3);
    });

    it('should filter referrals by status', async () => {
      const response = await request(app)
        .get('/api/referrals/my-referrals?status=signed_up')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('signed_up');
    });
  });

  describe('GET /api/referrals/my-stats', () => {
    beforeEach(async () => {
      const userId = new mongoose.Types.ObjectId();

      await Referral.create([
        {
          referrerId: userId,
          referrerType: 'patient',
          referralCode: 'CODE001',
          status: 'pending',
        },
        {
          referrerId: userId,
          referrerType: 'patient',
          referralCode: 'CODE002',
          status: 'signed_up',
          signedUpAt: new Date(),
          inviteSentAt: new Date(Date.now() - 3600000), // 1 hour ago
          referrerReward: { amount: 10 },
        },
        {
          referrerId: userId,
          referrerType: 'patient',
          referralCode: 'CODE003',
          status: 'completed_action',
          completedActionAt: new Date(),
          referrerReward: { amount: 10, claimed: true },
        },
      ]);
    });

    it('should get user referral statistics', async () => {
      const response = await request(app).get('/api/referrals/my-stats').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(3);
      expect(response.body.data.pending).toBe(1);
      expect(response.body.data.signedUp).toBe(1);
      expect(response.body.data.completed).toBe(1);
      expect(response.body.data.conversionRate).toBeGreaterThan(0);
      expect(response.body.data.totalRewardsEarned).toBe(20);
      expect(response.body.data.totalRewardsClaimed).toBe(10);
    });
  });

  // ============================================
  // REWARD MANAGEMENT TESTS
  // ============================================

  describe('GET /api/referrals/my-rewards', () => {
    beforeEach(async () => {
      const userId = new mongoose.Types.ObjectId();

      await Referral.create([
        {
          referrerId: userId,
          referrerType: 'patient',
          referralCode: 'CODE001',
          status: 'completed_action',
          referrerReward: {
            type: 'credits',
            amount: 10,
            claimed: false,
          },
        },
        {
          referrerId: userId,
          referrerType: 'patient',
          referralCode: 'CODE002',
          status: 'rewarded',
          referrerReward: {
            type: 'credits',
            amount: 10,
            claimed: false,
          },
        },
        {
          referrerId: userId,
          referrerType: 'patient',
          referralCode: 'CODE003',
          status: 'rewarded',
          referrerReward: {
            type: 'credits',
            amount: 10,
            claimed: true,
          },
        },
      ]);
    });

    it('should get unclaimed rewards', async () => {
      const response = await request(app).get('/api/referrals/my-rewards').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.unclaimed).toHaveLength(2);
      expect(response.body.data.totalUnclaimed).toBe(20);
      expect(response.body.data.count).toBe(2);
    });
  });

  describe('POST /api/referrals/:id/claim-reward', () => {
    let referralId;

    beforeEach(async () => {
      const userId = new mongoose.Types.ObjectId();

      const referral = await Referral.create({
        referrerId: userId,
        referrerType: 'patient',
        referralCode: 'CODE001',
        status: 'completed_action',
        referrerReward: {
          type: 'credits',
          amount: 10,
          claimed: false,
        },
      });

      referralId = referral._id.toString();
    });

    it('should claim referral reward', async () => {
      const response = await request(app)
        .post(`/api/referrals/${referralId}/claim-reward`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.referrerReward.claimed).toBe(true);
      expect(response.body.data.referrerReward.claimedAt).toBeDefined();
    });

    it('should fail to claim already claimed reward', async () => {
      // Claim once
      await request(app).post(`/api/referrals/${referralId}/claim-reward`).expect(200);

      // Try to claim again
      const response = await request(app)
        .post(`/api/referrals/${referralId}/claim-reward`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already claimed');
    });
  });

  // ============================================
  // ANALYTICS TESTS
  // ============================================

  describe('GET /api/referrals/leaderboard', () => {
    beforeEach(async () => {
      const user1 = new mongoose.Types.ObjectId();
      const user2 = new mongoose.Types.ObjectId();

      // User 1 has 3 successful referrals
      await Referral.create([
        {
          referrerId: user1,
          referrerType: 'patient',
          referralCode: 'USER1_1',
          status: 'signed_up',
        },
        {
          referrerId: user1,
          referrerType: 'patient',
          referralCode: 'USER1_2',
          status: 'completed_action',
        },
        {
          referrerId: user1,
          referrerType: 'patient',
          referralCode: 'USER1_3',
          status: 'rewarded',
        },
      ]);

      // User 2 has 2 successful referrals
      await Referral.create([
        {
          referrerId: user2,
          referrerType: 'patient',
          referralCode: 'USER2_1',
          status: 'signed_up',
        },
        {
          referrerId: user2,
          referrerType: 'patient',
          referralCode: 'USER2_2',
          status: 'completed_action',
        },
      ]);
    });

    it('should get top referrers leaderboard', async () => {
      const response = await request(app).get('/api/referrals/leaderboard?limit=10').expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('referralCount');
    });
  });

  describe('GET /api/referrals/share-message', () => {
    it('should get pre-formatted share messages', async () => {
      const response = await request(app).get('/api/referrals/share-message').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('referralCode');
      expect(response.body.data).toHaveProperty('referralLink');
      expect(response.body.data).toHaveProperty('messages');
      expect(response.body.data.messages).toHaveProperty('default');
      expect(response.body.data.messages).toHaveProperty('email');
      expect(response.body.data.messages).toHaveProperty('sms');
      expect(response.body.data.messages).toHaveProperty('social');
    });
  });

  // ============================================
  // MODEL METHODS TESTS
  // ============================================

  describe('Referral Model Methods', () => {
    it('should generate unique referral code', async () => {
      const code1 = await Referral.generateReferralCode();
      const code2 = await Referral.generateReferralCode();

      expect(code1).toHaveLength(8);
      expect(code2).toHaveLength(8);
      expect(code1).not.toBe(code2);
    });

    it('should create referral for user', async () => {
      const userId = new mongoose.Types.ObjectId();

      const referral = await Referral.createForUser(userId, 'patient', {
        referrerReward: {
          type: 'credits',
          amount: 10,
        },
      });

      expect(referral.referrerId).toEqual(userId);
      expect(referral.referrerType).toBe('patient');
      expect(referral.referralCode).toBeDefined();
      expect(referral.referrerReward.amount).toBe(10);
    });

    it('should get analytics correctly', async () => {
      await Referral.create([
        {
          referrerId: new mongoose.Types.ObjectId(),
          referrerType: 'patient',
          referralCode: 'CODE1',
          status: 'pending',
          clickedAt: new Date(),
        },
        {
          referrerId: new mongoose.Types.ObjectId(),
          referrerType: 'patient',
          referralCode: 'CODE2',
          status: 'signed_up',
          clickedAt: new Date(),
          signedUpAt: new Date(),
        },
        {
          referrerId: new mongoose.Types.ObjectId(),
          referrerType: 'patient',
          referralCode: 'CODE3',
          status: 'completed_action',
          clickedAt: new Date(),
          signedUpAt: new Date(),
          completedActionAt: new Date(),
        },
      ]);

      const analytics = await Referral.getAnalytics();

      expect(analytics.totalReferrals).toBe(3);
      expect(analytics.totalClicks).toBe(3);
      expect(analytics.totalSignups).toBe(2);
      expect(analytics.totalCompleted).toBe(1);
      expect(analytics.clickThroughRate).toBe(100);
      expect(analytics.signupConversionRate).toBeGreaterThan(0);
    });
  });
});
