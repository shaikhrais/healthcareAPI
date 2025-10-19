/**
 * Comprehensive Payment System Test Suite
 * Tests all payment processing, billing, and financial APIs
 */

const request = require('supertest');
const { expect } = require('chai');
const mongoose = require('mongoose');
const app = require('../server');

describe('Payment System Comprehensive Tests', () => {
  let authToken;
  let testPatientId;
  let testBillId;
  let testPaymentId;

  // Mock Stripe for testing
  const mockStripe = {
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret_456',
        status: 'requires_payment_method'
      }),
      confirm: jest.fn().mockResolvedValue({
        id: 'pi_test_123',
        status: 'succeeded',
        charges: {
          data: [{
            id: 'ch_test_456',
            payment_method_details: {
              card: { last4: '4242', brand: 'visa' }
            }
          }]
        }
      })
    },
    refunds: {
      create: jest.fn().mockResolvedValue({
        id: 're_test_789',
        status: 'succeeded',
        amount: 5000
      })
    }
  };

  before(async () => {
    // Setup test database
    await mongoose.connect(process.env.TEST_DB_URI || 'mongodb://localhost:27017/test');
    
    // Create test user and get auth token
    const authResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'test123',
        role: 'admin',
        name: 'Test Admin'
      });
    
    authToken = authResponse.body.token;

    // Create test patient
    const patientResponse = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        dateOfBirth: '1990-01-01'
      });
    
    testPatientId = patientResponse.body.patient.id;
  });

  after(async () => {
    // Cleanup test data
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  describe('Billing Management', () => {
    it('should create a new bill for patient', async () => {
      const billData = {
        patientId: testPatientId,
        description: 'Medical Consultation',
        amount: 150.00,
        category: 'consultation',
        serviceDate: '2024-01-15',
        dueDate: '2024-02-15',
        insuranceCovered: false
      };

      const response = await request(app)
        .post('/api/billing/bills')
        .set('Authorization', `Bearer ${authToken}`)
        .send(billData)
        .expect(201);

      expect(response.body.success).to.be.true;
      expect(response.body.bill).to.have.property('id');
      expect(response.body.bill.amount).to.equal(150.00);
      expect(response.body.bill.status).to.equal('unpaid');
      
      testBillId = response.body.bill.id;
    });

    it('should retrieve patient bills', async () => {
      const response = await request(app)
        .get(`/api/billing/patient/${testPatientId}/bills`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.bills).to.be.an('array');
      expect(response.body.bills.length).to.be.greaterThan(0);
      expect(response.body.bills[0].patientId).to.equal(testPatientId);
    });

    it('should update bill status', async () => {
      const response = await request(app)
        .patch(`/api/billing/bills/${testBillId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'paid', paidAt: new Date().toISOString() })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.bill.status).to.equal('paid');
    });

    it('should generate invoice for bill', async () => {
      const response = await request(app)
        .post(`/api/billing/bills/${testBillId}/invoice`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.invoice).to.have.property('id');
      expect(response.body.invoice).to.have.property('pdfUrl');
    });

    it('should handle invalid bill creation', async () => {
      const invalidBillData = {
        patientId: 'invalid-id',
        amount: -50.00 // Invalid negative amount
      };

      const response = await request(app)
        .post('/api/billing/bills')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidBillData)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.contain('validation');
    });
  });

  describe('Stripe Payment Processing', () => {
    beforeEach(() => {
      // Reset Stripe mocks
      jest.clearAllMocks();
    });

    it('should setup Stripe payment intent', async () => {
      const setupData = {
        amount: 150.00,
        patientId: testPatientId,
        currency: 'usd'
      };

      const response = await request(app)
        .post('/api/payments/stripe/setup')
        .set('Authorization', `Bearer ${authToken}`)
        .send(setupData)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.paymentIntent).to.have.property('id');
      expect(response.body.paymentIntent).to.have.property('client_secret');
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 15000, // Amount in cents
        currency: 'usd',
        metadata: { patientId: testPatientId }
      });
    });

    it('should confirm Stripe payment', async () => {
      const confirmData = {
        paymentIntentId: 'pi_test_123',
        paymentMethodId: 'pm_test_456'
      };

      const response = await request(app)
        .post('/api/payments/stripe/confirm')
        .set('Authorization', `Bearer ${authToken}`)
        .send(confirmData)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.payment).to.have.property('id');
      expect(response.body.payment.status).to.equal('success');
      expect(response.body.payment.transactionId).to.equal('ch_test_456');
      
      testPaymentId = response.body.payment.id;
    });

    it('should handle Stripe payment failure', async () => {
      // Mock Stripe failure
      mockStripe.paymentIntents.confirm.mockRejectedValueOnce({
        type: 'StripeCardError',
        code: 'card_declined',
        message: 'Your card was declined.'
      });

      const confirmData = {
        paymentIntentId: 'pi_test_declined',
        paymentMethodId: 'pm_test_declined'
      };

      const response = await request(app)
        .post('/api/payments/stripe/confirm')
        .set('Authorization', `Bearer ${authToken}`)
        .send(confirmData)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.contain('declined');
    });
  });

  describe('Payment Processing', () => {
    it('should process cash payment', async () => {
      const paymentData = {
        patientId: testPatientId,
        amount: 75.50,
        method: 'cash',
        description: 'Co-payment for consultation',
        receivedBy: 'Test Admin'
      };

      const response = await request(app)
        .post('/api/payments/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.payment.method).to.equal('cash');
      expect(response.body.payment.amount).to.equal(75.50);
      expect(response.body.payment.status).to.equal('success');
    });

    it('should process check payment', async () => {
      const paymentData = {
        patientId: testPatientId,
        amount: 200.00,
        method: 'check',
        description: 'Lab services payment',
        checkNumber: 'CHK001',
        bankName: 'First National Bank'
      };

      const response = await request(app)
        .post('/api/payments/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.payment.method).to.equal('check');
      expect(response.body.payment.checkNumber).to.equal('CHK001');
    });

    it('should validate payment data', async () => {
      const invalidPaymentData = {
        patientId: testPatientId,
        amount: 0, // Invalid amount
        method: 'invalid_method'
      };

      const response = await request(app)
        .post('/api/payments/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidPaymentData)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.contain('validation');
    });

    it('should require authentication for payment processing', async () => {
      const paymentData = {
        patientId: testPatientId,
        amount: 100.00,
        method: 'cash'
      };

      const response = await request(app)
        .post('/api/payments/process')
        .send(paymentData)
        .expect(401);

      expect(response.body.error).to.contain('authorization');
    });
  });

  describe('Payment History', () => {
    it('should retrieve patient payment history', async () => {
      const response = await request(app)
        .get(`/api/payments/patient/${testPatientId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.payments).to.be.an('array');
      expect(response.body.totalAmount).to.be.a('number');
    });

    it('should filter payment history by date range', async () => {
      const fromDate = '2024-01-01';
      const toDate = '2024-12-31';

      const response = await request(app)
        .get(`/api/payments/history?from=${fromDate}&to=${toDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.payments).to.be.an('array');
    });

    it('should filter payment history by method', async () => {
      const response = await request(app)
        .get('/api/payments/history?method=cash')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.payments).to.be.an('array');
      
      if (response.body.payments.length > 0) {
        expect(response.body.payments[0].method).to.equal('cash');
      }
    });

    it('should export payment history', async () => {
      const response = await request(app)
        .get('/api/payments/export')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).to.contain('text/csv');
      expect(response.text).to.contain('Date,Patient,Amount');
    });
  });

  describe('Refund Processing', () => {
    it('should process payment refund', async () => {
      const refundData = {
        amount: 50.00,
        reason: 'Service cancellation'
      };

      const response = await request(app)
        .post(`/api/payments/${testPaymentId}/refund`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(refundData)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.refund).to.have.property('id');
      expect(response.body.refund.amount).to.equal(50.00);
      expect(response.body.refund.status).to.equal('success');
    });

    it('should handle refund validation errors', async () => {
      const invalidRefundData = {
        amount: -25.00, // Invalid negative amount
        reason: ''
      };

      const response = await request(app)
        .post(`/api/payments/${testPaymentId}/refund`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidRefundData)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.contain('validation');
    });

    it('should prevent refund exceeding original amount', async () => {
      const excessiveRefundData = {
        amount: 1000.00, // More than original payment
        reason: 'Testing excessive refund'
      };

      const response = await request(app)
        .post(`/api/payments/${testPaymentId}/refund`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(excessiveRefundData)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.contain('exceeds');
    });
  });

  describe('Payment Analytics', () => {
    it('should retrieve payment analytics', async () => {
      const response = await request(app)
        .get('/api/payments/analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.analytics).to.have.property('totalRevenue');
      expect(response.body.analytics).to.have.property('paymentMethods');
      expect(response.body.analytics).to.have.property('monthlyTrends');
    });

    it('should retrieve payment analytics by date range', async () => {
      const fromDate = '2024-01-01';
      const toDate = '2024-12-31';

      const response = await request(app)
        .get(`/api/payments/analytics?from=${fromDate}&to=${toDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.analytics.dateRange).to.deep.equal({
        from: fromDate,
        to: toDate
      });
    });
  });

  describe('Payment Security', () => {
    it('should sanitize payment input data', async () => {
      const paymentWithXSS = {
        patientId: testPatientId,
        amount: 100.00,
        method: 'cash',
        description: '<script>alert("xss")</script>Legitimate payment'
      };

      const response = await request(app)
        .post('/api/payments/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentWithXSS)
        .expect(200);

      expect(response.body.payment.description).to.not.contain('<script>');
      expect(response.body.payment.description).to.contain('Legitimate payment');
    });

    it('should rate limit payment processing', async () => {
      const paymentData = {
        patientId: testPatientId,
        amount: 10.00,
        method: 'cash'
      };

      // Make multiple rapid requests to trigger rate limiting
      const promises = Array.from({ length: 20 }, () =>
        request(app)
          .post('/api/payments/process')
          .set('Authorization', `Bearer ${authToken}`)
          .send(paymentData)
      );

      const responses = await Promise.all(promises);
      const rateLimited = responses.some(res => res.status === 429);
      
      expect(rateLimited).to.be.true;
    });

    it('should log payment activities', async () => {
      const paymentData = {
        patientId: testPatientId,
        amount: 25.00,
        method: 'cash',
        description: 'Security test payment'
      };

      const response = await request(app)
        .post('/api/payments/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(200);

      expect(response.body.success).to.be.true;
      
      // Verify audit log entry was created
      const auditResponse = await request(app)
        .get('/api/audit/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const auditEntries = auditResponse.body.logs;
      const paymentLog = auditEntries.find(log => 
        log.action === 'payment_processed' && 
        log.details.paymentId === response.body.payment.id
      );

      expect(paymentLog).to.exist;
      expect(paymentLog.userId).to.exist;
      expect(paymentLog.timestamp).to.exist;
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent payment processing', async () => {
      const concurrentPayments = Array.from({ length: 10 }, (_, i) => ({
        patientId: testPatientId,
        amount: 50.00 + i,
        method: 'cash',
        description: `Concurrent payment ${i + 1}`
      }));

      const startTime = Date.now();
      
      const promises = concurrentPayments.map(payment =>
        request(app)
          .post('/api/payments/process')
          .set('Authorization', `Bearer ${authToken}`)
          .send(payment)
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      
      // All payments should succeed
      responses.forEach(response => {
        expect(response.status).to.equal(200);
        expect(response.body.success).to.be.true;
      });

      // Should complete within reasonable time (5 seconds)
      expect(endTime - startTime).to.be.lessThan(5000);
    });

    it('should handle large payment history queries efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/payments/history?limit=1000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const endTime = Date.now();
      
      expect(response.body.success).to.be.true;
      
      // Query should complete within 2 seconds
      expect(endTime - startTime).to.be.lessThan(2000);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Temporarily close database connection
      await mongoose.connection.close();
      
      const paymentData = {
        patientId: testPatientId,
        amount: 100.00,
        method: 'cash'
      };

      const response = await request(app)
        .post('/api/payments/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(500);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.contain('database');
      
      // Reconnect database
      await mongoose.connect(process.env.TEST_DB_URI || 'mongodb://localhost:27017/test');
    });

    it('should handle Stripe service outage gracefully', async () => {
      // Mock Stripe service error
      mockStripe.paymentIntents.create.mockRejectedValueOnce({
        type: 'StripeConnectionError',
        message: 'Network error communicating with Stripe'
      });

      const setupData = {
        amount: 150.00,
        patientId: testPatientId,
        currency: 'usd'
      };

      const response = await request(app)
        .post('/api/payments/stripe/setup')
        .set('Authorization', `Bearer ${authToken}`)
        .send(setupData)
        .expect(503);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.contain('service temporarily unavailable');
    });
  });
});

// Integration test with real payment flow
describe('Payment Integration Flow', () => {
  let authToken;
  let patientId;
  let billId;
  let paymentId;

  before(async () => {
    // Setup complete integration environment
    const authResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@expojane.com',
        password: 'admin123'
      });
    
    authToken = authResponse.body.token;
  });

  it('should complete full payment workflow', async () => {
    // 1. Create patient
    const patientResponse = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        phone: '+1987654321',
        dateOfBirth: '1985-05-15',
        address: '123 Health St, Medical City, MC 12345'
      });

    expect(patientResponse.status).to.equal(201);
    patientId = patientResponse.body.patient.id;

    // 2. Create bill for patient
    const billResponse = await request(app)
      .post('/api/billing/bills')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        patientId: patientId,
        description: 'Annual Physical Examination',
        amount: 250.00,
        category: 'consultation',
        serviceDate: new Date().toISOString().split('T')[0],
        insuranceCovered: true
      });

    expect(billResponse.status).to.equal(201);
    billId = billResponse.body.bill.id;

    // 3. Setup Stripe payment intent
    const stripeSetupResponse = await request(app)
      .post('/api/payments/stripe/setup')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        amount: 250.00,
        patientId: patientId,
        billId: billId,
        currency: 'usd'
      });

    expect(stripeSetupResponse.status).to.equal(200);
    const paymentIntentId = stripeSetupResponse.body.paymentIntent.id;

    // 4. Process payment
    const paymentResponse = await request(app)
      .post('/api/payments/stripe/confirm')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        paymentIntentId: paymentIntentId,
        paymentMethodId: 'pm_card_visa'
      });

    expect(paymentResponse.status).to.equal(200);
    expect(paymentResponse.body.success).to.be.true;
    paymentId = paymentResponse.body.payment.id;

    // 5. Verify bill is marked as paid
    const billCheckResponse = await request(app)
      .get(`/api/billing/bills/${billId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(billCheckResponse.body.bill.status).to.equal('paid');

    // 6. Generate receipt
    const receiptResponse = await request(app)
      .get(`/api/payments/${paymentId}/receipt`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(receiptResponse.status).to.equal(200);
    expect(receiptResponse.body.receipt).to.have.property('url');

    // 7. Verify payment in history
    const historyResponse = await request(app)
      .get(`/api/payments/patient/${patientId}/history`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(historyResponse.body.payments).to.have.length.greaterThan(0);
    
    const payment = historyResponse.body.payments.find(p => p.id === paymentId);
    expect(payment).to.exist;
    expect(payment.amount).to.equal(250.00);
    expect(payment.status).to.equal('success');
  });
});