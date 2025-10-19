const express = require('express');


const BetaProgram = require('../models/BetaProgram');
/**
 * Beta Testing API Routes
 * TASK-14.22 - Beta Testing (TestFlight/Play Beta)
 *
 * Complete API for managing beta testing programs
 * Features:
 * - Beta program CRUD
 * - Tester enrollment and management
 * - Feedback collection
 * - Crash reporting
 * - Feature flags
 * - Analytics and metrics
 */

const router = express.Router();
// Mock authentication middleware
const protect = (req, res, next) => {
  req.user = { _id: req.headers['x-user-id'] || '507f1f77bcf86cd799439011' };
  next();
};

// ==================== BETA PROGRAMS ====================

/**
 * @route   GET /api/beta-testing/programs
 * @desc    Get all beta programs
 * @access  Private
 */
router.get('/programs', protect, async (req, res) => {
  try {
    const { status, platform } = req.query;
    const query = {};

    if (status) query.status = status;
    if (platform) {
      query.$or = [{ platform }, { platform: 'both' }];
    }

    const programs = await BetaProgram.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: programs.length,
      data: programs,
    });
  } catch (error) {
    console.error('Error fetching programs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch programs',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/beta-testing/programs/active
 * @desc    Get active beta programs
 * @access  Public
 */
router.get('/programs/active', async (req, res) => {
  try {
    const { platform } = req.query;
    const programs = await BetaProgram.getActivePrograms(platform);

    res.json({
      success: true,
      count: programs.length,
      data: programs,
    });
  } catch (error) {
    console.error('Error fetching active programs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active programs',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/beta-testing/programs/:id
 * @desc    Get beta program by ID
 * @access  Private
 */
router.get('/programs/:id', protect, async (req, res) => {
  try {
    const program = await BetaProgram.findById(req.params.id);

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found',
      });
    }

    res.json({
      success: true,
      data: program,
    });
  } catch (error) {
    console.error('Error fetching program:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch program',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/beta-testing/programs
 * @desc    Create new beta program
 * @access  Private
 */
router.post('/programs', protect, async (req, res) => {
  try {
    const programData = {
      ...req.body,
      createdBy: req.user._id,
    };

    const program = await BetaProgram.create(programData);

    res.status(201).json({
      success: true,
      message: 'Beta program created successfully',
      data: program,
    });
  } catch (error) {
    console.error('Error creating program:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create program',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/beta-testing/programs/:id
 * @desc    Update beta program
 * @access  Private
 */
router.put('/programs/:id', protect, async (req, res) => {
  try {
    const program = await BetaProgram.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found',
      });
    }

    res.json({
      success: true,
      message: 'Program updated successfully',
      data: program,
    });
  } catch (error) {
    console.error('Error updating program:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update program',
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/beta-testing/programs/:id
 * @desc    Delete beta program
 * @access  Private
 */
router.delete('/programs/:id', protect, async (req, res) => {
  try {
    const program = await BetaProgram.findByIdAndDelete(req.params.id);

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found',
      });
    }

    res.json({
      success: true,
      message: 'Program deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting program:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete program',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/beta-testing/programs/:id/stats
 * @desc    Get program statistics
 * @access  Private
 */
router.get('/programs/:id/stats', protect, async (req, res) => {
  try {
    const program = await BetaProgram.findById(req.params.id);

    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found',
      });
    }

    const stats = program.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stats',
      error: error.message,
    });
  }
});

// ==================== TESTERS ====================

/**
 * @route   POST /api/beta-testing/programs/:id/testers/invite
 * @desc    Invite tester to beta program
 * @access  Private
 */
router.post('/programs/:id/testers/invite', protect, async (req, res) => {
  try {
    const { email, name, platform, group } = req.body;

    if (!email || !platform) {
      return res.status(400).json({
        success: false,
        message: 'Email and platform are required',
      });
    }

    const program = await BetaProgram.findById(req.params.id);
    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found',
      });
    }

    await program.inviteTester(req.user._id, email, name, platform, group);

    res.json({
      success: true,
      message: 'Tester invited successfully',
      data: program,
    });
  } catch (error) {
    console.error('Error inviting tester:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to invite tester',
    });
  }
});

/**
 * @route   POST /api/beta-testing/programs/:id/testers/accept
 * @desc    Accept beta invitation
 * @access  Public
 */
router.post('/programs/:id/testers/accept', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const program = await BetaProgram.findById(req.params.id);
    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found',
      });
    }

    await program.acceptInvitation(email);

    res.json({
      success: true,
      message: 'Invitation accepted successfully',
      data: program,
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to accept invitation',
    });
  }
});

/**
 * @route   POST /api/beta-testing/programs/:id/testers/activate
 * @desc    Activate tester (after app install)
 * @access  Public
 */
router.post('/programs/:id/testers/activate', async (req, res) => {
  try {
    const { email, deviceInfo } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const program = await BetaProgram.findById(req.params.id);
    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found',
      });
    }

    await program.activateTester(email, deviceInfo);

    res.json({
      success: true,
      message: 'Tester activated successfully',
    });
  } catch (error) {
    console.error('Error activating tester:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to activate tester',
    });
  }
});

/**
 * @route   DELETE /api/beta-testing/programs/:id/testers/:email
 * @desc    Remove tester from program
 * @access  Private
 */
router.delete('/programs/:id/testers/:email', protect, async (req, res) => {
  try {
    const program = await BetaProgram.findById(req.params.id);
    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found',
      });
    }

    await program.removeTester(req.params.email);

    res.json({
      success: true,
      message: 'Tester removed successfully',
    });
  } catch (error) {
    console.error('Error removing tester:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to remove tester',
    });
  }
});

/**
 * @route   GET /api/beta-testing/programs/:id/testers
 * @desc    Get all testers for program
 * @access  Private
 */
router.get('/programs/:id/testers', protect, async (req, res) => {
  try {
    const { status, platform, group } = req.query;

    const program = await BetaProgram.findById(req.params.id);
    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found',
      });
    }

    let { testers } = program;

    if (status) {
      testers = testers.filter((t) => t.status === status);
    }
    if (platform) {
      testers = testers.filter((t) => t.platform === platform);
    }
    if (group) {
      testers = testers.filter((t) => t.group === group);
    }

    res.json({
      success: true,
      count: testers.length,
      data: testers,
    });
  } catch (error) {
    console.error('Error fetching testers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch testers',
      error: error.message,
    });
  }
});

// ==================== FEEDBACK ====================

/**
 * @route   POST /api/beta-testing/programs/:id/feedback
 * @desc    Submit feedback
 * @access  Private
 */
router.post('/programs/:id/feedback', protect, async (req, res) => {
  try {
    const program = await BetaProgram.findById(req.params.id);
    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found',
      });
    }

    await program.submitFeedback(req.user._id, req.body);

    res.json({
      success: true,
      message: 'Feedback submitted successfully',
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/beta-testing/programs/:id/feedback
 * @desc    Get all feedback for program
 * @access  Private
 */
router.get('/programs/:id/feedback', protect, async (req, res) => {
  try {
    const { type, severity, status } = req.query;

    const program = await BetaProgram.findById(req.params.id);
    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found',
      });
    }

    let { feedback } = program;

    if (type) {
      feedback = feedback.filter((f) => f.type === type);
    }
    if (severity) {
      feedback = feedback.filter((f) => f.severity === severity);
    }
    if (status) {
      feedback = feedback.filter((f) => f.status === status);
    }

    res.json({
      success: true,
      count: feedback.length,
      data: feedback,
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/beta-testing/programs/:id/feedback/:feedbackId
 * @desc    Update feedback status
 * @access  Private
 */
router.put('/programs/:id/feedback/:feedbackId', protect, async (req, res) => {
  try {
    const program = await BetaProgram.findById(req.params.id);
    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found',
      });
    }

    const feedback = program.feedback.id(req.params.feedbackId);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found',
      });
    }

    Object.assign(feedback, req.body);

    if (req.body.status === 'resolved') {
      feedback.resolvedAt = new Date();
    }

    await program.save();

    res.json({
      success: true,
      message: 'Feedback updated successfully',
      data: feedback,
    });
  } catch (error) {
    console.error('Error updating feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update feedback',
      error: error.message,
    });
  }
});

// ==================== CRASHES ====================

/**
 * @route   POST /api/beta-testing/programs/:id/crashes
 * @desc    Report crash
 * @access  Private
 */
router.post('/programs/:id/crashes', protect, async (req, res) => {
  try {
    const program = await BetaProgram.findById(req.params.id);
    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found',
      });
    }

    await program.reportCrash(req.user._id, req.body);

    res.json({
      success: true,
      message: 'Crash reported successfully',
    });
  } catch (error) {
    console.error('Error reporting crash:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to report crash',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/beta-testing/programs/:id/crashes
 * @desc    Get all crashes for program
 * @access  Private
 */
router.get('/programs/:id/crashes', protect, async (req, res) => {
  try {
    const { resolved } = req.query;

    const program = await BetaProgram.findById(req.params.id);
    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found',
      });
    }

    let { crashes } = program;

    if (resolved !== undefined) {
      crashes = crashes.filter((c) => c.resolved === (resolved === 'true'));
    }

    res.json({
      success: true,
      count: crashes.length,
      data: crashes,
    });
  } catch (error) {
    console.error('Error fetching crashes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch crashes',
      error: error.message,
    });
  }
});

// ==================== FEATURE FLAGS ====================

/**
 * @route   GET /api/beta-testing/programs/:id/features
 * @desc    Get all feature flags
 * @access  Private
 */
router.get('/programs/:id/features', protect, async (req, res) => {
  try {
    const program = await BetaProgram.findById(req.params.id);
    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found',
      });
    }

    res.json({
      success: true,
      data: program.featureFlags,
    });
  } catch (error) {
    console.error('Error fetching features:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch features',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/beta-testing/programs/:id/features
 * @desc    Add feature flag
 * @access  Private
 */
router.post('/programs/:id/features', protect, async (req, res) => {
  try {
    const program = await BetaProgram.findById(req.params.id);
    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found',
      });
    }

    program.featureFlags.push(req.body);
    await program.save();

    res.json({
      success: true,
      message: 'Feature flag added successfully',
      data: program.featureFlags,
    });
  } catch (error) {
    console.error('Error adding feature:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add feature',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/beta-testing/programs/:id/features/:featureName/check
 * @desc    Check if feature is enabled for user
 * @access  Private
 */
router.get('/programs/:id/features/:featureName/check', protect, async (req, res) => {
  try {
    const { group } = req.query;

    const program = await BetaProgram.findById(req.params.id);
    if (!program) {
      return res.status(404).json({
        success: false,
        message: 'Program not found',
      });
    }

    const enabled = program.isFeatureEnabled(req.params.featureName, req.user._id, group);

    res.json({
      success: true,
      data: { enabled },
    });
  } catch (error) {
    console.error('Error checking feature:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check feature',
      error: error.message,
    });
  }
});

// ==================== ANALYTICS ====================

/**
 * @route   GET /api/beta-testing/stats
 * @desc    Get overall statistics
 * @access  Private
 */
router.get('/stats', protect, async (req, res) => {
  try {
    const stats = await BetaProgram.getOverallStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching overall stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch overall stats',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/beta-testing/my-programs
 * @desc    Get programs user is testing
 * @access  Private
 */
router.get('/my-programs', protect, async (req, res) => {
  try {
    const email = req.query.email || req.user.email;
    const programs = await BetaProgram.findTester(email);

    res.json({
      success: true,
      count: programs.length,
      data: programs,
    });
  } catch (error) {
    console.error('Error fetching user programs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user programs',
      error: error.message,
    });
  }
});

module.exports = router;
