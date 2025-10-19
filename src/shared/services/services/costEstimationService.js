
const PatientResponsibilityEstimate = require('../models/PatientResponsibilityEstimate');
const Patient = require('../models/Patient');
const User = require('../models/User');
const { logger } = require('../utils/logger');
const { BadRequestError, NotFoundError } = require('../utils/errors');
/**
 * Cost Estimation Service
 *
 * Calculates patient responsibility estimates based on insurance benefits and service costs
 */

/**
 * Cost Estimation Service
 */
class CostEstimationService {
  /**
   * Create new cost estimate
   */
  async createEstimate(data, userId) {
    try {
      // Validate patient exists
      const patient = await Patient.findById(data.patientId);
      if (!patient) {
        throw new NotFoundError('Patient not found');
      }

      // Build estimate
      const estimate = new PatientResponsibilityEstimate({
        patient: data.patientId,
        patientInfo: {
          firstName: data.patientInfo?.firstName || patient.firstName,
          lastName: data.patientInfo?.lastName || patient.lastName,
          dateOfBirth: data.patientInfo?.dateOfBirth || patient.dateOfBirth,
          memberId: data.patientInfo?.memberId,
        },
        provider: data.providerId,
        providerInfo: data.providerInfo,
        insurance: data.insurance,
        secondaryInsurance: data.secondaryInsurance,
        serviceInfo: data.serviceInfo,
        procedureCodes: data.procedureCodes || [],
        diagnosisCodes: data.diagnosisCodes || [],
        benefits: data.benefits || {},
        workflow: {
          createdBy: userId,
        },
      });

      // Calculate total charges
      estimate.charges.totalCharges = this.calculateTotalCharges(estimate.procedureCodes);

      // Calculate patient responsibility
      await this.calculatePatientResponsibility(estimate);

      await estimate.save();

      logger.info('Cost estimate created', {
        estimateId: estimate._id,
        estimateNumber: estimate.estimateNumber,
        patient: data.patientId,
        estimatedTotal: estimate.patientResponsibility.estimatedTotal,
        userId,
      });

      return estimate;
    } catch (error) {
      logger.error('Failed to create cost estimate', {
        error: error.message,
        data,
        userId,
      });
      throw error;
    }
  }

  /**
   * Calculate total charges from procedure codes
   */
  calculateTotalCharges(procedureCodes) {
    if (!procedureCodes || procedureCodes.length === 0) return 0;

    return procedureCodes.reduce((total, proc) => {
      const quantity = proc.quantity || 1;
      const charge = proc.chargeAmount || 0;
      return total + quantity * charge;
    }, 0);
  }

  /**
   * Calculate patient responsibility
   */
  async calculatePatientResponsibility(estimate) {
    const { benefits } = estimate;
    const { charges } = estimate;

    // Initialize patient responsibility object
    const responsibility = {
      deductibleAmount: 0,
      copayAmount: 0,
      coinsuranceAmount: 0,
      nonCoveredAmount: 0,
      outOfNetworkPenalty: 0,
      estimatedTotal: 0,
      minimumEstimate: 0,
      maximumEstimate: 0,
      breakdownByProcedure: [],
    };

    // Use allowed amount or total charges
    const baseAmount = charges.totalAllowedAmount || charges.contractedRate || charges.totalCharges;

    // Check if service is covered
    if (!benefits.isCovered) {
      responsibility.nonCoveredAmount = charges.totalCharges;
      responsibility.estimatedTotal = charges.totalCharges;
      estimate.patientResponsibility = responsibility;
      estimate.insurancePayment = {
        primaryInsuranceEstimate: 0,
        totalInsuranceEstimate: 0,
      };
      return;
    }

    // Handle preventive care (often 100% covered)
    if (estimate.serviceInfo.isPreventive && benefits.networkStatus === 'in_network') {
      responsibility.estimatedTotal = 0;
      estimate.patientResponsibility = responsibility;
      estimate.insurancePayment = {
        primaryInsuranceEstimate: baseAmount,
        totalInsuranceEstimate: baseAmount,
      };
      return;
    }

    // Calculate for each procedure
    let totalPatientOwes = 0;
    let totalInsurancePays = 0;

    for (const procedure of estimate.procedureCodes) {
      const procCharge =
        (procedure.allowedAmount || procedure.chargeAmount) * (procedure.quantity || 1);
      const procBreakdown = {
        procedureCode: procedure.code,
        chargeAmount: procedure.chargeAmount * (procedure.quantity || 1),
        allowedAmount: procCharge,
        deductible: 0,
        copay: 0,
        coinsurance: 0,
        patientOwes: 0,
      };

      let remainingAmount = procCharge;
      let insurancePaysForProc = 0;

      // Step 1: Apply copay (if applicable before deductible)
      if (benefits.copay?.hasCopay && benefits.copay.appliesBeforeDeductible) {
        const copayAmount = benefits.copay.amount || 0;
        procBreakdown.copay = copayAmount;
        responsibility.copayAmount += copayAmount;
        remainingAmount -= copayAmount;
      }

      // Step 2: Apply deductible
      if (benefits.deductible && remainingAmount > 0) {
        const deductibleRemaining = benefits.deductible.individualRemaining || 0;

        if (deductibleRemaining > 0) {
          const deductibleApplied = Math.min(remainingAmount, deductibleRemaining);
          procBreakdown.deductible = deductibleApplied;
          responsibility.deductibleAmount += deductibleApplied;
          remainingAmount -= deductibleApplied;

          // Update deductible remaining for subsequent procedures
          benefits.deductible.individualRemaining -= deductibleApplied;
        }
      }

      // Step 3: Apply coinsurance
      if (benefits.coinsurance?.hasCoinsurance && remainingAmount > 0) {
        const patientPercentage = benefits.coinsurance.patientPercentage || 0;
        const coinsuranceAmount = (remainingAmount * patientPercentage) / 100;

        procBreakdown.coinsurance = coinsuranceAmount;
        responsibility.coinsuranceAmount += coinsuranceAmount;

        // Insurance pays the rest
        const insurancePercentage =
          benefits.coinsurance.insurancePercentage || 100 - patientPercentage;
        insurancePaysForProc = (remainingAmount * insurancePercentage) / 100;
      } else if (remainingAmount > 0) {
        // No coinsurance, insurance pays the rest
        insurancePaysForProc = remainingAmount;
      }

      // Step 4: Apply copay (if applicable after deductible)
      if (benefits.copay?.hasCopay && !benefits.copay.appliesBeforeDeductible) {
        const copayAmount = benefits.copay.amount || 0;
        procBreakdown.copay = copayAmount;
        responsibility.copayAmount += copayAmount;
      }

      // Calculate total patient owes for this procedure
      procBreakdown.patientOwes =
        procBreakdown.deductible + procBreakdown.copay + procBreakdown.coinsurance;

      totalPatientOwes += procBreakdown.patientOwes;
      totalInsurancePays += insurancePaysForProc;

      responsibility.breakdownByProcedure.push(procBreakdown);
    }

    // Step 5: Apply out-of-network penalty
    if (benefits.networkStatus === 'out_of_network') {
      // Typically 20-40% penalty for out-of-network
      const penalty = totalPatientOwes * 0.3; // 30% penalty
      responsibility.outOfNetworkPenalty = penalty;
      totalPatientOwes += penalty;
    }

    // Step 6: Check out-of-pocket maximum
    if (benefits.outOfPocketMax) {
      const oopRemaining = benefits.outOfPocketMax.individualRemaining || Infinity;

      if (totalPatientOwes > oopRemaining) {
        // Patient only pays up to OOP max
        const excessAmount = totalPatientOwes - oopRemaining;
        totalInsurancePays += excessAmount;
        totalPatientOwes = oopRemaining;
      }
    }

    // Set final amounts
    responsibility.estimatedTotal = Math.round(totalPatientOwes * 100) / 100;

    // Calculate estimate range (±20% for uncertainty)
    responsibility.minimumEstimate = Math.round(responsibility.estimatedTotal * 0.8 * 100) / 100;
    responsibility.maximumEstimate = Math.round(responsibility.estimatedTotal * 1.2 * 100) / 100;

    estimate.patientResponsibility = responsibility;
    estimate.insurancePayment = {
      primaryInsuranceEstimate: Math.round(totalInsurancePays * 100) / 100,
      totalInsuranceEstimate: Math.round(totalInsurancePays * 100) / 100,
    };

    // Set confidence level based on data completeness
    this.setConfidenceLevel(estimate);
  }

  /**
   * Set confidence level based on available data
   */
  setConfidenceLevel(estimate) {
    let score = 0;
    const factors = [];
    const assumptions = [];

    // Eligibility verified (+30)
    if (estimate.eligibilityVerification?.verified) {
      score += 30;
      factors.push('Real-time eligibility verification');
    } else {
      assumptions.push('Benefits not verified in real-time');
    }

    // Allowed amounts known (+25)
    const hasAllowedAmounts = estimate.procedureCodes.every((p) => p.allowedAmount);
    if (hasAllowedAmounts) {
      score += 25;
      factors.push('Insurance allowed amounts known');
    } else {
      assumptions.push('Using standard charge amounts, not contracted rates');
    }

    // Deductible info complete (+20)
    if (estimate.benefits.deductible?.individualRemaining !== undefined) {
      score += 20;
      factors.push('Current deductible status known');
    } else {
      assumptions.push('Deductible status estimated');
    }

    // Network status known (+15)
    if (estimate.benefits.networkStatus && estimate.benefits.networkStatus !== 'unknown') {
      score += 15;
      factors.push('Provider network status confirmed');
    } else {
      assumptions.push('Network status unknown');
    }

    // Prior auth status (+10)
    if (!estimate.benefits.requiresPriorAuth || estimate.benefits.priorAuthStatus === 'approved') {
      score += 10;
      factors.push('No prior authorization issues');
    } else if (
      estimate.benefits.requiresPriorAuth &&
      estimate.benefits.priorAuthStatus !== 'approved'
    ) {
      assumptions.push('Prior authorization required - may affect coverage');
    }

    // Set confidence level
    if (score >= 80) {
      estimate.accuracy.confidenceLevel = 'high';
    } else if (score >= 50) {
      estimate.accuracy.confidenceLevel = 'medium';
    } else {
      estimate.accuracy.confidenceLevel = 'low';
    }

    estimate.accuracy.accuracyScore = score;
    estimate.accuracy.factors = factors;
    estimate.accuracy.assumptions = assumptions;

    // Standard disclaimers
    estimate.accuracy.disclaimers = [
      'This is an estimate only. Actual costs may vary.',
      'Estimate based on information available at time of calculation.',
      'Additional services ordered during your visit may result in additional charges.',
      'This estimate does not include charges from other providers (e.g., anesthesiologist, radiologist).',
      'Insurance benefits are subject to verification and may change.',
    ];

    if (estimate.benefits.networkStatus === 'out_of_network') {
      estimate.accuracy.disclaimers.push(
        'Out-of-network services may result in higher out-of-pocket costs.'
      );
    }
  }

  /**
   * Recalculate estimate with updated benefits
   */
  async recalculateEstimate(estimateId, updatedBenefits, userId) {
    try {
      const estimate = await PatientResponsibilityEstimate.findById(estimateId);

      if (!estimate) {
        throw new NotFoundError('Estimate not found');
      }

      // Update benefits
      estimate.benefits = {
        ...estimate.benefits,
        ...updatedBenefits,
      };

      // Recalculate
      await this.calculatePatientResponsibility(estimate);

      estimate.workflow.lastModifiedBy = userId;
      await estimate.save();

      logger.info('Estimate recalculated', {
        estimateId,
        estimateNumber: estimate.estimateNumber,
        newEstimate: estimate.patientResponsibility.estimatedTotal,
        userId,
      });

      return estimate;
    } catch (error) {
      logger.error('Failed to recalculate estimate', {
        error: error.message,
        estimateId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Compare estimate to actual claim
   */
  async compareToActual(estimateId, claimData) {
    try {
      const estimate = await PatientResponsibilityEstimate.findById(estimateId);

      if (!estimate) {
        throw new NotFoundError('Estimate not found');
      }

      // Link actual data
      estimate.linkActualClaim(claimData);

      // Calculate accuracy score
      estimate.calculateAccuracyScore();

      await estimate.save();

      logger.info('Estimate compared to actual', {
        estimateId,
        estimateNumber: estimate.estimateNumber,
        estimated: estimate.patientResponsibility.estimatedTotal,
        actual: claimData.patientResponsibility,
        variance: estimate.actual.variance,
        accuracyScore: estimate.accuracy.accuracyScore,
      });

      return estimate;
    } catch (error) {
      logger.error('Failed to compare estimate to actual', {
        error: error.message,
        estimateId,
      });
      throw error;
    }
  }

  /**
   * Get estimate for patient and service
   */
  async getEstimateForService(patientId, serviceData) {
    try {
      // Look for existing valid estimate
      const existing = await PatientResponsibilityEstimate.findOne({
        patient: patientId,
        'serviceInfo.serviceType': serviceData.serviceType,
        'validityPeriod.isExpired': false,
        'validityPeriod.validUntil': { $gte: new Date() },
        status: { $in: ['verified', 'provided_to_patient', 'accepted'] },
      }).sort({ createdAt: -1 });

      if (existing) {
        return existing;
      }

      return null;
    } catch (error) {
      logger.error('Failed to get estimate for service', {
        error: error.message,
        patientId,
        serviceData,
      });
      throw error;
    }
  }

  /**
   * Generate estimate summary for patient
   */
  async generatePatientSummary(patientId) {
    try {
      const [allEstimates, validEstimates, totalEstimatedCosts, averageEstimate] =
        await Promise.all([
          PatientResponsibilityEstimate.countDocuments({ patient: patientId }),
          PatientResponsibilityEstimate.countDocuments({
            patient: patientId,
            'validityPeriod.isExpired': false,
          }),
          PatientResponsibilityEstimate.aggregate([
            { $match: { patient: patientId, 'validityPeriod.isExpired': false } },
            {
              $group: {
                _id: null,
                total: { $sum: '$patientResponsibility.estimatedTotal' },
              },
            },
          ]),
          PatientResponsibilityEstimate.aggregate([
            { $match: { patient: patientId } },
            {
              $group: {
                _id: null,
                avg: { $avg: '$patientResponsibility.estimatedTotal' },
              },
            },
          ]),
        ]);

      const recentEstimates = await PatientResponsibilityEstimate.getForPatient(patientId, {
        limit: 10,
        validOnly: false,
      });

      return {
        patientId,
        summary: {
          totalEstimates: allEstimates,
          validEstimates,
          totalEstimatedCosts: totalEstimatedCosts[0]?.total || 0,
          averageEstimate: averageEstimate[0]?.avg || 0,
        },
        recentEstimates,
      };
    } catch (error) {
      logger.error('Failed to generate patient summary', {
        error: error.message,
        patientId,
      });
      throw error;
    }
  }

  /**
   * Bulk create estimates from fee schedule
   */
  async bulkCreateEstimates(data, userId) {
    const results = [];

    for (const estimateData of data.estimates) {
      try {
        const estimate = await this.createEstimate(estimateData, userId);
        results.push({
          success: true,
          estimateId: estimate._id,
          estimateNumber: estimate.estimateNumber,
        });
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          data: estimateData,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    logger.info('Bulk estimates created', {
      total: data.estimates.length,
      successful: successCount,
      failed: data.estimates.length - successCount,
      userId,
    });

    return {
      total: data.estimates.length,
      successful: successCount,
      failed: data.estimates.length - successCount,
      results,
    };
  }

  /**
   * Update expired estimates
   */
  async updateExpiredEstimates() {
    try {
      const result = await PatientResponsibilityEstimate.updateMany(
        {
          'validityPeriod.validUntil': { $lt: new Date() },
          'validityPeriod.isExpired': false,
        },
        {
          $set: {
            'validityPeriod.isExpired': true,
            status: 'expired',
          },
        }
      );

      logger.info('Expired estimates updated', {
        count: result.modifiedCount,
      });

      return { count: result.modifiedCount };
    } catch (error) {
      logger.error('Failed to update expired estimates', {
        error: error.message,
      });
      throw error;
    }
  }
}

// Singleton instance
const costEstimationService = new CostEstimationService();

module.exports = {
  CostEstimationService,
  costEstimationService,
};
