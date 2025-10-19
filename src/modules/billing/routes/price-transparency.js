const express = require('express');

const { body, param, query, validationResult } = require('express-validator');

const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/rolePermissions');
const FeeSchedule = require('../models/FeeSchedule');
const { priceTransparencyService } = require('../services/priceTransparencyService');
const { logger } = require('../utils/logger');
/**
 * Price Transparency Routes
 *
 * Public and private API endpoints for cost transparency
 */

const router = express.Router();
/**
 * @route   GET /api/price-transparency/standard-charges
 * @desc    Get standard charges (PUBLIC - no auth required)
 * @access  Public
 */
router.get(
  '/standard-charges',
  [
    query('category').optional().trim(),
    query('codeSearch').optional().trim(),
    query('limit').optional().isInt({ min: 1, max: 1000 }).toInt(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const charges = await priceTransparencyService.getStandardCharges(req.query);

      res.json(charges);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/price-transparency/search
 * @desc    Search for services (PUBLIC)
 * @access  Public
 */
router.get(
  '/search',
  [
    query('q').notEmpty().withMessage('Search term required'),
    query('scheduleType').optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const results = await priceTransparencyService.searchServices(req.query.q, {
        scheduleType: req.query.scheduleType,
      });

      res.json({
        searchTerm: req.query.q,
        count: results.length,
        results,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/price-transparency/compare/:procedureCode
 * @desc    Compare prices across payers (PUBLIC)
 * @access  Public
 */
router.get(
  '/compare/:procedureCode',
  [param('procedureCode').notEmpty()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const comparison = await priceTransparencyService.comparePrices(req.params.procedureCode);

      res.json(comparison);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/price-transparency/estimate
 * @desc    Get personalized estimate (PUBLIC or Authenticated)
 * @access  Public/Private
 */
router.post(
  '/estimate',
  [
    body('procedureCode').notEmpty().withMessage('Procedure code required'),
    body('patientId').optional().isMongoId(),
    body('insuranceInfo').optional().isObject(),
    body('insuranceInfo.payerId').optional().trim(),
    body('insuranceInfo.deductibleRemaining').optional().isFloat({ min: 0 }),
    body('insuranceInfo.coinsurancePercent').optional().isFloat({ min: 0, max: 100 }),
    body('insuranceInfo.copay').optional().isFloat({ min: 0 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const estimate = await priceTransparencyService.getPatientEstimate(
        req.body.patientId,
        req.body.procedureCode,
        req.body.insuranceInfo
      );

      res.json(estimate);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/price-transparency/common-services
 * @desc    Get common services with pricing (PUBLIC)
 * @access  Public
 */
router.get('/common-services', async (req, res, next) => {
  try {
    const services = await priceTransparencyService.getCommonServices();

    res.json(services);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/price-transparency/statistics
 * @desc    Get price statistics (PUBLIC)
 * @access  Public
 */
router.get('/statistics', [query('scheduleType').optional().trim()], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const stats = await priceTransparencyService.getPriceStatistics(req.query);

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/price-transparency/generate-file
 * @desc    Generate machine-readable transparency file
 * @access  Private (Owner, Admin)
 */
router.post(
  '/generate-file',
  authMiddleware,
  requireRole(['owner', 'admin']),
  [body('format').isIn(['JSON', 'CSV', 'XML']).withMessage('Valid format required')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await priceTransparencyService.generateMachineReadableFile(req.body.format);

      logger.info('Transparency file generated', {
        format: req.body.format,
        userId: req.user.id,
      });

      res.json({
        message: 'Transparency file generated successfully',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ========== FEE SCHEDULE MANAGEMENT (PRIVATE) ==========

/**
 * @route   POST /api/fee-schedules
 * @desc    Create fee schedule
 * @access  Private (Owner, Admin)
 */
router.post(
  '/fee-schedules',
  authMiddleware,
  requireRole(['owner', 'admin']),
  [
    body('scheduleName').notEmpty().withMessage('Schedule name required'),
    body('scheduleType')
      .isIn(['standard', 'medicare', 'medicaid', 'contracted', 'cash_discount', 'sliding_scale'])
      .withMessage('Valid schedule type required'),
    body('effectiveDate').isISO8601().withMessage('Valid effective date required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const schedule = new FeeSchedule({
        ...req.body,
        createdBy: req.user.id,
      });

      await schedule.save();

      logger.info('Fee schedule created', {
        scheduleId: schedule._id,
        scheduleName: schedule.scheduleName,
        itemCount: schedule.items.length,
        userId: req.user.id,
      });

      res.status(201).json({
        message: 'Fee schedule created successfully',
        schedule,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/fee-schedules
 * @desc    List fee schedules
 * @access  Private (Owner, Admin, Billing)
 */
router.get(
  '/fee-schedules',
  authMiddleware,
  requireRole(['owner', 'admin', 'billing']),
  [query('scheduleType').optional().trim(), query('isActive').optional().isBoolean()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const query = {};
      if (req.query.scheduleType) query.scheduleType = req.query.scheduleType;
      if (req.query.isActive !== undefined) query.isActive = req.query.isActive === 'true';

      const schedules = await FeeSchedule.find(query)
        .populate('createdBy', 'firstName lastName')
        .sort({ effectiveDate: -1 });

      res.json({
        count: schedules.length,
        schedules,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/fee-schedules/:id
 * @desc    Get fee schedule by ID
 * @access  Private (Owner, Admin, Billing)
 */
router.get(
  '/fee-schedules/:id',
  authMiddleware,
  requireRole(['owner', 'admin', 'billing']),
  [param('id').isMongoId()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const schedule = await FeeSchedule.findById(req.params.id)
        .populate('createdBy', 'firstName lastName')
        .populate('lastModifiedBy', 'firstName lastName');

      if (!schedule) {
        return res.status(404).json({ error: 'Fee schedule not found' });
      }

      res.json(schedule);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/fee-schedules/:id
 * @desc    Update fee schedule
 * @access  Private (Owner, Admin)
 */
router.put(
  '/fee-schedules/:id',
  authMiddleware,
  requireRole(['owner', 'admin']),
  [param('id').isMongoId()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const schedule = await FeeSchedule.findById(req.params.id);

      if (!schedule) {
        return res.status(404).json({ error: 'Fee schedule not found' });
      }

      // Update allowed fields
      const allowedUpdates = ['items', 'notes', 'expirationDate'];
      allowedUpdates.forEach((field) => {
        if (req.body[field] !== undefined) {
          schedule[field] = req.body[field];
        }
      });

      schedule.lastModifiedBy = req.user.id;
      schedule.version += 1;

      await schedule.save();

      logger.info('Fee schedule updated', {
        scheduleId: schedule._id,
        userId: req.user.id,
      });

      res.json({
        message: 'Fee schedule updated successfully',
        schedule,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/fee-schedules/:id/deactivate
 * @desc    Deactivate fee schedule
 * @access  Private (Owner, Admin)
 */
router.post(
  '/fee-schedules/:id/deactivate',
  authMiddleware,
  requireRole(['owner', 'admin']),
  [param('id').isMongoId()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const schedule = await FeeSchedule.findById(req.params.id);

      if (!schedule) {
        return res.status(404).json({ error: 'Fee schedule not found' });
      }

      schedule.isActive = false;
      schedule.expirationDate = new Date();
      schedule.lastModifiedBy = req.user.id;

      await schedule.save();

      logger.info('Fee schedule deactivated', {
        scheduleId: schedule._id,
        userId: req.user.id,
      });

      res.json({
        message: 'Fee schedule deactivated successfully',
        schedule,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/fee-schedules/stats/overview
 * @desc    Get fee schedule statistics
 * @access  Private (Owner, Admin, Billing)
 */
router.get(
  '/fee-schedules/stats/overview',
  authMiddleware,
  requireRole(['owner', 'admin', 'billing']),
  async (req, res, next) => {
    try {
      const stats = await FeeSchedule.getStatistics();

      res.json(stats);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
