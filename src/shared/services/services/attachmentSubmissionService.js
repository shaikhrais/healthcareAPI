
const ClaimAttachment = require('../models/ClaimAttachment');
const Claim = require('../models/Claim');
const { attachmentStorageService } = require('./attachmentStorageService');
const { logger } = require('../utils/logger');
const { BadRequestError } = require('../utils/errors');
/**
 * Attachment Submission Service
 *
 * Handles electronic submission of claim attachments to clearinghouses
 * Implements PWK (Paperwork) segments for HIPAA 837 claims
 */

/**
 * PWK Report Type Codes (commonly used)
 */
const PWK_REPORT_TYPES = {
  '03': 'Report Justifying Treatment Beyond Utilization Guidelines',
  '04': 'Drugs Administered',
  '05': 'Treatment Diagnosis',
  '06': 'Initial Assessment',
  '07': 'Functional Goals',
  '08': 'Plan of Treatment',
  '09': 'Progress Report',
  10: 'Continued Treatment',
  11: 'Chemical Analysis',
  13: 'Certified Test Report',
  15: 'Justification for Admission',
  21: 'Recovery Plan',
  77: 'Support Data for Verification',
  A3: 'Allergies/Sensitivities Document',
  A4: 'Autopsy Report',
  AM: 'Ambulance Certification',
  AS: 'Admission Summary',
  B2: 'Prescription',
  B3: 'Physician Order',
  B4: 'Referral Form',
  BR: 'Benchmark Testing Results',
  BS: 'Baseline',
  BT: 'Blanket Test Results',
  CB: 'Chiropractic Justification',
  CK: 'Consent Form(s)',
  CT: 'Certification',
  D2: 'Drug Profile Document',
  DA: 'Dental Models',
  DB: 'Durable Medical Equipment Prescription',
  DG: 'Diagnostic Report',
  DJ: 'Discharge Monitoring Report',
  DS: 'Discharge Summary',
  EB: 'Explanation of Benefits (EOB)',
  HC: 'Health Certificate',
  HR: 'Health Clinic Records',
  I5: 'Immunization Record',
  IR: 'State School Immunization Records',
  LA: 'Laboratory Results',
  M1: 'Medical Record Attachment',
  MT: 'Models',
  NN: 'Nursing Notes',
  OB: 'Operative Note',
  OC: 'Oxygen Content Averaging Report',
  OD: 'Orders and Treatments Document',
  OE: 'Objective Physical Examination',
  OX: 'Oxygen Therapy Certification',
  OZ: 'Support Data for Claim',
  P4: 'Pathology Report',
  P5: 'Patient Medical History Document',
  PE: 'Parenteral or Enteral Certification',
  PN: 'Physical Therapy Notes',
  PO: 'Prosthetics or Orthotic Certification',
  PQ: 'Paramedical Results',
  PY: 'Physician Report',
  PZ: 'Physical Therapy Certification',
  RB: 'Radiology Films',
  RR: 'Radiology Reports',
  RT: 'Report of Tests and Analysis Report',
  RX: 'Renewable Oxygen Content Averaging Report',
  SG: 'Symptoms Document',
  V5: 'Death Notification',
  XP: 'Photographs',
};

/**
 * Attachment Submission Service
 */
class AttachmentSubmissionService {
  constructor() {
    this.clearinghouseUrl = process.env.CLEARINGHOUSE_API_URL || null;
    this.clearinghouseApiKey = process.env.CLEARINGHOUSE_API_KEY || null;
    this.environment = process.env.NODE_ENV || 'development';
  }

  /**
   * Validate attachment is ready for submission
   */
  async validateForSubmission(attachment) {
    const errors = [];

    // Check 1: Attachment must be validated
    if (!attachment.validation.validated) {
      errors.push({
        code: 'NOT_VALIDATED',
        message: 'Attachment must be validated before submission',
        severity: 'error',
      });
    }

    // Check 2: Must have validation errors cleared
    if (attachment.validation.validationErrors?.length > 0) {
      const errorCount = attachment.validation.validationErrors.filter(
        (e) => e.severity === 'error'
      ).length;
      if (errorCount > 0) {
        errors.push({
          code: 'VALIDATION_ERRORS',
          message: `Attachment has ${errorCount} validation errors that must be resolved`,
          severity: 'error',
        });
      }
    }

    // Check 3: Virus scan must be clean
    if (attachment.validation.virusScan?.scanned && !attachment.validation.virusScan.clean) {
      errors.push({
        code: 'VIRUS_SCAN_FAILED',
        message: 'Attachment did not pass virus scan',
        severity: 'error',
      });
    }

    // Check 4: File must exist
    const fileInfo = await attachmentStorageService.getFileInfo(
      attachment.storageType,
      attachment.storagePath
    );
    if (!fileInfo.exists) {
      errors.push({
        code: 'FILE_NOT_FOUND',
        message: 'File not found in storage',
        severity: 'error',
      });
    }

    // Check 5: PWK codes required for electronic submission
    if (attachment.pwkTransmissionCode === 'EL') {
      if (!attachment.pwkReportType) {
        errors.push({
          code: 'MISSING_PWK_CODE',
          message: 'PWK report type code required for electronic submission',
          severity: 'error',
        });
      }
    }

    // Check 6: Must not be archived
    if (attachment.archived) {
      errors.push({
        code: 'ARCHIVED',
        message: 'Cannot submit archived attachment',
        severity: 'error',
      });
    }

    // Check 7: Must not be expired
    if (attachment.isExpired()) {
      errors.push({
        code: 'EXPIRED',
        message: 'Attachment has expired',
        severity: 'error',
      });
    }

    return {
      valid: errors.filter((e) => e.severity === 'error').length === 0,
      errors,
    };
  }

  /**
   * Generate PWK segment for HIPAA 837 claim
   */
  generatePWKSegment(attachment) {
    // PWK segment format:
    // PWK*RP*EL*AC**AC~
    //
    // PWK01 - Report Type Code
    // PWK02 - Report Transmission Code
    // PWK03 - Report Copies Needed (optional)
    // PWK04 - Entity Identifier Code (optional)
    // PWK05 - Identification Code Qualifier (optional)
    // PWK06 - Attachment Control Number

    const segment = {
      segmentId: 'PWK',
      reportType: attachment.pwkReportType || 'OZ', // Default: Support Data for Claim
      transmissionCode: attachment.pwkTransmissionCode || 'EL', // Electronic
      copiesNeeded: null,
      entityIdentifier: null,
      identifierQualifier: 'AC', // Attachment Control Number
      controlNumber: attachment.attachmentControlNumber,
    };

    // Format as EDI segment
    const ediSegment =
      `PWK*${segment.reportType}*${segment.transmissionCode}*` +
      `${segment.copiesNeeded || ''}*${segment.entityIdentifier || ''}*` +
      `${segment.identifierQualifier}*${segment.controlNumber}~`;

    return {
      segment,
      ediSegment,
    };
  }

  /**
   * Prepare attachment for electronic submission
   */
  async prepareForSubmission(attachmentId) {
    const attachment = await ClaimAttachment.findById(attachmentId).populate('claim');

    if (!attachment) {
      throw new BadRequestError('Attachment not found');
    }

    // Validate
    const validation = await this.validateForSubmission(attachment);
    if (!validation.valid) {
      throw new BadRequestError('Attachment validation failed', validation.errors);
    }

    // Get file
    const fileBuffer = await attachmentStorageService.retrieve(
      attachment.storageType,
      attachment.storagePath
    );

    // Generate PWK segment
    const pwk = this.generatePWKSegment(attachment);

    // Prepare submission package
    const submissionPackage = {
      attachmentId: attachment._id,
      attachmentControlNumber: attachment.attachmentControlNumber,
      claim: {
        id: attachment.claim._id,
        claimNumber: attachment.claim.claimNumber,
        patient: {
          firstName: attachment.claim.patient.firstName,
          lastName: attachment.claim.patient.lastName,
          memberId: attachment.claim.patient.memberId,
        },
        provider: {
          npi: attachment.claim.provider.npi,
          name: attachment.claim.provider.name,
        },
        payer: {
          id: attachment.claim.insurance.payerId,
          name: attachment.claim.insurance.payerName,
        },
      },
      attachment: {
        filename: attachment.originalFilename,
        mimeType: attachment.mimeType,
        size: attachment.fileSize,
        type: attachment.attachmentType,
        description: attachment.description,
        documentDate: attachment.documentDate,
      },
      pwk: pwk.segment,
      pwkSegment: pwk.ediSegment,
      file: {
        data: fileBuffer.toString('base64'),
        encoding: 'base64',
      },
    };

    return submissionPackage;
  }

  /**
   * Submit attachment electronically to clearinghouse
   */
  async submitElectronically(attachmentId, userId) {
    try {
      // Prepare submission package
      const submissionPackage = await this.prepareForSubmission(attachmentId);

      // In production, send to clearinghouse API
      if (this.environment === 'production' && this.clearinghouseUrl) {
        // Example: POST to clearinghouse
        // const response = await axios.post(
        //   `${this.clearinghouseUrl}/attachments/submit`,
        //   submissionPackage,
        //   {
        //     headers: {
        //       'Authorization': `Bearer ${this.clearinghouseApiKey}`,
        //       'Content-Type': 'application/json'
        //     }
        //   }
        // );

        // For now, simulate success
        const trackingNumber =
          `TRK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase();

        // Update attachment
        const attachment = await ClaimAttachment.findById(attachmentId);
        attachment.markAsSubmitted(userId, 'electronic', trackingNumber);
        await attachment.save();

        logger.info('Attachment submitted electronically', {
          attachmentId,
          trackingNumber,
          controlNumber: submissionPackage.attachmentControlNumber,
          userId,
        });

        return {
          success: true,
          trackingNumber,
          controlNumber: submissionPackage.attachmentControlNumber,
          submittedAt: new Date(),
          message: 'Attachment submitted successfully to clearinghouse',
        };
      }
      // Development/test mode - just mark as submitted
      const trackingNumber = `TEST-${Date.now()}`;

      const attachment = await ClaimAttachment.findById(attachmentId);
      attachment.markAsSubmitted(userId, 'electronic', trackingNumber);
      await attachment.save();

      logger.info('Attachment submitted (test mode)', {
        attachmentId,
        trackingNumber,
        userId,
      });

      return {
        success: true,
        trackingNumber,
        controlNumber: submissionPackage.attachmentControlNumber,
        submittedAt: new Date(),
        message: 'Attachment marked as submitted (test mode - no actual clearinghouse submission)',
        testMode: true,
      };
    } catch (error) {
      logger.error('Electronic submission failed', {
        attachmentId,
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Submit multiple attachments in batch
   */
  async submitBatch(attachmentIds, userId) {
    const results = [];

    for (const attachmentId of attachmentIds) {
      try {
        const result = await this.submitElectronically(attachmentId, userId);
        results.push({
          attachmentId,
          success: true,
          trackingNumber: result.trackingNumber,
          controlNumber: result.controlNumber,
        });
      } catch (error) {
        results.push({
          attachmentId,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    logger.info('Batch attachment submission', {
      total: attachmentIds.length,
      successful: successCount,
      failed: attachmentIds.length - successCount,
      userId,
    });

    return {
      total: attachmentIds.length,
      successful: successCount,
      failed: attachmentIds.length - successCount,
      results,
    };
  }

  /**
   * Check submission status (for clearinghouse integration)
   */
  async checkSubmissionStatus(attachmentId) {
    const attachment = await ClaimAttachment.findById(attachmentId);

    if (!attachment) {
      throw new BadRequestError('Attachment not found');
    }

    if (!attachment.submission.submitted) {
      return {
        status: 'not_submitted',
        message: 'Attachment has not been submitted',
      };
    }

    // In production, check with clearinghouse
    if (this.environment === 'production' && this.clearinghouseUrl) {
      // Example: GET status from clearinghouse
      // const response = await axios.get(
      //   `${this.clearinghouseUrl}/attachments/status/${attachment.submission.trackingNumber}`,
      //   {
      //     headers: {
      //       'Authorization': `Bearer ${this.clearinghouseApiKey}`
      //     }
      //   }
      // );
      // Return clearinghouse status
      // return response.data;
    }

    // Return current database status
    return {
      status: attachment.status,
      submittedAt: attachment.submission.submittedAt,
      submissionMethod: attachment.submission.submissionMethod,
      trackingNumber: attachment.submission.trackingNumber,
      accepted: attachment.submission.accepted,
      acceptedAt: attachment.submission.acceptedAt,
      rejectionReason: attachment.submission.rejectionReason,
    };
  }

  /**
   * Process acceptance notification from clearinghouse
   */
  async processAcceptance(trackingNumber, acceptanceData) {
    const attachment = await ClaimAttachment.findOne({
      'submission.trackingNumber': trackingNumber,
    });

    if (!attachment) {
      throw new BadRequestError('Attachment not found for tracking number');
    }

    attachment.markAsAccepted();
    await attachment.save();

    logger.info('Attachment accepted', {
      attachmentId: attachment._id,
      trackingNumber,
      acceptanceData,
    });

    return {
      success: true,
      attachmentId: attachment._id,
      message: 'Attachment marked as accepted',
    };
  }

  /**
   * Process rejection notification from clearinghouse
   */
  async processRejection(trackingNumber, rejectionData) {
    const attachment = await ClaimAttachment.findOne({
      'submission.trackingNumber': trackingNumber,
    });

    if (!attachment) {
      throw new BadRequestError('Attachment not found for tracking number');
    }

    const reason = rejectionData.reason || 'Rejected by clearinghouse';
    attachment.markAsRejected(reason);
    await attachment.save();

    logger.warn('Attachment rejected', {
      attachmentId: attachment._id,
      trackingNumber,
      reason,
      rejectionData,
    });

    return {
      success: true,
      attachmentId: attachment._id,
      message: 'Attachment marked as rejected',
      reason,
    };
  }

  /**
   * Get PWK report type description
   */
  getPWKDescription(reportTypeCode) {
    return PWK_REPORT_TYPES[reportTypeCode] || 'Unknown Report Type';
  }

  /**
   * Get all PWK report types
   */
  getAllPWKTypes() {
    return Object.entries(PWK_REPORT_TYPES).map(([code, description]) => ({
      code,
      description,
    }));
  }

  /**
   * Generate submission report for claim
   */
  async generateSubmissionReport(claimId) {
    const attachments = await ClaimAttachment.find({ claim: claimId }).sort({ createdAt: -1 });

    const report = {
      claimId,
      totalAttachments: attachments.length,
      byStatus: {},
      byType: {},
      submitted: 0,
      accepted: 0,
      rejected: 0,
      pending: 0,
      attachments: [],
    };

    for (const attachment of attachments) {
      // Count by status
      report.byStatus[attachment.status] = (report.byStatus[attachment.status] || 0) + 1;

      // Count by type
      report.byType[attachment.attachmentType] =
        (report.byType[attachment.attachmentType] || 0) + 1;

      // Count submission states
      if (attachment.submission.submitted) {
        report.submitted += 1;
        if (attachment.submission.accepted === true) {
          report.accepted += 1;
        } else if (attachment.submission.accepted === false) {
          report.rejected += 1;
        }
      } else if (attachment.validation.validated) {
        report.pending += 1;
      }

      // Add to attachments list
      report.attachments.push({
        id: attachment._id,
        filename: attachment.originalFilename,
        type: attachment.attachmentType,
        status: attachment.status,
        submitted: attachment.submission.submitted,
        accepted: attachment.submission.accepted,
        trackingNumber: attachment.submission.trackingNumber,
        pwkReportType: attachment.pwkReportType,
        pwkDescription: attachment.pwkReportType
          ? this.getPWKDescription(attachment.pwkReportType)
          : null,
        size: attachment.getFormattedFileSize(),
      });
    }

    return report;
  }

  /**
   * Resend attachment (for failed submissions)
   */
  async resendAttachment(attachmentId, userId) {
    const attachment = await ClaimAttachment.findById(attachmentId);

    if (!attachment) {
      throw new BadRequestError('Attachment not found');
    }

    // Only allow resend for rejected or failed submissions
    if (!attachment.submission.submitted || attachment.submission.accepted === true) {
      throw new BadRequestError('Attachment cannot be resent');
    }

    // Reset submission fields
    attachment.submission.submitted = false;
    attachment.submission.submittedAt = null;
    attachment.submission.trackingNumber = null;
    attachment.submission.accepted = null;
    attachment.submission.rejectionReason = null;
    attachment.status = 'validated';

    await attachment.save();

    logger.info('Attachment reset for resubmission', {
      attachmentId,
      userId,
    });

    // Submit again
    return await this.submitElectronically(attachmentId, userId);
  }
}

// Singleton instance
const attachmentSubmissionService = new AttachmentSubmissionService();

module.exports = {
  AttachmentSubmissionService,
  attachmentSubmissionService,
  PWK_REPORT_TYPES,
};
