const express = require('express');

const { body, param, query, validationResult } = require('express-validator');

const authMiddleware = require('../../auth/middleware/authMiddleware');
const rateLimiterMiddleware = require('../../../shared/middleware/rateLimiterMiddleware');

// Mock middleware for authorization
const requireRole = (...roles) => (req, res, next) => next();
const PatientResponsibilityEstimate = require('../models/PatientResponsibilityEstimate');
const { costEstimationService } = require('../services/costEstimationService');
const { logger } = require('../utils/logger');
const { NotFoundError } = require('../utils/errors');
/**
 * Patient Responsibility Estimation Routes
 *
 * API endpoints for patient cost estimates
 */

const router = express.Router();
/**
 * @route   POST /api/patient-responsibility/estimates
 * @desc    Create new cost estimate
 * @access  Private (Owner, Admin, Billing, Practitioner)
 */
router.post(
  '/estimates',
  authMiddleware,
  requireRole(['owner', 'admin', 'billing', 'practitioner']),
  [
    body('patientId').isMongoId().withMessage('Valid patient ID required'),
    body('providerId').optional().isMongoId(),
    body('patientInfo.memberId').notEmpty().withMessage('Member ID required'),
    body('insurance.payerId').notEmpty().withMessage('Payer ID required'),
    body('insurance.payerName').notEmpty().withMessage('Payer name required'),
    body('insurance.policyNumber').notEmpty().withMessage('Policy number required'),
    body('serviceInfo.serviceType')
      .isIn([
        'office_visit',
        'procedure',
        'surgery',
        'diagnostic_test',
        'imaging',
        'lab_work',
        'therapy',
        'preventive_care',
        'emergency',
        'urgent_care',
        'hospitalization',
        'other',
      ])
      .withMessage('Valid service type required'),
    body('serviceInfo.serviceDescription').notEmpty().withMessage('Service description required'),
    body('procedureCodes').isArray({ min: 1 }).withMessage('At least one procedure code required'),
    body('procedureCodes.*.code').notEmpty().withMessage('Procedure code required'),
    body('procedureCodes.*.chargeAmount')
      .isFloat({ min: 0 })
      .withMessage('Valid charge amount required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const estimate = await costEstimationService.createEstimate(req.body, req.user.id);

      res.status(201).json({
        message: 'Cost estimate created successfully',
        estimate,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/patient-responsibility/estimates
 * @desc    List cost estimates with filtering
 * @access  Private
 */
router.get(
  '/estimates',
  authMiddleware,
  [
    query('patientId').optional().isMongoId(),
    query('status').optional().trim(),
    query('validOnly').optional().isBoolean(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { patientId, status, validOnly, page = 1, limit = 20 } = req.query;

      // Build query
      const query = {};
      if (patientId) query.patient = patientId;
      if (status) query.status = status;
      if (validOnly === 'true') {
        query['validityPeriod.isExpired'] = false;
        query['validityPeriod.validUntil'] = { $gte: new Date() };
      }

      const skip = (page - 1) * limit;

      const [estimates, total] = await Promise.all([
        PatientResponsibilityEstimate.find(query)
          .populate('patient', 'firstName lastName')
          .populate('provider', 'firstName lastName')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        PatientResponsibilityEstimate.countDocuments(query),
      ]);

      res.json({
        estimates,
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
 * @route   GET /api/patient-responsibility/estimates/:id
 * @desc    Get estimate by ID
 * @access  Private
 */
router.get('/estimates/:id', authMiddleware, [param('id').isMongoId()], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const estimate = await PatientResponsibilityEstimate.findById(req.params.id)
      .populate('patient')
      .populate('provider', 'firstName lastName npi')
      .populate('workflow.createdBy', 'firstName lastName')
      .populate('workflow.reviewedBy', 'firstName lastName');

    if (!estimate) {
      throw new NotFoundError('Estimate not found');
    }

    res.json(estimate);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/patient-responsibility/estimates/:id/patient-view
 * @desc    Get estimate formatted for patient
 * @access  Private (Patient Portal or Staff)
 */
router.get(
  '/estimates/:id/patient-view',
  authMiddleware,
  [param('id').isMongoId()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const estimate = await PatientResponsibilityEstimate.findById(req.params.id);

      if (!estimate) {
        throw new NotFoundError('Estimate not found');
      }

      const patientView = estimate.formatForPatient();

      res.json(patientView);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/patient-responsibility/estimates/:id
 * @desc    Update estimate
 * @access  Private (Owner, Admin, Billing)
 */
router.put(
  '/estimates/:id',
  authMiddleware,
  requireRole(['owner', 'admin', 'billing']),
  [param('id').isMongoId()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const estimate = await PatientResponsibilityEstimate.findById(req.params.id);

      if (!estimate) {
        throw new NotFoundError('Estimate not found');
      }

      // Update allowed fields
      const allowedUpdates = [
        'serviceInfo',
        'procedureCodes',
        'diagnosisCodes',
        'benefits',
        'internalNotes',
        'patientNotes',
        'tags',
      ];

      allowedUpdates.forEach((field) => {
        if (req.body[field] !== undefined) {
          estimate[field] = req.body[field];
        }
      });

      estimate.workflow.lastModifiedBy = req.user.id;
      await estimate.save();

      res.json({
        message: 'Estimate updated successfully',
        estimate,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/patient-responsibility/estimates/:id/recalculate
 * @desc    Recalculate estimate with updated benefits
 * @access  Private (Owner, Admin, Billing)
 */
router.post(
  '/estimates/:id/recalculate',
  authMiddleware,
  requireRole(['owner', 'admin', 'billing']),
  [param('id').isMongoId(), body('benefits').optional().isObject()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const estimate = await costEstimationService.recalculateEstimate(
        req.params.id,
        req.body.benefits || {},
        req.user.id
      );

      res.json({
        message: 'Estimate recalculated successfully',
        estimate,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/patient-responsibility/estimates/:id/provide-to-patient
 * @desc    Mark estimate as provided to patient
 * @access  Private (Owner, Admin, Billing, Practitioner)
 */
router.post(
  '/estimates/:id/provide-to-patient',
  authMiddleware,
  requireRole(['owner', 'admin', 'billing', 'practitioner']),
  [
    param('id').isMongoId(),
    body('method')
      .isIn(['in_person', 'email', 'phone', 'portal', 'mail'])
      .withMessage('Valid delivery method required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const estimate = await PatientResponsibilityEstimate.findById(req.params.id);

      if (!estimate) {
        throw new NotFoundError('Estimate not found');
      }

      estimate.markAsProvidedToPatient(req.user.id, req.body.method);
      await estimate.save();

      logger.info('Estimate provided to patient', {
        estimateId: estimate._id,
        estimateNumber: estimate.estimateNumber,
        method: req.body.method,
        userId: req.user.id,
      });

      res.json({
        message: 'Estimate marked as provided to patient',
        estimate,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/patient-responsibility/estimates/:id/acknowledge
 * @desc    Mark estimate as acknowledged by patient
 * @access  Private (Patient or Staff)
 */
router.post(
  '/estimates/:id/acknowledge',
  authMiddleware,
  [param('id').isMongoId()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const estimate = await PatientResponsibilityEstimate.findById(req.params.id);

      if (!estimate) {
        throw new NotFoundError('Estimate not found');
      }

      estimate.markAsAcknowledged();
      await estimate.save();

      logger.info('Estimate acknowledged by patient', {
        estimateId: estimate._id,
        estimateNumber: estimate.estimateNumber,
      });

      res.json({
        message: 'Estimate acknowledged',
        estimate,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/patient-responsibility/estimates/:id/compare-actual
 * @desc    Compare estimate to actual claim
 * @access  Private (Owner, Admin, Billing)
 */
router.post(
  '/estimates/:id/compare-actual',
  authMiddleware,
  requireRole(['owner', 'admin', 'billing']),
  [
    param('id').isMongoId(),
    body('claimId').isMongoId().withMessage('Valid claim ID required'),
    body('totalCharges').isFloat({ min: 0 }).withMessage('Valid total charges required'),
    body('insurancePayment').isFloat({ min: 0 }).withMessage('Valid insurance payment required'),
    body('patientResponsibility')
      .isFloat({ min: 0 })
      .withMessage('Valid patient responsibility required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const estimate = await costEstimationService.compareToActual(req.params.id, req.body);

      res.json({
        message: 'Estimate compared to actual claim',
        estimate,
        comparison: {
          estimated: estimate.patientResponsibility.estimatedTotal,
          actual: estimate.actual.actualPatientResponsibility,
          variance: estimate.actual.variance,
          variancePercentage: estimate.actual.variancePercentage,
          accuracyScore: estimate.accuracy.accuracyScore,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/patient-responsibility/patients/:patientId/summary
 * @desc    Get estimate summary for patient
 * @access  Private
 */
router.get(
  '/patients/:patientId/summary',
  authMiddleware,
  [param('patientId').isMongoId()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const summary = await costEstimationService.generatePatientSummary(req.params.patientId);

      res.json(summary);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/patient-responsibility/expiring
 * @desc    Get expiring estimates
 * @access  Private (Owner, Admin, Billing)
 */
router.get(
  '/expiring',
  authMiddleware,
  requireRole(['owner', 'admin', 'billing']),
  [query('daysThreshold').optional().isInt({ min: 1, max: 90 }).toInt()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const daysThreshold = req.query.daysThreshold || 7;
      const expiring = await PatientResponsibilityEstimate.getExpiring(daysThreshold);

      res.json({
        threshold: daysThreshold,
        count: expiring.length,
        estimates: expiring,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/patient-responsibility/stats
 * @desc    Get estimate statistics
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

      const stats = await PatientResponsibilityEstimate.getStatistics(
        req.query.startDate,
        req.query.endDate
      );

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
 * @route   GET /api/patient-responsibility/accuracy
 * @desc    Get accuracy statistics
 * @access  Private (Owner, Admin, Billing)
 */
router.get(
  '/accuracy',
  authMiddleware,
  requireRole(['owner', 'admin', 'billing']),
  [query('startDate').optional().isISO8601(), query('endDate').optional().isISO8601()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const accuracy = await PatientResponsibilityEstimate.getAccuracyStats(
        req.query.startDate,
        req.query.endDate
      );

      res.json({
        period: {
          startDate: req.query.startDate,
          endDate: req.query.endDate,
        },
        ...accuracy,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/patient-responsibility/bulk-create
 * @desc    Bulk create estimates
 * @access  Private (Owner, Admin, Billing)
 */
router.post(
  '/bulk-create',
  authMiddleware,
  requireRole(['owner', 'admin', 'billing']),
  [body('estimates').isArray({ min: 1, max: 100 }).withMessage('Provide 1-100 estimates')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await costEstimationService.bulkCreateEstimates(req.body, req.user.id);

      res.status(201).json({
        message: `Created ${result.successful} of ${result.total} estimates`,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/patient-responsibility/estimates/:id
 * @desc    Delete estimate
 * @access  Private (Owner, Admin)
 */
router.delete(
  '/estimates/:id',
  authMiddleware,
  requireRole(['owner', 'admin']),
  [param('id').isMongoId()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const estimate = await PatientResponsibilityEstimate.findById(req.params.id);

      if (!estimate) {
        throw new NotFoundError('Estimate not found');
      }

      // Can only delete draft estimates
      if (estimate.status !== 'draft') {
        return res.status(400).json({
          error: 'Can only delete draft estimates',
        });
      }

      await estimate.deleteOne();

      logger.info('Estimate deleted', {
        estimateId: estimate._id,
        estimateNumber: estimate.estimateNumber,
        userId: req.user.id,
      });

      res.json({
        message: 'Estimate deleted successfully',
        estimateId: estimate._id,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
