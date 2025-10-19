const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
const mailchimpAutomationSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    mailchimpAccount: {
      apiKey: {
        type: String,
        required: true,
      },
      serverPrefix: {
        type: String, // e.g., 'us1', 'us2', etc.
        required: true,
      },
      accountId: {
        type: String,
      },
      accountName: {
        type: String,
      },
    },
    status: {
      type: String,
      enum: ['connected', 'disconnected', 'error', 'syncing'],
      default: 'connected',
      index: true,
    },
    lists: [
      {
        listId: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        memberCount: {
          type: Number,
          default: 0,
        },
        syncEnabled: {
          type: Boolean,
          default: true,
        },
        lastSynced: {
          type: Date,
        },
      },
    ],
    audiences: [
      {
        audienceId: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        description: {
          type: String,
        },
        memberCount: {
          type: Number,
          default: 0,
        },
        defaultFromName: {
          type: String,
        },
        defaultFromEmail: {
          type: String,
        },
        language: {
          type: String,
          default: 'en',
        },
      },
    ],
    campaigns: [
      {
        campaignId: {
          type: String,
          required: true,
          unique: true,
        },
        type: {
          type: String,
          enum: ['regular', 'plaintext', 'absplit', 'rss', 'variate'],
          default: 'regular',
        },
        status: {
          type: String,
          enum: ['save', 'paused', 'schedule', 'sending', 'sent', 'canceled'],
          default: 'save',
        },
        subject: {
          type: String,
        },
        fromName: {
          type: String,
        },
        fromEmail: {
          type: String,
        },
        recipients: {
          listId: String,
          segmentText: String,
          recipientCount: Number,
        },
        settings: {
          subjectLine: String,
          previewText: String,
          title: String,
          fromName: String,
          replyTo: String,
          toName: String,
        },
        tracking: {
          opens: { type: Boolean, default: true },
          htmlClicks: { type: Boolean, default: true },
          textClicks: { type: Boolean, default: false },
        },
        stats: {
          emailsSent: { type: Number, default: 0 },
          opensTotal: { type: Number, default: 0 },
          uniqueOpens: { type: Number, default: 0 },
          clicksTotal: { type: Number, default: 0 },
          uniqueClicks: { type: Number, default: 0 },
          unsubscribed: { type: Number, default: 0 },
          bounced: { type: Number, default: 0 },
        },
        sendTime: {
          type: Date,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    automations: [
      {
        automationId: {
          type: String,
          required: true,
        },
        title: {
          type: String,
          required: true,
        },
        status: {
          type: String,
          enum: ['save', 'paused', 'sending'],
          default: 'save',
        },
        triggerSettings: {
          workflowType: {
            type: String,
            enum: ['abandonedCart', 'emailSeries', 'welcomeSeries', 'custom'],
            default: 'custom',
          },
          listId: String,
          segmentId: String,
          delay: {
            amount: { type: Number, default: 0 },
            type: { type: String, enum: ['now', 'day', 'hour', 'week'], default: 'now' },
            direction: { type: String, enum: ['before', 'after'], default: 'after' },
          },
        },
        recipients: {
          listId: String,
          segmentText: String,
        },
        emails: [
          {
            emailId: String,
            position: Number,
            delay: {
              amount: Number,
              type: String,
              direction: String,
            },
            settings: {
              subjectLine: String,
              fromName: String,
              replyTo: String,
            },
            stats: {
              emailsSent: { type: Number, default: 0 },
              opensTotal: { type: Number, default: 0 },
              uniqueOpens: { type: Number, default: 0 },
              clicksTotal: { type: Number, default: 0 },
              uniqueClicks: { type: Number, default: 0 },
            },
          },
        ],
        stats: {
          totalEmailsSent: { type: Number, default: 0 },
          totalOpens: { type: Number, default: 0 },
          totalClicks: { type: Number, default: 0 },
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        startTime: {
          type: Date,
        },
      },
    ],
    tags: [
      {
        tagId: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        listId: {
          type: String,
        },
        memberCount: {
          type: Number,
          default: 0,
        },
      },
    ],
    segments: [
      {
        segmentId: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        listId: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          enum: ['static', 'dynamic', 'fuzzy'],
          default: 'static',
        },
        memberCount: {
          type: Number,
          default: 0,
        },
        options: {
          match: { type: String, enum: ['any', 'all'], default: 'all' },
          conditions: [
            {
              field: String,
              operator: String,
              value: String,
            },
          ],
        },
      },
    ],
    members: [
      {
        memberId: {
          type: String,
          required: true,
        },
        emailAddress: {
          type: String,
          required: true,
        },
        listId: {
          type: String,
          required: true,
        },
        status: {
          type: String,
          enum: ['subscribed', 'unsubscribed', 'cleaned', 'pending', 'transactional'],
          default: 'subscribed',
        },
        expoJanePatientId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Patient',
        },
        mergeFields: {
          type: Map,
          of: String,
          default: {},
        },
        tags: [
          {
            type: String,
          },
        ],
        stats: {
          avgOpenRate: { type: Number, default: 0 },
          avgClickRate: { type: Number, default: 0 },
          emailsSent: { type: Number, default: 0 },
        },
        lastChanged: {
          type: Date,
        },
        timestampSignup: {
          type: Date,
        },
        timestampOpt: {
          type: Date,
        },
      },
    ],
    syncConfig: {
      autoSync: {
        type: Boolean,
        default: false,
      },
      syncInterval: {
        type: String,
        enum: ['realtime', 'hourly', 'daily', 'weekly'],
        default: 'daily',
      },
      syncPatients: {
        type: Boolean,
        default: true,
      },
      syncDirection: {
        type: String,
        enum: ['one_way_to_mailchimp', 'one_way_from_mailchimp', 'two_way'],
        default: 'one_way_to_mailchimp',
      },
      defaultListId: {
        type: String,
      },
      tagPatientsByStatus: {
        type: Boolean,
        default: true,
      },
      tagPatientsByTreatment: {
        type: Boolean,
        default: false,
      },
    },
    webhooks: [
      {
        webhookId: {
          type: String,
          required: true,
        },
        listId: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        events: {
          subscribe: { type: Boolean, default: true },
          unsubscribe: { type: Boolean, default: true },
          profile: { type: Boolean, default: true },
          cleaned: { type: Boolean, default: true },
          upemail: { type: Boolean, default: true },
          campaign: { type: Boolean, default: false },
        },
        sources: {
          user: { type: Boolean, default: true },
          admin: { type: Boolean, default: true },
          api: { type: Boolean, default: true },
        },
      },
    ],
    stats: {
      totalCampaigns: {
        type: Number,
        default: 0,
      },
      totalAutomations: {
        type: Number,
        default: 0,
      },
      totalMembers: {
        type: Number,
        default: 0,
      },
      totalEmailsSent: {
        type: Number,
        default: 0,
      },
      totalOpens: {
        type: Number,
        default: 0,
      },
      totalClicks: {
        type: Number,
        default: 0,
      },
    },
    lastSyncedAt: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    disconnectedAt: {
      type: Date,
    },
    disconnectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    disconnectReason: {
      type: String,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
// DUPLICATE INDEX - Auto-commented by deduplication tool
// mailchimpAutomationSchema.index({ organization: 1, status: 1 });
mailchimpAutomationSchema.index({ 'campaigns.campaignId': 1 });
mailchimpAutomationSchema.index({ 'automations.automationId': 1 });
mailchimpAutomationSchema.index({ 'members.emailAddress': 1 });
mailchimpAutomationSchema.index({ 'members.expoJanePatientId': 1 });

// Virtual: Is Connected
mailchimpAutomationSchema.virtual('isConnected').get(function () {
  return this.status === 'connected';
});

// Virtual: Average Open Rate
mailchimpAutomationSchema.virtual('avgOpenRate').get(function () {
  if (this.stats.totalEmailsSent === 0) return 0;
  return ((this.stats.totalOpens / this.stats.totalEmailsSent) * 100).toFixed(2);
});

// Virtual: Average Click Rate
mailchimpAutomationSchema.virtual('avgClickRate').get(function () {
  if (this.stats.totalEmailsSent === 0) return 0;
  return ((this.stats.totalClicks / this.stats.totalEmailsSent) * 100).toFixed(2);
});

// Virtual: Campaign Success Rate
mailchimpAutomationSchema.virtual('campaignSuccessRate').get(function () {
  const sentCampaigns = this.campaigns.filter((c) => c.status === 'sent').length;
  if (this.stats.totalCampaigns === 0) return 0;
  return ((sentCampaigns / this.stats.totalCampaigns) * 100).toFixed(2);
});

// Instance method: Add or Update List
mailchimpAutomationSchema.methods.addOrUpdateList = function (listData) {
  const existingIndex = this.lists.findIndex((l) => l.listId === listData.listId);

  if (existingIndex !== -1) {
    // Update existing list
    this.lists[existingIndex] = {
      ...this.lists[existingIndex].toObject(),
      ...listData,
      lastSynced: new Date(),
    };
  } else {
    // Add new list
    this.lists.push({
      ...listData,
      lastSynced: new Date(),
    });
  }

  return this.save();
};

// Instance method: Add or Update Campaign
mailchimpAutomationSchema.methods.addOrUpdateCampaign = function (campaignData) {
  const existingIndex = this.campaigns.findIndex((c) => c.campaignId === campaignData.campaignId);

  if (existingIndex !== -1) {
    // Update existing campaign
    this.campaigns[existingIndex] = {
      ...this.campaigns[existingIndex].toObject(),
      ...campaignData,
    };
  } else {
    // Add new campaign
    this.campaigns.push(campaignData);
    this.stats.totalCampaigns += 1;
  }

  return this.save();
};

// Instance method: Add or Update Automation
mailchimpAutomationSchema.methods.addOrUpdateAutomation = function (automationData) {
  const existingIndex = this.automations.findIndex(
    (a) => a.automationId === automationData.automationId
  );

  if (existingIndex !== -1) {
    // Update existing automation
    this.automations[existingIndex] = {
      ...this.automations[existingIndex].toObject(),
      ...automationData,
    };
  } else {
    // Add new automation
    this.automations.push(automationData);
    this.stats.totalAutomations += 1;
  }

  return this.save();
};

// Instance method: Add or Update Member
mailchimpAutomationSchema.methods.addOrUpdateMember = function (memberData) {
  const existingIndex = this.members.findIndex(
    (m) => m.memberId === memberData.memberId || m.emailAddress === memberData.emailAddress
  );

  if (existingIndex !== -1) {
    // Update existing member
    this.members[existingIndex] = {
      ...this.members[existingIndex].toObject(),
      ...memberData,
      lastChanged: new Date(),
    };
  } else {
    // Add new member
    this.members.push({
      ...memberData,
      lastChanged: new Date(),
    });
    this.stats.totalMembers += 1;
  }

  return this.save();
};

// Instance method: Add Tag to Member
mailchimpAutomationSchema.methods.addTagToMember = function (emailAddress, tagName) {
  const member = this.members.find((m) => m.emailAddress === emailAddress);

  if (!member) {
    throw new Error('Member not found');
  }

  if (!member.tags.includes(tagName)) {
    member.tags.push(tagName);
  }

  // Update tag count
  const tag = this.tags.find((t) => t.name === tagName);
  if (tag) {
    tag.memberCount = (tag.memberCount || 0) + 1;
  }

  return this.save();
};

// Instance method: Remove Tag from Member
mailchimpAutomationSchema.methods.removeTagFromMember = function (emailAddress, tagName) {
  const member = this.members.find((m) => m.emailAddress === emailAddress);

  if (!member) {
    throw new Error('Member not found');
  }

  member.tags = member.tags.filter((t) => t !== tagName);

  // Update tag count
  const tag = this.tags.find((t) => t.name === tagName);
  if (tag && tag.memberCount > 0) {
    tag.memberCount -= 1;
  }

  return this.save();
};

// Instance method: Update Campaign Stats
mailchimpAutomationSchema.methods.updateCampaignStats = function (campaignId, stats) {
  const campaign = this.campaigns.find((c) => c.campaignId === campaignId);

  if (!campaign) {
    throw new Error('Campaign not found');
  }

  // Update campaign stats
  campaign.stats = {
    ...campaign.stats,
    ...stats,
  };

  // Update overall stats
  this.stats.totalEmailsSent += stats.emailsSent || 0;
  this.stats.totalOpens += stats.opensTotal || 0;
  this.stats.totalClicks += stats.clicksTotal || 0;

  return this.save();
};

// Instance method: Update Automation Stats
mailchimpAutomationSchema.methods.updateAutomationStats = function (automationId, stats) {
  const automation = this.automations.find((a) => a.automationId === automationId);

  if (!automation) {
    throw new Error('Automation not found');
  }

  // Update automation stats
  automation.stats = {
    ...automation.stats,
    ...stats,
  };

  return this.save();
};

// Instance method: Disconnect from Mailchimp
mailchimpAutomationSchema.methods.disconnect = function (userId, reason) {
  this.status = 'disconnected';
  this.disconnectedAt = new Date();
  this.disconnectedBy = userId;
  this.disconnectReason = reason || 'User initiated disconnect';

  return this.save();
};

// Instance method: Create Webhook
mailchimpAutomationSchema.methods.createWebhook = function (webhookData) {
  const existingIndex = this.webhooks.findIndex((w) => w.webhookId === webhookData.webhookId);

  if (existingIndex !== -1) {
    throw new Error('Webhook already exists');
  }

  this.webhooks.push(webhookData);
  return this.save();
};

// Instance method: Delete Webhook
mailchimpAutomationSchema.methods.deleteWebhook = function (webhookId) {
  this.webhooks = this.webhooks.filter((w) => w.webhookId !== webhookId);
  return this.save();
};

// Static method: Get connection by organization
mailchimpAutomationSchema.statics.getByOrganization = async function (organizationId) {
  return this.findOne({
    organization: organizationId,
    isDeleted: false,
  });
};

// Static method: Get all campaigns
mailchimpAutomationSchema.statics.getAllCampaigns = async function (organizationId, status) {
  const connection = await this.findOne({
    organization: organizationId,
    isDeleted: false,
  });

  if (!connection) return [];

  if (status) {
    return connection.campaigns.filter((c) => c.status === status);
  }

  return connection.campaigns;
};

// Static method: Get all automations
mailchimpAutomationSchema.statics.getAllAutomations = async function (organizationId, status) {
  const connection = await this.findOne({
    organization: organizationId,
    isDeleted: false,
  });

  if (!connection) return [];

  if (status) {
    return connection.automations.filter((a) => a.status === status);
  }

  return connection.automations;
};

// Static method: Get members by list
mailchimpAutomationSchema.statics.getMembersByList = async function (
  organizationId,
  listId,
  status
) {
  const connection = await this.findOne({
    organization: organizationId,
    isDeleted: false,
  });

  if (!connection) return [];

  let members = connection.members.filter((m) => m.listId === listId);

  if (status) {
    members = members.filter((m) => m.status === status);
  }

  return members;
};

// Static method: Get overall statistics
mailchimpAutomationSchema.statics.getOverallStats = async function (organizationId) {
  const connection = await this.findOne({
    organization: organizationId,
    isDeleted: false,
  });

  if (!connection) return null;

  return {
    totalCampaigns: connection.stats.totalCampaigns,
    totalAutomations: connection.stats.totalAutomations,
    totalMembers: connection.stats.totalMembers,
    totalEmailsSent: connection.stats.totalEmailsSent,
    totalOpens: connection.stats.totalOpens,
    totalClicks: connection.stats.totalClicks,
    avgOpenRate: connection.avgOpenRate,
    avgClickRate: connection.avgClickRate,
    campaignSuccessRate: connection.campaignSuccessRate,
  };
};

// Enable virtuals in JSON
mailchimpAutomationSchema.set('toJSON', { virtuals: true });
mailchimpAutomationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('MailchimpAutomation', mailchimpAutomationSchema);
