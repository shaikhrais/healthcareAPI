const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../server');
const IntegrationHealth = require('../models/IntegrationHealth');
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

describe('Integration Health Monitoring API - TASK-15.19', () => {
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
    await IntegrationHealth.deleteMany({});
  });

  describe('POST /api/integration-health/initialize', () => {
    it('should initialize integration health monitoring configuration', async () => {
      const response = await request(app)
        .post('/api/integration-health/initialize')
        .set(testHeaders)
        .send({
          notificationConfig: {
            email: {
              enabled: true,
              recipients: ['admin@clinic.com', 'support@clinic.com'],
            },
            slack: {
              enabled: true,
              webhookUrl: 'https://hooks.slack.com/services/TEST/WEBHOOK',
              channel: '#integrations',
            },
            sms: {
              enabled: false,
            },
          },
          alertThresholds: {
            consecutiveFailures: 3,
            responseTimeMs: 5000,
            uptimePercentage: 95,
            errorRatePercentage: 10,
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.organization.toString()).toBe(testOrganizationId.toString());
      expect(response.body.data.notificationConfig.email.enabled).toBe(true);
      expect(response.body.data.notificationConfig.email.recipients).toHaveLength(2);
      expect(response.body.data.alertThresholds.consecutiveFailures).toBe(3);
    });

    it('should return existing configuration if already initialized', async () => {
      // Create initial config
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [],
        healthChecks: [],
      });

      const response = await request(app)
        .post('/api/integration-health/initialize')
        .set(testHeaders)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('already initialized');
    });
  });

  describe('GET /api/integration-health/dashboard', () => {
    it('should return dashboard overview with statistics', async () => {
      // Create test data
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [
          {
            integrationId: 'quickbooks-1',
            integrationType: 'quickbooks',
            name: 'QuickBooks Online',
            status: 'healthy',
            isEnabled: true,
            uptimePercentage: 99.5,
            responseTime: {
              current: 250,
              average: 280,
              min: 150,
              max: 450,
            },
            metrics: {
              totalRequests: 1000,
              successfulRequests: 995,
              failedRequests: 5,
            },
          },
          {
            integrationId: 'slack-1',
            integrationType: 'slack',
            name: 'Slack Workspace',
            status: 'degraded',
            isEnabled: true,
            uptimePercentage: 92.0,
            responseTime: {
              current: 800,
              average: 650,
              min: 200,
              max: 1200,
            },
            metrics: {
              totalRequests: 500,
              successfulRequests: 460,
              failedRequests: 40,
            },
          },
        ],
        incidents: [
          {
            incidentId: 'INC-001',
            integrationId: 'slack-1',
            severity: 'medium',
            title: 'Slow response times',
            status: 'investigating',
            startedAt: new Date(),
          },
        ],
        alerts: [
          {
            alertId: 'ALERT-001',
            integrationId: 'slack-1',
            type: 'slow_response',
            severity: 'warning',
            acknowledged: false,
          },
        ],
      });

      const response = await request(app).get('/api/integration-health/dashboard').set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.totalIntegrations).toBe(2);
      expect(response.body.data.summary.healthyIntegrations).toBe(1);
      expect(response.body.data.summary.degradedIntegrations).toBe(1);
      expect(response.body.data.summary.openIncidents).toBe(1);
      expect(response.body.data.summary.unacknowledgedAlerts).toBe(1);
      expect(response.body.data.integrations).toHaveLength(2);
    });

    it('should return 404 if monitoring not initialized', async () => {
      const response = await request(app).get('/api/integration-health/dashboard').set(testHeaders);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/integration-health/integrations', () => {
    it('should add a new integration to monitor', async () => {
      // Initialize monitoring
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [],
      });

      const response = await request(app)
        .post('/api/integration-health/integrations')
        .set(testHeaders)
        .send({
          integrationId: 'quickbooks-1',
          integrationType: 'quickbooks',
          name: 'QuickBooks Online',
          description: 'Accounting integration',
          endpoint: 'https://api.quickbooks.com',
          checkInterval: 300,
          timeout: 10000,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.integrations).toHaveLength(1);
      expect(response.body.data.integrations[0].integrationId).toBe('quickbooks-1');
      expect(response.body.data.integrations[0].integrationType).toBe('quickbooks');
      expect(response.body.data.integrations[0].status).toBe('unknown');
    });

    it('should not add duplicate integration', async () => {
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [
          {
            integrationId: 'quickbooks-1',
            integrationType: 'quickbooks',
            name: 'QuickBooks Online',
          },
        ],
      });

      const response = await request(app)
        .post('/api/integration-health/integrations')
        .set(testHeaders)
        .send({
          integrationId: 'quickbooks-1',
          integrationType: 'quickbooks',
          name: 'QuickBooks Online',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should add multiple different integrations', async () => {
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [],
      });

      // Add QuickBooks
      await request(app).post('/api/integration-health/integrations').set(testHeaders).send({
        integrationId: 'quickbooks-1',
        integrationType: 'quickbooks',
        name: 'QuickBooks Online',
      });

      // Add Slack
      const response = await request(app)
        .post('/api/integration-health/integrations')
        .set(testHeaders)
        .send({
          integrationId: 'slack-1',
          integrationType: 'slack',
          name: 'Slack Workspace',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.integrations).toHaveLength(2);
    });
  });

  describe('GET /api/integration-health/integrations', () => {
    it('should get all monitored integrations', async () => {
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [
          {
            integrationId: 'quickbooks-1',
            integrationType: 'quickbooks',
            name: 'QuickBooks Online',
            status: 'healthy',
            isEnabled: true,
          },
          {
            integrationId: 'slack-1',
            integrationType: 'slack',
            name: 'Slack Workspace',
            status: 'degraded',
            isEnabled: true,
          },
        ],
      });

      const response = await request(app)
        .get('/api/integration-health/integrations')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].integrationId).toBe('quickbooks-1');
      expect(response.body.data[1].integrationId).toBe('slack-1');
    });

    it('should filter integrations by status', async () => {
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [
          {
            integrationId: 'quickbooks-1',
            integrationType: 'quickbooks',
            name: 'QuickBooks Online',
            status: 'healthy',
            isEnabled: true,
          },
          {
            integrationId: 'slack-1',
            integrationType: 'slack',
            name: 'Slack Workspace',
            status: 'degraded',
            isEnabled: true,
          },
          {
            integrationId: 'teams-1',
            integrationType: 'teams',
            name: 'Microsoft Teams',
            status: 'down',
            isEnabled: true,
          },
        ],
      });

      const response = await request(app)
        .get('/api/integration-health/integrations?status=healthy')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('healthy');
    });

    it('should filter integrations by type', async () => {
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [
          {
            integrationId: 'quickbooks-1',
            integrationType: 'quickbooks',
            name: 'QuickBooks Online',
            status: 'healthy',
            isEnabled: true,
          },
          {
            integrationId: 'slack-1',
            integrationType: 'slack',
            name: 'Slack Workspace',
            status: 'healthy',
            isEnabled: true,
          },
        ],
      });

      const response = await request(app)
        .get('/api/integration-health/integrations?integrationType=quickbooks')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].integrationType).toBe('quickbooks');
    });
  });

  describe('GET /api/integration-health/integrations/:integrationId', () => {
    it('should get specific integration details', async () => {
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [
          {
            integrationId: 'quickbooks-1',
            integrationType: 'quickbooks',
            name: 'QuickBooks Online',
            status: 'healthy',
            isEnabled: true,
            uptimePercentage: 99.5,
            responseTime: {
              current: 250,
              average: 280,
              min: 150,
              max: 450,
            },
          },
        ],
      });

      const response = await request(app)
        .get('/api/integration-health/integrations/quickbooks-1')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.integrationId).toBe('quickbooks-1');
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.uptimePercentage).toBe(99.5);
    });

    it('should return 404 for non-existent integration', async () => {
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [],
      });

      const response = await request(app)
        .get('/api/integration-health/integrations/non-existent')
        .set(testHeaders);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/integration-health/integrations/:integrationId/status', () => {
    it('should update integration status to healthy', async () => {
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [
          {
            integrationId: 'quickbooks-1',
            integrationType: 'quickbooks',
            name: 'QuickBooks Online',
            status: 'unknown',
            isEnabled: true,
          },
        ],
      });

      const response = await request(app)
        .put('/api/integration-health/integrations/quickbooks-1/status')
        .set(testHeaders)
        .send({
          status: 'healthy',
          responseTime: 250,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.integrationId).toBe('quickbooks-1');
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.responseTime.current).toBe(250);
    });

    it('should update integration status to degraded', async () => {
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [
          {
            integrationId: 'slack-1',
            integrationType: 'slack',
            name: 'Slack Workspace',
            status: 'healthy',
            isEnabled: true,
          },
        ],
      });

      const response = await request(app)
        .put('/api/integration-health/integrations/slack-1/status')
        .set(testHeaders)
        .send({
          status: 'degraded',
          responseTime: 1500,
          errorMessage: 'Slow response times',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('degraded');
    });

    it('should update integration status to down', async () => {
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [
          {
            integrationId: 'teams-1',
            integrationType: 'teams',
            name: 'Microsoft Teams',
            status: 'healthy',
            isEnabled: true,
          },
        ],
      });

      const response = await request(app)
        .put('/api/integration-health/integrations/teams-1/status')
        .set(testHeaders)
        .send({
          status: 'down',
          errorMessage: 'Connection timeout',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('down');
    });

    it('should reject invalid status values', async () => {
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [
          {
            integrationId: 'quickbooks-1',
            integrationType: 'quickbooks',
            name: 'QuickBooks Online',
            status: 'healthy',
            isEnabled: true,
          },
        ],
      });

      const response = await request(app)
        .put('/api/integration-health/integrations/quickbooks-1/status')
        .set(testHeaders)
        .send({
          status: 'invalid_status',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/integration-health/health-checks', () => {
    it('should record a successful health check', async () => {
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [
          {
            integrationId: 'quickbooks-1',
            integrationType: 'quickbooks',
            name: 'QuickBooks Online',
            status: 'healthy',
            isEnabled: true,
          },
        ],
      });

      const response = await request(app)
        .post('/api/integration-health/health-checks')
        .set(testHeaders)
        .send({
          integrationId: 'quickbooks-1',
          status: 'success',
          responseTime: 280,
          endpoint: '/api/v1/company/info',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.healthChecks).toHaveLength(1);
      expect(response.body.data.healthChecks[0].integrationId).toBe('quickbooks-1');
      expect(response.body.data.healthChecks[0].status).toBe('success');
      expect(response.body.data.healthChecks[0].responseTime).toBe(280);
    });

    it('should record a failed health check', async () => {
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [
          {
            integrationId: 'slack-1',
            integrationType: 'slack',
            name: 'Slack Workspace',
            status: 'healthy',
            isEnabled: true,
          },
        ],
      });

      const response = await request(app)
        .post('/api/integration-health/health-checks')
        .set(testHeaders)
        .send({
          integrationId: 'slack-1',
          status: 'failure',
          responseTime: 5000,
          errorMessage: 'Connection timeout',
          endpoint: '/api/chat.postMessage',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.healthChecks[0].status).toBe('failure');
      expect(response.body.data.healthChecks[0].errorMessage).toBe('Connection timeout');
    });

    it('should record a timeout health check', async () => {
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [
          {
            integrationId: 'teams-1',
            integrationType: 'teams',
            name: 'Microsoft Teams',
            status: 'healthy',
            isEnabled: true,
          },
        ],
      });

      const response = await request(app)
        .post('/api/integration-health/health-checks')
        .set(testHeaders)
        .send({
          integrationId: 'teams-1',
          status: 'timeout',
          responseTime: 10000,
          errorMessage: 'Request exceeded 10s timeout',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.healthChecks[0].status).toBe('timeout');
    });

    it('should update integration metrics after health check', async () => {
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [
          {
            integrationId: 'quickbooks-1',
            integrationType: 'quickbooks',
            name: 'QuickBooks Online',
            status: 'healthy',
            isEnabled: true,
            metrics: {
              totalRequests: 100,
              successfulRequests: 95,
              failedRequests: 5,
            },
          },
        ],
      });

      const response = await request(app)
        .post('/api/integration-health/health-checks')
        .set(testHeaders)
        .send({
          integrationId: 'quickbooks-1',
          status: 'success',
          responseTime: 250,
        });

      expect(response.status).toBe(201);
      const updatedIntegration = response.body.data.integrations.find(
        (i) => i.integrationId === 'quickbooks-1'
      );
      expect(updatedIntegration.metrics.totalRequests).toBe(101);
      expect(updatedIntegration.metrics.successfulRequests).toBe(96);
    });
  });

  describe('GET /api/integration-health/health-checks', () => {
    it('should get health check history for specific integration', async () => {
      const now = new Date();
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [
          {
            integrationId: 'quickbooks-1',
            integrationType: 'quickbooks',
            name: 'QuickBooks Online',
            status: 'healthy',
            isEnabled: true,
          },
        ],
        healthChecks: [
          {
            checkId: 'CHECK-001',
            integrationId: 'quickbooks-1',
            timestamp: new Date(now - 300000),
            status: 'success',
            responseTime: 250,
          },
          {
            checkId: 'CHECK-002',
            integrationId: 'quickbooks-1',
            timestamp: new Date(now - 240000),
            status: 'success',
            responseTime: 280,
          },
          {
            checkId: 'CHECK-003',
            integrationId: 'quickbooks-1',
            timestamp: new Date(now - 180000),
            status: 'failure',
            responseTime: 5000,
            errorMessage: 'Timeout',
          },
        ],
      });

      const response = await request(app)
        .get('/api/integration-health/health-checks?integrationId=quickbooks-1')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.data[0].integrationId).toBe('quickbooks-1');
    });

    it('should limit health check results', async () => {
      const checks = [];
      for (let i = 0; i < 50; i += 1) {
        checks.push({
          checkId: `CHECK-${i}`,
          integrationId: 'quickbooks-1',
          timestamp: new Date(Date.now() - i * 60000),
          status: 'success',
          responseTime: 250,
        });
      }

      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [
          {
            integrationId: 'quickbooks-1',
            integrationType: 'quickbooks',
            name: 'QuickBooks Online',
            status: 'healthy',
            isEnabled: true,
          },
        ],
        healthChecks: checks,
      });

      const response = await request(app)
        .get('/api/integration-health/health-checks?integrationId=quickbooks-1&limit=20')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(20);
    });

    it('should filter health checks by status', async () => {
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [
          {
            integrationId: 'quickbooks-1',
            integrationType: 'quickbooks',
            name: 'QuickBooks Online',
            status: 'healthy',
            isEnabled: true,
          },
        ],
        healthChecks: [
          {
            checkId: 'CHECK-001',
            integrationId: 'quickbooks-1',
            timestamp: new Date(),
            status: 'success',
            responseTime: 250,
          },
          {
            checkId: 'CHECK-002',
            integrationId: 'quickbooks-1',
            timestamp: new Date(),
            status: 'failure',
            responseTime: 5000,
          },
        ],
      });

      const response = await request(app)
        .get('/api/integration-health/health-checks?integrationId=quickbooks-1&status=failure')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('failure');
    });
  });

  describe('GET /api/integration-health/incidents', () => {
    it('should get all incidents', async () => {
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [
          {
            integrationId: 'quickbooks-1',
            integrationType: 'quickbooks',
            name: 'QuickBooks Online',
            status: 'down',
            isEnabled: true,
          },
        ],
        incidents: [
          {
            incidentId: 'INC-001',
            integrationId: 'quickbooks-1',
            severity: 'critical',
            title: 'QuickBooks API Down',
            description: 'Cannot connect to QuickBooks API',
            status: 'investigating',
            startedAt: new Date(),
          },
          {
            incidentId: 'INC-002',
            integrationId: 'quickbooks-1',
            severity: 'high',
            title: 'Slow sync performance',
            description: 'Invoice sync taking 10x longer than normal',
            status: 'identified',
            startedAt: new Date(Date.now() - 3600000),
          },
        ],
      });

      const response = await request(app).get('/api/integration-health/incidents').set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].incidentId).toBe('INC-001');
    });

    it('should filter incidents by status', async () => {
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [],
        incidents: [
          {
            incidentId: 'INC-001',
            severity: 'critical',
            title: 'Issue 1',
            status: 'open',
            startedAt: new Date(),
          },
          {
            incidentId: 'INC-002',
            severity: 'high',
            title: 'Issue 2',
            status: 'resolved',
            startedAt: new Date(),
            resolvedAt: new Date(),
          },
        ],
      });

      const response = await request(app)
        .get('/api/integration-health/incidents?status=open')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('open');
    });

    it('should filter incidents by severity', async () => {
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [],
        incidents: [
          {
            incidentId: 'INC-001',
            severity: 'critical',
            title: 'Critical Issue',
            status: 'open',
            startedAt: new Date(),
          },
          {
            incidentId: 'INC-002',
            severity: 'medium',
            title: 'Medium Issue',
            status: 'open',
            startedAt: new Date(),
          },
        ],
      });

      const response = await request(app)
        .get('/api/integration-health/incidents?severity=critical')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].severity).toBe('critical');
    });

    it('should filter incidents by integrationId', async () => {
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [],
        incidents: [
          {
            incidentId: 'INC-001',
            integrationId: 'quickbooks-1',
            severity: 'critical',
            title: 'QB Issue',
            status: 'open',
            startedAt: new Date(),
          },
          {
            incidentId: 'INC-002',
            integrationId: 'slack-1',
            severity: 'high',
            title: 'Slack Issue',
            status: 'open',
            startedAt: new Date(),
          },
        ],
      });

      const response = await request(app)
        .get('/api/integration-health/incidents?integrationId=quickbooks-1')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].integrationId).toBe('quickbooks-1');
    });
  });

  describe('POST /api/integration-health/incidents', () => {
    it('should create a new incident', async () => {
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [
          {
            integrationId: 'quickbooks-1',
            integrationType: 'quickbooks',
            name: 'QuickBooks Online',
            status: 'down',
            isEnabled: true,
          },
        ],
      });

      const response = await request(app)
        .post('/api/integration-health/incidents')
        .set(testHeaders)
        .send({
          integrationId: 'quickbooks-1',
          severity: 'critical',
          title: 'QuickBooks API Down',
          description: 'Cannot connect to QuickBooks API endpoints',
          affectedFeatures: ['Invoice Sync', 'Customer Sync', 'Payment Sync'],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.incidents).toHaveLength(1);
      expect(response.body.data.incidents[0].severity).toBe('critical');
      expect(response.body.data.incidents[0].title).toBe('QuickBooks API Down');
      expect(response.body.data.incidents[0].status).toBe('open');
      expect(response.body.data.incidents[0].affectedFeatures).toHaveLength(3);
    });

    it('should validate required fields for incident creation', async () => {
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [],
      });

      const response = await request(app)
        .post('/api/integration-health/incidents')
        .set(testHeaders)
        .send({
          severity: 'critical',
          // Missing title
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/integration-health/incidents/:incidentId', () => {
    it('should update incident status', async () => {
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [],
        incidents: [
          {
            incidentId: 'INC-001',
            severity: 'critical',
            title: 'API Down',
            status: 'open',
            startedAt: new Date(),
          },
        ],
      });

      const response = await request(app)
        .put('/api/integration-health/incidents/INC-001')
        .set(testHeaders)
        .send({
          status: 'investigating',
          updateMessage: 'Team is investigating the root cause',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('investigating');
      expect(response.body.data.updates).toHaveLength(1);
      expect(response.body.data.updates[0].message).toBe('Team is investigating the root cause');
    });

    it('should resolve an incident', async () => {
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [],
        incidents: [
          {
            incidentId: 'INC-001',
            severity: 'critical',
            title: 'API Down',
            status: 'investigating',
            startedAt: new Date(Date.now() - 3600000),
          },
        ],
      });

      const response = await request(app)
        .put('/api/integration-health/incidents/INC-001')
        .set(testHeaders)
        .send({
          status: 'resolved',
          updateMessage: 'Issue has been resolved. API is back online.',
          resolution: 'Restarted API gateway servers',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('resolved');
      expect(response.body.data.resolvedAt).toBeDefined();
      expect(response.body.data.resolution).toBe('Restarted API gateway servers');
    });

    it('should add multiple updates to incident', async () => {
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [],
        incidents: [
          {
            incidentId: 'INC-001',
            severity: 'critical',
            title: 'API Down',
            status: 'open',
            startedAt: new Date(),
            updates: [],
          },
        ],
      });

      // First update
      await request(app).put('/api/integration-health/incidents/INC-001').set(testHeaders).send({
        status: 'investigating',
        updateMessage: 'Started investigation',
      });

      // Second update
      const response = await request(app)
        .put('/api/integration-health/incidents/INC-001')
        .set(testHeaders)
        .send({
          status: 'identified',
          updateMessage: 'Found the root cause',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.updates).toHaveLength(2);
      expect(response.body.data.status).toBe('identified');
    });
  });

  describe('GET /api/integration-health/alerts', () => {
    it('should get all alerts', async () => {
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [],
        alerts: [
          {
            alertId: 'ALERT-001',
            integrationId: 'quickbooks-1',
            type: 'down',
            severity: 'critical',
            message: 'QuickBooks integration is down',
            acknowledged: false,
            triggeredAt: new Date(),
          },
          {
            alertId: 'ALERT-002',
            integrationId: 'slack-1',
            type: 'slow_response',
            severity: 'warning',
            message: 'Slack responses are slower than usual',
            acknowledged: false,
            triggeredAt: new Date(),
          },
        ],
      });

      const response = await request(app).get('/api/integration-health/alerts').set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should filter alerts by acknowledged status', async () => {
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [],
        alerts: [
          {
            alertId: 'ALERT-001',
            type: 'down',
            severity: 'critical',
            message: 'Integration down',
            acknowledged: false,
            triggeredAt: new Date(),
          },
          {
            alertId: 'ALERT-002',
            type: 'slow_response',
            severity: 'warning',
            message: 'Slow response',
            acknowledged: true,
            triggeredAt: new Date(),
          },
        ],
      });

      const response = await request(app)
        .get('/api/integration-health/alerts?acknowledged=false')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].acknowledged).toBe(false);
    });

    it('should filter alerts by severity', async () => {
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [],
        alerts: [
          {
            alertId: 'ALERT-001',
            type: 'down',
            severity: 'critical',
            message: 'Critical alert',
            acknowledged: false,
            triggeredAt: new Date(),
          },
          {
            alertId: 'ALERT-002',
            type: 'slow_response',
            severity: 'warning',
            message: 'Warning alert',
            acknowledged: false,
            triggeredAt: new Date(),
          },
        ],
      });

      const response = await request(app)
        .get('/api/integration-health/alerts?severity=critical')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].severity).toBe('critical');
    });
  });

  describe('POST /api/integration-health/alerts', () => {
    it('should create a new alert', async () => {
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [
          {
            integrationId: 'quickbooks-1',
            integrationType: 'quickbooks',
            name: 'QuickBooks Online',
            status: 'down',
            isEnabled: true,
          },
        ],
      });

      const response = await request(app)
        .post('/api/integration-health/alerts')
        .set(testHeaders)
        .send({
          integrationId: 'quickbooks-1',
          type: 'down',
          severity: 'critical',
          message: 'QuickBooks integration has gone down',
          metadata: {
            consecutiveFailures: 5,
            lastSuccessfulCheck: new Date(Date.now() - 600000),
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.alerts).toHaveLength(1);
      expect(response.body.data.alerts[0].type).toBe('down');
      expect(response.body.data.alerts[0].severity).toBe('critical');
      expect(response.body.data.alerts[0].acknowledged).toBe(false);
    });

    it('should create slow response alert', async () => {
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [],
      });

      const response = await request(app)
        .post('/api/integration-health/alerts')
        .set(testHeaders)
        .send({
          integrationId: 'slack-1',
          type: 'slow_response',
          severity: 'warning',
          message: 'Slack API response time exceeded threshold',
          metadata: {
            currentResponseTime: 3500,
            threshold: 2000,
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.data.alerts[0].type).toBe('slow_response');
    });

    it('should create error rate alert', async () => {
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [],
      });

      const response = await request(app)
        .post('/api/integration-health/alerts')
        .set(testHeaders)
        .send({
          integrationId: 'quickbooks-1',
          type: 'error_rate',
          severity: 'warning',
          message: 'Error rate has exceeded 10%',
          metadata: {
            errorRate: 15.5,
            threshold: 10,
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.data.alerts[0].type).toBe('error_rate');
    });
  });

  describe('POST /api/integration-health/alerts/:alertId/acknowledge', () => {
    it('should acknowledge an alert', async () => {
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [],
        alerts: [
          {
            alertId: 'ALERT-001',
            type: 'down',
            severity: 'critical',
            message: 'Integration down',
            acknowledged: false,
            triggeredAt: new Date(),
          },
        ],
      });

      const response = await request(app)
        .post('/api/integration-health/alerts/ALERT-001/acknowledge')
        .set(testHeaders)
        .send({
          acknowledgedBy: testUserId.toString(),
          note: 'Team is working on this',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.acknowledged).toBe(true);
      expect(response.body.data.acknowledgedAt).toBeDefined();
      expect(response.body.data.acknowledgedBy.toString()).toBe(testUserId.toString());
    });

    it('should return 404 for non-existent alert', async () => {
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [],
        alerts: [],
      });

      const response = await request(app)
        .post('/api/integration-health/alerts/NON-EXISTENT/acknowledge')
        .set(testHeaders)
        .send({
          acknowledgedBy: testUserId.toString(),
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/integration-health/notifications', () => {
    it('should get notification configuration', async () => {
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [],
        notificationConfig: {
          email: {
            enabled: true,
            recipients: ['admin@clinic.com'],
          },
          slack: {
            enabled: true,
            webhookUrl: 'https://hooks.slack.com/services/TEST',
            channel: '#alerts',
          },
        },
      });

      const response = await request(app)
        .get('/api/integration-health/notifications')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email.enabled).toBe(true);
      expect(response.body.data.email.recipients).toHaveLength(1);
      expect(response.body.data.slack.enabled).toBe(true);
    });
  });

  describe('PUT /api/integration-health/notifications', () => {
    it('should update notification configuration', async () => {
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [],
        notificationConfig: {
          email: {
            enabled: false,
            recipients: [],
          },
        },
      });

      const response = await request(app)
        .put('/api/integration-health/notifications')
        .set(testHeaders)
        .send({
          email: {
            enabled: true,
            recipients: ['admin@clinic.com', 'support@clinic.com'],
            sendOnCritical: true,
            sendOnWarning: true,
          },
          slack: {
            enabled: true,
            webhookUrl: 'https://hooks.slack.com/services/NEW/WEBHOOK',
            channel: '#integrations',
            mentionOnCritical: true,
          },
          sms: {
            enabled: true,
            phoneNumbers: ['+1234567890'],
            sendOnCriticalOnly: true,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email.enabled).toBe(true);
      expect(response.body.data.email.recipients).toHaveLength(2);
      expect(response.body.data.slack.enabled).toBe(true);
      expect(response.body.data.sms.enabled).toBe(true);
    });
  });

  describe('GET /api/integration-health/stats', () => {
    it('should get overall statistics', async () => {
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [
          {
            integrationId: 'quickbooks-1',
            integrationType: 'quickbooks',
            name: 'QuickBooks Online',
            status: 'healthy',
            isEnabled: true,
            uptimePercentage: 99.5,
            metrics: {
              totalRequests: 1000,
              successfulRequests: 995,
              failedRequests: 5,
            },
          },
          {
            integrationId: 'slack-1',
            integrationType: 'slack',
            name: 'Slack Workspace',
            status: 'degraded',
            isEnabled: true,
            uptimePercentage: 92.0,
            metrics: {
              totalRequests: 500,
              successfulRequests: 460,
              failedRequests: 40,
            },
          },
        ],
        incidents: [
          { incidentId: 'INC-001', status: 'open', severity: 'medium', startedAt: new Date() },
        ],
        alerts: [
          {
            alertId: 'ALERT-001',
            acknowledged: false,
            severity: 'warning',
            triggeredAt: new Date(),
          },
        ],
      });

      const response = await request(app).get('/api/integration-health/stats').set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalIntegrations).toBe(2);
      expect(response.body.data.healthyIntegrations).toBe(1);
      expect(response.body.data.degradedIntegrations).toBe(1);
      expect(response.body.data.totalIncidents).toBe(1);
      expect(response.body.data.openIncidents).toBe(1);
      expect(response.body.data.unacknowledgedAlerts).toBe(1);
      expect(response.body.data.averageUptime).toBeGreaterThan(0);
    });
  });

  describe('GET /api/integration-health/uptime/:integrationId', () => {
    it('should get uptime metrics for specific integration', async () => {
      const now = new Date();
      const checks = [];

      // Create 100 health checks over past 24 hours
      for (let i = 0; i < 100; i += 1) {
        checks.push({
          checkId: `CHECK-${i}`,
          integrationId: 'quickbooks-1',
          timestamp: new Date(now - i * 900000), // Every 15 minutes
          status: i < 95 ? 'success' : 'failure',
          responseTime: 250 + Math.random() * 200,
        });
      }

      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [
          {
            integrationId: 'quickbooks-1',
            integrationType: 'quickbooks',
            name: 'QuickBooks Online',
            status: 'healthy',
            isEnabled: true,
            uptimePercentage: 95.0,
          },
        ],
        healthChecks: checks,
      });

      const response = await request(app)
        .get('/api/integration-health/uptime/quickbooks-1?period=24h')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.integrationId).toBe('quickbooks-1');
      expect(response.body.data.period).toBe('24h');
      expect(response.body.data.uptime).toBeDefined();
      expect(response.body.data.totalChecks).toBe(100);
      expect(response.body.data.successfulChecks).toBe(95);
      expect(response.body.data.failedChecks).toBe(5);
    });

    it('should support different time periods', async () => {
      const now = new Date();
      const checks = [];

      for (let i = 0; i < 168; i += 1) {
        checks.push({
          checkId: `CHECK-${i}`,
          integrationId: 'quickbooks-1',
          timestamp: new Date(now - i * 3600000), // Every hour
          status: 'success',
          responseTime: 250,
        });
      }

      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [
          {
            integrationId: 'quickbooks-1',
            integrationType: 'quickbooks',
            name: 'QuickBooks Online',
            status: 'healthy',
            isEnabled: true,
          },
        ],
        healthChecks: checks,
      });

      const response = await request(app)
        .get('/api/integration-health/uptime/quickbooks-1?period=7d')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data.period).toBe('7d');
    });
  });

  describe('GET /api/integration-health/response-times/:integrationId', () => {
    it('should get response time metrics', async () => {
      const now = new Date();
      const checks = [];

      for (let i = 0; i < 50; i += 1) {
        checks.push({
          checkId: `CHECK-${i}`,
          integrationId: 'quickbooks-1',
          timestamp: new Date(now - i * 300000),
          status: 'success',
          responseTime: 200 + Math.random() * 300,
        });
      }

      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [
          {
            integrationId: 'quickbooks-1',
            integrationType: 'quickbooks',
            name: 'QuickBooks Online',
            status: 'healthy',
            isEnabled: true,
            responseTime: {
              current: 280,
              average: 300,
              min: 150,
              max: 500,
            },
          },
        ],
        healthChecks: checks,
      });

      const response = await request(app)
        .get('/api/integration-health/response-times/quickbooks-1?period=24h')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.integrationId).toBe('quickbooks-1');
      expect(response.body.data.average).toBeDefined();
      expect(response.body.data.min).toBeDefined();
      expect(response.body.data.max).toBeDefined();
      expect(response.body.data.p50).toBeDefined();
      expect(response.body.data.p95).toBeDefined();
      expect(response.body.data.p99).toBeDefined();
    });
  });

  describe('DELETE /api/integration-health/integrations/:integrationId', () => {
    it('should remove an integration from monitoring', async () => {
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [
          {
            integrationId: 'quickbooks-1',
            integrationType: 'quickbooks',
            name: 'QuickBooks Online',
            status: 'healthy',
            isEnabled: true,
          },
          {
            integrationId: 'slack-1',
            integrationType: 'slack',
            name: 'Slack Workspace',
            status: 'healthy',
            isEnabled: true,
          },
        ],
      });

      const response = await request(app)
        .delete('/api/integration-health/integrations/quickbooks-1')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.integrations).toHaveLength(1);
      expect(response.body.data.integrations[0].integrationId).toBe('slack-1');
    });
  });

  describe('PUT /api/integration-health/integrations/:integrationId/toggle', () => {
    it('should enable/disable integration monitoring', async () => {
      await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [
          {
            integrationId: 'quickbooks-1',
            integrationType: 'quickbooks',
            name: 'QuickBooks Online',
            status: 'healthy',
            isEnabled: true,
          },
        ],
      });

      const response = await request(app)
        .put('/api/integration-health/integrations/quickbooks-1/toggle')
        .set(testHeaders)
        .send({
          isEnabled: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isEnabled).toBe(false);
    });
  });

  describe('Virtual Fields', () => {
    it('should calculate overallHealthStatus virtual field', async () => {
      const healthMonitor = await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [
          {
            integrationId: 'quickbooks-1',
            integrationType: 'quickbooks',
            name: 'QuickBooks Online',
            status: 'healthy',
            isEnabled: true,
          },
          {
            integrationId: 'slack-1',
            integrationType: 'slack',
            name: 'Slack Workspace',
            status: 'degraded',
            isEnabled: true,
          },
        ],
      });

      expect(healthMonitor.overallHealthStatus).toBe('degraded');
    });

    it('should calculate healthScore virtual field', async () => {
      const healthMonitor = await IntegrationHealth.create({
        organization: testOrganizationId,
        integrations: [
          {
            integrationId: 'quickbooks-1',
            integrationType: 'quickbooks',
            name: 'QuickBooks Online',
            status: 'healthy',
            isEnabled: true,
            uptimePercentage: 99.5,
          },
          {
            integrationId: 'slack-1',
            integrationType: 'slack',
            name: 'Slack Workspace',
            status: 'healthy',
            isEnabled: true,
            uptimePercentage: 98.0,
          },
        ],
      });

      expect(healthMonitor.healthScore).toBeGreaterThan(90);
      expect(healthMonitor.healthScore).toBeLessThanOrEqual(100);
    });
  });
});
