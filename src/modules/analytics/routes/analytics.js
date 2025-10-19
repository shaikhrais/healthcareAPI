const express = require('express');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const { protect, authorize } = require('../middleware/auth');
const SecurityService = require('../services/security.service');
const AccessLog = require('../models/AccessLog');
const Device = require('../models/Device');
const ServiceLineAnalysis = require('../models/ServiceLineAnalysis');
const Appointment = require('../models/Appointment');
const ChurnPrediction = require('../models/ChurnPrediction');
const PatientAttribution = require('../models/PatientAttribution');
const Anomaly = require('../models/Anomaly');
const ExportJob = require('../models/ExportJob');
const exportService = require('../services/export.service');
const DashboardMetrics = require('../models/DashboardMetrics');
const websocketService = require('../services/websocket.service');
const EmailDigest = require('../models/EmailDigest');
const emailTemplateService = require('../services/email-template.service');
const digestCalculationService = require('../services/digest-calculation.service');
const PatientSurvey = require('../models/PatientSurvey');
const SurveyResponse = require('../models/SurveyResponse');
const surveyAnalysisService = require('../services/survey-analysis.service');
const NPSScore = require('../models/NPSScore');
const npsAnalysisService = require('../services/nps-analysis.service');
const OnlineReview = require('../models/OnlineReview');
const reviewMonitoringService = require('../services/review-monitoring.service');
const StaffProductivity = require('../models/StaffProductivity');

/**
 * @swagger
 * components:
 *   schemas:
 *     AccessAnalytics:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *           description: User ID
 *         totalAccess:
 *           type: integer
 *           description: Total number of access events
 *         uniqueDevices:
 *           type: integer
 *           description: Number of unique devices used
 *         riskEvents:
 *           type: integer
 *           description: Number of high-risk access events
 *         lastAccess:
 *           type: string
 *           format: date-time
 *           description: Last access timestamp
 *         accessPatterns:
 *           type: object
 *           description: Access patterns and statistics
 *     ServiceLineAnalysis:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         serviceLine:
 *           type: string
 *           example: "Physiotherapy"
 *         periodStart:
 *           type: string
 *           format: date
 *         periodEnd:
 *           type: string
 *           format: date
 *         revenueMetrics:
 *           type: object
 *           properties:
 *             totalRevenue:
 *               type: number
 *               example: 15000.00
 *             averageRevenuePerAppointment:
 *               type: number
 *               example: 125.00
 *         appointmentMetrics:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *               example: 120
 *             completed:
 *               type: integer
 *               example: 115
 *             completionRate:
 *               type: number
 *               example: 95.8
 *         utilizationMetrics:
 *           type: object
 *           properties:
 *             utilizationRate:
 *               type: number
 *               example: 87.5
 *     ChurnPrediction:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         patient:
 *           type: string
 *           description: Patient ID
 *         churnRisk:
 *           type: object
 *           properties:
 *             score:
 *               type: number
 *               example: 75
 *             level:
 *               type: string
 *               enum: [Low, Medium, High, Critical]
 *               example: "High"
 *         churnIndicators:
 *           type: object
 *           properties:
 *             redFlags:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   indicator:
 *                     type: string
 *                     example: "missed_appointments"
 *                   severity:
 *                     type: string
 *                     example: "high"
 *         retentionStrategy:
 *           type: object
 *           properties:
 *             status:
 *               type: string
 *               enum: [pending, in_progress, completed]
 *             assignedTo:
 *               type: string
 *               description: Staff member ID assigned to retention
 */

/**
 * Analytics Routes
 * Access analytics, social media tracking, and security dashboard
 */

const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
// Apply access tracking to all routes (except this one to avoid recursion)
// router.use(trackAccess);

/**
 * @swagger
 * /api/analytics/access/{userId}:
 *   get:
 *     tags: [Analytics]
 *     summary: Get access analytics for a user
 *     description: Retrieve access analytics data for a specific user or current user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: false
 *         schema:
 *           type: string
 *         description: User ID (optional, defaults to current user)
 *     responses:
 *       200:
 *         description: Access analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/AccessAnalytics'
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to retrieve analytics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/access/:userId?', protect, analyticsController.getAccessAnalytics);

/**
 * @route   GET /api/analytics/access/me
 * @desc    Get current user's access analytics
 * @access  Private
 */
router.get('/access/me', protect, (req, res, next) => {
  req.params.userId = req.user._id;
  analyticsController.getAccessAnalytics(req, res, next);
});

/**
 * @route   GET /api/analytics/social-media
 * @desc    Get social media referral analytics
 * @access  Private (Admin only)
 */
router.get('/social-media', protect, authorize('admin'), analyticsController.getSocialMediaAnalytics);

/**
 * @route   GET /api/analytics/security-dashboard
 * @desc    Get security dashboard with threat detection
 * @access  Private (Admin only)
 */
router.get('/security-dashboard', protect, authorize('admin'), analyticsController.getSecurityDashboard);

/**
 * @route   GET /api/analytics/devices
 * @desc    Get user's devices
 * @access  Private
 */
router.get('/devices', protect, analyticsController.getDevices);

/**
 * @route   PUT /api/analytics/devices/:deviceId/trust
 * @desc    Mark a device as trusted
 * @access  Private
 */
router.put('/devices/:deviceId/trust', protect, analyticsController.trustDevice);

/**
 * @route   DELETE /api/analytics/devices/:deviceId
 * @desc    Remove a device from user's device list
 * @access  Private
 */
router.delete('/devices/:deviceId', protect, analyticsController.deleteDevice);

/**
 * @route   GET /api/analytics/security/recommendations
 * @desc    Get security recommendations
 * @access  Private (Admin only)
 */
router.get('/security/recommendations', protect, authorize('admin'), analyticsController.getSecurityRecommendations);

/**
 * @route   GET /api/analytics/security/posture
 * @desc    Get overall security posture
 * @access  Private (Admin only)
 */
router.get('/security/posture', protect, authorize('admin'), analyticsController.getSecurityPosture);

/**
 * @route   GET /api/analytics/security/implementation-guide
 * @desc    Get security implementation guide
 * @access  Private (Admin only)
 */
router.get('/security/implementation-guide', protect, authorize('admin'), analyticsController.getSecurityImplementationGuide);

/**
 * @route   GET /api/analytics/access-logs
 * @desc    Get paginated access logs
 * @access  Private (Admin only)
 */
router.get('/access-logs', protect, authorize('admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const query = {};

    // Filters
    if (req.query.userId) {
      query.userId = req.query.userId;
    }
    if (req.query.flagged) {
      query.flagged = req.query.flagged === 'true';
    }
    if (req.query.accessType) {
      query.accessType = req.query.accessType;
    }
    if (req.query.minRiskScore) {
      query['security.riskScore'] = { $gte: parseInt(req.query.minRiskScore, 10) };
    }

    const [logs, total] = await Promise.all([
      AccessLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'firstName lastName email')
        .select('-deviceInfo.userAgent -metadata'),
      AccessLog.countDocuments(query),
    ]);

    res.json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching access logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch access logs',
    });
  }
});

/**
 * @route   GET /api/analytics/referral-sources
 * @desc    Get referral source breakdown
 * @access  Private (Admin only)
 */
router.get('/referral-sources', protect, authorize('admin'), async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const sources = await AccessLog.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          accessType: 'login',
        },
      },
      {
        $group: {
          _id: {
            type: '$referralSource.type',
            platform: '$referralSource.platform',
          },
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
        },
      },
      {
        $project: {
          type: '$_id.type',
          platform: '$_id.platform',
          count: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      period: `Last ${days} days`,
      sources,
    });
  } catch (error) {
    console.error('Error getting referral sources:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get referral sources',
    });
  }
});

/**
 * @route   POST /api/analytics/flag-access/:logId
 * @desc    Manually flag an access log entry
 * @access  Private (Admin only)
 */
router.post('/flag-access/:logId', protect, authorize('admin'), async (req, res) => {
  try {
    const { logId } = req.params;
    const { flagReason } = req.body;

    const log = await AccessLog.findByIdAndUpdate(
      logId,
      {
        $set: {
          flagged: true,
          flagReason: flagReason || 'Manually flagged by admin',
        },
      },
      { new: true }
    );

    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'Access log not found',
      });
    }

    res.json({
      success: true,
      log,
    });
  } catch (error) {
    console.error('Error flagging access log:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to flag access log',
    });
  }
});

// ============================================
// SERVICE LINE ANALYSIS ENDPOINTS
// ============================================

/**
 * @route   GET /api/analytics/service-lines
 * @desc    Get list of all available service lines
 * @access  Private (Admin/Billing)
 */
router.get(
  '/service-lines',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const serviceLines = [
        'RMT',
        'RPT',
        'Physiotherapy',
        'Massage Therapy',
        'Acupuncture',
        'Chiropractic',
        'General',
      ];

      // Get appointment counts for each service line
      const serviceLineStats = await Promise.all(
        serviceLines.map(async (serviceLine) => {
          const count = await Appointment.countDocuments({ serviceType: serviceLine });
          const completedCount = await Appointment.countDocuments({
            serviceType: serviceLine,
            status: 'completed',
          });

          return {
            name: serviceLine,
            totalAppointments: count,
            completedAppointments: completedCount,
          };
        })
      );

      res.json({
        success: true,
        serviceLines: serviceLineStats,
      });
    } catch (error) {
      console.error('Error fetching service lines:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch service lines',
      });
    }
  }
);

/**
 * @route   POST /api/analytics/service-line/generate
 * @desc    Generate service line analysis for a specific period
 * @access  Private (Admin/Billing)
 */
router.post(
  '/service-line/generate',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { serviceLine, periodStart, periodEnd, periodType } = req.body;

      // Validate required fields
      if (!serviceLine || !periodStart || !periodEnd) {
        return res.status(400).json({
          success: false,
          error: 'serviceLine, periodStart, and periodEnd are required',
        });
      }

      // Check if analysis already exists for this period
      const existingAnalysis = await ServiceLineAnalysis.findOne({
        serviceLine,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
      });

      if (existingAnalysis) {
        return res.json({
          success: true,
          message: 'Analysis already exists for this period',
          data: existingAnalysis,
          cached: true,
        });
      }

      // Generate new analysis
      const analysis = await ServiceLineAnalysis.generateAnalysis(
        serviceLine,
        new Date(periodStart),
        new Date(periodEnd),
        periodType || 'custom'
      );

      analysis.calculatedBy = req.user._id;
      await analysis.save();

      res.json({
        success: true,
        message: 'Service line analysis generated successfully',
        data: analysis,
        cached: false,
      });
    } catch (error) {
      console.error('Error generating service line analysis:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate service line analysis',
      });
    }
  }
);

/**
 * @route   GET /api/analytics/service-line/:serviceLine
 * @desc    Get service line analysis history
 * @access  Private (Admin/Billing)
 */
router.get(
  '/service-line/:serviceLine',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { serviceLine } = req.params;
      const { periodType, limit } = req.query;

      const query = { serviceLine };
      if (periodType) {
        query.periodType = periodType;
      }

      const analyses = await ServiceLineAnalysis.find(query)
        .sort({ periodStart: -1 })
        .limit(parseInt(limit, 10) || 10)
        .populate('calculatedBy', 'firstName lastName email');

      res.json({
        success: true,
        count: analyses.length,
        data: analyses,
      });
    } catch (error) {
      console.error('Error fetching service line analysis:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch service line analysis',
      });
    }
  }
);

/**
 * @route   GET /api/analytics/service-line/compare
 * @desc    Compare multiple service lines performance
 * @access  Private (Admin/Billing)
 */
router.get(
  '/service-line-comparison',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { periodStart, periodEnd, serviceLines } = req.query;

      if (!periodStart || !periodEnd) {
        return res.status(400).json({
          success: false,
          error: 'periodStart and periodEnd are required',
        });
      }

      const serviceLinesArray = serviceLines
        ? serviceLines.split(',')
        : [
            'RMT',
            'RPT',
            'Physiotherapy',
            'Massage Therapy',
            'Acupuncture',
            'Chiropractic',
            'General',
          ];

      const comparisons = await Promise.all(
        serviceLinesArray.map(async (serviceLine) => {
          const analysis = await ServiceLineAnalysis.findOne({
            serviceLine,
            periodStart: new Date(periodStart),
            periodEnd: new Date(periodEnd),
          });

          if (!analysis) {
            // Generate if not exists
            const newAnalysis = await ServiceLineAnalysis.generateAnalysis(
              serviceLine,
              new Date(periodStart),
              new Date(periodEnd),
              'custom'
            );
            newAnalysis.calculatedBy = req.user._id;
            await newAnalysis.save();
            return newAnalysis;
          }

          return analysis;
        })
      );

      // Calculate overall statistics
      const totalRevenue = comparisons.reduce(
        (sum, c) => sum + (c.revenueMetrics?.totalRevenue || 0),
        0
      );

      const totalAppointments = comparisons.reduce(
        (sum, c) => sum + (c.appointmentMetrics?.total || 0),
        0
      );

      res.json({
        success: true,
        period: {
          start: periodStart,
          end: periodEnd,
        },
        summary: {
          totalRevenue,
          totalAppointments,
          serviceLinesCompared: comparisons.length,
        },
        data: comparisons.map((c) => ({
          serviceLine: c.serviceLine,
          revenue: c.revenueMetrics?.totalRevenue || 0,
          appointments: c.appointmentMetrics?.total || 0,
          completionRate: c.appointmentMetrics?.completionRate || 0,
          utilizationRate: c.utilizationMetrics?.utilizationRate || 0,
          averageRevenue: c.revenueMetrics?.averageRevenuePerAppointment || 0,
        })),
      });
    } catch (error) {
      console.error('Error comparing service lines:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to compare service lines',
      });
    }
  }
);

/**
 * @route   GET /api/analytics/service-line/:id
 * @desc    Get specific service line analysis by ID
 * @access  Private (Admin/Billing)
 */
router.get(
  '/service-line-detail/:id',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const analysis = await ServiceLineAnalysis.findById(id).populate(
        'calculatedBy',
        'firstName lastName email'
      );

      if (!analysis) {
        return res.status(404).json({
          success: false,
          error: 'Service line analysis not found',
        });
      }

      res.json({
        success: true,
        data: analysis,
      });
    } catch (error) {
      console.error('Error fetching service line analysis detail:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch service line analysis',
      });
    }
  }
);

/**
 * @route   DELETE /api/analytics/service-line/:id
 * @desc    Delete a service line analysis
 * @access  Private (Admin only)
 */
router.delete('/service-line-detail/:id', protect, authorize('full_access'), async (req, res) => {
  try {
    const { id } = req.params;

    const analysis = await ServiceLineAnalysis.findByIdAndDelete(id);

    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: 'Service line analysis not found',
      });
    }

    res.json({
      success: true,
      message: 'Service line analysis deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting service line analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete service line analysis',
    });
  }
});

/**
 * @route   GET /api/analytics/service-line-trends
 * @desc    Get service line performance trends over time
 * @access  Private (Admin/Billing)
 */
router.get(
  '/service-line-trends',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { serviceLine, periodType, startDate } = req.query;

      if (!serviceLine) {
        return res.status(400).json({
          success: false,
          error: 'serviceLine is required',
        });
      }

      const query = { serviceLine };
      if (periodType) {
        query.periodType = periodType;
      }
      if (startDate) {
        query.periodStart = { $gte: new Date(startDate) };
      }

      const analyses = await ServiceLineAnalysis.find(query)
        .sort({ periodStart: 1 })
        .select('periodStart periodEnd revenueMetrics appointmentMetrics utilizationMetrics');

      // Format for time-series visualization
      const trends = analyses.map((a) => ({
        period: `${a.periodStart.toLocaleDateString()} - ${a.periodEnd.toLocaleDateString()}`,
        periodStart: a.periodStart,
        periodEnd: a.periodEnd,
        revenue: a.revenueMetrics?.totalRevenue || 0,
        appointments: a.appointmentMetrics?.total || 0,
        completionRate: a.appointmentMetrics?.completionRate || 0,
        utilizationRate: a.utilizationMetrics?.utilizationRate || 0,
      }));

      res.json({
        success: true,
        serviceLine,
        dataPoints: trends.length,
        trends,
      });
    } catch (error) {
      console.error('Error fetching service line trends:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch service line trends',
      });
    }
  }
);

// ============================================
// CHURN PREDICTION ENDPOINTS
// ============================================

/**
 * @route   POST /api/analytics/churn/generate/:patientId
 * @desc    Generate churn prediction for a specific patient
 * @access  Private (Admin/Full Access)
 */
router.post(
  '/churn/generate/:patientId',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { patientId } = req.params;

      // Check if recent prediction already exists (within last 7 days)
      const recentPrediction = await ChurnPrediction.findOne({
        patient: patientId,
        predictionDate: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      })
        .populate('patient', 'firstName lastName email phone')
        .populate('relationshipFeatures.currentPractitioner', 'firstName lastName');

      if (recentPrediction) {
        return res.json({
          success: true,
          message: 'Recent prediction found (generated within last 7 days)',
          data: recentPrediction,
          cached: true,
        });
      }

      // Generate new prediction
      const prediction = await ChurnPrediction.generatePrediction(patientId, req.user._id);
      await prediction.save();

      // Populate related data
      await prediction.populate('patient', 'firstName lastName email phone');
      await prediction.populate('relationshipFeatures.currentPractitioner', 'firstName lastName');

      res.json({
        success: true,
        message: 'Churn prediction generated successfully',
        data: prediction,
        cached: false,
      });
    } catch (error) {
      console.error('Error generating churn prediction:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate churn prediction',
      });
    }
  }
);

/**
 * @route   POST /api/analytics/churn/batch-generate
 * @desc    Generate churn predictions for multiple patients
 * @access  Private (Admin only)
 */
router.post('/churn/batch-generate', protect, authorize('full_access'), async (req, res) => {
  try {
    const { patientIds, riskLevelFilter } = req.body;

    let patientsToProcess = patientIds;

    // If no patient IDs provided, generate for all active patients
    if (!patientsToProcess || patientsToProcess.length === 0) {
      const Patient = require('../models/Patient');
      const patients = await Patient.find({ active: true }).select('_id');
      patientsToProcess = patients.map((p) => p._id);
    }

    const results = {
      total: patientsToProcess.length,
      successful: 0,
      failed: 0,
      cached: 0,
      predictions: [],
      errors: [],
    };

    for (const patientId of patientsToProcess) {
      try {
        // Check for recent prediction
        const recentPrediction = await ChurnPrediction.findOne({
          patient: patientId,
          predictionDate: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        });

        if (recentPrediction) {
          results.cached += 1;
          results.predictions.push(recentPrediction);
          continue;
        }

        // Generate new prediction
        const prediction = await ChurnPrediction.generatePrediction(patientId, req.user._id);
        await prediction.save();

        // Apply risk level filter if specified
        if (!riskLevelFilter || prediction.churnRisk.level === riskLevelFilter) {
          results.predictions.push(prediction);
        }

        results.successful += 1;
      } catch (error) {
        results.failed += 1;
        results.errors.push({
          patientId,
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      message: `Batch prediction completed: ${results.successful} generated, ${results.cached} cached, ${results.failed} failed`,
      results,
    });
  } catch (error) {
    console.error('Error in batch churn prediction:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate batch predictions',
    });
  }
});

/**
 * @route   GET /api/analytics/churn/patients-at-risk
 * @desc    Get list of patients at high churn risk
 * @access  Private (Admin/Full Access)
 */
router.get(
  '/churn/patients-at-risk',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { riskLevel, limit, sortBy } = req.query;

      const patientsAtRisk = await ChurnPrediction.getPatientsAtRisk(
        riskLevel || null,
        parseInt(limit, 10) || 50
      );

      // Group by risk level
      const riskLevelCounts = {
        Critical: 0,
        High: 0,
        Medium: 0,
        Low: 0,
      };

      patientsAtRisk.forEach((pred) => {
        riskLevelCounts[pred.churnRisk.level]++;
      });

      res.json({
        success: true,
        count: patientsAtRisk.length,
        riskLevelCounts,
        data: patientsAtRisk,
      });
    } catch (error) {
      console.error('Error fetching patients at risk:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch patients at risk',
      });
    }
  }
);

/**
 * @route   GET /api/analytics/churn/dashboard
 * @desc    Get churn prediction dashboard metrics
 * @access  Private (Admin/Full Access)
 */
router.get(
  '/churn/dashboard',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      const query = {};
      if (startDate && endDate) {
        query.predictionDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      } else {
        // Default to last 30 days
        query.predictionDate = {
          $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        };
      }

      // Get all predictions in the period
      const predictions = await ChurnPrediction.find(query);

      // Calculate metrics
      const riskDistribution = {
        Critical: predictions.filter((p) => p.churnRisk.level === 'Critical').length,
        High: predictions.filter((p) => p.churnRisk.level === 'High').length,
        Medium: predictions.filter((p) => p.churnRisk.level === 'Medium').length,
        Low: predictions.filter((p) => p.churnRisk.level === 'Low').length,
      };

      const averageChurnScore =
        predictions.reduce((sum, p) => sum + p.churnRisk.score, 0) / predictions.length || 0;

      // Retention strategy status
      const retentionStrategies = {
        pending: predictions.filter((p) => p.retentionStrategy.status === 'pending').length,
        in_progress: predictions.filter((p) => p.retentionStrategy.status === 'in_progress').length,
        completed: predictions.filter((p) => p.retentionStrategy.status === 'completed').length,
      };

      // Top churn indicators
      const allRedFlags = predictions.flatMap((p) => p.churnIndicators.redFlags || []);
      const indicatorCounts = {};
      allRedFlags.forEach((flag) => {
        indicatorCounts[flag.indicator] = (indicatorCounts[flag.indicator] || 0) + 1;
      });

      const topIndicators = Object.entries(indicatorCounts)
        .map(([indicator, count]) => ({ indicator, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate actual churn rate (if we have validation data)
      const validatedPredictions = predictions.filter(
        (p) => p.actualOutcome && p.actualOutcome.churned !== undefined
      );
      const actualChurnRate =
        validatedPredictions.length > 0
          ? (validatedPredictions.filter((p) => p.actualOutcome.churned).length /
              validatedPredictions.length) *
            100
          : null;

      res.json({
        success: true,
        period: {
          start: query.predictionDate?.$gte || null,
          end: query.predictionDate?.$lte || new Date(),
        },
        summary: {
          totalPredictions: predictions.length,
          averageChurnScore: Math.round(averageChurnScore),
          actualChurnRate: actualChurnRate ? Math.round(actualChurnRate) : 'N/A',
          patientsAtHighRisk: riskDistribution.High + riskDistribution.Critical,
        },
        riskDistribution,
        retentionStrategies,
        topChurnIndicators: topIndicators,
      });
    } catch (error) {
      console.error('Error fetching churn dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch churn dashboard',
      });
    }
  }
);

/**
 * @route   GET /api/analytics/churn/patient/:patientId
 * @desc    Get churn prediction history for a patient
 * @access  Private (Admin/Full Access)
 */
router.get(
  '/churn/patient/:patientId',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { patientId } = req.params;
      const { limit } = req.query;

      const predictions = await ChurnPrediction.find({ patient: patientId })
        .sort({ predictionDate: -1 })
        .limit(parseInt(limit, 10) || 10)
        .populate('calculatedBy', 'firstName lastName')
        .populate('retentionStrategy.assignedTo', 'firstName lastName');

      if (predictions.length === 0) {
        return res.json({
          success: true,
          message: 'No predictions found for this patient',
          data: [],
        });
      }

      // Get the most recent prediction
      const latestPrediction = predictions[0];

      // Calculate trend
      let trend = 'stable';
      if (predictions.length >= 2) {
        const scoreDiff = predictions[0].churnRisk.score - predictions[1].churnRisk.score;
        if (scoreDiff > 10) trend = 'increasing';
        else if (scoreDiff < -10) trend = 'decreasing';
      }

      res.json({
        success: true,
        count: predictions.length,
        latest: latestPrediction,
        trend,
        data: predictions,
      });
    } catch (error) {
      console.error('Error fetching patient churn history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch patient churn history',
      });
    }
  }
);

/**
 * @route   PUT /api/analytics/churn/:predictionId/retention-strategy
 * @desc    Update retention strategy for a churn prediction
 * @access  Private (Admin/Full Access)
 */
router.put(
  '/churn/:predictionId/retention-strategy',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { predictionId } = req.params;
      const { status, assignedTo, notes } = req.body;

      const prediction = await ChurnPrediction.findById(predictionId);

      if (!prediction) {
        return res.status(404).json({
          success: false,
          error: 'Prediction not found',
        });
      }

      // Update retention strategy
      if (status) prediction.retentionStrategy.status = status;
      if (assignedTo) prediction.retentionStrategy.assignedTo = assignedTo;
      if (notes) prediction.retentionStrategy.notes = notes;

      await prediction.save();

      await prediction.populate('retentionStrategy.assignedTo', 'firstName lastName');

      res.json({
        success: true,
        message: 'Retention strategy updated successfully',
        data: prediction,
      });
    } catch (error) {
      console.error('Error updating retention strategy:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update retention strategy',
      });
    }
  }
);

/**
 * @route   POST /api/analytics/churn/:predictionId/retention-effort
 * @desc    Add a retention effort to a churn prediction
 * @access  Private (Admin/Full Access)
 */
router.post(
  '/churn/:predictionId/retention-effort',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { predictionId } = req.params;
      const { type, description, outcome } = req.body;

      if (!type || !description || !outcome) {
        return res.status(400).json({
          success: false,
          error: 'type, description, and outcome are required',
        });
      }

      const prediction = await ChurnPrediction.findById(predictionId);

      if (!prediction) {
        return res.status(404).json({
          success: false,
          error: 'Prediction not found',
        });
      }

      await prediction.addRetentionEffort(type, description, outcome, req.user._id);

      await prediction.populate('retentionEfforts.performedBy', 'firstName lastName');

      res.json({
        success: true,
        message: 'Retention effort added successfully',
        data: prediction,
      });
    } catch (error) {
      console.error('Error adding retention effort:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add retention effort',
      });
    }
  }
);

/**
 * @route   PUT /api/analytics/churn/:predictionId/actual-outcome
 * @desc    Update actual churn outcome for prediction validation
 * @access  Private (Admin only)
 */
router.put(
  '/churn/:predictionId/actual-outcome',
  protect,
  authorize('full_access'),
  async (req, res) => {
    try {
      const { predictionId } = req.params;
      const { churned, churnDate, churnReason, churnReasonDetails } = req.body;

      if (churned === undefined) {
        return res.status(400).json({
          success: false,
          error: 'churned (boolean) is required',
        });
      }

      const prediction = await ChurnPrediction.findById(predictionId);

      if (!prediction) {
        return res.status(404).json({
          success: false,
          error: 'Prediction not found',
        });
      }

      await prediction.updateOutcome(churned, churnDate, churnReason, churnReasonDetails);

      res.json({
        success: true,
        message: 'Actual outcome updated successfully',
        data: prediction,
        predictionAccurate: prediction.predictionAccurate,
      });
    } catch (error) {
      console.error('Error updating actual outcome:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update actual outcome',
      });
    }
  }
);

/**
 * @route   GET /api/analytics/churn/model-accuracy
 * @desc    Get churn prediction model accuracy metrics
 * @access  Private (Admin only)
 */
router.get('/churn/model-accuracy', protect, authorize('full_access'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const accuracy = await ChurnPrediction.calculateModelAccuracy(start, end);

    res.json({
      success: true,
      period: {
        start,
        end,
      },
      metrics: accuracy,
    });
  } catch (error) {
    console.error('Error calculating model accuracy:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate model accuracy',
    });
  }
});

/**
 * @route   GET /api/analytics/churn/trends
 * @desc    Get churn risk trends over time
 * @access  Private (Admin/Full Access)
 */
router.get(
  '/churn/trends',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { startDate, endDate, groupBy } = req.query;

      const start = startDate
        ? new Date(startDate)
        : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      // Aggregate predictions by time period
      const groupByFormat =
        groupBy === 'month' ? '%Y-%m' : groupBy === 'week' ? '%Y-W%U' : '%Y-%m-%d';

      const trends = await ChurnPrediction.aggregate([
        {
          $match: {
            predictionDate: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: {
              period: { $dateToString: { format: groupByFormat, date: '$predictionDate' } },
              riskLevel: '$churnRisk.level',
            },
            count: { $sum: 1 },
            averageScore: { $avg: '$churnRisk.score' },
          },
        },
        {
          $sort: { '_id.period': 1 },
        },
      ]);

      // Format for frontend visualization
      const formattedTrends = trends.reduce((acc, item) => {
        const { period } = item._id;
        if (!acc[period]) {
          acc[period] = {
            period,
            Critical: 0,
            High: 0,
            Medium: 0,
            Low: 0,
            averageScore: 0,
          };
        }
        acc[period][item._id.riskLevel] = item.count;
        acc[period].averageScore = item.averageScore;
        return acc;
      }, {});

      res.json({
        success: true,
        period: { start, end },
        groupBy: groupBy || 'day',
        trends: Object.values(formattedTrends),
      });
    } catch (error) {
      console.error('Error fetching churn trends:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch churn trends',
      });
    }
  }
);

/**
 * @route   DELETE /api/analytics/churn/:predictionId
 * @desc    Delete a churn prediction
 * @access  Private (Admin only)
 */
router.delete('/churn/:predictionId', protect, authorize('full_access'), async (req, res) => {
  try {
    const { predictionId } = req.params;

    const prediction = await ChurnPrediction.findByIdAndDelete(predictionId);

    if (!prediction) {
      return res.status(404).json({
        success: false,
        error: 'Prediction not found',
      });
    }

    res.json({
      success: true,
      message: 'Churn prediction deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting churn prediction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete churn prediction',
    });
  }
});

// ============================================
// ATTRIBUTION REPORTING ENDPOINTS
// ============================================

/**
 * @route   POST /api/analytics/attribution/track
 * @desc    Track a touchpoint for patient attribution
 * @access  Public (for tracking pixels/webhooks) / Private
 */
router.post('/attribution/track', async (req, res) => {
  try {
    const {
      patientId,
      channel,
      medium,
      source,
      campaign,
      content,
      keyword,
      landingPage,
      referrerUrl,
      device,
      browser,
      os,
      location,
      pageViews,
      sessionDuration,
      interactions,
    } = req.body;

    if (!patientId || !channel) {
      return res.status(400).json({
        success: false,
        error: 'patientId and channel are required',
      });
    }

    const touchPointData = {
      timestamp: new Date(),
      channel,
      medium,
      source,
      campaign,
      content,
      keyword,
      landingPage,
      referrerUrl,
      pageViews,
      sessionDuration,
      device,
      browser,
      os,
      location,
      interactions,
    };

    const attribution = await PatientAttribution.trackTouchPoint(patientId, touchPointData);

    res.json({
      success: true,
      message: 'Touchpoint tracked successfully',
      data: attribution,
    });
  } catch (error) {
    console.error('Error tracking touchpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track touchpoint',
    });
  }
});

/**
 * @route   PUT /api/analytics/attribution/:patientId/convert
 * @desc    Mark patient attribution as converted
 * @access  Private (Admin/Full Access)
 */
router.put(
  '/attribution/:patientId/convert',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { patientId } = req.params;
      const { conversionType, appointmentId, appointmentDate } = req.body;

      const attribution = await PatientAttribution.findOne({ patient: patientId });

      if (!attribution) {
        return res.status(404).json({
          success: false,
          error: 'Attribution record not found for this patient',
        });
      }

      await attribution.markConverted({
        conversionDate: new Date(),
        conversionType: conversionType || 'appointment_booked',
        appointmentId,
        appointmentDate,
      });

      res.json({
        success: true,
        message: 'Patient marked as converted',
        data: attribution,
      });
    } catch (error) {
      console.error('Error marking conversion:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark conversion',
      });
    }
  }
);

/**
 * @route   PUT /api/analytics/attribution/:patientId/revenue
 * @desc    Update revenue attribution for a patient
 * @access  Private (Admin/Billing)
 */
router.put(
  '/attribution/:patientId/revenue',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { patientId } = req.params;
      const { lifetimeValue, firstYearRevenue } = req.body;

      const attribution = await PatientAttribution.findOne({ patient: patientId });

      if (!attribution) {
        return res.status(404).json({
          success: false,
          error: 'Attribution record not found for this patient',
        });
      }

      await attribution.updateRevenue(lifetimeValue, firstYearRevenue);

      res.json({
        success: true,
        message: 'Revenue updated successfully',
        data: attribution,
      });
    } catch (error) {
      console.error('Error updating revenue:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update revenue',
      });
    }
  }
);

/**
 * @route   GET /api/analytics/attribution/report
 * @desc    Get attribution report for a date range
 * @access  Private (Admin/Full Access)
 */
router.get(
  '/attribution/report',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { startDate, endDate, attributionModel } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'startDate and endDate are required',
        });
      }

      const model = attributionModel || 'lastTouch';

      const report = await PatientAttribution.getAttributionReport(
        new Date(startDate),
        new Date(endDate),
        model
      );

      res.json({
        success: true,
        period: {
          start: startDate,
          end: endDate,
        },
        attributionModel: model,
        report,
      });
    } catch (error) {
      console.error('Error generating attribution report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate attribution report',
      });
    }
  }
);

/**
 * @route   GET /api/analytics/attribution/dashboard
 * @desc    Get attribution dashboard metrics
 * @access  Private (Admin/Full Access)
 */
router.get(
  '/attribution/dashboard',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate
        ? new Date(startDate)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      // Get conversion funnel
      const funnel = await PatientAttribution.getConversionFunnel(start, end);

      // Get attribution report for last touch (default)
      const lastTouchReport = await PatientAttribution.getAttributionReport(
        start,
        end,
        'lastTouch'
      );

      // Get top conversion paths
      const topPaths = await PatientAttribution.getTopConversionPaths(start, end, 5);

      // Channel performance summary
      const channelPerformance = Object.entries(lastTouchReport.channelPerformance || {})
        .map(([channel, metrics]) => ({
          channel,
          ...metrics,
          roi: metrics.revenue > 0 ? metrics.revenue / (metrics.touchPoints * 50) : 0, // Assuming $50 avg cost per touchpoint
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      res.json({
        success: true,
        period: { start, end },
        summary: {
          totalConversions: lastTouchReport.totalConversions,
          totalRevenue: lastTouchReport.totalRevenue,
          avgJourneyLength: Math.round(lastTouchReport.avgJourneyLength * 10) / 10,
          avgJourneyDuration: Math.round(lastTouchReport.avgJourneyDuration * 10) / 10,
          conversionRate: Math.round(funnel.conversionRate * 10) / 10,
        },
        funnel,
        channelPerformance,
        topConversionPaths: topPaths,
      });
    } catch (error) {
      console.error('Error fetching attribution dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch attribution dashboard',
      });
    }
  }
);

/**
 * @route   GET /api/analytics/attribution/patient/:patientId
 * @desc    Get attribution journey for a specific patient
 * @access  Private (Admin/Full Access)
 */
router.get(
  '/attribution/patient/:patientId',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { patientId } = req.params;

      const attribution = await PatientAttribution.findOne({ patient: patientId })
        .populate('patient', 'firstName lastName email phone')
        .populate('firstAppointment', 'startTime serviceType');

      if (!attribution) {
        return res.json({
          success: true,
          message: 'No attribution data found for this patient',
          data: null,
        });
      }

      res.json({
        success: true,
        data: attribution,
      });
    } catch (error) {
      console.error('Error fetching patient attribution:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch patient attribution',
      });
    }
  }
);

/**
 * @route   GET /api/analytics/attribution/comparison
 * @desc    Compare different attribution models
 * @access  Private (Admin/Full Access)
 */
router.get(
  '/attribution/comparison',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'startDate and endDate are required',
        });
      }

      const comparison = await PatientAttribution.compareAttributionModels(
        new Date(startDate),
        new Date(endDate)
      );

      // Format for easier frontend consumption
      const formattedComparison = {
        models: Object.keys(comparison),
        channels: {},
      };

      // Aggregate channel data across models
      Object.entries(comparison).forEach(([model, data]) => {
        Object.entries(data.channelPerformance || {}).forEach(([channel, metrics]) => {
          if (!formattedComparison.channels[channel]) {
            formattedComparison.channels[channel] = {};
          }
          formattedComparison.channels[channel][model] = {
            conversions: metrics.attributedConversions || 0,
            revenue: metrics.revenue || 0,
          };
        });
      });

      res.json({
        success: true,
        period: {
          start: startDate,
          end: endDate,
        },
        rawComparison: comparison,
        formattedComparison,
      });
    } catch (error) {
      console.error('Error comparing attribution models:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to compare attribution models',
      });
    }
  }
);

/**
 * @route   GET /api/analytics/attribution/conversion-paths
 * @desc    Get top conversion paths
 * @access  Private (Admin/Full Access)
 */
router.get(
  '/attribution/conversion-paths',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { startDate, endDate, limit } = req.query;

      const start = startDate
        ? new Date(startDate)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const paths = await PatientAttribution.getTopConversionPaths(
        start,
        end,
        parseInt(limit, 10) || 20
      );

      res.json({
        success: true,
        period: { start, end },
        totalPaths: paths.length,
        paths,
      });
    } catch (error) {
      console.error('Error fetching conversion paths:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch conversion paths',
      });
    }
  }
);

/**
 * @route   GET /api/analytics/attribution/channel/:channel
 * @desc    Get detailed performance for a specific channel
 * @access  Private (Admin/Full Access)
 */
router.get(
  '/attribution/channel/:channel',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { channel } = req.params;
      const { startDate, endDate } = req.query;

      const start = startDate
        ? new Date(startDate)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      // Get all attributions with this channel
      const attributions = await PatientAttribution.find({
        converted: true,
        conversionDate: { $gte: start, $lte: end },
        'touchPoints.channel': channel,
      });

      // Aggregate metrics
      let totalTouchPoints = 0;
      const totalCredits = {
        firstTouch: 0,
        lastTouch: 0,
        linear: 0,
        timeDecay: 0,
        positionBased: 0,
        custom: 0,
      };
      let totalRevenue = 0;
      let conversionsAsFirst = 0;
      let conversionsAsLast = 0;
      const campaigns = new Set();

      attributions.forEach((attr) => {
        attr.touchPoints.forEach((tp) => {
          if (tp.channel === channel) {
            totalTouchPoints += 1;
            Object.keys(totalCredits).forEach((model) => {
              totalCredits[model] += tp.credits[model] || 0;
              totalRevenue += (attr.lifetimeValue || 0) * (tp.credits.lastTouch || 0); // Using lastTouch for revenue
            });
            if (tp.campaign) campaigns.add(tp.campaign);
          }
        });

        if (attr.firstTouchChannel === channel) conversionsAsFirst += 1;
        if (attr.lastTouchChannel === channel) conversionsAsLast += 1;
      });

      res.json({
        success: true,
        channel,
        period: { start, end },
        metrics: {
          totalTouchPoints,
          attributedConversions: totalCredits,
          totalRevenue,
          conversionsAsFirst,
          conversionsAsLast,
          totalConversions: attributions.length,
          uniqueCampaigns: campaigns.size,
          campaigns: Array.from(campaigns),
        },
      });
    } catch (error) {
      console.error('Error fetching channel performance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch channel performance',
      });
    }
  }
);

/**
 * @route   GET /api/analytics/attribution/campaign/:campaign
 * @desc    Get performance for a specific campaign
 * @access  Private (Admin/Full Access)
 */
router.get(
  '/attribution/campaign/:campaign',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { campaign } = req.params;
      const { startDate, endDate } = req.query;

      const start = startDate
        ? new Date(startDate)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      // Get all attributions with this campaign
      const attributions = await PatientAttribution.find({
        converted: true,
        conversionDate: { $gte: start, $lte: end },
        campaigns: campaign,
      });

      // Aggregate metrics
      let totalRevenue = 0;
      let totalTouchPoints = 0;
      const channels = {};

      attributions.forEach((attr) => {
        totalRevenue += attr.lifetimeValue || 0;

        attr.touchPoints.forEach((tp) => {
          if (tp.campaign === campaign) {
            totalTouchPoints += 1;
            if (!channels[tp.channel]) {
              channels[tp.channel] = { count: 0, revenue: 0 };
            }
            channels[tp.channel].count += 1;
            channels[tp.channel].revenue += (attr.lifetimeValue || 0) * (tp.credits.lastTouch || 0);
          }
        });
      });

      res.json({
        success: true,
        campaign,
        period: { start, end },
        metrics: {
          totalConversions: attributions.length,
          totalRevenue,
          totalTouchPoints,
          avgRevenuePerConversion: attributions.length > 0 ? totalRevenue / attributions.length : 0,
          channelBreakdown: channels,
        },
      });
    } catch (error) {
      console.error('Error fetching campaign performance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch campaign performance',
      });
    }
  }
);

/**
 * @route   GET /api/analytics/attribution/funnel
 * @desc    Get conversion funnel metrics
 * @access  Private (Admin/Full Access)
 */
router.get(
  '/attribution/funnel',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate
        ? new Date(startDate)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const funnel = await PatientAttribution.getConversionFunnel(start, end);

      // Additional funnel stages
      const totalJourneys = await PatientAttribution.countDocuments({
        journeyStartDate: { $gte: start, $lte: end },
      });

      const withEngagement = await PatientAttribution.countDocuments({
        journeyStartDate: { $gte: start, $lte: end },
        engagementScore: { $gte: 25 },
      });

      const withHighIntent = await PatientAttribution.countDocuments({
        journeyStartDate: { $gte: start, $lte: end },
        intentScore: { $gte: 50 },
      });

      res.json({
        success: true,
        period: { start, end },
        stages: {
          totalJourneys,
          withEngagement,
          withEngagementRate: totalJourneys > 0 ? (withEngagement / totalJourneys) * 100 : 0,
          withHighIntent,
          highIntentRate: totalJourneys > 0 ? (withHighIntent / totalJourneys) * 100 : 0,
          converted: funnel.converted,
          conversionRate: funnel.conversionRate,
        },
        metrics: funnel,
      });
    } catch (error) {
      console.error('Error fetching conversion funnel:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch conversion funnel',
      });
    }
  }
);

/**
 * @route   DELETE /api/analytics/attribution/:patientId
 * @desc    Delete attribution data for a patient
 * @access  Private (Admin only)
 */
router.delete('/attribution/:patientId', protect, authorize('full_access'), async (req, res) => {
  try {
    const { patientId } = req.params;

    const attribution = await PatientAttribution.findOneAndDelete({ patient: patientId });

    if (!attribution) {
      return res.status(404).json({
        success: false,
        error: 'Attribution record not found',
      });
    }

    res.json({
      success: true,
      message: 'Attribution data deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting attribution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete attribution',
    });
  }
});

// ============================================
// ANOMALY ALERTING ENDPOINTS
// ============================================

/**
 * @route   GET /api/analytics/anomalies
 * @desc    Get all anomalies with filtering
 * @access  Private (Admin/Full Access)
 */
router.get('/anomalies', protect, authorize('full_access', 'admin_billing'), async (req, res) => {
  try {
    const { status, severity, anomalyType, startDate, endDate, limit } = req.query;

    const query = {};
    if (status) query.status = status;
    if (severity) query.severity = severity;
    if (anomalyType) query.anomalyType = anomalyType;
    if (startDate || endDate) {
      query.detectedAt = {};
      if (startDate) query.detectedAt.$gte = new Date(startDate);
      if (endDate) query.detectedAt.$lte = new Date(endDate);
    }

    const anomalies = await Anomaly.find(query)
      .populate('assignedTo', 'firstName lastName email')
      .populate('investigation.resolvedBy', 'firstName lastName')
      .sort({ detectedAt: -1 })
      .limit(parseInt(limit, 10) || 50);

    res.json({
      success: true,
      count: anomalies.length,
      data: anomalies,
    });
  } catch (error) {
    console.error('Error fetching anomalies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch anomalies',
    });
  }
});

/**
 * @route   GET /api/analytics/anomalies/active
 * @desc    Get active (unresolved) anomalies
 * @access  Private (Admin/Full Access)
 */
router.get(
  '/anomalies/active',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { severity } = req.query;
      const filters = {};
      if (severity) filters.severity = severity;

      const anomalies = await Anomaly.getActiveAnomalies(filters);

      res.json({
        success: true,
        count: anomalies.length,
        data: anomalies,
      });
    } catch (error) {
      console.error('Error fetching active anomalies:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch active anomalies',
      });
    }
  }
);

/**
 * @route   GET /api/analytics/anomalies/dashboard
 * @desc    Get anomaly dashboard metrics
 * @access  Private (Admin/Full Access)
 */
router.get(
  '/anomalies/dashboard',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate
        ? new Date(startDate)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const stats = await Anomaly.getStatistics(start, end);
      const activeAnomalies = await Anomaly.getActiveAnomalies();

      // Get recent critical anomalies
      const criticalAnomalies = await Anomaly.find({
        severity: 'critical',
        status: { $in: ['new', 'acknowledged', 'investigating'] },
      })
        .populate('assignedTo', 'firstName lastName')
        .sort({ detectedAt: -1 })
        .limit(5);

      res.json({
        success: true,
        period: { start, end },
        summary: {
          totalActive: activeAnomalies.length,
          totalInPeriod: stats.total,
          criticalCount: stats.bySeverity.critical,
          avgResolutionTime: Math.round(stats.avgResolutionTime * 10) / 10,
          falsePositiveRate: Math.round(stats.falsePositiveRate * 10) / 10,
        },
        statistics: stats,
        criticalAnomalies,
      });
    } catch (error) {
      console.error('Error fetching anomaly dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch anomaly dashboard',
      });
    }
  }
);

/**
 * @route   GET /api/analytics/anomalies/:id
 * @desc    Get specific anomaly details
 * @access  Private (Admin/Full Access)
 */
router.get(
  '/anomalies/:id',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const anomaly = await Anomaly.findById(req.params.id)
        .populate('assignedTo', 'firstName lastName email')
        .populate('investigation.notes.addedBy', 'firstName lastName')
        .populate('investigation.resolvedBy', 'firstName lastName');

      if (!anomaly) {
        return res.status(404).json({
          success: false,
          error: 'Anomaly not found',
        });
      }

      res.json({
        success: true,
        data: anomaly,
      });
    } catch (error) {
      console.error('Error fetching anomaly:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch anomaly',
      });
    }
  }
);

/**
 * @route   POST /api/analytics/anomalies
 * @desc    Create new anomaly (manual or automated)
 * @access  Private (Admin/Full Access)
 */
router.post('/anomalies', protect, authorize('full_access'), async (req, res) => {
  try {
    const anomalyData = {
      ...req.body,
      detectedAt: new Date(),
    };

    const anomaly = await Anomaly.createAnomaly(anomalyData);

    res.json({
      success: true,
      message: 'Anomaly created successfully',
      data: anomaly,
    });
  } catch (error) {
    console.error('Error creating anomaly:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create anomaly',
    });
  }
});

/**
 * @route   PUT /api/analytics/anomalies/:id/acknowledge
 * @desc    Acknowledge an anomaly
 * @access  Private (Admin/Full Access)
 */
router.put(
  '/anomalies/:id/acknowledge',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const anomaly = await Anomaly.findById(req.params.id);

      if (!anomaly) {
        return res.status(404).json({
          success: false,
          error: 'Anomaly not found',
        });
      }

      await anomaly.acknowledge(req.user._id);

      res.json({
        success: true,
        message: 'Anomaly acknowledged',
        data: anomaly,
      });
    } catch (error) {
      console.error('Error acknowledging anomaly:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to acknowledge anomaly',
      });
    }
  }
);

/**
 * @route   POST /api/analytics/anomalies/:id/notes
 * @desc    Add investigation note to anomaly
 * @access  Private (Admin/Full Access)
 */
router.post(
  '/anomalies/:id/notes',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { note } = req.body;

      if (!note) {
        return res.status(400).json({
          success: false,
          error: 'Note is required',
        });
      }

      const anomaly = await Anomaly.findById(req.params.id);

      if (!anomaly) {
        return res.status(404).json({
          success: false,
          error: 'Anomaly not found',
        });
      }

      await anomaly.addNote(note, req.user._id);
      await anomaly.populate('investigation.notes.addedBy', 'firstName lastName');

      res.json({
        success: true,
        message: 'Note added successfully',
        data: anomaly,
      });
    } catch (error) {
      console.error('Error adding note:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add note',
      });
    }
  }
);

/**
 * @route   PUT /api/analytics/anomalies/:id/resolve
 * @desc    Resolve an anomaly
 * @access  Private (Admin/Full Access)
 */
router.put(
  '/anomalies/:id/resolve',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { resolution, rootCause } = req.body;

      if (!resolution) {
        return res.status(400).json({
          success: false,
          error: 'Resolution is required',
        });
      }

      const anomaly = await Anomaly.findById(req.params.id);

      if (!anomaly) {
        return res.status(404).json({
          success: false,
          error: 'Anomaly not found',
        });
      }

      await anomaly.resolve(resolution, rootCause, req.user._id);

      res.json({
        success: true,
        message: 'Anomaly resolved',
        data: anomaly,
      });
    } catch (error) {
      console.error('Error resolving anomaly:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to resolve anomaly',
      });
    }
  }
);

/**
 * @route   PUT /api/analytics/anomalies/:id/false-positive
 * @desc    Mark anomaly as false positive
 * @access  Private (Admin/Full Access)
 */
router.put('/anomalies/:id/false-positive', protect, authorize('full_access'), async (req, res) => {
  try {
    const { reason } = req.body;

    const anomaly = await Anomaly.findById(req.params.id);

    if (!anomaly) {
      return res.status(404).json({
        success: false,
        error: 'Anomaly not found',
      });
    }

    await anomaly.markFalsePositive(reason);

    res.json({
      success: true,
      message: 'Anomaly marked as false positive',
      data: anomaly,
    });
  } catch (error) {
    console.error('Error marking false positive:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark as false positive',
    });
  }
});

/**
 * @route   POST /api/analytics/anomalies/:id/alerts
 * @desc    Send alerts for an anomaly
 * @access  Private (Admin only)
 */
router.post('/anomalies/:id/alerts', protect, authorize('full_access'), async (req, res) => {
  try {
    const { recipients } = req.body;

    if (!recipients || !Array.isArray(recipients)) {
      return res.status(400).json({
        success: false,
        error: 'Recipients array is required',
      });
    }

    const anomaly = await Anomaly.findById(req.params.id);

    if (!anomaly) {
      return res.status(404).json({
        success: false,
        error: 'Anomaly not found',
      });
    }

    const User = require('../models/User');
    const recipientUsers = await User.find({ _id: { $in: recipients } });

    await anomaly.sendAlerts(recipientUsers);

    res.json({
      success: true,
      message: 'Alerts sent successfully',
      data: anomaly,
    });
  } catch (error) {
    console.error('Error sending alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send alerts',
    });
  }
});

/**
 * @route   DELETE /api/analytics/anomalies/:id
 * @desc    Delete an anomaly
 * @access  Private (Admin only)
 */
router.delete('/anomalies/:id', protect, authorize('full_access'), async (req, res) => {
  try {
    const anomaly = await Anomaly.findByIdAndDelete(req.params.id);

    if (!anomaly) {
      return res.status(404).json({
        success: false,
        error: 'Anomaly not found',
      });
    }

    res.json({
      success: true,
      message: 'Anomaly deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting anomaly:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete anomaly',
    });
  }
});

// ============================================
// DATA EXPORT ENDPOINTS
// ============================================

/**
 * @route   POST /api/analytics/export
 * @desc    Create a new export job
 * @access  Private (Admin/Full Access)
 */
router.post('/export', protect, authorize('full_access', 'admin_billing'), async (req, res) => {
  try {
    const { exportType, format, filters, columns, dateRange, options } = req.body;

    if (!exportType || !format) {
      return res.status(400).json({
        success: false,
        error: 'exportType and format are required',
      });
    }

    const job = await ExportJob.createJob({
      exportType,
      format,
      requestedBy: req.user._id,
      filters: filters || {},
      columns: columns || [],
      dateRange,
      options: options || {},
    });

    // Start processing in background (simplified - would use queue in production)
    processExportJob(job._id).catch((error) => {
      console.error('Export job processing error:', error);
    });

    res.json({
      success: true,
      message: 'Export job created successfully',
      data: job,
    });
  } catch (error) {
    console.error('Error creating export job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create export job',
    });
  }
});

/**
 * Background job processor
 */
async function processExportJob(jobId) {
  const job = await ExportJob.findById(jobId);
  if (!job) return;

  try {
    await job.startProcessing();

    const { fileInfo, recordCount } = await exportService.generateExport(
      job.exportType,
      job.filters,
      job.format,
      job.columns,
      job.file.filename || `export_${Date.now()}.${job.format}`,
      job.options
    );

    fileInfo.downloadUrl = `/api/analytics/export/${job.jobId}/download`;
    job.recordCount = recordCount;

    await job.complete(fileInfo);
  } catch (error) {
    await job.fail(error);
  }
}

/**
 * @route   GET /api/analytics/export/jobs
 * @desc    Get user's export jobs
 * @access  Private
 */
router.get('/export/jobs', protect, async (req, res) => {
  try {
    const { status, format, exportType } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (format) filters.format = format;
    if (exportType) filters.exportType = exportType;

    const jobs = await ExportJob.getUserJobs(req.user._id, filters);

    res.json({
      success: true,
      count: jobs.length,
      data: jobs,
    });
  } catch (error) {
    console.error('Error fetching export jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch export jobs',
    });
  }
});

/**
 * @route   GET /api/analytics/export/:jobId
 * @desc    Get export job status
 * @access  Private
 */
router.get('/export/:jobId', protect, async (req, res) => {
  try {
    const job = await ExportJob.findOne({
      jobId: req.params.jobId,
      requestedBy: req.user._id,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Export job not found',
      });
    }

    res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error('Error fetching export job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch export job',
    });
  }
});

/**
 * @route   GET /api/analytics/export/:jobId/download
 * @desc    Download export file
 * @access  Private
 */
router.get('/export/:jobId/download', protect, async (req, res) => {
  try {
    const job = await ExportJob.findOne({
      jobId: req.params.jobId,
      requestedBy: req.user._id,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Export job not found',
      });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Export is not ready yet',
        status: job.status,
        progress: job.progress,
      });
    }

    if (job.isExpired()) {
      return res.status(410).json({
        success: false,
        error: 'Export file has expired',
      });
    }

    if (!job.file || !job.file.path) {
      return res.status(404).json({
        success: false,
        error: 'Export file not found',
      });
    }

    // Record download
    await job.recordDownload({
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Send file
    res.download(job.file.path, job.file.filename);
  } catch (error) {
    console.error('Error downloading export:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download export',
    });
  }
});

/**
 * @route   DELETE /api/analytics/export/:jobId
 * @desc    Cancel or delete export job
 * @access  Private
 */
router.delete('/export/:jobId', protect, async (req, res) => {
  try {
    const job = await ExportJob.findOne({
      jobId: req.params.jobId,
      requestedBy: req.user._id,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Export job not found',
      });
    }

    let message;
    if (job.status === 'pending' || job.status === 'processing') {
      await job.cancel();
      let message; message = 'Export job cancelled';
    } else {
      await job.deleteFile();
      await job.deleteOne();
      let message; message = 'Export job deleted';
    }

    res.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error('Error deleting export job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete export job',
    });
  }
});

/**
 * @route   GET /api/analytics/export/stats
 * @desc    Get export statistics
 * @access  Private (Admin only)
 */
router.get('/export/stats', protect, authorize('full_access'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const stats = await ExportJob.getStatistics(start, end);

    res.json({
      success: true,
      period: { start, end },
      statistics: stats,
    });
  } catch (error) {
    console.error('Error fetching export statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch export statistics',
    });
  }
});

// ============================================
// REAL-TIME DASHBOARD ENDPOINTS
// ============================================

/**
 * @route   GET /api/analytics/dashboard/overview
 * @desc    Get cached overview metrics
 * @access  Private (All authenticated users)
 */
router.get('/dashboard/overview', protect, async (req, res) => {
  try {
    const { practitionerId } = req.query;

    // Check if user is requesting practitioner-specific metrics
    const scope = practitionerId ? 'practitioner' : 'global';
    const userId = practitionerId || null;

    // Try to get valid cached metric
    let metric = await DashboardMetrics.getValid('overview', scope, userId);

    // If no valid cache, calculate and cache
    if (!metric) {
      const data = await DashboardMetrics.calculateOverview();
      metric = await DashboardMetrics.getOrCreate('overview', scope, userId);
      await metric.refresh(data);
    }

    res.json({
      success: true,
      data: metric.data,
      metadata: {
        calculatedAt: metric.calculatedAt,
        validUntil: metric.validUntil,
        isStale: metric.isStale,
        refreshInterval: metric.refreshInterval,
      },
    });
  } catch (error) {
    console.error('Error fetching overview metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch overview metrics',
    });
  }
});

/**
 * @route   GET /api/analytics/dashboard/practitioners
 * @desc    Get practitioner utilization metrics
 * @access  Private (Admin/Full Access)
 */
router.get(
  '/dashboard/practitioners',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      // Try to get valid cached metric
      let metric = await DashboardMetrics.getValid('practitioner_utilization', 'global');

      // If no valid cache, calculate and cache
      if (!metric) {
        const data = await DashboardMetrics.calculatePractitionerUtilization();
        metric = await DashboardMetrics.getOrCreate('practitioner_utilization', 'global');
        await metric.refresh(data);
      }

      res.json({
        success: true,
        data: metric.data,
        metadata: {
          calculatedAt: metric.calculatedAt,
          validUntil: metric.validUntil,
        },
      });
    } catch (error) {
      console.error('Error fetching practitioner metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch practitioner metrics',
      });
    }
  }
);

/**
 * @route   GET /api/analytics/dashboard/system-health
 * @desc    Get system health metrics
 * @access  Private (Admin/Full Access)
 */
router.get(
  '/dashboard/system-health',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      // Try to get valid cached metric
      let metric = await DashboardMetrics.getValid('system_health', 'global');

      // If no valid cache, calculate and cache
      if (!metric) {
        const data = await DashboardMetrics.calculateSystemHealth();
        metric = await DashboardMetrics.getOrCreate('system_health', 'global');
        await metric.refresh(data);
      }

      res.json({
        success: true,
        data: metric.data,
        metadata: {
          calculatedAt: metric.calculatedAt,
          validUntil: metric.validUntil,
        },
      });
    } catch (error) {
      console.error('Error fetching system health:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch system health',
      });
    }
  }
);

/**
 * @route   POST /api/analytics/dashboard/refresh
 * @desc    Force refresh of specific metric or all metrics
 * @access  Private (Admin only)
 */
router.post('/dashboard/refresh', protect, authorize('full_access'), async (req, res) => {
  try {
    const { metricType } = req.body;

    if (metricType) {
      // Invalidate specific metric type
      const count = await DashboardMetrics.invalidateAll(metricType);

      // Broadcast update via WebSocket
      websocketService.broadcastMetricUpdate(metricType, { refreshed: true });

      res.json({
        success: true,
        message: `Invalidated ${count} metric(s) of type: ${metricType}`,
        metricType,
        count,
      });
    } else {
      // Invalidate all metrics
      const count = await DashboardMetrics.invalidateAll();

      res.json({
        success: true,
        message: `Invalidated all metrics (${count} total)`,
        count,
      });
    }
  } catch (error) {
    console.error('Error refreshing metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh metrics',
    });
  }
});

/**
 * @route   GET /api/analytics/dashboard/ws-token
 * @desc    Get WebSocket authentication token
 * @access  Private
 */
router.get('/dashboard/ws-token', protect, async (req, res) => {
  try {
    // Generate JWT token for WebSocket authentication
    const token = jwt.sign(
      {
        id: req.user._id,
        email: req.user.email,
        role: req.user.role,
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' } // Token expires in 1 hour
    );

    res.json({
      success: true,
      token,
      wsUrl: process.env.WS_URL || 'ws://localhost:5000/ws/dashboard',
      expiresIn: 3600, // seconds
    });
  } catch (error) {
    console.error('Error generating WebSocket token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate WebSocket token',
    });
  }
});

/**
 * @route   GET /api/analytics/dashboard/stats
 * @desc    Get WebSocket connection statistics
 * @access  Private (Admin only)
 */
router.get('/dashboard/stats', protect, authorize('full_access'), async (req, res) => {
  try {
    const stats = websocketService.getStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard stats',
    });
  }
});

/**
 * @route   POST /api/analytics/dashboard/broadcast
 * @desc    Manually broadcast a metric update (for testing or manual triggers)
 * @access  Private (Admin only)
 */
router.post('/dashboard/broadcast', protect, authorize('full_access'), async (req, res) => {
  try {
    const { metricType, targetUserId } = req.body;

    if (!metricType) {
      return res.status(400).json({
        success: false,
        error: 'metricType is required',
      });
    }

    // Get the metric data
    let metric = await DashboardMetrics.getValid(metricType, 'global');

    if (!metric) {
      // Calculate fresh data if no cache exists
      let data;
      if (metricType === 'overview') {
        data = await DashboardMetrics.calculateOverview();
      } else if (metricType === 'practitioner_utilization') {
        data = await DashboardMetrics.calculatePractitionerUtilization();
      } else if (metricType === 'system_health') {
        data = await DashboardMetrics.calculateSystemHealth();
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid metric type',
        });
      }

      metric = await DashboardMetrics.getOrCreate(metricType, 'global');
      await metric.refresh(data);
    }

    // Broadcast via WebSocket
    websocketService.broadcastMetricUpdate(metricType, metric.data, targetUserId);

    res.json({
      success: true,
      message: 'Metric update broadcasted',
      metricType,
      targetUserId: targetUserId || 'all',
    });
  } catch (error) {
    console.error('Error broadcasting metric:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to broadcast metric',
    });
  }
});

/**
 * @route   POST /api/analytics/dashboard/alert
 * @desc    Broadcast system alert to all connected clients
 * @access  Private (Admin only)
 */
router.post('/dashboard/alert', protect, authorize('full_access'), async (req, res) => {
  try {
    const { severity, title, message } = req.body;

    if (!severity || !title || !message) {
      return res.status(400).json({
        success: false,
        error: 'severity, title, and message are required',
      });
    }

    const alert = {
      severity, // 'info', 'warning', 'error', 'critical'
      title,
      message,
    };

    websocketService.broadcastAlert(alert);

    res.json({
      success: true,
      message: 'Alert broadcasted to all clients',
      alert,
    });
  } catch (error) {
    console.error('Error broadcasting alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to broadcast alert',
    });
  }
});

// ============================================
// EMAIL DIGEST ENDPOINTS
// ============================================

/**
 * @route   GET /api/analytics/digests
 * @desc    Get all email digests for user/organization
 * @access  Private (Admin/Full Access)
 */
router.get('/digests', protect, authorize('full_access', 'admin_billing'), async (req, res) => {
  try {
    const { status } = req.query;

    const query = {};
    if (status) query.status = status;
    if (req.user.organization) query.organization = req.user.organization;

    const digests = await EmailDigest.find(query)
      .populate('recipients.userId', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: digests.length,
      data: digests,
    });
  } catch (error) {
    console.error('Error fetching digests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch digests',
    });
  }
});

/**
 * @route   GET /api/analytics/digests/:id
 * @desc    Get specific email digest
 * @access  Private (Admin/Full Access)
 */
router.get('/digests/:id', protect, authorize('full_access', 'admin_billing'), async (req, res) => {
  try {
    const digest = await EmailDigest.findById(req.params.id)
      .populate('recipients.userId', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email');

    if (!digest) {
      return res.status(404).json({
        success: false,
        error: 'Digest not found',
      });
    }

    res.json({
      success: true,
      data: digest,
    });
  } catch (error) {
    console.error('Error fetching digest:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch digest',
    });
  }
});

/**
 * @route   POST /api/analytics/digests
 * @desc    Create new email digest
 * @access  Private (Admin only)
 */
router.post('/digests', protect, authorize('full_access'), async (req, res) => {
  try {
    const digestData = {
      ...req.body,
      createdBy: req.user._id,
      organization: req.user.organization,
    };

    const digest = await EmailDigest.create(digestData);

    res.json({
      success: true,
      message: 'Email digest created successfully',
      data: digest,
    });
  } catch (error) {
    console.error('Error creating digest:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create digest',
    });
  }
});

/**
 * @route   PUT /api/analytics/digests/:id
 * @desc    Update email digest
 * @access  Private (Admin only)
 */
router.put('/digests/:id', protect, authorize('full_access'), async (req, res) => {
  try {
    const digest = await EmailDigest.findById(req.params.id);

    if (!digest) {
      return res.status(404).json({
        success: false,
        error: 'Digest not found',
      });
    }

    // Update fields
    Object.assign(digest, req.body);

    // Recalculate next scheduled time if frequency changed
    if (req.body.frequency || req.body.schedule) {
      digest.calculateNextScheduled();
    }

    await digest.save();

    res.json({
      success: true,
      message: 'Digest updated successfully',
      data: digest,
    });
  } catch (error) {
    console.error('Error updating digest:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update digest',
    });
  }
});

/**
 * @route   DELETE /api/analytics/digests/:id
 * @desc    Delete email digest
 * @access  Private (Admin only)
 */
router.delete('/digests/:id', protect, authorize('full_access'), async (req, res) => {
  try {
    const digest = await EmailDigest.findByIdAndDelete(req.params.id);

    if (!digest) {
      return res.status(404).json({
        success: false,
        error: 'Digest not found',
      });
    }

    res.json({
      success: true,
      message: 'Digest deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting digest:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete digest',
    });
  }
});

/**
 * @route   POST /api/analytics/digests/:id/pause
 * @desc    Pause email digest
 * @access  Private (Admin/Full Access)
 */
router.post(
  '/digests/:id/pause',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const digest = await EmailDigest.findById(req.params.id);

      if (!digest) {
        return res.status(404).json({
          success: false,
          error: 'Digest not found',
        });
      }

      await digest.pause();

      res.json({
        success: true,
        message: 'Digest paused successfully',
        data: digest,
      });
    } catch (error) {
      console.error('Error pausing digest:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to pause digest',
      });
    }
  }
);

/**
 * @route   POST /api/analytics/digests/:id/resume
 * @desc    Resume email digest
 * @access  Private (Admin/Full Access)
 */
router.post(
  '/digests/:id/resume',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const digest = await EmailDigest.findById(req.params.id);

      if (!digest) {
        return res.status(404).json({
          success: false,
          error: 'Digest not found',
        });
      }

      await digest.resume();

      res.json({
        success: true,
        message: 'Digest resumed successfully',
        data: digest,
      });
    } catch (error) {
      console.error('Error resuming digest:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to resume digest',
      });
    }
  }
);

/**
 * @route   POST /api/analytics/digests/:id/send-now
 * @desc    Send digest immediately (test or manual send)
 * @access  Private (Admin only)
 */
router.post('/digests/:id/send-now', protect, authorize('full_access'), async (req, res) => {
  try {
    const digest = await EmailDigest.findById(req.params.id).populate(
      'recipients.userId',
      'firstName lastName email'
    );

    if (!digest) {
      return res.status(404).json({
        success: false,
        error: 'Digest not found',
      });
    }

    if (digest.recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No recipients configured for this digest',
      });
    }

    // Get date ranges
    const dateRange = digest.getDateRange();
    const comparisonRange = digest.getComparisonDateRange();

    // Calculate metrics
    const { metrics, comparisonMetrics } = await digestCalculationService.calculateMetrics(
      dateRange,
      comparisonRange,
      digest.includedSections,
      digest.filters
    );

    // Generate HTML email
    const emailHtml = emailTemplateService.generateExecutiveSummary(
      {
        dateRange,
        comparisonRange,
        metrics,
        comparisonMetrics,
        sections: digest.includedSections,
        branding: digest.branding,
      },
      { template: digest.template }
    );

    // Send emails (simplified - would use proper email service in production)
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
      port: process.env.SMTP_PORT || 2525,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const subject = digest.emailSubjectTemplate.replace(
      '{{date}}',
      `${dateRange.startDate.toLocaleDateString()} - ${dateRange.endDate.toLocaleDateString()}`
    );

    let successCount = 0;
    let failureCount = 0;

    for (const recipient of digest.recipients) {
      try {
        const email = recipient.email || recipient.userId?.email;
        if (!email) continue;

        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@expojane.com',
          to: email,
          subject,
          html: emailHtml,
        });

        successCount += 1;
      } catch (error) {
        console.error(`Failed to send to ${recipient.email}:`, error);
        failureCount += 1;
      }
    }

    // Record delivery
    await digest.recordDelivery({
      status: failureCount === 0 ? 'sent' : 'partial',
      successCount,
      failureCount,
      metrics,
    });

    res.json({
      success: true,
      message: `Digest sent to ${successCount} recipient(s)`,
      results: {
        successCount,
        failureCount,
        totalRecipients: digest.recipients.length,
      },
    });
  } catch (error) {
    console.error('Error sending digest:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send digest',
    });
  }
});

/**
 * @route   GET /api/analytics/digests/:id/preview
 * @desc    Preview digest email HTML
 * @access  Private (Admin/Full Access)
 */
router.get(
  '/digests/:id/preview',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const digest = await EmailDigest.findById(req.params.id);

      if (!digest) {
        return res.status(404).json({
          success: false,
          error: 'Digest not found',
        });
      }

      // Get date ranges
      const dateRange = digest.getDateRange();
      const comparisonRange = digest.getComparisonDateRange();

      // Calculate metrics
      const { metrics, comparisonMetrics } = await digestCalculationService.calculateMetrics(
        dateRange,
        comparisonRange,
        digest.includedSections,
        digest.filters
      );

      // Generate HTML
      const emailHtml = emailTemplateService.generateExecutiveSummary(
        {
          dateRange,
          comparisonRange,
          metrics,
          comparisonMetrics,
          sections: digest.includedSections,
          branding: digest.branding,
        },
        { template: digest.template }
      );

      // Return HTML
      res.set('Content-Type', 'text/html');
      res.send(emailHtml);
    } catch (error) {
      console.error('Error generating preview:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate preview',
      });
    }
  }
);

/**
 * @route   GET /api/analytics/digests/:id/history
 * @desc    Get delivery history for digest
 * @access  Private (Admin/Full Access)
 */
router.get(
  '/digests/:id/history',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { limit } = req.query;

      const digest = await EmailDigest.findById(req.params.id);

      if (!digest) {
        return res.status(404).json({
          success: false,
          error: 'Digest not found',
        });
      }

      const history = digest.deliveryHistory
        .sort((a, b) => b.sentAt - a.sentAt)
        .slice(0, parseInt(limit, 10) || 20);

      res.json({
        success: true,
        count: history.length,
        data: history,
        stats: digest.stats,
      });
    } catch (error) {
      console.error('Error fetching digest history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch digest history',
      });
    }
  }
);

/**
 * @route   GET /api/analytics/digests/stats/global
 * @desc    Get global digest statistics
 * @access  Private (Admin only)
 */
router.get('/digests/stats/global', protect, authorize('full_access'), async (req, res) => {
  try {
    const stats = await EmailDigest.getStats(req.user.organization);

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error fetching digest stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch digest stats',
    });
  }
});

/**
 * @route   POST /api/analytics/digests/:id/track-open
 * @desc    Track email open (tracking pixel endpoint)
 * @access  Public
 */
router.post('/digests/:id/track-open', async (req, res) => {
  try {
    const digest = await EmailDigest.findById(req.params.id);

    if (digest) {
      await digest.recordOpen();
    }

    // Return 1x1 transparent pixel
    res.set('Content-Type', 'image/gif');
    res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
  } catch (error) {
    console.error('Error tracking open:', error);
    res.status(200).send(); // Always return 200 for tracking pixels
  }
});

/**
 * @route   POST /api/analytics/digests/:id/track-click
 * @desc    Track email link click
 * @access  Public
 */
router.post('/digests/:id/track-click', async (req, res) => {
  try {
    const digest = await EmailDigest.findById(req.params.id);

    if (digest) {
      await digest.recordClick();
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking click:', error);
    res.status(200).json({ success: true }); // Always return success for tracking
  }
});

// ============================================
// PATIENT SURVEY ENDPOINTS
// ============================================

/**
 * @route   GET /api/analytics/surveys
 * @desc    Get all surveys
 * @access  Private (Admin/Full Access)
 */
router.get('/surveys', protect, authorize('full_access', 'admin_billing'), async (req, res) => {
  try {
    const { status, surveyType } = req.query;

    const query = {};
    if (status) query.status = status;
    if (surveyType) query.surveyType = surveyType;
    if (req.user.organization) query.organization = req.user.organization;

    const surveys = await PatientSurvey.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: surveys.length,
      data: surveys,
    });
  } catch (error) {
    console.error('Error fetching surveys:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch surveys',
    });
  }
});

/**
 * @route   GET /api/analytics/surveys/:id
 * @desc    Get specific survey
 * @access  Private (Admin/Full Access)
 */
router.get('/surveys/:id', protect, authorize('full_access', 'admin_billing'), async (req, res) => {
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
    console.error('Error fetching survey:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch survey',
    });
  }
});

/**
 * @route   POST /api/analytics/surveys
 * @desc    Create new survey
 * @access  Private (Admin only)
 */
router.post('/surveys', protect, authorize('full_access'), async (req, res) => {
  try {
    const surveyData = {
      ...req.body,
      createdBy: req.user._id,
      organization: req.user.organization,
    };

    const survey = await PatientSurvey.create(surveyData);

    res.json({
      success: true,
      message: 'Survey created successfully',
      data: survey,
    });
  } catch (error) {
    console.error('Error creating survey:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create survey',
    });
  }
});

/**
 * @route   GET /api/analytics/surveys/:id/analytics
 * @desc    Get comprehensive survey analytics
 * @access  Private (Admin/Full Access)
 */
router.get(
  '/surveys/:id/analytics',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      const dateRange = {};
      if (startDate) dateRange.startDate = new Date(startDate);
      if (endDate) dateRange.endDate = new Date(endDate);

      const analytics = await surveyAnalysisService.getComprehensiveAnalytics(
        req.params.id,
        dateRange
      );

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      console.error('Error fetching survey analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch survey analytics',
      });
    }
  }
);

/**
 * @route   GET /api/analytics/surveys/:id/responses
 * @desc    Get survey responses
 * @access  Private (Admin/Full Access)
 */
router.get(
  '/surveys/:id/responses',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { status, flagged, limit } = req.query;

      const query = { surveyId: req.params.id };
      if (status) query.status = status;
      if (flagged) query.flagged = flagged === 'true';

      const responses = await SurveyResponse.find(query)
        .populate('patientId', 'firstName lastName email')
        .populate('appointmentId')
        .sort({ completedAt: -1 })
        .limit(parseInt(limit, 10) || 50);

      res.json({
        success: true,
        count: responses.length,
        data: responses,
      });
    } catch (error) {
      console.error('Error fetching responses:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch responses',
      });
    }
  }
);

/**
 * @route   GET /api/analytics/surveys/:id/responses/followup
 * @desc    Get responses needing follow-up
 * @access  Private (Admin/Full Access)
 */
router.get(
  '/surveys/:id/responses/followup',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
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
        count: responses.length,
        data: responses,
      });
    } catch (error) {
      console.error('Error fetching follow-up responses:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch follow-up responses',
      });
    }
  }
);

/**
 * @route   POST /api/analytics/surveys/:id/publish
 * @desc    Publish survey
 * @access  Private (Admin only)
 */
router.post('/surveys/:id/publish', protect, authorize('full_access'), async (req, res) => {
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
      message: 'Survey published successfully',
      data: survey,
    });
  } catch (error) {
    console.error('Error publishing survey:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to publish survey',
    });
  }
});

/**
 * @route   POST /api/analytics/surveys/:surveyId/responses/:responseId/followup
 * @desc    Assign or complete follow-up
 * @access  Private (Admin/Full Access)
 */
router.post(
  '/surveys/:surveyId/responses/:responseId/followup',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { action, assignTo, notes } = req.body;

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
        message: `Follow-up ${action}ed successfully`,
        data: response,
      });
    } catch (error) {
      console.error('Error managing follow-up:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to manage follow-up',
      });
    }
  }
);

/**
 * @route   DELETE /api/analytics/surveys/:id
 * @desc    Delete survey
 * @access  Private (Admin only)
 */
router.delete('/surveys/:id', protect, authorize('full_access'), async (req, res) => {
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
    console.error('Error deleting survey:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete survey',
    });
  }
});

// ============================================
// NPS TRACKING ENDPOINTS
// ============================================

/**
 * @route   GET /api/analytics/nps/dashboard
 * @desc    Get comprehensive NPS dashboard
 * @access  Private (Admin/Full Access)
 */
router.get(
  '/nps/dashboard',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { startDate, endDate, practitionerId, serviceType } = req.query;

      const filters = { organization: req.user.organization };
      if (practitionerId) filters.practitionerId = practitionerId;
      if (serviceType) filters.serviceType = serviceType;

      const dateRange = {};
      if (startDate) dateRange.startDate = new Date(startDate);
      if (endDate) dateRange.endDate = new Date(endDate);

      const dashboard = await npsAnalysisService.getDashboard(filters, dateRange);

      res.json({
        success: true,
        data: dashboard,
      });
    } catch (error) {
      console.error('Error fetching NPS dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch NPS dashboard',
      });
    }
  }
);

/**
 * @route   GET /api/analytics/nps/overview
 * @desc    Get NPS overview with comparison
 * @access  Private (Admin/Full Access)
 */
router.get(
  '/nps/overview',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { startDate, endDate, practitionerId } = req.query;

      const filters = { organization: req.user.organization };
      if (practitionerId) filters.practitionerId = practitionerId;

      const dateRange = {};
      if (startDate) dateRange.startDate = new Date(startDate);
      if (endDate) dateRange.endDate = new Date(endDate);

      const overview = await npsAnalysisService.getOverview(filters, dateRange);

      res.json({
        success: true,
        data: overview,
      });
    } catch (error) {
      console.error('Error fetching NPS overview:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch NPS overview',
      });
    }
  }
);

/**
 * @route   GET /api/analytics/nps/trend
 * @desc    Get NPS trend over time
 * @access  Private (Admin/Full Access)
 */
router.get('/nps/trend', protect, authorize('full_access', 'admin_billing'), async (req, res) => {
  try {
    const { startDate, endDate, interval } = req.query;

    const filters = { organization: req.user.organization };
    const dateRange = {};
    if (startDate) dateRange.startDate = new Date(startDate);
    if (endDate) dateRange.endDate = new Date(endDate);

    const trend = await npsAnalysisService.getTrendAnalysis(filters, dateRange, interval || 'week');

    res.json({
      success: true,
      data: trend,
    });
  } catch (error) {
    console.error('Error fetching NPS trend:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch NPS trend',
    });
  }
});

/**
 * @route   GET /api/analytics/nps/detractors
 * @desc    Get detractor insights
 * @access  Private (Admin/Full Access)
 */
router.get(
  '/nps/detractors',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      const filters = { organization: req.user.organization };
      const dateRange = {};
      if (startDate) dateRange.startDate = new Date(startDate);
      if (endDate) dateRange.endDate = new Date(endDate);

      const insights = await npsAnalysisService.getDetractorInsights(filters, dateRange);

      res.json({
        success: true,
        data: insights,
      });
    } catch (error) {
      console.error('Error fetching detractor insights:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch detractor insights',
      });
    }
  }
);

/**
 * @route   GET /api/analytics/nps/promoters
 * @desc    Get promoter insights
 * @access  Private (Admin/Full Access)
 */
router.get(
  '/nps/promoters',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      const filters = { organization: req.user.organization };
      const dateRange = {};
      if (startDate) dateRange.startDate = new Date(startDate);
      if (endDate) dateRange.endDate = new Date(endDate);

      const insights = await npsAnalysisService.getPromoterInsights(filters, dateRange);

      res.json({
        success: true,
        data: insights,
      });
    } catch (error) {
      console.error('Error fetching promoter insights:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch promoter insights',
      });
    }
  }
);

/**
 * @route   GET /api/analytics/nps/followup
 * @desc    Get scores needing follow-up
 * @access  Private (Admin/Full Access)
 */
router.get(
  '/nps/followup',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const scores = await NPSScore.getNeedingFollowup(req.user.organization);

      res.json({
        success: true,
        count: scores.length,
        data: scores,
      });
    } catch (error) {
      console.error('Error fetching follow-up scores:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch follow-up scores',
      });
    }
  }
);

/**
 * @route   POST /api/analytics/nps/:id/followup
 * @desc    Assign or complete follow-up
 * @access  Private (Admin/Full Access)
 */
router.post(
  '/nps/:id/followup',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
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
        message: `Follow-up ${action}ed successfully`,
        data: score,
      });
    } catch (error) {
      console.error('Error managing follow-up:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to manage follow-up',
      });
    }
  }
);

/**
 * @route   POST /api/analytics/nps/:id/respond
 * @desc    Send response to patient
 * @access  Private (Admin/Full Access)
 */
router.post(
  '/nps/:id/respond',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { message } = req.body;

      const score = await NPSScore.findById(req.params.id);

      if (!score) {
        return res.status(404).json({
          success: false,
          error: 'NPS score not found',
        });
      }

      await score.sendResponse(req.user._id, message);

      res.json({
        success: true,
        message: 'Response sent to patient',
        data: score,
      });
    } catch (error) {
      console.error('Error sending response:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send response',
      });
    }
  }
);

/**
 * @route   GET /api/analytics/nps/breakdown/:dimension
 * @desc    Get NPS breakdown by dimension
 * @access  Private (Admin/Full Access)
 */
router.get(
  '/nps/breakdown/:dimension',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
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
      console.error('Error fetching NPS breakdown:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch NPS breakdown',
      });
    }
  }
);

/**
 * @route   POST /api/analytics/nps/score
 * @desc    Submit NPS score (for testing or manual entry)
 * @access  Private
 */
router.post('/nps/score', protect, async (req, res) => {
  try {
    const scoreData = {
      ...req.body,
      organization: req.user.organization,
    };

    const score = await NPSScore.create(scoreData);

    res.json({
      success: true,
      message: 'NPS score submitted successfully',
      data: score,
    });
  } catch (error) {
    console.error('Error submitting NPS score:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit NPS score',
    });
  }
});

// ============================================
// ONLINE REVIEW MONITORING ENDPOINTS
// ============================================

/**
 * @route   GET /api/analytics/reviews/dashboard
 * @desc    Get review monitoring dashboard
 * @access  Private (Admin/Full Access)
 */
router.get(
  '/reviews/dashboard',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      const dateRange = {};
      if (startDate) dateRange.startDate = new Date(startDate);
      if (endDate) dateRange.endDate = new Date(endDate);

      const dashboard = await reviewMonitoringService.getDashboard(
        req.user.organization,
        dateRange
      );

      res.json({
        success: true,
        data: dashboard,
      });
    } catch (error) {
      console.error('Error fetching review dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch review dashboard',
      });
    }
  }
);

/**
 * @route   GET /api/analytics/reviews
 * @desc    Get all reviews with filters
 * @access  Private (Admin/Full Access)
 */
router.get('/reviews', protect, authorize('full_access', 'admin_billing'), async (req, res) => {
  try {
    const { platform, rating, status, flagged, limit } = req.query;

    const query = { organization: req.user.organization };
    if (platform) query.platform = platform;
    if (rating) query.rating = parseInt(rating, 10);
    if (status) query.status = status;
    if (flagged) query.flagged = flagged === 'true';

    const reviews = await OnlineReview.find(query)
      .populate('patientId', 'firstName lastName email')
      .populate('practitionerId', 'firstName lastName')
      .populate('assignedTo', 'firstName lastName')
      .populate('response.postedBy', 'firstName lastName')
      .sort({ publishedAt: -1 })
      .limit(parseInt(limit, 10) || 50);

    res.json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reviews',
    });
  }
});

/**
 * @route   GET /api/analytics/reviews/:id
 * @desc    Get specific review
 * @access  Private (Admin/Full Access)
 */
router.get('/reviews/:id', protect, authorize('full_access', 'admin_billing'), async (req, res) => {
  try {
    const review = await OnlineReview.findById(req.params.id)
      .populate('patientId', 'firstName lastName email phone')
      .populate('practitionerId', 'firstName lastName')
      .populate('assignedTo', 'firstName lastName email')
      .populate('response.postedBy', 'firstName lastName')
      .populate('internalNotes.createdBy', 'firstName lastName');

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found',
      });
    }

    res.json({
      success: true,
      data: review,
    });
  } catch (error) {
    console.error('Error fetching review:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch review',
    });
  }
});

/**
 * @route   POST /api/analytics/reviews
 * @desc    Create review (manual entry)
 * @access  Private (Admin only)
 */
router.post('/reviews', protect, authorize('full_access'), async (req, res) => {
  try {
    const reviewData = {
      ...req.body,
      organization: req.user.organization,
      source: 'manual',
    };

    const review = await OnlineReview.create(reviewData);

    res.json({
      success: true,
      message: 'Review created successfully',
      data: review,
    });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create review',
    });
  }
});

/**
 * @route   POST /api/analytics/reviews/:id/response
 * @desc    Post response to review
 * @access  Private (Admin/Full Access)
 */
router.post(
  '/reviews/:id/response',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { responseText } = req.body;

      const review = await OnlineReview.findById(req.params.id);

      if (!review) {
        return res.status(404).json({
          success: false,
          error: 'Review not found',
        });
      }

      await review.postResponse(req.user._id, responseText);

      res.json({
        success: true,
        message: 'Response posted successfully',
        data: review,
      });
    } catch (error) {
      console.error('Error posting response:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to post response',
      });
    }
  }
);

/**
 * @route   POST /api/analytics/reviews/:id/assign
 * @desc    Assign review to user
 * @access  Private (Admin/Full Access)
 */
router.post(
  '/reviews/:id/assign',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { userId } = req.body;

      const review = await OnlineReview.findById(req.params.id);

      if (!review) {
        return res.status(404).json({
          success: false,
          error: 'Review not found',
        });
      }

      await review.assign(userId);

      res.json({
        success: true,
        message: 'Review assigned successfully',
        data: review,
      });
    } catch (error) {
      console.error('Error assigning review:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to assign review',
      });
    }
  }
);

/**
 * @route   POST /api/analytics/reviews/:id/note
 * @desc    Add internal note to review
 * @access  Private (Admin/Full Access)
 */
router.post(
  '/reviews/:id/note',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { note } = req.body;

      const review = await OnlineReview.findById(req.params.id);

      if (!review) {
        return res.status(404).json({
          success: false,
          error: 'Review not found',
        });
      }

      await review.addNote(req.user._id, note);

      res.json({
        success: true,
        message: 'Note added successfully',
        data: review,
      });
    } catch (error) {
      console.error('Error adding note:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add note',
      });
    }
  }
);

/**
 * @route   GET /api/analytics/reviews/:id/suggestion
 * @desc    Get AI-generated response suggestion
 * @access  Private (Admin/Full Access)
 */
router.get(
  '/reviews/:id/suggestion',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const review = await OnlineReview.findById(req.params.id);

      if (!review) {
        return res.status(404).json({
          success: false,
          error: 'Review not found',
        });
      }

      const suggestion = reviewMonitoringService.generateResponseSuggestion(review);

      res.json({
        success: true,
        suggestion,
      });
    } catch (error) {
      console.error('Error generating suggestion:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate suggestion',
      });
    }
  }
);

/**
 * @route   GET /api/analytics/reviews/stats/summary
 * @desc    Get review statistics summary
 * @access  Private (Admin/Full Access)
 */
router.get(
  '/reviews/stats/summary',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      const dateRange = {};
      if (startDate) dateRange.startDate = new Date(startDate);
      if (endDate) dateRange.endDate = new Date(endDate);

      const stats = await OnlineReview.getStats(req.user.organization, dateRange);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch stats',
      });
    }
  }
);

/**
 * @route   GET /api/analytics/reviews/needing-response
 * @desc    Get reviews needing response
 * @access  Private (Admin/Full Access)
 */
router.get(
  '/reviews/needing-response',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const reviews = await OnlineReview.getNeedingResponse(req.user.organization);

      res.json({
        success: true,
        count: reviews.length,
        data: reviews,
      });
    } catch (error) {
      console.error('Error fetching reviews needing response:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch reviews needing response',
      });
    }
  }
);

/**
 * @route   GET /api/analytics/reviews/alerts
 * @desc    Get review alerts
 * @access  Private (Admin/Full Access)
 */
router.get(
  '/reviews/alerts',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const alerts = await reviewMonitoringService.getAlerts(req.user.organization);

      res.json({
        success: true,
        data: alerts,
      });
    } catch (error) {
      console.error('Error fetching alerts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch alerts',
      });
    }
  }
);

/**
 * @route   PUT /api/analytics/reviews/:id/status
 * @desc    Update review status
 * @access  Private (Admin/Full Access)
 */
router.put(
  '/reviews/:id/status',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { status } = req.body;

      const review = await OnlineReview.findByIdAndUpdate(req.params.id, { status }, { new: true });

      if (!review) {
        return res.status(404).json({
          success: false,
          error: 'Review not found',
        });
      }

      res.json({
        success: true,
        message: 'Status updated successfully',
        data: review,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update status',
      });
    }
  }
);

// ============================================
// STAFF PRODUCTIVITY ENDPOINTS
// ============================================

/**
 * @route   GET /api/analytics/productivity/dashboard
 * @desc    Get staff productivity dashboard
 * @access  Private (Admin/Full Access)
 */
router.get(
  '/productivity/dashboard',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { periodType, startDate, endDate, role } = req.query;

      const filters = {};
      if (role) filters.role = role;

      const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
      const end = endDate ? new Date(endDate) : new Date();

      const [teamProductivity, leaderboard, alerts] = await Promise.all([
        StaffProductivity.getTeamProductivity(
          req.user.organization,
          start,
          end,
          periodType || 'monthly',
          filters
        ),
        StaffProductivity.getLeaderboard(req.user.organization, start, end, 'revenue'),
        StaffProductivity.find({
          organization: req.user.organization,
          periodStart: start,
          periodEnd: end,
          'alerts.0': { $exists: true },
        }).populate('staffId', 'firstName lastName'),
      ]);

      // Calculate team averages
      const teamAvg = {
        utilization: 0,
        satisfaction: 0,
        completionRate: 0,
        revenuePerHour: 0,
      };

      if (teamProductivity.length > 0) {
        teamAvg.utilization =
          teamProductivity.reduce((sum, p) => sum + (p.appointmentMetrics?.utilization || 0), 0) /
          teamProductivity.length;
        teamAvg.satisfaction =
          teamProductivity.reduce(
            (sum, p) => sum + (p.qualityMetrics?.avgPatientSatisfaction || 0),
            0
          ) / teamProductivity.length;
        teamAvg.completionRate =
          teamProductivity.reduce(
            (sum, p) => sum + (p.appointmentMetrics?.completionRate || 0),
            0
          ) / teamProductivity.length;
        teamAvg.revenuePerHour =
          teamProductivity.reduce((sum, p) => sum + (p.revenueMetrics?.revenuePerHour || 0), 0) /
          teamProductivity.length;
      }

      res.json({
        success: true,
        data: {
          teamProductivity: teamProductivity.slice(0, 20),
          leaderboard,
          alerts: alerts.slice(0, 10),
          teamAvg,
        },
      });
    } catch (error) {
      console.error('Error fetching productivity dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch productivity dashboard',
      });
    }
  }
);

/**
 * @route   GET /api/analytics/productivity/staff/:staffId
 * @desc    Get specific staff member productivity
 * @access  Private (Admin/Full Access or Own Data)
 */
router.get('/productivity/staff/:staffId', protect, async (req, res) => {
  try {
    // Check if user is viewing their own data or is admin
    if (
      req.params.staffId !== req.user._id.toString() &&
      !['full_access', 'admin_billing'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this data',
      });
    }

    const { periodType, limit } = req.query;

    const trends = await StaffProductivity.getTrends(req.params.staffId, parseInt(limit, 10) || 12);

    const current = trends[0] || null;

    res.json({
      success: true,
      data: {
        current,
        trends,
      },
    });
  } catch (error) {
    console.error('Error fetching staff productivity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch staff productivity',
    });
  }
});

/**
 * @route   POST /api/analytics/productivity/calculate
 * @desc    Calculate productivity for staff member
 * @access  Private (Admin only)
 */
router.post('/productivity/calculate', protect, authorize('full_access'), async (req, res) => {
  try {
    const { staffId, periodStart, periodEnd, periodType } = req.body;

    const productivity = await StaffProductivity.calculateForStaff(
      staffId,
      new Date(periodStart),
      new Date(periodEnd),
      periodType
    );

    await productivity.save();

    res.json({
      success: true,
      message: 'Productivity calculated successfully',
      data: productivity,
    });
  } catch (error) {
    console.error('Error calculating productivity:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate productivity',
    });
  }
});

/**
 * @route   GET /api/analytics/productivity/leaderboard
 * @desc    Get productivity leaderboard
 * @access  Private (Admin/Full Access)
 */
router.get(
  '/productivity/leaderboard',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { metric, startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
      const end = endDate ? new Date(endDate) : new Date();

      const leaderboard = await StaffProductivity.getLeaderboard(
        req.user.organization,
        start,
        end,
        metric || 'revenue'
      );

      res.json({
        success: true,
        data: leaderboard,
      });
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch leaderboard',
      });
    }
  }
);

/**
 * @route   POST /api/analytics/productivity/:id/review
 * @desc    Add manager review to productivity record
 * @access  Private (Admin/Full Access)
 */
router.post(
  '/productivity/:id/review',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { comments, rating } = req.body;

      const productivity = await StaffProductivity.findById(req.params.id);

      if (!productivity) {
        return res.status(404).json({
          success: false,
          error: 'Productivity record not found',
        });
      }

      await productivity.addReview(req.user._id, comments, rating);

      res.json({
        success: true,
        message: 'Review added successfully',
        data: productivity,
      });
    } catch (error) {
      console.error('Error adding review:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add review',
      });
    }
  }
);

/**
 * @route   GET /api/analytics/productivity/team/comparison
 * @desc    Get team productivity comparison
 * @access  Private (Admin/Full Access)
 */
router.get(
  '/productivity/team/comparison',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { startDate, endDate, periodType, metric } = req.query;

      const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
      const end = endDate ? new Date(endDate) : new Date();

      const teamData = await StaffProductivity.getTeamProductivity(
        req.user.organization,
        start,
        end,
        periodType || 'monthly'
      );

      // Group by role
      const byRole = {};
      teamData.forEach((p) => {
        if (!byRole[p.role]) {
          byRole[p.role] = {
            count: 0,
            totalRevenue: 0,
            totalAppointments: 0,
            avgUtilization: 0,
            avgSatisfaction: 0,
          };
        }

        byRole[p.role].count += 1;
        byRole[p.role].totalRevenue += p.revenueMetrics?.totalRevenue || 0;
        byRole[p.role].totalAppointments += p.appointmentMetrics?.completed || 0;
        byRole[p.role].avgUtilization += p.appointmentMetrics?.utilization || 0;
        byRole[p.role].avgSatisfaction += p.qualityMetrics?.avgPatientSatisfaction || 0;
      });

      // Calculate averages
      Object.keys(byRole).forEach((role) => {
        const data = byRole[role];
        data.avgUtilization = data.count > 0 ? data.avgUtilization / data.count : 0;
        data.avgSatisfaction = data.count > 0 ? data.avgSatisfaction / data.count : 0;
        data.avgRevenue = data.count > 0 ? data.totalRevenue / data.count : 0;
      });

      res.json({
        success: true,
        data: {
          byRole,
          individual: teamData,
        },
      });
    } catch (error) {
      console.error('Error fetching team comparison:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch team comparison',
      });
    }
  }
);

/**
 * @route   GET /api/analytics/productivity/alerts
 * @desc    Get productivity alerts
 * @access  Private (Admin/Full Access)
 */
router.get(
  '/productivity/alerts',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const productivity = await StaffProductivity.find({
        organization: req.user.organization,
        'alerts.0': { $exists: true },
      })
        .populate('staffId', 'firstName lastName email')
        .sort({ periodStart: -1 })
        .limit(50);

      res.json({
        success: true,
        count: productivity.length,
        data: productivity,
      });
    } catch (error) {
      console.error('Error fetching alerts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch alerts',
      });
    }
  }
);

module.exports = router;
