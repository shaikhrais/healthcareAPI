const express = require('express');

const { body, param, query } = require('express-validator');

const CheckIn = require('../models/CheckIn');
const Appointment = require('../models/Appointment');
const authMiddleware = require('../../auth/middleware/authMiddleware');
const rateLimiterMiddleware = require('../../../shared/middleware/rateLimiterMiddleware');
const router = express.Router();
// All routes require authentication
router.use(authMiddleware);

/**
 * @route   POST /api/checkin
 * @desc    Check in a patient for their appointment
 * @access  Front Desk, Practitioner, Admin
 */
router.post(
  '/',
  rateLimiterMiddleware('general', 50), // 50 checkins per hour
  [
    body('appointmentId').isMongoId().withMessage('Valid appointment ID required'),
    body('checkInMethod').isIn(['front_desk', 'self_service', 'mobile_app']).optional(),
    body('notes').isString().optional(),
  ],
  async (req, res) => {
    try {
      const { appointmentId, checkInMethod, notes } = req.body;

      // Verify appointment exists
      const appointment = await Appointment.findById(appointmentId)
        .populate('patientId')
        .populate('practitionerId');

      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }

      // Check if already checked in
      const existingCheckIn = await CheckIn.findOne({
        appointmentId,
        status: { $in: ['waiting', 'in_room', 'with_practitioner'] },
      });

      if (existingCheckIn) {
        return res.status(400).json({
          message: 'Patient already checked in',
          checkIn: existingCheckIn,
        });
      }

      // Create check-in record
      const checkIn = await CheckIn.create({
        appointmentId,
        patientId: appointment.patientId._id,
        practitionerId: appointment.practitionerId._id,
        checkInMethod: checkInMethod || 'front_desk',
        checkInBy: req.user._id,
        notes,
      });

      // Populate and return
      const populatedCheckIn = await CheckIn.findById(checkIn._id)
        .populate('patientId', 'firstName lastName dateOfBirth')
        .populate('practitionerId', 'firstName lastName')
        .populate('appointmentId', 'date time type')
        .populate('checkInBy', 'firstName lastName');

      res.status(201).json(populatedCheckIn);
    } catch (error) {
      console.error('Check-in error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

/**
 * @route   PATCH /api/checkin/:id/status
 * @desc    Update check-in status (waiting → in_room → with_practitioner → completed)
 * @access  Front Desk, Practitioner, Admin
 */
router.patch(
  '/:id/status',
  rateLimiterMiddleware('general', 50), // Role check can be added later
  [
    param('id').isMongoId().withMessage('Valid check-in ID required'),
    body('status')
      .isIn(['waiting', 'in_room', 'with_practitioner', 'completed', 'no_show'])
      .withMessage('Valid status required'),
    body('roomNumber').isString().optional(),
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status, roomNumber } = req.body;

      const checkIn = await CheckIn.findById(id);
      if (!checkIn) {
        return res.status(404).json({ message: 'Check-in record not found' });
      }

      // Update status
      checkIn.status = status;
      if (roomNumber) {
        checkIn.roomNumber = roomNumber;
      }

      await checkIn.save(); // Triggers pre-save hook for wait time calculation

      const updatedCheckIn = await CheckIn.findById(id)
        .populate('patientId', 'firstName lastName')
        .populate('practitionerId', 'firstName lastName')
        .populate('appointmentId', 'date time type');

      res.json(updatedCheckIn);
    } catch (error) {
      console.error('Status update error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

/**
 * @route   POST /api/checkin/:id/vitals
 * @desc    Add or update vital signs for a checked-in patient
 * @access  Practitioner, Admin
 */
router.post(
  '/:id/vitals',
  rateLimiterMiddleware('general', 50), // Role check can be added later
  [
    param('id').isMongoId().withMessage('Valid check-in ID required'),
    body('bloodPressure').isString().optional(),
    body('heartRate').isInt({ min: 0, max: 300 }).optional(),
    body('temperature').isFloat({ min: 90, max: 110 }).optional(),
    body('weight').isFloat({ min: 0 }).optional(),
    body('height').isFloat({ min: 0 }).optional(),
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { bloodPressure, heartRate, temperature, weight, height } = req.body;

      const checkIn = await CheckIn.findById(id);
      if (!checkIn) {
        return res.status(404).json({ message: 'Check-in record not found' });
      }

      // Update vitals
      checkIn.vitals = {
        ...checkIn.vitals,
        ...(bloodPressure && { bloodPressure }),
        ...(heartRate && { heartRate }),
        ...(temperature && { temperature }),
        ...(weight && { weight }),
        ...(height && { height }),
      };

      await checkIn.save();

      res.json(checkIn);
    } catch (error) {
      console.error('Vitals update error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

/**
 * @route   POST /api/checkin/:id/symptoms
 * @desc    Add symptoms to check-in record
 * @access  Practitioner, Admin
 */
router.post(
  '/:id/symptoms',
  rateLimiterMiddleware('general', 50), // Role check can be added later
  [
    param('id').isMongoId().withMessage('Valid check-in ID required'),
    body('symptoms').isArray().withMessage('Symptoms must be an array'),
    body('symptoms.*').isString().withMessage('Each symptom must be a string'),
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { symptoms } = req.body;

      const checkIn = await CheckIn.findByIdAndUpdate(
        id,
        { $addToSet: { symptoms: { $each: symptoms } } },
        { new: true }
      ).populate('patientId', 'firstName lastName');

      if (!checkIn) {
        return res.status(404).json({ message: 'Check-in record not found' });
      }

      res.json(checkIn);
    } catch (error) {
      console.error('Symptoms update error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

/**
 * @route   GET /api/checkin/queue/:practitionerId
 * @desc    Get waiting queue for a specific practitioner
 * @access  Practitioner (own queue), Admin (any queue)
 */
router.get(
  '/queue/:practitionerId',
  [param('practitionerId').isMongoId().withMessage('Valid practitioner ID required')],
  async (req, res) => {
    try {
      const { practitionerId } = req.params;

      // Check if user can view this queue
      if (
        req.user.role !== 'full_access' &&
        req.user.role !== 'admin_billing' &&
        req.user._id.toString() !== practitionerId
      ) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const queue = await CheckIn.getWaitingQueue(practitionerId);
      res.json(queue);
    } catch (error) {
      console.error('Queue fetch error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

/**
 * @route   GET /api/checkin/waiting-room
 * @desc    Get overall waiting room status
 * @access  Front Desk, Admin
 */
router.get('/waiting-room', rateLimiterMiddleware('general', 100), async (req, res) => {
  try {
    const status = await CheckIn.getWaitingRoomStatus();
    res.json(status);
  } catch (error) {
    console.error('Waiting room status error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/checkin/today
 * @desc    Get all check-ins for today
 * @access  Front Desk, Admin
 */
router.get('/today', rateLimiterMiddleware('general', 100), async (req, res) => {
  try {
    const checkIns = await CheckIn.getTodayCheckIns();
    res.json(checkIns);
  } catch (error) {
    console.error('Today check-ins error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/checkin/stats/wait-time/:practitionerId
 * @desc    Get average wait time statistics for a practitioner
 * @access  Practitioner (own stats), Admin (any stats)
 */
router.get(
  '/stats/wait-time/:practitionerId',
  [
    param('practitionerId').isMongoId().withMessage('Valid practitioner ID required'),
    query('days').isInt({ min: 1, max: 365 }).optional(),
  ],
  async (req, res) => {
    try {
      const { practitionerId } = req.params;
      const days = parseInt(req.query.days, 10) || 30;

      // Check if user can view these stats
      if (
        req.user.role !== 'full_access' &&
        req.user.role !== 'admin_billing' &&
        req.user._id.toString() !== practitionerId
      ) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const stats = await CheckIn.getAverageWaitTime(practitionerId, days);
      res.json({
        practitionerId,
        period: `${days} days`,
        ...stats,
      });
    } catch (error) {
      console.error('Wait time stats error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

/**
 * @route   GET /api/checkin/:id
 * @desc    Get specific check-in details
 * @access  Authenticated users
 */
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Valid check-in ID required')],
  async (req, res) => {
    try {
      const checkIn = await CheckIn.findById(req.params.id)
        .populate('patientId', 'firstName lastName dateOfBirth')
        .populate('practitionerId', 'firstName lastName')
        .populate('appointmentId', 'date time type')
        .populate('checkInBy', 'firstName lastName');

      if (!checkIn) {
        return res.status(404).json({ message: 'Check-in record not found' });
      }

      res.json(checkIn);
    } catch (error) {
      console.error('Check-in fetch error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

/**
 * @route   GET /api/checkin/patient/:patientId
 * @desc    Get check-in history for a patient
 * @access  Practitioner, Admin
 */
router.get(
  '/patient/:patientId',
  rateLimiterMiddleware('general', 100), // Role check can be added later
  [
    param('patientId').isMongoId().withMessage('Valid patient ID required'),
    query('limit').isInt({ min: 1, max: 100 }).optional(),
  ],
  async (req, res) => {
    try {
      const { patientId } = req.params;
      const limit = parseInt(req.query.limit, 10) || 20;

      const checkIns = await CheckIn.find({ patientId })
        .sort({ checkInTime: -1 })
        .limit(limit)
        .populate('practitionerId', 'firstName lastName')
        .populate('appointmentId', 'date time type');

      res.json(checkIns);
    } catch (error) {
      console.error('Patient check-in history error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

module.exports = router;
