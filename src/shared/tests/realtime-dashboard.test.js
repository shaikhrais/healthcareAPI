const WebSocket = require('ws');
const jwt = require('jsonwebtoken');


const DashboardMetrics = require('../models/DashboardMetrics');
const websocketService = require('../services/websocket.service');
const Appointment = require('../models/Appointment');
const Payment = require('../models/Payment');
const Patient = require('../models/Patient');
const User = require('../models/User');
/* eslint-env jest */
/**
 * Real-Time Dashboard Tests
 *
 * Tests for:
 * - DashboardMetrics model
 * - WebSocket service
 * - Dashboard API endpoints
 */

chai.use(chaiHttp);

describe('Real-Time Dashboard System', () => {
  let server;
  let authToken;
  let testUser;
  let testPatient;
  let testAppointment;

  // ==================== SETUP & TEARDOWN ====================

  beforeAll(async () => {
    // Start test server
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret-key';

    // Create test user
    testUser = await User.create({
      firstName: 'Test',
      lastName: 'Admin',
      email: 'test.admin@example.com',
      password: 'hashedpassword123',
      role: 'full_access',
      active: true,
    });

    authToken = jwt.sign(
      { id: testUser._id, email: testUser.email, role: testUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create test patient
    testPatient = await Patient.create({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '555-0123',
      dateOfBirth: new Date('1990-01-01'),
    });

    // Create test practitioner
    const testPractitioner = await User.create({
      firstName: 'Dr. Sarah',
      lastName: 'Smith',
      email: 'dr.smith@example.com',
      password: 'hashedpassword123',
      role: 'practitioner',
      active: true,
    });

    // Create test appointment
    testAppointment = await Appointment.create({
      patient: testPatient._id,
      practitioner: testPractitioner._id,
      serviceType: 'Physiotherapy',
      appointmentType: 'consultation',
      startTime: new Date(),
      endTime: new Date(Date.now() + 60 * 60 * 1000),
      duration: 60,
      status: 'completed',
    });

    // Create test payment
    await Payment.create({
      patientId: testPatient._id,
      appointmentId: testAppointment._id,
      amount: 150.0,
      currency: 'USD',
      paymentMethod: 'credit_card',
      status: 'completed',
      processedBy: testUser._id,
      receiptNumber: 'RCP-TEST-00001',
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await DashboardMetrics.deleteMany({});
    await Appointment.deleteMany({});
    await Payment.deleteMany({});
    await Patient.deleteMany({});
    await User.deleteMany({});

    // Close WebSocket server
    if (websocketService.wss) {
      websocketService.close();
    }
  });

  // ==================== DASHBOARD METRICS MODEL TESTS ====================

  describe('DashboardMetrics Model', () => {
    beforeEach(async () => {
      await DashboardMetrics.deleteMany({});
    });

    describe('getOrCreate()', () => {
      it('should create a new metric if it does not exist', async () => {
        const metric = await DashboardMetrics.getOrCreate('overview', 'global');

        expect(metric).to.exist;
        expect(metric.metricType).to.equal('overview');
        expect(metric.scope).to.equal('global');
        expect(metric.data).to.deep.equal({});
      });

      it('should return existing metric if it already exists', async () => {
        const metric1 = await DashboardMetrics.getOrCreate('overview', 'global');
        const metric2 = await DashboardMetrics.getOrCreate('overview', 'global');

        expect(metric1._id.toString()).to.equal(metric2._id.toString());
      });
    });

    describe('getValid()', () => {
      it('should return valid metric that has not expired', async () => {
        const metric = await DashboardMetrics.getOrCreate('overview', 'global');
        metric.data = { test: 'data' };
        metric.validUntil = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
        metric.isStale = false;
        await metric.save();

        const validMetric = await DashboardMetrics.getValid('overview', 'global');

        expect(validMetric).to.exist;
        expect(validMetric.data.test).to.equal('data');
        expect(validMetric.accessCount).to.equal(1);
      });

      it('should return null for expired metric', async () => {
        const metric = await DashboardMetrics.getOrCreate('overview', 'global');
        metric.validUntil = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
        await metric.save();

        const validMetric = await DashboardMetrics.getValid('overview', 'global');

        expect(validMetric).to.be.null;
      });

      it('should return null for stale metric', async () => {
        const metric = await DashboardMetrics.getOrCreate('overview', 'global');
        metric.validUntil = new Date(Date.now() + 5 * 60 * 1000);
        metric.isStale = true;
        await metric.save();

        const validMetric = await DashboardMetrics.getValid('overview', 'global');

        expect(validMetric).to.be.null;
      });
    });

    describe('refresh()', () => {
      it('should update metric data and reset expiration', async () => {
        const metric = await DashboardMetrics.getOrCreate('overview', 'global');
        const oldVersion = metric.version;

        await metric.refresh({ updated: 'data' });

        expect(metric.data.updated).to.equal('data');
        expect(metric.isStale).to.be.false;
        expect(metric.version).to.equal(oldVersion + 1);
        expect(metric.validUntil).to.be.gt(new Date());
      });
    });

    describe('calculateOverview()', () => {
      it('should calculate correct overview metrics', async () => {
        const overview = await DashboardMetrics.calculateOverview();

        expect(overview).to.have.property('appointmentsToday');
        expect(overview).to.have.property('revenueToday');
        expect(overview).to.have.property('patientsActive');
        expect(overview).to.have.property('appointmentsWeek');
        expect(overview).to.have.property('revenueMonth');

        expect(overview.appointmentsToday.total).to.be.a('number');
        expect(overview.revenueToday.total).to.be.a('number');
        expect(overview.revenueToday.currency).to.equal('USD');
      });
    });

    describe('calculatePractitionerUtilization()', () => {
      it('should calculate practitioner utilization correctly', async () => {
        const utilization = await DashboardMetrics.calculatePractitionerUtilization();

        expect(utilization).to.have.property('practitioners');
        expect(utilization).to.have.property('avgUtilization');
        expect(utilization.practitioners).to.be.an('array');

        if (utilization.practitioners.length > 0) {
          const practitioner = utilization.practitioners[0];
          expect(practitioner).to.have.property('practitionerId');
          expect(practitioner).to.have.property('name');
          expect(practitioner).to.have.property('appointments');
          expect(practitioner).to.have.property('utilization');
          expect(practitioner.utilization).to.be.gte(0);
          expect(practitioner.utilization).to.be.lte(100);
        }
      });
    });

    describe('calculateSystemHealth()', () => {
      it('should calculate system health metrics', async () => {
        const health = await DashboardMetrics.calculateSystemHealth();

        expect(health).to.have.property('status');
        expect(health).to.have.property('anomalies');
        expect(health).to.have.property('uptime');
        expect(health).to.have.property('memory');

        expect(health.status).to.be.oneOf(['healthy', 'warning', 'critical']);
        expect(health.uptime).to.be.a('number');
        expect(health.memory.used).to.be.a('number');
        expect(health.memory.total).to.be.a('number');
      });
    });

    describe('invalidateAll()', () => {
      it('should mark all metrics as stale', async () => {
        await DashboardMetrics.create({
          metricType: 'overview',
          scope: 'global',
          data: {},
          validUntil: new Date(Date.now() + 5 * 60 * 1000),
          isStale: false,
        });

        await DashboardMetrics.create({
          metricType: 'system_health',
          scope: 'global',
          data: {},
          validUntil: new Date(Date.now() + 5 * 60 * 1000),
          isStale: false,
        });

        const count = await DashboardMetrics.invalidateAll();

        expect(count).to.be.gte(2);

        const metrics = await DashboardMetrics.find({});
        metrics.forEach((metric) => {
          expect(metric.isStale).to.be.true;
        });
      });

      it('should mark only specific metric type as stale', async () => {
        await DashboardMetrics.create({
          metricType: 'overview',
          scope: 'global',
          data: {},
          validUntil: new Date(Date.now() + 5 * 60 * 1000),
          isStale: false,
        });

        await DashboardMetrics.create({
          metricType: 'system_health',
          scope: 'global',
          data: {},
          validUntil: new Date(Date.now() + 5 * 60 * 1000),
          isStale: false,
        });

        const count = await DashboardMetrics.invalidateAll('overview');

        expect(count).to.equal(1);

        const overviewMetric = await DashboardMetrics.findOne({ metricType: 'overview' });
        const healthMetric = await DashboardMetrics.findOne({ metricType: 'system_health' });

        expect(overviewMetric.isStale).to.be.true;
        expect(healthMetric.isStale).to.be.false;
      });
    });

    describe('cleanupExpired()', () => {
      it('should delete old expired metrics', async () => {
        await DashboardMetrics.create({
          metricType: 'overview',
          scope: 'global',
          data: {},
          validUntil: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
        });

        await DashboardMetrics.create({
          metricType: 'overview',
          scope: 'global',
          data: {},
          validUntil: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
        });

        const deletedCount = await DashboardMetrics.cleanupExpired();

        expect(deletedCount).to.equal(1);

        const remaining = await DashboardMetrics.countDocuments({});
        expect(remaining).to.equal(1);
      });
    });
  });

  // ==================== WEBSOCKET SERVICE TESTS ====================

  describe('WebSocket Service', () => {
    let testWsServer;
    const testPort = 5555;

    beforeAll(() => {
      // Create test WebSocket server
      const http = require('http');
      testWsServer = http.createServer();
      websocketService.initialize(testWsServer);
      testWsServer.listen(testPort);
    });

    afterAll((done) => {
      testWsServer.close(done);
    });

    describe('Connection', () => {
      it('should reject connection without token', (done) => {
        const ws = new WebSocket(`ws://localhost:${testPort}/ws/dashboard`);

        ws.on('close', (code) => {
          expect(code).to.equal(1008); // Authentication required
          done();
        });
      });

      it('should accept connection with valid token', (done) => {
        const token = jwt.sign(
          { id: testUser._id, email: testUser.email },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        );

        const ws = new WebSocket(`ws://localhost:${testPort}/ws/dashboard?token=${token}`);

        ws.on('open', () => {
          expect(ws.readyState).to.equal(WebSocket.OPEN);
          ws.close();
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data);
          if (message.type === 'connected') {
            expect(message.userId).to.exist;
            done();
          }
        });
      });

      it('should reject connection with invalid token', (done) => {
        const ws = new WebSocket(`ws://localhost:${testPort}/ws/dashboard?token=invalid-token`);

        ws.on('close', (code) => {
          expect(code).to.equal(1008); // Authentication failed
          done();
        });
      });
    });

    describe('Subscriptions', () => {
      it('should handle subscription to metrics', (done) => {
        const token = jwt.sign({ id: testUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const ws = new WebSocket(`ws://localhost:${testPort}/ws/dashboard?token=${token}`);

        ws.on('open', () => {
          ws.send(
            JSON.stringify({
              type: 'subscribe',
              metrics: 'overview',
            })
          );
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data);
          if (message.type === 'subscribed') {
            expect(message.metrics).to.include('overview');
            ws.close();
            done();
          }
        });
      });

      it('should handle unsubscription from metrics', (done) => {
        const token = jwt.sign({ id: testUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const ws = new WebSocket(`ws://localhost:${testPort}/ws/dashboard?token=${token}`);

        ws.on('open', () => {
          ws.send(
            JSON.stringify({
              type: 'unsubscribe',
              metrics: 'overview',
            })
          );
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data);
          if (message.type === 'unsubscribed') {
            expect(message.metrics).to.include('overview');
            ws.close();
            done();
          }
        });
      });
    });

    describe('Broadcasting', () => {
      it('should broadcast metric updates to subscribed clients', (done) => {
        const token = jwt.sign({ id: testUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const ws = new WebSocket(`ws://localhost:${testPort}/ws/dashboard?token=${token}`);

        ws.on('open', () => {
          // Subscribe to overview
          ws.send(
            JSON.stringify({
              type: 'subscribe',
              metrics: 'overview',
            })
          );

          // Wait a bit then broadcast
          setTimeout(() => {
            websocketService.broadcastMetricUpdate('overview', { test: 'data' });
          }, 100);
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data);
          if (message.type === 'metric_update') {
            expect(message.metricType).to.equal('overview');
            expect(message.data.test).to.equal('data');
            ws.close();
            done();
          }
        });
      });

      it('should broadcast alerts to all connected clients', (done) => {
        const token = jwt.sign({ id: testUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const ws = new WebSocket(`ws://localhost:${testPort}/ws/dashboard?token=${token}`);

        ws.on('open', () => {
          setTimeout(() => {
            websocketService.broadcastAlert({
              severity: 'warning',
              title: 'Test Alert',
              message: 'This is a test alert',
            });
          }, 100);
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data);
          if (message.type === 'alert') {
            expect(message.severity).to.equal('warning');
            expect(message.title).to.equal('Test Alert');
            ws.close();
            done();
          }
        });
      });
    });

    describe('Statistics', () => {
      it('should return connection statistics', () => {
        const stats = websocketService.getStats();

        expect(stats).to.have.property('totalConnections');
        expect(stats).to.have.property('uniqueUsers');
        expect(stats).to.have.property('activeSubscriptions');

        expect(stats.totalConnections).to.be.a('number');
        expect(stats.uniqueUsers).to.be.a('number');
      });
    });
  });

  // ==================== API ENDPOINT TESTS ====================

  describe('Dashboard API Endpoints', () => {
    describe('GET /api/analytics/dashboard/overview', () => {
      it('should return overview metrics', async () => {
        const res = await chai
          .request(server)
          .get('/api/analytics/dashboard/overview')
          .set('Authorization', `Bearer ${authToken}`);

        expect(res).to.have.status(200);
        expect(res.body.success).to.be.true;
        expect(res.body.data).to.have.property('appointmentsToday');
        expect(res.body.data).to.have.property('revenueToday');
        expect(res.body.metadata).to.have.property('calculatedAt');
        expect(res.body.metadata).to.have.property('validUntil');
      });

      it('should return cached metrics on subsequent calls', async () => {
        const res1 = await chai
          .request(server)
          .get('/api/analytics/dashboard/overview')
          .set('Authorization', `Bearer ${authToken}`);

        const res2 = await chai
          .request(server)
          .get('/api/analytics/dashboard/overview')
          .set('Authorization', `Bearer ${authToken}`);

        expect(res1.body.metadata.calculatedAt).to.equal(res2.body.metadata.calculatedAt);
      });

      it('should require authentication', async () => {
        const res = await chai.request(server).get('/api/analytics/dashboard/overview');

        expect(res).to.have.status(401);
      });
    });

    describe('GET /api/analytics/dashboard/practitioners', () => {
      it('should return practitioner utilization metrics', async () => {
        const res = await chai
          .request(server)
          .get('/api/analytics/dashboard/practitioners')
          .set('Authorization', `Bearer ${authToken}`);

        expect(res).to.have.status(200);
        expect(res.body.success).to.be.true;
        expect(res.body.data).to.have.property('practitioners');
        expect(res.body.data).to.have.property('avgUtilization');
      });

      it('should require admin authorization', async () => {
        // Create non-admin user
        const normalUser = await User.create({
          firstName: 'Normal',
          lastName: 'User',
          email: 'normal@example.com',
          password: 'hashedpassword123',
          role: 'patient',
          active: true,
        });

        const normalToken = jwt.sign(
          { id: normalUser._id, role: normalUser.role },
          process.env.JWT_SECRET
        );

        const res = await chai
          .request(server)
          .get('/api/analytics/dashboard/practitioners')
          .set('Authorization', `Bearer ${normalToken}`);

        expect(res).to.have.status(403);
      });
    });

    describe('GET /api/analytics/dashboard/system-health', () => {
      it('should return system health metrics', async () => {
        const res = await chai
          .request(server)
          .get('/api/analytics/dashboard/system-health')
          .set('Authorization', `Bearer ${authToken}`);

        expect(res).to.have.status(200);
        expect(res.body.success).to.be.true;
        expect(res.body.data).to.have.property('status');
        expect(res.body.data).to.have.property('anomalies');
        expect(res.body.data).to.have.property('uptime');
        expect(res.body.data).to.have.property('memory');
      });
    });

    describe('POST /api/analytics/dashboard/refresh', () => {
      it('should invalidate all metrics', async () => {
        const res = await chai
          .request(server)
          .post('/api/analytics/dashboard/refresh')
          .set('Authorization', `Bearer ${authToken}`)
          .send({});

        expect(res).to.have.status(200);
        expect(res.body.success).to.be.true;
        expect(res.body.count).to.be.a('number');
      });

      it('should invalidate specific metric type', async () => {
        const res = await chai
          .request(server)
          .post('/api/analytics/dashboard/refresh')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ metricType: 'overview' });

        expect(res).to.have.status(200);
        expect(res.body.success).to.be.true;
        expect(res.body.metricType).to.equal('overview');
      });

      it('should require admin authorization', async () => {
        const normalUser = await User.create({
          firstName: 'Normal2',
          lastName: 'User2',
          email: 'normal2@example.com',
          password: 'hashedpassword123',
          role: 'patient',
          active: true,
        });

        const normalToken = jwt.sign(
          { id: normalUser._id, role: normalUser.role },
          process.env.JWT_SECRET
        );

        const res = await chai
          .request(server)
          .post('/api/analytics/dashboard/refresh')
          .set('Authorization', `Bearer ${normalToken}`)
          .send({});

        expect(res).to.have.status(403);
      });
    });

    describe('GET /api/analytics/dashboard/ws-token', () => {
      it('should return WebSocket authentication token', async () => {
        const res = await chai
          .request(server)
          .get('/api/analytics/dashboard/ws-token')
          .set('Authorization', `Bearer ${authToken}`);

        expect(res).to.have.status(200);
        expect(res.body.success).to.be.true;
        expect(res.body).to.have.property('token');
        expect(res.body).to.have.property('wsUrl');
        expect(res.body).to.have.property('expiresIn');

        // Verify token is valid JWT
        const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
        expect(decoded.id).to.equal(testUser._id.toString());
      });

      it('should require authentication', async () => {
        const res = await chai.request(server).get('/api/analytics/dashboard/ws-token');

        expect(res).to.have.status(401);
      });
    });

    describe('GET /api/analytics/dashboard/stats', () => {
      it('should return WebSocket connection statistics', async () => {
        const res = await chai
          .request(server)
          .get('/api/analytics/dashboard/stats')
          .set('Authorization', `Bearer ${authToken}`);

        expect(res).to.have.status(200);
        expect(res.body.success).to.be.true;
        expect(res.body.stats).to.have.property('totalConnections');
        expect(res.body.stats).to.have.property('uniqueUsers');
      });
    });

    describe('POST /api/analytics/dashboard/broadcast', () => {
      it('should broadcast metric update', async () => {
        const res = await chai
          .request(server)
          .post('/api/analytics/dashboard/broadcast')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ metricType: 'overview' });

        expect(res).to.have.status(200);
        expect(res.body.success).to.be.true;
        expect(res.body.metricType).to.equal('overview');
      });

      it('should return error for invalid metric type', async () => {
        const res = await chai
          .request(server)
          .post('/api/analytics/dashboard/broadcast')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ metricType: 'invalid_metric' });

        expect(res).to.have.status(400);
      });
    });

    describe('POST /api/analytics/dashboard/alert', () => {
      it('should broadcast system alert', async () => {
        const res = await chai
          .request(server)
          .post('/api/analytics/dashboard/alert')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            severity: 'warning',
            title: 'Test Alert',
            message: 'This is a test alert',
          });

        expect(res).to.have.status(200);
        expect(res.body.success).to.be.true;
        expect(res.body.alert.severity).to.equal('warning');
      });

      it('should require all alert fields', async () => {
        const res = await chai
          .request(server)
          .post('/api/analytics/dashboard/alert')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ severity: 'warning' });

        expect(res).to.have.status(400);
      });
    });
  });
});
