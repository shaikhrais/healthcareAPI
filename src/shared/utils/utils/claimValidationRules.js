
const { logger } = require('./logger');
/**
 * Claim Validation Rules Engine
 *
 * Defines validation rules for insurance claim scrubbing
 */

/**
 * Validation Rule Severity Levels
 */
const SeverityLevel = {
  ERROR: 'error', // Must be fixed before submission
  WARNING: 'warning', // Should be reviewed but can submit
  INFO: 'info', // Informational only
};

/**
 * Rule Categories
 */
const RuleCategory = {
  PATIENT_INFO: 'patient_info',
  PROVIDER_INFO: 'provider_info',
  INSURANCE_INFO: 'insurance_info',
  DIAGNOSIS: 'diagnosis',
  PROCEDURE: 'procedure',
  BILLING: 'billing',
  DATES: 'dates',
  MODIFIERS: 'modifiers',
  AUTHORIZATION: 'authorization',
  COMPLIANCE: 'compliance',
};

/**
 * Base Validation Rule
 */
class ValidationRule {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.category = config.category;
    this.severity = config.severity;
    this.autoFixable = config.autoFixable || false;
    this.validate = config.validate;
    this.fix = config.fix || null;
    this.message = config.message;
  }

  /**
   * Execute validation
   */
  async execute(claim) {
    try {
      const result = await this.validate(claim);

      if (!result.valid) {
        return {
          ruleId: this.id,
          ruleName: this.name,
          category: this.category,
          severity: this.severity,
          valid: false,
          message: this.message(claim, result),
          autoFixable: this.autoFixable,
          field: result.field,
          value: result.value,
          expectedValue: result.expectedValue,
          details: result.details,
        };
      }

      return { ruleId: this.id, valid: true };
    } catch (error) {
      logger.error('Validation rule execution failed', {
        ruleId: this.id,
        error: error.message,
      });
      return {
        ruleId: this.id,
        valid: true, // Don't fail on rule errors
        error: error.message,
      };
    }
  }

  /**
   * Attempt to auto-fix issue
   */
  async autoFix(claim) {
    if (!this.autoFixable || !this.fix) {
      return { fixed: false, message: 'Auto-fix not available' };
    }

    try {
      const result = await this.fix(claim);
      return {
        fixed: true,
        changes: result.changes,
        message: result.message,
      };
    } catch (error) {
      return {
        fixed: false,
        message: `Auto-fix failed: ${error.message}`,
      };
    }
  }
}

/**
 * Patient Information Rules
 */
const patientInfoRules = [
  new ValidationRule({
    id: 'PI001',
    name: 'Patient Name Required',
    description: 'Patient first and last name are required',
    category: RuleCategory.PATIENT_INFO,
    severity: SeverityLevel.ERROR,
    validate: async (claim) => {
      const firstName = claim.patient?.firstName?.trim();
      const lastName = claim.patient?.lastName?.trim();

      if (!firstName || !lastName) {
        return {
          valid: false,
          field: 'patient.name',
          value: `${firstName || ''} ${lastName || ''}`.trim(),
          details: { firstName, lastName },
        };
      }

      return { valid: true };
    },
    message: (claim) => 'Patient first and last name are required',
  }),

  new ValidationRule({
    id: 'PI002',
    name: 'Patient DOB Required',
    description: 'Patient date of birth is required and must be valid',
    category: RuleCategory.PATIENT_INFO,
    severity: SeverityLevel.ERROR,
    validate: async (claim) => {
      const dob = claim.patient?.dateOfBirth;

      if (!dob) {
        return { valid: false, field: 'patient.dateOfBirth', value: null };
      }

      const dobDate = new Date(dob);
      if (isNaN(dobDate.getTime())) {
        return { valid: false, field: 'patient.dateOfBirth', value: dob };
      }

      // DOB cannot be in the future
      if (dobDate > new Date()) {
        return {
          valid: false,
          field: 'patient.dateOfBirth',
          value: dob,
          details: 'Date of birth cannot be in the future',
        };
      }

      return { valid: true };
    },
    message: (claim, result) => {
      if (!result.value) return 'Patient date of birth is required';
      if (result.details) return result.details;
      return 'Patient date of birth is invalid';
    },
  }),

  new ValidationRule({
    id: 'PI003',
    name: 'Patient Gender Required',
    description: 'Patient gender is required',
    category: RuleCategory.PATIENT_INFO,
    severity: SeverityLevel.ERROR,
    validate: async (claim) => {
      const gender = claim.patient?.gender;
      const validGenders = ['M', 'F', 'U', 'male', 'female', 'unknown'];

      if (!gender || !validGenders.includes(gender)) {
        return { valid: false, field: 'patient.gender', value: gender };
      }

      return { valid: true };
    },
    message: () => 'Patient gender is required (M, F, or U)',
  }),

  new ValidationRule({
    id: 'PI004',
    name: 'Patient Address Required',
    description: 'Patient address, city, state, and ZIP are required',
    category: RuleCategory.PATIENT_INFO,
    severity: SeverityLevel.ERROR,
    validate: async (claim) => {
      const address = claim.patient?.address;

      if (!address?.street || !address?.city || !address?.state || !address?.zipCode) {
        return {
          valid: false,
          field: 'patient.address',
          value: address,
          details: {
            street: !address?.street,
            city: !address?.city,
            state: !address?.state,
            zipCode: !address?.zipCode,
          },
        };
      }

      return { valid: true };
    },
    message: (claim, result) => {
      const missing = [];
      if (result.details?.street) missing.push('street');
      if (result.details?.city) missing.push('city');
      if (result.details?.state) missing.push('state');
      if (result.details?.zipCode) missing.push('ZIP code');
      return `Patient address missing: ${missing.join(', ')}`;
    },
  }),

  new ValidationRule({
    id: 'PI005',
    name: 'Valid ZIP Code Format',
    description: 'ZIP code must be 5 or 9 digits',
    category: RuleCategory.PATIENT_INFO,
    severity: SeverityLevel.WARNING,
    autoFixable: true,
    validate: async (claim) => {
      const zipCode = claim.patient?.address?.zipCode;

      if (zipCode) {
        const cleaned = zipCode.replace(/[^0-9]/g, '');
        if (cleaned.length !== 5 && cleaned.length !== 9) {
          return { valid: false, field: 'patient.address.zipCode', value: zipCode };
        }
      }

      return { valid: true };
    },
    fix: async (claim) => {
      const { zipCode } = claim.patient.address;
      const cleaned = zipCode.replace(/[^0-9]/g, '');

      // Format as XXXXX or XXXXX-XXXX
      let formatted = cleaned.slice(0, 5);
      if (cleaned.length === 9) {
        formatted += '-' + cleaned.slice(5);
      }

      claim.patient.address.zipCode = formatted;

      return {
        changes: { 'patient.address.zipCode': { from: zipCode, to: formatted } },
        message: `Formatted ZIP code: ${formatted}`,
      };
    },
    message: () => 'ZIP code must be 5 or 9 digits',
  }),
];

/**
 * Insurance Information Rules
 */
const insuranceInfoRules = [
  new ValidationRule({
    id: 'IN001',
    name: 'Insurance Policy Number Required',
    description: 'Insurance policy/member ID is required',
    category: RuleCategory.INSURANCE_INFO,
    severity: SeverityLevel.ERROR,
    validate: async (claim) => {
      const policyNumber = claim.insurance?.policyNumber?.trim();

      if (!policyNumber) {
        return { valid: false, field: 'insurance.policyNumber', value: policyNumber };
      }

      return { valid: true };
    },
    message: () => 'Insurance policy/member ID is required',
  }),

  new ValidationRule({
    id: 'IN002',
    name: 'Insurance Group Number',
    description: 'Group number may be required by some payers',
    category: RuleCategory.INSURANCE_INFO,
    severity: SeverityLevel.WARNING,
    validate: async (claim) => {
      const groupNumber = claim.insurance?.groupNumber;
      const payerId = claim.insurance?.payerId;

      // List of payers that require group numbers
      const requiresGroup = ['BCBS', 'AETNA', 'CIGNA', 'UHC'];

      if (!groupNumber && payerId && requiresGroup.includes(payerId)) {
        return {
          valid: false,
          field: 'insurance.groupNumber',
          value: groupNumber,
          details: { payerId },
        };
      }

      return { valid: true };
    },
    message: (claim) => `Group number may be required for ${claim.insurance?.payerId}`,
  }),

  new ValidationRule({
    id: 'IN003',
    name: 'Insurance Coverage Active',
    description: 'Service date must be within coverage period',
    category: RuleCategory.INSURANCE_INFO,
    severity: SeverityLevel.ERROR,
    validate: async (claim) => {
      const serviceDate = new Date(claim.serviceDate);
      const coverageStart = claim.insurance?.coverageStart
        ? new Date(claim.insurance.coverageStart)
        : null;
      const coverageEnd = claim.insurance?.coverageEnd
        ? new Date(claim.insurance.coverageEnd)
        : null;

      if (coverageStart && serviceDate < coverageStart) {
        return {
          valid: false,
          field: 'insurance.coverageStart',
          value: coverageStart,
          details: 'Service date is before coverage start date',
        };
      }

      if (coverageEnd && serviceDate > coverageEnd) {
        return {
          valid: false,
          field: 'insurance.coverageEnd',
          value: coverageEnd,
          details: 'Service date is after coverage end date',
        };
      }

      return { valid: true };
    },
    message: (claim, result) => result.details,
  }),

  new ValidationRule({
    id: 'IN004',
    name: 'Payer ID Required',
    description: 'Insurance payer ID is required',
    category: RuleCategory.INSURANCE_INFO,
    severity: SeverityLevel.ERROR,
    validate: async (claim) => {
      const payerId = claim.insurance?.payerId?.trim();

      if (!payerId) {
        return { valid: false, field: 'insurance.payerId', value: payerId };
      }

      return { valid: true };
    },
    message: () => 'Insurance payer ID is required',
  }),
];

/**
 * Provider Information Rules
 */
const providerInfoRules = [
  new ValidationRule({
    id: 'PR001',
    name: 'Provider NPI Required',
    description: 'Rendering provider NPI is required',
    category: RuleCategory.PROVIDER_INFO,
    severity: SeverityLevel.ERROR,
    validate: async (claim) => {
      const npi = claim.provider?.npi?.trim();

      if (!npi) {
        return { valid: false, field: 'provider.npi', value: npi };
      }

      // NPI must be 10 digits
      if (!/^\d{10}$/.test(npi)) {
        return {
          valid: false,
          field: 'provider.npi',
          value: npi,
          details: 'NPI must be 10 digits',
        };
      }

      return { valid: true };
    },
    message: (claim, result) => result.details || 'Provider NPI is required',
  }),

  new ValidationRule({
    id: 'PR002',
    name: 'Provider Tax ID Required',
    description: 'Provider tax ID (EIN) is required',
    category: RuleCategory.PROVIDER_INFO,
    severity: SeverityLevel.ERROR,
    validate: async (claim) => {
      const taxId = claim.provider?.taxId?.trim();

      if (!taxId) {
        return { valid: false, field: 'provider.taxId', value: taxId };
      }

      return { valid: true };
    },
    message: () => 'Provider tax ID is required',
  }),

  new ValidationRule({
    id: 'PR003',
    name: 'Valid Tax ID Format',
    description: 'Tax ID must be in format XX-XXXXXXX',
    category: RuleCategory.PROVIDER_INFO,
    severity: SeverityLevel.WARNING,
    autoFixable: true,
    validate: async (claim) => {
      const taxId = claim.provider?.taxId;

      if (taxId) {
        const cleaned = taxId.replace(/[^0-9]/g, '');
        if (cleaned.length !== 9) {
          return { valid: false, field: 'provider.taxId', value: taxId };
        }
      }

      return { valid: true };
    },
    fix: async (claim) => {
      const { taxId } = claim.provider;
      const cleaned = taxId.replace(/[^0-9]/g, '');
      const formatted = `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;

      claim.provider.taxId = formatted;

      return {
        changes: { 'provider.taxId': { from: taxId, to: formatted } },
        message: `Formatted tax ID: ${formatted}`,
      };
    },
    message: () => 'Tax ID should be formatted as XX-XXXXXXX',
  }),
];

/**
 * Diagnosis Code Rules
 */
const diagnosisRules = [
  new ValidationRule({
    id: 'DX001',
    name: 'Primary Diagnosis Required',
    description: 'At least one diagnosis code is required',
    category: RuleCategory.DIAGNOSIS,
    severity: SeverityLevel.ERROR,
    validate: async (claim) => {
      const { diagnosisCodes } = claim;

      if (!diagnosisCodes || diagnosisCodes.length === 0) {
        return { valid: false, field: 'diagnosisCodes', value: diagnosisCodes };
      }

      return { valid: true };
    },
    message: () => 'At least one diagnosis code is required',
  }),

  new ValidationRule({
    id: 'DX002',
    name: 'Valid ICD-10 Format',
    description: 'Diagnosis codes must be valid ICD-10 format',
    category: RuleCategory.DIAGNOSIS,
    severity: SeverityLevel.ERROR,
    validate: async (claim) => {
      const diagnosisCodes = claim.diagnosisCodes || [];
      const invalidCodes = [];

      for (const code of diagnosisCodes) {
        // ICD-10: Letter followed by 2-6 alphanumeric characters
        if (!/^[A-Z][0-9][0-9A-Z](\.[0-9A-Z]{1,4})?$/.test(code)) {
          invalidCodes.push(code);
        }
      }

      if (invalidCodes.length > 0) {
        return {
          valid: false,
          field: 'diagnosisCodes',
          value: invalidCodes,
          details: { invalidCodes },
        };
      }

      return { valid: true };
    },
    message: (claim, result) => `Invalid ICD-10 codes: ${result.value.join(', ')}`,
  }),

  new ValidationRule({
    id: 'DX003',
    name: 'Maximum Diagnosis Codes',
    description: 'Most payers accept up to 12 diagnosis codes',
    category: RuleCategory.DIAGNOSIS,
    severity: SeverityLevel.WARNING,
    validate: async (claim) => {
      const diagnosisCodes = claim.diagnosisCodes || [];

      if (diagnosisCodes.length > 12) {
        return {
          valid: false,
          field: 'diagnosisCodes',
          value: diagnosisCodes.length,
          details: { count: diagnosisCodes.length },
        };
      }

      return { valid: true };
    },
    message: (claim, result) => `Too many diagnosis codes: ${result.value} (maximum 12)`,
  }),
];

/**
 * Procedure Code Rules
 */
const procedureRules = [
  new ValidationRule({
    id: 'PC001',
    name: 'Procedure Code Required',
    description: 'At least one procedure code is required',
    category: RuleCategory.PROCEDURE,
    severity: SeverityLevel.ERROR,
    validate: async (claim) => {
      const { procedures } = claim;

      if (!procedures || procedures.length === 0) {
        return { valid: false, field: 'procedures', value: procedures };
      }

      return { valid: true };
    },
    message: () => 'At least one procedure code is required',
  }),

  new ValidationRule({
    id: 'PC002',
    name: 'Valid CPT/HCPCS Format',
    description: 'Procedure codes must be valid CPT or HCPCS format',
    category: RuleCategory.PROCEDURE,
    severity: SeverityLevel.ERROR,
    validate: async (claim) => {
      const procedures = claim.procedures || [];
      const invalidCodes = [];

      for (const proc of procedures) {
        const { code } = proc;
        // CPT: 5 digits, HCPCS: Letter followed by 4 digits
        if (!/^(\d{5}|[A-Z]\d{4})$/.test(code)) {
          invalidCodes.push(code);
        }
      }

      if (invalidCodes.length > 0) {
        return {
          valid: false,
          field: 'procedures.code',
          value: invalidCodes,
          details: { invalidCodes },
        };
      }

      return { valid: true };
    },
    message: (claim, result) => `Invalid CPT/HCPCS codes: ${result.value.join(', ')}`,
  }),

  new ValidationRule({
    id: 'PC003',
    name: 'Procedure Charge Required',
    description: 'Each procedure must have a charge amount',
    category: RuleCategory.PROCEDURE,
    severity: SeverityLevel.ERROR,
    validate: async (claim) => {
      const procedures = claim.procedures || [];
      const missingCharges = [];

      for (let i = 0; i < procedures.length; i += 1) {
        if (!procedures[i].charge || procedures[i].charge <= 0) {
          missingCharges.push(i);
        }
      }

      if (missingCharges.length > 0) {
        return {
          valid: false,
          field: 'procedures.charge',
          value: missingCharges,
          details: { indices: missingCharges },
        };
      }

      return { valid: true };
    },
    message: (claim, result) =>
      `Procedures missing charges at positions: ${result.value.map((i) => i + 1).join(', ')}`,
  }),

  new ValidationRule({
    id: 'PC004',
    name: 'Diagnosis Pointer Required',
    description: 'Each procedure must link to at least one diagnosis',
    category: RuleCategory.PROCEDURE,
    severity: SeverityLevel.ERROR,
    validate: async (claim) => {
      const procedures = claim.procedures || [];
      const diagnosisCount = (claim.diagnosisCodes || []).length;
      const invalidPointers = [];

      for (let i = 0; i < procedures.length; i += 1) {
        const pointers = procedures[i].diagnosisPointers || [];

        if (pointers.length === 0) {
          invalidPointers.push({ index: i, issue: 'missing' });
        } else {
          // Check if pointers are valid
          for (const pointer of pointers) {
            if (pointer < 1 || pointer > diagnosisCount) {
              invalidPointers.push({ index: i, issue: 'invalid', pointer });
            }
          }
        }
      }

      if (invalidPointers.length > 0) {
        return {
          valid: false,
          field: 'procedures.diagnosisPointers',
          value: invalidPointers,
          details: { invalidPointers },
        };
      }

      return { valid: true };
    },
    message: (claim, result) => {
      const issues = result.value.map((p) => {
        if (p.issue === 'missing') return `Procedure ${p.index + 1}: missing diagnosis pointer`;
        return `Procedure ${p.index + 1}: invalid pointer ${p.pointer}`;
      });
      return issues.join('; ');
    },
  }),
];

/**
 * Date Validation Rules
 */
const dateRules = [
  new ValidationRule({
    id: 'DT001',
    name: 'Service Date Required',
    description: 'Service date is required',
    category: RuleCategory.DATES,
    severity: SeverityLevel.ERROR,
    validate: async (claim) => {
      const { serviceDate } = claim;

      if (!serviceDate) {
        return { valid: false, field: 'serviceDate', value: serviceDate };
      }

      const date = new Date(serviceDate);
      if (isNaN(date.getTime())) {
        return { valid: false, field: 'serviceDate', value: serviceDate };
      }

      return { valid: true };
    },
    message: () => 'Service date is required and must be valid',
  }),

  new ValidationRule({
    id: 'DT002',
    name: 'Service Date Not Future',
    description: 'Service date cannot be in the future',
    category: RuleCategory.DATES,
    severity: SeverityLevel.ERROR,
    validate: async (claim) => {
      const serviceDate = new Date(claim.serviceDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (serviceDate > today) {
        return {
          valid: false,
          field: 'serviceDate',
          value: claim.serviceDate,
          details: 'Service date cannot be in the future',
        };
      }

      return { valid: true };
    },
    message: () => 'Service date cannot be in the future',
  }),

  new ValidationRule({
    id: 'DT003',
    name: 'Timely Filing Limit',
    description: 'Claim must be filed within payer timely filing limit',
    category: RuleCategory.DATES,
    severity: SeverityLevel.WARNING,
    validate: async (claim) => {
      const serviceDate = new Date(claim.serviceDate);
      const today = new Date();

      // Default timely filing: 90 days (can be payer-specific)
      const timelyFilingDays = claim.insurance?.timelyFilingLimit || 90;
      const daysSinceService = Math.floor((today - serviceDate) / (1000 * 60 * 60 * 24));

      if (daysSinceService > timelyFilingDays) {
        return {
          valid: false,
          field: 'serviceDate',
          value: claim.serviceDate,
          details: {
            daysSinceService,
            timelyFilingDays,
            message: `Service date was ${daysSinceService} days ago (limit: ${timelyFilingDays} days)`,
          },
        };
      }

      return { valid: true };
    },
    message: (claim, result) => result.details.message,
  }),
];

/**
 * Billing Rules
 */
const billingRules = [
  new ValidationRule({
    id: 'BL001',
    name: 'Place of Service Required',
    description: 'Place of service code is required',
    category: RuleCategory.BILLING,
    severity: SeverityLevel.ERROR,
    validate: async (claim) => {
      const { placeOfService } = claim;

      if (!placeOfService) {
        return { valid: false, field: 'placeOfService', value: placeOfService };
      }

      // Place of Service codes are 2 digits
      if (!/^\d{2}$/.test(placeOfService.toString())) {
        return { valid: false, field: 'placeOfService', value: placeOfService };
      }

      return { valid: true };
    },
    message: () => 'Place of service code is required (2-digit code)',
  }),

  new ValidationRule({
    id: 'BL002',
    name: 'Total Charges Match',
    description: 'Total charges should match sum of procedure charges',
    category: RuleCategory.BILLING,
    severity: SeverityLevel.WARNING,
    autoFixable: true,
    validate: async (claim) => {
      const procedures = claim.procedures || [];
      const calculatedTotal = procedures.reduce((sum, proc) => sum + (proc.charge || 0), 0);
      const claimTotal = claim.totalCharges || 0;

      const difference = Math.abs(calculatedTotal - claimTotal);

      // Allow small rounding differences
      if (difference > 0.01) {
        return {
          valid: false,
          field: 'totalCharges',
          value: claimTotal,
          expectedValue: calculatedTotal,
          details: { calculatedTotal, claimTotal, difference },
        };
      }

      return { valid: true };
    },
    fix: async (claim) => {
      const procedures = claim.procedures || [];
      const calculatedTotal = procedures.reduce((sum, proc) => sum + (proc.charge || 0), 0);
      const oldTotal = claim.totalCharges;

      claim.totalCharges = parseFloat(calculatedTotal.toFixed(2));

      return {
        changes: {
          totalCharges: { from: oldTotal, to: claim.totalCharges },
        },
        message: `Updated total charges to match procedure sum: $${claim.totalCharges}`,
      };
    },
    message: (claim, result) => {
      return `Total charges ($${result.value}) doesn't match sum of procedures ($${result.expectedValue})`;
    },
  }),
];

/**
 * All Validation Rules
 */
const allRules = [
  ...patientInfoRules,
  ...insuranceInfoRules,
  ...providerInfoRules,
  ...diagnosisRules,
  ...procedureRules,
  ...dateRules,
  ...billingRules,
];

/**
 * Get rules by category
 */
function getRulesByCategory(category) {
  return allRules.filter((rule) => rule.category === category);
}

/**
 * Get rules by severity
 */
function getRulesBySeverity(severity) {
  return allRules.filter((rule) => rule.severity === severity);
}

/**
 * Get auto-fixable rules
 */
function getAutoFixableRules() {
  return allRules.filter((rule) => rule.autoFixable);
}

module.exports = {
  ValidationRule,
  SeverityLevel,
  RuleCategory,
  allRules,
  patientInfoRules,
  insuranceInfoRules,
  providerInfoRules,
  diagnosisRules,
  procedureRules,
  dateRules,
  billingRules,
  getRulesByCategory,
  getRulesBySeverity,
  getAutoFixableRules,
};
