const express = require('express');

const { body, param, query, validationResult } = require('express-validator');

const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/rolePermissions');
const PriorAuthorization = require('../models/PriorAuthorization');
const { priorAuthService } = require('../services/priorAuthService');
const { logger } = require('../utils/logger');
const { NotFoundError, BadRequestError } = require('../utils/errors');
/**
 * Prior Authorization Routes
 *
 * API endpoints for managing prior authorization requests
 */

const router = express.Router();
/**
 * @route   POST /api/prior-auth
 * @desc    Create new prior authorization request
 * @access  Private (Owner, Admin, Practitioner, Billing)
 */
router.post(
  '/',
  authMiddleware,
  requireRole(['owner', 'admin', 'practitioner', 'billing']),
  [
    body('patientId').isMongoId().withMessage('Valid patient ID required'),
    body('providerId').isMongoId().withMessage('Valid provider ID required'),
    body('patientInfo.memberId').notEmpty().withMessage('Member ID required'),
    body('providerInfo.npi').notEmpty().withMessage('Provider NPI required'),
    body('providerInfo.name').notEmpty().withMessage('Provider name required'),
    body('insurance.payerId').notEmpty().withMessage('Payer ID required'),
    body('insurance.payerName').notEmpty().withMessage('Payer name required'),
    body('insurance.policyNumber').notEmpty().withMessage('Policy number required'),
    body('serviceType')
      .isIn([
        'inpatient_admission',
        'outpatient_surgery',
        'diagnostic_test',
        'imaging',
        'durable_medical_equipment',
        'home_health',
        'skilled_nursing',
        'physical_therapy',
        'occupational_therapy',
        'speech_therapy',
        'mental_health',
        'substance_abuse',
        'prescription_drug',
        'specialty_medication',
        'specialist_visit',
        'procedure',
        'other',
      ])
      .withMessage('Valid service type required'),
    body('serviceDescription').notEmpty().withMessage('Service description required'),
    body('procedureCodes').isArray({ min: 1 }).withMessage('At least one procedure code required'),
    body('diagnosisCodes').isArray({ min: 1 }).withMessage('At least one diagnosis code required'),
    body('serviceDetails.requestedStartDate').isISO8601().withMessage('Valid start date required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const authorization = await priorAuthService.createAuthorization(req.body, req.user.id);

      res.status(201).json({
        message: 'Prior authorization created successfully',
        authorization,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/prior-auth
 * @desc    List prior authorizations with filtering
 * @access  Private
 */
router.get(
  '/',
  authMiddleware,
  [
    query('status').optional().trim(),
    query('patientId').optional().isMongoId(),
    query('providerId').optional().isMongoId(),
    query('serviceType').optional().trim(),
    query('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        status,
        patientId,
        providerId,
        serviceType,
        priority,
        page = 1,
        limit = 20,
      } = req.query;

      // Build query
      const query = {};
      if (status) query.status = status;
      if (patientId) query.patient = patientId;
      if (providerId) query.provider = providerId;
      if (serviceType) query.serviceType = serviceType;
      if (priority) query.priority = priority;

      const skip = (page - 1) * limit;

      const [authorizations, total] = await Promise.all([
        PriorAuthorization.find(query)
          .populate('patient', 'firstName lastName')
          .populate('provider', 'firstName lastName')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        PriorAuthorization.countDocuments(query),
      ]);

      res.json({
        authorizations,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/prior-auth/:id
 * @desc    Get prior authorization by ID
 * @access  Private
 */
router.get('/:id', authMiddleware, [param('id').isMongoId()], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const authorization = await PriorAuthorization.findById(req.params.id)
      .populate('patient')
      .populate('provider', 'firstName lastName email npi')
      .populate('workflow.createdBy', 'firstName lastName')
      .populate('workflow.lastModifiedBy', 'firstName lastName')
      .populate('communications.performedBy', 'firstName lastName');

    if (!authorization) {
      throw new NotFoundError('Authorization not found');
    }

    res.json(authorization);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/prior-auth/:id
 * @desc    Update prior authorization
 * @access  Private (Owner, Admin, Practitioner, Billing)
 */
router.put(
  '/:id',
  authMiddleware,
  requireRole(['owner', 'admin', 'practitioner', 'billing']),
  [param('id').isMongoId()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const authorization = await priorAuthService.updateAuthorization(
        req.params.id,
        req.body,
        req.user.id
      );

      res.json({
        message: 'Authorization updated successfully',
        authorization,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/prior-auth/:id/submit
 * @desc    Submit authorization for approval
 * @access  Private (Owner, Admin, Practitioner, Billing)
 */
router.post(
  '/:id/submit',
  authMiddleware,
  requireRole(['owner', 'admin', 'practitioner', 'billing']),
  [
    param('id').isMongoId(),
    body('method')
      .isIn(['phone', 'fax', 'portal', 'edi', 'mail', 'email'])
      .withMessage('Valid submission method required'),
    body('confirmationNumber').optional().trim(),
    body('contactPerson').optional().trim(),
    body('contactPhone').optional().trim(),
    body('followUpDate').optional().isISO8601(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const authorization = await priorAuthService.submitAuthorization(
        req.params.id,
        req.body,
        req.user.id
      );

      res.json({
        message: 'Authorization submitted successfully',
        authorization,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/prior-auth/:id/approve
 * @desc    Approve authorization
 * @access  Private (Owner, Admin, Billing)
 */
router.post(
  '/:id/approve',
  authMiddleware,
  requireRole(['owner', 'admin', 'billing']),
  [
    param('id').isMongoId(),
    body('approvedBy').notEmpty().withMessage('Approver name required'),
    body('effectiveDate').isISO8601().withMessage('Valid effective date required'),
    body('expirationDate').isISO8601().withMessage('Valid expiration date required'),
    body('authorizedServices')
      .isArray({ min: 1 })
      .withMessage('At least one authorized service required'),
    body('conditions').optional().isArray(),
    body('notes').optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const authorization = await priorAuthService.approveAuthorization(
        req.params.id,
        req.body,
        req.user.id
      );

      res.json({
        message: 'Authorization approved successfully',
        authorization,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/prior-auth/:id/deny
 * @desc    Deny authorization
 * @access  Private (Owner, Admin, Billing)
 */
router.post(
  '/:id/deny',
  authMiddleware,
  requireRole(['owner', 'admin', 'billing']),
  [
    param('id').isMongoId(),
    body('reason').notEmpty().withMessage('Denial reason required'),
    body('code').optional().trim(),
    body('notes').optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const authorization = await priorAuthService.denyAuthorization(
        req.params.id,
        req.body,
        req.user.id
      );

      res.json({
        message: 'Authorization denied',
        authorization,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/prior-auth/:id/partial-approval
 * @desc    Partially approve authorization
 * @access  Private (Owner, Admin, Billing)
 */
router.post(
  '/:id/partial-approval',
  authMiddleware,
  requireRole(['owner', 'admin', 'billing']),
  [
    param('id').isMongoId(),
    body('approvedBy').notEmpty().withMessage('Approver name required'),
    body('effectiveDate').isISO8601().withMessage('Valid effective date required'),
    body('expirationDate').isISO8601().withMessage('Valid expiration date required'),
    body('authorizedServices').isArray().withMessage('Authorized services required'),
    body('approvedServices').isArray().withMessage('Approved services list required'),
    body('deniedServices').isArray().withMessage('Denied services list required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const authorization = await priorAuthService.partialApproval(
        req.params.id,
        req.body,
        req.user.id
      );

      res.json({
        message: 'Authorization partially approved',
        authorization,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/prior-auth/:id/appeal
 * @desc    File appeal for denied authorization
 * @access  Private (Owner, Admin, Practitioner, Billing)
 */
router.post(
  '/:id/appeal',
  authMiddleware,
  requireRole(['owner', 'admin', 'practitioner', 'billing']),
  [
    param('id').isMongoId(),
    body('reason').notEmpty().withMessage('Appeal reason required'),
    body('documents').optional().isArray(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const authorization = await priorAuthService.fileAppeal(req.params.id, req.body, req.user.id);

      res.json({
        message: 'Appeal filed successfully',
        authorization,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/prior-auth/:id/utilization
 * @desc    Record utilization against authorization
 * @access  Private (Owner, Admin, Practitioner, Billing)
 */
router.post(
  '/:id/utilization',
  authMiddleware,
  requireRole(['owner', 'admin', 'practitioner', 'billing']),
  [
    param('id').isMongoId(),
    body('claimId').optional().isMongoId(),
    body('serviceDate').isISO8601().withMessage('Valid service date required'),
    body('procedureCode').notEmpty().withMessage('Procedure code required'),
    body('quantity').optional().isInt({ min: 1 }),
    body('notes').optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const authorization = await priorAuthService.recordUtilization(
        req.params.id,
        req.body,
        req.user.id
      );

      res.json({
        message: 'Utilization recorded successfully',
        authorization,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/prior-auth/:id/communication
 * @desc    Log communication
 * @access  Private (Owner, Admin, Practitioner, Billing)
 */
router.post(
  '/:id/communication',
  authMiddleware,
  requireRole(['owner', 'admin', 'practitioner', 'billing']),
  [
    param('id').isMongoId(),
    body('type')
      .isIn(['phone', 'fax', 'email', 'portal', 'mail', 'in_person'])
      .withMessage('Valid communication type required'),
    body('direction').isIn(['inbound', 'outbound']).withMessage('Valid direction required'),
    body('contactPerson').optional().trim(),
    body('contactPhone').optional().trim(),
    body('subject').optional().trim(),
    body('notes').notEmpty().withMessage('Communication notes required'),
    body('outcome').optional().trim(),
    body('followUpRequired').optional().isBoolean(),
    body('followUpDate').optional().isISO8601(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const authorization = await priorAuthService.logCommunication(
        req.params.id,
        req.body,
        req.user.id
      );

      res.json({
        message: 'Communication logged successfully',
        authorization,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/prior-auth/:id/cancel
 * @desc    Cancel authorization
 * @access  Private (Owner, Admin, Billing)
 */
router.post(
  '/:id/cancel',
  authMiddleware,
  requireRole(['owner', 'admin', 'billing']),
  [param('id').isMongoId(), body('reason').notEmpty().withMessage('Cancellation reason required')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const authorization = await priorAuthService.cancelAuthorization(
        req.params.id,
        req.body.reason,
        req.user.id
      );

      res.json({
        message: 'Authorization cancelled successfully',
        authorization,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/prior-auth/:id/alerts/:alertId/acknowledge
 * @desc    Acknowledge alert
 * @access  Private
 */
router.post(
  '/:id/alerts/:alertId/acknowledge',
  authMiddleware,
  [param('id').isMongoId(), param('alertId').isMongoId()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const authorization = await PriorAuthorization.findById(req.params.id);

      if (!authorization) {
        throw new NotFoundError('Authorization not found');
      }

      authorization.acknowledgeAlert(req.params.alertId, req.user.id);
      await authorization.save();

      res.json({
        message: 'Alert acknowledged',
        authorization,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/prior-auth/patient/:patientId/summary
 * @desc    Get authorization summary for patient
 * @access  Private
 */
router.get(
  '/patient/:patientId/summary',
  authMiddleware,
  [param('patientId').isMongoId()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const summary = await priorAuthService.getPatientSummary(req.params.patientId);

      res.json(summary);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/prior-auth/dashboard/metrics
 * @desc    Get dashboard metrics
 * @access  Private (Owner, Admin, Billing)
 */
router.get(
  '/dashboard/metrics',
  authMiddleware,
  requireRole(['owner', 'admin', 'billing']),
  async (req, res, next) => {
    try {
      const metrics = await priorAuthService.getDashboardMetrics();

      res.json(metrics);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/prior-auth/expiring
 * @desc    Get expiring authorizations
 * @access  Private (Owner, Admin, Billing)
 */
router.get(
  '/expiring',
  authMiddleware,
  requireRole(['owner', 'admin', 'billing']),
  [query('daysThreshold').optional().isInt({ min: 1, max: 365 }).toInt()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const daysThreshold = req.query.daysThreshold || 30;
      const expiring = await priorAuthService.checkExpiringAuthorizations(daysThreshold);

      res.json({
        threshold: daysThreshold,
        count: expiring.length,
        authorizations: expiring,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/prior-auth/pending
 * @desc    Get pending authorizations
 * @access  Private (Owner, Admin, Billing)
 */
router.get(
  '/pending',
  authMiddleware,
  requireRole(['owner', 'admin', 'billing']),
  async (req, res, next) => {
    try {
      const pending = await PriorAuthorization.getPending();

      res.json({
        count: pending.length,
        authorizations: pending,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/prior-auth/follow-up
 * @desc    Get authorizations requiring follow-up
 * @access  Private (Owner, Admin, Billing)
 */
router.get(
  '/follow-up',
  authMiddleware,
  requireRole(['owner', 'admin', 'billing']),
  async (req, res, next) => {
    try {
      const requireFollowUp = await PriorAuthorization.getRequiringFollowUp();

      res.json({
        count: requireFollowUp.length,
        authorizations: requireFollowUp,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/prior-auth/stats
 * @desc    Get authorization statistics
 * @access  Private (Owner, Admin, Billing)
 */
router.get(
  '/stats',
  authMiddleware,
  requireRole(['owner', 'admin', 'billing']),
  [query('startDate').optional().isISO8601(), query('endDate').optional().isISO8601()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const stats = await PriorAuthorization.getStatistics(req.query.startDate, req.query.endDate);

      res.json({
        period: {
          startDate: req.query.startDate,
          endDate: req.query.endDate,
        },
        ...stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/prior-auth/:id/letter
 * @desc    Generate authorization letter
 * @access  Private (Owner, Admin, Billing)
 */
router.get(
  '/:id/letter',
  authMiddleware,
  requireRole(['owner', 'admin', 'billing']),
  [param('id').isMongoId()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const letter = await priorAuthService.generateAuthorizationLetter(req.params.id);

      res.json(letter);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
