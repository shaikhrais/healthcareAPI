
const express = require('express');
const doxyController = require('../controllers/doxyController');
const router = express.Router();
// Simple auth middleware (replace with real one in production)
const protect = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const organizationId = req.headers['x-organization-id'];
  if (!userId || !organizationId) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please provide x-user-id and x-organization-id headers',
    });
  }
  req.userId = userId;
  req.organizationId = organizationId;
  next();
};

router.post('/rooms', protect, doxyController.createRoom);

/**
 * @route   GET /api/doxy/rooms/:id
 * @desc    Get a Doxy.me room by ID
 * @access  Private
 */
router.get('/rooms/:id', protect, doxyController.getRoomById);

/**
 * @route   GET /api/doxy/rooms/name/:roomName
 * @desc    Get a room by room name
 * @access  Public (for patient join)
 */
router.get('/rooms/name/:roomName', doxyController.getRoomByName);

/**
 * @route   GET /api/doxy/rooms
 * @desc    List all rooms (with filters)
 * @access  Private
 */
router.get('/rooms', protect, doxyController.listRooms);

/**
 * @route   PUT /api/doxy/rooms/:id
 * @desc    Update a room
 * @access  Private
 */
router.put('/rooms/:id', protect, doxyController.updateRoom);

/**
 * @route   DELETE /api/doxy/rooms/:id
 * @desc    Delete a room (soft delete)
 * @access  Private
 */
router.delete('/rooms/:id', protect, doxyController.deleteRoom);

// ==================== SESSION MANAGEMENT ====================

/**
 * @route   POST /api/doxy/rooms/:id/start
 * @desc    Start a session
 * @access  Private
 */
router.post('/rooms/:id/start', protect, async (req, res) => {
  try {
    const room = await DoxyRoom.findOne({
      _id: req.params.id,
      organization: req.organizationId,
      isDeleted: false,
    });

    if (!room) {
      return res.status(404).json({
        error: 'Room not found',
      });
    }

    await room.startSession();

    res.json({
      message: 'Session started',
      room,
    });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({
      error: 'Failed to start session',
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/doxy/rooms/:id/end
 * @desc    End a session
 * @access  Private
 */
router.post('/rooms/:id/end', protect, async (req, res) => {
  try {
    const room = await DoxyRoom.findOne({
      _id: req.params.id,
      organization: req.organizationId,
      isDeleted: false,
    });

    if (!room) {
      return res.status(404).json({
        error: 'Room not found',
      });
    }

    await room.endSession();

    res.json({
      message: 'Session ended',
      room,
      summary: room.getSessionSummary(),
    });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({
      error: 'Failed to end session',
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/doxy/rooms/:id/cancel
 * @desc    Cancel a session
 * @access  Private
 */
router.post('/rooms/:id/cancel', protect, async (req, res) => {
  try {
    const { reason } = req.body;

    const room = await DoxyRoom.findOne({
      _id: req.params.id,
      organization: req.organizationId,
      isDeleted: false,
    });

    if (!room) {
      return res.status(404).json({
        error: 'Room not found',
      });
    }

    await room.cancelSession(reason);

    res.json({
      message: 'Session cancelled',
      room,
    });
  } catch (error) {
    console.error('Cancel session error:', error);
    res.status(500).json({
      error: 'Failed to cancel session',
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/doxy/rooms/:id/no-show
 * @desc    Mark session as no-show
 * @access  Private
 */
router.post('/rooms/:id/no-show', protect, async (req, res) => {
  try {
    const room = await DoxyRoom.findOne({
      _id: req.params.id,
      organization: req.organizationId,
      isDeleted: false,
    });

    if (!room) {
      return res.status(404).json({
        error: 'Room not found',
      });
    }

    await room.markNoShow();

    res.json({
      message: 'Session marked as no-show',
      room,
    });
  } catch (error) {
    console.error('Mark no-show error:', error);
    res.status(500).json({
      error: 'Failed to mark no-show',
      message: error.message,
    });
  }
});

// ==================== WAITING ROOM ====================

/**
 * @route   POST /api/doxy/rooms/:id/waiting-room/join
 * @desc    Patient joins waiting room
 * @access  Public
 */
router.post('/rooms/:id/waiting-room/join', async (req, res) => {
  try {
    const room = await DoxyRoom.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    if (!room) {
      return res.status(404).json({
        error: 'Room not found',
      });
    }

    if (!room.canJoin) {
      return res.status(400).json({
        error: 'Cannot join yet',
        message: 'Session is not ready for joining',
      });
    }

    await room.patientJoinWaitingRoom();

    res.json({
      message: 'Joined waiting room',
      room: {
        _id: room._id,
        displayName: room.displayName,
        provider: room.provider,
        status: room.session.status,
      },
    });
  } catch (error) {
    console.error('Join waiting room error:', error);
    res.status(500).json({
      error: 'Failed to join waiting room',
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/doxy/waiting-room/queue
 * @desc    Get waiting room queue for provider
 * @access  Private
 */
router.get('/waiting-room/queue', protect, async (req, res) => {
  try {
    const { providerId } = req.query;

    const queue = await DoxyRoom.getWaitingRoomQueue(providerId || req.userId);

    res.json({
      queue,
      count: queue.length,
    });
  } catch (error) {
    console.error('Get waiting room queue error:', error);
    res.status(500).json({
      error: 'Failed to get queue',
      message: error.message,
    });
  }
});

// ==================== PARTICIPANTS ====================

/**
 * @route   POST /api/doxy/rooms/:id/participants
 * @desc    Add a participant to session
 * @access  Private
 */
router.post('/rooms/:id/participants', protect, async (req, res) => {
  try {
    const room = await DoxyRoom.findOne({
      _id: req.params.id,
      organization: req.organizationId,
      isDeleted: false,
    });

    if (!room) {
      return res.status(404).json({
        error: 'Room not found',
      });
    }

    await room.addParticipant(req.body);

    res.json({
      message: 'Participant added',
      room,
    });
  } catch (error) {
    console.error('Add participant error:', error);
    res.status(500).json({
      error: 'Failed to add participant',
      message: error.message,
    });
  }
});

/**
 * @route   DELETE /api/doxy/rooms/:id/participants/:userId
 * @desc    Remove a participant from session
 * @access  Private
 */
router.delete('/rooms/:id/participants/:userId', protect, async (req, res) => {
  try {
    const room = await DoxyRoom.findOne({
      _id: req.params.id,
      organization: req.organizationId,
      isDeleted: false,
    });

    if (!room) {
      return res.status(404).json({
        error: 'Room not found',
      });
    }

    await room.removeParticipant(req.params.userId);

    res.json({
      message: 'Participant removed',
      room,
    });
  } catch (error) {
    console.error('Remove participant error:', error);
    res.status(500).json({
      error: 'Failed to remove participant',
      message: error.message,
    });
  }
});

// ==================== CHAT ====================

/**
 * @route   POST /api/doxy/rooms/:id/chat
 * @desc    Send a chat message
 * @access  Private
 */
router.post('/rooms/:id/chat', protect, async (req, res) => {
  try {
    const room = await DoxyRoom.findOne({
      _id: req.params.id,
      organization: req.organizationId,
      isDeleted: false,
    });

    if (!room) {
      return res.status(404).json({
        error: 'Room not found',
      });
    }

    if (!room.settings.chatEnabled) {
      return res.status(400).json({
        error: 'Chat is disabled for this session',
      });
    }

    const { message, type, fileUrl } = req.body;

    await room.addChatMessage({
      senderId: req.userId,
      message,
      type: type || 'text',
      fileUrl,
    });

    res.json({
      message: 'Message sent',
      room,
    });
  } catch (error) {
    console.error('Send chat message error:', error);
    res.status(500).json({
      error: 'Failed to send message',
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/doxy/rooms/:id/chat
 * @desc    Get chat history
 * @access  Private
 */
router.get('/rooms/:id/chat', protect, async (req, res) => {
  try {
    const room = await DoxyRoom.findOne({
      _id: req.params.id,
      organization: req.organizationId,
      isDeleted: false,
    });

    if (!room) {
      return res.status(404).json({
        error: 'Room not found',
      });
    }

    res.json({
      messages: room.chatMessages,
      count: room.chatMessages.length,
    });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({
      error: 'Failed to get chat history',
      message: error.message,
    });
  }
});

// ==================== RECORDING ====================

/**
 * @route   POST /api/doxy/rooms/:id/recording/start
 * @desc    Start recording
 * @access  Private
 */
router.post('/rooms/:id/recording/start', protect, async (req, res) => {
  try {
    const room = await DoxyRoom.findOne({
      _id: req.params.id,
      organization: req.organizationId,
      isDeleted: false,
    });

    if (!room) {
      return res.status(404).json({
        error: 'Room not found',
      });
    }

    await room.startRecording();

    res.json({
      message: 'Recording started',
      room,
    });
  } catch (error) {
    console.error('Start recording error:', error);
    res.status(500).json({
      error: 'Failed to start recording',
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/doxy/rooms/:id/recording/stop
 * @desc    Stop recording
 * @access  Private
 */
router.post('/rooms/:id/recording/stop', protect, async (req, res) => {
  try {
    const room = await DoxyRoom.findOne({
      _id: req.params.id,
      organization: req.organizationId,
      isDeleted: false,
    });

    if (!room) {
      return res.status(404).json({
        error: 'Room not found',
      });
    }

    await room.stopRecording();

    res.json({
      message: 'Recording stopped',
      room,
    });
  } catch (error) {
    console.error('Stop recording error:', error);
    res.status(500).json({
      error: 'Failed to stop recording',
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/doxy/rooms/:id/recording/consent
 * @desc    Record consent for recording
 * @access  Private
 */
router.post('/rooms/:id/recording/consent', protect, async (req, res) => {
  try {
    const { role } = req.body; // 'provider' or 'patient'

    const room = await DoxyRoom.findOne({
      _id: req.params.id,
      organization: req.organizationId,
      isDeleted: false,
    });

    if (!room) {
      return res.status(404).json({
        error: 'Room not found',
      });
    }

    if (role === 'provider') {
      room.settings.recordingConsent.provider = {
        consented: true,
        consentedAt: new Date(),
      };
    } else if (role === 'patient') {
      room.settings.recordingConsent.patient = {
        consented: true,
        consentedAt: new Date(),
      };
    } else {
      return res.status(400).json({
        error: 'Invalid role',
        message: 'Role must be "provider" or "patient"',
      });
    }

    await room.save();

    res.json({
      message: 'Recording consent recorded',
      room,
    });
  } catch (error) {
    console.error('Record consent error:', error);
    res.status(500).json({
      error: 'Failed to record consent',
      message: error.message,
    });
  }
});

// ==================== TECHNICAL ====================

/**
 * @route   POST /api/doxy/rooms/:id/connection-quality
 * @desc    Update connection quality
 * @access  Private
 */
router.post('/rooms/:id/connection-quality', protect, async (req, res) => {
  try {
    const { role, quality } = req.body;

    const room = await DoxyRoom.findOne({
      _id: req.params.id,
      organization: req.organizationId,
      isDeleted: false,
    });

    if (!room) {
      return res.status(404).json({
        error: 'Room not found',
      });
    }

    await room.updateConnectionQuality(role, quality);

    res.json({
      message: 'Connection quality updated',
      room,
    });
  } catch (error) {
    console.error('Update connection quality error:', error);
    res.status(500).json({
      error: 'Failed to update connection quality',
      message: error.message,
    });
  }
});

/**
 * @route   POST /api/doxy/rooms/:id/technical-issue
 * @desc    Report a technical issue
 * @access  Private
 */
router.post('/rooms/:id/technical-issue', protect, async (req, res) => {
  try {
    const { issue, severity } = req.body;

    const room = await DoxyRoom.findOne({
      _id: req.params.id,
      organization: req.organizationId,
      isDeleted: false,
    });

    if (!room) {
      return res.status(404).json({
        error: 'Room not found',
      });
    }

    await room.reportTechnicalIssue({
      issue,
      severity: severity || 'medium',
      resolved: false,
    });

    res.json({
      message: 'Technical issue reported',
      room,
    });
  } catch (error) {
    console.error('Report technical issue error:', error);
    res.status(500).json({
      error: 'Failed to report issue',
      message: error.message,
    });
  }
});

// ==================== ANALYTICS & REPORTING ====================

/**
 * @route   GET /api/doxy/rooms/:id/summary
 * @desc    Get session summary
 * @access  Private
 */
router.get('/rooms/:id/summary', protect, async (req, res) => {
  try {
    const room = await DoxyRoom.findOne({
      _id: req.params.id,
      organization: req.organizationId,
      isDeleted: false,
    });

    if (!room) {
      return res.status(404).json({
        error: 'Room not found',
      });
    }

    res.json(room.getSessionSummary());
  } catch (error) {
    console.error('Get session summary error:', error);
    res.status(500).json({
      error: 'Failed to get summary',
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/doxy/analytics
 * @desc    Get analytics for date range
 * @access  Private
 */
router.get('/analytics', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: ['startDate', 'endDate'],
      });
    }

    const analytics = await DoxyRoom.getAnalytics(req.organizationId, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    res.json(analytics);
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      error: 'Failed to get analytics',
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/doxy/provider/:providerId/upcoming
 * @desc    Get upcoming sessions for provider
 * @access  Private
 */
router.get('/provider/:providerId/upcoming', protect, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const sessions = await DoxyRoom.getUpcomingForProvider(req.params.providerId, parseInt(limit, 10));

    res.json({
      sessions,
      count: sessions.length,
    });
  } catch (error) {
    console.error('Get upcoming sessions error:', error);
    res.status(500).json({
      error: 'Failed to get upcoming sessions',
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/doxy/patient/:patientId/upcoming
 * @desc    Get upcoming sessions for patient
 * @access  Private
 */
router.get('/patient/:patientId/upcoming', protect, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const sessions = await DoxyRoom.getUpcomingForPatient(req.params.patientId, parseInt(limit, 10));

    res.json({
      sessions,
      count: sessions.length,
    });
  } catch (error) {
    console.error('Get upcoming sessions error:', error);
    res.status(500).json({
      error: 'Failed to get upcoming sessions',
      message: error.message,
    });
  }
});

/**
 * @route   GET /api/doxy/active
 * @desc    Get active sessions
 * @access  Private
 */
router.get('/active', protect, async (req, res) => {
  try {
    const sessions = await DoxyRoom.getActiveSessions(req.organizationId);

    res.json({
      sessions,
      count: sessions.length,
    });
  } catch (error) {
    console.error('Get active sessions error:', error);
    res.status(500).json({
      error: 'Failed to get active sessions',
      message: error.message,
    });
  }
});

// ==================== ADMIN OPERATIONS ====================

/**
 * @route   POST /api/doxy/admin/cleanup
 * @desc    Cleanup old sessions
 * @access  Private (Admin)
 */
router.post('/admin/cleanup', protect, async (req, res) => {
  try {
    const { daysToKeep = 90 } = req.body;

    const result = await DoxyRoom.cleanupOldSessions(daysToKeep);

    res.json({
      message: 'Cleanup completed',
      modified: result.modifiedCount,
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({
      error: 'Failed to cleanup sessions',
      message: error.message,
    });
  }
});

module.exports = router;
