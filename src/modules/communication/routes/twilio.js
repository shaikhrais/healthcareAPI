const express = require('express');

const mongoose = require('mongoose');

const twilioController = require('../controllers/twilioController');
/**
 * Twilio Integration API Routes
 * TASK-15.11 - Twilio SMS/Voice Integration
 *
 * Endpoints for managing SMS, MMS, and voice calls via Twilio
 */

const router = express.Router();
// eslint-disable-next-line no-unused-vars
// Simple auth middleware
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

// ==================== SMS ENDPOINTS ====================

/**
 * @route   POST /api/twilio/sms/send
 * @desc    Send an SMS message
 * @access  Private
 */
router.post('/sms/send', protect, twilioController.sendSms);

/**
 * @route   POST /api/twilio/sms/send-bulk
 * @desc    Send bulk SMS messages
 * @access  Private
 */
router.post('/sms/send-bulk', protect, twilioController.sendBulkSms);

/**
 * @route   POST /api/twilio/sms/receive
 * @desc    Webhook for receiving inbound SMS
 * @access  Public (Twilio webhook)
 */
router.post('/sms/receive', twilioController.inboundSmsWebhook);

/**
 * @route   POST /api/twilio/sms/status
 * @desc    Webhook for SMS delivery status updates
 * @access  Public (Twilio webhook)
 */
router.post('/sms/status', twilioController.smsStatusUpdate);

// ==================== VOICE ENDPOINTS ====================

/**
 * @route   POST /api/twilio/voice/call
 * @desc    Make an outbound voice call
 * @access  Private
 */
router.post('/voice/call', protect, twilioController.makeCall);

/**
 * @route   POST /api/twilio/voice/receive
 * @desc    Webhook for receiving inbound calls
 * @access  Public (Twilio webhook)
 */
router.post('/voice/receive', twilioController.receiveCallWebhook);

/**
 * @route   POST /api/twilio/voice/status
 * @desc    Webhook for call status updates
 * @access  Public (Twilio webhook)
 */
router.post('/voice/status', twilioController.voiceStatusUpdate);

// ==================== CONVERSATION MANAGEMENT ====================

/**
 * @route   GET /api/twilio/conversations/:phone1/:phone2
 * @desc    Get conversation between two phone numbers
 * @access  Private
 */
router.get('/conversations/:phone1/:phone2', protect, twilioController.getConversation);

/**
 * @route   GET /api/twilio/user/:userId/messages
 * @desc    Get messages for a user
 * @access  Private
 */
router.get('/user/:userId/messages', protect, twilioController.getUserMessages);

/**
 * @route   GET /api/twilio/phone/:phoneNumber
 * @desc    Get messages by phone number
 * @access  Private
 */
router.get('/phone/:phoneNumber', protect, twilioController.getMessagesByPhone);

// ==================== MESSAGE MANAGEMENT ====================

/**
 * @route   GET /api/twilio/messages/:id
 * @desc    Get a message by ID
 * @access  Private
 */
router.get('/messages/:id', protect, twilioController.getMessageById);

/**
 * @route   GET /api/twilio/messages
 * @desc    List messages with filters
 * @access  Private
 */
router.get('/messages', protect, twilioController.listMessages);

/**
 * @route   PUT /api/twilio/messages/:id/read
 * @desc    Mark message as read
 * @access  Private
 */
router.put('/messages/:id/read', protect, twilioController.markMessageRead);

/**
 * @route   DELETE /api/twilio/messages/:id
 * @desc    Delete a message (soft delete)
 * @access  Private
 */
router.delete('/messages/:id', protect, twilioController.deleteMessage);

// ==================== SCHEDULED MESSAGES ====================

/**
 * @route   GET /api/twilio/scheduled
 * @desc    Get scheduled messages
 * @access  Private
 */
router.get('/scheduled', protect, twilioController.getScheduledMessages);

/**
 * @route   PUT /api/twilio/scheduled/:id/cancel
 * @desc    Cancel a scheduled message
 * @access  Private
 */
router.put('/scheduled/:id/cancel', protect, twilioController.cancelScheduledMessage);

// ==================== OPT-IN/OPT-OUT ====================

/**
 * @route   GET /api/twilio/opt-out/check/:phoneNumber
 * @desc    Check opt-out status for a phone number
 * @access  Private
 */
router.get('/opt-out/check/:phoneNumber', protect, twilioController.checkOptOutStatus);

/**
 * @route   POST /api/twilio/opt-out/:messageId
 * @desc    Manually opt out a phone number
 * @access  Private
 */
router.post('/opt-out/:messageId', protect, twilioController.optOutPhoneNumber);

// ==================== ANALYTICS ====================

/**
 * @route   GET /api/twilio/analytics/delivery
 * @desc    Get delivery stats
 * @access  Private
 */
router.get('/analytics/delivery', protect, twilioController.getDeliveryStats);

/**
 * @route   GET /api/twilio/analytics/response-rate
 * @desc    Get response rate
 * @access  Private
 */
router.get('/analytics/response-rate', protect, twilioController.getResponseRate);

/**
 * @route   GET /api/twilio/analytics/campaign/:campaignId
 * @desc    Get campaign analytics
 * @access  Private
 */
router.get('/analytics/campaign/:campaignId', protect, twilioController.getCampaignAnalytics);

// ==================== ADMIN OPERATIONS ====================

/**
 * @route   GET /api/twilio/admin/undelivered
 * @desc    Get undelivered messages
 * @access  Private (Admin)
 */
router.get('/admin/undelivered', protect, twilioController.getUndeliveredMessages);

/**
 * @route   POST /api/twilio/admin/cleanup
 * @desc    Cleanup old messages
 * @access  Private (Admin)
 */
router.post('/admin/cleanup', protect, twilioController.cleanupOldMessages);

module.exports = router;
