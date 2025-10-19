const express = require('express');


const PatientSurvey = require('../models/PatientSurvey');
const SurveyResponse = require('../models/SurveyResponse');
const NPSScore = require('../models/NPSScore');
/**
 * Patient Survey Routes
 * Module: Mobn (TASK-14.14)
 *
 * Comprehensive patient survey management endpoints
 * Features:
 * - Survey creation and management
 * - Response collection and analysis
 * - NPS tracking
 * - Follow-up management
 * - Analytics and reporting
 */

const router = express.Router();
// Mock middleware (replace with actual auth middleware)
const protect = (req, res, next) => {
  // In production, this would validate JWT token
  req.user = { _id: 'mock-user-id', organization: 'mock-org-id', role: 'admin' };
  next();
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this resource',
      });
    }
    next();
  };
};

// ============================================
// SURVEY MANAGEMENT ENDPOINTS
// ============================================

/**
 * @route   GET /api/patient-surveys
 * @desc    Get all surveys
 * @access  Private (Admin, Manager)
 */
router.get('/', protect, async (req, res) => {
  try {
    const { status, surveyType, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (surveyType) query.surveyType = surveyType;
    if (req.user.organization) query.organization = req.user.organization;

    const surveys = await PatientSurvey.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await PatientSurvey.countDocuments(query);

    res.json({
      success: true,
      data: surveys,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/patient-surveys/stats
 * @desc    Get survey statistics
 * @access  Private (Admin, Manager)
 */
router.get('/stats', protect, async (req, res) => {
  try {
    const stats = await PatientSurvey.getStats(req.user.organization);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/patient-surveys/:id
 * @desc    Get survey by ID
 * @access  Private (Admin, Manager)
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const survey = await PatientSurvey.findById(req.params.id).populate(
      'createdBy',
      'firstName lastName'
    );

    if (!survey) {
      return res.status(404).json({
        success: false,
        error: 'Survey not found',
      });
    }

    res.json({
      success: true,
      data: survey,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/patient-surveys
 * @desc    Create new survey
 * @access  Private (Admin, Manager)
 */
router.post('/', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const surveyData = {
      ...req.body,
      createdBy: req.user._id,
      organization: req.user.organization,
    };

    const survey = await PatientSurvey.create(surveyData);

    res.status(201).json({
      success: true,
      data: survey,
      message: 'Survey created successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/patient-surveys/default
 * @desc    Create default post-appointment survey
 * @access  Private (Admin)
 */
router.post('/default', protect, authorize('admin'), async (req, res) => {
  try {
    const survey = await PatientSurvey.createDefaultSurvey(req.user.organization, req.user._id);

    res.status(201).json({
      success: true,
      data: survey,
      message: 'Default survey created successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/patient-surveys/:id
 * @desc    Update survey
 * @access  Private (Admin, Manager)
 */
router.put('/:id', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const survey = await PatientSurvey.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!survey) {
      return res.status(404).json({
        success: false,
        error: 'Survey not found',
      });
    }

    res.json({
      success: true,
      data: survey,
      message: 'Survey updated successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/patient-surveys/:id/publish
 * @desc    Publish survey (make it active)
 * @access  Private (Admin, Manager)
 */
router.post('/:id/publish', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const survey = await PatientSurvey.findById(req.params.id);

    if (!survey) {
      return res.status(404).json({
        success: false,
        error: 'Survey not found',
      });
    }

    await survey.publish();

    res.json({
      success: true,
      data: survey,
      message: 'Survey published successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/patient-surveys/:id/pause
 * @desc    Pause survey
 * @access  Private (Admin, Manager)
 */
router.post('/:id/pause', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const survey = await PatientSurvey.findById(req.params.id);

    if (!survey) {
      return res.status(404).json({
        success: false,
        error: 'Survey not found',
      });
    }

    await survey.pause();

    res.json({
      success: true,
      data: survey,
      message: 'Survey paused successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/patient-surveys/:id
 * @desc    Delete survey
 * @access  Private (Admin)
 */
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const survey = await PatientSurvey.findByIdAndDelete(req.params.id);

    if (!survey) {
      return res.status(404).json({
        success: false,
        error: 'Survey not found',
      });
    }

    res.json({
      success: true,
      message: 'Survey deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// SURVEY RESPONSE ENDPOINTS
// ============================================

/**
 * @route   GET /api/patient-surveys/:id/responses
 * @desc    Get all responses for a survey
 * @access  Private (Admin, Manager)
 */
router.get('/:id/responses', protect, async (req, res) => {
  try {
    const { status, flagged, page = 1, limit = 50 } = req.query;

    const query = { surveyId: req.params.id };
    if (status) query.status = status;
    if (flagged) query.flagged = flagged === 'true';

    const responses = await SurveyResponse.find(query)
      .populate('patientId', 'firstName lastName email phone')
      .populate('appointmentId', 'appointmentDate serviceType')
      .sort({ completedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await SurveyResponse.countDocuments(query);

    res.json({
      success: true,
      data: responses,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/patient-surveys/:id/responses/stats
 * @desc    Get response statistics for a survey
 * @access  Private (Admin, Manager)
 */
router.get('/:id/responses/stats', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateRange = {};
    if (startDate) dateRange.startDate = new Date(startDate);
    if (endDate) dateRange.endDate = new Date(endDate);

    const stats = await SurveyResponse.getStats(req.params.id, dateRange);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/patient-surveys/:id/responses/followup
 * @desc    Get responses requiring follow-up
 * @access  Private (Admin, Manager)
 */
router.get('/:id/responses/followup', protect, async (req, res) => {
  try {
    const responses = await SurveyResponse.find({
      surveyId: req.params.id,
      requiresFollowup: true,
      followupCompletedAt: null,
    })
      .populate('patientId', 'firstName lastName email phone')
      .populate('followupAssignedTo', 'firstName lastName')
      .sort({ completedAt: -1 });

    res.json({
      success: true,
      data: responses,
      count: responses.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/patient-surveys/responses
 * @desc    Submit survey response (public or authenticated)
 * @access  Public/Private
 */
router.post('/responses', async (req, res) => {
  try {
    const responseData = {
      ...req.body,
      status: 'completed',
      completedAt: new Date(),
    };

    const response = await SurveyResponse.create(responseData);
    await response.markCompleted();

    // Update survey metrics
    const survey = await PatientSurvey.findById(response.surveyId);
    if (survey) {
      await survey.calculateMetrics();
    }

    res.status(201).json({
      success: true,
      data: response,
      message: 'Thank you for your feedback!',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/patient-surveys/responses/:responseId/followup
 * @desc    Update follow-up status for a response
 * @access  Private (Admin, Manager, Staff)
 */
router.put('/responses/:responseId/followup', protect, async (req, res) => {
  try {
    const { action, assignTo, outcome, notes } = req.body;

    const response = await SurveyResponse.findById(req.params.responseId);

    if (!response) {
      return res.status(404).json({
        success: false,
        error: 'Response not found',
      });
    }

    if (action === 'assign') {
      await response.assignFollowup(assignTo, notes);
    } else if (action === 'complete') {
      await response.completeFollowup(notes);
    }

    res.json({
      success: true,
      data: response,
      message: `Follow-up ${action}d successfully`,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// NPS TRACKING ENDPOINTS
// ============================================

/**
 * @route   GET /api/patient-surveys/nps/score
 * @desc    Get current NPS score
 * @access  Private (Admin, Manager)
 */
router.get('/nps/score', protect, async (req, res) => {
  try {
    const { startDate, endDate, practitionerId, serviceType } = req.query;

    const filters = { organization: req.user.organization };
    if (practitionerId) filters.practitionerId = practitionerId;
    if (serviceType) filters.serviceType = serviceType;

    const dateRange = {};
    if (startDate) dateRange.startDate = new Date(startDate);
    if (endDate) dateRange.endDate = new Date(endDate);

    const npsData = await NPSScore.calculateNPS(filters, dateRange);

    res.json({
      success: true,
      data: npsData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/patient-surveys/nps/trend
 * @desc    Get NPS trend over time
 * @access  Private (Admin, Manager)
 */
router.get('/nps/trend', protect, async (req, res) => {
  try {
    const { startDate, endDate, interval = 'week' } = req.query;

    const filters = { organization: req.user.organization };
    const dateRange = {};
    if (startDate) dateRange.startDate = new Date(startDate);
    if (endDate) dateRange.endDate = new Date(endDate);

    const trend = await NPSScore.getTrend(filters, dateRange, interval);

    res.json({
      success: true,
      data: trend,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/patient-surveys/nps/detractors
 * @desc    Get list of detractors
 * @access  Private (Admin, Manager)
 */
router.get('/nps/detractors', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filters = { organization: req.user.organization };
    const dateRange = {};
    if (startDate) dateRange.startDate = new Date(startDate);
    if (endDate) dateRange.endDate = new Date(endDate);

    const detractors = await NPSScore.getDetractors(filters, dateRange);

    res.json({
      success: true,
      data: detractors,
      count: detractors.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/patient-surveys/nps/promoters
 * @desc    Get list of promoters
 * @access  Private (Admin, Manager)
 */
router.get('/nps/promoters', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filters = { organization: req.user.organization };
    const dateRange = {};
    if (startDate) dateRange.startDate = new Date(startDate);
    if (endDate) dateRange.endDate = new Date(endDate);

    const promoters = await NPSScore.getPromoters(filters, dateRange);

    res.json({
      success: true,
      data: promoters,
      count: promoters.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/patient-surveys/nps/breakdown
 * @desc    Get NPS breakdown by dimension
 * @access  Private (Admin, Manager)
 */
router.get('/nps/breakdown/:dimension', protect, async (req, res) => {
  try {
    const { dimension } = req.params;
    const { startDate, endDate } = req.query;

    const filters = { organization: req.user.organization };
    const dateRange = {};
    if (startDate) dateRange.startDate = new Date(startDate);
    if (endDate) dateRange.endDate = new Date(endDate);

    const breakdown = await NPSScore.getBreakdown(dimension, filters, dateRange);

    res.json({
      success: true,
      data: breakdown,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/patient-surveys/nps
 * @desc    Submit NPS score
 * @access  Public/Private
 */
router.post('/nps', async (req, res) => {
  try {
    const scoreData = {
      ...req.body,
      submittedAt: new Date(),
    };

    const score = await NPSScore.create(scoreData);

    res.status(201).json({
      success: true,
      data: score,
      message: 'Thank you for your feedback!',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/patient-surveys/nps/:id/followup
 * @desc    Update NPS follow-up
 * @access  Private (Admin, Manager, Staff)
 */
router.put('/nps/:id/followup', protect, async (req, res) => {
  try {
    const { action, assignTo, outcome, notes } = req.body;

    const score = await NPSScore.findById(req.params.id);

    if (!score) {
      return res.status(404).json({
        success: false,
        error: 'NPS score not found',
      });
    }

    if (action === 'assign') {
      await score.assignFollowup(assignTo, notes);
    } else if (action === 'complete') {
      await score.completeFollowup(outcome, notes);
    }

    res.json({
      success: true,
      data: score,
      message: `Follow-up ${action}d successfully`,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
