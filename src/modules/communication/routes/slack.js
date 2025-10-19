/* eslint-disable camelcase */
const express = require('express');
const slackController = require('../controllers/slackController');
const { protect } = require('../middleware/auth');
const router = express.Router();
// Apply authentication middleware to all routes except webhooks
router.use((req, res, next) => {
  if (
    req.path === '/webhook/events' ||
    req.path === '/webhook/interactions' ||
    req.path === '/webhook/commands'
  ) {
    return next();
  }
  return protect(req, res, next);
});

/**
 * @route   POST /api/slack/connect
 * @desc    Connect to Slack workspace
 * @access  Private
 */
router.post('/connect', slackController.connect);

/**
 * @route   POST /api/slack/disconnect
 * @desc    Disconnect from Slack
 * @access  Private
 */
router.post('/disconnect', slackController.disconnect);

/**
 * @route   GET /api/slack/connection
 * @desc    Get current Slack connection status
 * @access  Private
 */
router.get('/connection', slackController.getConnection);

/**
 * @route   GET /api/slack/channels
 * @desc    Get all Slack channels
 * @access  Private
 */
router.get('/channels', slackController.getChannels);

/**
 * @route   POST /api/slack/channels
 * @desc    Add or update a channel
 * @access  Private
 */
router.post('/channels', slackController.addOrUpdateChannel);

/**
 * @route   PUT /api/slack/channels/:channelId/notifications
 * @desc    Update channel notification settings
 * @access  Private
 */
router.put('/channels/:channelId/notifications', slackController.updateChannelNotifications);

/**
 * @route   GET /api/slack/users
 * @desc    Get all Slack users
 * @access  Private
 */
router.get('/users', slackController.getUsers);

/**
 * @route   POST /api/slack/users
 * @desc    Add or update a user
 * @access  Private
 */
router.post('/users', slackController.addOrUpdateUser);

/**
 * @route   POST /api/slack/messages
 * @desc    Send a message to Slack
 * @access  Private
 */
router.post('/messages', slackController.sendMessage);

/**
 * @route   GET /api/slack/messages
 * @desc    Get messages
 * @access  Private
 */
router.get('/messages', slackController.getMessages);

/**
 * @route   GET /api/slack/notification-rules
 * @desc    Get all notification rules
 * @access  Private
 */
router.get('/notification-rules', slackController.getNotificationRules);

/**
 * @route   POST /api/slack/notification-rules
 * @desc    Create a notification rule
 * @access  Private
 */
router.post('/notification-rules', slackController.createNotificationRule);

/**
 * @route   PUT /api/slack/notification-rules/:ruleId
 * @desc    Update a notification rule
 * @access  Private
 */
router.put('/notification-rules/:ruleId', slackController.updateNotificationRule);

/**
 * @route   DELETE /api/slack/notification-rules/:ruleId
 * @desc    Delete a notification rule
 * @access  Private
 */
router.delete('/notification-rules/:ruleId', slackController.deleteNotificationRule);

/**
 * @route   GET /api/slack/slash-commands
 * @desc    Get all slash commands
 * @access  Private
 */
router.get('/slash-commands', slackController.getSlashCommands);

/**
 * @route   POST /api/slack/slash-commands
 * @desc    Create a slash command
 * @access  Private
 */
router.post('/slash-commands', slackController.createSlashCommand);

/**
 * @route   POST /api/slack/webhook/events
 * @desc    Receive webhook events from Slack
 * @access  Public (Slack webhooks)
 */
router.post('/webhook/events', slackController.webhookEvents);

/**
 * @route   POST /api/slack/webhook/interactions
 * @desc    Handle interactive components from Slack
 * @access  Public (Slack webhooks)
 */
router.post('/webhook/interactions', slackController.webhookInteractions);

/**
 * @route   POST /api/slack/webhook/commands
 * @desc    Handle slash commands from Slack
 * @access  Public (Slack webhooks)
 */
router.post('/webhook/commands', slackController.webhookCommands);

/**
 * @route   GET /api/slack/stats
 * @desc    Get overall statistics
 * @access  Private
 */
router.get('/stats', slackController.getStats);

/**
 * @route   GET /api/slack/rate-limits
 * @desc    Get current rate limit status
 * @access  Private
 */
router.get('/rate-limits', slackController.getRateLimits);

module.exports = router;
