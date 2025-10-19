
const Claim = require('../models/Claim');
const { logger } = require('../utils/logger');
const { BadRequestError, NotFoundError } = require('../utils/errors');
/**
 * Secondary Claim Generator Service
 *
 * Handles generation of secondary claims after primary insurance payment
 */

/**
 * COB (Coordination of Benefits) Rules
 */
const COBRules = {
  /**
   * Birthday Rule - Determines primary/secondary for dependent children
   * Parent with earlier birthday in the year is primary
   */
  birthdayRule(parent1DOB, parent2DOB) {
    const date1 = new Date(parent1DOB);
    const date2 = new Date(parent2DOB);

    // Compare month and day only
    const month1 = date1.getMonth();
    const day1 = date1.getDate();
    const month2 = date2.getMonth();
    const day2 = date2.getDate();

    if (month1 < month2) return 'parent1';
    if (month1 > month2) return 'parent2';
    if (day1 < day2) return 'parent1';
    if (day1 > day2) return 'parent2';

    // If same birthday, alphabetical by last name
    return 'equal';
  },

  /**
   * Gender Rule (less common, being phased out)
   * Male parent is primary
   */
  genderRule(parent1Gender, parent2Gender) {
    if (parent1Gender === 'M' && parent2Gender !== 'M') return 'parent1';
    if (parent2Gender === 'M' && parent1Gender !== 'M') return 'parent2';
    return 'equal';
  },

  /**
   * Active/Inactive Rule
   * Active coverage is primary over retired/COBRA
   */
  activeRule(insurance1Active, insurance2Active) {
    if (insurance1Active && !insurance2Active) return 'insurance1';
    if (insurance2Active && !insurance1Active) return 'insurance2';
    return 'equal';
  },

  /**
   * Medicare Rules
   * Medicare is typically secondary to employer group coverage for working aged
   */
  medicareRule(insurance1Type, insurance2Type, patientAge, isWorking) {
    const isMedicare1 = insurance1Type === 'MEDICARE';
    const isMedicare2 = insurance2Type === 'MEDICARE';

    // If patient is working and under 65, employer coverage is primary
    if (patientAge < 65 && isWorking) {
      if (isMedicare1 && !isMedicare2) return 'insurance2';
      if (isMedicare2 && !isMedicare1) return 'insurance1';
    }

    // If 65 or older and working with employer coverage (20+ employees)
    if (patientAge >= 65 && isWorking) {
      if (isMedicare1 && !isMedicare2) return 'insurance2';
      if (isMedicare2 && !isMedicare1) return 'insurance1';
    }

    return 'equal';
  },
};

/**
 * Secondary Claim Generator
 */
class SecondaryClaimGenerator {
  /**
   * Generate secondary claim from primary claim
   */
  async generateSecondaryClaim(primaryClaimId, primaryPaymentData, options = {}) {
    const { userId, autoSubmit = false, attachEOB = true } = options;

    // Get primary claim
    const primaryClaim = await Claim.findById(primaryClaimId);

    if (!primaryClaim) {
      throw new NotFoundError('Primary claim', primaryClaimId);
    }

    // Validate primary claim has secondary insurance
    if (!primaryClaim.secondaryInsurance?.hasSecondary) {
      throw new BadRequestError('Primary claim does not have secondary insurance');
    }

    // Validate primary claim is paid
    if (primaryClaim.status !== 'paid') {
      throw new BadRequestError('Primary claim must be paid before generating secondary claim');
    }

    // Check if secondary claim already exists
    if (primaryClaim.cob.secondaryClaimId) {
      const existingSecondary = await Claim.findById(primaryClaim.cob.secondaryClaimId);
      if (existingSecondary) {
        throw new BadRequestError('Secondary claim already exists for this primary claim');
      }
    }

    // Calculate amounts for secondary claim
    const secondaryAmounts = this.calculateSecondaryAmounts(primaryClaim, primaryPaymentData);

    // Create secondary claim
    const secondaryClaim = await this.createSecondaryClaimFromPrimary(
      primaryClaim,
      secondaryAmounts,
      primaryPaymentData,
      userId
    );

    // Update primary claim with secondary reference
    primaryClaim.cob.secondaryClaimId = secondaryClaim._id;
    primaryClaim.cob.secondaryFilingDate = new Date();
    primaryClaim.cob.primaryPayment = {
      amount: primaryPaymentData.amount,
      date: primaryPaymentData.date || new Date(),
      eobReceived: true,
      eobDocument: primaryPaymentData.eobDocument,
    };
    await primaryClaim.save();

    logger.info('Secondary claim generated', {
      primaryClaimId: primaryClaim._id,
      primaryClaimNumber: primaryClaim.claimNumber,
      secondaryClaimId: secondaryClaim._id,
      secondaryClaimNumber: secondaryClaim.claimNumber,
      totalCharges: secondaryAmounts.totalCharges,
      primaryPaid: secondaryAmounts.primaryPaid,
      remainingBalance: secondaryAmounts.remainingBalance,
      userId,
    });

    return {
      secondaryClaim,
      primaryClaim,
      amounts: secondaryAmounts,
    };
  }

  /**
   * Calculate amounts for secondary claim
   */
  calculateSecondaryAmounts(primaryClaim, primaryPaymentData) {
    const { totalCharges } = primaryClaim;
    const primaryPaid = primaryPaymentData.amount || 0;
    const primaryAdjustments = primaryPaymentData.adjustments || [];

    // Calculate primary adjustments total
    const primaryAdjustmentsTotal = primaryAdjustments.reduce(
      (sum, adj) => sum + (adj.amount || 0),
      0
    );

    // Calculate allowed amount (charges - contractual adjustments)
    const allowedAmount = totalCharges - Math.abs(primaryAdjustmentsTotal);

    // Calculate patient responsibility from primary
    const patientResponsibilityFromPrimary = primaryPaymentData.patientResponsibility || 0;

    // Calculate balance to submit to secondary
    // This is: allowed amount - primary paid
    const remainingBalance = allowedAmount - primaryPaid;

    // Secondary claim charges (usually the patient responsibility from primary)
    const secondaryCharges = Math.max(0, remainingBalance);

    return {
      totalCharges,
      primaryPaid,
      primaryAdjustments: primaryAdjustmentsTotal,
      allowedAmount,
      patientResponsibilityFromPrimary,
      remainingBalance,
      secondaryCharges,
    };
  }

  /**
   * Create secondary claim from primary claim
   */
  async createSecondaryClaimFromPrimary(primaryClaim, amounts, primaryPaymentData, userId) {
    // Copy primary claim data
    const secondaryData = {
      // Patient information (same as primary)
      patient: { ...primaryClaim.patient },

      // Provider information (same as primary)
      provider: { ...primaryClaim.provider },

      // Facility information (same as primary)
      facility: primaryClaim.facility ? { ...primaryClaim.facility } : undefined,

      // Use secondary insurance as primary insurance for this claim
      insurance: {
        payerId: primaryClaim.secondaryInsurance.payerId,
        payerName: primaryClaim.secondaryInsurance.payerName,
        policyNumber: primaryClaim.secondaryInsurance.policyNumber,
        groupNumber: primaryClaim.secondaryInsurance.groupNumber,
        planName: primaryClaim.secondaryInsurance.planName,
        relationshipToInsured: primaryClaim.secondaryInsurance.relationshipToInsured,
        insured: primaryClaim.secondaryInsurance.insured
          ? { ...primaryClaim.secondaryInsurance.insured }
          : undefined,
        coverageStart: primaryClaim.secondaryInsurance.coverageStart,
        coverageEnd: primaryClaim.secondaryInsurance.coverageEnd,
        timelyFilingLimit: primaryClaim.secondaryInsurance.timelyFilingLimit || 90,
      },

      // Service information (same as primary)
      serviceDate: primaryClaim.serviceDate,
      serviceDateEnd: primaryClaim.serviceDateEnd,
      placeOfService: primaryClaim.placeOfService,

      // Diagnosis codes (same as primary)
      diagnosisCodes: [...primaryClaim.diagnosisCodes],

      // Procedures (same as primary)
      procedures: primaryClaim.procedures.map((proc) => ({
        code: proc.code,
        description: proc.description,
        charge: proc.charge,
        units: proc.units,
        modifiers: proc.modifiers ? [...proc.modifiers] : [],
        diagnosisPointers: proc.diagnosisPointers ? [...proc.diagnosisPointers] : [],
        placeOfService: proc.placeOfService,
        serviceDate: proc.serviceDate,
      })),

      // Billing information
      totalCharges: amounts.secondaryCharges,
      amountPaid: 0,
      patientResponsibility: amounts.patientResponsibilityFromPrimary,

      // Authorization (same as primary if applicable)
      priorAuthNumber: primaryClaim.priorAuthNumber,
      referralNumber: primaryClaim.referralNumber,

      // Notes
      notes: `Secondary claim for primary claim ${primaryClaim.claimNumber}. Primary paid: $${amounts.primaryPaid}`,

      // COB information
      cob: {
        isPrimary: false,
        isSecondary: true,
        primaryClaimId: primaryClaim._id,
        primaryPayment: {
          amount: amounts.primaryPaid,
          date: primaryPaymentData.date || new Date(),
          eobReceived: true,
          eobDocument: primaryPaymentData.eobDocument,
        },
        patientResponsibilityFromPrimary: amounts.patientResponsibilityFromPrimary,
      },

      // Metadata
      createdBy: userId,
      metadata: {
        source: 'secondary_generation',
        version: 1,
        tags: ['secondary', 'cob'],
      },
    };

    // Remove secondary insurance from secondary claim
    secondaryData.secondaryInsurance = {
      hasSecondary: false,
    };

    // Create claim
    const secondaryClaim = new Claim(secondaryData);
    await secondaryClaim.save();

    return secondaryClaim;
  }

  /**
   * Batch generate secondary claims
   */
  async batchGenerateSecondaryClaims(primaryClaims, userId) {
    const results = {
      successful: [],
      failed: [],
      totalProcessed: 0,
    };

    for (const primaryClaim of primaryClaims) {
      results.totalProcessed += 1;

      try {
        // Check if already has secondary
        if (primaryClaim.cob.secondaryClaimId) {
          results.failed.push({
            primaryClaimId: primaryClaim._id,
            error: 'Secondary claim already exists',
          });
          continue;
        }

        // Check if has payment data
        if (!primaryClaim.cob.primaryPayment?.eobReceived) {
          results.failed.push({
            primaryClaimId: primaryClaim._id,
            error: 'Primary payment EOB not received',
          });
          continue;
        }

        // Generate secondary
        const result = await this.generateSecondaryClaim(
          primaryClaim._id,
          {
            amount: primaryClaim.amountPaid,
            date: primaryClaim.payment.receivedDate,
            patientResponsibility: primaryClaim.patientResponsibility,
            adjustments: primaryClaim.payment.adjustments,
            eobDocument: primaryClaim.cob.primaryPayment.eobDocument,
          },
          { userId }
        );

        results.successful.push({
          primaryClaimId: primaryClaim._id,
          primaryClaimNumber: primaryClaim.claimNumber,
          secondaryClaimId: result.secondaryClaim._id,
          secondaryClaimNumber: result.secondaryClaim.claimNumber,
          amounts: result.amounts,
        });
      } catch (error) {
        results.failed.push({
          primaryClaimId: primaryClaim._id,
          primaryClaimNumber: primaryClaim.claimNumber,
          error: error.message,
        });

        logger.error('Failed to generate secondary claim', {
          primaryClaimId: primaryClaim._id,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Determine COB order using standard rules
   */
  determineCOBOrder(patientInfo, insurance1, insurance2) {
    const results = [];

    // Self coverage is always primary for self
    if (insurance1.relationshipToInsured === 'self') {
      return { primary: insurance1, secondary: insurance2 };
    }
    if (insurance2.relationshipToInsured === 'self') {
      return { primary: insurance2, secondary: insurance1 };
    }

    // Birthday rule for dependent children
    if (insurance1.insured && insurance2.insured) {
      const birthdayResult = COBRules.birthdayRule(
        insurance1.insured.dateOfBirth,
        insurance2.insured.dateOfBirth
      );

      if (birthdayResult === 'parent1') {
        return { primary: insurance1, secondary: insurance2, rule: 'birthday' };
      }
      if (birthdayResult === 'parent2') {
        return { primary: insurance2, secondary: insurance1, rule: 'birthday' };
      }

      results.push({ rule: 'birthday', result: birthdayResult });
    }

    // Active/Inactive rule
    const activeResult = COBRules.activeRule(
      insurance1.isActive !== false,
      insurance2.isActive !== false
    );

    if (activeResult === 'insurance1') {
      return { primary: insurance1, secondary: insurance2, rule: 'active' };
    }
    if (activeResult === 'insurance2') {
      return { primary: insurance2, secondary: insurance1, rule: 'active' };
    }

    results.push({ rule: 'active', result: activeResult });

    // If unable to determine, use order provided
    return {
      primary: insurance1,
      secondary: insurance2,
      rule: 'default_order',
      notes: 'Unable to determine definitively, using provided order',
    };
  }

  /**
   * Validate secondary claim readiness
   */
  async validateSecondaryReadiness(primaryClaimId) {
    const primaryClaim = await Claim.findById(primaryClaimId);

    if (!primaryClaim) {
      return {
        ready: false,
        reason: 'Primary claim not found',
      };
    }

    const validations = [];

    // Check has secondary insurance
    if (!primaryClaim.secondaryInsurance?.hasSecondary) {
      validations.push({
        passed: false,
        check: 'has_secondary_insurance',
        message: 'No secondary insurance on file',
      });
    } else {
      validations.push({
        passed: true,
        check: 'has_secondary_insurance',
      });
    }

    // Check primary claim is paid
    if (primaryClaim.status !== 'paid') {
      validations.push({
        passed: false,
        check: 'primary_paid',
        message: 'Primary claim not yet paid',
      });
    } else {
      validations.push({
        passed: true,
        check: 'primary_paid',
      });
    }

    // Check EOB received
    if (!primaryClaim.cob.primaryPayment?.eobReceived) {
      validations.push({
        passed: false,
        check: 'eob_received',
        message: 'Primary EOB not received',
      });
    } else {
      validations.push({
        passed: true,
        check: 'eob_received',
      });
    }

    // Check secondary not already filed
    if (primaryClaim.cob.secondaryClaimId) {
      validations.push({
        passed: false,
        check: 'secondary_not_filed',
        message: 'Secondary claim already filed',
      });
    } else {
      validations.push({
        passed: true,
        check: 'secondary_not_filed',
      });
    }

    // Check timely filing for secondary
    const secondaryTimelyFiling = primaryClaim.secondaryInsurance.timelyFilingLimit || 90;
    const daysSincePrimaryPayment = primaryClaim.cob.primaryPayment?.date
      ? Math.floor(
          (Date.now() - new Date(primaryClaim.cob.primaryPayment.date).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0;

    const withinTimelyFiling = daysSincePrimaryPayment <= secondaryTimelyFiling;

    validations.push({
      passed: withinTimelyFiling,
      check: 'timely_filing',
      message: withinTimelyFiling
        ? `Within timely filing (${daysSincePrimaryPayment}/${secondaryTimelyFiling} days)`
        : `Past timely filing (${daysSincePrimaryPayment}/${secondaryTimelyFiling} days)`,
      daysRemaining: Math.max(0, secondaryTimelyFiling - daysSincePrimaryPayment),
    });

    const allPassed = validations.every((v) => v.passed);

    return {
      ready: allPassed,
      validations,
      primaryClaim: {
        id: primaryClaim._id,
        claimNumber: primaryClaim.claimNumber,
        status: primaryClaim.status,
        amountPaid: primaryClaim.amountPaid,
      },
    };
  }

  /**
   * Get claims ready for secondary filing
   */
  async getReadyForSecondary() {
    return await Claim.getReadyForSecondary();
  }
}

// Singleton instance
const secondaryClaimGenerator = new SecondaryClaimGenerator();

module.exports = {
  SecondaryClaimGenerator,
  secondaryClaimGenerator,
  COBRules,
};
