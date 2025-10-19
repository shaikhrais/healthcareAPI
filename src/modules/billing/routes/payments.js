const express = require('express');

const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/rolePermissions');
const paymentController = require('../controllers/paymentController');
const router = express.Router();
router.use(authMiddleware);

/**
 * @swagger
 * components:
 *   schemas:
 *     Payment:
 *       type: object
 *       required:
 *         - patientId
 *         - amount
 *         - paymentMethod
 *       properties:
 *         _id:
 *           type: string
 *           description: Payment ID
 *           example: "pay_12345"
 *         patientId:
 *           type: string
 *           description: ID of the patient making payment
 *           example: "pat_67890"
 *         amount:
 *           type: number
 *           description: Payment amount in dollars
 *           example: 150.00
 *         currency:
 *           type: string
 *           default: "USD"
 *           example: "USD"
 *         paymentMethod:
 *           type: string
 *           enum: [credit_card, debit_card, bank_transfer, cash, check, insurance]
 *           example: "credit_card"
 *         status:
 *           type: string
 *           enum: [pending, processing, completed, failed, refunded, cancelled]
 *           example: "completed"
 *         transactionId:
 *           type: string
 *           description: External transaction ID from payment processor
 *           example: "txn_abc123"
 *         invoiceId:
 *           type: string
 *           description: Associated invoice ID
 *           example: "inv_456789"
 *         description:
 *           type: string
 *           description: Payment description
 *           example: "Consultation fee - Dr. Smith"
 *         metadata:
 *           type: object
 *           description: Additional payment metadata
 *         processedAt:
 *           type: string
 *           format: date-time
 *           description: When payment was processed
 *         refundedAt:
 *           type: string
 *           format: date-time
 *           description: When payment was refunded
 *         refundAmount:
 *           type: number
 *           description: Amount refunded if applicable
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     PaymentCreate:
 *       type: object
 *       required:
 *         - patientId
 *         - amount
 *         - paymentMethod
 *       properties:
 *         patientId:
 *           type: string
 *           description: ID of the patient making payment
 *           example: "pat_67890"
 *         amount:
 *           type: number
 *           description: Payment amount in dollars
 *           example: 150.00
 *         paymentMethod:
 *           type: string
 *           enum: [credit_card, debit_card, bank_transfer, cash, check, insurance]
 *           example: "credit_card"
 *         invoiceId:
 *           type: string
 *           description: Associated invoice ID
 *           example: "inv_456789"
 *         description:
 *           type: string
 *           description: Payment description
 *           example: "Consultation fee - Dr. Smith"
 *         paymentData:
 *           type: object
 *           description: Payment processor specific data
 *           properties:
 *             cardToken:
 *               type: string
 *               description: Stripe card token
 *             paymentIntentId:
 *               type: string
 *               description: Stripe payment intent ID
 *     RefundRequest:
 *       type: object
 *       required:
 *         - amount
 *         - reason
 *       properties:
 *         amount:
 *           type: number
 *           description: Amount to refund (must be <= original amount)
 *           example: 75.00
 *         reason:
 *           type: string
 *           description: Reason for refund
 *           example: "Service cancelled by patient"
 *         metadata:
 *           type: object
 *           description: Additional refund metadata
 */

/**
 * @swagger
 * /api/payments:
 *   post:
 *     tags: [Billing]
 *     summary: Process a new payment
 *     description: Process a payment for a patient's invoice or service
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentCreate'
 *     responses:
 *       201:
 *         description: Payment processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Payment processed successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Payment'
 *       400:
 *         description: Invalid payment data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Payment processing failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', requireRole('admin_billing'), paymentController.processPayment);

/**
 * @swagger
 * /api/payments/stripe/confirm:
 *   post:
 *     tags: [Billing]
 *     summary: Confirm a Stripe payment
 *     description: Confirm a Stripe payment intent and complete the transaction
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentIntentId
 *             properties:
 *               paymentIntentId:
 *                 type: string
 *                 description: Stripe payment intent ID
 *                 example: "pi_1234567890"
 *               paymentMethodId:
 *                 type: string
 *                 description: Stripe payment method ID
 *                 example: "pm_1234567890"
 *     responses:
 *       200:
 *         description: Payment confirmed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Payment confirmed successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Payment'
 *       400:
 *         description: Invalid payment intent or confirmation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Payment confirmation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/stripe/confirm', requireRole('admin_billing'), paymentController.confirmStripePayment);

/**
 * @swagger
 * /api/payments/{id}/refund:
 *   post:
 *     tags: [Billing]
 *     summary: Process a payment refund
 *     description: Process a full or partial refund for a completed payment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *         example: "pay_12345"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefundRequest'
 *     responses:
 *       200:
 *         description: Refund processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Refund processed successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Payment'
 *       400:
 *         description: Invalid refund request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Payment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Refund processing failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/refund', requireRole('admin_billing'), paymentController.processRefund);

/**
 * @swagger
 * /api/payments/{id}:
 *   get:
 *     tags: [Billing]
 *     summary: Get payment details
 *     description: Retrieve detailed information about a specific payment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *         example: "pay_12345"
 *     responses:
 *       200:
 *         description: Payment details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Payment'
 *       404:
 *         description: Payment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to retrieve payment details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', requireRole('admin_billing'), paymentController.getPayment);

/**
 * @swagger
 * /api/payments:
 *   get:
 *     tags: [Billing]
 *     summary: Get all payments
 *     description: Retrieve all payments with pagination and filtering options
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of payments per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, failed, refunded, cancelled]
 *         description: Filter by payment status
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *         description: Filter by patient ID
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter payments from this date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter payments up to this date
 *       - in: query
 *         name: minAmount
 *         schema:
 *           type: number
 *         description: Filter payments with minimum amount
 *       - in: query
 *         name: maxAmount
 *         schema:
 *           type: number
 *         description: Filter payments with maximum amount
 *     responses:
 *       200:
 *         description: Payments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Payment'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 250
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     pages:
 *                       type: integer
 *                       example: 13
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to retrieve payments
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/patient/:patientId', paymentController.getPatientHistory);

/**
 * @route   GET /api/payments/patient/:patientId/balance
 * @desc    Get outstanding balance for a patient
 * @access  Admin/Billing, Owner
 */
router.get('/patient/:patientId/balance', requireRole('admin_billing'), paymentController.getPatientBalance);

/**
 * @route   GET /api/payments/:id/invoice
 * @desc    Generate invoice for a payment
 * @access  Admin/Billing, Owner
 */
router.get('/:id/invoice', requireRole('admin_billing'), paymentController.generateInvoice);

/**
 * @route   GET /api/payments/stats/daily
 * @desc    Get daily payment statistics
 * @access  Admin/Billing, Owner
 */
router.get('/stats/daily', requireRole('admin_billing'), paymentController.getDailyStats);

/**
 * @route   GET /api/payments/stats/range
 * @desc    Get payment statistics for a date range
 * @access  Admin/Billing, Owner
 */
router.get('/stats/range', requireRole('admin_billing'), paymentController.getRangeStats);

/**
 * @route   GET /api/payments
 * @desc    Get all payments (with pagination and filters)
 * @access  Admin/Billing, Owner
 */
router.get('/', requireRole('admin_billing'), paymentController.getAllPayments);

module.exports = router;
