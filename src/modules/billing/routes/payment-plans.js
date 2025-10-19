const express = require('express');

const { body, param, query, validationResult } = require('express-validator');

const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/rolePermissions');
const PaymentPlan = require('../models/PaymentPlan');
const paymentPlanService = require('../services/paymentPlanService');

/**
 * @swagger
 * components:
 *   schemas:
 *     PaymentPlan:
 *       type: object
 *       required:
 *         - patientId
 *         - totalAmount
 *         - numberOfPayments
 *         - paymentFrequency
 *         - firstPaymentDate
 *       properties:
 *         _id:
 *           type: string
 *           description: Payment plan ID
 *         planNumber:
 *           type: string
 *           description: Unique plan number
 *         patientId:
 *           type: string
 *           description: Patient ID
 *         totalAmount:
 *           type: number
 *           minimum: 0
 *           description: Total amount to be paid
 *         downPayment:
 *           type: number
 *           minimum: 0
 *           description: Down payment amount
 *         numberOfPayments:
 *           type: integer
 *           minimum: 1
 *           maximum: 60
 *           description: Number of installments
 *         paymentFrequency:
 *           type: string
 *           enum: [weekly, biweekly, monthly, quarterly]
 *           description: Payment frequency
 *         firstPaymentDate:
 *           type: string
 *           format: date
 *           description: First payment due date
 *         interestRate:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *           description: Interest rate percentage
 *         status:
 *           type: string
 *           enum: [draft, pending_approval, active, completed, defaulted, cancelled, suspended]
 *           description: Payment plan status
 *         installments:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               number:
 *                 type: integer
 *               amount:
 *                 type: number
 *               dueDate:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *                 enum: [pending, partial, paid, missed]
 *               paidAmount:
 *                 type: number
 *               paidDate:
 *                 type: string
 *                 format: date
 *         paymentMethod:
 *           type: object
 *           description: Preferred payment method details
 *         agreement:
 *           type: object
 *           description: Patient agreement details
 *         notes:
 *           type: string
 *           description: Additional notes
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         createdBy:
 *           type: string
 *           description: Staff member who created the plan
 *         approvedBy:
 *           type: string
 *           description: Staff member who approved the plan
 *         approvedAt:
 *           type: string
 *           format: date-time
 *     PaymentPlanCalculation:
 *       type: object
 *       properties:
 *         totalAmount:
 *           type: number
 *         downPayment:
 *           type: number
 *         financeAmount:
 *           type: number
 *         monthlyPayment:
 *           type: number
 *         numberOfPayments:
 *           type: integer
 *         paymentFrequency:
 *           type: string
 *         totalInterest:
 *           type: number
 *         firstPaymentDate:
 *           type: string
 *           format: date
 *         lastPaymentDate:
 *           type: string
 *           format: date
 *     AffordabilityAssessment:
 *       type: object
 *       properties:
 *         monthlyIncome:
 *           type: number
 *         monthlyExpenses:
 *           type: number
 *         disposableIncome:
 *           type: number
 *         recommendedPayment:
 *           type: number
 *         maxAffordablePayment:
 *           type: number
 *         riskLevel:
 *           type: string
 *           enum: [low, medium, high]
 *         recommendations:
 *           type: array
 *           items:
 *             type: string
 */

/**
 * Payment Plan Routes
 *
 * Handles payment plan creation, management, and monitoring
 * with affordability assessment and payment recording
 */

const router = express.Router();
// ============================================================================
// Validation Middleware
// ============================================================================

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }
  next();
};

// ============================================================================
// Plan Calculation Endpoints
// ============================================================================

/**
 * @swagger
 * /api/payment-plans/calculate:
 *   post:
 *     tags: [Billing]
 *     summary: Calculate payment plan options
 *     description: Returns multiple payment plan options with different terms based on total amount and parameters
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - totalAmount
 *             properties:
 *               totalAmount:
 *                 type: number
 *                 minimum: 0
 *                 description: Total amount to be financed
 *               downPaymentPercent:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 default: 10
 *                 description: Down payment percentage
 *               interestRate:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 default: 0
 *                 description: Annual interest rate
 *               paymentFrequency:
 *                 type: string
 *                 enum: [weekly, biweekly, monthly, quarterly]
 *                 default: monthly
 *                 description: Payment frequency
 *     responses:
 *       200:
 *         description: Payment plan options calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PaymentPlanCalculation'
 *       400:
 *         description: Invalid input parameters
 *       500:
 *         description: Calculation failed
 */
router.post(
  '/calculate',
  authMiddleware,
  [
    body('totalAmount').isFloat({ min: 0 }).withMessage('Total amount must be a positive number'),
    body('downPaymentPercent')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Down payment percent must be between 0 and 100'),
    body('interestRate')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Interest rate must be between 0 and 100'),
    body('paymentFrequency')
      .optional()
      .isIn(['weekly', 'biweekly', 'monthly', 'quarterly'])
      .withMessage('Invalid payment frequency'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { totalAmount, downPaymentPercent, interestRate, paymentFrequency } = req.body;

      const options = await paymentPlanService.calculatePaymentPlanOptions(totalAmount, {
        downPaymentPercent: downPaymentPercent || 10,
        interestRate: interestRate || 0,
        paymentFrequency: paymentFrequency || 'monthly',
      });

      res.json({
        success: true,
        data: options,
      });
    } catch (error) {
      console.error('Error calculating payment plan:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate payment plan options',
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/payment-plans/assess-affordability:
 *   post:
 *     tags: [Billing]
 *     summary: Assess payment affordability
 *     description: Evaluates patient's ability to afford payment plan based on income and expenses
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - totalAmount
 *               - monthlyIncome
 *               - monthlyExpenses
 *             properties:
 *               patientId:
 *                 type: string
 *                 description: Patient ID
 *               totalAmount:
 *                 type: number
 *                 minimum: 0
 *                 description: Total amount to be financed
 *               monthlyIncome:
 *                 type: number
 *                 minimum: 0
 *                 description: Patient's monthly income
 *               monthlyExpenses:
 *                 type: number
 *                 minimum: 0
 *                 description: Patient's monthly expenses
 *               desiredMonthlyPayment:
 *                 type: number
 *                 minimum: 0
 *                 description: Desired monthly payment amount
 *     responses:
 *       200:
 *         description: Affordability assessed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AffordabilityAssessment'
 *       400:
 *         description: Invalid input parameters
 *       403:
 *         description: Not authorized
 *       500:
 *         description: Assessment failed
 */
router.post(
  '/assess-affordability',
  authMiddleware,
  requireRole(['owner', 'full_access', 'admin_billing', 'billing_only']),
  [
    body('patientId').isMongoId().withMessage('Valid patient ID is required'),
    body('totalAmount').isFloat({ min: 0 }).withMessage('Total amount must be a positive number'),
    body('monthlyIncome')
      .isFloat({ min: 0 })
      .withMessage('Monthly income must be a positive number'),
    body('monthlyExpenses')
      .isFloat({ min: 0 })
      .withMessage('Monthly expenses must be a positive number'),
    body('desiredMonthlyPayment')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Desired payment must be a positive number'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { patientId, totalAmount, monthlyIncome, monthlyExpenses, desiredMonthlyPayment } =
        req.body;

      const assessment = await paymentPlanService.assessAffordability(patientId, totalAmount, {
        monthlyIncome,
        monthlyExpenses,
        desiredMonthlyPayment,
      });

      res.json({
        success: true,
        data: assessment,
      });
    } catch (error) {
      console.error('Error assessing affordability:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assess affordability',
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/payment-plans:
 *   post:
 *     tags: [Billing]
 *     summary: Create payment plan
 *     description: Creates a new payment plan for a patient with specified terms
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - totalAmount
 *               - numberOfPayments
 *               - paymentFrequency
 *               - firstPaymentDate
 *             properties:
 *               patientId:
 *                 type: string
 *                 description: Patient ID
 *               totalAmount:
 *                 type: number
 *                 minimum: 0
 *                 description: Total amount to be paid
 *               downPayment:
 *                 type: number
 *                 minimum: 0
 *                 description: Down payment amount
 *               numberOfPayments:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 60
 *                 description: Number of installments
 *               paymentFrequency:
 *                 type: string
 *                 enum: [weekly, biweekly, monthly, quarterly]
 *                 description: Payment frequency
 *               firstPaymentDate:
 *                 type: string
 *                 format: date
 *                 description: First payment due date
 *               interestRate:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Interest rate percentage
 *               claims:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Associated claim IDs
 *               paymentMethod:
 *                 type: object
 *                 description: Preferred payment method
 *     responses:
 *       201:
 *         description: Payment plan created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/PaymentPlan'
 *       400:
 *         description: Invalid input parameters
 *       403:
 *         description: Not authorized
 *       500:
 *         description: Creation failed
 */
router.post(
  '/calculate',
  authMiddleware,
  [
    body('totalAmount').isFloat({ min: 0 }).withMessage('Total amount must be a positive number'),
    body('downPaymentPercent')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Down payment percent must be between 0 and 100'),
    body('interestRate')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Interest rate must be between 0 and 100'),
    body('paymentFrequency')
      .optional()
      .isIn(['weekly', 'biweekly', 'monthly', 'quarterly'])
      .withMessage('Invalid payment frequency'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { totalAmount, downPaymentPercent, interestRate, paymentFrequency } = req.body;

      const options = await paymentPlanService.calculatePaymentPlanOptions(totalAmount, {
        downPaymentPercent: downPaymentPercent || 10,
        interestRate: interestRate || 0,
        paymentFrequency: paymentFrequency || 'monthly',
      });

      res.json({
        success: true,
        data: options,
      });
    } catch (error) {
      console.error('Error calculating payment plan:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate payment plan options',
        error: error.message,
      });
    }
  }
);

/**
 * Assess affordability
 * POST /api/payment-plans/assess-affordability
 *
 * Evaluates patient's ability to afford payment plan
 */
router.post(
  '/assess-affordability',
  authMiddleware,
  requireRole(['owner', 'full_access', 'admin_billing', 'billing_only']),
  [
    body('patientId').isMongoId().withMessage('Valid patient ID is required'),
    body('totalAmount').isFloat({ min: 0 }).withMessage('Total amount must be a positive number'),
    body('monthlyIncome')
      .isFloat({ min: 0 })
      .withMessage('Monthly income must be a positive number'),
    body('monthlyExpenses')
      .isFloat({ min: 0 })
      .withMessage('Monthly expenses must be a positive number'),
    body('desiredMonthlyPayment')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Desired payment must be a positive number'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { patientId, totalAmount, monthlyIncome, monthlyExpenses, desiredMonthlyPayment } =
        req.body;

      const assessment = await paymentPlanService.assessAffordability(patientId, totalAmount, {
        monthlyIncome,
        monthlyExpenses,
        desiredMonthlyPayment,
      });

      res.json({
        success: true,
        data: assessment,
      });
    } catch (error) {
      console.error('Error assessing affordability:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assess affordability',
        error: error.message,
      });
    }
  }
);

// ============================================================================
// Plan Management Endpoints
// ============================================================================

/**
 * Create payment plan
 * POST /api/payment-plans
 *
 * Creates a new payment plan for a patient
 */
router.post(
  '/',
  authMiddleware,
  requireRole(['owner', 'full_access', 'admin_billing', 'billing_only']),
  [
    body('patientId').isMongoId().withMessage('Valid patient ID is required'),
    body('totalAmount').isFloat({ min: 0 }).withMessage('Total amount must be a positive number'),
    body('downPayment')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Down payment must be a positive number'),
    body('numberOfPayments')
      .isInt({ min: 1, max: 60 })
      .withMessage('Number of payments must be between 1 and 60'),
    body('paymentFrequency')
      .isIn(['weekly', 'biweekly', 'monthly', 'quarterly'])
      .withMessage('Invalid payment frequency'),
    body('firstPaymentDate').isISO8601().withMessage('Valid first payment date is required'),
    body('interestRate')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Interest rate must be between 0 and 100'),
    body('claims').optional().isArray().withMessage('Claims must be an array'),
    body('paymentMethod').optional().isObject().withMessage('Payment method must be an object'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const planData = {
        ...req.body,
        createdBy: req.user.id,
      };

      const plan = await paymentPlanService.createPaymentPlan(planData);

      res.status(201).json({
        success: true,
        message: 'Payment plan created successfully',
        data: plan,
      });
    } catch (error) {
      console.error('Error creating payment plan:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create payment plan',
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/payment-plans/{id}:
 *   get:
 *     tags: [Billing]
 *     summary: Get payment plan by ID
 *     description: Retrieve detailed payment plan information including patient and claim details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment plan ID
 *     responses:
 *       200:
 *         description: Payment plan retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PaymentPlan'
 *       404:
 *         description: Payment plan not found
 *       403:
 *         description: Not authorized to access this plan
 *       500:
 *         description: Failed to retrieve plan
 *   put:
 *     tags: [Billing]
 *     summary: Update payment plan
 *     description: Update limited payment plan fields (notes, payment method, status)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment plan ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 description: Additional notes
 *               paymentMethod:
 *                 type: object
 *                 description: Payment method details
 *               status:
 *                 type: string
 *                 enum: [draft, pending_approval, cancelled]
 *                 description: Updated status
 *     responses:
 *       200:
 *         description: Payment plan updated successfully
 *       404:
 *         description: Payment plan not found
 *       403:
 *         description: Not authorized
 *       500:
 *         description: Update failed
 */
router.get(
  '/:id',
  authMiddleware,
  [param('id').isMongoId().withMessage('Valid payment plan ID is required')],
  validateRequest,
  async (req, res) => {
    try {
      const plan = await PaymentPlan.findById(req.params.id)
        .populate('patient', 'firstName lastName email phone')
        .populate('claims', 'claimNumber status totalCharges')
        .populate('createdBy', 'firstName lastName')
        .populate('approvedBy', 'firstName lastName');

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Payment plan not found',
        });
      }

      // Check access permissions
      const canAccess =
        req.user.role === 'owner' ||
        req.user.role === 'full_access' ||
        req.user.role === 'admin_billing' ||
        req.user.role === 'billing_only' ||
        (req.user.role === 'patient' && plan.patient._id.toString() === req.user.patientId);

      if (!canAccess) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this payment plan',
        });
      }

      res.json({
        success: true,
        data: plan,
      });
    } catch (error) {
      console.error('Error retrieving payment plan:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve payment plan',
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/payment-plans:
 *   get:
 *     tags: [Billing]
 *     summary: List payment plans
 *     description: Retrieve payment plans with filtering and pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of plans per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, pending_approval, active, completed, defaulted, cancelled, suspended]
 *         description: Filter by status
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *         description: Filter by patient ID
 *     responses:
 *       200:
 *         description: Payment plans retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     plans:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PaymentPlan'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       500:
 *         description: Failed to retrieve plans
 */
router.get(
  '/',
  authMiddleware,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('status')
      .optional()
      .isIn([
        'draft',
        'pending_approval',
        'active',
        'completed',
        'defaulted',
        'cancelled',
        'suspended',
      ])
      .withMessage('Invalid status'),
    query('patientId').optional().isMongoId().withMessage('Valid patient ID is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const skip = (page - 1) * limit;

      // Build filter
      const filter = {};

      if (req.query.status) {
        filter.status = req.query.status;
      }

      if (req.query.patientId) {
        filter.patient = req.query.patientId;
      }

      // Role-based filtering
      if (req.user.role === 'patient') {
        filter.patient = req.user.patientId;
      }

      const [plans, total] = await Promise.all([
        PaymentPlan.find(filter)
          .populate('patient', 'firstName lastName email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        PaymentPlan.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: {
          plans,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error('Error listing payment plans:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve payment plans',
        error: error.message,
      });
    }
  }
);

/**
 * Update payment plan
 * PUT /api/payment-plans/:id
 *
 * Updates payment plan details (limited fields)
 */
router.put(
  '/:id',
  authMiddleware,
  requireRole(['owner', 'full_access', 'admin_billing', 'billing_only']),
  [
    param('id').isMongoId().withMessage('Valid payment plan ID is required'),
    body('notes').optional().isString().withMessage('Notes must be a string'),
    body('paymentMethod').optional().isObject().withMessage('Payment method must be an object'),
    body('status')
      .optional()
      .isIn(['draft', 'pending_approval', 'cancelled'])
      .withMessage('Can only update to draft, pending_approval, or cancelled status'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const plan = await PaymentPlan.findById(req.params.id);

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Payment plan not found',
        });
      }

      // Only allow certain fields to be updated
      const allowedUpdates = ['notes', 'paymentMethod', 'status'];
      const updates = {};

      allowedUpdates.forEach((field) => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });

      Object.assign(plan, updates);
      await plan.save();

      res.json({
        success: true,
        message: 'Payment plan updated successfully',
        data: plan,
      });
    } catch (error) {
      console.error('Error updating payment plan:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update payment plan',
        error: error.message,
      });
    }
  }
);

/**
 * Approve payment plan
 * POST /api/payment-plans/:id/approve
 *
 * Approves a payment plan and activates it
 */
router.post(
  '/:id/approve',
  authMiddleware,
  requireRole(['owner', 'full_access', 'admin_billing']),
  [param('id').isMongoId().withMessage('Valid payment plan ID is required')],
  validateRequest,
  async (req, res) => {
    try {
      const plan = await PaymentPlan.findById(req.params.id);

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Payment plan not found',
        });
      }

      if (plan.status !== 'pending_approval' && plan.status !== 'draft') {
        return res.status(400).json({
          success: false,
          message: 'Payment plan cannot be approved in current status',
        });
      }

      plan.status = 'active';
      plan.approvedBy = req.user.id;
      plan.approvedAt = new Date();

      await plan.save();

      res.json({
        success: true,
        message: 'Payment plan approved successfully',
        data: plan,
      });
    } catch (error) {
      console.error('Error approving payment plan:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve payment plan',
        error: error.message,
      });
    }
  }
);

/**
 * Suspend payment plan
 * POST /api/payment-plans/:id/suspend
 *
 * Suspends an active payment plan
 */
router.post(
  '/:id/suspend',
  authMiddleware,
  requireRole(['owner', 'full_access', 'admin_billing']),
  [
    param('id').isMongoId().withMessage('Valid payment plan ID is required'),
    body('reason').notEmpty().withMessage('Reason for suspension is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const plan = await PaymentPlan.findById(req.params.id);

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Payment plan not found',
        });
      }

      if (plan.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'Only active plans can be suspended',
        });
      }

      plan.suspend(req.body.reason, req.user.id);
      await plan.save();

      res.json({
        success: true,
        message: 'Payment plan suspended successfully',
        data: plan,
      });
    } catch (error) {
      console.error('Error suspending payment plan:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to suspend payment plan',
        error: error.message,
      });
    }
  }
);

/**
 * Resume payment plan
 * POST /api/payment-plans/:id/resume
 *
 * Resumes a suspended payment plan
 */
router.post(
  '/:id/resume',
  authMiddleware,
  requireRole(['owner', 'full_access', 'admin_billing']),
  [param('id').isMongoId().withMessage('Valid payment plan ID is required')],
  validateRequest,
  async (req, res) => {
    try {
      const plan = await PaymentPlan.findById(req.params.id);

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Payment plan not found',
        });
      }

      if (plan.status !== 'suspended') {
        return res.status(400).json({
          success: false,
          message: 'Only suspended plans can be resumed',
        });
      }

      plan.resume(req.user.id);
      await plan.save();

      res.json({
        success: true,
        message: 'Payment plan resumed successfully',
        data: plan,
      });
    } catch (error) {
      console.error('Error resuming payment plan:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resume payment plan',
        error: error.message,
      });
    }
  }
);

/**
 * Modify payment plan terms
 * POST /api/payment-plans/:id/modify
 *
 * Modifies payment plan terms (payment amount or extension)
 */
router.post(
  '/:id/modify',
  authMiddleware,
  requireRole(['owner', 'full_access', 'admin_billing']),
  [
    param('id').isMongoId().withMessage('Valid payment plan ID is required'),
    body('reason').notEmpty().withMessage('Reason for modification is required'),
    body('newPaymentAmount')
      .optional()
      .isFloat({ min: 50 })
      .withMessage('New payment amount must be at least $50'),
    body('extendTerm')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Extension must be at least 1 payment'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { newPaymentAmount, extendTerm, reason } = req.body;

      const modifications = {};
      if (newPaymentAmount) modifications.newPaymentAmount = newPaymentAmount;
      if (extendTerm) modifications.extendTerm = extendTerm;
      modifications.reason = reason;

      const plan = await paymentPlanService.modifyPlanTerms(
        req.params.id,
        modifications,
        req.user.id
      );

      res.json({
        success: true,
        message: 'Payment plan modified successfully',
        data: plan,
      });
    } catch (error) {
      console.error('Error modifying payment plan:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to modify payment plan',
        error: error.message,
      });
    }
  }
);

// ============================================================================
// Payment Recording Endpoints
// ============================================================================

/**
 * Record payment
 * POST /api/payment-plans/:id/payments
 *
 * Records a payment for an installment
 */
router.post(
  '/:id/payments',
  authMiddleware,
  requireRole(['owner', 'full_access', 'admin_billing', 'billing_only', 'frontdesk_only']),
  [
    param('id').isMongoId().withMessage('Valid payment plan ID is required'),
    body('installmentNumber').isInt({ min: 1 }).withMessage('Valid installment number is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Payment amount must be greater than 0'),
    body('paymentMethod')
      .isIn(['credit_card', 'debit_card', 'ach', 'check', 'cash', 'other'])
      .withMessage('Invalid payment method'),
    body('transactionId').optional().isString().withMessage('Transaction ID must be a string'),
    body('paymentDate').optional().isISO8601().withMessage('Valid payment date is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { installmentNumber, amount, paymentMethod, transactionId, paymentDate } = req.body;

      const paymentData = {
        amount,
        method: paymentMethod,
        transactionId,
        date: paymentDate ? new Date(paymentDate) : new Date(),
      };

      const plan = await paymentPlanService.recordPayment(
        req.params.id,
        installmentNumber,
        paymentData
      );

      res.json({
        success: true,
        message: 'Payment recorded successfully',
        data: {
          plan,
          summary: plan.getPaymentSummary(),
        },
      });
    } catch (error) {
      console.error('Error recording payment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record payment',
        error: error.message,
      });
    }
  }
);

/**
 * Get payment schedule
 * GET /api/payment-plans/:id/schedule
 *
 * Retrieves complete payment schedule for a plan
 */
router.get(
  '/:id/schedule',
  authMiddleware,
  [param('id').isMongoId().withMessage('Valid payment plan ID is required')],
  validateRequest,
  async (req, res) => {
    try {
      const plan = await PaymentPlan.findById(req.params.id);

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Payment plan not found',
        });
      }

      // Check access permissions
      const canAccess =
        req.user.role === 'owner' ||
        req.user.role === 'full_access' ||
        req.user.role === 'admin_billing' ||
        req.user.role === 'billing_only' ||
        (req.user.role === 'patient' && plan.patient.toString() === req.user.patientId);

      if (!canAccess) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this payment schedule',
        });
      }

      const schedule = plan.getPaymentSchedule();

      res.json({
        success: true,
        data: {
          planNumber: plan.planNumber,
          schedule,
          summary: plan.getPaymentSummary(),
        },
      });
    } catch (error) {
      console.error('Error retrieving payment schedule:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve payment schedule',
        error: error.message,
      });
    }
  }
);

/**
 * Get payment summary
 * GET /api/payment-plans/:id/summary
 *
 * Retrieves payment summary and statistics
 */
router.get(
  '/:id/summary',
  authMiddleware,
  [param('id').isMongoId().withMessage('Valid payment plan ID is required')],
  validateRequest,
  async (req, res) => {
    try {
      const plan = await PaymentPlan.findById(req.params.id).populate(
        'patient',
        'firstName lastName email'
      );

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Payment plan not found',
        });
      }

      // Check access permissions
      const canAccess =
        req.user.role === 'owner' ||
        req.user.role === 'full_access' ||
        req.user.role === 'admin_billing' ||
        req.user.role === 'billing_only' ||
        (req.user.role === 'patient' && plan.patient._id.toString() === req.user.patientId);

      if (!canAccess) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this payment plan',
        });
      }

      const summary = plan.getPaymentSummary();

      res.json({
        success: true,
        data: {
          planNumber: plan.planNumber,
          patient: plan.patient,
          status: plan.status,
          summary,
        },
      });
    } catch (error) {
      console.error('Error retrieving payment summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve payment summary',
        error: error.message,
      });
    }
  }
);

// ============================================================================
// Patient Portal Endpoints
// ============================================================================

/**
 * Get patient's payment plans
 * GET /api/payment-plans/patient/:patientId
 *
 * Lists all payment plans for a patient
 */
router.get(
  '/patient/:patientId',
  authMiddleware,
  [param('patientId').isMongoId().withMessage('Valid patient ID is required')],
  validateRequest,
  async (req, res) => {
    try {
      // Check access permissions
      const canAccess =
        req.user.role === 'owner' ||
        req.user.role === 'full_access' ||
        req.user.role === 'admin_billing' ||
        req.user.role === 'billing_only' ||
        (req.user.role === 'patient' && req.params.patientId === req.user.patientId);

      if (!canAccess) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access these payment plans',
        });
      }

      const plans = await PaymentPlan.getActiveForPatient(req.params.patientId);

      // Add summary to each plan
      const plansWithSummary = plans.map((plan) => ({
        ...plan.toObject(),
        summary: plan.getPaymentSummary(),
        nextPayment: plan.getNextDuePayment(),
      }));

      res.json({
        success: true,
        data: plansWithSummary,
      });
    } catch (error) {
      console.error('Error retrieving patient payment plans:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve payment plans',
        error: error.message,
      });
    }
  }
);

/**
 * Sign payment plan agreement
 * POST /api/payment-plans/:id/agree
 *
 * Patient signs agreement to accept payment plan
 */
router.post(
  '/:id/agree',
  authMiddleware,
  requireRole(['patient']),
  [
    param('id').isMongoId().withMessage('Valid payment plan ID is required'),
    body('signature').notEmpty().withMessage('Signature is required'),
    body('accepted').isBoolean().withMessage('Accepted must be true or false'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const plan = await PaymentPlan.findById(req.params.id).populate(
        'patient',
        'firstName lastName email'
      );

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Payment plan not found',
        });
      }

      // Verify patient owns this plan
      if (plan.patient._id.toString() !== req.user.patientId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to sign this payment plan',
        });
      }

      if (plan.status !== 'pending_approval') {
        return res.status(400).json({
          success: false,
          message: 'Payment plan is not pending approval',
        });
      }

      if (!req.body.accepted) {
        return res.status(400).json({
          success: false,
          message: 'Agreement must be accepted',
        });
      }

      // Record agreement
      plan.agreement = {
        signedDate: new Date(),
        signedBy: `${plan.patient.firstName} ${plan.patient.lastName}`,
        signature: req.body.signature,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        terms: plan.notes || 'Payment plan terms and conditions',
        accepted: true,
      };

      // Move to pending approval by staff
      plan.status = 'pending_approval';

      await plan.save();

      res.json({
        success: true,
        message: 'Payment plan agreement signed successfully',
        data: plan,
      });
    } catch (error) {
      console.error('Error signing agreement:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to sign agreement',
        error: error.message,
      });
    }
  }
);

// ============================================================================
// Monitoring and Dashboard Endpoints
// ============================================================================

/**
 * Get dashboard metrics
 * GET /api/payment-plans/dashboard
 *
 * Returns key metrics for payment plan dashboard
 */
router.get(
  '/dashboard/metrics',
  authMiddleware,
  requireRole(['owner', 'full_access', 'admin_billing', 'billing_only']),
  async (req, res) => {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [
        totalActive,
        totalOverdue,
        recentlyCreated,
        completedLastMonth,
        defaultedPlans,
        upcomingPayments,
        statistics,
      ] = await Promise.all([
        PaymentPlan.countDocuments({ status: 'active' }),
        PaymentPlan.countDocuments({
          status: 'active',
          installments: {
            $elemMatch: {
              status: { $in: ['pending', 'partial'] },
              dueDate: { $lt: now },
            },
          },
        }),
        PaymentPlan.countDocuments({
          createdAt: { $gte: thirtyDaysAgo },
        }),
        PaymentPlan.countDocuments({
          status: 'completed',
          updatedAt: { $gte: thirtyDaysAgo },
        }),
        PaymentPlan.countDocuments({ status: 'defaulted' }),
        PaymentPlan.getUpcomingPayments(7),
        PaymentPlan.getStatistics(),
      ]);

      res.json({
        success: true,
        data: {
          overview: {
            totalActivePlans: totalActive,
            overduePayments: totalOverdue,
            recentlyCreated,
            completedLastMonth,
            defaultedPlans,
            upcomingPayments: upcomingPayments.length,
          },
          statistics,
        },
      });
    } catch (error) {
      console.error('Error retrieving dashboard metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve dashboard metrics',
        error: error.message,
      });
    }
  }
);

/**
 * Get overdue payment plans
 * GET /api/payment-plans/overdue
 *
 * Lists all plans with overdue payments
 */
router.get(
  '/reports/overdue',
  authMiddleware,
  requireRole(['owner', 'full_access', 'admin_billing', 'billing_only']),
  async (req, res) => {
    try {
      const overduePlans = await PaymentPlan.getOverduePlans();

      // Add overdue details to each plan
      const plansWithDetails = overduePlans.map((plan) => {
        const overdueInstallments = plan.getOverdueInstallments();
        const totalOverdueAmount = overdueInstallments.reduce(
          (sum, inst) => sum + (inst.amount - inst.paidAmount),
          0
        );

        return {
          ...plan.toObject(),
          overdueInstallments,
          totalOverdueAmount,
          summary: plan.getPaymentSummary(),
        };
      });

      res.json({
        success: true,
        data: {
          count: plansWithDetails.length,
          plans: plansWithDetails,
        },
      });
    } catch (error) {
      console.error('Error retrieving overdue plans:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve overdue plans',
        error: error.message,
      });
    }
  }
);

/**
 * Get upcoming payments
 * GET /api/payment-plans/upcoming
 *
 * Lists plans with payments due in the next N days
 */
router.get(
  '/reports/upcoming',
  authMiddleware,
  requireRole(['owner', 'full_access', 'admin_billing', 'billing_only']),
  [
    query('daysAhead')
      .optional()
      .isInt({ min: 1, max: 90 })
      .withMessage('Days ahead must be between 1 and 90'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const daysAhead = parseInt(req.query.daysAhead, 10) || 7;

      const upcomingPlans = await PaymentPlan.getUpcomingPayments(daysAhead);

      // Add next payment details
      const plansWithDetails = upcomingPlans.map((plan) => {
        const nextPayment = plan.getNextDuePayment();

        return {
          ...plan.toObject(),
          nextPayment,
          summary: plan.getPaymentSummary(),
        };
      });

      res.json({
        success: true,
        data: {
          daysAhead,
          count: plansWithDetails.length,
          plans: plansWithDetails,
        },
      });
    } catch (error) {
      console.error('Error retrieving upcoming payments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve upcoming payments',
        error: error.message,
      });
    }
  }
);

/**
 * Get payment plan statistics
 * GET /api/payment-plans/statistics
 *
 * Returns aggregate statistics for date range
 */
router.get(
  '/reports/statistics',
  authMiddleware,
  requireRole(['owner', 'full_access', 'admin_billing']),
  [
    query('startDate').optional().isISO8601().withMessage('Valid start date is required'),
    query('endDate').optional().isISO8601().withMessage('Valid end date is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      const statistics = await PaymentPlan.getStatistics(startDate, endDate);

      res.json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      console.error('Error retrieving statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve statistics',
        error: error.message,
      });
    }
  }
);

module.exports = router;
