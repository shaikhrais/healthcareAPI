const express = require('express');

const { body, param, query, validationResult } = require('express-validator');

const { asyncHandler, validateRequest } = require('../middleware/errorHandler');
const { authMiddleware, requireRole } = require('../middleware/rolePermissions');
const { secondaryClaimGenerator } = require('../services/secondaryClaimGenerator');
const Claim = require('../models/Claim');
const { logger } = require('../utils/logger');
const { NotFoundError, BadRequestError } = require('../utils/errors');
/**
 * Secondary Claims API Routes
 *
 * Endpoints for managing secondary claims and COB
 */

const router = express.Router();
/**
 * @route   POST /api/secondary-claims/generate/:primaryClaimId
 * @desc    Generate secondary claim from primary claim
 * @access  Private (practitioner, admin, owner)
 */
router.post(
  '/generate/:primaryClaimId',
  authMiddleware,
  requireRole(['practitioner', 'admin', 'owner']),
  validateRequest([
    param('primaryClaimId').isMongoId().withMessage('Invalid primary claim ID'),
    body('amount').isFloat({ min: 0 }).withMessage('Valid payment amount is required'),
    body('date').optional().isISO8601().withMessage('Valid payment date required'),
    body('patientResponsibility')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Valid patient responsibility required'),
    body('adjustments').optional().isArray().withMessage('Adjustments must be an array'),
    body('eobDocument').optional().isString().withMessage('EOB document must be a string'),
    body('autoSubmit').optional().isBoolean().withMessage('autoSubmit must be boolean'),
  ]),
  asyncHandler(async (req, res) => {
    const { primaryClaimId } = req.params;
    const {
      amount,
      date,
      patientResponsibility = 0,
      adjustments = [],
      eobDocument,
      autoSubmit = false,
    } = req.body;

    // Validate secondary readiness
    const validation = await secondaryClaimGenerator.validateSecondaryReadiness(primaryClaimId);

    if (!validation.ready) {
      const failedChecks = validation.validations.filter((v) => !v.passed).map((v) => v.message);

      throw new BadRequestError(`Cannot generate secondary claim: ${failedChecks.join(', ')}`);
    }

    // Generate secondary claim
    const result = await secondaryClaimGenerator.generateSecondaryClaim(
      primaryClaimId,
      {
        amount,
        date: date || new Date(),
        patientResponsibility,
        adjustments,
        eobDocument,
      },
      {
        userId: req.user.userId,
        autoSubmit,
      }
    );

    logger.info('Secondary claim generated via API', {
      primaryClaimId,
      secondaryClaimId: result.secondaryClaim._id,
      userId: req.user.userId,
    });

    res.status(201).json({
      success: true,
      data: {
        primaryClaim: {
          id: result.primaryClaim._id,
          claimNumber: result.primaryClaim.claimNumber,
          secondaryClaimId: result.primaryClaim.cob.secondaryClaimId,
        },
        secondaryClaim: result.secondaryClaim,
        amounts: result.amounts,
      },
    });
  })
);

/**
 * @route   GET /api/secondary-claims/validate/:primaryClaimId
 * @desc    Validate if primary claim is ready for secondary filing
 * @access  Private
 */
router.get(
  '/validate/:primaryClaimId',
  authMiddleware,
  validateRequest([param('primaryClaimId').isMongoId()]),
  asyncHandler(async (req, res) => {
    const validation = await secondaryClaimGenerator.validateSecondaryReadiness(
      req.params.primaryClaimId
    );

    res.json({
      success: true,
      data: validation,
    });
  })
);

/**
 * @route   GET /api/secondary-claims/ready
 * @desc    Get all primary claims ready for secondary filing
 * @access  Private (practitioner, admin, owner)
 */
router.get(
  '/ready',
  authMiddleware,
  requireRole(['practitioner', 'admin', 'owner']),
  asyncHandler(async (req, res) => {
    const readyClaims = await secondaryClaimGenerator.getReadyForSecondary();

    // Enrich with validation details
    const enrichedClaims = await Promise.all(
      readyClaims.map(async (claim) => {
        const validation = await secondaryClaimGenerator.validateSecondaryReadiness(claim._id);

        return {
          claim: {
            _id: claim._id,
            claimNumber: claim.claimNumber,
            patient: claim.patient,
            serviceDate: claim.serviceDate,
            totalCharges: claim.totalCharges,
            amountPaid: claim.amountPaid,
            patientResponsibility: claim.patientResponsibility,
            primaryPayment: claim.cob.primaryPayment,
            secondaryInsurance: claim.secondaryInsurance,
          },
          validation,
        };
      })
    );

    res.json({
      success: true,
      data: {
        count: enrichedClaims.length,
        claims: enrichedClaims,
      },
    });
  })
);

/**
 * @route   POST /api/secondary-claims/batch/generate
 * @desc    Batch generate secondary claims
 * @access  Private (admin, owner)
 */
router.post(
  '/batch/generate',
  authMiddleware,
  requireRole(['admin', 'owner']),
  validateRequest([
    body('primaryClaimIds').isArray({ min: 1 }).withMessage('At least one claim ID required'),
    body('primaryClaimIds.*').isMongoId().withMessage('Invalid claim ID'),
  ]),
  asyncHandler(async (req, res) => {
    const { primaryClaimIds } = req.body;

    // Get primary claims
    const primaryClaims = await Claim.find({
      _id: { $in: primaryClaimIds },
    });

    if (primaryClaims.length === 0) {
      throw new NotFoundError('No claims found');
    }

    // Batch generate
    const results = await secondaryClaimGenerator.batchGenerateSecondaryClaims(
      primaryClaims,
      req.user.userId
    );

    logger.info('Batch secondary generation completed', {
      totalProcessed: results.totalProcessed,
      successful: results.successful.length,
      failed: results.failed.length,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      data: results,
    });
  })
);

/**
 * @route   GET /api/secondary-claims/by-primary/:primaryClaimId
 * @desc    Get secondary claim for a primary claim
 * @access  Private
 */
router.get(
  '/by-primary/:primaryClaimId',
  authMiddleware,
  validateRequest([param('primaryClaimId').isMongoId()]),
  asyncHandler(async (req, res) => {
    const primaryClaim = await Claim.findById(req.params.primaryClaimId);

    if (!primaryClaim) {
      throw new NotFoundError('Primary claim', req.params.primaryClaimId);
    }

    if (!primaryClaim.cob.secondaryClaimId) {
      return res.json({
        success: true,
        data: {
          hasSecondary: false,
          message: 'No secondary claim filed for this primary claim',
        },
      });
    }

    const secondaryClaim = await Claim.findById(primaryClaim.cob.secondaryClaimId).populate(
      'scrubbing.report'
    );

    if (!secondaryClaim) {
      throw new NotFoundError('Secondary claim', primaryClaim.cob.secondaryClaimId);
    }

    res.json({
      success: true,
      data: {
        hasSecondary: true,
        primaryClaim: {
          _id: primaryClaim._id,
          claimNumber: primaryClaim.claimNumber,
          status: primaryClaim.status,
          amountPaid: primaryClaim.amountPaid,
          primaryPayment: primaryClaim.cob.primaryPayment,
        },
        secondaryClaim,
      },
    });
  })
);

/**
 * @route   GET /api/secondary-claims/by-secondary/:secondaryClaimId
 * @desc    Get primary claim for a secondary claim
 * @access  Private
 */
router.get(
  '/by-secondary/:secondaryClaimId',
  authMiddleware,
  validateRequest([param('secondaryClaimId').isMongoId()]),
  asyncHandler(async (req, res) => {
    const secondaryClaim = await Claim.findById(req.params.secondaryClaimId);

    if (!secondaryClaim) {
      throw new NotFoundError('Secondary claim', req.params.secondaryClaimId);
    }

    if (!secondaryClaim.cob.isSecondary) {
      throw new BadRequestError('Claim is not a secondary claim');
    }

    const primaryClaim = await Claim.findById(secondaryClaim.cob.primaryClaimId);

    if (!primaryClaim) {
      throw new NotFoundError('Primary claim', secondaryClaim.cob.primaryClaimId);
    }

    res.json({
      success: true,
      data: {
        primaryClaim,
        secondaryClaim: {
          _id: secondaryClaim._id,
          claimNumber: secondaryClaim.claimNumber,
          status: secondaryClaim.status,
          totalCharges: secondaryClaim.totalCharges,
          amountPaid: secondaryClaim.amountPaid,
        },
      },
    });
  })
);

/**
 * @route   PUT /api/secondary-claims/:primaryClaimId/primary-payment
 * @desc    Update primary payment information
 * @access  Private (practitioner, admin, owner)
 */
router.put(
  '/:primaryClaimId/primary-payment',
  authMiddleware,
  requireRole(['practitioner, admin, owner']),
  validateRequest([
    param('primaryClaimId').isMongoId(),
    body('amount').isFloat({ min: 0 }).withMessage('Valid payment amount required'),
    body('date').optional().isISO8601().withMessage('Valid payment date required'),
    body('patientResponsibility').optional().isFloat({ min: 0 }),
    body('adjustments').optional().isArray(),
    body('eobReceived').optional().isBoolean(),
    body('eobDocument').optional().isString(),
  ]),
  asyncHandler(async (req, res) => {
    const claim = await Claim.findById(req.params.primaryClaimId);

    if (!claim) {
      throw new NotFoundError('Claim', req.params.primaryClaimId);
    }

    const { amount, date, patientResponsibility, adjustments, eobReceived, eobDocument } = req.body;

    // Update primary payment info
    claim.amountPaid = amount;
    claim.patientResponsibility = patientResponsibility || 0;

    if (claim.payment) {
      claim.payment.receivedDate = date || new Date();
      if (adjustments) claim.payment.adjustments = adjustments;
    } else {
      claim.payment = {
        receivedDate: date || new Date(),
        adjustments: adjustments || [],
      };
    }

    // Update COB info
    claim.cob.primaryPayment = {
      amount,
      date: date || new Date(),
      eobReceived: eobReceived !== undefined ? eobReceived : true,
      eobDocument: eobDocument || claim.cob.primaryPayment?.eobDocument,
    };
    claim.cob.patientResponsibilityFromPrimary = patientResponsibility || 0;

    // Update status if paid
    if (amount > 0 && claim.status !== 'paid') {
      claim.status = 'paid';
    }

    claim.updatedBy = req.user.userId;
    await claim.save();

    logger.info('Primary payment updated', {
      claimId: claim._id,
      claimNumber: claim.claimNumber,
      amount,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      data: { claim },
    });
  })
);

/**
 * @route   GET /api/secondary-claims/stats
 * @desc    Get secondary claims statistics
 * @access  Private (admin, owner)
 */
router.get(
  '/stats',
  authMiddleware,
  requireRole(['admin', 'owner']),
  asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const filter = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

    const [
      totalWithSecondary,
      readyForSecondary,
      secondaryFiled,
      secondaryPaid,
      totalSecondaryCharges,
      totalSecondaryPaid,
    ] = await Promise.all([
      Claim.countDocuments({
        ...filter,
        'secondaryInsurance.hasSecondary': true,
      }),
      Claim.countDocuments({
        ...filter,
        'cob.isPrimary': true,
        'secondaryInsurance.hasSecondary': true,
        'cob.primaryPayment.eobReceived': true,
        'cob.secondaryClaimId': { $exists: false },
        status: 'paid',
      }),
      Claim.countDocuments({
        ...filter,
        'cob.isSecondary': true,
      }),
      Claim.countDocuments({
        ...filter,
        'cob.isSecondary': true,
        status: 'paid',
      }),
      Claim.aggregate([
        { $match: { ...filter, 'cob.isSecondary': true } },
        { $group: { _id: null, total: { $sum: '$totalCharges' } } },
      ]),
      Claim.aggregate([
        { $match: { ...filter, 'cob.isSecondary': true, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } },
      ]),
    ]);

    const stats = {
      totalWithSecondary,
      readyForSecondary,
      secondaryFiled,
      secondaryPaid,
      secondaryPending: secondaryFiled - secondaryPaid,
      totalSecondaryCharges: totalSecondaryCharges[0]?.total || 0,
      totalSecondaryPaid: totalSecondaryPaid[0]?.total || 0,
      collectionRate:
        totalSecondaryCharges[0]?.total > 0
          ? (((totalSecondaryPaid[0]?.total || 0) / totalSecondaryCharges[0].total) * 100).toFixed(
              2
            )
          : 0,
    };

    res.json({
      success: true,
      data: stats,
    });
  })
);

/**
 * @route   GET /api/secondary-claims/cob-order
 * @desc    Determine COB order for patient with multiple insurances
 * @access  Private
 */
router.post(
  '/cob-order',
  authMiddleware,
  validateRequest([
    body('patientInfo').notEmpty().withMessage('Patient info required'),
    body('insurance1').notEmpty().withMessage('Insurance 1 required'),
    body('insurance2').notEmpty().withMessage('Insurance 2 required'),
  ]),
  asyncHandler(async (req, res) => {
    const { patientInfo, insurance1, insurance2 } = req.body;

    const cobOrder = secondaryClaimGenerator.determineCOBOrder(patientInfo, insurance1, insurance2);

    res.json({
      success: true,
      data: cobOrder,
    });
  })
);

module.exports = router;
