/* eslint-disable camelcase */
const express = require('express');
const sendgridController = require('../controllers/sendgridController');
/**
 * SendGrid Email Service API Routes
 * TASK-15.12 - SendGrid Email Service
 *
 * Endpoints for managing transactional and marketing emails via SendGrid
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

// ==================== EMAIL SENDING ====================

/**
 * @route   POST /api/sendgrid/send
 * @desc    Send an email
 * @access  Private
 */
router.post('/send', protect, sendgridController.send);

/**
 * @route   POST /api/sendgrid/send-template
 * @desc    Send email using SendGrid template
 * @access  Private
 */
router.post('/send-template', protect, sendgridController.sendTemplate);

/**
 * @route   POST /api/sendgrid/send-bulk
 * @desc    Send bulk emails with personalization
 * @access  Private
 */
router.post('/send-bulk', protect, sendgridController.sendBulk);

// ==================== WEBHOOKS ====================

/**
 * @route   POST /api/sendgrid/webhook/events
 * @desc    Handle SendGrid webhook events
 * @access  Public (SendGrid webhook)
 */
router.post('/webhook/events', sendgridController.webhookEvents);

// ==================== EMAIL MANAGEMENT ====================

/**
 * @route   GET /api/sendgrid/emails/:id
 * @desc    Get an email by ID
 * @access  Private
 */
router.get('/emails/:id', protect, sendgridController.getEmailById);

/**
 * @route   GET /api/sendgrid/emails
 * @desc    List emails with filters
 * @access  Private
 */
router.get('/emails', protect, sendgridController.listEmails);

/**
 * @route   GET /api/sendgrid/emails/recipient/:email
 * @desc    Get emails sent to a specific recipient
 * @access  Private
 */
router.get('/emails/recipient/:email', protect, sendgridController.getEmailsByRecipient);

/**
 * @route   DELETE /api/sendgrid/emails/:id
 * @desc    Delete an email (soft delete)
 * @access  Private
 */
router.delete('/emails/:id', protect, sendgridController.deleteEmail);

// ==================== SCHEDULED EMAILS ====================

/**
 * @route   GET /api/sendgrid/scheduled
 * @desc    Get scheduled emails
 * @access  Private
 */
router.get('/scheduled', protect, sendgridController.getScheduledEmails);

/**
 * @route   PUT /api/sendgrid/scheduled/:id/cancel
 * @desc    Cancel a scheduled email
 * @access  Private
 */
router.put('/scheduled/:id/cancel', protect, sendgridController.cancelScheduled);

// ==================== CAMPAIGN MANAGEMENT ====================

/**
 * @route   GET /api/sendgrid/campaign/:campaignId
 * @desc    Get campaign emails
 * @access  Private
 */
router.get('/campaign/:campaignId', protect, sendgridController.getCampaignEmails);

/**
 * @route   GET /api/sendgrid/campaign/:campaignId/stats
 * @desc    Get campaign statistics
 * @access  Private
 */
router.get('/campaign/:campaignId/stats', protect, sendgridController.getCampaignStats);

// ==================== ANALYTICS ====================

/**
 * @route   GET /api/sendgrid/analytics/delivery
 * @desc    Get delivery statistics
 * @access  Private
 */
router.get('/analytics/delivery', protect, sendgridController.getDeliveryStats);

/**
 * @route   GET /api/sendgrid/analytics/engagement
 * @desc    Get engagement analytics
 * @access  Private
 */
router.get('/analytics/engagement', protect, sendgridController.getEngagementAnalytics);

// ==================== BOUNCES & SUPPRESSION ====================

/**
 * @route   GET /api/sendgrid/bounces
 * @desc    Get bounced emails
 * @access  Private
 */
router.get('/bounces', protect, sendgridController.getBouncedEmails);

/**
 * @route   GET /api/sendgrid/suppression-list
 * @desc    Get suppression list (bounced, spam, unsubscribed)
 * @access  Private
 */
router.get('/suppression-list', protect, sendgridController.getSuppressionList);

// ==================== ADMIN OPERATIONS ====================

/**
 * @route   POST /api/sendgrid/admin/cleanup
 * @desc    Cleanup old emails
 * @access  Private (Admin)
 */
router.post('/admin/cleanup', protect, sendgridController.cleanupOldEmails);

/**
 * @route   GET /api/sendgrid/health
 * @desc    Check SendGrid service health
 * @access  Private
 */
router.get('/health', protect, sendgridController.health);

module.exports = router;
