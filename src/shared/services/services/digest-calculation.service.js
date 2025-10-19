
const Appointment = require('../models/Appointment');
const Payment = require('../models/Payment');
const Patient = require('../models/Patient');
const User = require('../models/User');
const ChurnPrediction = require('../models/ChurnPrediction');
const Anomaly = require('../models/Anomaly');
/**
 * Digest Calculation Service
 *
 * Aggregates metrics from various sources for executive summaries
 * Features:
 * - Multi-source data aggregation
 * - Comparison calculations
 * - Trend analysis
 * - Action item generation
 */

class DigestCalculationService {
  /**
   * Calculate all metrics for digest
   */
  async calculateMetrics(dateRange, comparisonRange, sections, filters = {}) {
    const metrics = {};
    const comparisonMetrics = comparisonRange ? {} : null;

    // Calculate each section in parallel
    const promises = [];

    if (sections.includes('overview')) {
      promises.push(
        this.calculateOverview(dateRange, filters).then((data) => {
          metrics.overview = data;
        }),
        comparisonRange
          ? this.calculateOverview(comparisonRange, filters).then((data) => {
              comparisonMetrics.overview = data;
            })
          : Promise.resolve()
      );
    }

    if (sections.includes('revenue')) {
      promises.push(
        this.calculateRevenue(dateRange, filters).then((data) => {
          metrics.revenue = data;
        }),
        comparisonRange
          ? this.calculateRevenue(comparisonRange, filters).then((data) => {
              comparisonMetrics.revenue = data;
            })
          : Promise.resolve()
      );
    }

    if (sections.includes('appointments')) {
      promises.push(
        this.calculateAppointments(dateRange, filters).then((data) => {
          metrics.appointments = data;
        }),
        comparisonRange
          ? this.calculateAppointments(comparisonRange, filters).then((data) => {
              comparisonMetrics.appointments = data;
            })
          : Promise.resolve()
      );
    }

    if (sections.includes('practitioners')) {
      promises.push(
        this.calculatePractitioners(dateRange, filters).then((data) => {
          metrics.practitioners = data;
        })
      );
    }

    if (sections.includes('patients')) {
      promises.push(
        this.calculatePatients(dateRange, filters).then((data) => {
          metrics.patients = data;
        }),
        comparisonRange
          ? this.calculatePatients(comparisonRange, filters).then((data) => {
              comparisonMetrics.patients = data;
            })
          : Promise.resolve()
      );
    }

    if (sections.includes('services')) {
      promises.push(
        this.calculateServices(dateRange, filters).then((data) => {
          metrics.services = data;
        })
      );
    }

    if (sections.includes('churn_risk')) {
      promises.push(
        this.calculateChurnRisk(filters).then((data) => {
          metrics.churnRisk = data;
        })
      );
    }

    if (sections.includes('anomalies')) {
      promises.push(
        this.calculateAnomalies(dateRange, filters).then((data) => {
          metrics.anomalies = data;
        })
      );
    }

    if (sections.includes('trends')) {
      promises.push(
        this.calculateTrends(dateRange, comparisonRange, filters).then((data) => {
          metrics.trends = data;
        })
      );
    }

    if (sections.includes('top_performers')) {
      promises.push(
        this.calculateTopPerformers(dateRange, filters).then((data) => {
          metrics.topPerformers = data;
        })
      );
    }

    if (sections.includes('action_items')) {
      promises.push(
        this.generateActionItems(dateRange, filters).then((data) => {
          metrics.actionItems = data;
        })
      );
    }

    await Promise.all(promises);

    return { metrics, comparisonMetrics };
  }

  /**
   * Calculate overview metrics
   */
  async calculateOverview(dateRange, filters) {
    const { startDate, endDate } = dateRange;

    // Build match query
    const matchQuery = {
      startTime: { $gte: startDate, $lte: endDate },
    };

    if (filters.practitionerId) {
      matchQuery.practitioner = filters.practitionerId;
    }
    if (filters.locationId) {
      matchQuery.location = filters.locationId;
    }

    // Total appointments
    const totalAppointments = await Appointment.countDocuments(matchQuery);

    // Revenue
    const revenueResult = await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'completed',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    const revenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    // New patients
    const newPatients = await Patient.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
    });

    // Average revenue per appointment
    const avgRevenuePerAppointment = totalAppointments > 0 ? revenue / totalAppointments : 0;

    return {
      revenue,
      appointments: totalAppointments,
      newPatients,
      avgRevenuePerAppointment,
    };
  }

  /**
   * Calculate revenue metrics
   */
  async calculateRevenue(dateRange, filters) {
    const { startDate, endDate } = dateRange;

    // Total revenue
    const revenueAgg = await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$status',
          amount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    let total = 0;
    let collected = 0;
    let outstanding = 0;

    revenueAgg.forEach((item) => {
      if (item._id === 'completed') {
        collected = item.amount;
      } else if (item._id === 'pending') {
        outstanding = item.amount;
      }
      total += item.amount;
    });

    // Revenue by payment method
    const byPaymentMethod = await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'completed',
        },
      },
      {
        $group: {
          _id: '$paymentMethod',
          amount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { amount: -1 },
      },
    ]);

    const formattedPaymentMethods = byPaymentMethod.map((pm) => ({
      method: this.formatPaymentMethod(pm._id),
      amount: pm.amount,
      count: pm.count,
      percentage: (pm.amount / collected) * 100,
    }));

    const avgTransaction =
      collected > 0 ? collected / revenueAgg.reduce((sum, item) => sum + item.count, 0) : 0;

    return {
      total,
      collected,
      outstanding,
      avgTransaction,
      byPaymentMethod: formattedPaymentMethods,
    };
  }

  /**
   * Calculate appointment metrics
   */
  async calculateAppointments(dateRange, filters) {
    const { startDate, endDate } = dateRange;

    const matchQuery = {
      startTime: { $gte: startDate, $lte: endDate },
    };

    if (filters.practitionerId) {
      matchQuery.practitioner = filters.practitionerId;
    }

    // Appointments by status
    const byStatus = await Appointment.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const total = byStatus.reduce((sum, item) => sum + item.count, 0);
    let completed = 0;
    let cancelled = 0;
    let noShow = 0;

    byStatus.forEach((item) => {
      if (item._id === 'completed') completed = item.count;
      if (item._id === 'cancelled') cancelled = item.count;
      if (item._id === 'no_show') noShow = item.count;
    });

    const noShowRate = total > 0 ? (noShow / total) * 100 : 0;

    const formattedByStatus = byStatus.map((item) => ({
      status: this.formatStatus(item._id),
      count: item.count,
      percentage: (item.count / total) * 100,
    }));

    return {
      total,
      completed,
      cancelled,
      noShow,
      noShowRate,
      byStatus: formattedByStatus,
    };
  }

  /**
   * Calculate practitioner metrics
   */
  async calculatePractitioners(dateRange, filters) {
    const { startDate, endDate } = dateRange;

    const matchQuery = {
      startTime: { $gte: startDate, $lte: endDate },
      status: 'completed',
    };

    if (filters.practitionerId) {
      matchQuery.practitioner = filters.practitionerId;
    }

    const practitioners = await Appointment.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: 'users',
          localField: 'practitioner',
          foreignField: '_id',
          as: 'practitionerDetails',
        },
      },
      { $unwind: '$practitionerDetails' },
      {
        $lookup: {
          from: 'payments',
          let: { appointmentId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$appointmentId', '$$appointmentId'] },
                status: 'completed',
              },
            },
          ],
          as: 'payments',
        },
      },
      {
        $group: {
          _id: '$practitioner',
          name: {
            $first: {
              $concat: ['$practitionerDetails.firstName', ' ', '$practitionerDetails.lastName'],
            },
          },
          appointments: { $sum: 1 },
          totalMinutes: { $sum: '$duration' },
          revenue: { $sum: { $sum: '$payments.amount' } },
        },
      },
      {
        $addFields: {
          utilization: {
            $multiply: [
              {
                $divide: [
                  '$totalMinutes',
                  {
                    $multiply: [{ $divide: [{ $subtract: [endDate, startDate] }, 86400000] }, 480],
                  },
                ],
              },
              100,
            ],
          },
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    return {
      list: practitioners,
      count: practitioners.length,
    };
  }

  /**
   * Calculate patient metrics
   */
  async calculatePatients(dateRange, filters) {
    const { startDate, endDate } = dateRange;

    // Active patients (had appointment in period)
    const activePatients = await Appointment.distinct('patient', {
      startTime: { $gte: startDate, $lte: endDate },
      status: 'completed',
    });

    // New patients
    const newPatients = await Patient.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
    });

    // Returning patients (had previous appointment before this period)
    const returningPatients = await Appointment.aggregate([
      {
        $match: {
          startTime: { $gte: startDate, $lte: endDate },
          status: 'completed',
        },
      },
      {
        $lookup: {
          from: 'appointments',
          let: { patientId: '$patient' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$patient', '$$patientId'] },
                startTime: { $lt: startDate },
                status: 'completed',
              },
            },
          ],
          as: 'previousAppointments',
        },
      },
      {
        $match: {
          'previousAppointments.0': { $exists: true },
        },
      },
      {
        $group: {
          _id: '$patient',
        },
      },
    ]);

    const returningCount = returningPatients.length;
    const returningRate =
      activePatients.length > 0 ? (returningCount / activePatients.length) * 100 : 0;

    // Average visits per patient
    const totalAppointments = await Appointment.countDocuments({
      startTime: { $gte: startDate, $lte: endDate },
      status: 'completed',
    });

    const avgVisits = activePatients.length > 0 ? totalAppointments / activePatients.length : 0;

    return {
      active: activePatients.length,
      new: newPatients,
      returning: returningCount,
      returningRate,
      avgVisits,
    };
  }

  /**
   * Calculate service metrics
   */
  async calculateServices(dateRange, filters) {
    const { startDate, endDate } = dateRange;

    const matchQuery = {
      startTime: { $gte: startDate, $lte: endDate },
      status: 'completed',
    };

    if (filters.serviceTypes && filters.serviceTypes.length > 0) {
      matchQuery.serviceType = { $in: filters.serviceTypes };
    }

    const services = await Appointment.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: 'payments',
          let: { appointmentId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$appointmentId', '$$appointmentId'] },
                status: 'completed',
              },
            },
          ],
          as: 'payments',
        },
      },
      {
        $group: {
          _id: '$serviceType',
          appointments: { $sum: 1 },
          revenue: { $sum: { $sum: '$payments.amount' } },
        },
      },
      {
        $addFields: {
          name: '$_id',
          avgRevenue: { $divide: ['$revenue', '$appointments'] },
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    return {
      list: services,
      count: services.length,
    };
  }

  /**
   * Calculate churn risk metrics
   */
  async calculateChurnRisk(filters) {
    const matchQuery = {
      'churnRisk.level': { $in: ['Critical', 'High'] },
    };

    if (filters.practitionerId) {
      matchQuery['engagementFeatures.primaryPractitioner'] = filters.practitionerId;
    }

    const atRiskPatients = await ChurnPrediction.find(matchQuery)
      .populate('patientId', 'firstName lastName email')
      .sort({ 'churnRisk.score': -1 })
      .limit(20);

    const criticalCount = atRiskPatients.filter((p) => p.churnRisk.level === 'Critical').length;
    const highCount = atRiskPatients.filter((p) => p.churnRisk.level === 'High').length;

    const formattedPatients = atRiskPatients.map((p) => ({
      name: p.patientId ? `${p.patientId.firstName} ${p.patientId.lastName}` : 'Unknown',
      riskLevel: p.churnRisk.level,
      riskScore: p.churnRisk.score,
      lastVisit: p.engagementFeatures.lastAppointmentDate,
      recommendedAction: p.retentionStrategy.actions[0]?.description || 'Contact patient',
    }));

    return {
      criticalCount,
      highCount,
      totalAtRisk: atRiskPatients.length,
      patients: formattedPatients,
    };
  }

  /**
   * Calculate anomalies
   */
  async calculateAnomalies(dateRange, filters) {
    const { startDate, endDate } = dateRange;

    const anomalies = await Anomaly.find({
      detectedAt: { $gte: startDate, $lte: endDate },
      investigationStatus: { $in: ['New', 'Acknowledged', 'Investigating'] },
    })
      .sort({ severity: -1, detectedAt: -1 })
      .limit(10);

    const formattedAnomalies = anomalies.map((a) => ({
      title: a.metricName,
      description: `${a.anomalyType}: Current value ${a.currentValue} vs expected ${a.expectedValue}`,
      severity: a.severity,
      detectedAt: a.detectedAt,
      recommendation: a.recommendations[0] || 'Investigate immediately',
    }));

    return {
      list: formattedAnomalies,
      count: anomalies.length,
      criticalCount: anomalies.filter((a) => a.severity === 'Critical').length,
    };
  }

  /**
   * Calculate trends
   */
  async calculateTrends(dateRange, comparisonRange, filters) {
    if (!comparisonRange) return null;

    // Get current and comparison metrics
    const [currentOverview, comparisonOverview] = await Promise.all([
      this.calculateOverview(dateRange, filters),
      this.calculateOverview(comparisonRange, filters),
    ]);

    const calculateTrend = (current, previous) => {
      if (previous === 0) return { direction: 'neutral', change: 0 };
      const change = ((current - previous) / previous) * 100;
      return {
        direction: change > 5 ? 'up' : change < -5 ? 'down' : 'neutral',
        change: Math.abs(change),
      };
    };

    return {
      revenue: calculateTrend(currentOverview.revenue, comparisonOverview.revenue),
      appointments: calculateTrend(currentOverview.appointments, comparisonOverview.appointments),
      newPatients: calculateTrend(currentOverview.newPatients, comparisonOverview.newPatients),
    };
  }

  /**
   * Calculate top performers
   */
  async calculateTopPerformers(dateRange, filters) {
    const practitionersData = await this.calculatePractitioners(dateRange, filters);
    const servicesData = await this.calculateServices(dateRange, filters);

    return {
      practitioners: practitionersData.list.slice(0, 5),
      services: servicesData.list.slice(0, 5),
    };
  }

  /**
   * Generate action items based on metrics
   */
  async generateActionItems(dateRange, filters) {
    const actionItems = [];

    // Check for high no-show rate
    const appointments = await this.calculateAppointments(dateRange, filters);
    if (appointments.noShowRate > 10) {
      actionItems.push({
        title: 'High No-Show Rate Detected',
        description: `No-show rate is ${appointments.noShowRate.toFixed(1)}%. Consider implementing reminder system or deposit policy.`,
        priority: 'High',
      });
    }

    // Check for low practitioner utilization
    const practitioners = await this.calculatePractitioners(dateRange, filters);
    const lowUtilization = practitioners.list.filter((p) => p.utilization < 50);
    if (lowUtilization.length > 0) {
      actionItems.push({
        title: 'Low Practitioner Utilization',
        description: `${lowUtilization.length} practitioner(s) have utilization below 50%. Review scheduling and availability.`,
        priority: 'Medium',
      });
    }

    // Check for outstanding payments
    const revenue = await this.calculateRevenue(dateRange, filters);
    if (revenue.outstanding > revenue.collected * 0.2) {
      actionItems.push({
        title: 'High Outstanding Payments',
        description: `$${revenue.outstanding.toFixed(2)} in outstanding payments. Follow up with patients on overdue accounts.`,
        priority: 'High',
      });
    }

    // Check for churn risk
    try {
      const churnRisk = await this.calculateChurnRisk(filters);
      if (churnRisk.criticalCount > 0) {
        actionItems.push({
          title: 'Patients at Critical Churn Risk',
          description: `${churnRisk.criticalCount} patient(s) at critical risk of churning. Immediate outreach recommended.`,
          priority: 'High',
        });
      }
    } catch (error) {
      // ChurnPrediction may not exist yet
    }

    // If no issues, add positive reinforcement
    if (actionItems.length === 0) {
      actionItems.push({
        title: 'All Metrics Performing Well',
        description:
          'No critical action items detected. Continue current operations and monitor trends.',
        priority: 'Low',
      });
    }

    return actionItems;
  }

  // ==================== UTILITY METHODS ====================

  formatPaymentMethod(method) {
    const map = {
      credit_card: 'Credit Card',
      debit_card: 'Debit Card',
      cash: 'Cash',
      check: 'Check',
      insurance: 'Insurance',
      other: 'Other',
    };
    return map[method] || method;
  }

  formatStatus(status) {
    const map = {
      scheduled: 'Scheduled',
      completed: 'Completed',
      cancelled: 'Cancelled',
      no_show: 'No Show',
      in_progress: 'In Progress',
    };
    return map[status] || status;
  }
}

module.exports = new DigestCalculationService();
