// slackController.js
// Controller for Slack integration endpoints

const SlackNotification = require('../models/SlackNotification');

const getOrgId = (req) => req.headers['x-organization-id'];

exports.connect = async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { teamId, teamName, botToken, botUserId, appId, scopes } = req.body;
    if (!teamId || !teamName || !botToken) {
      return res.status(400).json({ success: false, error: 'Team ID, team name, and bot token are required' });
    }
    let connection = await SlackNotification.findOne({ organization: organizationId, isDeleted: false });
    if (connection) {
      connection.workspace = { teamId, teamName, botToken, botUserId: botUserId || connection.workspace.botUserId, appId: appId || connection.workspace.appId, scopes: scopes || connection.workspace.scopes };
      connection.status = 'connected';
      connection.updatedBy = req.user._id;
      await connection.save();
    } else {
      connection = await SlackNotification.create({ organization: organizationId, workspace: { teamId, teamName, botToken, botUserId, appId, scopes: scopes || [] }, status: 'connected', createdBy: req.user._id });
    }
    const responseConnection = connection.toObject();
    responseConnection.workspace.botToken = `${botToken.substring(0, 10)}***`;
    res.status(201).json({ success: true, message: 'Successfully connected to Slack workspace', connection: responseConnection });
  } catch (error) {
    console.error('Connect to Slack error:', error);
    res.status(500).json({ success: false, error: 'Failed to connect to Slack', details: error.message });
  }
};

exports.disconnect = async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { reason } = req.body;
    const connection = await SlackNotification.findOne({ organization: organizationId, isDeleted: false });
    if (!connection) {
      return res.status(404).json({ success: false, error: 'Slack connection not found' });
    }
    await connection.disconnect(req.user._id, reason);
    res.json({ success: true, message: 'Successfully disconnected from Slack' });
  } catch (error) {
    console.error('Disconnect from Slack error:', error);
    res.status(500).json({ success: false, error: 'Failed to disconnect from Slack', details: error.message });
  }
};

exports.getConnection = async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const connection = await SlackNotification.findOne({ organization: organizationId, isDeleted: false });
    if (!connection) {
      return res.status(404).json({ success: false, error: 'Slack connection not found' });
    }
    const responseConnection = connection.toObject();
    if (responseConnection.workspace.botToken) {
      responseConnection.workspace.botToken = `${responseConnection.workspace.botToken.substring(0, 10)}***`;
    }
    res.json({ success: true, connection: responseConnection });
  } catch (error) {
    console.error('Get connection error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve connection', details: error.message });
  }
};

exports.getChannels = async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const connection = await SlackNotification.findOne({ organization: organizationId, isDeleted: false });
    if (!connection) {
      return res.status(404).json({ success: false, error: 'Slack connection not found' });
    }
    res.json({ success: true, channels: connection.channels, total: connection.channels.length });
  } catch (error) {
    console.error('Get channels error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve channels', details: error.message });
  }
};

exports.addOrUpdateChannel = async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const channelData = req.body;
    if (!channelData.channelId || !channelData.channelName) {
      return res.status(400).json({ success: false, error: 'Channel ID and name are required' });
    }
    const connection = await SlackNotification.findOne({ organization: organizationId, isDeleted: false });
    if (!connection) {
      return res.status(404).json({ success: false, error: 'Slack connection not found' });
    }
    await connection.addChannel(channelData);
    res.json({ success: true, message: 'Channel added/updated successfully' });
  } catch (error) {
    console.error('Add/update channel error:', error);
    res.status(500).json({ success: false, error: 'Failed to add/update channel', details: error.message });
  }
};

exports.updateChannelNotifications = async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { channelId } = req.params;
    const notificationSettings = req.body;
    const connection = await SlackNotification.findOne({ organization: organizationId, isDeleted: false });
    if (!connection) {
      return res.status(404).json({ success: false, error: 'Slack connection not found' });
    }
    const channel = connection.channels.find((c) => c.channelId === channelId);
    if (!channel) {
      return res.status(404).json({ success: false, error: 'Channel not found' });
    }
    channel.notifications = { ...channel.notifications, ...notificationSettings };
    await connection.save();
    res.json({ success: true, message: 'Channel notification settings updated successfully' });
  } catch (error) {
    console.error('Update channel notifications error:', error);
    res.status(500).json({ success: false, error: 'Failed to update channel notifications', details: error.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { isActive } = req.query;
    const connection = await SlackNotification.findOne({ organization: organizationId, isDeleted: false });
    if (!connection) {
      return res.status(404).json({ success: false, error: 'Slack connection not found' });
    }
    let { users } = connection;
    if (isActive !== undefined) {
      users = users.filter((u) => u.isActive === (isActive === 'true'));
    }
    res.json({ success: true, users, total: users.length });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve users', details: error.message });
  }
};

exports.addOrUpdateUser = async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const userData = req.body;
    if (!userData.slackUserId) {
      return res.status(400).json({ success: false, error: 'Slack user ID is required' });
    }
    const connection = await SlackNotification.findOne({ organization: organizationId, isDeleted: false });
    if (!connection) {
      return res.status(404).json({ success: false, error: 'Slack connection not found' });
    }
    await connection.addUser(userData);
    res.json({ success: true, message: 'User added/updated successfully' });
  } catch (error) {
    console.error('Add/update user error:', error);
    res.status(500).json({ success: false, error: 'Failed to add/update user', details: error.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const messageData = req.body;
    if (!messageData.channelId || !messageData.text) {
      return res.status(400).json({ success: false, error: 'Channel ID and text are required' });
    }
    const connection = await SlackNotification.findOne({ organization: organizationId, isDeleted: false });
    if (!connection) {
      return res.status(404).json({ success: false, error: 'Slack connection not found' });
    }
    const rateLimitStatus = connection.checkAndUpdateRateLimits();
    if (!rateLimitStatus.withinLimits) {
      return res.status(429).json({ success: false, error: 'Rate limit exceeded', minuteRemaining: rateLimitStatus.minuteRemaining, hourRemaining: rateLimitStatus.hourRemaining });
    }
    await connection.sendMessage(messageData);
    res.json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, error: 'Failed to send message', details: error.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { channelId, messageType, page = 1, limit = 50 } = req.query;
    const connection = await SlackNotification.findOne({ organization: organizationId, isDeleted: false });
    if (!connection) {
      return res.status(404).json({ success: false, error: 'Slack connection not found' });
    }
    let { messages } = connection;
    if (channelId) {
      messages = messages.filter((m) => m.channelId === channelId);
    }
    if (messageType) {
      messages = messages.filter((m) => m.messageType === messageType);
    }
    messages.sort((a, b) => b.sentAt - a.sentAt);
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedMessages = messages.slice(startIndex, endIndex);
    res.json({ success: true, messages: paginatedMessages, total: messages.length, page: parseInt(page, 10), limit: parseInt(limit, 10) });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve messages', details: error.message });
  }
};

exports.getNotificationRules = async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { eventType, enabled } = req.query;
    const connection = await SlackNotification.findOne({ organization: organizationId, isDeleted: false });
    if (!connection) {
      return res.status(404).json({ success: false, error: 'Slack connection not found' });
    }
    let rules = connection.notificationRules;
    if (eventType) {
      rules = rules.filter((r) => r.eventType === eventType);
    }
    if (enabled !== undefined) {
      rules = rules.filter((r) => r.enabled === (enabled === 'true'));
    }
    res.json({ success: true, rules, total: rules.length });
  } catch (error) {
    console.error('Get notification rules error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve notification rules', details: error.message });
  }
};

exports.createNotificationRule = async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const ruleData = req.body;
    if (!ruleData.ruleId || !ruleData.name || !ruleData.eventType || !ruleData.channelId) {
      return res.status(400).json({ success: false, error: 'Rule ID, name, event type, and channel ID are required' });
    }
    const connection = await SlackNotification.findOne({ organization: organizationId, isDeleted: false });
    if (!connection) {
      return res.status(404).json({ success: false, error: 'Slack connection not found' });
    }
    await connection.addNotificationRule(ruleData);
    res.json({ success: true, message: 'Notification rule created successfully' });
  } catch (error) {
    console.error('Create notification rule error:', error);
    res.status(500).json({ success: false, error: 'Failed to create notification rule', details: error.message });
  }
};

exports.updateNotificationRule = async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { ruleId } = req.params;
    const updates = req.body;
    const connection = await SlackNotification.findOne({ organization: organizationId, isDeleted: false });
    if (!connection) {
      return res.status(404).json({ success: false, error: 'Slack connection not found' });
    }
    await connection.updateNotificationRule(ruleId, updates);
    res.json({ success: true, message: 'Notification rule updated successfully' });
  } catch (error) {
    console.error('Update notification rule error:', error);
    res.status(500).json({ success: false, error: 'Failed to update notification rule', details: error.message });
  }
};

exports.deleteNotificationRule = async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const { ruleId } = req.params;
    const connection = await SlackNotification.findOne({ organization: organizationId, isDeleted: false });
    if (!connection) {
      return res.status(404).json({ success: false, error: 'Slack connection not found' });
    }
    await connection.deleteNotificationRule(ruleId);
    res.json({ success: true, message: 'Notification rule deleted successfully' });
  } catch (error) {
    console.error('Delete notification rule error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete notification rule', details: error.message });
  }
};

exports.getSlashCommands = async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const connection = await SlackNotification.findOne({ organization: organizationId, isDeleted: false });
    if (!connection) {
      return res.status(404).json({ success: false, error: 'Slack connection not found' });
    }
    res.json({ success: true, commands: connection.slashCommands, total: connection.slashCommands.length });
  } catch (error) {
    console.error('Get slash commands error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve slash commands', details: error.message });
  }
};

exports.createSlashCommand = async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const commandData = req.body;
    if (!commandData.command) {
      return res.status(400).json({ success: false, error: 'Command is required' });
    }
    const connection = await SlackNotification.findOne({ organization: organizationId, isDeleted: false });
    if (!connection) {
      return res.status(404).json({ success: false, error: 'Slack connection not found' });
    }
    await connection.addSlashCommand(commandData);
    res.json({ success: true, message: 'Slash command created successfully' });
  } catch (error) {
    console.error('Create slash command error:', error);
    res.status(500).json({ success: false, error: 'Failed to create slash command', details: error.message });
  }
};

exports.webhookEvents = async (req, res) => {
  try {
    const { type, event, team_id, challenge } = req.body;
    if (type === 'url_verification') {
      return res.json({ challenge });
    }
    console.log('Received Slack webhook:', { type, event, team_id });
    const connection = await SlackNotification.findOne({ 'workspace.teamId': team_id, isDeleted: false });
    if (!connection) {
      console.log('No connection found for team:', team_id);
      return res.status(200).json({ success: true });
    }
    if (event) {
      connection.stats.totalMessagesReceived += 1;
      await connection.save();
    }
    res.status(200).json({ success: true, message: 'Event processed' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ success: false, error: 'Failed to process webhook', details: error.message });
  }
};

exports.webhookInteractions = async (req, res) => {
  try {
    const payload = JSON.parse(req.body.payload);
    const { type, team, user, actions } = payload;
    console.log('Received Slack interaction:', { type, team, user, actions });
    const connection = await SlackNotification.findOne({ 'workspace.teamId': team.id, isDeleted: false });
    if (!connection) {
      return res.status(200).json({ success: true });
    }
    connection.stats.totalInteractions += 1;
    await connection.save();
    res.status(200).json({ success: true, message: 'Interaction processed' });
  } catch (error) {
    console.error('Interaction processing error:', error);
    res.status(500).json({ success: false, error: 'Failed to process interaction', details: error.message });
  }
};

exports.webhookCommands = async (req, res) => {
  try {
    const { team_id, command, text, user_id, channel_id } = req.body;
    console.log('Received Slack slash command:', { team_id, command, text, user_id, channel_id });
    const connection = await SlackNotification.findOne({ 'workspace.teamId': team_id, isDeleted: false });
    if (!connection) {
      return res.status(200).json({ response_type: 'ephemeral', text: 'ExpoJane integration not configured for this workspace.' });
    }
    await connection.incrementCommandUsage(command);
    res.status(200).json({ response_type: 'ephemeral', text: `Command ${command} received with text: ${text}` });
  } catch (error) {
    console.error('Command processing error:', error);
    res.status(500).json({ response_type: 'ephemeral', text: 'Failed to process command' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const stats = await SlackNotification.getOverallStats(organizationId);
    if (!stats) {
      return res.status(404).json({ success: false, error: 'Slack connection not found' });
    }
    const connection = await SlackNotification.findOne({ organization: organizationId, isDeleted: false });
    res.json({ success: true, stats, connection: { isConnected: connection.isConnected, workspaceName: connection.workspace.teamName, lastSyncedAt: connection.lastSyncedAt } });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve statistics', details: error.message });
  }
};

exports.getRateLimits = async (req, res) => {
  try {
    const organizationId = getOrgId(req);
    const connection = await SlackNotification.findOne({ organization: organizationId, isDeleted: false });
    if (!connection) {
      return res.status(404).json({ success: false, error: 'Slack connection not found' });
    }
    const rateLimitStatus = connection.checkAndUpdateRateLimits();
    res.json({ success: true, rateLimits: { ...connection.rateLimits.toObject(), withinLimits: rateLimitStatus.withinLimits, minuteRemaining: rateLimitStatus.minuteRemaining, hourRemaining: rateLimitStatus.hourRemaining } });
  } catch (error) {
    console.error('Get rate limits error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve rate limits', details: error.message });
  }
};
