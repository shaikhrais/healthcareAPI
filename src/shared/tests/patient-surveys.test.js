const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../server');
const PatientSurvey = require('../models/PatientSurvey');
const SurveyResponse = require('../models/SurveyResponse');
const NPSScore = require('../models/NPSScore');
/* eslint-env jest */
/**
 * Patient Surveys API Tests
 * TASK-14.14 - Patient surveys Module
 *
 * Comprehensive test suite for patient survey endpoints
 */

// eslint-disable-next-line no-unused-vars
describe('Patient Surveys API', () => {
  let surveyId;
  let responseId;
  let npsScoreId;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(
      process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/expojane-test'
    );
  });

  afterAll(async () => {
    // Clean up and close connection
    await PatientSurvey.deleteMany({});
    await SurveyResponse.deleteMany({});
    await NPSScore.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up before each test
    await PatientSurvey.deleteMany({});
    await SurveyResponse.deleteMany({});
    await NPSScore.deleteMany({});
  });

  // ============================================
  // SURVEY MANAGEMENT TESTS
  // ============================================

  describe('POST /api/patient-surveys', () => {
    it('should create a new survey', async () => {
      const surveyData = {
        title: 'Test Survey',
        description: 'Test survey description',
        surveyType: 'post_appointment',
        questions: [
          {
            questionId: 'q1',
            questionText: 'How satisfied were you?',
            questionType: 'rating',
            required: true,
            order: 1,
            ratingScale: {
              min: 1,
              max: 5,
              minLabel: 'Very Dissatisfied',
              maxLabel: 'Very Satisfied',
            },
            category: 'overall',
          },
        ],
        status: 'draft',
      };

      const response = await request(app).post('/api/patient-surveys').send(surveyData).expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.title).toBe(surveyData.title);
      expect(response.body.data.questions).toHaveLength(1);

      surveyId = response.body.data._id;
    });

    it('should fail with invalid survey type', async () => {
      const surveyData = {
        title: 'Test Survey',
        surveyType: 'invalid_type',
        questions: [],
      };

      const response = await request(app).post('/api/patient-surveys').send(surveyData).expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/patient-surveys/default', () => {
    it('should create default survey', async () => {
      const response = await request(app).post('/api/patient-surveys/default').expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Post-Appointment Satisfaction Survey');
      expect(response.body.data.questions.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/patient-surveys', () => {
    beforeEach(async () => {
      // Create test surveys
      await PatientSurvey.create([
        {
          title: 'Active Survey',
          surveyType: 'post_appointment',
          status: 'active',
          questions: [],
          createdBy: new mongoose.Types.ObjectId(),
        },
        {
          title: 'Draft Survey',
          surveyType: 'general_satisfaction',
          status: 'draft',
          questions: [],
          createdBy: new mongoose.Types.ObjectId(),
        },
      ]);
    });

    it('should get all surveys', async () => {
      const response = await request(app).get('/api/patient-surveys').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter surveys by status', async () => {
      const response = await request(app).get('/api/patient-surveys?status=active').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('active');
    });
  });

  describe('GET /api/patient-surveys/stats', () => {
    beforeEach(async () => {
      await PatientSurvey.create([
        {
          title: 'Survey 1',
          surveyType: 'post_appointment',
          status: 'active',
          questions: [],
          createdBy: new mongoose.Types.ObjectId(),
          analytics: {
            totalSent: 100,
            totalResponses: 75,
            responseRate: 75,
          },
        },
        {
          title: 'Survey 2',
          surveyType: 'general_satisfaction',
          status: 'active',
          questions: [],
          createdBy: new mongoose.Types.ObjectId(),
          analytics: {
            totalSent: 50,
            totalResponses: 40,
            responseRate: 80,
          },
        },
      ]);
    });

    it('should get survey statistics', async () => {
      const response = await request(app).get('/api/patient-surveys/stats').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('active');
      expect(response.body.data).toHaveProperty('totalSent');
      expect(response.body.data).toHaveProperty('totalResponses');
      expect(response.body.data).toHaveProperty('avgResponseRate');
    });
  });

  describe('POST /api/patient-surveys/:id/publish', () => {
    beforeEach(async () => {
      const survey = await PatientSurvey.create({
        title: 'Draft Survey',
        surveyType: 'post_appointment',
        status: 'draft',
        questions: [],
        createdBy: new mongoose.Types.ObjectId(),
      });
      surveyId = survey._id.toString();
    });

    it('should publish a survey', async () => {
      const response = await request(app)
        .post(`/api/patient-surveys/${surveyId}/publish`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('active');
      expect(response.body.data.publishedAt).toBeDefined();
    });
  });

  // ============================================
  // SURVEY RESPONSE TESTS
  // ============================================

  describe('POST /api/patient-surveys/responses', () => {
    beforeEach(async () => {
      const survey = await PatientSurvey.create({
        title: 'Test Survey',
        surveyType: 'post_appointment',
        status: 'active',
        questions: [
          {
            questionId: 'q1',
            questionText: 'How satisfied were you?',
            questionType: 'rating',
            required: true,
            order: 1,
            ratingScale: { min: 1, max: 5 },
            category: 'overall',
          },
          {
            questionId: 'q2',
            questionText: 'Would you recommend us?',
            questionType: 'nps',
            required: true,
            order: 2,
            ratingScale: { min: 0, max: 10 },
            category: 'overall',
          },
        ],
        createdBy: new mongoose.Types.ObjectId(),
      });
      surveyId = survey._id.toString();
    });

    it('should submit a survey response', async () => {
      const responseData = {
        surveyId,
        surveyVersion: '1.0',
        answers: [
          {
            questionId: 'q1',
            questionText: 'How satisfied were you?',
            questionType: 'rating',
            value: 5,
          },
          {
            questionId: 'q2',
            questionText: 'Would you recommend us?',
            questionType: 'nps',
            value: 9,
          },
        ],
        sentVia: 'email',
        startedAt: new Date(Date.now() - 60000), // 1 minute ago
      };

      const response = await request(app)
        .post('/api/patient-surveys/responses')
        .send(responseData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.scores).toBeDefined();
      expect(response.body.data.scores.nps).toBe(9);
      expect(response.body.message).toBe('Thank you for your feedback!');
    });

    it('should calculate completion time', async () => {
      const startTime = new Date(Date.now() - 120000); // 2 minutes ago

      const responseData = {
        surveyId,
        surveyVersion: '1.0',
        answers: [
          {
            questionId: 'q1',
            value: 4,
          },
        ],
        startedAt: startTime,
      };

      const response = await request(app)
        .post('/api/patient-surveys/responses')
        .send(responseData)
        .expect(201);

      expect(response.body.data.completionTime).toBeGreaterThan(0);
    });
  });

  describe('GET /api/patient-surveys/:id/responses', () => {
    beforeEach(async () => {
      const survey = await PatientSurvey.create({
        title: 'Test Survey',
        surveyType: 'post_appointment',
        status: 'active',
        questions: [],
        createdBy: new mongoose.Types.ObjectId(),
      });
      surveyId = survey._id.toString();

      // Create test responses
      await SurveyResponse.create([
        {
          surveyId: survey._id,
          surveyVersion: '1.0',
          status: 'completed',
          answers: [],
          completedAt: new Date(),
        },
        {
          surveyId: survey._id,
          surveyVersion: '1.0',
          status: 'completed',
          flagged: true,
          answers: [],
          completedAt: new Date(),
        },
      ]);
    });

    it('should get all responses for a survey', async () => {
      const response = await request(app)
        .get(`/api/patient-surveys/${surveyId}/responses`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter flagged responses', async () => {
      const response = await request(app)
        .get(`/api/patient-surveys/${surveyId}/responses?flagged=true`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].flagged).toBe(true);
    });
  });

  // ============================================
  // NPS TRACKING TESTS
  // ============================================

  describe('POST /api/patient-surveys/nps', () => {
    it('should submit NPS score (promoter)', async () => {
      const npsData = {
        score: 9,
        patientName: 'John Doe',
        patientEmail: 'john@example.com',
        feedback: {
          reason: 'Excellent service!',
          positiveComments: 'Very professional staff',
        },
        source: 'email',
      };

      const response = await request(app)
        .post('/api/patient-surveys/nps')
        .send(npsData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.category).toBe('promoter');
      expect(response.body.data.score).toBe(9);
    });

    it('should submit NPS score (detractor)', async () => {
      const npsData = {
        score: 4,
        patientName: 'Jane Smith',
        patientEmail: 'jane@example.com',
        feedback: {
          reason: 'Long wait times',
          improvementSuggestions: 'Better scheduling',
        },
        source: 'email',
      };

      const response = await request(app)
        .post('/api/patient-surveys/nps')
        .send(npsData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.category).toBe('detractor');
      expect(response.body.data.followup.required).toBe(true);
      expect(response.body.data.flagged).toBe(true);
    });

    it('should fail with invalid score', async () => {
      const npsData = {
        score: 11, // Invalid score
      };

      const response = await request(app)
        .post('/api/patient-surveys/nps')
        .send(npsData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/patient-surveys/nps/score', () => {
    beforeEach(async () => {
      // Create test NPS scores
      const scores = [
        { score: 9, category: 'promoter' },
        { score: 9, category: 'promoter' },
        { score: 8, category: 'passive' },
        { score: 6, category: 'detractor' },
      ];

      for (const scoreData of scores) {
        await NPSScore.create({
          ...scoreData,
          question: 'How likely are you to recommend us?',
          submittedAt: new Date(),
          source: 'email',
        });
      }
    });

    it('should calculate NPS score', async () => {
      const response = await request(app).get('/api/patient-surveys/nps/score').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('npsScore');
      expect(response.body.data).toHaveProperty('promoters');
      expect(response.body.data).toHaveProperty('passives');
      expect(response.body.data).toHaveProperty('detractors');
      expect(response.body.data.total).toBe(4);
      // NPS = ((2-1)/4) * 100 = 25
      expect(response.body.data.npsScore).toBe(25);
    });
  });

  describe('GET /api/patient-surveys/nps/trend', () => {
    beforeEach(async () => {
      // Create scores over time
      const today = new Date();
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      await NPSScore.create([
        {
          score: 9,
          category: 'promoter',
          submittedAt: today,
          question: 'Test',
          source: 'email',
        },
        {
          score: 5,
          category: 'detractor',
          submittedAt: lastWeek,
          question: 'Test',
          source: 'email',
        },
      ]);
    });

    it('should get NPS trend', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const response = await request(app)
        .get('/api/patient-surveys/nps/trend')
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          interval: 'week',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      if (response.body.data.length > 0) {
        expect(response.body.data[0]).toHaveProperty('period');
        expect(response.body.data[0]).toHaveProperty('npsScore');
        expect(response.body.data[0]).toHaveProperty('total');
      }
    });
  });

  describe('GET /api/patient-surveys/nps/detractors', () => {
    beforeEach(async () => {
      await NPSScore.create([
        {
          score: 5,
          category: 'detractor',
          patientName: 'Unhappy Patient',
          patientEmail: 'unhappy@example.com',
          feedback: { reason: 'Poor service' },
          submittedAt: new Date(),
          question: 'Test',
          source: 'email',
        },
      ]);
    });

    it('should get list of detractors', async () => {
      const response = await request(app).get('/api/patient-surveys/nps/detractors').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].category).toBe('detractor');
      expect(response.body.count).toBe(1);
    });
  });

  describe('GET /api/patient-surveys/nps/promoters', () => {
    beforeEach(async () => {
      await NPSScore.create([
        {
          score: 10,
          category: 'promoter',
          patientName: 'Happy Patient',
          patientEmail: 'happy@example.com',
          feedback: { positiveComments: 'Excellent service!' },
          submittedAt: new Date(),
          question: 'Test',
          source: 'email',
        },
      ]);
    });

    it('should get list of promoters', async () => {
      const response = await request(app).get('/api/patient-surveys/nps/promoters').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].category).toBe('promoter');
      expect(response.body.count).toBe(1);
    });
  });

  // ============================================
  // MODEL METHODS TESTS
  // ============================================

  describe('Survey Model Methods', () => {
    it('should calculate survey metrics correctly', async () => {
      const survey = await PatientSurvey.create({
        title: 'Test Survey',
        surveyType: 'post_appointment',
        status: 'active',
        questions: [
          {
            questionId: 'q1',
            questionText: 'Rating question',
            questionType: 'rating',
            required: true,
            order: 1,
            ratingScale: { min: 1, max: 5 },
            category: 'overall',
          },
        ],
        createdBy: new mongoose.Types.ObjectId(),
        analytics: {
          totalSent: 100,
        },
      });

      // Create responses
      await SurveyResponse.create([
        {
          surveyId: survey._id,
          status: 'completed',
          answers: [{ questionId: 'q1', value: 5 }],
          startedAt: new Date(Date.now() - 60000),
          completedAt: new Date(),
          scores: { overall: 100 },
        },
        {
          surveyId: survey._id,
          status: 'completed',
          answers: [{ questionId: 'q1', value: 3 }],
          startedAt: new Date(Date.now() - 60000),
          completedAt: new Date(),
          scores: { overall: 50 },
        },
      ]);

      await survey.calculateMetrics();

      expect(survey.analytics.totalResponses).toBe(2);
      expect(survey.analytics.responseRate).toBe(2);
      expect(survey.analytics.averageScore).toBeGreaterThan(0);
    });
  });

  describe('NPS Score Categorization', () => {
    it('should categorize as promoter (9-10)', () => {
      const score = new NPSScore({
        score: 9,
        question: 'Test',
        source: 'email',
      });

      expect(score.category).toBe('promoter');
    });

    it('should categorize as passive (7-8)', () => {
      const score = new NPSScore({
        score: 7,
        question: 'Test',
        source: 'email',
      });

      expect(score.category).toBe('passive');
    });

    it('should categorize as detractor (0-6)', () => {
      const score = new NPSScore({
        score: 6,
        question: 'Test',
        source: 'email',
      });

      expect(score.category).toBe('detractor');
    });
  });
});
