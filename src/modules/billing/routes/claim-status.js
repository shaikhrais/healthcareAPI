const express = require('express');

const { body, param, query, validationResult } = require('express-validator');

const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/rolePermissions');
const { claimStatusService, StatusCategories } = require('../services/claimStatusService');
const { logger } = require('../utils/logger');
/**
 * Claim Status Routes
 *
 * API endpoints for claim status tracking and 276/277 transactions
 */

const router = express.Router();
/**
 * @route   PUT /api/claims/:id/status
 * @desc    Update claim status
 * @access  Private (Owner, Admin, Billing)
 */
router.put(
  '/:id/status',
  authMiddleware,
  requireRole(['owner', 'admin', 'billing']),
  [
    param('id').isMongoId(),
    body('status')
      .isIn([
        'draft',
        'submitted',
        'acknowledged',
        'pending',
        'under_review',
        'pended',
        'approved_for_payment',
        'paid',
        'partially_paid',
        'denied',
        'rejected',
        'appealed',
        'resubmitted',
        'cancelled',
        'closed',
      ])
      .withMessage('Valid status required'),
    body('reason').optional().trim(),
    body('notes').optional().trim(),
    body('source').optional().isIn(['manual', 'edi_277', 'portal', 'api']),
    body('referenceNumber').optional().trim(),
    body('statusCode').optional().trim(),
    body('paymentAmount').optional().isFloat({ min: 0 }),
    body('paymentDate').optional().isISO8601(),
    body('checkNumber').optional().trim(),
    body('denialReason').optional().trim(),
    body('denialCode').optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await claimStatusService.updateClaimStatus(
        req.params.id,
        req.body.status,
        req.body,
        req.user.id
      );

      res.json({
        message: 'Claim status updated successfully',
        claim: result.claim,
        statusEntry: result.statusEntry,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/claims/:id/status-history
 * @desc    Get status history for claim
 * @access  Private
 */
router.get(
  '/:id/status-history',
  authMiddleware,
  [param('id').isMongoId()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const history = await claimStatusService.getStatusHistory(req.params.id);

      res.json(history);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/claims/:id/timeline
 * @desc    Get status timeline for claim
 * @access  Private
 */
router.get('/:id/timeline', authMiddleware, [param('id').isMongoId()], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const timeline = await claimStatusService.getStatusTimeline(req.params.id);

    res.json(timeline);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/claim-status/by-status/:status
 * @desc    Get claims by status
 * @access  Private (Owner, Admin, Billing)
 */
router.get(
  '/by-status/:status',
  authMiddleware,
  requireRole(['owner', 'admin', 'billing']),
  [
    param('status').trim(),
    query('payerId').optional().trim(),
    query('providerId').optional().isMongoId(),
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601(),
    query('limit').optional().isInt({ min: 1, max: 500 }).toInt(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const claims = await claimStatusService.getClaimsByStatus(req.params.status, req.query);

      res.json({
        status: req.params.status,
        count: claims.length,
        claims,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/claim-status/aging-report
 * @desc    Get aging report by status
 * @access  Private (Owner, Admin, Billing)
 */
router.get(
  '/aging-report',
  authMiddleware,
  requireRole(['owner', 'admin', 'billing']),
  async (req, res, next) => {
    try {
      const report = await claimStatusService.getAgingReport();

      res.json(report);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/claim-status/stale-claims
 * @desc    Get stale claims (no status update in X days)
 * @access  Private (Owner, Admin, Billing)
 */
router.get(
  '/stale-claims',
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
      const staleClaims = await claimStatusService.checkStaleClaims(daysThreshold);

      res.json({
        threshold: daysThreshold,
        count: staleClaims.length,
        claims: staleClaims,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/claim-status/statistics
 * @desc    Get status statistics
 * @access  Private (Owner, Admin, Billing)
 */
router.get(
  '/statistics',
  authMiddleware,
  requireRole(['owner', 'admin', 'billing']),
  [query('startDate').optional().isISO8601(), query('endDate').optional().isISO8601()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const stats = await claimStatusService.getStatusStatistics(
        req.query.startDate,
        req.query.endDate
      );

      res.json(stats);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/claim-status/276-inquiry
 * @desc    Generate 276 claim status inquiry
 * @access  Private (Owner, Admin, Billing)
 */
router.post(
  '/276-inquiry',
  authMiddleware,
  requireRole(['owner', 'admin', 'billing']),
  [
    body('claimIds').isArray({ min: 1, max: 100 }).withMessage('Provide 1-100 claim IDs'),
    body('claimIds.*').isMongoId(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const inquiry276 = await claimStatusService.generate276Inquiry(req.body.claimIds);

      logger.info('276 inquiry generated', {
        claimCount: inquiry276.claims.length,
        userId: req.user.id,
      });

      res.json({
        message: '276 inquiry generated successfully',
        inquiry: inquiry276,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/claim-status/277-response
 * @desc    Process 277 claim status response
 * @access  Private (Owner, Admin, Billing)
 */
router.post(
  '/277-response',
  authMiddleware,
  requireRole(['owner', 'admin', 'billing']),
  [
    body('claims').isArray({ min: 1 }).withMessage('Claims array required'),
    body('claims.*.claimNumber').notEmpty().withMessage('Claim number required'),
    body('claims.*.statusCode').notEmpty().withMessage('Status code required'),
    body('claims.*.statusDescription').optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await claimStatusService.process277Response(req.body);

      logger.info('277 response processed', {
        total: result.total,
        successful: result.successful,
        failed: result.failed,
        userId: req.user.id,
      });

      res.json({
        message: `Processed ${result.successful} of ${result.total} claim status updates`,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/claims/:id/mark-paid
 * @desc    Mark claim as paid (convenience endpoint)
 * @access  Private (Owner, Admin, Billing)
 */
router.post(
  '/:id/mark-paid',
  authMiddleware,
  requireRole(['owner', 'admin', 'billing']),
  [
    param('id').isMongoId(),
    body('paymentAmount').isFloat({ min: 0 }).withMessage('Valid payment amount required'),
    body('paymentDate').isISO8601().withMessage('Valid payment date required'),
    body('checkNumber').optional().trim(),
    body('eraNumber').optional().trim(),
    body('notes').optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await claimStatusService.updateClaimStatus(
        req.params.id,
        'paid',
        {
          paymentAmount: req.body.paymentAmount,
          paymentDate: req.body.paymentDate,
          checkNumber: req.body.checkNumber,
          eraNumber: req.body.eraNumber,
          notes: req.body.notes,
          reason: 'Payment received',
          source: req.body.source || 'manual',
        },
        req.user.id
      );

      res.json({
        message: 'Claim marked as paid successfully',
        claim: result.claim,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/claims/:id/mark-denied
 * @desc    Mark claim as denied (convenience endpoint)
 * @access  Private (Owner, Admin, Billing)
 */
router.post(
  '/:id/mark-denied',
  authMiddleware,
  requireRole(['owner', 'admin', 'billing']),
  [
    param('id').isMongoId(),
    body('denialReason').notEmpty().withMessage('Denial reason required'),
    body('denialCode').optional().trim(),
    body('isAppealable').optional().isBoolean(),
    body('notes').optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await claimStatusService.updateClaimStatus(
        req.params.id,
        'denied',
        {
          denialReason: req.body.denialReason,
          denialCode: req.body.denialCode,
          isAppealable: req.body.isAppealable,
          notes: req.body.notes,
          reason: `Denied: ${req.body.denialReason}`,
          source: req.body.source || 'manual',
        },
        req.user.id
      );

      res.json({
        message: 'Claim marked as denied',
        claim: result.claim,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/claims/:id/pend
 * @desc    Pend claim (additional information required)
 * @access  Private (Owner, Admin, Billing)
 */
router.post(
  '/:id/pend',
  authMiddleware,
  requireRole(['owner', 'admin', 'billing']),
  [
    param('id').isMongoId(),
    body('pendReason').notEmpty().withMessage('Pend reason required'),
    body('informationRequested').optional().isArray(),
    body('responseDeadline').optional().isISO8601(),
    body('notes').optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await claimStatusService.updateClaimStatus(
        req.params.id,
        'pended',
        {
          pendReason: req.body.pendReason,
          informationRequested: req.body.informationRequested,
          responseDeadline: req.body.responseDeadline,
          notes: req.body.notes,
          reason: `Pended: ${req.body.pendReason}`,
          source: req.body.source || 'manual',
        },
        req.user.id
      );

      res.json({
        message: 'Claim pended successfully',
        claim: result.claim,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
