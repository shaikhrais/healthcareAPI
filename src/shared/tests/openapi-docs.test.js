const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../server');
const OpenApiDocs = require('../models/OpenApiDocs');
/* eslint-env jest */
// eslint-disable-next-line no-unused-vars
let mongoServer;

// Test data
const testOrganizationId = new mongoose.Types.ObjectId();
const testUserId = new mongoose.Types.ObjectId();

const testHeaders = {
  'x-user-id': testUserId.toString(),
  'x-organization-id': testOrganizationId.toString(),
};

describe('OpenAPI/Swagger Documentation API - TASK-16.4', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await OpenApiDocs.deleteMany({});
  });

  describe('POST /api/openapi-docs/initialize', () => {
    it('should initialize OpenAPI documentation', async () => {
      const response = await request(app)
        .post('/api/openapi-docs/initialize')
        .set(testHeaders)
        .send({
          title: 'ExpoJane Healthcare API',
          description: 'Complete API for healthcare practice management',
          apiVersion: '1.0.0',
          servers: [
            {
              url: 'http://localhost:3001',
              description: 'Development server',
            },
          ],
          contact: {
            name: 'API Support',
            email: 'api@expojane.com',
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.organization.toString()).toBe(testOrganizationId.toString());
      expect(response.body.data.openApiSpec.info.title).toBe('ExpoJane Healthcare API');
      expect(response.body.data.openApiSpec.info.version).toBe('1.0.0');
    });

    it('should return existing documentation if already initialized', async () => {
      // Create initial docs
      await OpenApiDocs.create({
        organization: testOrganizationId,
        endpoints: [],
      });

      const response = await request(app)
        .post('/api/openapi-docs/initialize')
        .set(testHeaders)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('already initialized');
    });
  });

  describe('GET /api/openapi-docs/config', () => {
    it('should get documentation configuration', async () => {
      await OpenApiDocs.create({
        organization: testOrganizationId,
        openApiSpec: {
          version: '3.0.3',
          info: {
            title: 'Test API',
            description: 'Test Description',
            version: '1.0.0',
          },
          servers: [
            {
              url: 'http://localhost:3001',
            },
          ],
        },
        settings: {
          theme: 'dark',
          showTryItOut: true,
        },
      });

      const response = await request(app).get('/api/openapi-docs/config').set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.openApiSpec.info.title).toBe('Test API');
      expect(response.body.data.settings.theme).toBe('dark');
    });

    it('should return 404 if documentation not found', async () => {
      const response = await request(app).get('/api/openapi-docs/config').set(testHeaders);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/openapi-docs/config', () => {
    it('should update documentation configuration', async () => {
      await OpenApiDocs.create({
        organization: testOrganizationId,
        openApiSpec: {
          info: {
            title: 'Old Title',
          },
        },
      });

      const response = await request(app)
        .put('/api/openapi-docs/config')
        .set(testHeaders)
        .send({
          openApiSpec: {
            info: {
              title: 'New Title',
              description: 'Updated description',
            },
          },
          settings: {
            theme: 'light',
            showCodeSamples: true,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.openApiSpec.info.title).toBe('New Title');
      expect(response.body.data.settings.theme).toBe('light');
    });
  });

  describe('POST /api/openapi-docs/endpoints', () => {
    it('should add a new endpoint', async () => {
      await OpenApiDocs.create({
        organization: testOrganizationId,
        endpoints: [],
      });

      const response = await request(app)
        .post('/api/openapi-docs/endpoints')
        .set(testHeaders)
        .send({
          path: '/api/patients',
          method: 'GET',
          summary: 'Get all patients',
          description: 'Retrieve a list of all patients',
          tags: ['Patients'],
          parameters: [
            {
              name: 'limit',
              in: 'query',
              description: 'Number of results to return',
              required: false,
              schema: {
                type: 'integer',
                default: 10,
              },
            },
          ],
          responses: new Map([
            [
              '200',
              {
                description: 'Successful response',
                content: new Map([
                  [
                    'application/json',
                    {
                      schema: { type: 'array' },
                      example: [{ id: 1, name: 'John Doe' }],
                    },
                  ],
                ]),
              },
            ],
          ]),
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.path).toBe('/api/patients');
      expect(response.body.data.method).toBe('GET');
      expect(response.body.data.summary).toBe('Get all patients');
    });

    it('should add endpoint with code samples', async () => {
      await OpenApiDocs.create({
        organization: testOrganizationId,
        endpoints: [],
      });

      const response = await request(app)
        .post('/api/openapi-docs/endpoints')
        .set(testHeaders)
        .send({
          path: '/api/appointments',
          method: 'POST',
          summary: 'Create appointment',
          description: 'Create a new appointment',
          tags: ['Appointments'],
          codeSamples: [
            {
              lang: 'curl',
              label: 'cURL',
              source: 'curl -X POST http://localhost:3001/api/appointments',
            },
            {
              lang: 'javascript',
              label: 'JavaScript',
              source: 'fetch("http://localhost:3001/api/appointments", { method: "POST" })',
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.data.codeSamples).toHaveLength(2);
      expect(response.body.data.codeSamples[0].lang).toBe('curl');
    });
  });

  describe('GET /api/openapi-docs/endpoints', () => {
    it('should get all endpoints', async () => {
      await OpenApiDocs.create({
        organization: testOrganizationId,
        endpoints: [
          {
            endpointId: 'EP-001',
            path: '/api/patients',
            method: 'GET',
            summary: 'Get patients',
            tags: ['Patients'],
          },
          {
            endpointId: 'EP-002',
            path: '/api/appointments',
            method: 'POST',
            summary: 'Create appointment',
            tags: ['Appointments'],
          },
        ],
      });

      const response = await request(app).get('/api/openapi-docs/endpoints').set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.count).toBe(2);
    });

    it('should filter endpoints by tag', async () => {
      await OpenApiDocs.create({
        organization: testOrganizationId,
        endpoints: [
          {
            endpointId: 'EP-001',
            path: '/api/patients',
            method: 'GET',
            summary: 'Get patients',
            tags: ['Patients'],
          },
          {
            endpointId: 'EP-002',
            path: '/api/appointments',
            method: 'POST',
            summary: 'Create appointment',
            tags: ['Appointments'],
          },
        ],
      });

      const response = await request(app)
        .get('/api/openapi-docs/endpoints?tag=Patients')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].tags).toContain('Patients');
    });

    it('should filter endpoints by method', async () => {
      await OpenApiDocs.create({
        organization: testOrganizationId,
        endpoints: [
          {
            endpointId: 'EP-001',
            path: '/api/patients',
            method: 'GET',
            summary: 'Get patients',
            tags: ['Patients'],
          },
          {
            endpointId: 'EP-002',
            path: '/api/patients',
            method: 'POST',
            summary: 'Create patient',
            tags: ['Patients'],
          },
        ],
      });

      const response = await request(app)
        .get('/api/openapi-docs/endpoints?method=POST')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].method).toBe('POST');
    });

    it('should search endpoints', async () => {
      await OpenApiDocs.create({
        organization: testOrganizationId,
        endpoints: [
          {
            endpointId: 'EP-001',
            path: '/api/patients',
            method: 'GET',
            summary: 'Get all patients',
            tags: ['Patients'],
          },
          {
            endpointId: 'EP-002',
            path: '/api/appointments',
            method: 'GET',
            summary: 'Get appointments',
            tags: ['Appointments'],
          },
        ],
      });

      const response = await request(app)
        .get('/api/openapi-docs/endpoints?search=patients')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].path).toContain('patients');
    });

    it('should filter deprecated endpoints', async () => {
      await OpenApiDocs.create({
        organization: testOrganizationId,
        endpoints: [
          {
            endpointId: 'EP-001',
            path: '/api/v1/patients',
            method: 'GET',
            summary: 'Get patients (old)',
            tags: ['Patients'],
            deprecated: true,
          },
          {
            endpointId: 'EP-002',
            path: '/api/v2/patients',
            method: 'GET',
            summary: 'Get patients (new)',
            tags: ['Patients'],
            deprecated: false,
          },
        ],
      });

      const response = await request(app)
        .get('/api/openapi-docs/endpoints?deprecated=true')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].deprecated).toBe(true);
    });
  });

  describe('GET /api/openapi-docs/endpoints/:endpointId', () => {
    it('should get specific endpoint', async () => {
      await OpenApiDocs.create({
        organization: testOrganizationId,
        endpoints: [
          {
            endpointId: 'EP-001',
            path: '/api/patients',
            method: 'GET',
            summary: 'Get patients',
            description: 'Retrieve all patients',
            tags: ['Patients'],
          },
        ],
      });

      const response = await request(app)
        .get('/api/openapi-docs/endpoints/EP-001')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.endpointId).toBe('EP-001');
      expect(response.body.data.path).toBe('/api/patients');
    });

    it('should record endpoint view', async () => {
      const docs = await OpenApiDocs.create({
        organization: testOrganizationId,
        endpoints: [
          {
            endpointId: 'EP-001',
            path: '/api/patients',
            method: 'GET',
            summary: 'Get patients',
            tags: ['Patients'],
            analytics: {
              totalViews: 0,
            },
          },
        ],
      });

      await request(app).get('/api/openapi-docs/endpoints/EP-001').set(testHeaders);

      const updatedDocs = await OpenApiDocs.findById(docs._id);
      const endpoint = updatedDocs.endpoints.find((e) => e.endpointId === 'EP-001');
      expect(endpoint.analytics.totalViews).toBe(1);
    });

    it('should return 404 for non-existent endpoint', async () => {
      await OpenApiDocs.create({
        organization: testOrganizationId,
        endpoints: [],
      });

      const response = await request(app)
        .get('/api/openapi-docs/endpoints/NON-EXISTENT')
        .set(testHeaders);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/openapi-docs/endpoints/:endpointId', () => {
    it('should update endpoint', async () => {
      await OpenApiDocs.create({
        organization: testOrganizationId,
        endpoints: [
          {
            endpointId: 'EP-001',
            path: '/api/patients',
            method: 'GET',
            summary: 'Old summary',
            tags: ['Patients'],
          },
        ],
      });

      const response = await request(app)
        .put('/api/openapi-docs/endpoints/EP-001')
        .set(testHeaders)
        .send({
          summary: 'New summary',
          description: 'Updated description',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.summary).toBe('New summary');
      expect(response.body.data.description).toBe('Updated description');
    });
  });

  describe('DELETE /api/openapi-docs/endpoints/:endpointId', () => {
    it('should delete endpoint', async () => {
      await OpenApiDocs.create({
        organization: testOrganizationId,
        endpoints: [
          {
            endpointId: 'EP-001',
            path: '/api/patients',
            method: 'GET',
            summary: 'Get patients',
            tags: ['Patients'],
          },
          {
            endpointId: 'EP-002',
            path: '/api/appointments',
            method: 'GET',
            summary: 'Get appointments',
            tags: ['Appointments'],
          },
        ],
      });

      const response = await request(app)
        .delete('/api/openapi-docs/endpoints/EP-001')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify endpoint is deleted
      const docs = await OpenApiDocs.findOne({ organization: testOrganizationId });
      expect(docs.endpoints).toHaveLength(1);
      expect(docs.endpoints[0].endpointId).toBe('EP-002');
    });
  });

  describe('POST /api/openapi-docs/endpoints/:endpointId/deprecate', () => {
    it('should deprecate an endpoint', async () => {
      await OpenApiDocs.create({
        organization: testOrganizationId,
        endpoints: [
          {
            endpointId: 'EP-001',
            path: '/api/v1/patients',
            method: 'GET',
            summary: 'Get patients',
            tags: ['Patients'],
            deprecated: false,
          },
        ],
      });

      const response = await request(app)
        .post('/api/openapi-docs/endpoints/EP-001/deprecate')
        .set(testHeaders)
        .send({
          reason: 'Use v2 API instead',
          replacementEndpoint: '/api/v2/patients',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const docs = await OpenApiDocs.findOne({ organization: testOrganizationId });
      const endpoint = docs.endpoints.find((e) => e.endpointId === 'EP-001');
      expect(endpoint.deprecated).toBe(true);
      expect(endpoint.deprecationReason).toBe('Use v2 API instead');
      expect(endpoint.replacementEndpoint).toBe('/api/v2/patients');
    });
  });

  describe('POST /api/openapi-docs/endpoints/:endpointId/code-samples', () => {
    it('should add code sample to endpoint', async () => {
      await OpenApiDocs.create({
        organization: testOrganizationId,
        endpoints: [
          {
            endpointId: 'EP-001',
            path: '/api/patients',
            method: 'GET',
            summary: 'Get patients',
            tags: ['Patients'],
            codeSamples: [],
          },
        ],
      });

      const response = await request(app)
        .post('/api/openapi-docs/endpoints/EP-001/code-samples')
        .set(testHeaders)
        .send({
          lang: 'python',
          label: 'Python',
          source: 'import requests\nresponse = requests.get("http://localhost:3001/api/patients")',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      const docs = await OpenApiDocs.findOne({ organization: testOrganizationId });
      const endpoint = docs.endpoints.find((e) => e.endpointId === 'EP-001');
      expect(endpoint.codeSamples).toHaveLength(1);
      expect(endpoint.codeSamples[0].lang).toBe('python');
    });
  });

  describe('POST /api/openapi-docs/schemas', () => {
    it('should add schema definition', async () => {
      await OpenApiDocs.create({
        organization: testOrganizationId,
        schemas: [],
      });

      const response = await request(app)
        .post('/api/openapi-docs/schemas')
        .set(testHeaders)
        .send({
          name: 'Patient',
          description: 'Patient data model',
          type: 'object',
          properties: new Map([
            ['id', { type: 'string' }],
            ['name', { type: 'string' }],
            ['email', { type: 'string', format: 'email' }],
          ]),
          required: ['name', 'email'],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Patient');
      expect(response.body.data.type).toBe('object');
    });
  });

  describe('GET /api/openapi-docs/schemas', () => {
    it('should get all schemas', async () => {
      await OpenApiDocs.create({
        organization: testOrganizationId,
        schemas: [
          {
            schemaId: 'SCHEMA-001',
            name: 'Patient',
            type: 'object',
          },
          {
            schemaId: 'SCHEMA-002',
            name: 'Appointment',
            type: 'object',
          },
        ],
      });

      const response = await request(app).get('/api/openapi-docs/schemas').set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.count).toBe(2);
    });
  });

  describe('GET /api/openapi-docs/schemas/:schemaId', () => {
    it('should get specific schema', async () => {
      await OpenApiDocs.create({
        organization: testOrganizationId,
        schemas: [
          {
            schemaId: 'SCHEMA-001',
            name: 'Patient',
            description: 'Patient model',
            type: 'object',
          },
        ],
      });

      const response = await request(app)
        .get('/api/openapi-docs/schemas/SCHEMA-001')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.schemaId).toBe('SCHEMA-001');
      expect(response.body.data.name).toBe('Patient');
    });
  });

  describe('GET /api/openapi-docs/tags', () => {
    it('should get all tags', async () => {
      await OpenApiDocs.create({
        organization: testOrganizationId,
        tags: [
          {
            name: 'Patients',
            description: 'Patient management endpoints',
            endpointCount: 5,
          },
          {
            name: 'Appointments',
            description: 'Appointment scheduling endpoints',
            endpointCount: 8,
          },
        ],
      });

      const response = await request(app).get('/api/openapi-docs/tags').set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].name).toBe('Patients');
    });
  });

  describe('POST /api/openapi-docs/tags', () => {
    it('should add new tag', async () => {
      await OpenApiDocs.create({
        organization: testOrganizationId,
        tags: [],
      });

      const response = await request(app)
        .post('/api/openapi-docs/tags')
        .set(testHeaders)
        .send({
          name: 'Billing',
          description: 'Billing and payment endpoints',
          externalDocs: {
            description: 'Billing documentation',
            url: 'https://docs.example.com/billing',
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Billing');
      expect(response.body.data.description).toBe('Billing and payment endpoints');
    });

    it('should reject duplicate tag', async () => {
      await OpenApiDocs.create({
        organization: testOrganizationId,
        tags: [
          {
            name: 'Patients',
            description: 'Patient endpoints',
          },
        ],
      });

      const response = await request(app).post('/api/openapi-docs/tags').set(testHeaders).send({
        name: 'Patients',
        description: 'Duplicate tag',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('POST /api/openapi-docs/try-it-out', () => {
    it('should execute API call from playground', async () => {
      await OpenApiDocs.create({
        organization: testOrganizationId,
        playground: {
          enabled: true,
        },
        endpoints: [
          {
            endpointId: 'EP-001',
            path: '/api/patients',
            method: 'GET',
            summary: 'Get patients',
            tags: ['Patients'],
          },
        ],
      });

      const response = await request(app)
        .post('/api/openapi-docs/try-it-out')
        .set(testHeaders)
        .send({
          endpointId: 'EP-001',
          method: 'GET',
          path: '/api/patients',
          headers: {
            'Content-Type': 'application/json',
          },
          query: {
            limit: 10,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.request).toBeDefined();
      expect(response.body.data.response).toBeDefined();
    });

    it('should reject try-it-out when playground is disabled', async () => {
      await OpenApiDocs.create({
        organization: testOrganizationId,
        playground: {
          enabled: false,
        },
      });

      const response = await request(app)
        .post('/api/openapi-docs/try-it-out')
        .set(testHeaders)
        .send({
          endpointId: 'EP-001',
          method: 'GET',
          path: '/api/patients',
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('disabled');
    });
  });

  describe('GET /api/openapi-docs/try-it-out/history', () => {
    it('should get playground history', async () => {
      await OpenApiDocs.create({
        organization: testOrganizationId,
        tryItOutHistory: [
          {
            sessionId: 'SESSION-001',
            endpointId: 'EP-001',
            method: 'GET',
            path: '/api/patients',
            requestData: {},
            responseData: { status: 200 },
            success: true,
            timestamp: new Date(),
          },
          {
            sessionId: 'SESSION-002',
            endpointId: 'EP-002',
            method: 'POST',
            path: '/api/appointments',
            requestData: {},
            responseData: { status: 201 },
            success: true,
            timestamp: new Date(),
          },
        ],
      });

      const response = await request(app)
        .get('/api/openapi-docs/try-it-out/history')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should filter history by endpoint', async () => {
      await OpenApiDocs.create({
        organization: testOrganizationId,
        tryItOutHistory: [
          {
            sessionId: 'SESSION-001',
            endpointId: 'EP-001',
            method: 'GET',
            path: '/api/patients',
            success: true,
            timestamp: new Date(),
          },
          {
            sessionId: 'SESSION-002',
            endpointId: 'EP-002',
            method: 'GET',
            path: '/api/appointments',
            success: true,
            timestamp: new Date(),
          },
        ],
      });

      const response = await request(app)
        .get('/api/openapi-docs/try-it-out/history?endpointId=EP-001')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].endpointId).toBe('EP-001');
    });

    it('should limit history results', async () => {
      const history = [];
      for (let i = 0; i < 100; i += 1) {
        history.push({
          sessionId: `SESSION-${i}`,
          endpointId: 'EP-001',
          method: 'GET',
          path: '/api/patients',
          success: true,
          timestamp: new Date(),
        });
      }

      await OpenApiDocs.create({
        organization: testOrganizationId,
        tryItOutHistory: history,
      });

      const response = await request(app)
        .get('/api/openapi-docs/try-it-out/history?limit=20')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(20);
    });
  });

  describe('GET /api/openapi-docs/analytics', () => {
    it('should get documentation analytics', async () => {
      const now = new Date();
      await OpenApiDocs.create({
        organization: testOrganizationId,
        tryItOutHistory: [
          {
            sessionId: 'SESSION-001',
            endpointId: 'EP-001',
            success: true,
            responseData: { duration: 250 },
            timestamp: new Date(now - 86400000), // 1 day ago
          },
          {
            sessionId: 'SESSION-002',
            endpointId: 'EP-001',
            success: true,
            responseData: { duration: 300 },
            timestamp: new Date(now - 43200000), // 12 hours ago
          },
          {
            sessionId: 'SESSION-003',
            endpointId: 'EP-001',
            success: false,
            responseData: { duration: 5000 },
            timestamp: new Date(now - 3600000), // 1 hour ago
          },
        ],
        analytics: {
          popularEndpoints: [
            {
              endpointId: 'EP-001',
              path: '/api/patients',
              method: 'GET',
              viewCount: 50,
              tryCount: 25,
            },
          ],
        },
      });

      const response = await request(app)
        .get('/api/openapi-docs/analytics?period=7d')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.period).toBe('7d');
      expect(response.body.data.totalApiCalls).toBe(3);
      expect(response.body.data.successfulCalls).toBe(2);
      expect(response.body.data.failedCalls).toBe(1);
    });
  });

  describe('GET /api/openapi-docs/stats', () => {
    it('should get overall statistics', async () => {
      await OpenApiDocs.create({
        organization: testOrganizationId,
        endpoints: [
          {
            endpointId: 'EP-001',
            path: '/api/patients',
            method: 'GET',
            summary: 'Get patients',
            deprecated: false,
          },
          {
            endpointId: 'EP-002',
            path: '/api/v1/patients',
            method: 'GET',
            summary: 'Get patients (old)',
            deprecated: true,
          },
        ],
        schemas: [
          { schemaId: 'SCHEMA-001', name: 'Patient' },
          { schemaId: 'SCHEMA-002', name: 'Appointment' },
        ],
        tags: [
          { name: 'Patients', endpointCount: 5 },
          { name: 'Appointments', endpointCount: 8 },
        ],
        analytics: {
          totalViews: 1000,
          uniqueVisitors: 250,
          totalApiCalls: 500,
          popularEndpoints: [],
        },
      });

      const response = await request(app).get('/api/openapi-docs/stats').set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalEndpoints).toBe(2);
      expect(response.body.data.deprecatedEndpoints).toBe(1);
      expect(response.body.data.totalSchemas).toBe(2);
      expect(response.body.data.totalTags).toBe(2);
      expect(response.body.data.analytics.totalViews).toBe(1000);
      expect(response.body.data.analytics.totalApiCalls).toBe(500);
    });
  });

  describe('POST /api/openapi-docs/changelog', () => {
    it('should add changelog entry', async () => {
      await OpenApiDocs.create({
        organization: testOrganizationId,
        changelog: [],
      });

      const response = await request(app)
        .post('/api/openapi-docs/changelog')
        .set(testHeaders)
        .send({
          version: '2.0.0',
          releaseDate: new Date(),
          title: 'Major API Update',
          description: 'Comprehensive update to API endpoints',
          changes: [
            {
              type: 'added',
              endpoint: '/api/v2/patients',
              description: 'New v2 patients endpoint with enhanced filtering',
              breakingChange: false,
            },
            {
              type: 'deprecated',
              endpoint: '/api/v1/patients',
              description: 'Old v1 patients endpoint deprecated',
              breakingChange: true,
              migrationGuide: 'Switch to /api/v2/patients',
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.version).toBe('2.0.0');
      expect(response.body.data.changes).toHaveLength(2);
    });
  });

  describe('GET /api/openapi-docs/changelog', () => {
    it('should get changelog', async () => {
      await OpenApiDocs.create({
        organization: testOrganizationId,
        changelog: [
          {
            version: '2.0.0',
            releaseDate: new Date(),
            title: 'Version 2.0',
            changes: [],
          },
          {
            version: '1.5.0',
            releaseDate: new Date(Date.now() - 86400000),
            title: 'Version 1.5',
            changes: [],
          },
        ],
      });

      const response = await request(app).get('/api/openapi-docs/changelog').set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].version).toBe('2.0.0');
    });

    it('should limit changelog results', async () => {
      const changelog = [];
      for (let i = 0; i < 50; i += 1) {
        changelog.push({
          version: `1.${i}.0`,
          releaseDate: new Date(),
          title: `Version 1.${i}`,
          changes: [],
        });
      }

      await OpenApiDocs.create({
        organization: testOrganizationId,
        changelog,
      });

      const response = await request(app)
        .get('/api/openapi-docs/changelog?limit=10')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(10);
    });
  });

  describe('GET /api/openapi-docs/export/openapi.json', () => {
    it('should export OpenAPI spec as JSON', async () => {
      await OpenApiDocs.create({
        organization: testOrganizationId,
        openApiSpec: {
          version: '3.0.3',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
        },
        endpoints: [
          {
            endpointId: 'EP-001',
            path: '/api/patients',
            method: 'GET',
            summary: 'Get patients',
            tags: ['Patients'],
          },
        ],
      });

      const response = await request(app)
        .get('/api/openapi-docs/export/openapi.json')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body.openapi).toBe('3.0.3');
      expect(response.body.info.title).toBe('Test API');
      expect(response.body.paths).toBeDefined();
    });
  });

  describe('GET /api/openapi-docs/export/postman', () => {
    it('should export as Postman collection', async () => {
      await OpenApiDocs.create({
        organization: testOrganizationId,
        openApiSpec: {
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
        },
        endpoints: [
          {
            endpointId: 'EP-001',
            path: '/api/patients',
            method: 'GET',
            summary: 'Get patients',
            tags: ['Patients'],
          },
          {
            endpointId: 'EP-002',
            path: '/api/appointments',
            method: 'POST',
            summary: 'Create appointment',
            tags: ['Appointments'],
          },
        ],
      });

      const response = await request(app).get('/api/openapi-docs/export/postman').set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body.info.name).toBe('Test API');
      expect(response.body.item).toBeDefined();
      expect(Array.isArray(response.body.item)).toBe(true);
    });
  });

  describe('GET /api/openapi-docs/search', () => {
    it('should search endpoints', async () => {
      await OpenApiDocs.create({
        organization: testOrganizationId,
        endpoints: [
          {
            endpointId: 'EP-001',
            path: '/api/patients',
            method: 'GET',
            summary: 'Get all patients',
            description: 'Retrieve complete patient list',
          },
          {
            endpointId: 'EP-002',
            path: '/api/appointments',
            method: 'GET',
            summary: 'Get appointments',
            description: 'Retrieve appointments',
          },
        ],
      });

      const response = await request(app)
        .get('/api/openapi-docs/search?q=patients')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].path).toContain('patients');
    });

    it('should require search query', async () => {
      await OpenApiDocs.create({
        organization: testOrganizationId,
      });

      const response = await request(app).get('/api/openapi-docs/search').set(testHeaders);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/openapi-docs/security-schemes', () => {
    it('should add security scheme', async () => {
      await OpenApiDocs.create({
        organization: testOrganizationId,
        securitySchemes: [],
      });

      const response = await request(app)
        .post('/api/openapi-docs/security-schemes')
        .set(testHeaders)
        .send({
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token authentication',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('http');
      expect(response.body.data.scheme).toBe('bearer');
    });
  });

  describe('GET /api/openapi-docs/security-schemes', () => {
    it('should get all security schemes', async () => {
      await OpenApiDocs.create({
        organization: testOrganizationId,
        securitySchemes: [
          {
            schemeId: 'SCHEME-001',
            type: 'http',
            scheme: 'bearer',
          },
          {
            schemeId: 'SCHEME-002',
            type: 'apiKey',
            name: 'api_key',
            in: 'header',
          },
        ],
      });

      const response = await request(app)
        .get('/api/openapi-docs/security-schemes')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('PUT /api/openapi-docs/visibility', () => {
    it('should toggle documentation visibility', async () => {
      await OpenApiDocs.create({
        organization: testOrganizationId,
        isPublic: false,
      });

      const response = await request(app)
        .put('/api/openapi-docs/visibility')
        .set(testHeaders)
        .send({
          isPublic: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isPublic).toBe(true);
      expect(response.body.message).toContain('public');
    });
  });

  describe('GET /api/openapi-docs/health', () => {
    it('should return health status when initialized', async () => {
      await OpenApiDocs.create({
        organization: testOrganizationId,
        endpoints: [
          {
            endpointId: 'EP-001',
            path: '/api/test',
            method: 'GET',
            summary: 'Test',
            tags: ['Test'],
          },
        ],
        schemas: [{ schemaId: 'SCHEMA-001', name: 'Test' }],
        isActive: true,
        isPublic: false,
      });

      const response = await request(app).get('/api/openapi-docs/health').set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.initialized).toBe(true);
      expect(response.body.data.totalEndpoints).toBe(1);
      expect(response.body.data.totalSchemas).toBe(1);
      expect(response.body.data.isActive).toBe(true);
    });

    it('should return not initialized status', async () => {
      const response = await request(app).get('/api/openapi-docs/health').set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.initialized).toBe(false);
    });
  });

  describe('Virtual Fields', () => {
    it('should calculate documentationScore virtual field', async () => {
      const docs = await OpenApiDocs.create({
        organization: testOrganizationId,
        endpoints: [
          {
            endpointId: 'EP-001',
            path: '/api/patients',
            method: 'GET',
            summary: 'Get patients',
            description: 'Retrieve all patients',
            parameters: [{ name: 'limit', in: 'query' }],
            responses: new Map([['200', { description: 'Success' }]]),
            codeSamples: [{ lang: 'curl', source: 'curl...' }],
            requestBody: { content: new Map() },
            tags: ['Patients'],
            security: [{}],
          },
        ],
      });

      expect(docs.documentationScore).toBeGreaterThan(0);
      expect(docs.documentationScore).toBeLessThanOrEqual(100);
    });

    it('should count deprecated endpoints', async () => {
      const docs = await OpenApiDocs.create({
        organization: testOrganizationId,
        endpoints: [
          {
            endpointId: 'EP-001',
            path: '/api/v1/patients',
            method: 'GET',
            summary: 'Get patients',
            deprecated: true,
          },
          {
            endpointId: 'EP-002',
            path: '/api/v2/patients',
            method: 'GET',
            summary: 'Get patients',
            deprecated: false,
          },
        ],
      });

      expect(docs.deprecatedEndpointsCount).toBe(1);
    });
  });
});
