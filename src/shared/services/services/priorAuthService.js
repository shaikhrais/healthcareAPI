
const PriorAuthorization = require('../models/PriorAuthorization');
const Patient = require('../models/Patient');
const User = require('../models/User');
const { logger } = require('../utils/logger');
const { BadRequestError, NotFoundError } = require('../utils/errors');
/**
 * Prior Authorization Service
 *
 * Manages prior authorization workflow, submission, and tracking
 */

/**
 * Authorization Workflow States
 */
const WorkflowStates = {
  DRAFT: 'draft',
  PENDING_SUBMISSION: 'pending_submission',
  SUBMITTED: 'submitted',
  IN_REVIEW: 'in_review',
  APPROVED: 'approved',
  PARTIAL_APPROVAL: 'partial_approval',
  DENIED: 'denied',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
  APPEALED: 'appealed',
  APPEAL_APPROVED: 'appeal_approved',
  APPEAL_DENIED: 'appeal_denied',
};

/**
 * Service Type Categories
 */
const ServiceCategories = {
  INPATIENT: 'inpatient_admission',
  OUTPATIENT_SURGERY: 'outpatient_surgery',
  DIAGNOSTIC: 'diagnostic_test',
  IMAGING: 'imaging',
  DME: 'durable_medical_equipment',
  HOME_HEALTH: 'home_health',
  SKILLED_NURSING: 'skilled_nursing',
  PHYSICAL_THERAPY: 'physical_therapy',
  OCCUPATIONAL_THERAPY: 'occupational_therapy',
  SPEECH_THERAPY: 'speech_therapy',
  MENTAL_HEALTH: 'mental_health',
  SUBSTANCE_ABUSE: 'substance_abuse',
  PRESCRIPTION: 'prescription_drug',
  SPECIALTY_MED: 'specialty_medication',
  SPECIALIST: 'specialist_visit',
  PROCEDURE: 'procedure',
};

/**
 * Prior Authorization Service
 */
class PriorAuthService {
  /**
   * Create new prior authorization request
   */
  async createAuthorization(data, userId) {
    try {
      // Validate patient exists
      const patient = await Patient.findById(data.patientId);
      if (!patient) {
        throw new NotFoundError('Patient not found');
      }

      // Validate provider exists
      const provider = await User.findById(data.providerId);
      if (!provider) {
        throw new NotFoundError('Provider not found');
      }

      // Create authorization
      const authorization = new PriorAuthorization({
        patient: data.patientId,
        patientInfo: {
          firstName: data.patientInfo.firstName || patient.firstName,
          lastName: data.patientInfo.lastName || patient.lastName,
          dateOfBirth: data.patientInfo.dateOfBirth || patient.dateOfBirth,
          memberId: data.patientInfo.memberId,
          phone: data.patientInfo.phone || patient.phone,
        },
        provider: data.providerId,
        providerInfo: data.providerInfo,
        facility: data.facility,
        insurance: data.insurance,
        serviceType: data.serviceType,
        serviceDescription: data.serviceDescription,
        procedureCodes: data.procedureCodes || [],
        diagnosisCodes: data.diagnosisCodes || [],
        clinical: data.clinical || {},
        serviceDetails: data.serviceDetails,
        priority: data.priority || 'normal',
        workflow: {
          createdBy: userId,
        },
      });

      await authorization.save();

      logger.info('Prior authorization created', {
        authorizationId: authorization._id,
        authorizationNumber: authorization.authorizationNumber,
        patient: data.patientId,
        serviceType: data.serviceType,
        userId,
      });

      return authorization;
    } catch (error) {
      logger.error('Failed to create prior authorization', {
        error: error.message,
        data,
        userId,
      });
      throw error;
    }
  }

  /**
   * Update authorization
   */
  async updateAuthorization(authorizationId, updates, userId) {
    try {
      const authorization = await PriorAuthorization.findById(authorizationId);

      if (!authorization) {
        throw new NotFoundError('Authorization not found');
      }

      // Can only update draft or pending_submission
      if (!['draft', 'pending_submission'].includes(authorization.status)) {
        throw new BadRequestError('Cannot update authorization in current status');
      }

      // Update fields
      const allowedUpdates = [
        'serviceDescription',
        'procedureCodes',
        'diagnosisCodes',
        'clinical',
        'serviceDetails',
        'priority',
        'internalNotes',
        'tags',
      ];

      allowedUpdates.forEach((field) => {
        if (updates[field] !== undefined) {
          authorization[field] = updates[field];
        }
      });

      authorization.workflow.lastModifiedBy = userId;
      await authorization.save();

      logger.info('Prior authorization updated', {
        authorizationId,
        userId,
      });

      return authorization;
    } catch (error) {
      logger.error('Failed to update prior authorization', {
        error: error.message,
        authorizationId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Submit authorization for approval
   */
  async submitAuthorization(authorizationId, submissionData, userId) {
    try {
      const authorization = await PriorAuthorization.findById(authorizationId);

      if (!authorization) {
        throw new NotFoundError('Authorization not found');
      }

      // Validate readiness
      const validation = this.validateForSubmission(authorization);
      if (!validation.valid) {
        throw new BadRequestError('Authorization not ready for submission', validation.errors);
      }

      // Submit
      authorization.submit(userId, submissionData.method, submissionData.confirmationNumber);

      // Set expected response date (typically 14 days for standard, 72 hours for urgent)
      if (authorization.serviceDetails.urgency === 'urgent') {
        const responseDate = new Date();
        responseDate.setHours(responseDate.getHours() + 72);
        authorization.submission.expectedResponseDate = responseDate;
      } else if (authorization.serviceDetails.urgency === 'emergency') {
        const responseDate = new Date();
        responseDate.setHours(responseDate.getHours() + 24);
        authorization.submission.expectedResponseDate = responseDate;
      } else {
        const responseDate = new Date();
        responseDate.setDate(responseDate.getDate() + 14);
        authorization.submission.expectedResponseDate = responseDate;
      }

      // Set follow-up date
      if (submissionData.followUpDate) {
        authorization.submission.followUpDate = new Date(submissionData.followUpDate);
      }

      // Additional submission details
      if (submissionData.contactPerson) {
        authorization.submission.contactPerson = submissionData.contactPerson;
      }
      if (submissionData.contactPhone) {
        authorization.submission.contactPhone = submissionData.contactPhone;
      }

      await authorization.save();

      logger.info('Prior authorization submitted', {
        authorizationId,
        authorizationNumber: authorization.authorizationNumber,
        method: submissionData.method,
        confirmationNumber: submissionData.confirmationNumber,
        userId,
      });

      return authorization;
    } catch (error) {
      logger.error('Failed to submit prior authorization', {
        error: error.message,
        authorizationId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Validate authorization is ready for submission
   */
  validateForSubmission(authorization) {
    const errors = [];

    // Required fields
    if (!authorization.patientInfo.memberId) {
      errors.push({ field: 'patientInfo.memberId', message: 'Member ID required' });
    }

    if (!authorization.providerInfo.npi) {
      errors.push({ field: 'providerInfo.npi', message: 'Provider NPI required' });
    }

    if (!authorization.insurance.payerId) {
      errors.push({ field: 'insurance.payerId', message: 'Payer ID required' });
    }

    if (!authorization.serviceDescription) {
      errors.push({ field: 'serviceDescription', message: 'Service description required' });
    }

    if (!authorization.procedureCodes || authorization.procedureCodes.length === 0) {
      errors.push({ field: 'procedureCodes', message: 'At least one procedure code required' });
    }

    if (!authorization.diagnosisCodes || authorization.diagnosisCodes.length === 0) {
      errors.push({ field: 'diagnosisCodes', message: 'At least one diagnosis code required' });
    }

    if (!authorization.serviceDetails.requestedStartDate) {
      errors.push({ field: 'serviceDetails.requestedStartDate', message: 'Start date required' });
    }

    if (!authorization.clinical.clinicalJustification && !authorization.clinical.medicalNecessity) {
      errors.push({
        field: 'clinical',
        message: 'Clinical justification or medical necessity statement required',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Approve authorization
   */
  async approveAuthorization(authorizationId, approvalData, userId) {
    try {
      const authorization = await PriorAuthorization.findById(authorizationId);

      if (!authorization) {
        throw new NotFoundError('Authorization not found');
      }

      if (!['submitted', 'in_review'].includes(authorization.status)) {
        throw new BadRequestError('Authorization must be submitted before approval');
      }

      authorization.approve(approvalData, userId);
      await authorization.save();

      logger.info('Prior authorization approved', {
        authorizationId,
        authorizationNumber: authorization.authorizationNumber,
        effectiveDate: approvalData.effectiveDate,
        expirationDate: approvalData.expirationDate,
        userId,
      });

      return authorization;
    } catch (error) {
      logger.error('Failed to approve prior authorization', {
        error: error.message,
        authorizationId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Deny authorization
   */
  async denyAuthorization(authorizationId, denialData, userId) {
    try {
      const authorization = await PriorAuthorization.findById(authorizationId);

      if (!authorization) {
        throw new NotFoundError('Authorization not found');
      }

      authorization.deny(denialData, userId);
      await authorization.save();

      logger.info('Prior authorization denied', {
        authorizationId,
        authorizationNumber: authorization.authorizationNumber,
        reason: denialData.reason,
        code: denialData.code,
        userId,
      });

      return authorization;
    } catch (error) {
      logger.error('Failed to deny prior authorization', {
        error: error.message,
        authorizationId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Partial approval
   */
  async partialApproval(authorizationId, approvalData, userId) {
    try {
      const authorization = await PriorAuthorization.findById(authorizationId);

      if (!authorization) {
        throw new NotFoundError('Authorization not found');
      }

      authorization.status = 'partial_approval';

      authorization.decision = {
        approved: true,
        approvedDate: new Date(),
        approvedBy: approvalData.approvedBy,
        effectiveDate: approvalData.effectiveDate,
        expirationDate: approvalData.expirationDate,
        authorizedServices: approvalData.authorizedServices || [],
        conditions: approvalData.conditions || [],
        notes: approvalData.notes,
      };

      authorization.partialApproval = {
        approvedServices: approvalData.approvedServices || [],
        deniedServices: approvalData.deniedServices || [],
      };

      authorization.changeStatus(
        'partial_approval',
        userId,
        'Partial approval granted',
        approvalData.notes
      );

      await authorization.save();

      logger.info('Prior authorization partially approved', {
        authorizationId,
        authorizationNumber: authorization.authorizationNumber,
        approvedCount: approvalData.approvedServices?.length || 0,
        deniedCount: approvalData.deniedServices?.length || 0,
        userId,
      });

      return authorization;
    } catch (error) {
      logger.error('Failed to partially approve prior authorization', {
        error: error.message,
        authorizationId,
        userId,
      });
      throw error;
    }
  }

  /**
   * File appeal
   */
  async fileAppeal(authorizationId, appealData, userId) {
    try {
      const authorization = await PriorAuthorization.findById(authorizationId);

      if (!authorization) {
        throw new NotFoundError('Authorization not found');
      }

      if (authorization.status !== 'denied') {
        throw new BadRequestError('Can only appeal denied authorizations');
      }

      authorization.initiateAppeal(appealData, userId);
      await authorization.save();

      logger.info('Prior authorization appeal filed', {
        authorizationId,
        authorizationNumber: authorization.authorizationNumber,
        appealReason: appealData.reason,
        userId,
      });

      return authorization;
    } catch (error) {
      logger.error('Failed to file appeal', {
        error: error.message,
        authorizationId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Record utilization
   */
  async recordUtilization(authorizationId, utilizationData, userId) {
    try {
      const authorization = await PriorAuthorization.findById(authorizationId);

      if (!authorization) {
        throw new NotFoundError('Authorization not found');
      }

      if (!authorization.isActive()) {
        throw new BadRequestError('Authorization is not active');
      }

      // Check if service is authorized
      const authorizedService = authorization.decision.authorizedServices?.find(
        (s) => s.procedureCode === utilizationData.procedureCode
      );

      if (!authorizedService) {
        throw new BadRequestError('Service not authorized under this authorization');
      }

      // Check if quantity available
      if (authorizedService.quantityRemaining < (utilizationData.quantity || 1)) {
        throw new BadRequestError('Insufficient authorized quantity remaining');
      }

      authorization.recordUtilization(utilizationData);
      await authorization.save();

      logger.info('Utilization recorded', {
        authorizationId,
        authorizationNumber: authorization.authorizationNumber,
        procedureCode: utilizationData.procedureCode,
        quantity: utilizationData.quantity,
        userId,
      });

      return authorization;
    } catch (error) {
      logger.error('Failed to record utilization', {
        error: error.message,
        authorizationId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Add communication log
   */
  async logCommunication(authorizationId, communicationData, userId) {
    try {
      const authorization = await PriorAuthorization.findById(authorizationId);

      if (!authorization) {
        throw new NotFoundError('Authorization not found');
      }

      authorization.logCommunication({
        ...communicationData,
        performedBy: userId,
      });

      await authorization.save();

      logger.info('Communication logged', {
        authorizationId,
        authorizationNumber: authorization.authorizationNumber,
        type: communicationData.type,
        userId,
      });

      return authorization;
    } catch (error) {
      logger.error('Failed to log communication', {
        error: error.message,
        authorizationId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Cancel authorization
   */
  async cancelAuthorization(authorizationId, reason, userId) {
    try {
      const authorization = await PriorAuthorization.findById(authorizationId);

      if (!authorization) {
        throw new NotFoundError('Authorization not found');
      }

      if (['cancelled', 'expired', 'denied'].includes(authorization.status)) {
        throw new BadRequestError('Authorization cannot be cancelled in current status');
      }

      authorization.changeStatus('cancelled', userId, reason, null);
      await authorization.save();

      logger.info('Prior authorization cancelled', {
        authorizationId,
        authorizationNumber: authorization.authorizationNumber,
        reason,
        userId,
      });

      return authorization;
    } catch (error) {
      logger.error('Failed to cancel prior authorization', {
        error: error.message,
        authorizationId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Check for expiring authorizations
   */
  async checkExpiringAuthorizations(daysThreshold = 30) {
    try {
      const expiring = await PriorAuthorization.getExpiring(daysThreshold);

      // Add alerts for expiring authorizations
      for (const auth of expiring) {
        const daysRemaining = auth.getDaysUntilExpiration();

        if (daysRemaining <= 7) {
          auth.addAlert(
            'expiring_soon',
            `Authorization expires in ${daysRemaining} days`,
            'critical'
          );
        } else if (daysRemaining <= 14) {
          auth.addAlert(
            'expiring_soon',
            `Authorization expires in ${daysRemaining} days`,
            'warning'
          );
        } else {
          auth.addAlert('expiring_soon', `Authorization expires in ${daysRemaining} days`, 'info');
        }

        await auth.save();
      }

      logger.info('Checked expiring authorizations', {
        count: expiring.length,
        threshold: daysThreshold,
      });

      return expiring;
    } catch (error) {
      logger.error('Failed to check expiring authorizations', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update expired authorizations
   */
  async updateExpiredAuthorizations() {
    try {
      const expired = await PriorAuthorization.getExpired();

      let updatedCount = 0;

      for (const auth of expired) {
        if (auth.status !== 'expired') {
          auth.changeStatus('expired', null, 'Authorization expired', null);
          await auth.save();
          updatedCount += 1;
        }
      }

      logger.info('Updated expired authorizations', {
        count: updatedCount,
      });

      return { count: updatedCount };
    } catch (error) {
      logger.error('Failed to update expired authorizations', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get authorization summary for patient
   */
  async getPatientSummary(patientId) {
    try {
      const [
        activeAuthorizations,
        pendingAuthorizations,
        deniedAuthorizations,
        expiredAuthorizations,
      ] = await Promise.all([
        PriorAuthorization.getActiveForPatient(patientId),
        PriorAuthorization.find({
          patient: patientId,
          status: { $in: ['submitted', 'in_review'] },
        }),
        PriorAuthorization.find({
          patient: patientId,
          status: 'denied',
        })
          .limit(10)
          .sort({ createdAt: -1 }),
        PriorAuthorization.find({
          patient: patientId,
          status: 'expired',
        })
          .limit(10)
          .sort({ 'decision.expirationDate': -1 }),
      ]);

      return {
        patientId,
        summary: {
          activeCount: activeAuthorizations.length,
          pendingCount: pendingAuthorizations.length,
          deniedCount: deniedAuthorizations.length,
          expiredCount: expiredAuthorizations.length,
        },
        active: activeAuthorizations,
        pending: pendingAuthorizations,
        denied: deniedAuthorizations,
        expired: expiredAuthorizations,
      };
    } catch (error) {
      logger.error('Failed to get patient authorization summary', {
        error: error.message,
        patientId,
      });
      throw error;
    }
  }

  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics() {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [pending, expiring, requireFollowUp, recentStats, unacknowledgedAlerts] =
        await Promise.all([
          PriorAuthorization.getPending(),
          PriorAuthorization.getExpiring(30),
          PriorAuthorization.getRequiringFollowUp(),
          PriorAuthorization.getStatistics(thirtyDaysAgo, now),
          PriorAuthorization.countDocuments({
            'alerts.acknowledged': false,
          }),
        ]);

      return {
        pending: {
          count: pending.length,
          items: pending.slice(0, 10), // Top 10
        },
        expiring: {
          count: expiring.length,
          items: expiring.slice(0, 10),
        },
        requireFollowUp: {
          count: requireFollowUp.length,
          items: requireFollowUp.slice(0, 10),
        },
        recentStats,
        unacknowledgedAlerts,
      };
    } catch (error) {
      logger.error('Failed to get dashboard metrics', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate authorization letter
   */
  async generateAuthorizationLetter(authorizationId) {
    try {
      const authorization = await PriorAuthorization.findById(authorizationId)
        .populate('patient')
        .populate('provider');

      if (!authorization) {
        throw new NotFoundError('Authorization not found');
      }

      if (authorization.status !== 'approved' && authorization.status !== 'partial_approval') {
        throw new BadRequestError('Can only generate letter for approved authorizations');
      }

      // Generate letter content
      const letter = {
        authorizationNumber: authorization.authorizationNumber,
        date: new Date().toLocaleDateString(),
        patient: {
          name: `${authorization.patientInfo.firstName} ${authorization.patientInfo.lastName}`,
          memberId: authorization.patientInfo.memberId,
          dateOfBirth: authorization.patientInfo.dateOfBirth.toLocaleDateString(),
        },
        provider: {
          name: authorization.providerInfo.name,
          npi: authorization.providerInfo.npi,
        },
        insurance: {
          payer: authorization.insurance.payerName,
          policyNumber: authorization.insurance.policyNumber,
        },
        authorization: {
          effectiveDate: authorization.decision.effectiveDate.toLocaleDateString(),
          expirationDate: authorization.decision.expirationDate.toLocaleDateString(),
          services: authorization.decision.authorizedServices.map((s) => ({
            code: s.procedureCode,
            description: s.description,
            quantity: s.quantity,
            dates: `${s.startDate?.toLocaleDateString()} - ${s.endDate?.toLocaleDateString()}`,
          })),
          conditions: authorization.decision.conditions,
          notes: authorization.decision.notes,
        },
      };

      logger.info('Authorization letter generated', {
        authorizationId,
        authorizationNumber: authorization.authorizationNumber,
      });

      return letter;
    } catch (error) {
      logger.error('Failed to generate authorization letter', {
        error: error.message,
        authorizationId,
      });
      throw error;
    }
  }
}

// Singleton instance
const priorAuthService = new PriorAuthService();

module.exports = {
  PriorAuthService,
  priorAuthService,
  WorkflowStates,
  ServiceCategories,
};
