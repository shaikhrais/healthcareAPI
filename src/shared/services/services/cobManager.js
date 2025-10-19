
const COBRecord = require('../models/COBRecord');
const { logger } = require('../utils/logger');
const { BadRequestError, NotFoundError } = require('../utils/errors');
/**
 * COB Manager Service
 *
 * Comprehensive coordination of benefits management
 */

/**
 * COB Rules Implementation
 */
class COBRulesEngine {
  /**
   * Self-Coverage Rule
   * Patient's own coverage is always primary
   */
  static applySelfCoverageRule(plans) {
    const selfPlan = plans.findIndex((p) => p.relationshipToInsured === 'self');

    if (selfPlan !== -1) {
      return {
        rule: 'self_coverage',
        ruleDescription: "Patient's own coverage is primary",
        primaryIndex: selfPlan,
        confidence: 'high',
        reasoning:
          'Coverage where patient is the insured is always primary over coverage where patient is a dependent',
      };
    }

    return null;
  }

  /**
   * Birthday Rule (NAIC Model)
   * For dependent children with two working parents
   */
  static applyBirthdayRule(plans, patientInfo) {
    // Only applies to dependent children
    const dependentPlans = plans.filter((p) => p.relationshipToInsured === 'child');

    if (dependentPlans.length < 2) {
      return null;
    }

    // Sort by parent birthday (month and day only)
    const sortedPlans = [...dependentPlans].sort((a, b) => {
      const dobA = new Date(a.insured.dateOfBirth);
      const dobB = new Date(b.insured.dateOfBirth);

      // Compare month
      if (dobA.getMonth() !== dobB.getMonth()) {
        return dobA.getMonth() - dobB.getMonth();
      }

      // Compare day
      if (dobA.getDate() !== dobB.getDate()) {
        return dobA.getDate() - dobB.getDate();
      }

      // Same birthday - alphabetical by last name
      return (a.insured.lastName || '').localeCompare(b.insured.lastName || '');
    });

    const primaryIndex = plans.indexOf(sortedPlans[0]);

    return {
      rule: 'birthday_rule',
      ruleDescription: 'Parent with earlier birthday is primary',
      primaryIndex,
      confidence: 'high',
      reasoning: `${sortedPlans[0].insured.firstName} ${sortedPlans[0].insured.lastName}'s birthday (${new Date(sortedPlans[0].insured.dateOfBirth).toLocaleDateString()}) is earlier in the calendar year`,
    };
  }

  /**
   * Active/Inactive Rule
   * Active employment coverage is primary over retired/COBRA
   */
  static applyActiveInactiveRule(plans) {
    const employmentStatus = ['active', 'retired', 'cobra', 'disabled', 'unemployed'];

    const sortedPlans = [...plans].sort((a, b) => {
      const statusA = employmentStatus.indexOf(a.insured?.employmentStatus || 'unemployed');
      const statusB = employmentStatus.indexOf(b.insured?.employmentStatus || 'unemployed');
      return statusA - statusB;
    });

    const primaryIndex = plans.indexOf(sortedPlans[0]);

    // Only return if there's a clear difference
    if (
      sortedPlans[0].insured?.employmentStatus === 'active' &&
      sortedPlans[1]?.insured?.employmentStatus !== 'active'
    ) {
      return {
        rule: 'active_inactive',
        ruleDescription: 'Active employment coverage is primary',
        primaryIndex,
        confidence: 'high',
        reasoning: `Active employment coverage takes priority over ${sortedPlans[1]?.insured?.employmentStatus || 'inactive'} coverage`,
      };
    }

    return null;
  }

  /**
   * Medicare Working Aged Rule
   * For patients under 65 who are working
   */
  static applyMedicareWorkingAgedRule(plans, patientInfo) {
    const age = this.calculateAge(patientInfo.dateOfBirth);

    if (age >= 65) {
      return null;
    }

    const medicarePlan = plans.findIndex((p) => p.coverageType === 'medicare');
    const employerPlan = plans.findIndex(
      (p) => p.coverageType === 'commercial' && p.insured?.employmentStatus === 'active'
    );

    if (medicarePlan !== -1 && employerPlan !== -1) {
      return {
        rule: 'medicare_working_aged',
        ruleDescription: 'Employer coverage is primary for working aged under 65',
        primaryIndex: employerPlan,
        confidence: 'high',
        reasoning: `Patient is ${age} years old and working. Employer coverage is primary over Medicare.`,
      };
    }

    return null;
  }

  /**
   * Medicare ESRD Rule
   * First 30 months employer is primary, after that Medicare is primary
   */
  static applyMedicareESRDRule(plans, patientInfo, esrdStartDate) {
    if (!esrdStartDate) {
      return null;
    }

    const monthsSinceESRD = this.monthsBetween(esrdStartDate, new Date());
    const medicarePlan = plans.findIndex((p) => p.coverageType === 'medicare');
    const employerPlan = plans.findIndex((p) => p.coverageType === 'commercial');

    if (medicarePlan === -1 || employerPlan === -1) {
      return null;
    }

    if (monthsSinceESRD <= 30) {
      return {
        rule: 'medicare_esrd',
        ruleDescription: 'Employer coverage is primary for first 30 months of ESRD',
        primaryIndex: employerPlan,
        confidence: 'high',
        reasoning: `${monthsSinceESRD} months since ESRD diagnosis. Employer coverage is primary for first 30 months.`,
      };
    }
    return {
      rule: 'medicare_esrd',
      ruleDescription: 'Medicare is primary after 30 months of ESRD',
      primaryIndex: medicarePlan,
      confidence: 'high',
      reasoning: `${monthsSinceESRD} months since ESRD diagnosis. Medicare becomes primary after 30 months.`,
    };
  }

  /**
   * Medicare Disabled Rule
   * For disabled patients under 65
   */
  static applyMedicareDisabledRule(plans, patientInfo) {
    const age = this.calculateAge(patientInfo.dateOfBirth);

    if (age >= 65) {
      return null;
    }

    const medicarePlan = plans.findIndex((p) => p.coverageType === 'medicare');
    const employerPlan = plans.findIndex(
      (p) => p.coverageType === 'commercial' && p.insured?.employmentStatus === 'active'
    );

    if (medicarePlan === -1 || employerPlan === -1) {
      return null;
    }

    // If large employer (100+ employees), employer coverage is primary
    return {
      rule: 'medicare_disabled',
      ruleDescription: 'Employer coverage is primary for disabled under 65 (if large employer)',
      primaryIndex: employerPlan,
      confidence: 'medium',
      reasoning:
        'If employer has 100+ employees, employer coverage is primary. Verify employer size.',
    };
  }

  /**
   * Court Order Rule
   * Court-ordered coverage takes precedence
   */
  static applyCourtOrderRule(plans, courtOrderInfo) {
    if (!courtOrderInfo || !courtOrderInfo.orderedPayerIndex) {
      return null;
    }

    return {
      rule: 'court_order',
      ruleDescription: 'Court-ordered coverage is primary',
      primaryIndex: courtOrderInfo.orderedPayerIndex,
      confidence: 'high',
      reasoning: 'Court order specifies this coverage as primary',
    };
  }

  /**
   * Custodial Parent Rule
   * For divorced parents with children
   */
  static applyCustodialParentRule(plans, custodialParentInfo) {
    if (!custodialParentInfo || !custodialParentInfo.custodialParentIndex) {
      return null;
    }

    return {
      rule: 'custodial_parent',
      ruleDescription: "Custodial parent's coverage is primary",
      primaryIndex: custodialParentInfo.custodialParentIndex,
      confidence: 'high',
      reasoning: 'Coverage of parent with custody is primary',
    };
  }

  /**
   * Calculate age from date of birth
   */
  static calculateAge(dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age -= 1;
    }

    return age;
  }

  /**
   * Calculate months between two dates
   */
  static monthsBetween(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  }
}

/**
 * COB Manager
 */
class COBManager {
  /**
   * Determine COB order for multiple insurance plans
   */
  async determineCOBOrder(plans, patientInfo, specialSituations = {}) {
    const decisions = [];
    let primaryIndex = -1;

    // Apply rules in priority order
    const rules = [
      // 1. Self-coverage (highest priority)
      COBRulesEngine.applySelfCoverageRule(plans),

      // 2. Court order
      COBRulesEngine.applyCourtOrderRule(plans, specialSituations.courtOrder),

      // 3. Custodial parent
      COBRulesEngine.applyCustodialParentRule(plans, specialSituations.custodialParent),

      // 4. Medicare ESRD
      COBRulesEngine.applyMedicareESRDRule(plans, patientInfo, specialSituations.esrdStartDate),

      // 5. Medicare working aged
      COBRulesEngine.applyMedicareWorkingAgedRule(plans, patientInfo),

      // 6. Medicare disabled
      COBRulesEngine.applyMedicareDisabledRule(plans, patientInfo),

      // 7. Active/Inactive
      COBRulesEngine.applyActiveInactiveRule(plans),

      // 8. Birthday rule (for dependent children)
      COBRulesEngine.applyBirthdayRule(plans, patientInfo),
    ];

    // Find first applicable rule
    const applicableRule = rules.find((r) => r !== null);

    if (applicableRule) {
      primaryIndex = applicableRule.primaryIndex;
      decisions.push(applicableRule);
    } else {
      // Default: use order provided
      primaryIndex = 0;
      decisions.push({
        rule: 'coordination_provision',
        ruleDescription: 'Default order based on plan provisions',
        primaryIndex: 0,
        confidence: 'low',
        reasoning: 'No specific COB rule applied. Using default order. Manual review recommended.',
      });
    }

    // Build COB order
    const cobOrder = [];
    let priority = 1;

    // Add primary
    cobOrder.push({
      planIndex: primaryIndex,
      priority: priority += 1,
      payerId: plans[primaryIndex].payerId,
      policyNumber: plans[primaryIndex].policyNumber,
    });

    // Add remaining plans
    for (let i = 0; i < plans.length; i += 1) {
      if (i !== primaryIndex) {
        cobOrder.push({
          planIndex: i,
          priority: priority += 1,
          payerId: plans[i].payerId,
          policyNumber: plans[i].policyNumber,
        });
      }
    }

    return {
      cobOrder,
      decisions,
      primaryIndex,
    };
  }

  /**
   * Create COB record
   */
  async createCOBRecord(patientId, insurancePlans, serviceDate, userId, options = {}) {
    const { specialSituations = {}, patientInfo, autoVerify = false } = options;

    // Validate plans
    if (!insurancePlans || insurancePlans.length === 0) {
      throw new BadRequestError('At least one insurance plan is required');
    }

    if (insurancePlans.length > 10) {
      throw new BadRequestError('Maximum 10 insurance plans allowed');
    }

    // Determine COB order
    const cobResult = await this.determineCOBOrder(
      insurancePlans,
      patientInfo || { dateOfBirth: new Date() },
      specialSituations
    );

    // Check for conflicts
    const conflicts = await this.detectConflicts(insurancePlans, cobResult);

    // Create record
    const cobRecord = new COBRecord({
      patient: patientId,
      serviceDate: serviceDate || new Date(),
      insurancePlans,
      cobOrder: cobResult.cobOrder,
      decisions: cobResult.decisions,
      primaryDecision: {
        planIndex: cobResult.primaryIndex,
        rule: cobResult.decisions[0]?.rule,
        appliedAt: new Date(),
      },
      status: conflicts.length > 0 ? 'conflict' : 'active',
      conflicts,
      specialSituations: specialSituations.list || [],
      createdBy: userId,
      effectiveDate: serviceDate || new Date(),
    });

    await cobRecord.save();

    logger.info('COB record created', {
      patientId,
      cobRecordId: cobRecord._id,
      plansCount: insurancePlans.length,
      primaryRule: cobResult.decisions[0]?.rule,
      conflicts: conflicts.length,
      userId,
    });

    return cobRecord;
  }

  /**
   * Update COB record
   */
  async updateCOBRecord(cobRecordId, updates, userId) {
    const cobRecord = await COBRecord.findById(cobRecordId);

    if (!cobRecord) {
      throw new NotFoundError('COB record', cobRecordId);
    }

    const { insurancePlans, serviceDate, specialSituations, patientInfo } = updates;

    // If plans changed, redetermine COB
    if (insurancePlans) {
      const cobResult = await this.determineCOBOrder(
        insurancePlans,
        patientInfo || { dateOfBirth: new Date() },
        specialSituations || {}
      );

      cobRecord.insurancePlans = insurancePlans;
      cobRecord.updateCOBOrder(cobResult.cobOrder, cobResult.decisions[0], userId);

      // Re-check conflicts
      const conflicts = await this.detectConflicts(insurancePlans, cobResult);
      cobRecord.conflicts = conflicts;
      cobRecord.status = conflicts.length > 0 ? 'conflict' : 'active';
    }

    if (serviceDate) {
      cobRecord.serviceDate = serviceDate;
    }

    cobRecord.updatedBy = userId;
    cobRecord.auditTrail.push({
      action: 'updated',
      performedBy: userId,
      changes: updates,
    });

    await cobRecord.save();

    logger.info('COB record updated', {
      cobRecordId,
      userId,
    });

    return cobRecord;
  }

  /**
   * Detect conflicts in COB
   */
  async detectConflicts(plans, cobResult) {
    const conflicts = [];

    // Check for date overlaps
    for (let i = 0; i < plans.length; i += 1) {
      for (let j = i + 1; j < plans.length; j += 1) {
        if (this.hasDateOverlap(plans[i], plans[j])) {
          // Date overlap is normal, but flag if both claim to be primary
          if (plans[i].priority === 1 && plans[j].priority === 1) {
            conflicts.push({
              type: 'multiple_primary',
              description: `Both ${plans[i].payerName} and ${plans[j].payerName} marked as primary`,
              severity: 'critical',
            });
          }
        }
      }
    }

    // Check for missing information
    for (const plan of plans) {
      if (plan.relationshipToInsured === 'child' && !plan.insured?.dateOfBirth) {
        conflicts.push({
          type: 'missing_information',
          description: `Missing insured date of birth for ${plan.payerName}`,
          severity: 'high',
        });
      }

      if (!plan.effectiveDate) {
        conflicts.push({
          type: 'missing_information',
          description: `Missing effective date for ${plan.payerName}`,
          severity: 'medium',
        });
      }
    }

    // Check for low confidence decisions
    if (cobResult.decisions[0]?.confidence === 'low') {
      conflicts.push({
        type: 'rule_conflict',
        description: 'COB order determined with low confidence. Manual review recommended.',
        severity: 'medium',
      });
    }

    return conflicts;
  }

  /**
   * Check if two plans have date overlap
   */
  hasDateOverlap(plan1, plan2) {
    const start1 = plan1.effectiveDate ? new Date(plan1.effectiveDate) : new Date(0);
    const end1 = plan1.terminationDate ? new Date(plan1.terminationDate) : new Date(9999, 11, 31);
    const start2 = plan2.effectiveDate ? new Date(plan2.effectiveDate) : new Date(0);
    const end2 = plan2.terminationDate ? new Date(plan2.terminationDate) : new Date(9999, 11, 31);

    return start1 <= end2 && start2 <= end1;
  }

  /**
   * Verify COB with insurance payers
   */
  async verifyCOB(cobRecordId, method, userId) {
    const cobRecord = await COBRecord.findById(cobRecordId);

    if (!cobRecord) {
      throw new NotFoundError('COB record', cobRecordId);
    }

    // In production, this would call eligibility verification APIs
    // For now, mark as manually verified
    cobRecord.verify(method, 'verified', 'Verified via ' + method, userId);

    await cobRecord.save();

    logger.info('COB verified', {
      cobRecordId,
      method,
      userId,
    });

    return cobRecord;
  }

  /**
   * Get COB for patient and service date
   */
  async getCOBForPatient(patientId, serviceDate = new Date()) {
    const cobRecord = await COBRecord.getActiveForPatient(patientId, serviceDate);

    if (!cobRecord) {
      return null;
    }

    // Check if verification is stale
    const daysStale = 90;
    const lastVerified = cobRecord.verification?.lastVerified;

    if (!lastVerified || this.daysBetween(lastVerified, new Date()) > daysStale) {
      cobRecord.status = 'pending_verification';
      await cobRecord.save();
    }

    return cobRecord;
  }

  /**
   * Calculate days between dates
   */
  daysBetween(date1, date2) {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round(Math.abs((new Date(date1) - new Date(date2)) / oneDay));
  }

  /**
   * Get COB summary for patient
   */
  async getCOBSummary(patientId) {
    const allRecords = await COBRecord.getAllForPatient(patientId);
    const current = await COBRecord.getActiveForPatient(patientId);

    return {
      current,
      totalRecords: allRecords.length,
      hasConflicts: current?.hasConflicts || false,
      needsVerification: current?.status === 'pending_verification',
      history: allRecords.slice(0, 10), // Last 10 records
    };
  }

  /**
   * Get records needing attention
   */
  async getRecordsNeedingAttention() {
    const [conflicts, needingVerification] = await Promise.all([
      COBRecord.getWithConflicts(),
      COBRecord.getNeedingVerification(90),
    ]);

    return {
      conflicts,
      needingVerification,
      total: conflicts.length + needingVerification.length,
    };
  }
}

// Singleton instance
const cobManager = new COBManager();

module.exports = {
  COBManager,
  cobManager,
  COBRulesEngine,
};
