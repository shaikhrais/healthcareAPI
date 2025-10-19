
const Claim = require('../models/Claim');
const { logger } = require('../utils/logger');
const { BadRequestError, NotFoundError } = require('../utils/errors');
/**
 * Claim Status Tracking Service
 *
 * Manages claim status tracking, 276/277 transactions, and status history
 */

/**
 * HIPAA Claim Status Codes (277 Response)
 */
const ClaimStatusCodes = {
  // Acknowledgment/Forwarded
  1: 'Acknowledgement/Forwarded',
  2: 'Acknowledgement/Receipt',
  3: 'Acknowledgement/Accepted',
  4: 'Acknowledgement/Rejected',

  // Financial Information
  5: 'Finalized/Payment',
  6: 'Finalized/Denial',
  7: 'Finalized/Partial Payment',

  // Status
  8: 'Status/Pending',
  9: 'Status/Finalized',

  // Additional Detail Codes
  10: 'Accepted for Processing',
  11: 'Pending: Awaiting Information',
  12: 'Pending: Under Review',
  13: 'Pending: Pricing',
  14: 'Pending: Coordination of Benefits',
  15: 'Suspended: Awaiting Information from Provider',
  16: 'Suspended: Under Investigation',
  17: 'Suspended: Review by Medical Director',
  18: 'Paid: Full Payment',
  19: 'Paid: Partial Payment',
  20: 'Denied: Patient Not Covered',
  21: 'Denied: Prior Authorization Required',
  22: 'Denied: Service Not Covered',
  23: 'Denied: Timely Filing Limit',
  24: 'Denied: Duplicate Claim',
  25: 'Pended: Additional Information Requested',
  26: 'Processed: Awaiting Payment',
  27: 'Processed: Payment Issued',
};

/**
 * Status Categories
 */
const StatusCategories = {
  SUBMITTED: 'submitted',
  ACKNOWLEDGED: 'acknowledged',
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  PENDED: 'pended',
  PAID: 'paid',
  PARTIALLY_PAID: 'partially_paid',
  DENIED: 'denied',
  REJECTED: 'rejected',
  APPEALED: 'appealed',
  CLOSED: 'closed',
};

/**
 * Claim Status Tracking Service
 */
class ClaimStatusService {
  constructor() {
    this.statusTransitions = this.defineStatusTransitions();
  }

  /**
   * Define valid status transitions
   */
  defineStatusTransitions() {
    return {
      draft: ['submitted', 'cancelled'],
      submitted: ['acknowledged', 'rejected', 'cancelled'],
      acknowledged: ['pending', 'under_review', 'pended', 'denied', 'paid'],
      pending: ['under_review', 'pended', 'denied', 'paid', 'partially_paid'],
      under_review: ['pended', 'approved_for_payment', 'denied', 'paid', 'partially_paid'],
      pended: ['under_review', 'pending', 'denied', 'paid'],
      approved_for_payment: ['paid', 'partially_paid'],
      paid: ['closed', 'appealed'],
      partially_paid: ['paid', 'appealed', 'closed'],
      denied: ['appealed', 'closed'],
      rejected: ['resubmitted', 'closed'],
      appealed: ['under_review', 'paid', 'partially_paid', 'denied', 'closed'],
      resubmitted: ['submitted'],
      cancelled: [],
      closed: [],
    };
  }

  /**
   * Update claim status
   */
  async updateClaimStatus(claimId, newStatus, data, userId) {
    try {
      const claim = await Claim.findById(claimId);

      if (!claim) {
        throw new NotFoundError('Claim not found');
      }

      const currentStatus = claim.status;

      // Validate status transition
      if (!this.isValidTransition(currentStatus, newStatus)) {
        throw new BadRequestError(
          `Invalid status transition from '${currentStatus}' to '${newStatus}'`
        );
      }

      // Create status history entry
      const statusEntry = {
        status: newStatus,
        previousStatus: currentStatus,
        changedAt: new Date(),
        changedBy: userId,
        reason: data.reason,
        notes: data.notes,
        source: data.source || 'manual', // manual, edi_277, portal, api
        referenceNumber: data.referenceNumber,
        statusCode: data.statusCode, // HIPAA 277 status code
        statusCodeDescription: data.statusCode ? ClaimStatusCodes[data.statusCode] : null,
      };

      // Add additional data based on status
      if (newStatus === 'paid' || newStatus === 'partially_paid') {
        statusEntry.paymentAmount = data.paymentAmount;
        statusEntry.paymentDate = data.paymentDate;
        statusEntry.checkNumber = data.checkNumber;
        statusEntry.eraNumber = data.eraNumber;
      }

      if (newStatus === 'denied' || newStatus === 'rejected') {
        statusEntry.denialReason = data.denialReason;
        statusEntry.denialCode = data.denialCode;
        statusEntry.isAppealable = data.isAppealable !== false;
      }

      if (newStatus === 'pended') {
        statusEntry.pendReason = data.pendReason;
        statusEntry.informationRequested = data.informationRequested;
        statusEntry.responseDeadline = data.responseDeadline;
      }

      // Update claim status
      claim.status = newStatus;

      // Initialize statusHistory if not exists
      if (!claim.statusHistory) {
        claim.statusHistory = [];
      }

      claim.statusHistory.push(statusEntry);

      // Update tracking fields
      if (newStatus === 'submitted') {
        claim.tracking.submittedDate = new Date();
      }

      if (newStatus === 'acknowledged') {
        claim.tracking.acknowledgedDate = new Date();
      }

      if (newStatus === 'paid' || newStatus === 'partially_paid') {
        claim.tracking.paidDate = new Date();
        claim.payment = claim.payment || {};
        claim.payment.paidAmount = data.paymentAmount;
        claim.payment.paymentDate = data.paymentDate;
        claim.payment.checkNumber = data.checkNumber;
      }

      await claim.save();

      logger.info('Claim status updated', {
        claimId,
        claimNumber: claim.claimNumber,
        previousStatus: currentStatus,
        newStatus,
        userId,
      });

      return {
        claim,
        statusEntry,
      };
    } catch (error) {
      logger.error('Failed to update claim status', {
        error: error.message,
        claimId,
        newStatus,
        userId,
      });
      throw error;
    }
  }

  /**
   * Check if status transition is valid
   */
  isValidTransition(currentStatus, newStatus) {
    const allowedTransitions = this.statusTransitions[currentStatus];
    return allowedTransitions && allowedTransitions.includes(newStatus);
  }

  /**
   * Get status history for claim
   */
  async getStatusHistory(claimId) {
    try {
      const claim = await Claim.findById(claimId)
        .populate('statusHistory.changedBy', 'firstName lastName')
        .select('claimNumber status statusHistory');

      if (!claim) {
        throw new NotFoundError('Claim not found');
      }

      return {
        claimId,
        claimNumber: claim.claimNumber,
        currentStatus: claim.status,
        history: claim.statusHistory || [],
      };
    } catch (error) {
      logger.error('Failed to get status history', {
        error: error.message,
        claimId,
      });
      throw error;
    }
  }

  /**
   * Process 277 claim status response
   */
  async process277Response(responseData) {
    try {
      const results = [];

      for (const claimStatus of responseData.claims) {
        try {
          // Find claim by claim number or reference
          const claim = await Claim.findOne({
            $or: [
              { claimNumber: claimStatus.claimNumber },
              { 'tracking.clearinghouseClaimId': claimStatus.claimId },
            ],
          });

          if (!claim) {
            results.push({
              success: false,
              claimNumber: claimStatus.claimNumber,
              error: 'Claim not found',
            });
            continue;
          }

          // Map 277 status code to internal status
          const newStatus = this.map277StatusToInternal(claimStatus.statusCode);

          // Update claim status
          const result = await this.updateClaimStatus(
            claim._id,
            newStatus,
            {
              reason: '277 EDI Response',
              notes: claimStatus.statusDescription,
              source: 'edi_277',
              referenceNumber: claimStatus.traceNumber,
              statusCode: claimStatus.statusCode,
              paymentAmount: claimStatus.paymentAmount,
              paymentDate: claimStatus.paymentDate,
              checkNumber: claimStatus.checkNumber,
              eraNumber: claimStatus.eraNumber,
              denialReason: claimStatus.denialReason,
              denialCode: claimStatus.denialCode,
            },
            null // System update
          );

          results.push({
            success: true,
            claimId: claim._id,
            claimNumber: claim.claimNumber,
            status: newStatus,
          });

          logger.info('Processed 277 response for claim', {
            claimId: claim._id,
            claimNumber: claim.claimNumber,
            statusCode: claimStatus.statusCode,
            status: newStatus,
          });
        } catch (error) {
          results.push({
            success: false,
            claimNumber: claimStatus.claimNumber,
            error: error.message,
          });
        }
      }

      logger.info('Processed 277 response batch', {
        total: responseData.claims.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      });

      return {
        total: responseData.claims.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      };
    } catch (error) {
      logger.error('Failed to process 277 response', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Map 277 status code to internal status
   */
  map277StatusToInternal(statusCode) {
    const mappings = {
      1: 'submitted',
      2: 'acknowledged',
      3: 'acknowledged',
      4: 'rejected',
      5: 'paid',
      6: 'denied',
      7: 'partially_paid',
      8: 'pending',
      9: 'closed',
      10: 'acknowledged',
      11: 'pended',
      12: 'under_review',
      13: 'pending',
      14: 'pending',
      15: 'pended',
      16: 'under_review',
      17: 'under_review',
      18: 'paid',
      19: 'partially_paid',
      20: 'denied',
      21: 'denied',
      22: 'denied',
      23: 'denied',
      24: 'rejected',
      25: 'pended',
      26: 'approved_for_payment',
      27: 'paid',
    };

    return mappings[statusCode] || 'pending';
  }

  /**
   * Generate 276 claim status inquiry
   */
  async generate276Inquiry(claimIds) {
    try {
      const claims = await Claim.find({
        _id: { $in: claimIds },
      })
        .populate('patient', 'firstName lastName dateOfBirth memberId')
        .populate('provider', 'firstName lastName npi');

      const inquiries = claims.map((claim) => ({
        claimId: claim._id,
        claimNumber: claim.claimNumber,
        patient: {
          firstName: claim.patient.firstName,
          lastName: claim.patient.lastName,
          dateOfBirth: claim.patient.dateOfBirth,
          memberId: claim.patientInfo.memberId,
        },
        provider: {
          npi: claim.provider.npi,
          name: `${claim.provider.firstName} ${claim.provider.lastName}`,
        },
        payer: {
          id: claim.insurance.payerId,
          name: claim.insurance.payerName,
        },
        serviceDate: claim.serviceDate,
        totalCharges: claim.charges.totalCharges,
        submittedDate: claim.tracking.submittedDate,
        clearinghouseClaimId: claim.tracking.clearinghouseClaimId,
      }));

      // In production, this would generate actual X12 276 transaction
      const inquiry276 = {
        transactionType: '276',
        inquiryDate: new Date(),
        inquiryCount: inquiries.length,
        claims: inquiries,
      };

      logger.info('Generated 276 claim status inquiry', {
        count: inquiries.length,
        claimNumbers: claims.map((c) => c.claimNumber),
      });

      return inquiry276;
    } catch (error) {
      logger.error('Failed to generate 276 inquiry', {
        error: error.message,
        claimIds,
      });
      throw error;
    }
  }

  /**
   * Get claims by status
   */
  async getClaimsByStatus(status, options = {}) {
    try {
      const query = { status };

      if (options.payerId) {
        query['insurance.payerId'] = options.payerId;
      }

      if (options.providerId) {
        query.provider = options.providerId;
      }

      if (options.dateFrom || options.dateTo) {
        query['tracking.submittedDate'] = {};
        if (options.dateFrom) {
          query['tracking.submittedDate'].$gte = new Date(options.dateFrom);
        }
        if (options.dateTo) {
          query['tracking.submittedDate'].$lte = new Date(options.dateTo);
        }
      }

      const claims = await Claim.find(query)
        .populate('patient', 'firstName lastName')
        .populate('provider', 'firstName lastName')
        .sort({ 'tracking.submittedDate': -1 })
        .limit(options.limit || 100);

      return claims;
    } catch (error) {
      logger.error('Failed to get claims by status', {
        error: error.message,
        status,
      });
      throw error;
    }
  }

  /**
   * Get aging report by status
   */
  async getAgingReport() {
    try {
      const now = new Date();

      const agingBuckets = [
        { name: '0-30 days', min: 0, max: 30 },
        { name: '31-60 days', min: 31, max: 60 },
        { name: '61-90 days', min: 61, max: 90 },
        { name: '91-120 days', min: 91, max: 120 },
        { name: '120+ days', min: 121, max: Infinity },
      ];

      const report = {
        generatedAt: now,
        byStatus: {},
        byAging: {},
      };

      // Get claims by status
      const statusCounts = await Claim.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$charges.totalCharges' },
          },
        },
      ]);

      report.byStatus = statusCounts.reduce((acc, item) => {
        acc[item._id] = {
          count: item.count,
          totalAmount: item.totalAmount,
        };
        return acc;
      }, {});

      // Calculate aging
      for (const bucket of agingBuckets) {
        const minDate = new Date(now);
        const maxDate = new Date(now);

        minDate.setDate(minDate.getDate() - bucket.max);
        if (bucket.max !== Infinity) {
          maxDate.setDate(maxDate.getDate() - bucket.min);
        }

        const query = {
          status: { $in: ['pending', 'under_review', 'pended', 'acknowledged'] },
          'tracking.submittedDate':
            bucket.max === Infinity ? { $lte: minDate } : { $gte: minDate, $lte: maxDate },
        };

        const result = await Claim.aggregate([
          { $match: query },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              totalAmount: { $sum: '$charges.totalCharges' },
            },
          },
        ]);

        report.byAging[bucket.name] = result[0] || { count: 0, totalAmount: 0 };
      }

      logger.info('Generated aging report', {
        totalStatuses: Object.keys(report.byStatus).length,
        agingBuckets: Object.keys(report.byAging).length,
      });

      return report;
    } catch (error) {
      logger.error('Failed to generate aging report', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get status timeline for claim
   */
  async getStatusTimeline(claimId) {
    try {
      const claim = await Claim.findById(claimId)
        .populate('statusHistory.changedBy', 'firstName lastName')
        .select('claimNumber status statusHistory tracking');

      if (!claim) {
        throw new NotFoundError('Claim not found');
      }

      // Build timeline with milestones
      const timeline = {
        claimNumber: claim.claimNumber,
        currentStatus: claim.status,
        milestones: [],
        totalDuration: null,
        statusChanges: claim.statusHistory?.length || 0,
      };

      // Add key milestones
      if (claim.tracking.submittedDate) {
        timeline.milestones.push({
          event: 'Claim Submitted',
          date: claim.tracking.submittedDate,
          type: 'milestone',
        });
      }

      if (claim.tracking.acknowledgedDate) {
        timeline.milestones.push({
          event: 'Claim Acknowledged',
          date: claim.tracking.acknowledgedDate,
          type: 'milestone',
        });
      }

      // Add status changes
      if (claim.statusHistory && claim.statusHistory.length > 0) {
        claim.statusHistory.forEach((entry) => {
          timeline.milestones.push({
            event: `Status: ${entry.status}`,
            date: entry.changedAt,
            type: 'status_change',
            previousStatus: entry.previousStatus,
            status: entry.status,
            reason: entry.reason,
            notes: entry.notes,
            changedBy: entry.changedBy,
            source: entry.source,
          });
        });
      }

      if (claim.tracking.paidDate) {
        timeline.milestones.push({
          event: 'Payment Received',
          date: claim.tracking.paidDate,
          type: 'milestone',
        });
      }

      // Sort by date
      timeline.milestones.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Calculate total duration
      if (timeline.milestones.length > 0) {
        const firstDate = timeline.milestones[0].date;
        const lastDate = timeline.milestones[timeline.milestones.length - 1].date;
        const duration = Math.ceil(
          (new Date(lastDate) - new Date(firstDate)) / (1000 * 60 * 60 * 24)
        );
        timeline.totalDuration = `${duration} days`;
      }

      return timeline;
    } catch (error) {
      logger.error('Failed to get status timeline', {
        error: error.message,
        claimId,
      });
      throw error;
    }
  }

  /**
   * Check for stale claims
   */
  async checkStaleClaims(daysThreshold = 30) {
    try {
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

      const staleClaims = await Claim.find({
        status: { $in: ['pending', 'under_review', 'pended', 'acknowledged'] },
        $or: [
          { 'tracking.lastStatusChange': { $lte: thresholdDate } },
          {
            'tracking.submittedDate': { $lte: thresholdDate },
            'tracking.lastStatusChange': { $exists: false },
          },
        ],
      })
        .populate('patient', 'firstName lastName')
        .populate('provider', 'firstName lastName')
        .sort({ 'tracking.submittedDate': 1 });

      logger.info('Checked for stale claims', {
        threshold: daysThreshold,
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
   * Get status statistics
   */
  async getStatusStatistics(startDate, endDate) {
    try {
      const filter = {};
      if (startDate || endDate) {
        filter['tracking.submittedDate'] = {};
        if (startDate) filter['tracking.submittedDate'].$gte = new Date(startDate);
        if (endDate) filter['tracking.submittedDate'].$lte = new Date(endDate);
      }

      const [totalClaims, byStatus, averageTimeToPayment, denialRate] = await Promise.all([
        Claim.countDocuments(filter),
        Claim.aggregate([
          { $match: filter },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              totalAmount: { $sum: '$charges.totalCharges' },
            },
          },
        ]),
        Claim.aggregate([
          {
            $match: {
              ...filter,
              status: { $in: ['paid', 'partially_paid'] },
              'tracking.submittedDate': { $exists: true },
              'tracking.paidDate': { $exists: true },
            },
          },
          {
            $project: {
              daysToPay: {
                $divide: [
                  { $subtract: ['$tracking.paidDate', '$tracking.submittedDate'] },
                  1000 * 60 * 60 * 24,
                ],
              },
            },
          },
          { $group: { _id: null, avgDays: { $avg: '$daysToPay' } } },
        ]),
        Claim.aggregate([
          { $match: filter },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              denied: {
                $sum: { $cond: [{ $eq: ['$status', 'denied'] }, 1, 0] },
              },
            },
          },
        ]),
      ]);

      const denialStats = denialRate[0] || { total: 0, denied: 0 };
      const denialPercentage =
        denialStats.total > 0 ? ((denialStats.denied / denialStats.total) * 100).toFixed(2) : 0;

      return {
        period: { startDate, endDate },
        totalClaims,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item._id] = {
            count: item.count,
            totalAmount: item.totalAmount,
          };
          return acc;
        }, {}),
        averageTimeToPayment: averageTimeToPayment[0]?.avgDays || 0,
        denialRate: denialPercentage,
      };
    } catch (error) {
      logger.error('Failed to get status statistics', {
        error: error.message,
      });
      throw error;
    }
  }
}

// Singleton instance
const claimStatusService = new ClaimStatusService();

module.exports = {
  ClaimStatusService,
  claimStatusService,
  ClaimStatusCodes,
  StatusCategories,
};
