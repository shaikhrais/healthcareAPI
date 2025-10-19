const express = require('express');

const { protect, authorize } = require('../middleware/auth');
const Appointment = require('../models/Appointment');
const Payment = require('../models/Payment');
const Patient = require('../models/Patient');
const User = require('../models/User');

/**
 * @swagger
 * components:
 *   schemas:
 *     AppointmentReport:
 *       type: object
 *       properties:
 *         appointments:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *               serviceType:
 *                 type: string
 *               patient:
 *                 type: object
 *                 properties:
 *                   firstName:
 *                     type: string
 *                   lastName:
 *                     type: string
 *                   email:
 *                     type: string
 *               practitioner:
 *                 type: object
 *                 properties:
 *                   firstName:
 *                     type: string
 *                   lastName:
 *                     type: string
 *         statistics:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *               example: 150
 *             byStatus:
 *               type: object
 *               properties:
 *                 scheduled:
 *                   type: integer
 *                   example: 45
 *                 completed:
 *                   type: integer
 *                   example: 90
 *                 cancelled:
 *                   type: integer
 *                   example: 15
 *             byType:
 *               type: object
 *               example:
 *                 Physiotherapy: 75
 *                 Massage: 50
 *                 Consultation: 25
 *             totalRevenue:
 *               type: number
 *               example: 15750.00
 *     RevenueReport:
 *       type: object
 *       properties:
 *         totalRevenue:
 *           type: number
 *           example: 25000.00
 *         paymentsByMethod:
 *           type: object
 *           example:
 *             credit_card: 15000.00
 *             cash: 5000.00
 *             insurance: 5000.00
 *         revenueByService:
 *           type: object
 *           example:
 *             Physiotherapy: 12000.00
 *             Massage: 8000.00
 *             Consultation: 5000.00
 *         monthlyTrend:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               month:
 *                 type: string
 *                 example: "2024-01"
 *               revenue:
 *                 type: number
 *                 example: 8500.00
 */

/**
 * Reports Routes
 * Generate various reports for the clinic
 */

const router = express.Router();

/**
 * @swagger
 * /api/reports/appointments:
 *   get:
 *     tags: [Analytics]
 *     summary: Get appointments report
 *     description: Generate a comprehensive report of appointments with statistics and filtering options
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for the report period
 *         example: "2024-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for the report period
 *         example: "2024-01-31"
 *       - in: query
 *         name: practitionerId
 *         schema:
 *           type: string
 *         description: Filter by specific practitioner
 *       - in: query
 *         name: serviceType
 *         schema:
 *           type: string
 *         description: Filter by service type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, completed, cancelled, no-show]
 *         description: Filter by appointment status
 *     responses:
 *       200:
 *         description: Appointments report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/AppointmentReport'
 *                 period:
 *                   type: object
 *                   properties:
 *                     startDate:
 *                       type: string
 *                       format: date
 *                     endDate:
 *                       type: string
 *                       format: date
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to generate report
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/appointments',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      const filter = {};
      if (startDate && endDate) {
        filter.startTime = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      const appointments = await Appointment.find(filter)
        .populate('patient', 'firstName lastName email')
        .populate('practitioner', 'firstName lastName')
        .sort({ startTime: -1 });

      // Calculate statistics
      const stats = {
        total: appointments.length,
        byStatus: {},
        byType: {},
        totalRevenue: 0,
      };

      appointments.forEach((apt) => {
        // Count by status
        stats.byStatus[apt.status] = (stats.byStatus[apt.status] || 0) + 1;

        // Count by type
        stats.byType[apt.appointmentType] = (stats.byType[apt.appointmentType] || 0) + 1;
      });

      res.json({
        success: true,
        data: appointments,
        stats,
        period: {
          startDate: startDate || 'All time',
          endDate: endDate || 'All time',
        },
      });
    } catch (error) {
      console.error('Error generating appointments report:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/reports/revenue
 * @desc    Get revenue report
 * @access  Private (Admin/Billing)
 */
router.get('/revenue', protect, authorize('full_access', 'admin_billing'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = { status: 'completed' };
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const payments = await Payment.find(filter)
      .populate('patientId', 'firstName lastName email')
      .sort({ createdAt: -1 });

    // Calculate statistics
    const stats = {
      totalPayments: payments.length,
      totalRevenue: 0,
      byMethod: {},
      averagePayment: 0,
    };

    payments.forEach((payment) => {
      stats.totalRevenue += payment.amount || 0;
      stats.byMethod[payment.paymentMethod] =
        (stats.byMethod[payment.paymentMethod] || 0) + payment.amount;
    });

    stats.averagePayment = payments.length > 0 ? stats.totalRevenue / payments.length : 0;

    res.json({
      success: true,
      data: payments,
      stats,
      period: {
        startDate: startDate || 'All time',
        endDate: endDate || 'All time',
      },
    });
  } catch (error) {
    console.error('Error generating revenue report:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/reports/practitioners
 * @desc    Get practitioners performance report
 * @access  Private (Admin)
 */
router.get('/practitioners', protect, authorize('full_access'), async (req, res) => {
  try {
    const practitioners = await User.find({
      role: { $in: ['practitioner_limited', 'practitioner_frontdesk', 'full_access'] },
      active: true,
    }).select('-password');

    const practitionerStats = await Promise.all(
      practitioners.map(async (practitioner) => {
        // Count appointments
        const totalAppointments = await Appointment.countDocuments({
          practitioner: practitioner._id,
        });

        const completedAppointments = await Appointment.countDocuments({
          practitioner: practitioner._id,
          status: 'completed',
        });

        const upcomingAppointments = await Appointment.countDocuments({
          practitioner: practitioner._id,
          status: { $in: ['scheduled', 'confirmed'] },
          startTime: { $gte: new Date() },
        });

        return {
          practitioner: {
            id: practitioner._id,
            name: `${practitioner.firstName} ${practitioner.lastName}`,
            email: practitioner.email,
            role: practitioner.role,
            services: practitioner.services,
          },
          appointments: {
            total: totalAppointments,
            completed: completedAppointments,
            upcoming: upcomingAppointments,
            completionRate:
              totalAppointments > 0
                ? ((completedAppointments / totalAppointments) * 100).toFixed(2) + '%'
                : '0%',
          },
        };
      })
    );

    res.json({
      success: true,
      data: practitionerStats,
      totalPractitioners: practitioners.length,
    });
  } catch (error) {
    console.error('Error generating practitioners report:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/reports/patients
 * @desc    Get patients report
 * @access  Private (Admin/Billing)
 */
router.get('/patients', protect, authorize('full_access', 'admin_billing'), async (req, res) => {
  try {
    const totalPatients = await Patient.countDocuments({ active: true });
    const newPatientsThisMonth = await Patient.countDocuments({
      active: true,
      createdAt: { $gte: new Date(new Date().setDate(1)) }, // First day of current month
    });

    const patients = await Patient.find({ active: true })
      .select('firstName lastName email phone createdAt')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      stats: {
        total: totalPatients,
        newThisMonth: newPatientsThisMonth,
      },
      data: patients,
    });
  } catch (error) {
    console.error('Error generating patients report:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
