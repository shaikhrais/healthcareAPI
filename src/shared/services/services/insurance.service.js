
const Insurance = require('../models/Insurance');
const InsuranceClaim = require('../models/InsuranceClaim');
const Patient = require('../models/Patient');
class InsuranceService {
  /**
   * Verify insurance eligibility
   * In production, this would integrate with Availity, Change Healthcare, or similar
   */
  async verifyEligibility(insuranceId) {
    try {
      const insurance = await Insurance.findById(insuranceId).populate('patientId');

      if (!insurance) {
        throw new Error('Insurance not found');
      }

      // TODO: Integrate with real eligibility verification API
      // For now, simulate verification
      const verificationResult = await this.simulateEligibilityCheck(insurance);

      // Update insurance with verification results
      insurance.verification.status = verificationResult.isEligible ? 'verified' : 'invalid';
      insurance.verification.verifiedAt = new Date();
      insurance.verification.eligibilityResponse = verificationResult;

      // Set next verification date (90 days)
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 90);
      insurance.verification.nextVerificationDate = nextDate;

      await insurance.save();

      return {
        insuranceId: insurance._id,
        isEligible: verificationResult.isEligible,
        coverage: verificationResult.coverage,
        message: verificationResult.message,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Simulate eligibility check (replace with real API integration)
   */
  async simulateEligibilityCheck(insurance) {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const now = new Date();
    const isActive =
      insurance.effectiveDate <= now &&
      (!insurance.expirationDate || insurance.expirationDate >= now);

    return {
      isEligible: isActive,
      coverage: insurance.coverage,
      deductible: {
        total: insurance.deductible,
        met: insurance.deductibleMet,
        remaining: insurance.deductible - insurance.deductibleMet,
      },
      copay: insurance.copay,
      outOfPocketMax: insurance.outOfPocketMax,
      message: isActive ? 'Coverage verified and active' : 'Coverage is not active',
      verifiedAt: new Date(),
    };
  }

  /**
   * Batch verify insurances needing verification
   */
  async batchVerifyInsurances() {
    try {
      const insurances = await Insurance.getNeedingVerification();
      const results = [];

      for (const insurance of insurances) {
        try {
          const result = await this.verifyEligibility(insurance._id);
          results.push({ success: true, insuranceId: insurance._id, result });
        } catch (error) {
          results.push({
            success: false,
            insuranceId: insurance._id,
            error: error.message,
          });
        }
      }

      return {
        total: insurances.length,
        verified: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create insurance claim
   */
  async createClaim(claimData) {
    try {
      // Verify insurance is active
      const insurance = await Insurance.findById(claimData.insuranceId);
      if (!insurance || !insurance.isValid()) {
        throw new Error('Insurance is not valid or active');
      }

      // Calculate total billed amount
      const totalBilled = claimData.procedureCodes.reduce((sum, proc) => {
        return sum + proc.chargeAmount * (proc.quantity || 1);
      }, 0);

      const claim = await InsuranceClaim.create({
        ...claimData,
        totalBilledAmount: totalBilled,
        status: 'draft',
      });

      return await InsuranceClaim.findById(claim._id)
        .populate('patientId', 'firstName lastName')
        .populate('insuranceId', 'provider policyNumber')
        .populate('practitionerId', 'firstName lastName');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Submit claim electronically
   */
  async submitClaim(claimId, userId) {
    try {
      const claim = await InsuranceClaim.findById(claimId)
        .populate('insuranceId')
        .populate('patientId');

      if (!claim) {
        throw new Error('Claim not found');
      }

      if (claim.status !== 'draft') {
        throw new Error('Only draft claims can be submitted');
      }

      // TODO: Integrate with clearinghouse (Availity, Change Healthcare, etc.)
      // For now, simulate submission
      const submissionResult = await this.simulateClaimSubmission(claim);

      claim.status = 'submitted';
      claim.submittedAt = new Date();
      claim.submittedBy = userId;
      claim.submissionMethod = 'electronic';
      claim.electronicSubmission = {
        transactionId: submissionResult.transactionId,
        clearinghouseId: submissionResult.clearinghouseId,
        claimStatusCode: '1', // Submitted
        lastChecked: new Date(),
      };

      await claim.save();

      return claim;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Simulate claim submission (replace with real clearinghouse integration)
   */
  async simulateClaimSubmission(claim) {
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      clearinghouseId: 'CH-' + Math.random().toString(36).substr(2, 9),
      status: 'accepted',
      message: 'Claim submitted successfully',
    };
  }

  /**
   * Check claim status with clearinghouse
   */
  async checkClaimStatus(claimId) {
    try {
      const claim = await InsuranceClaim.findById(claimId);

      if (!claim || !claim.electronicSubmission?.transactionId) {
        throw new Error('No electronic submission found for this claim');
      }

      // TODO: Query clearinghouse for status
      // For now, simulate status check
      const statusResult = await this.simulateStatusCheck(claim);

      // Update claim based on status
      if (statusResult.status === 'approved') {
        claim.status = 'approved';
        claim.totalApprovedAmount = statusResult.approvedAmount;
        claim.processedAt = new Date();
      } else if (statusResult.status === 'denied') {
        claim.status = 'denied';
        claim.denialReason = statusResult.denialReason;
        claim.processedAt = new Date();
      } else if (statusResult.status === 'pending') {
        claim.status = 'processing';
      }

      claim.electronicSubmission.claimStatusCode = statusResult.statusCode;
      claim.electronicSubmission.lastChecked = new Date();

      await claim.save();

      return {
        claimId: claim._id,
        claimNumber: claim.claimNumber,
        status: claim.status,
        ...statusResult,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Simulate status check (replace with real API)
   */
  async simulateStatusCheck(claim) {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const random = Math.random();

    if (random < 0.6) {
      // 60% approved
      return {
        status: 'approved',
        statusCode: '3',
        approvedAmount: claim.totalBilledAmount * 0.9, // 90% approved
        message: 'Claim approved',
      };
    }
    if (random < 0.8) {
      // 20% still pending
      return {
        status: 'pending',
        statusCode: '2',
        message: 'Claim is being processed',
      };
    }
    // 20% denied
    return {
      status: 'denied',
      statusCode: '4',
      denialReason: {
        code: 'D101',
        description: 'Service not covered under patient plan',
      },
      message: 'Claim denied',
    };
  }

  /**
   * Batch check status for pending claims
   */
  async batchCheckClaimStatus() {
    try {
      const pendingClaims = await InsuranceClaim.getPendingClaims();
      const results = [];

      for (const claim of pendingClaims) {
        try {
          const result = await this.checkClaimStatus(claim._id);
          results.push({ success: true, claimId: claim._id, result });
        } catch (error) {
          results.push({
            success: false,
            claimId: claim._id,
            error: error.message,
          });
        }
      }

      return {
        total: pendingClaims.length,
        checked: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Process claim payment
   */
  async processClaimPayment(claimId, paymentData) {
    try {
      const claim = await InsuranceClaim.findById(claimId);

      if (!claim) {
        throw new Error('Claim not found');
      }

      if (claim.status !== 'approved' && claim.status !== 'partially_approved') {
        throw new Error('Only approved claims can be paid');
      }

      // Create payment record
      const Payment = require('../models/Payment');
      const payment = await Payment.create({
        patientId: claim.patientId,
        appointmentId: claim.appointmentId,
        amount: paymentData.amount,
        paymentMethod: 'insurance',
        status: 'completed',
        paidBy: 'Insurance Company',
        processedBy: paymentData.processedBy,
        referenceNumber: paymentData.checkNumber || paymentData.eobNumber,
        notes: `Insurance payment for claim ${claim.claimNumber}`,
      });

      // Update claim
      claim.totalPaidAmount = (claim.totalPaidAmount || 0) + paymentData.amount;
      claim.paymentId = payment._id;
      claim.paidAt = new Date();
      claim.status = 'paid';

      // Add EOB information
      if (paymentData.eobUrl) {
        claim.eob = {
          received: true,
          receivedDate: new Date(),
          documentUrl: paymentData.eobUrl,
        };
      }

      // Calculate patient responsibility
      claim.calculatePatientResponsibility();

      await claim.save();

      return {
        claim,
        payment,
        patientOwes: claim.patientResponsibility,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Appeal denied claim
   */
  async appealClaim(claimId, appealData) {
    try {
      const claim = await InsuranceClaim.findById(claimId);

      if (!claim) {
        throw new Error('Claim not found');
      }

      if (claim.status !== 'denied') {
        throw new Error('Only denied claims can be appealed');
      }

      claim.status = 'appealed';
      claim.appealInfo = {
        isAppealed: true,
        appealDate: new Date(),
        appealReason: appealData.reason,
        appealStatus: 'pending',
      };

      claim.claimNotes.push({
        note: `Appeal filed: ${appealData.reason}`,
        createdBy: appealData.userId,
        createdAt: new Date(),
      });

      await claim.save();

      // TODO: Submit appeal to clearinghouse

      return claim;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get insurance analytics
   */
  async getInsuranceAnalytics(startDate, endDate) {
    try {
      const claims = await InsuranceClaim.find({
        serviceDate: { $gte: startDate, $lte: endDate },
      });

      const analytics = {
        totalClaims: claims.length,
        totalBilled: 0,
        totalApproved: 0,
        totalPaid: 0,
        totalDenied: 0,
        averageApprovalRate: 0,
        averagePaymentTime: 0,
        denialRate: 0,
        byInsurer: {},
        byStatus: {},
      };

      const deniedClaims = claims.filter((c) => c.status === 'denied');
      const paidClaims = claims.filter((c) => c.status === 'paid');

      claims.forEach((claim) => {
        analytics.totalBilled += claim.totalBilledAmount || 0;
        analytics.totalApproved += claim.totalApprovedAmount || 0;
        analytics.totalPaid += claim.totalPaidAmount || 0;

        if (claim.status === 'denied') {
          analytics.totalDenied += claim.totalBilledAmount || 0;
        }

        // Count by status
        analytics.byStatus[claim.status] = (analytics.byStatus[claim.status] || 0) + 1;
      });

      analytics.denialRate =
        claims.length > 0 ? ((deniedClaims.length / claims.length) * 100).toFixed(2) : 0;

      analytics.averageApprovalRate =
        analytics.totalBilled > 0
          ? ((analytics.totalApproved / analytics.totalBilled) * 100).toFixed(2)
          : 0;

      // Calculate average payment time for paid claims
      if (paidClaims.length > 0) {
        const totalDays = paidClaims.reduce((sum, claim) => {
          if (claim.submittedAt && claim.paidAt) {
            return sum + (claim.paidAt - claim.submittedAt) / (1000 * 60 * 60 * 24);
          }
          return sum;
        }, 0);
        analytics.averagePaymentTime = Math.round(totalDays / paidClaims.length);
      }

      return analytics;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get patient insurance summary
   */
  async getPatientInsuranceSummary(patientId) {
    try {
      const insurances = await Insurance.getActiveInsurances(patientId);
      const claims = await InsuranceClaim.getPatientClaims(patientId, 100);

      const totalBilled = claims.reduce((sum, c) => sum + (c.totalBilledAmount || 0), 0);
      const totalPaid = claims.reduce((sum, c) => sum + (c.totalPaidAmount || 0), 0);
      const totalOwed = claims.reduce((sum, c) => sum + (c.patientResponsibility || 0), 0);

      return {
        insurances,
        claims: {
          total: claims.length,
          pending: claims.filter((c) => c.status === 'pending' || c.status === 'submitted').length,
          approved: claims.filter((c) => c.status === 'approved' || c.status === 'paid').length,
          denied: claims.filter((c) => c.status === 'denied').length,
        },
        financial: {
          totalBilled,
          totalPaid,
          totalOwed,
        },
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new InsuranceService();
