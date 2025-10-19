const express = require('express');

const { body, param, query } = require('express-validator');

const { asyncHandler, validateRequest } = require('../middleware/errorHandler');
const { authMiddleware, requireRole } = require('../middleware/rolePermissions');
const { cobManager } = require('../services/cobManager');
const COBRecord = require('../models/COBRecord');
const { logger } = require('../utils/logger');
const { NotFoundError } = require('../utils/errors');
/**
 * COB API Routes
 *
 * Endpoints for coordination of benefits management
 */

const router = express.Router();
/**
 * @route   POST /api/cob
 * @desc    Create COB record
 * @access  Private (practitioner, admin, owner)
 */
router.post(
  '/',
  authMiddleware,
  requireRole(['practitioner', 'admin', 'owner']),
  validateRequest([
    body('patientId').isMongoId().withMessage('Valid patient ID required'),
    body('insurancePlans')
      .isArray({ min: 1, max: 10 })
      .withMessage('1-10 insurance plans required'),
    body('serviceDate').optional().isISO8601(),
    body('patientInfo').optional().isObject(),
    body('specialSituations').optional().isObject(),
  ]),
  asyncHandler(async (req, res) => {
    const {
      patientId,
      insurancePlans,
      serviceDate,
      patientInfo,
      specialSituations,
      autoVerify = false,
    } = req.body;

    const cobRecord = await cobManager.createCOBRecord(
      patientId,
      insurancePlans,
      serviceDate || new Date(),
      req.user.userId,
      {
        patientInfo,
        specialSituations,
        autoVerify,
      }
    );

    res.status(201).json({
      success: true,
      data: { cobRecord },
    });
  })
);

/**
 * @route   GET /api/cob/patient/:patientId
 * @desc    Get current COB for patient
 * @access  Private
 */
router.get(
  '/patient/:patientId',
  authMiddleware,
  validateRequest([param('patientId').isMongoId(), query('serviceDate').optional().isISO8601()]),
  asyncHandler(async (req, res) => {
    const { patientId } = req.params;
    const { serviceDate } = req.query;

    const cobRecord = await cobManager.getCOBForPatient(
      patientId,
      serviceDate ? new Date(serviceDate) : new Date()
    );

    if (!cobRecord) {
      return res.json({
        success: true,
        data: {
          hasCOB: false,
          message: 'No COB record found for this patient and date',
        },
      });
    }

    res.json({
      success: true,
      data: {
        hasCOB: true,
        cobRecord,
      },
    });
  })
);

/**
 * @route   GET /api/cob/patient/:patientId/summary
 * @desc    Get COB summary for patient
 * @access  Private
 */
router.get(
  '/patient/:patientId/summary',
  authMiddleware,
  validateRequest([param('patientId').isMongoId()]),
  asyncHandler(async (req, res) => {
    const summary = await cobManager.getCOBSummary(req.params.patientId);

    res.json({
      success: true,
      data: summary,
    });
  })
);

/**
 * @route   GET /api/cob/:id
 * @desc    Get COB record by ID
 * @access  Private
 */
router.get(
  '/:id',
  authMiddleware,
  validateRequest([param('id').isMongoId()]),
  asyncHandler(async (req, res) => {
    const cobRecord = await COBRecord.findById(req.params.id)
      .populate('patient', 'firstName lastName dateOfBirth')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!cobRecord) {
      throw new NotFoundError('COB record', req.params.id);
    }

    res.json({
      success: true,
      data: { cobRecord },
    });
  })
);

/**
 * @route   PUT /api/cob/:id
 * @desc    Update COB record
 * @access  Private (practitioner, admin, owner)
 */
router.put(
  '/:id',
  authMiddleware,
  requireRole(['practitioner', 'admin', 'owner']),
  validateRequest([
    param('id').isMongoId(),
    body('insurancePlans').optional().isArray({ min: 1, max: 10 }),
    body('serviceDate').optional().isISO8601(),
    body('specialSituations').optional().isObject(),
    body('patientInfo').optional().isObject(),
  ]),
  asyncHandler(async (req, res) => {
    const cobRecord = await cobManager.updateCOBRecord(req.params.id, req.body, req.user.userId);

    res.json({
      success: true,
      data: { cobRecord },
    });
  })
);

/**
 * @route   POST /api/cob/:id/verify
 * @desc    Verify COB record
 * @access  Private (practitioner, admin, owner)
 */
router.post(
  '/:id/verify',
  authMiddleware,
  requireRole(['practitioner', 'admin', 'owner']),
  validateRequest([
    param('id').isMongoId(),
    body('method')
      .isIn(['manual', 'eligibility_api', 'phone', 'portal', 'other'])
      .withMessage('Valid method required'),
  ]),
  asyncHandler(async (req, res) => {
    const { method } = req.body;

    const cobRecord = await cobManager.verifyCOB(req.params.id, method, req.user.userId);

    res.json({
      success: true,
      data: { cobRecord },
    });
  })
);

/**
 * @route   POST /api/cob/:id/conflicts/:conflictIndex/resolve
 * @desc    Resolve COB conflict
 * @access  Private (practitioner, admin, owner)
 */
router.post(
  '/:id/conflicts/:conflictIndex/resolve',
  authMiddleware,
  requireRole(['practitioner', 'admin', 'owner']),
  validateRequest([
    param('id').isMongoId(),
    param('conflictIndex').isInt({ min: 0 }),
    body('resolution').trim().notEmpty().withMessage('Resolution required'),
  ]),
  asyncHandler(async (req, res) => {
    const { resolution } = req.body;
    const conflictIndex = parseInt(req.params.conflictIndex, 10);

    const cobRecord = await COBRecord.findById(req.params.id);

    if (!cobRecord) {
      throw new NotFoundError('COB record', req.params.id);
    }

    cobRecord.resolveConflict(conflictIndex, resolution, req.user.userId);
    await cobRecord.save();

    logger.info('COB conflict resolved', {
      cobRecordId: cobRecord._id,
      conflictIndex,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      data: { cobRecord },
    });
  })
);

/**
 * @route   POST /api/cob/:id/plans
 * @desc    Add insurance plan to COB record
 * @access  Private (practitioner, admin, owner)
 */
router.post(
  '/:id/plans',
  authMiddleware,
  requireRole(['practitioner', 'admin', 'owner']),
  validateRequest([
    param('id').isMongoId(),
    body('plan').isObject().withMessage('Insurance plan required'),
  ]),
  asyncHandler(async (req, res) => {
    const { plan } = req.body;

    const cobRecord = await COBRecord.findById(req.params.id);

    if (!cobRecord) {
      throw new NotFoundError('COB record', req.params.id);
    }

    cobRecord.addInsurancePlan(plan, req.user.userId);

    // Redetermine COB order
    const patientInfo = { dateOfBirth: new Date() }; // Should fetch from patient record
    const cobResult = await cobManager.determineCOBOrder(cobRecord.insurancePlans, patientInfo, {});

    cobRecord.updateCOBOrder(cobResult.cobOrder, cobResult.decisions[0], req.user.userId);

    await cobRecord.save();

    res.json({
      success: true,
      data: { cobRecord },
    });
  })
);

/**
 * @route   DELETE /api/cob/:id/plans/:planIndex
 * @desc    Remove insurance plan from COB record
 * @access  Private (practitioner, admin, owner)
 */
router.delete(
  '/:id/plans/:planIndex',
  authMiddleware,
  requireRole(['practitioner', 'admin', 'owner']),
  validateRequest([param('id').isMongoId(), param('planIndex').isInt({ min: 0 })]),
  asyncHandler(async (req, res) => {
    const planIndex = parseInt(req.params.planIndex, 10);

    const cobRecord = await COBRecord.findById(req.params.id);

    if (!cobRecord) {
      throw new NotFoundError('COB record', req.params.id);
    }

    cobRecord.removeInsurancePlan(planIndex, req.user.userId, req.body.reason);

    // Redetermine COB order if more than one plan remains
    if (cobRecord.insurancePlans.length > 0) {
      const patientInfo = { dateOfBirth: new Date() };
      const cobResult = await cobManager.determineCOBOrder(
        cobRecord.insurancePlans,
        patientInfo,
        {}
      );

      cobRecord.updateCOBOrder(cobResult.cobOrder, cobResult.decisions[0], req.user.userId);
    }

    await cobRecord.save();

    res.json({
      success: true,
      data: { cobRecord },
    });
  })
);

/**
 * @route   GET /api/cob/needs-attention
 * @desc    Get COB records needing attention
 * @access  Private (admin, owner)
 */
router.get(
  '/needs-attention',
  authMiddleware,
  requireRole(['admin', 'owner']),
  asyncHandler(async (req, res) => {
    const results = await cobManager.getRecordsNeedingAttention();

    res.json({
      success: true,
      data: results,
    });
  })
);

/**
 * @route   GET /api/cob/conflicts
 * @desc    Get all COB records with conflicts
 * @access  Private (admin, owner)
 */
router.get(
  '/conflicts',
  authMiddleware,
  requireRole(['admin', 'owner']),
  asyncHandler(async (req, res) => {
    const records = await COBRecord.getWithConflicts();

    res.json({
      success: true,
      data: {
        count: records.length,
        records,
      },
    });
  })
);

/**
 * @route   GET /api/cob/verification-needed
 * @desc    Get COB records needing verification
 * @access  Private (admin, owner)
 */
router.get(
  '/verification-needed',
  authMiddleware,
  requireRole(['admin', 'owner']),
  asyncHandler(async (req, res) => {
    const { daysThreshold = 90 } = req.query;

    const records = await COBRecord.getNeedingVerification(parseInt(daysThreshold, 10));

    res.json({
      success: true,
      data: {
        count: records.length,
        records,
        threshold: `${daysThreshold} days`,
      },
    });
  })
);

/**
 * @route   POST /api/cob/determine-order
 * @desc    Determine COB order without creating record (preview)
 * @access  Private
 */
router.post(
  '/determine-order',
  authMiddleware,
  validateRequest([
    body('insurancePlans').isArray({ min: 1 }).withMessage('At least one plan required'),
    body('patientInfo').optional().isObject(),
    body('specialSituations').optional().isObject(),
  ]),
  asyncHandler(async (req, res) => {
    const { insurancePlans, patientInfo = {}, specialSituations = {} } = req.body;

    const result = await cobManager.determineCOBOrder(
      insurancePlans,
      patientInfo,
      specialSituations
    );

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * @route   GET /api/cob/stats
 * @desc    Get COB statistics
 * @access  Private (admin, owner)
 */
router.get(
  '/stats',
  authMiddleware,
  requireRole(['admin', 'owner']),
  asyncHandler(async (req, res) => {
    const [total, active, conflicts, needingVerification, byStatus] = await Promise.all([
      COBRecord.countDocuments(),
      COBRecord.countDocuments({ status: 'active' }),
      COBRecord.countDocuments({ 'conflicts.resolved': false }),
      COBRecord.getNeedingVerification(90).then((records) => records.length),
      COBRecord.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    const stats = {
      total,
      active,
      conflicts,
      needingVerification,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    };

    res.json({
      success: true,
      data: stats,
    });
  })
);

module.exports = router;
