
const { claimStatusService } = require('./claimStatusService');
const Claim = require('../models/Claim');
const { logger } = require('../utils/logger');
/**
 * Claim Status Monitoring Service
 *
 * Monitors claim statuses and automates status inquiries
 */

/**
 * Claim Status Monitoring Service
 */
class ClaimStatusMonitoringService {
  constructor() {
    this.monitoringIntervals = {
      stale: null,
      inquiry: null,
      timely: null,
    };
  }

  /**
   * Start monitoring
   */
  startMonitoring() {
    logger.info('Starting claim status monitoring service');

    // Check for stale claims daily
    this.monitoringIntervals.stale = setInterval(
      () => this.checkStaleClaimStatus(),
      24 * 60 * 60 * 1000
    );

    // Auto-generate status inquiries for pending claims (weekly)
    this.monitoringIntervals.inquiry = setInterval(
      () => this.autoGenerateStatusInquiries(),
      7 * 24 * 60 * 60 * 1000
    );

    // Check timely filing limits daily
    this.monitoringIntervals.timely = setInterval(
      () => this.checkTimelyFilingDeadlines(),
      24 * 60 * 60 * 1000
    );

    // Run initial checks
    this.checkStaleClaimStatus();
    this.checkTimelyFilingDeadlines();

    logger.info('Claim status monitoring service started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    logger.info('Stopping claim status monitoring service');

    Object.values(this.monitoringIntervals).forEach((interval) => {
      if (interval) clearInterval(interval);
    });

    logger.info('Claim status monitoring service stopped');
  }

  /**
   * Check for stale claim statuses
   */
  async checkStaleClaimStatus() {
    try {
      logger.info('Checking for stale claim statuses');

      const staleClaims = await claimStatusService.checkStaleClaims(30);

      if (staleClaims.length > 0) {
        // Group by payer for batch inquiry
        const byPayer = {};

        staleClaims.forEach((claim) => {
          const { payerId } = claim.insurance;
          if (!byPayer[payerId]) {
            byPayer[payerId] = [];
          }
          byPayer[payerId].push(claim);
        });

        // Log summary
        Object.entries(byPayer).forEach(([payerId, claims]) => {
          logger.warn('Stale claims found', {
            payerId,
            payerName: claims[0]?.insurance.payerName,
            count: claims.length,
            claimNumbers: claims.map((c) => c.claimNumber).slice(0, 5),
          });
        });
      }

      logger.info('Stale claim check complete', {
        count: staleClaims.length,
      });

      return staleClaims;
    } catch (error) {
      logger.error('Failed to check stale claims', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Auto-generate 276 status inquiries
   */
  async autoGenerateStatusInquiries() {
    try {
      logger.info('Auto-generating status inquiries');

      // Find claims in pending statuses
      const pendingClaims = await Claim.find({
        status: { $in: ['pending', 'under_review', 'acknowledged'] },
        'tracking.submittedDate': {
          $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
          $lte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // At least 14 days old
        },
      });

      if (pendingClaims.length === 0) {
        logger.info('No claims require status inquiry');
        return { count: 0 };
      }

      // Group by payer
      const byPayer = {};

      pendingClaims.forEach((claim) => {
        const { payerId } = claim.insurance;
        if (!byPayer[payerId]) {
          byPayer[payerId] = [];
        }
        byPayer[payerId].push(claim._id);
      });

      // Generate 276 inquiries by payer
      const inquiries = [];

      for (const [payerId, claimIds] of Object.entries(byPayer)) {
        try {
          const inquiry = await claimStatusService.generate276Inquiry(claimIds);
          inquiries.push({
            payerId,
            claimCount: claimIds.length,
            inquiry,
          });

          logger.info('Generated 276 inquiry', {
            payerId,
            claimCount: claimIds.length,
          });
        } catch (error) {
          logger.error('Failed to generate 276 inquiry', {
            payerId,
            error: error.message,
          });
        }
      }

      logger.info('Status inquiry generation complete', {
        payers: Object.keys(byPayer).length,
        totalClaims: pendingClaims.length,
        inquiriesGenerated: inquiries.length,
      });

      return {
        count: inquiries.length,
        inquiries,
      };
    } catch (error) {
      logger.error('Failed to auto-generate status inquiries', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Check timely filing deadlines
   */
  async checkTimelyFilingDeadlines() {
    try {
      logger.info('Checking timely filing deadlines');

      const now = new Date();
      const warningThreshold = new Date();
      warningThreshold.setDate(warningThreshold.getDate() + 14); // 14 days warning

      // Find claims approaching timely filing deadline
      const approachingDeadline = await Claim.find({
        status: { $nin: ['paid', 'denied', 'closed', 'cancelled'] },
        'insurance.timelyFilingLimit': { $exists: true },
        'tracking.submittedDate': { $exists: true },
      });

      const warnings = [];
      const critical = [];

      for (const claim of approachingDeadline) {
        const timelyFilingDays = claim.insurance.timelyFilingLimit || 90;
        const submittedDate = new Date(claim.tracking.submittedDate);
        const deadline = new Date(submittedDate);
        deadline.setDate(deadline.getDate() + timelyFilingDays);

        const daysRemaining = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

        if (daysRemaining <= 0) {
          // Past deadline - critical
          critical.push({
            claimId: claim._id,
            claimNumber: claim.claimNumber,
            daysOverdue: Math.abs(daysRemaining),
            deadline,
          });
        } else if (daysRemaining <= 14) {
          // Within warning threshold
          warnings.push({
            claimId: claim._id,
            claimNumber: claim.claimNumber,
            daysRemaining,
            deadline,
          });
        }
      }

      if (critical.length > 0) {
        logger.error('Critical: Claims past timely filing deadline', {
          count: critical.length,
          claims: critical.slice(0, 10),
        });
      }

      if (warnings.length > 0) {
        logger.warn('Warning: Claims approaching timely filing deadline', {
          count: warnings.length,
          claims: warnings.slice(0, 10),
        });
      }

      logger.info('Timely filing check complete', {
        totalChecked: approachingDeadline.length,
        warnings: warnings.length,
        critical: critical.length,
      });

      return {
        warnings,
        critical,
      };
    } catch (error) {
      logger.error('Failed to check timely filing deadlines', {
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
        stale: this.monitoringIntervals.stale !== null,
        inquiry: this.monitoringIntervals.inquiry !== null,
        timely: this.monitoringIntervals.timely !== null,
      },
    };
  }

  /**
   * Run all checks manually
   */
  async runAllChecks() {
    try {
      logger.info('Running all claim status checks manually');

      const [staleClaims, inquiries, timelyFiling] = await Promise.all([
        this.checkStaleClaimStatus(),
        this.autoGenerateStatusInquiries(),
        this.checkTimelyFilingDeadlines(),
      ]);

      const results = {
        timestamp: new Date(),
        staleClaims: {
          count: staleClaims.length,
        },
        statusInquiries: {
          count: inquiries.count,
        },
        timelyFiling: {
          warnings: timelyFiling.warnings.length,
          critical: timelyFiling.critical.length,
        },
      };

      logger.info('All claim status checks complete', results);

      return results;
    } catch (error) {
      logger.error('Failed to run all checks', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get claims requiring attention
   */
  async getClaimsRequiringAttention() {
    try {
      const [staleClaims, pendedClaims, deniedClaims, timelyFilingAlerts] = await Promise.all([
        claimStatusService.checkStaleClaims(30),
        Claim.find({ status: 'pended' })
          .populate('patient', 'firstName lastName')
          .sort({ updatedAt: 1 })
          .limit(50),
        Claim.find({ status: 'denied' })
          .populate('patient', 'firstName lastName')
          .sort({ updatedAt: -1 })
          .limit(50),
        this.checkTimelyFilingDeadlines(),
      ]);

      return {
        staleClaims: {
          count: staleClaims.length,
          claims: staleClaims.slice(0, 20),
        },
        pendedClaims: {
          count: pendedClaims.length,
          claims: pendedClaims,
        },
        deniedClaims: {
          count: deniedClaims.length,
          claims: deniedClaims,
        },
        timelyFilingAlerts: {
          warnings: timelyFilingAlerts.warnings.length,
          critical: timelyFilingAlerts.critical.length,
          alerts: [
            ...timelyFilingAlerts.critical.map((a) => ({ ...a, severity: 'critical' })),
            ...timelyFilingAlerts.warnings.map((a) => ({ ...a, severity: 'warning' })),
          ],
        },
      };
    } catch (error) {
      logger.error('Failed to get claims requiring attention', {
        error: error.message,
      });
      throw error;
    }
  }
}

// Singleton instance
const claimStatusMonitoringService = new ClaimStatusMonitoringService();

module.exports = {
  ClaimStatusMonitoringService,
  claimStatusMonitoringService,
};
