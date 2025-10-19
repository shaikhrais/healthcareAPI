
const PriorAuthorization = require('../models/PriorAuthorization');
const { priorAuthService } = require('./priorAuthService');
const { logger } = require('../utils/logger');
/**
 * Authorization Monitoring Service
 *
 * Monitors prior authorizations for expiration, utilization thresholds, and follow-ups
 */

/**
 * Authorization Monitoring Service
 */
class AuthMonitoringService {
  constructor() {
    this.monitoringIntervals = {
      expiration: null,
      utilization: null,
      followUp: null,
    };
  }

  /**
   * Start all monitoring tasks
   */
  startMonitoring() {
    logger.info('Starting authorization monitoring service');

    // Check for expiring authorizations every 6 hours
    this.monitoringIntervals.expiration = setInterval(
      () => this.checkExpiringAuthorizations(),
      6 * 60 * 60 * 1000
    );

    // Check for high utilization every 12 hours
    this.monitoringIntervals.utilization = setInterval(
      () => this.checkUtilizationThresholds(),
      12 * 60 * 60 * 1000
    );

    // Check for follow-ups daily
    this.monitoringIntervals.followUp = setInterval(
      () => this.checkFollowUpsDue(),
      24 * 60 * 60 * 1000
    );

    // Run initial checks
    this.checkExpiringAuthorizations();
    this.checkUtilizationThresholds();
    this.checkFollowUpsDue();

    logger.info('Authorization monitoring service started');
  }

  /**
   * Stop all monitoring tasks
   */
  stopMonitoring() {
    logger.info('Stopping authorization monitoring service');

    Object.values(this.monitoringIntervals).forEach((interval) => {
      if (interval) clearInterval(interval);
    });

    logger.info('Authorization monitoring service stopped');
  }

  /**
   * Check for authorizations expiring soon
   */
  async checkExpiringAuthorizations() {
    try {
      logger.info('Checking for expiring authorizations');

      // Check multiple thresholds
      const thresholds = [7, 14, 30];
      let totalAlerts = 0;

      for (const threshold of thresholds) {
        const expiring = await priorAuthService.checkExpiringAuthorizations(threshold);

        if (expiring.length > 0) {
          logger.info(`Found ${expiring.length} authorizations expiring within ${threshold} days`, {
            threshold,
            count: expiring.length,
            authNumbers: expiring.map((a) => a.authorizationNumber).slice(0, 10),
          });
          totalAlerts += expiring.length;
        }
      }

      // Update expired authorizations
      const expired = await priorAuthService.updateExpiredAuthorizations();

      logger.info('Expiring authorizations check complete', {
        totalAlerts,
        expired: expired.count,
      });

      return {
        totalAlerts,
        expired: expired.count,
      };
    } catch (error) {
      logger.error('Failed to check expiring authorizations', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Check for authorizations near utilization limits
   */
  async checkUtilizationThresholds() {
    try {
      logger.info('Checking authorization utilization thresholds');

      // Find active authorizations
      const activeAuthorizations = await PriorAuthorization.find({
        status: { $in: ['approved', 'partial_approval'] },
        'decision.expirationDate': { $gte: new Date() },
      });

      let alertsCreated = 0;

      for (const auth of activeAuthorizations) {
        let authUpdated = false;

        // Check each authorized service
        if (auth.decision.authorizedServices && auth.decision.authorizedServices.length > 0) {
          for (const service of auth.decision.authorizedServices) {
            if (!service.quantity || service.quantity === 0) continue;

            const utilizationPercent = (service.quantityUsed / service.quantity) * 100;

            // 90% threshold - critical alert
            if (utilizationPercent >= 90 && utilizationPercent < 100) {
              const existingCriticalAlert = auth.alerts.find(
                (a) =>
                  a.type === 'utilization_threshold' && a.severity === 'critical' && !a.acknowledged
              );

              if (!existingCriticalAlert) {
                auth.addAlert(
                  'utilization_threshold',
                  `Service ${service.procedureCode} at ${Math.round(utilizationPercent)}% utilization`,
                  'critical'
                );
                authUpdated = true;
                alertsCreated += 1;
              }
            }
            // 80% threshold - warning alert
            else if (utilizationPercent >= 80 && utilizationPercent < 90) {
              const existingWarningAlert = auth.alerts.find(
                (a) =>
                  a.type === 'utilization_threshold' && a.severity === 'warning' && !a.acknowledged
              );

              if (!existingWarningAlert) {
                auth.addAlert(
                  'utilization_threshold',
                  `Service ${service.procedureCode} at ${Math.round(utilizationPercent)}% utilization`,
                  'warning'
                );
                authUpdated = true;
                alertsCreated += 1;
              }
            }
            // 100% threshold - fully utilized
            else if (utilizationPercent >= 100) {
              const existingFullAlert = auth.alerts.find(
                (a) =>
                  a.type === 'utilization_threshold' &&
                  a.message.includes('fully utilized') &&
                  !a.acknowledged
              );

              if (!existingFullAlert) {
                auth.addAlert(
                  'utilization_threshold',
                  `Service ${service.procedureCode} is fully utilized`,
                  'critical'
                );
                authUpdated = true;
                alertsCreated += 1;
              }
            }
          }
        }

        if (authUpdated) {
          await auth.save();
        }
      }

      logger.info('Utilization threshold check complete', {
        checked: activeAuthorizations.length,
        alertsCreated,
      });

      return {
        checked: activeAuthorizations.length,
        alertsCreated,
      };
    } catch (error) {
      logger.error('Failed to check utilization thresholds', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Check for authorizations requiring follow-up
   */
  async checkFollowUpsDue() {
    try {
      logger.info('Checking for follow-ups due');

      const now = new Date();

      // Find authorizations with follow-up dates in the past
      const followUps = await PriorAuthorization.find({
        status: { $in: ['submitted', 'in_review'] },
        'submission.followUpDate': { $lte: now },
      });

      let alertsCreated = 0;

      for (const auth of followUps) {
        const daysOverdue = Math.ceil((now - auth.submission.followUpDate) / (1000 * 60 * 60 * 24));

        const existingAlert = auth.alerts.find(
          (a) => a.type === 'follow_up_needed' && !a.acknowledged
        );

        if (!existingAlert) {
          auth.addAlert(
            'follow_up_needed',
            `Follow-up overdue by ${daysOverdue} days`,
            daysOverdue > 3 ? 'critical' : 'warning'
          );
          await auth.save();
          alertsCreated += 1;
        }
      }

      logger.info('Follow-up check complete', {
        followUpsDue: followUps.length,
        alertsCreated,
      });

      return {
        followUpsDue: followUps.length,
        alertsCreated,
      };
    } catch (error) {
      logger.error('Failed to check follow-ups', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get monitoring status
   */
  getMonitoringStatus() {
    return {
      active: Object.values(this.monitoringIntervals).every((interval) => interval !== null),
      intervals: {
        expiration: this.monitoringIntervals.expiration !== null,
        utilization: this.monitoringIntervals.utilization !== null,
        followUp: this.monitoringIntervals.followUp !== null,
      },
    };
  }

  /**
   * Run all checks manually
   */
  async runAllChecks() {
    try {
      logger.info('Running all authorization checks manually');

      const [expiration, utilization, followUp] = await Promise.all([
        this.checkExpiringAuthorizations(),
        this.checkUtilizationThresholds(),
        this.checkFollowUpsDue(),
      ]);

      const results = {
        timestamp: new Date(),
        expiration,
        utilization,
        followUp,
        totalAlerts:
          (expiration.totalAlerts || 0) +
          (utilization.alertsCreated || 0) +
          (followUp.alertsCreated || 0),
      };

      logger.info('All authorization checks complete', results);

      return results;
    } catch (error) {
      logger.error('Failed to run all checks', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get alert summary
   */
  async getAlertSummary() {
    try {
      const [totalWithAlerts, criticalAlerts, warningAlerts, unacknowledgedAlerts] =
        await Promise.all([
          PriorAuthorization.countDocuments({
            'alerts.0': { $exists: true },
          }),
          PriorAuthorization.countDocuments({
            alerts: {
              $elemMatch: {
                severity: 'critical',
                acknowledged: false,
              },
            },
          }),
          PriorAuthorization.countDocuments({
            alerts: {
              $elemMatch: {
                severity: 'warning',
                acknowledged: false,
              },
            },
          }),
          PriorAuthorization.countDocuments({
            alerts: {
              $elemMatch: {
                acknowledged: false,
              },
            },
          }),
        ]);

      // Get breakdown by alert type
      const alertsByType = await PriorAuthorization.aggregate([
        { $unwind: '$alerts' },
        { $match: { 'alerts.acknowledged': false } },
        {
          $group: {
            _id: '$alerts.type',
            count: { $sum: 1 },
          },
        },
      ]);

      return {
        totalWithAlerts,
        unacknowledgedAlerts,
        bySeversity: {
          critical: criticalAlerts,
          warning: warningAlerts,
        },
        byType: alertsByType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
      };
    } catch (error) {
      logger.error('Failed to get alert summary', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Acknowledge all alerts for an authorization
   */
  async acknowledgeAllAlerts(authorizationId, userId) {
    try {
      const authorization = await PriorAuthorization.findById(authorizationId);

      if (!authorization) {
        throw new Error('Authorization not found');
      }

      let acknowledgedCount = 0;

      authorization.alerts.forEach((alert) => {
        if (!alert.acknowledged) {
          alert.acknowledged = true;
          alert.acknowledgedBy = userId;
          alert.acknowledgedAt = new Date();
          acknowledgedCount += 1;
        }
      });

      await authorization.save();

      logger.info('All alerts acknowledged', {
        authorizationId,
        authorizationNumber: authorization.authorizationNumber,
        acknowledgedCount,
        userId,
      });

      return {
        acknowledgedCount,
        authorization,
      };
    } catch (error) {
      logger.error('Failed to acknowledge all alerts', {
        error: error.message,
        authorizationId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Clear old acknowledged alerts
   */
  async clearOldAlerts(daysOld = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const authorizations = await PriorAuthorization.find({
        'alerts.0': { $exists: true },
      });

      let clearedCount = 0;

      for (const auth of authorizations) {
        const initialAlertCount = auth.alerts.length;

        auth.alerts = auth.alerts.filter((alert) => {
          if (alert.acknowledged && alert.acknowledgedAt < cutoffDate) {
            return false;
          }
          return true;
        });

        const removedCount = initialAlertCount - auth.alerts.length;

        if (removedCount > 0) {
          await auth.save();
          clearedCount += removedCount;
        }
      }

      logger.info('Old alerts cleared', {
        clearedCount,
        daysOld,
      });

      return { clearedCount };
    } catch (error) {
      logger.error('Failed to clear old alerts', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate monitoring report
   */
  async generateMonitoringReport() {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [
        activeAuthorizations,
        expiringWithin30Days,
        expiringWithin14Days,
        expiringWithin7Days,
        expiredAuthorizations,
        highUtilization,
        followUpsDue,
        alertSummary,
        recentlyApproved,
        recentlyDenied,
      ] = await Promise.all([
        PriorAuthorization.countDocuments({
          status: { $in: ['approved', 'partial_approval'] },
          'decision.effectiveDate': { $lte: now },
          'decision.expirationDate': { $gte: now },
        }),
        PriorAuthorization.getExpiring(30),
        PriorAuthorization.getExpiring(14),
        PriorAuthorization.getExpiring(7),
        PriorAuthorization.countDocuments({ status: 'expired' }),
        PriorAuthorization.countDocuments({
          status: { $in: ['approved', 'partial_approval'] },
          alerts: {
            $elemMatch: {
              type: 'utilization_threshold',
              acknowledged: false,
            },
          },
        }),
        PriorAuthorization.getRequiringFollowUp(),
        this.getAlertSummary(),
        PriorAuthorization.countDocuments({
          status: 'approved',
          'decision.approvedDate': { $gte: thirtyDaysAgo },
        }),
        PriorAuthorization.countDocuments({
          status: 'denied',
          'decision.deniedDate': { $gte: thirtyDaysAgo },
        }),
      ]);

      const report = {
        generatedAt: now,
        period: {
          start: thirtyDaysAgo,
          end: now,
        },
        authorizations: {
          active: activeAuthorizations,
          expired: expiredAuthorizations,
          expiring: {
            within30Days: expiringWithin30Days.length,
            within14Days: expiringWithin14Days.length,
            within7Days: expiringWithin7Days.length,
          },
        },
        recentActivity: {
          approved: recentlyApproved,
          denied: recentlyDenied,
        },
        utilization: {
          highUtilization,
          totalWithUtilizationAlerts: highUtilization,
        },
        followUps: {
          due: followUpsDue.length,
          overdue: followUpsDue.filter((auth) => {
            const daysSinceFollowUp = Math.ceil(
              (now - auth.submission.followUpDate) / (1000 * 60 * 60 * 24)
            );
            return daysSinceFollowUp > 0;
          }).length,
        },
        alerts: alertSummary,
        recommendations: this.generateRecommendations({
          expiringWithin7Days: expiringWithin7Days.length,
          expiringWithin14Days: expiringWithin14Days.length,
          highUtilization,
          followUpsDue: followUpsDue.length,
          unacknowledgedAlerts: alertSummary.unacknowledgedAlerts,
        }),
      };

      logger.info('Monitoring report generated', {
        activeAuthorizations: report.authorizations.active,
        expiringWithin7Days: report.authorizations.expiring.within7Days,
        unacknowledgedAlerts: report.alerts.unacknowledgedAlerts,
      });

      return report;
    } catch (error) {
      logger.error('Failed to generate monitoring report', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate recommendations based on monitoring data
   */
  generateRecommendations(data) {
    const recommendations = [];

    if (data.expiringWithin7Days > 0) {
      recommendations.push({
        priority: 'critical',
        category: 'expiration',
        message: `${data.expiringWithin7Days} authorizations expire within 7 days. Immediate action required.`,
        action: 'Review and renew authorizations before expiration',
      });
    }

    if (data.expiringWithin14Days > 5) {
      recommendations.push({
        priority: 'high',
        category: 'expiration',
        message: `${data.expiringWithin14Days} authorizations expire within 14 days. Plan renewal process.`,
        action: 'Begin renewal process for expiring authorizations',
      });
    }

    if (data.highUtilization > 0) {
      recommendations.push({
        priority: 'high',
        category: 'utilization',
        message: `${data.highUtilization} authorizations have high utilization. Monitor closely.`,
        action: 'Request additional authorization if needed before services are exhausted',
      });
    }

    if (data.followUpsDue > 0) {
      recommendations.push({
        priority: 'high',
        category: 'follow_up',
        message: `${data.followUpsDue} authorizations require follow-up with payers.`,
        action: 'Contact payers to check status of pending authorizations',
      });
    }

    if (data.unacknowledgedAlerts > 10) {
      recommendations.push({
        priority: 'medium',
        category: 'alerts',
        message: `${data.unacknowledgedAlerts} unacknowledged alerts require attention.`,
        action: 'Review and acknowledge or resolve alerts',
      });
    }

    return recommendations;
  }
}

// Singleton instance
const authMonitoringService = new AuthMonitoringService();

module.exports = {
  AuthMonitoringService,
  authMonitoringService,
};
