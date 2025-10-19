const express = require('express');

const { body, param, query, validationResult } = require('express-validator');

const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/rolePermissions');
const BadDebt = require('../models/BadDebt');
const badDebtService = require('../services/badDebtService');
/**
 * Bad Debt Routes
 *
 * Handles bad debt tracking, collection efforts, and write-offs
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

// All bad debt routes require billing access
const billingAccess = requireRole(['owner', 'full_access', 'admin_billing', 'billing_only']);

// ============================================================================
// Bad Debt Management Endpoints
// ============================================================================

/**
 * Create bad debt record
 * POST /api/bad-debt
 */
router.post(
  '/',
  authMiddleware,
  billingAccess,
  [
    body('patientId').isMongoId().withMessage('Valid patient ID is required'),
    body('originalAmount')
      .isFloat({ min: 0 })
      .withMessage('Original amount must be a positive number'),
    body('classificationType')
      .isIn([
        'patient_responsibility',
        'uninsured',
        'insurance_denial',
        'payment_plan_default',
        'coordination_of_benefits',
        'other',
      ])
      .withMessage('Invalid classification type'),
    body('reason')
      .isIn([
        'unable_to_pay',
        'unwilling_to_pay',
        'disputed_charges',
        'patient_deceased',
        'patient_relocated',
        'bankruptcy',
        'insurance_issues',
        'medical_necessity_denial',
        'coordination_of_benefits',
        'timely_filing',
        'other',
      ])
      .withMessage('Invalid reason'),
    body('firstBillingDate')
      .optional()
      .isISO8601()
      .withMessage('Valid first billing date is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const badDebt = await badDebtService.createBadDebt(req.body, req.user.id);

      res.status(201).json({
        success: true,
        message: 'Bad debt record created successfully',
        data: badDebt,
      });
    } catch (error) {
      console.error('Error creating bad debt:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create bad debt record',
        error: error.message,
      });
    }
  }
);

/**
 * Identify bad debt from payment plan
 * POST /api/bad-debt/from-payment-plan/:planId
 */
router.post(
  '/from-payment-plan/:planId',
  authMiddleware,
  billingAccess,
  [param('planId').isMongoId().withMessage('Valid payment plan ID is required')],
  validateRequest,
  async (req, res) => {
    try {
      const badDebt = await badDebtService.identifyFromPaymentPlan(req.params.planId, req.user.id);

      res.status(201).json({
        success: true,
        message: 'Bad debt identified from payment plan',
        data: badDebt,
      });
    } catch (error) {
      console.error('Error identifying bad debt from payment plan:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to identify bad debt from payment plan',
        error: error.message,
      });
    }
  }
);

/**
 * Get bad debt by ID
 * GET /api/bad-debt/:id
 */
router.get(
  '/:id',
  authMiddleware,
  billingAccess,
  [param('id').isMongoId().withMessage('Valid bad debt ID is required')],
  validateRequest,
  async (req, res) => {
    try {
      const badDebt = await BadDebt.findById(req.params.id)
        .populate('patient', 'firstName lastName email phone')
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName')
        .populate('collectionEfforts.performedBy', 'firstName lastName');

      if (!badDebt) {
        return res.status(404).json({
          success: false,
          message: 'Bad debt not found',
        });
      }

      res.json({
        success: true,
        data: badDebt,
      });
    } catch (error) {
      console.error('Error retrieving bad debt:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve bad debt',
        error: error.message,
      });
    }
  }
);

/**
 * List bad debts
 * GET /api/bad-debt
 */
router.get(
  '/',
  authMiddleware,
  billingAccess,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('status')
      .optional()
      .isIn([
        'identified',
        'in_collection',
        'external_collection',
        'legal_action',
        'settlement_pending',
        'settled',
        'written_off',
        'recovered',
        'bankruptcy',
        'deceased',
        'closed',
      ])
      .withMessage('Invalid status'),
    query('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('Invalid priority'),
    query('agingBucket')
      .optional()
      .isIn(['0-30', '31-60', '61-90', '91-120', '121-180', '181-365', '365+'])
      .withMessage('Invalid aging bucket'),
    query('assignedTo').optional().isMongoId().withMessage('Valid user ID is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const skip = (page - 1) * limit;

      // Build filter
      const filter = {};

      if (req.query.status) filter.status = req.query.status;
      if (req.query.priority) filter.priority = req.query.priority;
      if (req.query.agingBucket) filter['financial.agingBucket'] = req.query.agingBucket;
      if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;
      if (req.query.patientId) filter.patient = req.query.patientId;

      const [badDebts, total] = await Promise.all([
        BadDebt.find(filter)
          .populate('patient', 'firstName lastName email')
          .populate('assignedTo', 'firstName lastName')
          .sort({ priority: -1, 'financial.currentBalance': -1, createdAt: -1 })
          .skip(skip)
          .limit(limit),
        BadDebt.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: {
          badDebts,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error('Error listing bad debts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve bad debts',
        error: error.message,
      });
    }
  }
);

/**
 * Update bad debt
 * PUT /api/bad-debt/:id
 */
router.put(
  '/:id',
  authMiddleware,
  billingAccess,
  [
    param('id').isMongoId().withMessage('Valid bad debt ID is required'),
    body('notes').optional().isString(),
    body('internalNotes').optional().isString(),
    body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const badDebt = await BadDebt.findById(req.params.id);

      if (!badDebt) {
        return res.status(404).json({
          success: false,
          message: 'Bad debt not found',
        });
      }

      // Update allowed fields
      if (req.body.notes !== undefined) badDebt.notes = req.body.notes;
      if (req.body.internalNotes !== undefined) badDebt.internalNotes = req.body.internalNotes;
      if (req.body.priority) badDebt.priority = req.body.priority;

      badDebt.lastUpdatedBy = req.user.id;

      await badDebt.save();

      res.json({
        success: true,
        message: 'Bad debt updated successfully',
        data: badDebt,
      });
    } catch (error) {
      console.error('Error updating bad debt:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update bad debt',
        error: error.message,
      });
    }
  }
);

// ============================================================================
// Collection Effort Endpoints
// ============================================================================

/**
 * Add collection effort
 * POST /api/bad-debt/:id/collection-efforts
 */
router.post(
  '/:id/collection-efforts',
  authMiddleware,
  billingAccess,
  [
    param('id').isMongoId().withMessage('Valid bad debt ID is required'),
    body('type')
      .isIn([
        'phone_call',
        'email',
        'letter',
        'text_message',
        'patient_portal_message',
        'in_person',
        'legal_notice',
        'settlement_offer',
        'payment_received',
        'other',
      ])
      .withMessage('Invalid effort type'),
    body('outcome')
      .isIn([
        'contact_made',
        'no_answer',
        'left_message',
        'payment_promised',
        'payment_received',
        'dispute_raised',
        'refused_payment',
        'disconnected',
        'incorrect_contact',
        'other',
      ])
      .withMessage('Invalid outcome'),
    body('notes').optional().isString(),
    body('nextFollowUpDate').optional().isISO8601(),
    body('amountPromised').optional().isFloat({ min: 0 }),
    body('amountCollected').optional().isFloat({ min: 0 }),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const badDebt = await badDebtService.addCollectionEffort(
        req.params.id,
        req.body,
        req.user.id
      );

      res.json({
        success: true,
        message: 'Collection effort recorded successfully',
        data: badDebt,
      });
    } catch (error) {
      console.error('Error adding collection effort:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record collection effort',
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
 * POST /api/bad-debt/:id/payments
 */
router.post(
  '/:id/payments',
  authMiddleware,
  billingAccess,
  [
    param('id').isMongoId().withMessage('Valid bad debt ID is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Payment amount must be greater than 0'),
    body('paymentDate').optional().isISO8601(),
    body('notes').optional().isString(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const badDebt = await badDebtService.recordPayment(
        req.params.id,
        req.body.amount,
        req.body.paymentDate,
        req.body.notes,
        req.user.id
      );

      res.json({
        success: true,
        message: 'Payment recorded successfully',
        data: {
          badDebt,
          summary: badDebt.getCollectionSummary(),
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

// ============================================================================
// External Collection Endpoints
// ============================================================================

/**
 * Send to external collection
 * POST /api/bad-debt/:id/external-collection
 */
router.post(
  '/:id/external-collection',
  authMiddleware,
  requireRole(['owner', 'full_access', 'admin_billing']),
  [
    param('id').isMongoId().withMessage('Valid bad debt ID is required'),
    body('agencyName').notEmpty().withMessage('Agency name is required'),
    body('agencyContact').optional().isString(),
    body('agencyPhone').optional().isString(),
    body('agencyEmail').optional().isEmail(),
    body('commissionRate').optional().isFloat({ min: 0, max: 100 }),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const badDebt = await badDebtService.sendToExternalCollection(
        req.params.id,
        req.body,
        req.user.id
      );

      res.json({
        success: true,
        message: 'Sent to external collection successfully',
        data: badDebt,
      });
    } catch (error) {
      console.error('Error sending to external collection:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send to external collection',
        error: error.message,
      });
    }
  }
);

/**
 * Return from external collection
 * POST /api/bad-debt/:id/return-from-collection
 */
router.post(
  '/:id/return-from-collection',
  authMiddleware,
  requireRole(['owner', 'full_access', 'admin_billing']),
  [
    param('id').isMongoId().withMessage('Valid bad debt ID is required'),
    body('returnReason').notEmpty().withMessage('Return reason is required'),
    body('collectedAmount').optional().isFloat({ min: 0 }),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const badDebt = await badDebtService.returnFromExternalCollection(
        req.params.id,
        req.body.returnReason,
        req.body.collectedAmount,
        req.user.id
      );

      res.json({
        success: true,
        message: 'Returned from external collection successfully',
        data: badDebt,
      });
    } catch (error) {
      console.error('Error returning from external collection:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to return from external collection',
        error: error.message,
      });
    }
  }
);

// ============================================================================
// Legal Action Endpoints
// ============================================================================

/**
 * Initiate legal action
 * POST /api/bad-debt/:id/legal-action
 */
router.post(
  '/:id/legal-action',
  authMiddleware,
  requireRole(['owner', 'full_access', 'admin_billing']),
  [
    param('id').isMongoId().withMessage('Valid bad debt ID is required'),
    body('type')
      .isIn(['small_claims', 'civil_suit', 'judgment', 'garnishment', 'lien'])
      .withMessage('Invalid legal action type'),
    body('caseNumber').optional().isString(),
    body('courtName').optional().isString(),
    body('attorneyName').optional().isString(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const badDebt = await badDebtService.initiateLegalAction(
        req.params.id,
        req.body,
        req.user.id
      );

      res.json({
        success: true,
        message: 'Legal action initiated successfully',
        data: badDebt,
      });
    } catch (error) {
      console.error('Error initiating legal action:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initiate legal action',
        error: error.message,
      });
    }
  }
);

// ============================================================================
// Settlement Endpoints
// ============================================================================

/**
 * Offer settlement
 * POST /api/bad-debt/:id/settlement-offer
 */
router.post(
  '/:id/settlement-offer',
  authMiddleware,
  requireRole(['owner', 'full_access', 'admin_billing']),
  [
    param('id').isMongoId().withMessage('Valid bad debt ID is required'),
    body('offerAmount').isFloat({ min: 0.01 }).withMessage('Offer amount must be greater than 0'),
    body('terms').notEmpty().withMessage('Settlement terms are required'),
    body('expiryDays').optional().isInt({ min: 1 }),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const badDebt = await badDebtService.offerSettlement(
        req.params.id,
        req.body.offerAmount,
        req.body.terms,
        req.body.expiryDays,
        req.user.id
      );

      res.json({
        success: true,
        message: 'Settlement offer created successfully',
        data: badDebt,
      });
    } catch (error) {
      console.error('Error offering settlement:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create settlement offer',
        error: error.message,
      });
    }
  }
);

/**
 * Accept settlement
 * POST /api/bad-debt/:id/settlement-accept
 */
router.post(
  '/:id/settlement-accept',
  authMiddleware,
  billingAccess,
  [param('id').isMongoId().withMessage('Valid bad debt ID is required')],
  validateRequest,
  async (req, res) => {
    try {
      const badDebt = await badDebtService.acceptSettlement(req.params.id, req.user.id);

      res.json({
        success: true,
        message: 'Settlement accepted successfully',
        data: badDebt,
      });
    } catch (error) {
      console.error('Error accepting settlement:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to accept settlement',
        error: error.message,
      });
    }
  }
);

/**
 * Record settlement payment
 * POST /api/bad-debt/:id/settlement-payment
 */
router.post(
  '/:id/settlement-payment',
  authMiddleware,
  billingAccess,
  [param('id').isMongoId().withMessage('Valid bad debt ID is required')],
  validateRequest,
  async (req, res) => {
    try {
      const badDebt = await badDebtService.recordSettlementPayment(req.params.id, req.user.id);

      res.json({
        success: true,
        message: 'Settlement payment recorded successfully',
        data: badDebt,
      });
    } catch (error) {
      console.error('Error recording settlement payment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record settlement payment',
        error: error.message,
      });
    }
  }
);

// ============================================================================
// Write-Off Endpoints
// ============================================================================

/**
 * Write off bad debt
 * POST /api/bad-debt/:id/write-off
 */
router.post(
  '/:id/write-off',
  authMiddleware,
  requireRole(['owner', 'full_access', 'admin_billing']),
  [
    param('id').isMongoId().withMessage('Valid bad debt ID is required'),
    body('reason')
      .isIn([
        'uncollectible',
        'small_balance',
        'cost_to_collect',
        'bankruptcy_discharge',
        'deceased',
        'statute_of_limitations',
        'settled',
        'other',
      ])
      .withMessage('Invalid write-off reason'),
    body('reasonDetails').optional().isString(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const badDebt = await badDebtService.writeOff(
        req.params.id,
        req.body.reason,
        req.body.reasonDetails,
        req.user.id
      );

      res.json({
        success: true,
        message: 'Bad debt written off successfully',
        data: badDebt,
      });
    } catch (error) {
      console.error('Error writing off bad debt:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to write off bad debt',
        error: error.message,
      });
    }
  }
);

// ============================================================================
// Special Status Endpoints
// ============================================================================

/**
 * Mark patient as deceased
 * POST /api/bad-debt/:id/deceased
 */
router.post(
  '/:id/deceased',
  authMiddleware,
  requireRole(['owner', 'full_access', 'admin_billing']),
  [
    param('id').isMongoId().withMessage('Valid bad debt ID is required'),
    body('dateOfDeath').isISO8601().withMessage('Valid date of death is required'),
    body('deathCertificateReceived').optional().isBoolean(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const badDebt = await badDebtService.markAsDeceased(
        req.params.id,
        req.body.dateOfDeath,
        req.body.deathCertificateReceived,
        req.user.id
      );

      res.json({
        success: true,
        message: 'Patient marked as deceased',
        data: badDebt,
      });
    } catch (error) {
      console.error('Error marking patient as deceased:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark patient as deceased',
        error: error.message,
      });
    }
  }
);

/**
 * File bankruptcy
 * POST /api/bad-debt/:id/bankruptcy
 */
router.post(
  '/:id/bankruptcy',
  authMiddleware,
  requireRole(['owner', 'full_access', 'admin_billing']),
  [
    param('id').isMongoId().withMessage('Valid bad debt ID is required'),
    body('chapter')
      .isIn(['chapter_7', 'chapter_11', 'chapter_13'])
      .withMessage('Invalid bankruptcy chapter'),
    body('filingDate').isISO8601().withMessage('Valid filing date is required'),
    body('caseNumber').notEmpty().withMessage('Case number is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const badDebt = await badDebtService.fileBankruptcy(req.params.id, req.body, req.user.id);

      res.json({
        success: true,
        message: 'Bankruptcy filed successfully',
        data: badDebt,
      });
    } catch (error) {
      console.error('Error filing bankruptcy:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to file bankruptcy',
        error: error.message,
      });
    }
  }
);

// ============================================================================
// Compliance Endpoints
// ============================================================================

/**
 * Update patient dispute
 * POST /api/bad-debt/:id/dispute
 */
router.post(
  '/:id/dispute',
  authMiddleware,
  billingAccess,
  [
    param('id').isMongoId().withMessage('Valid bad debt ID is required'),
    body('disputed').isBoolean().withMessage('Disputed status is required'),
    body('disputeReason').optional().isString(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const badDebt = await badDebtService.updatePatientDispute(
        req.params.id,
        req.body.disputed,
        req.body.disputeReason,
        req.user.id
      );

      res.json({
        success: true,
        message: 'Patient dispute updated successfully',
        data: badDebt,
      });
    } catch (error) {
      console.error('Error updating patient dispute:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update patient dispute',
        error: error.message,
      });
    }
  }
);

/**
 * Record cease and desist
 * POST /api/bad-debt/:id/cease-and-desist
 */
router.post(
  '/:id/cease-and-desist',
  authMiddleware,
  requireRole(['owner', 'full_access', 'admin_billing']),
  [param('id').isMongoId().withMessage('Valid bad debt ID is required')],
  validateRequest,
  async (req, res) => {
    try {
      const badDebt = await badDebtService.recordCeaseAndDesist(req.params.id, req.user.id);

      res.json({
        success: true,
        message: 'Cease and desist recorded successfully',
        data: badDebt,
      });
    } catch (error) {
      console.error('Error recording cease and desist:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record cease and desist',
        error: error.message,
      });
    }
  }
);

// ============================================================================
// Assignment Endpoints
// ============================================================================

/**
 * Assign bad debt
 * POST /api/bad-debt/:id/assign
 */
router.post(
  '/:id/assign',
  authMiddleware,
  requireRole(['owner', 'full_access', 'admin_billing']),
  [
    param('id').isMongoId().withMessage('Valid bad debt ID is required'),
    body('assignToUserId').isMongoId().withMessage('Valid user ID is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const badDebt = await badDebtService.assignBadDebt(
        req.params.id,
        req.body.assignToUserId,
        req.user.id
      );

      res.json({
        success: true,
        message: 'Bad debt assigned successfully',
        data: badDebt,
      });
    } catch (error) {
      console.error('Error assigning bad debt:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assign bad debt',
        error: error.message,
      });
    }
  }
);

/**
 * Bulk assign bad debts
 * POST /api/bad-debt/bulk-assign
 */
router.post(
  '/bulk/assign',
  authMiddleware,
  requireRole(['owner', 'full_access', 'admin_billing']),
  [
    body('badDebtIds').isArray().withMessage('Bad debt IDs array is required'),
    body('assignToUserId').isMongoId().withMessage('Valid user ID is required'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const result = await badDebtService.bulkAssign(
        req.body.badDebtIds,
        req.body.assignToUserId,
        req.user.id
      );

      res.json({
        success: true,
        message: `${result.modifiedCount} bad debts assigned successfully`,
        data: result,
      });
    } catch (error) {
      console.error('Error bulk assigning bad debts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to bulk assign bad debts',
        error: error.message,
      });
    }
  }
);

// ============================================================================
// Reporting Endpoints
// ============================================================================

/**
 * Get aging report
 * GET /api/bad-debt/reports/aging
 */
router.get('/reports/aging', authMiddleware, billingAccess, async (req, res) => {
  try {
    const report = await badDebtService.getAgingReport();

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error generating aging report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate aging report',
      error: error.message,
    });
  }
});

/**
 * Get collection effectiveness report
 * GET /api/bad-debt/reports/effectiveness
 */
router.get(
  '/reports/effectiveness',
  authMiddleware,
  requireRole(['owner', 'full_access', 'admin_billing']),
  [query('startDate').optional().isISO8601(), query('endDate').optional().isISO8601()],
  validateRequest,
  async (req, res) => {
    try {
      const report = await badDebtService.getCollectionEffectivenessReport(
        req.query.startDate,
        req.query.endDate
      );

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      console.error('Error generating effectiveness report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate effectiveness report',
        error: error.message,
      });
    }
  }
);

/**
 * Get dashboard summary
 * GET /api/bad-debt/dashboard
 */
router.get('/dashboard/summary', authMiddleware, billingAccess, async (req, res) => {
  try {
    const summary = await badDebtService.getDashboardSummary();

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Error getting dashboard summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard summary',
      error: error.message,
    });
  }
});

/**
 * Get my assigned bad debts
 * GET /api/bad-debt/my-assigned
 */
router.get('/my/assigned', authMiddleware, billingAccess, async (req, res) => {
  try {
    const badDebts = await BadDebt.getAssignedDebts(req.user.id);

    res.json({
      success: true,
      data: {
        count: badDebts.length,
        badDebts,
      },
    });
  } catch (error) {
    console.error('Error getting assigned bad debts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get assigned bad debts',
      error: error.message,
    });
  }
});

/**
 * Get high priority bad debts
 * GET /api/bad-debt/high-priority
 */
router.get(
  '/priority/high',
  authMiddleware,
  billingAccess,
  [query('minAmount').optional().isFloat({ min: 0 })],
  validateRequest,
  async (req, res) => {
    try {
      const minAmount = parseFloat(req.query.minAmount) || 5000;
      const badDebts = await BadDebt.getHighPriority(minAmount);

      res.json({
        success: true,
        data: {
          count: badDebts.length,
          badDebts,
        },
      });
    } catch (error) {
      console.error('Error getting high priority bad debts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get high priority bad debts',
        error: error.message,
      });
    }
  }
);

/**
 * Get bad debts requiring action
 * GET /api/bad-debt/requiring-action
 */
router.get('/action/required', authMiddleware, billingAccess, async (req, res) => {
  try {
    const badDebts = await BadDebt.getRequiringAction();

    res.json({
      success: true,
      data: {
        count: badDebts.length,
        badDebts,
      },
    });
  } catch (error) {
    console.error('Error getting bad debts requiring action:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get bad debts requiring action',
      error: error.message,
    });
  }
});

/**
 * Get statistics
 * GET /api/bad-debt/statistics
 */
router.get(
  '/stats/overview',
  authMiddleware,
  requireRole(['owner', 'full_access', 'admin_billing']),
  [query('startDate').optional().isISO8601(), query('endDate').optional().isISO8601()],
  validateRequest,
  async (req, res) => {
    try {
      const statistics = await BadDebt.getStatistics(req.query.startDate, req.query.endDate);

      res.json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      console.error('Error getting statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get statistics',
        error: error.message,
      });
    }
  }
);

module.exports = router;
