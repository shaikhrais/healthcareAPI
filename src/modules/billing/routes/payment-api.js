/**
 * Payment Processing API Routes
 * Comprehensive payment, billing, and Stripe integration
 */

const express = require('express');
const axios = require('axios');

class PaymentAPIRoutes {
  constructor() {
    this.router = express.Router();
    this.setupRoutes();
  }

  setupRoutes() {
    // Payment processing endpoints
    this.router.post('/api/payments/process', this.processPayment.bind(this));
    this.router.post('/api/payments/stripe/setup', this.setupStripeIntent.bind(this));
    this.router.post('/api/payments/stripe/confirm', this.confirmStripePayment.bind(this));
    this.router.get('/api/payments/history/:patientId', this.getPaymentHistory.bind(this));
    
    // Billing endpoints
    this.router.get('/api/billing/patient/:patientId', this.getPatientBilling.bind(this));
    this.router.post('/api/billing/invoice', this.createInvoice.bind(this));
    this.router.get('/api/billing/estimates', this.getEstimates.bind(this));
    
    // Refund endpoints
    this.router.post('/api/refunds', this.processRefund.bind(this));
    this.router.get('/api/refunds/history/:patientId', this.getRefundHistory.bind(this));
  }

  async processPayment(req, res) {
    try {
      const { patientId, amount, method, metadata } = req.body;

      // Validate required fields
      if (!patientId || !amount || !method) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: patientId, amount, method'
        });
      }

      // Mock payment processing (replace with actual payment processor)
      const paymentResult = {
        id: `pay_${Date.now()}`,
        patientId,
        amount: parseFloat(amount),
        method,
        status: 'completed',
        transactionId: `txn_${Math.random().toString(36).substring(2, 15)}`,
        timestamp: new Date().toISOString(),
        metadata: metadata || {}
      };

      // Here you would integrate with actual payment processor
      // For demo, we'll simulate different outcomes based on amount
      if (amount > 10000) { // Amounts over $100 fail for demo
        paymentResult.status = 'failed';
        paymentResult.error = 'Amount exceeds limit';
      } else if (amount > 5000) { // Amounts over $50 require verification
        paymentResult.status = 'requires_verification';
        paymentResult.verificationUrl = '/api/payments/verify/' + paymentResult.id;
      }

      res.json({
        success: paymentResult.status === 'completed',
        payment: paymentResult
      });

    } catch (error) {
      console.error('Payment processing error:', error);
      res.status(500).json({
        success: false,
        error: 'Payment processing failed',
        details: error.message
      });
    }
  }

  async setupStripeIntent(req, res) {
    try {
      const { amount, currency = 'usd', patientId } = req.body;

      // Mock Stripe Payment Intent setup
      const paymentIntent = {
        id: `pi_${Date.now()}`,
        client_secret: `pi_${Date.now()}_secret_${Math.random().toString(36).substring(2)}`,
        amount: amount * 100, // Stripe uses cents
        currency,
        status: 'requires_payment_method',
        patientId,
        created: Math.floor(Date.now() / 1000)
      };

      res.json({
        success: true,
        paymentIntent
      });

    } catch (error) {
      console.error('Stripe setup error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to setup Stripe payment intent',
        details: error.message
      });
    }
  }

  async confirmStripePayment(req, res) {
    try {
      const { paymentIntentId, paymentMethodId } = req.body;

      // Mock Stripe payment confirmation
      const confirmedPayment = {
        id: paymentIntentId,
        status: 'succeeded',
        amount: Math.floor(Math.random() * 10000) + 1000,
        currency: 'usd',
        paymentMethod: paymentMethodId,
        receiptUrl: `https://pay.stripe.com/receipts/${paymentIntentId}`,
        confirmedAt: new Date().toISOString()
      };

      res.json({
        success: true,
        payment: confirmedPayment
      });

    } catch (error) {
      console.error('Stripe confirmation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to confirm Stripe payment',
        details: error.message
      });
    }
  }

  async getPaymentHistory(req, res) {
    try {
      const { patientId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      // Mock payment history data
      const payments = [];
      for (let i = 0; i < Math.min(limit, 10); i++) {
        payments.push({
          id: `pay_${Date.now()}_${i}`,
          patientId,
          amount: Math.floor(Math.random() * 5000) + 500,
          method: ['credit_card', 'cash', 'check', 'insurance'][Math.floor(Math.random() * 4)],
          status: ['completed', 'pending', 'failed'][Math.floor(Math.random() * 3)],
          description: `Payment for service ${i + 1}`,
          date: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString(),
          transactionId: `txn_${Math.random().toString(36).substring(2, 15)}`
        });
      }

      res.json({
        success: true,
        payments,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: payments.length
        }
      });

    } catch (error) {
      console.error('Payment history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get payment history',
        details: error.message
      });
    }
  }

  async getPatientBilling(req, res) {
    try {
      const { patientId } = req.params;

      // Mock patient billing data
      const billingData = {
        patientId,
        balance: {
          total: Math.floor(Math.random() * 10000) + 1000,
          insurance: Math.floor(Math.random() * 5000),
          patient: Math.floor(Math.random() * 3000),
          paid: Math.floor(Math.random() * 8000)
        },
        recentCharges: [
          {
            id: 'charge_1',
            date: new Date().toISOString(),
            description: 'Office Visit',
            amount: 250,
            insurance: 200,
            patient: 50,
            status: 'billed'
          },
          {
            id: 'charge_2',
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            description: 'Lab Work',
            amount: 150,
            insurance: 120,
            patient: 30,
            status: 'paid'
          }
        ],
        insurance: {
          primary: {
            provider: 'Blue Cross Blue Shield',
            memberId: 'BC123456789',
            groupNumber: 'GRP001',
            status: 'active'
          }
        }
      };

      res.json({
        success: true,
        billing: billingData
      });

    } catch (error) {
      console.error('Patient billing error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get patient billing',
        details: error.message
      });
    }
  }

  async createInvoice(req, res) {
    try {
      const { patientId, charges, dueDate } = req.body;

      // Mock invoice creation
      const invoice = {
        id: `inv_${Date.now()}`,
        patientId,
        invoiceNumber: `INV-${Date.now()}`,
        charges: charges || [],
        subtotal: charges ? charges.reduce((sum, charge) => sum + charge.amount, 0) : 0,
        tax: 0,
        total: charges ? charges.reduce((sum, charge) => sum + charge.amount, 0) : 0,
        dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        status: 'sent'
      };

      res.json({
        success: true,
        invoice
      });

    } catch (error) {
      console.error('Invoice creation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create invoice',
        details: error.message
      });
    }
  }

  async getEstimates(req, res) {
    try {
      const { serviceCode, insuranceId } = req.query;

      // Mock treatment estimates
      const estimates = [
        {
          serviceCode: serviceCode || 'OFFICE_VISIT',
          description: 'Office Visit - New Patient',
          estimatedCost: 275,
          insuranceCoverage: 220,
          patientResponsibility: 55,
          copay: 25,
          deductible: 30
        },
        {
          serviceCode: 'LAB_BASIC',
          description: 'Basic Lab Panel',
          estimatedCost: 180,
          insuranceCoverage: 150,
          patientResponsibility: 30,
          copay: 0,
          deductible: 30
        }
      ];

      res.json({
        success: true,
        estimates: serviceCode ? estimates.filter(e => e.serviceCode === serviceCode) : estimates
      });

    } catch (error) {
      console.error('Estimates error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get estimates',
        details: error.message
      });
    }
  }

  async processRefund(req, res) {
    try {
      const { paymentId, amount, reason } = req.body;

      // Mock refund processing
      const refund = {
        id: `ref_${Date.now()}`,
        paymentId,
        amount: parseFloat(amount),
        reason,
        status: 'completed',
        processedAt: new Date().toISOString(),
        refundMethod: 'original_payment_method',
        estimatedArrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      };

      res.json({
        success: true,
        refund
      });

    } catch (error) {
      console.error('Refund processing error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process refund',
        details: error.message
      });
    }
  }

  async getRefundHistory(req, res) {
    try {
      const { patientId } = req.params;

      // Mock refund history
      const refunds = [
        {
          id: 'ref_1',
          paymentId: 'pay_123',
          amount: 50,
          reason: 'Duplicate charge',
          status: 'completed',
          processedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      res.json({
        success: true,
        refunds
      });

    } catch (error) {
      console.error('Refund history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get refund history',
        details: error.message
      });
    }
  }

  getRouter() {
    return this.router;
  }
}

module.exports = PaymentAPIRoutes;