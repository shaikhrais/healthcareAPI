const path = require('path');
const express = require('express');

const multer = require('multer');

const InsuranceCard = require('../models/InsuranceCard');
const { protect, authorize } = require('../middleware/auth');
/**
 * Insurance Card Routes
 *
 * Endpoints for insurance card upload, OCR processing, and management
 */

const router = express.Router();
// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/insurance-cards/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'card-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  // Accept images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

// ==================== INSURANCE CARDS ====================

/**
 * @route   GET /api/insurance-cards
 * @desc    Get insurance cards with filters
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const {
      patientId,
      status,
      verificationStatus,
      cardType,
      expiringWithin,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {
      organization: req.user.organization,
    };

    if (patientId) query.patientId = patientId;
    if (status) query.status = status;
    if (verificationStatus) query.verificationStatus = verificationStatus;
    if (cardType) query.cardType = cardType;

    // Find cards expiring within X days
    if (expiringWithin) {
      const daysAhead = parseInt(expiringWithin, 10);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      query.expirationDate = {
        $gte: new Date(),
        $lte: futureDate,
      };
      query.status = 'active';
    }

    const skip = (page - 1) * limit;

    const [cards, total] = await Promise.all([
      InsuranceCard.find(query)
        .populate('patientId', 'firstName lastName email phone')
        .populate('verifiedBy', 'firstName lastName')
        .populate('replacedBy')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit, 10))
        .skip(skip),
      InsuranceCard.countDocuments(query),
    ]);

    res.json({
      success: true,
      count: cards.length,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / limit),
      data: cards,
    });
  } catch (error) {
    console.error('Error fetching insurance cards:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch insurance cards',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/insurance-cards/:id
 * @desc    Get single insurance card
 * @access  Private
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const card = await InsuranceCard.findById(req.params.id)
      .populate('patientId', 'firstName lastName email phone dateOfBirth')
      .populate('verifiedBy', 'firstName lastName')
      .populate('uploadedBy', 'firstName lastName')
      .populate('replacedBy');

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Insurance card not found',
      });
    }

    res.json({
      success: true,
      data: card,
    });
  } catch (error) {
    console.error('Error fetching insurance card:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch insurance card',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/insurance-cards/upload
 * @desc    Upload insurance card (front and/or back)
 * @access  Private
 */
router.post(
  '/upload',
  protect,
  upload.fields([
    { name: 'frontImage', maxCount: 1 },
    { name: 'backImage', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        patientId,
        cardType,
        insuranceProvider,
        memberId,
        groupNumber,
        planName,
        policyHolderName,
        policyHolderRelationship,
        effectiveDate,
        expirationDate,
        notes,
      } = req.body;

      if (!req.files || !req.files.frontImage) {
        return res.status(400).json({
          success: false,
          message: 'Front image is required',
        });
      }

      // Check if patient already has an active card of this type
      const existingCard = await InsuranceCard.getActiveForPatient(patientId, cardType);

      // Create insurance card
      const card = new InsuranceCard({
        patientId,
        cardType: cardType || 'primary',
        insuranceProvider,
        memberId,
        groupNumber,
        planName,
        policyHolderName,
        policyHolderRelationship: policyHolderRelationship || 'self',
        effectiveDate,
        expirationDate,
        frontImage: {
          url: `/uploads/insurance-cards/${req.files.frontImage[0].filename}`,
          filename: req.files.frontImage[0].filename,
          mimeType: req.files.frontImage[0].mimetype,
          size: req.files.frontImage[0].size,
          uploadedAt: new Date(),
        },
        organization: req.user.organization,
        uploadedBy: req.user._id,
        uploadSource: 'mobile_app',
        uploadDevice: req.body.deviceInfo ? JSON.parse(req.body.deviceInfo) : undefined,
        notes,
      });

      // Add back image if provided
      if (req.files.backImage) {
        card.backImage = {
          url: `/uploads/insurance-cards/${req.files.backImage[0].filename}`,
          filename: req.files.backImage[0].filename,
          mimeType: req.files.backImage[0].mimetype,
          size: req.files.backImage[0].size,
          uploadedAt: new Date(),
        };
      }

      await card.save();

      // Replace existing card if present
      if (existingCard) {
        await existingCard.replaceWith(card._id);
      }

      // Trigger OCR processing (in background)
      // In production, this would be queued for processing
      setTimeout(async () => {
        try {
          // Simulate OCR text extraction
          const frontText = `
            ${insuranceProvider || 'Insurance Provider'}
            Member ID: ${memberId || 'XXXXXXXXXX'}
            Group #: ${groupNumber || 'XXXXXX'}
            ${policyHolderName || 'John Doe'}
          `;
          await card.processOCR('front', frontText);

          if (card.backImage) {
            const backText = `
              Rx BIN: 123456
              Rx PCN: ABC123
              Customer Service: 1-800-123-4567
            `;
            await card.processOCR('back', backText);
          }
        } catch (ocrError) {
          console.error('OCR processing error:', ocrError);
        }
      }, 1000);

      const populated = await InsuranceCard.findById(card._id)
        .populate('patientId', 'firstName lastName')
        .populate('uploadedBy', 'firstName lastName');

      res.status(201).json({
        success: true,
        message: 'Insurance card uploaded successfully',
        data: populated,
      });
    } catch (error) {
      console.error('Error uploading insurance card:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload insurance card',
        error: error.message,
      });
    }
  }
);

/**
 * @route   PUT /api/insurance-cards/:id
 * @desc    Update insurance card information
 * @access  Private
 */
router.put('/:id', protect, async (req, res) => {
  try {
    const card = await InsuranceCard.findById(req.params.id);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Insurance card not found',
      });
    }

    const {
      insuranceProvider,
      insuranceProviderCode,
      planName,
      planType,
      memberId,
      groupNumber,
      policyHolderName,
      policyHolderRelationship,
      policyHolderDOB,
      rxInfo,
      customerServicePhone,
      claimsPhone,
      claimsAddress,
      effectiveDate,
      expirationDate,
      coverageDetails,
      notes,
      tags,
    } = req.body;

    // Update fields
    if (insuranceProvider) card.insuranceProvider = insuranceProvider;
    if (insuranceProviderCode) card.insuranceProviderCode = insuranceProviderCode;
    if (planName) card.planName = planName;
    if (planType) card.planType = planType;
    if (memberId) card.memberId = memberId;
    if (groupNumber) card.groupNumber = groupNumber;
    if (policyHolderName) card.policyHolderName = policyHolderName;
    if (policyHolderRelationship) card.policyHolderRelationship = policyHolderRelationship;
    if (policyHolderDOB) card.policyHolderDOB = policyHolderDOB;
    if (rxInfo) card.rxInfo = rxInfo;
    if (customerServicePhone) card.customerServicePhone = customerServicePhone;
    if (claimsPhone) card.claimsPhone = claimsPhone;
    if (claimsAddress) card.claimsAddress = claimsAddress;
    if (effectiveDate) card.effectiveDate = effectiveDate;
    if (expirationDate) card.expirationDate = expirationDate;
    if (coverageDetails) card.coverageDetails = coverageDetails;
    if (notes) card.notes = notes;
    if (tags) card.tags = tags;

    await card.save();

    const populated = await InsuranceCard.findById(card._id)
      .populate('patientId', 'firstName lastName')
      .populate('verifiedBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Insurance card updated successfully',
      data: populated,
    });
  } catch (error) {
    console.error('Error updating insurance card:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update insurance card',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/insurance-cards/:id/reupload
 * @desc    Re-upload insurance card image (front or back)
 * @access  Private
 */
router.post('/:id/reupload', protect, upload.single('image'), async (req, res) => {
  try {
    const { side } = req.body; // 'front' or 'back'

    if (!side || !['front', 'back'].includes(side)) {
      return res.status(400).json({
        success: false,
        message: 'Side must be "front" or "back"',
      });
    }

    const card = await InsuranceCard.findById(req.params.id);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Insurance card not found',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Image file is required',
      });
    }

    const imageData = {
      url: `/uploads/insurance-cards/${req.file.filename}`,
      filename: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date(),
    };

    if (side === 'front') {
      card.frontImage = imageData;
    } else {
      card.backImage = imageData;
    }

    // Reset quality check for this side
    if (card.imageQuality) {
      card.imageQuality.issues = card.imageQuality.issues.filter((issue) => issue.side !== side);
      if (side === 'front') {
        card.imageQuality.frontQuality = undefined;
      } else {
        card.imageQuality.backQuality = undefined;
      }
      card.imageQuality.needsRetake = false;
    }

    await card.save();

    // Trigger OCR reprocessing
    setTimeout(async () => {
      try {
        const ocrText = `Sample OCR text for ${side}`;
        await card.processOCR(side, ocrText);
      } catch (ocrError) {
        console.error('OCR processing error:', ocrError);
      }
    }, 1000);

    res.json({
      success: true,
      message: `${side} image re-uploaded successfully`,
      data: card,
    });
  } catch (error) {
    console.error('Error re-uploading image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to re-upload image',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/insurance-cards/:id/verify
 * @desc    Verify insurance card
 * @access  Private (Staff)
 */
router.post('/:id/verify', protect, authorize('full_access', 'admin_billing'), async (req, res) => {
  try {
    const card = await InsuranceCard.findById(req.params.id);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Insurance card not found',
      });
    }

    const { notes } = req.body;
    await card.verify(req.user._id, notes);

    res.json({
      success: true,
      message: 'Insurance card verified successfully',
      data: card,
    });
  } catch (error) {
    console.error('Error verifying insurance card:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify insurance card',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/insurance-cards/:id/verify-failed
 * @desc    Mark verification as failed
 * @access  Private (Staff)
 */
router.post(
  '/:id/verify-failed',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const card = await InsuranceCard.findById(req.params.id);

      if (!card) {
        return res.status(404).json({
          success: false,
          message: 'Insurance card not found',
        });
      }

      const { reason } = req.body;
      await card.markVerificationFailed(reason);

      res.json({
        success: true,
        message: 'Insurance card marked as verification failed',
        data: card,
      });
    } catch (error) {
      console.error('Error marking verification failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark verification failed',
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/insurance-cards/:id/check-eligibility
 * @desc    Check insurance eligibility
 * @access  Private (Staff)
 */
router.post(
  '/:id/check-eligibility',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const card = await InsuranceCard.findById(req.params.id);

      if (!card) {
        return res.status(404).json({
          success: false,
          message: 'Insurance card not found',
        });
      }

      await card.checkEligibility();

      res.json({
        success: true,
        message: 'Eligibility check completed',
        data: {
          eligibilityStatus: card.eligibilityStatus,
          eligibilityDetails: card.eligibilityDetails,
          lastCheck: card.lastEligibilityCheck,
        },
      });
    } catch (error) {
      console.error('Error checking eligibility:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check eligibility',
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/insurance-cards/:id/process-ocr
 * @desc    Trigger OCR processing manually
 * @access  Private (Staff)
 */
router.post(
  '/:id/process-ocr',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const card = await InsuranceCard.findById(req.params.id);

      if (!card) {
        return res.status(404).json({
          success: false,
          message: 'Insurance card not found',
        });
      }

      const { side, ocrText } = req.body;

      if (!side || !['front', 'back'].includes(side)) {
        return res.status(400).json({
          success: false,
          message: 'Side must be "front" or "back"',
        });
      }

      await card.processOCR(side, ocrText);

      res.json({
        success: true,
        message: 'OCR processing completed',
        data: {
          ocrData: card.ocrData,
          extractedFields: card.ocrData.extractedFields,
          confidence: card.ocrData.confidence,
        },
      });
    } catch (error) {
      console.error('Error processing OCR:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process OCR',
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/insurance-cards/:id/check-quality
 * @desc    Check image quality
 * @access  Private (Staff)
 */
router.post('/:id/check-quality', protect, async (req, res) => {
  try {
    const card = await InsuranceCard.findById(req.params.id);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Insurance card not found',
      });
    }

    const { side, qualityMetrics } = req.body;

    if (!side || !['front', 'back'].includes(side)) {
      return res.status(400).json({
        success: false,
        message: 'Side must be "front" or "back"',
      });
    }

    await card.checkImageQuality(side, qualityMetrics);

    res.json({
      success: true,
      message: 'Image quality check completed',
      data: {
        imageQuality: card.imageQuality,
        needsRetake: card.imageQuality.needsRetake,
      },
    });
  } catch (error) {
    console.error('Error checking image quality:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check image quality',
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/insurance-cards/:id
 * @desc    Delete insurance card (mark as inactive)
 * @access  Private (Staff)
 */
router.delete('/:id', protect, authorize('full_access', 'admin_billing'), async (req, res) => {
  try {
    const card = await InsuranceCard.findById(req.params.id);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Insurance card not found',
      });
    }

    card.status = 'inactive';
    card.inactivatedAt = new Date();
    card.inactivatedReason = req.body.reason || 'Deleted by staff';

    await card.save();

    res.json({
      success: true,
      message: 'Insurance card deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting insurance card:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete insurance card',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/insurance-cards/patient/:patientId
 * @desc    Get all cards for patient
 * @access  Private
 */
router.get('/patient/:patientId', protect, async (req, res) => {
  try {
    const cards = await InsuranceCard.getAllForPatient(req.params.patientId);

    res.json({
      success: true,
      count: cards.length,
      data: cards,
    });
  } catch (error) {
    console.error('Error fetching patient cards:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patient cards',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/insurance-cards/patient/:patientId/active
 * @desc    Get active card for patient
 * @access  Private
 */
router.get('/patient/:patientId/active', protect, async (req, res) => {
  try {
    const { cardType = 'primary' } = req.query;
    const card = await InsuranceCard.getActiveForPatient(req.params.patientId, cardType);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'No active insurance card found',
      });
    }

    res.json({
      success: true,
      data: card,
    });
  } catch (error) {
    console.error('Error fetching active card:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active card',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/insurance-cards/pending-verification
 * @desc    Get cards pending verification
 * @access  Private (Staff)
 */
router.get(
  '/pending-verification',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const cards = await InsuranceCard.getPendingVerification(req.user.organization);

      res.json({
        success: true,
        count: cards.length,
        data: cards,
      });
    } catch (error) {
      console.error('Error fetching pending cards:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch pending cards',
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/insurance-cards/expiring
 * @desc    Get expiring cards
 * @access  Private (Staff)
 */
router.get('/expiring', protect, authorize('full_access', 'admin_billing'), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const cards = await InsuranceCard.getExpiringCards(req.user.organization, parseInt(days, 10));

    res.json({
      success: true,
      count: cards.length,
      data: cards,
    });
  } catch (error) {
    console.error('Error fetching expiring cards:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expiring cards',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/insurance-cards/quality-issues
 * @desc    Get cards with quality issues
 * @access  Private (Staff)
 */
router.get(
  '/quality-issues',
  protect,
  authorize('full_access', 'admin_billing'),
  async (req, res) => {
    try {
      const cards = await InsuranceCard.getCardsWithQualityIssues(req.user.organization);

      res.json({
        success: true,
        count: cards.length,
        data: cards,
      });
    } catch (error) {
      console.error('Error fetching cards with quality issues:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch cards with quality issues',
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/insurance-cards/statistics
 * @desc    Get insurance card statistics
 * @access  Private (Staff)
 */
router.get('/statistics', protect, authorize('full_access', 'admin_billing'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required',
      });
    }

    const stats = await InsuranceCard.getStatistics(req.user.organization, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message,
    });
  }
});

module.exports = router;
