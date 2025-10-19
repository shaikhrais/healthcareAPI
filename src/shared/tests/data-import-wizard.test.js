const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../server');
const DataImportWizard = require('../models/DataImportWizard');
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

describe('Data Import Wizard API - TASK-16.6', () => {
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
    await DataImportWizard.deleteMany({});
  });

  describe('POST /api/data-import/initialize', () => {
    it('should initialize data import wizard', async () => {
      const response = await request(app)
        .post('/api/data-import/initialize')
        .set(testHeaders)
        .send({
          settings: {
            maxFileSize: 20971520,
            maxRows: 100000,
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.organization.toString()).toBe(testOrganizationId.toString());
      expect(response.body.data.settings.maxFileSize).toBe(20971520);
    });

    it('should return existing wizard if already initialized', async () => {
      await DataImportWizard.create({
        organization: testOrganizationId,
      });

      const response = await request(app)
        .post('/api/data-import/initialize')
        .set(testHeaders)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('already initialized');
    });
  });

  describe('POST /api/data-import/jobs', () => {
    it('should create new import job', async () => {
      await DataImportWizard.create({
        organization: testOrganizationId,
        importJobs: [],
      });

      const response = await request(app).post('/api/data-import/jobs').set(testHeaders).send({
        name: 'Patient Import',
        description: 'Import patient data from CSV',
        sourceType: 'csv',
        targetEntity: 'patients',
        fileName: 'patients.csv',
        fileSize: 1024000,
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Patient Import');
      expect(response.body.data.sourceType).toBe('csv');
      expect(response.body.data.targetEntity).toBe('patients');
      expect(response.body.data.progress.status).toBe('pending');
    });
  });

  describe('GET /api/data-import/jobs', () => {
    it('should get all import jobs', async () => {
      await DataImportWizard.create({
        organization: testOrganizationId,
        importJobs: [
          {
            jobId: 'JOB-001',
            name: 'Patient Import',
            sourceType: 'csv',
            targetEntity: 'patients',
            uploadedBy: testUserId,
            progress: { status: 'pending' },
          },
          {
            jobId: 'JOB-002',
            name: 'Appointment Import',
            sourceType: 'xlsx',
            targetEntity: 'appointments',
            uploadedBy: testUserId,
            progress: { status: 'completed' },
          },
        ],
      });

      const response = await request(app).get('/api/data-import/jobs').set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.total).toBe(2);
    });

    it('should filter jobs by status', async () => {
      await DataImportWizard.create({
        organization: testOrganizationId,
        importJobs: [
          {
            jobId: 'JOB-001',
            name: 'Job 1',
            sourceType: 'csv',
            targetEntity: 'patients',
            uploadedBy: testUserId,
            progress: { status: 'pending' },
          },
          {
            jobId: 'JOB-002',
            name: 'Job 2',
            sourceType: 'csv',
            targetEntity: 'patients',
            uploadedBy: testUserId,
            progress: { status: 'completed' },
          },
        ],
      });

      const response = await request(app)
        .get('/api/data-import/jobs?status=completed')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].progress.status).toBe('completed');
    });

    it('should filter jobs by target entity', async () => {
      await DataImportWizard.create({
        organization: testOrganizationId,
        importJobs: [
          {
            jobId: 'JOB-001',
            name: 'Patient Import',
            sourceType: 'csv',
            targetEntity: 'patients',
            uploadedBy: testUserId,
            progress: { status: 'pending' },
          },
          {
            jobId: 'JOB-002',
            name: 'Staff Import',
            sourceType: 'csv',
            targetEntity: 'staff',
            uploadedBy: testUserId,
            progress: { status: 'pending' },
          },
        ],
      });

      const response = await request(app)
        .get('/api/data-import/jobs?targetEntity=patients')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].targetEntity).toBe('patients');
    });
  });

  describe('GET /api/data-import/jobs/:jobId', () => {
    it('should get specific job', async () => {
      await DataImportWizard.create({
        organization: testOrganizationId,
        importJobs: [
          {
            jobId: 'JOB-001',
            name: 'Patient Import',
            sourceType: 'csv',
            targetEntity: 'patients',
            fileName: 'patients.csv',
            uploadedBy: testUserId,
            progress: { status: 'pending' },
          },
        ],
      });

      const response = await request(app).get('/api/data-import/jobs/JOB-001').set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.jobId).toBe('JOB-001');
      expect(response.body.data.name).toBe('Patient Import');
    });

    it('should return 404 for non-existent job', async () => {
      await DataImportWizard.create({
        organization: testOrganizationId,
        importJobs: [],
      });

      const response = await request(app)
        .get('/api/data-import/jobs/NON-EXISTENT')
        .set(testHeaders);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/data-import/jobs/:jobId/analysis', () => {
    it('should update job analysis', async () => {
      await DataImportWizard.create({
        organization: testOrganizationId,
        importJobs: [
          {
            jobId: 'JOB-001',
            name: 'Patient Import',
            sourceType: 'csv',
            targetEntity: 'patients',
            uploadedBy: testUserId,
            progress: { status: 'pending' },
          },
        ],
      });

      const response = await request(app)
        .put('/api/data-import/jobs/JOB-001/analysis')
        .set(testHeaders)
        .send({
          totalRows: 500,
          totalColumns: 10,
          detectedHeaders: ['firstName', 'lastName', 'email', 'phone'],
          encoding: 'UTF-8',
          delimiter: ',',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.analysis.totalRows).toBe(500);
      expect(response.body.data.analysis.totalColumns).toBe(10);
    });
  });

  describe('PUT /api/data-import/jobs/:jobId/mapping', () => {
    it('should update job mapping', async () => {
      await DataImportWizard.create({
        organization: testOrganizationId,
        importJobs: [
          {
            jobId: 'JOB-001',
            name: 'Patient Import',
            sourceType: 'csv',
            targetEntity: 'patients',
            uploadedBy: testUserId,
            progress: { status: 'pending' },
          },
        ],
      });

      const response = await request(app)
        .put('/api/data-import/jobs/JOB-001/mapping')
        .set(testHeaders)
        .send({
          mapping: [
            {
              sourceColumn: 'First Name',
              targetField: 'firstName',
              transformation: 'trim',
              required: true,
            },
            {
              sourceColumn: 'Last Name',
              targetField: 'lastName',
              transformation: 'trim',
              required: true,
            },
            {
              sourceColumn: 'Email',
              targetField: 'email',
              transformation: 'email_normalize',
              required: true,
              validation: { type: 'email' },
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.mapping).toHaveLength(3);
      expect(response.body.data.mapping[0].sourceColumn).toBe('First Name');
      expect(response.body.data.mapping[0].targetField).toBe('firstName');
    });
  });

  describe('POST /api/data-import/jobs/:jobId/validate', () => {
    it('should validate job successfully', async () => {
      await DataImportWizard.create({
        organization: testOrganizationId,
        importJobs: [
          {
            jobId: 'JOB-001',
            name: 'Patient Import',
            sourceType: 'csv',
            targetEntity: 'patients',
            uploadedBy: testUserId,
            progress: { status: 'pending' },
          },
        ],
      });

      const response = await request(app)
        .post('/api/data-import/jobs/JOB-001/validate')
        .set(testHeaders)
        .send({
          isValid: true,
          totalRecords: 100,
          validRecords: 98,
          invalidRecords: 2,
          errors: [
            {
              row: 5,
              column: 'email',
              value: 'invalid-email',
              error: 'Invalid email format',
              severity: 'error',
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.validation.isValid).toBe(true);
      expect(response.body.data.validation.validRecords).toBe(98);
      expect(response.body.data.progress.status).toBe('validated');
    });

    it('should mark job as failed when validation fails', async () => {
      await DataImportWizard.create({
        organization: testOrganizationId,
        importJobs: [
          {
            jobId: 'JOB-001',
            name: 'Patient Import',
            sourceType: 'csv',
            targetEntity: 'patients',
            uploadedBy: testUserId,
            progress: { status: 'pending' },
          },
        ],
      });

      const response = await request(app)
        .post('/api/data-import/jobs/JOB-001/validate')
        .set(testHeaders)
        .send({
          isValid: false,
          totalRecords: 100,
          validRecords: 50,
          invalidRecords: 50,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.validation.isValid).toBe(false);
      expect(response.body.data.progress.status).toBe('failed');
    });
  });

  describe('POST /api/data-import/jobs/:jobId/import', () => {
    it('should start import', async () => {
      await DataImportWizard.create({
        organization: testOrganizationId,
        importJobs: [
          {
            jobId: 'JOB-001',
            name: 'Patient Import',
            sourceType: 'csv',
            targetEntity: 'patients',
            uploadedBy: testUserId,
            progress: { status: 'validated' },
          },
        ],
      });

      const response = await request(app)
        .post('/api/data-import/jobs/JOB-001/import')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.progress.status).toBe('importing');
      expect(response.body.data.progress.startedAt).toBeDefined();
    });

    it('should reject import if not validated', async () => {
      await DataImportWizard.create({
        organization: testOrganizationId,
        importJobs: [
          {
            jobId: 'JOB-001',
            name: 'Patient Import',
            sourceType: 'csv',
            targetEntity: 'patients',
            uploadedBy: testUserId,
            progress: { status: 'pending' },
          },
        ],
      });

      const response = await request(app)
        .post('/api/data-import/jobs/JOB-001/import')
        .set(testHeaders);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('must be validated');
    });
  });

  describe('PUT /api/data-import/jobs/:jobId/progress', () => {
    it('should update import progress', async () => {
      const startedAt = new Date();
      await DataImportWizard.create({
        organization: testOrganizationId,
        importJobs: [
          {
            jobId: 'JOB-001',
            name: 'Patient Import',
            sourceType: 'csv',
            targetEntity: 'patients',
            uploadedBy: testUserId,
            progress: {
              status: 'importing',
              totalRecords: 100,
              processedRecords: 0,
              startedAt,
            },
          },
        ],
      });

      const response = await request(app)
        .put('/api/data-import/jobs/JOB-001/progress')
        .set(testHeaders)
        .send({
          processedRecords: 50,
          successfulRecords: 48,
          failedRecords: 2,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.progress.processedRecords).toBe(50);
      expect(response.body.data.progress.percentage).toBe(50);
    });
  });

  describe('POST /api/data-import/jobs/:jobId/complete', () => {
    it('should complete import', async () => {
      await DataImportWizard.create({
        organization: testOrganizationId,
        importJobs: [
          {
            jobId: 'JOB-001',
            name: 'Patient Import',
            sourceType: 'csv',
            targetEntity: 'patients',
            uploadedBy: testUserId,
            progress: {
              status: 'importing',
              totalRecords: 100,
              startedAt: new Date(),
            },
          },
        ],
        analytics: {
          totalImports: 0,
          successfulImports: 0,
          totalRecordsImported: 0,
        },
      });

      const response = await request(app)
        .post('/api/data-import/jobs/JOB-001/complete')
        .set(testHeaders)
        .send({
          results: {
            insertedIds: ['ID1', 'ID2', 'ID3'],
            updatedIds: [],
            failedRecords: [],
            summary: {
              totalProcessed: 100,
              successful: 98,
              failed: 2,
              duplicates: 0,
              executionTime: 5000,
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.progress.status).toBe('completed');
      expect(response.body.data.progress.percentage).toBe(100);
      expect(response.body.data.results.summary.successful).toBe(98);
    });
  });

  describe('POST /api/data-import/jobs/:jobId/cancel', () => {
    it('should cancel import', async () => {
      await DataImportWizard.create({
        organization: testOrganizationId,
        importJobs: [
          {
            jobId: 'JOB-001',
            name: 'Patient Import',
            sourceType: 'csv',
            targetEntity: 'patients',
            uploadedBy: testUserId,
            progress: { status: 'importing' },
          },
        ],
      });

      const response = await request(app)
        .post('/api/data-import/jobs/JOB-001/cancel')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/data-import/jobs/:jobId/rollback', () => {
    it('should rollback import', async () => {
      await DataImportWizard.create({
        organization: testOrganizationId,
        importJobs: [
          {
            jobId: 'JOB-001',
            name: 'Patient Import',
            sourceType: 'csv',
            targetEntity: 'patients',
            uploadedBy: testUserId,
            progress: { status: 'completed' },
            rollback: {
              enabled: true,
              canRollback: true,
            },
          },
        ],
      });

      const response = await request(app)
        .post('/api/data-import/jobs/JOB-001/rollback')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject rollback if not available', async () => {
      await DataImportWizard.create({
        organization: testOrganizationId,
        importJobs: [
          {
            jobId: 'JOB-001',
            name: 'Patient Import',
            sourceType: 'csv',
            targetEntity: 'patients',
            uploadedBy: testUserId,
            progress: { status: 'completed' },
            rollback: {
              enabled: false,
              canRollback: false,
            },
          },
        ],
      });

      const response = await request(app)
        .post('/api/data-import/jobs/JOB-001/rollback')
        .set(testHeaders);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not available');
    });
  });

  describe('DELETE /api/data-import/jobs/:jobId', () => {
    it('should delete job', async () => {
      await DataImportWizard.create({
        organization: testOrganizationId,
        importJobs: [
          {
            jobId: 'JOB-001',
            name: 'Patient Import',
            sourceType: 'csv',
            targetEntity: 'patients',
            uploadedBy: testUserId,
            progress: { status: 'completed' },
          },
          {
            jobId: 'JOB-002',
            name: 'Staff Import',
            sourceType: 'csv',
            targetEntity: 'staff',
            uploadedBy: testUserId,
            progress: { status: 'completed' },
          },
        ],
      });

      const response = await request(app).delete('/api/data-import/jobs/JOB-001').set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const wizard = await DataImportWizard.findOne({ organization: testOrganizationId });
      expect(wizard.importJobs).toHaveLength(1);
      expect(wizard.importJobs[0].jobId).toBe('JOB-002');
    });
  });

  describe('GET /api/data-import/templates', () => {
    it('should get all templates', async () => {
      await DataImportWizard.create({
        organization: testOrganizationId,
        templates: [
          {
            templateId: 'TPL-001',
            name: 'Patient Template',
            targetEntity: 'patients',
            mapping: [],
            usageCount: 5,
            createdBy: testUserId,
          },
          {
            templateId: 'TPL-002',
            name: 'Appointment Template',
            targetEntity: 'appointments',
            mapping: [],
            usageCount: 3,
            createdBy: testUserId,
          },
        ],
      });

      const response = await request(app).get('/api/data-import/templates').set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].usageCount).toBe(5); // Sorted by usage
    });

    it('should filter templates by target entity', async () => {
      await DataImportWizard.create({
        organization: testOrganizationId,
        templates: [
          {
            templateId: 'TPL-001',
            name: 'Patient Template',
            targetEntity: 'patients',
            mapping: [],
            createdBy: testUserId,
          },
          {
            templateId: 'TPL-002',
            name: 'Staff Template',
            targetEntity: 'staff',
            mapping: [],
            createdBy: testUserId,
          },
        ],
      });

      const response = await request(app)
        .get('/api/data-import/templates?targetEntity=patients')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].targetEntity).toBe('patients');
    });
  });

  describe('POST /api/data-import/templates', () => {
    it('should create template', async () => {
      await DataImportWizard.create({
        organization: testOrganizationId,
        templates: [],
      });

      const response = await request(app)
        .post('/api/data-import/templates')
        .set(testHeaders)
        .send({
          name: 'Patient Standard Template',
          description: 'Standard patient import template',
          targetEntity: 'patients',
          mapping: [
            { sourceColumn: 'First Name', targetField: 'firstName', transformation: 'trim' },
            { sourceColumn: 'Last Name', targetField: 'lastName', transformation: 'trim' },
            { sourceColumn: 'Email', targetField: 'email', transformation: 'email_normalize' },
          ],
          isDefault: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Patient Standard Template');
      expect(response.body.data.mapping).toHaveLength(3);
      expect(response.body.data.isDefault).toBe(true);
    });
  });

  describe('PUT /api/data-import/templates/:templateId', () => {
    it('should update template', async () => {
      await DataImportWizard.create({
        organization: testOrganizationId,
        templates: [
          {
            templateId: 'TPL-001',
            name: 'Old Name',
            targetEntity: 'patients',
            mapping: [],
            createdBy: testUserId,
          },
        ],
      });

      const response = await request(app)
        .put('/api/data-import/templates/TPL-001')
        .set(testHeaders)
        .send({
          name: 'New Name',
          description: 'Updated description',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('New Name');
      expect(response.body.data.description).toBe('Updated description');
    });
  });

  describe('DELETE /api/data-import/templates/:templateId', () => {
    it('should delete template', async () => {
      await DataImportWizard.create({
        organization: testOrganizationId,
        templates: [
          {
            templateId: 'TPL-001',
            name: 'Template to Delete',
            targetEntity: 'patients',
            mapping: [],
            createdBy: testUserId,
          },
        ],
      });

      const response = await request(app)
        .delete('/api/data-import/templates/TPL-001')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const wizard = await DataImportWizard.findOne({ organization: testOrganizationId });
      expect(wizard.templates).toHaveLength(0);
    });
  });

  describe('POST /api/data-import/templates/:templateId/use', () => {
    it('should record template usage', async () => {
      await DataImportWizard.create({
        organization: testOrganizationId,
        templates: [
          {
            templateId: 'TPL-001',
            name: 'Patient Template',
            targetEntity: 'patients',
            mapping: [],
            usageCount: 0,
            createdBy: testUserId,
          },
        ],
      });

      const response = await request(app)
        .post('/api/data-import/templates/TPL-001/use')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.usageCount).toBe(1);
    });
  });

  describe('GET /api/data-import/field-mappings', () => {
    it('should get field mappings for all entities', async () => {
      await DataImportWizard.create({
        organization: testOrganizationId,
        fieldMappings: {
          patients: new Map([
            ['firstName', { label: 'First Name', type: 'string', required: true }],
            ['lastName', { label: 'Last Name', type: 'string', required: true }],
          ]),
        },
      });

      const response = await request(app).get('/api/data-import/field-mappings').set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.patients).toBeDefined();
    });

    it('should get field mappings for specific entity', async () => {
      await DataImportWizard.create({
        organization: testOrganizationId,
        fieldMappings: {
          patients: new Map([
            ['firstName', { label: 'First Name', type: 'string', required: true }],
          ]),
        },
      });

      const response = await request(app)
        .get('/api/data-import/field-mappings?targetEntity=patients')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /api/data-import/history', () => {
    it('should get import history', async () => {
      await DataImportWizard.create({
        organization: testOrganizationId,
        history: [
          {
            historyId: 'HIST-001',
            jobId: 'JOB-001',
            action: 'created',
            userId: testUserId,
            targetEntity: 'patients',
            status: 'pending',
            timestamp: new Date(),
          },
          {
            historyId: 'HIST-002',
            jobId: 'JOB-001',
            action: 'imported',
            userId: testUserId,
            targetEntity: 'patients',
            recordsProcessed: 100,
            status: 'completed',
            timestamp: new Date(),
          },
        ],
      });

      const response = await request(app).get('/api/data-import/history').set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should filter history by action', async () => {
      await DataImportWizard.create({
        organization: testOrganizationId,
        history: [
          {
            historyId: 'HIST-001',
            jobId: 'JOB-001',
            action: 'created',
            userId: testUserId,
            timestamp: new Date(),
          },
          {
            historyId: 'HIST-002',
            jobId: 'JOB-001',
            action: 'imported',
            userId: testUserId,
            timestamp: new Date(),
          },
        ],
      });

      const response = await request(app)
        .get('/api/data-import/history?action=imported')
        .set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].action).toBe('imported');
    });
  });

  describe('GET /api/data-import/analytics', () => {
    it('should get import analytics', async () => {
      await DataImportWizard.create({
        organization: testOrganizationId,
        importJobs: [
          {
            jobId: 'JOB-001',
            name: 'Job 1',
            sourceType: 'csv',
            targetEntity: 'patients',
            uploadedBy: testUserId,
            progress: { status: 'completed' },
          },
          {
            jobId: 'JOB-002',
            name: 'Job 2',
            sourceType: 'csv',
            targetEntity: 'patients',
            uploadedBy: testUserId,
            progress: { status: 'importing' },
          },
        ],
        analytics: {
          totalImports: 10,
          successfulImports: 8,
          failedImports: 2,
          totalRecordsImported: 5000,
          averageImportTime: 30,
        },
      });

      const response = await request(app).get('/api/data-import/analytics').set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalImports).toBe(10);
      expect(response.body.data.successfulImports).toBe(8);
      expect(response.body.data.activeJobs).toBe(1);
      expect(response.body.data.completedJobs).toBe(1);
    });
  });

  describe('GET /api/data-import/stats', () => {
    it('should get overall statistics', async () => {
      await DataImportWizard.create({
        organization: testOrganizationId,
        importJobs: [
          {
            jobId: 'JOB-001',
            name: 'Job 1',
            sourceType: 'csv',
            targetEntity: 'patients',
            uploadedBy: testUserId,
            progress: { status: 'completed' },
          },
          {
            jobId: 'JOB-002',
            name: 'Job 2',
            sourceType: 'csv',
            targetEntity: 'patients',
            uploadedBy: testUserId,
            progress: { status: 'failed' },
          },
        ],
        templates: [
          {
            templateId: 'TPL-001',
            name: 'Template 1',
            targetEntity: 'patients',
            mapping: [],
            createdBy: testUserId,
          },
        ],
        analytics: {
          totalImports: 10,
          successfulImports: 8,
          totalRecordsImported: 5000,
        },
      });

      const response = await request(app).get('/api/data-import/stats').set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalJobs).toBe(2);
      expect(response.body.data.completedJobs).toBe(1);
      expect(response.body.data.failedJobs).toBe(1);
      expect(response.body.data.totalTemplates).toBe(1);
      expect(response.body.data.totalRecordsImported).toBe(5000);
    });
  });

  describe('GET /api/data-import/settings', () => {
    it('should get import settings', async () => {
      await DataImportWizard.create({
        organization: testOrganizationId,
        settings: {
          maxFileSize: 10485760,
          maxRows: 50000,
          enableRollback: true,
        },
      });

      const response = await request(app).get('/api/data-import/settings').set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.maxFileSize).toBe(10485760);
      expect(response.body.data.maxRows).toBe(50000);
    });
  });

  describe('PUT /api/data-import/settings', () => {
    it('should update import settings', async () => {
      await DataImportWizard.create({
        organization: testOrganizationId,
        settings: {
          maxFileSize: 10485760,
        },
      });

      const response = await request(app).put('/api/data-import/settings').set(testHeaders).send({
        maxFileSize: 20971520,
        maxRows: 100000,
        enableRollback: false,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.maxFileSize).toBe(20971520);
      expect(response.body.data.maxRows).toBe(100000);
      expect(response.body.data.enableRollback).toBe(false);
    });
  });

  describe('POST /api/data-import/validate-file', () => {
    it('should validate file within limits', async () => {
      await DataImportWizard.create({
        organization: testOrganizationId,
        settings: {
          maxFileSize: 10485760,
          allowedFileTypes: ['csv', 'xlsx'],
        },
      });

      const response = await request(app)
        .post('/api/data-import/validate-file')
        .set(testHeaders)
        .send({
          fileName: 'patients.csv',
          fileSize: 5000000,
          fileType: 'csv',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(true);
      expect(response.body.data.errors).toHaveLength(0);
    });

    it('should reject file exceeding size limit', async () => {
      await DataImportWizard.create({
        organization: testOrganizationId,
        settings: {
          maxFileSize: 10485760,
          allowedFileTypes: ['csv', 'xlsx'],
        },
      });

      const response = await request(app)
        .post('/api/data-import/validate-file')
        .set(testHeaders)
        .send({
          fileName: 'patients.csv',
          fileSize: 20000000,
          fileType: 'csv',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.errors).toHaveLength(1);
      expect(response.body.data.errors[0].field).toBe('fileSize');
    });

    it('should reject invalid file type', async () => {
      await DataImportWizard.create({
        organization: testOrganizationId,
        settings: {
          maxFileSize: 10485760,
          allowedFileTypes: ['csv', 'xlsx'],
        },
      });

      const response = await request(app)
        .post('/api/data-import/validate-file')
        .set(testHeaders)
        .send({
          fileName: 'patients.pdf',
          fileSize: 5000000,
          fileType: 'pdf',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.errors[0].field).toBe('fileType');
    });
  });

  describe('GET /api/data-import/entities', () => {
    it('should get available target entities', async () => {
      const response = await request(app).get('/api/data-import/entities').set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(6);
      expect(response.body.data[0].value).toBe('patients');
      expect(response.body.data[0].requiredFields).toBeDefined();
    });
  });

  describe('GET /api/data-import/transformations', () => {
    it('should get available transformations', async () => {
      const response = await request(app).get('/api/data-import/transformations').set(testHeaders);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(9);
      expect(response.body.data.find((t) => t.value === 'uppercase')).toBeDefined();
      expect(response.body.data.find((t) => t.value === 'email_normalize')).toBeDefined();
    });
  });

  describe('Virtual Fields', () => {
    it('should calculate activeJobs', async () => {
      const wizard = await DataImportWizard.create({
        organization: testOrganizationId,
        importJobs: [
          {
            jobId: 'JOB-001',
            name: 'Job 1',
            sourceType: 'csv',
            targetEntity: 'patients',
            uploadedBy: testUserId,
            progress: { status: 'importing' },
          },
          {
            jobId: 'JOB-002',
            name: 'Job 2',
            sourceType: 'csv',
            targetEntity: 'patients',
            uploadedBy: testUserId,
            progress: { status: 'validating' },
          },
          {
            jobId: 'JOB-003',
            name: 'Job 3',
            sourceType: 'csv',
            targetEntity: 'patients',
            uploadedBy: testUserId,
            progress: { status: 'completed' },
          },
        ],
      });

      expect(wizard.activeJobs).toHaveLength(2);
    });

    it('should calculate successRate', async () => {
      const wizard = await DataImportWizard.create({
        organization: testOrganizationId,
        analytics: {
          totalImports: 10,
          successfulImports: 8,
        },
      });

      expect(parseFloat(wizard.successRate)).toBe(80.0);
    });
  });
});
