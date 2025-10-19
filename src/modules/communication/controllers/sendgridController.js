// sendgridController.js
// Controller for SendGrid email service endpoints

const SendGridEmail = require('../models/SendGridEmail');

exports.send = async (req, res) => {
  try {
    const {
      to, cc, bcc, from, replyTo, subject, text, html, template, attachments, categories, tags, customArgs, trackingSettings, scheduledFor, type, priority,
    } = req.body;
    if (!to || !subject) {
      return res.status(400).json({ error: 'Missing required fields', required: ['to', 'subject'] });
    }
    if (!text && !html && !template?.templateId) {
      return res.status(400).json({ error: 'Must provide either text, html, or templateId' });
    }
    const emailData = {
      to: Array.isArray(to) ? to : [{ email: to }], cc, bcc, from: from || { email: 'noreply@expojane.app', name: 'ExpoJane' }, replyTo, subject, content: { text, html }, template, attachments, categories, tags, customArgs, trackingSettings, type: type || 'transactional', priority: priority || 'normal', organization: req.organizationId, sentBy: req.userId,
    };
    if (scheduledFor) {
      emailData.scheduling = { scheduledFor: new Date(scheduledFor), scheduledBy: req.userId };
    }
    const email = await SendGridEmail.sendEmail(emailData);
    res.status(201).json(email);
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ error: 'Failed to send email', message: error.message });
  }
};

exports.sendTemplate = async (req, res) => {
  try {
    const { to, templateId, dynamicData, subject, from, categories, scheduledFor } = req.body;
    if (!to || !templateId) {
      return res.status(400).json({ error: 'Missing required fields', required: ['to', 'templateId'] });
    }
    const email = await SendGridEmail.sendEmail({
      to: Array.isArray(to) ? to : [{ email: to }], from: from || { email: 'noreply@expojane.app', name: 'ExpoJane' }, subject: subject || 'Email from ExpoJane', template: { templateId, dynamicData: dynamicData || {} }, categories, type: 'transactional', organization: req.organizationId, sentBy: req.userId, scheduling: scheduledFor ? { scheduledFor: new Date(scheduledFor), scheduledBy: req.userId } : undefined,
    });
    res.status(201).json(email);
  } catch (error) {
    console.error('Send template email error:', error);
    res.status(500).json({ error: 'Failed to send template email', message: error.message });
  }
};

exports.sendBulk = async (req, res) => {
  try {
    const { recipients, from, subject, text, html, templateId, categories, campaign } = req.body;
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'Invalid recipients', message: 'Recipients must be a non-empty array' });
    }
    const emails = await Promise.all(
      recipients.map((recipient) =>
        SendGridEmail.sendEmail({
          to: [{ email: recipient.email, name: recipient.name }], from: from || { email: 'noreply@expojane.app', name: 'ExpoJane' }, subject, content: { text, html }, template: templateId ? { templateId, dynamicData: recipient.dynamicData || {} } : undefined, categories, campaign, type: 'marketing', organization: req.organizationId, sentBy: req.userId,
        })
      )
    );
    res.status(201).json({ message: 'Bulk emails queued', count: emails.length, emails });
  } catch (error) {
    console.error('Send bulk email error:', error);
    res.status(500).json({ error: 'Failed to send bulk emails', message: error.message });
  }
};

exports.webhookEvents = async (req, res) => {
  try {
    const events = req.body;
    if (!Array.isArray(events)) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }
    for (const event of events) {
      const { sg_message_id, event: eventType } = event;
      if (!sg_message_id) continue;
      const email = await SendGridEmail.getByMessageId(sg_message_id);
      if (!email) continue;
      switch (eventType) {
        case 'delivered': await email.markDelivered(); break;
        case 'open': await email.trackOpen(event.useragent, { country: event.country, region: event.region, city: event.city, latitude: event.latitude, longitude: event.longitude }); break;
        case 'click': await email.trackClick(event.url, event.useragent); break;
        case 'bounce': await email.markBounced(event.type === 'hard' ? 'hard' : 'soft', event.reason); break;
        case 'dropped': await email.markDropped(event.reason); break;
        case 'spamreport': await email.trackSpamReport(); break;
        case 'unsubscribe': await email.trackUnsubscribe(); break;
        case 'deferred': email.delivery.deferred = true; email.delivery.deferReason = event.reason; email.delivery.deferCount = (email.delivery.deferCount || 0) + 1; await email.save(); break;
        default: console.log(`Unhandled event type: ${eventType}`);
      }
    }
    res.status(200).json({ message: 'Events processed' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Failed to process webhook', message: error.message });
  }
};

exports.getEmailById = async (req, res) => {
  try {
    const email = await SendGridEmail.findOne({ _id: req.params.id, organization: req.organizationId, isDeleted: false });
    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }
    res.json(email);
  } catch (error) {
    console.error('Get email error:', error);
    res.status(500).json({ error: 'Failed to get email', message: error.message });
  }
};

exports.listEmails = async (req, res) => {
  try {
    const { type, status, recipient, category, startDate, endDate, limit = 50, skip = 0 } = req.query;
    const query = { organization: req.organizationId, isDeleted: false };
    if (type) query.type = type;
    if (status) query.status = status;
    if (recipient) query['to.email'] = recipient;
    if (category) query.categories = category;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    const emails = await SendGridEmail.find(query).sort({ createdAt: -1 }).limit(parseInt(limit, 10)).skip(parseInt(skip, 10));
    const total = await SendGridEmail.countDocuments(query);
    res.json({ emails, total, limit: parseInt(limit, 10), skip: parseInt(skip, 10) });
  } catch (error) {
    console.error('List emails error:', error);
    res.status(500).json({ error: 'Failed to list emails', message: error.message });
  }
};

exports.getEmailsByRecipient = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const emails = await SendGridEmail.getByRecipient(req.params.email, parseInt(limit, 10));
    res.json({ emails, count: emails.length });
  } catch (error) {
    console.error('Get emails by recipient error:', error);
    res.status(500).json({ error: 'Failed to get emails', message: error.message });
  }
};

exports.deleteEmail = async (req, res) => {
  try {
    const email = await SendGridEmail.findOne({ _id: req.params.id, organization: req.organizationId, isDeleted: false });
    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }
    email.isDeleted = true;
    email.deletedAt = new Date();
    await email.save();
    res.json({ message: 'Email deleted successfully' });
  } catch (error) {
    console.error('Delete email error:', error);
    res.status(500).json({ error: 'Failed to delete email', message: error.message });
  }
};

exports.getScheduledEmails = async (req, res) => {
  try {
    const scheduled = await SendGridEmail.getScheduledEmails(req.organizationId);
    res.json({ emails: scheduled, count: scheduled.length });
  } catch (error) {
    console.error('Get scheduled emails error:', error);
    res.status(500).json({ error: 'Failed to get scheduled emails', message: error.message });
  }
};

exports.cancelScheduled = async (req, res) => {
  try {
    const { reason } = req.body;
    const email = await SendGridEmail.findOne({ _id: req.params.id, organization: req.organizationId, status: 'scheduled', isDeleted: false });
    if (!email) {
      return res.status(404).json({ error: 'Scheduled email not found' });
    }
    await email.cancelScheduled(reason || 'Canceled by user');
    res.json({ message: 'Scheduled email canceled', email });
  } catch (error) {
    console.error('Cancel scheduled email error:', error);
    res.status(500).json({ error: 'Failed to cancel email', message: error.message });
  }
};

exports.getCampaignEmails = async (req, res) => {
  try {
    const emails = await SendGridEmail.getCampaignEmails(req.params.campaignId);
    res.json({ emails, count: emails.length });
  } catch (error) {
    console.error('Get campaign emails error:', error);
    res.status(500).json({ error: 'Failed to get campaign emails', message: error.message });
  }
};

exports.getCampaignStats = async (req, res) => {
  try {
    const emails = await SendGridEmail.getCampaignEmails(req.params.campaignId);
    const total = emails.length;
    const delivered = emails.filter((e) => e.isDelivered).length;
    const opened = emails.filter((e) => e.engagement.opened).length;
    const clicked = emails.filter((e) => e.engagement.clicked).length;
    const bounced = emails.filter((e) => e.isBounced).length;
    const totalOpens = emails.reduce((sum, e) => sum + e.engagement.openCount, 0);
    const totalClicks = emails.reduce((sum, e) => sum + e.engagement.clickCount, 0);
    res.json({
      campaignId: req.params.campaignId,
      total,
      delivered,
      opened,
      clicked,
      bounced,
      deliveryRate: total > 0 ? ((delivered / total) * 100).toFixed(1) : 0,
      openRate: delivered > 0 ? ((opened / delivered) * 100).toFixed(1) : 0,
      clickRate: delivered > 0 ? ((clicked / delivered) * 100).toFixed(1) : 0,
      clickToOpenRate: opened > 0 ? ((clicked / opened) * 100).toFixed(1) : 0,
      bounceRate: total > 0 ? ((bounced / total) * 100).toFixed(1) : 0,
      totalOpens,
      totalClicks,
      avgOpensPerEmail: delivered > 0 ? (totalOpens / delivered).toFixed(2) : 0,
      avgClicksPerEmail: delivered > 0 ? (totalClicks / delivered).toFixed(2) : 0,
    });
  } catch (error) {
    console.error('Get campaign stats error:', error);
    res.status(500).json({ error: 'Failed to get campaign stats', message: error.message });
  }
};

exports.getDeliveryStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Missing required parameters', required: ['startDate', 'endDate'] });
    }
    const stats = await SendGridEmail.getDeliveryStats(req.organizationId, { startDate: new Date(startDate), endDate: new Date(endDate) });
    res.json(stats);
  } catch (error) {
    console.error('Get delivery stats error:', error);
    res.status(500).json({ error: 'Failed to get delivery stats', message: error.message });
  }
};

exports.getEngagementAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Missing required parameters', required: ['startDate', 'endDate'] });
    }
    const analytics = await SendGridEmail.getEngagementAnalytics(req.organizationId, { startDate: new Date(startDate), endDate: new Date(endDate) });
    res.json(analytics);
  } catch (error) {
    console.error('Get engagement analytics error:', error);
    res.status(500).json({ error: 'Failed to get engagement analytics', message: error.message });
  }
};

exports.getBouncedEmails = async (req, res) => {
  try {
    const { type } = req.query;
    const bounced = await SendGridEmail.getBouncedEmails(req.organizationId, type);
    res.json({ emails: bounced, count: bounced.length });
  } catch (error) {
    console.error('Get bounced emails error:', error);
    res.status(500).json({ error: 'Failed to get bounced emails', message: error.message });
  }
};

exports.getSuppressionList = async (req, res) => {
  try {
    const suppressionList = await SendGridEmail.getSuppressionList(req.organizationId);
    res.json(suppressionList);
  } catch (error) {
    console.error('Get suppression list error:', error);
    res.status(500).json({ error: 'Failed to get suppression list', message: error.message });
  }
};

exports.cleanupOldEmails = async (req, res) => {
  try {
    const { daysToKeep = 90 } = req.body;
    const result = await SendGridEmail.cleanupOldEmails(daysToKeep);
    res.json({ message: 'Cleanup completed', modified: result.modifiedCount });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Failed to cleanup emails', message: error.message });
  }
};

exports.health = async (req, res) => {
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const today = new Date();
    const stats = await SendGridEmail.getDeliveryStats(req.organizationId, { startDate: yesterday, endDate: today });
    const scheduled = await SendGridEmail.getScheduledEmails(req.organizationId);
    res.json({ status: 'healthy', last24Hours: stats, scheduledCount: scheduled.length, timestamp: new Date() });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ status: 'unhealthy', error: error.message, timestamp: new Date() });
  }
};
