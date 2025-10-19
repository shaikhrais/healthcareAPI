const express = require('express');


const TeamsIntegration = require('../models/TeamsIntegration');
const { protect } = require('../middleware/auth');
const router = express.Router();
// Apply authentication middleware to all routes except webhooks
router.use((req, res, next) => {
  // Skip auth for Teams webhook endpoints
  if (req.path === '/webhook/notifications' || req.path === '/webhook/bot') {
    return next();
  }
  return protect(req, res, next);
});

// Helper: Get organization ID from headers
const getOrgId = (req) => req.headers['x-organization-id'];

/**
 * @route   POST /api/teams/connect
 * @desc    Connect to Microsoft Teams
 * @access  Private
 */
router.post('/connect', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { tenantId, tenantName, accessToken, refreshToken, expiresIn, scope } = req.body;

    if (!tenantId || !tenantName || !accessToken || !refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID, tenant name, access token, and refresh token are required',
      });
    }

    // Check if connection already exists
    let connection = await TeamsIntegration.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    const expirationDate = new Date(Date.now() + (expiresIn || 3600) * 1000);

    if (connection) {
      // Update existing connection
      connection.tenant = {
        tenantId,
        tenantName,
        accessToken,
        refreshToken,
        expiresAt: expirationDate,
        scope: scope || connection.tenant.scope,
      };
      connection.status = 'connected';
      connection.updatedBy = req.user._id;
      await connection.save();
    } else {
      // Create new connection
      connection = await TeamsIntegration.create({
        organization: organizationId,
        tenant: {
          tenantId,
          tenantName,
          accessToken,
          refreshToken,
          expiresAt: expirationDate,
          scope: scope || [],
        },
        status: 'connected',
        createdBy: req.user._id,
      });
    }

    // Mask tokens in response
    const responseConnection = connection.toObject();
    responseConnection.tenant.accessToken = `${accessToken.substring(0, 15)}***`;
    responseConnection.tenant.refreshToken = `${refreshToken.substring(0, 15)}***`;

    res.status(201).json({
      success: true,
      message: 'Successfully connected to Microsoft Teams',
      connection: responseConnection,
    });
  } catch (error) {
    console.error('Connect to Teams error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to connect to Microsoft Teams',
      details: error.message,
    });
  }
});

/**
 * @route   POST /api/teams/disconnect
 * @desc    Disconnect from Microsoft Teams
 * @access  Private
 */
router.post('/disconnect', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { reason } = req.body;

    const connection = await TeamsIntegration.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Teams connection not found',
      });
    }

    await connection.disconnect(req.user._id, reason);

    res.json({
      success: true,
      message: 'Successfully disconnected from Microsoft Teams',
    });
  } catch (error) {
    console.error('Disconnect from Teams error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect from Microsoft Teams',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/teams/connection
 * @desc    Get current Teams connection status
 * @access  Private
 */
router.get('/connection', async (req, res) => {
  try {
    const organizationId = getOrgId(req);

    const connection = await TeamsIntegration.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Teams connection not found',
      });
    }

    // Mask tokens in response
    const responseConnection = connection.toObject();
    if (responseConnection.tenant.accessToken) {
      responseConnection.tenant.accessToken = `${responseConnection.tenant.accessToken.substring(0, 15)}***`;
    }
    if (responseConnection.tenant.refreshToken) {
      responseConnection.tenant.refreshToken = `${responseConnection.tenant.refreshToken.substring(0, 15)}***`;
    }

    res.json({
      success: true,
      connection: responseConnection,
    });
  } catch (error) {
    console.error('Get connection error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve connection',
      details: error.message,
    });
  }
});

/**
 * @route   POST /api/teams/refresh-token
 * @desc    Refresh OAuth token
 * @access  Private
 */
router.post('/refresh-token', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { accessToken, refreshToken, expiresIn } = req.body;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Access token is required',
      });
    }

    const connection = await TeamsIntegration.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Teams connection not found',
      });
    }

    await connection.refreshOAuthToken({
      accessToken,
      refreshToken,
      expiresIn: expiresIn || 3600,
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh token',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/teams/teams
 * @desc    Get all Teams
 * @access  Private
 */
router.get('/teams', async (req, res) => {
  try {
    const organizationId = getOrgId(req);

    const connection = await TeamsIntegration.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Teams connection not found',
      });
    }

    res.json({
      success: true,
      teams: connection.teams,
      total: connection.teams.length,
    });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve teams',
      details: error.message,
    });
  }
});

/**
 * @route   POST /api/teams/teams
 * @desc    Add or update a team
 * @access  Private
 */
router.post('/teams', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const teamData = req.body;

    if (!teamData.teamId || !teamData.displayName) {
      return res.status(400).json({
        success: false,
        error: 'Team ID and display name are required',
      });
    }

    const connection = await TeamsIntegration.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Teams connection not found',
      });
    }

    await connection.addOrUpdateTeam(teamData);

    res.json({
      success: true,
      message: 'Team added/updated successfully',
    });
  } catch (error) {
    console.error('Add/update team error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add/update team',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/teams/channels
 * @desc    Get all channels
 * @access  Private
 */
router.get('/channels', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { teamId } = req.query;

    const connection = await TeamsIntegration.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Teams connection not found',
      });
    }

    let { channels } = connection;

    if (teamId) {
      channels = channels.filter((c) => c.teamId === teamId);
    }

    res.json({
      success: true,
      channels,
      total: channels.length,
    });
  } catch (error) {
    console.error('Get channels error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve channels',
      details: error.message,
    });
  }
});

/**
 * @route   POST /api/teams/channels
 * @desc    Add or update a channel
 * @access  Private
 */
router.post('/channels', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const channelData = req.body;

    if (!channelData.channelId || !channelData.teamId || !channelData.displayName) {
      return res.status(400).json({
        success: false,
        error: 'Channel ID, team ID, and display name are required',
      });
    }

    const connection = await TeamsIntegration.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Teams connection not found',
      });
    }

    await connection.addOrUpdateChannel(channelData);

    res.json({
      success: true,
      message: 'Channel added/updated successfully',
    });
  } catch (error) {
    console.error('Add/update channel error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add/update channel',
      details: error.message,
    });
  }
});

/**
 * @route   PUT /api/teams/channels/:channelId/notifications
 * @desc    Update channel notification settings
 * @access  Private
 */
router.put('/channels/:channelId/notifications', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { channelId } = req.params;
    const notificationSettings = req.body;

    const connection = await TeamsIntegration.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Teams connection not found',
      });
    }

    const channel = connection.channels.find((c) => c.channelId === channelId);

    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found',
      });
    }

    // Update notification settings
    channel.notifications = {
      ...channel.notifications,
      ...notificationSettings,
    };

    await connection.save();

    res.json({
      success: true,
      message: 'Channel notification settings updated successfully',
    });
  } catch (error) {
    console.error('Update channel notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update channel notifications',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/teams/users
 * @desc    Get all users
 * @access  Private
 */
router.get('/users', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { isActive } = req.query;

    const connection = await TeamsIntegration.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Teams connection not found',
      });
    }

    let { users } = connection;

    if (isActive !== undefined) {
      users = users.filter((u) => u.isActive === (isActive === 'true'));
    }

    res.json({
      success: true,
      users,
      total: users.length,
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve users',
      details: error.message,
    });
  }
});

/**
 * @route   POST /api/teams/users
 * @desc    Add or update a user
 * @access  Private
 */
router.post('/users', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const userData = req.body;

    if (!userData.userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }

    const connection = await TeamsIntegration.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Teams connection not found',
      });
    }

    await connection.addOrUpdateUser(userData);

    res.json({
      success: true,
      message: 'User added/updated successfully',
    });
  } catch (error) {
    console.error('Add/update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add/update user',
      details: error.message,
    });
  }
});

/**
 * @route   POST /api/teams/messages
 * @desc    Send a message to Teams
 * @access  Private
 */
router.post('/messages', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const messageData = req.body;

    if (!messageData.channelId && !messageData.chatId) {
      return res.status(400).json({
        success: false,
        error: 'Channel ID or chat ID is required',
      });
    }

    if (!messageData.content && !messageData.adaptiveCard) {
      return res.status(400).json({
        success: false,
        error: 'Content or adaptive card is required',
      });
    }

    const connection = await TeamsIntegration.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Teams connection not found',
      });
    }

    await connection.sendMessage(messageData);

    res.json({
      success: true,
      message: 'Message sent successfully',
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/teams/messages
 * @desc    Get messages
 * @access  Private
 */
router.get('/messages', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { channelId, messageType, page = 1, limit = 50 } = req.query;

    const connection = await TeamsIntegration.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Teams connection not found',
      });
    }

    let { messages } = connection;

    // Filter by channel
    if (channelId) {
      messages = messages.filter((m) => m.channelId === channelId);
    }

    // Filter by message type
    if (messageType) {
      messages = messages.filter((m) => m.messageType === messageType);
    }

    // Sort by sentAt (newest first)
    messages.sort((a, b) => b.sentAt - a.sentAt);

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedMessages = messages.slice(startIndex, endIndex);

    res.json({
      success: true,
      messages: paginatedMessages,
      total: messages.length,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve messages',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/teams/notification-rules
 * @desc    Get all notification rules
 * @access  Private
 */
router.get('/notification-rules', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { eventType, enabled } = req.query;

    const connection = await TeamsIntegration.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Teams connection not found',
      });
    }

    let rules = connection.notificationRules;

    if (eventType) {
      rules = rules.filter((r) => r.eventType === eventType);
    }

    if (enabled !== undefined) {
      rules = rules.filter((r) => r.enabled === (enabled === 'true'));
    }

    res.json({
      success: true,
      rules,
      total: rules.length,
    });
  } catch (error) {
    console.error('Get notification rules error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve notification rules',
      details: error.message,
    });
  }
});

/**
 * @route   POST /api/teams/notification-rules
 * @desc    Create a notification rule
 * @access  Private
 */
router.post('/notification-rules', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const ruleData = req.body;

    if (
      !ruleData.ruleId ||
      !ruleData.name ||
      !ruleData.eventType ||
      !ruleData.targetType ||
      !ruleData.targetId
    ) {
      return res.status(400).json({
        success: false,
        error: 'Rule ID, name, event type, target type, and target ID are required',
      });
    }

    const connection = await TeamsIntegration.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Teams connection not found',
      });
    }

    await connection.addNotificationRule(ruleData);

    res.json({
      success: true,
      message: 'Notification rule created successfully',
    });
  } catch (error) {
    console.error('Create notification rule error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create notification rule',
      details: error.message,
    });
  }
});

/**
 * @route   PUT /api/teams/notification-rules/:ruleId
 * @desc    Update a notification rule
 * @access  Private
 */
router.put('/notification-rules/:ruleId', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { ruleId } = req.params;
    const updates = req.body;

    const connection = await TeamsIntegration.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Teams connection not found',
      });
    }

    await connection.updateNotificationRule(ruleId, updates);

    res.json({
      success: true,
      message: 'Notification rule updated successfully',
    });
  } catch (error) {
    console.error('Update notification rule error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update notification rule',
      details: error.message,
    });
  }
});

/**
 * @route   DELETE /api/teams/notification-rules/:ruleId
 * @desc    Delete a notification rule
 * @access  Private
 */
router.delete('/notification-rules/:ruleId', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { ruleId } = req.params;

    const connection = await TeamsIntegration.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Teams connection not found',
      });
    }

    await connection.deleteNotificationRule(ruleId);

    res.json({
      success: true,
      message: 'Notification rule deleted successfully',
    });
  } catch (error) {
    console.error('Delete notification rule error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification rule',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/teams/adaptive-cards
 * @desc    Get all adaptive card templates
 * @access  Private
 */
router.get('/adaptive-cards', async (req, res) => {
  try {
    const organizationId = getOrgId(req);

    const connection = await TeamsIntegration.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Teams connection not found',
      });
    }

    res.json({
      success: true,
      cards: connection.adaptiveCards,
      total: connection.adaptiveCards.length,
    });
  } catch (error) {
    console.error('Get adaptive cards error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve adaptive cards',
      details: error.message,
    });
  }
});

/**
 * @route   POST /api/teams/adaptive-cards
 * @desc    Create an adaptive card template
 * @access  Private
 */
router.post('/adaptive-cards', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const cardData = req.body;

    if (!cardData.cardId || !cardData.title || !cardData.cardSchema) {
      return res.status(400).json({
        success: false,
        error: 'Card ID, title, and card schema are required',
      });
    }

    const connection = await TeamsIntegration.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Teams connection not found',
      });
    }

    await connection.addAdaptiveCard(cardData);

    res.json({
      success: true,
      message: 'Adaptive card created successfully',
    });
  } catch (error) {
    console.error('Create adaptive card error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create adaptive card',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/teams/meetings
 * @desc    Get all meetings
 * @access  Private
 */
router.get('/meetings', async (req, res) => {
  try {
    const organizationId = getOrgId(req);

    const connection = await TeamsIntegration.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Teams connection not found',
      });
    }

    res.json({
      success: true,
      meetings: connection.meetings,
      total: connection.meetings.length,
    });
  } catch (error) {
    console.error('Get meetings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve meetings',
      details: error.message,
    });
  }
});

/**
 * @route   POST /api/teams/meetings
 * @desc    Create a Teams meeting
 * @access  Private
 */
router.post('/meetings', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const meetingData = req.body;

    if (!meetingData.meetingId || !meetingData.subject) {
      return res.status(400).json({
        success: false,
        error: 'Meeting ID and subject are required',
      });
    }

    const connection = await TeamsIntegration.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Teams connection not found',
      });
    }

    await connection.createMeeting(meetingData);

    res.json({
      success: true,
      message: 'Meeting created successfully',
    });
  } catch (error) {
    console.error('Create meeting error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create meeting',
      details: error.message,
    });
  }
});

/**
 * @route   POST /api/teams/webhook/notifications
 * @desc    Receive webhook notifications from Teams
 * @access  Public (Teams webhooks)
 */
router.post('/webhook/notifications', async (req, res) => {
  try {
    const { value } = req.body;

    if (!value || !Array.isArray(value)) {
      return res.status(200).json({ success: true });
    }

    console.log('Received Teams webhook notifications:', value.length);

    for (const notification of value) {
      const { resource, changeType, clientState } = notification;

      console.log('Processing notification:', { resource, changeType, clientState });

      // Find connection by clientState or other identifier
      const connection = await TeamsIntegration.findOne({
        'webhooks.clientState': clientState,
        isDeleted: false,
      });

      if (connection) {
        connection.stats.totalMessagesReceived += 1;
        await connection.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Notifications processed',
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process webhook',
      details: error.message,
    });
  }
});

/**
 * @route   POST /api/teams/webhook/bot
 * @desc    Handle bot interactions from Teams
 * @access  Public (Teams webhooks)
 */
router.post('/webhook/bot', async (req, res) => {
  try {
    const { type, text, from, conversation } = req.body;

    console.log('Received Teams bot interaction:', { type, text, from });

    // Find connection (implement your logic to identify the correct connection)
    const connection = await TeamsIntegration.findOne({
      isDeleted: false,
    }).limit(1);

    if (connection) {
      connection.stats.totalBotInteractions += 1;
      await connection.save();
    }

    res.status(200).json({
      type: 'message',
      text: `Echo: ${text}`,
    });
  } catch (error) {
    console.error('Bot interaction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process bot interaction',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/teams/stats
 * @desc    Get overall statistics
 * @access  Private
 */
router.get('/stats', async (req, res) => {
  try {
    const organizationId = getOrgId(req);

    const stats = await TeamsIntegration.getOverallStats(organizationId);

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'Teams connection not found',
      });
    }

    const connection = await TeamsIntegration.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    res.json({
      success: true,
      stats,
      connection: {
        isConnected: connection.isConnected,
        tenantName: connection.tenant.tenantName,
        needsTokenRefresh: connection.needsTokenRefresh,
        lastSyncedAt: connection.lastSyncedAt,
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/teams/config
 * @desc    Get sync configuration
 * @access  Private
 */
router.get('/config', async (req, res) => {
  try {
    const organizationId = getOrgId(req);

    const connection = await TeamsIntegration.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Teams connection not found',
      });
    }

    res.json({
      success: true,
      config: connection.syncConfig,
    });
  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve configuration',
      details: error.message,
    });
  }
});

/**
 * @route   PUT /api/teams/config
 * @desc    Update sync configuration
 * @access  Private
 */
router.put('/config', async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const updates = req.body;

    // Validate enum values if provided
    if (updates.syncInterval && !['realtime', 'hourly', 'daily'].includes(updates.syncInterval)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sync interval',
      });
    }

    const connection = await TeamsIntegration.findOne({
      organization: organizationId,
      isDeleted: false,
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Teams connection not found',
      });
    }

    // Update config
    connection.syncConfig = {
      ...connection.syncConfig,
      ...updates,
    };

    connection.updatedBy = req.user._id;
    await connection.save();

    res.json({
      success: true,
      message: 'Configuration updated successfully',
      config: connection.syncConfig,
    });
  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update configuration',
      details: error.message,
    });
  }
});

module.exports = router;
