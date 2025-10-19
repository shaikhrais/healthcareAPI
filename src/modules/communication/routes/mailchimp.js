/* eslint-disable camelcase */
const express = require('express');

/**
 * @swagger
 * components:
 *   schemas:
 *     MailchimpConnection:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Connection ID
 *         organization:
 *           type: string
 *           description: Organization ID
 *         mailchimpAccount:
 *           type: object
 *           properties:
 *             accountId:
 *               type: string
 *             accountName:
 *               type: string
 *             email:
 *               type: string
 *         isConnected:
 *           type: boolean
 *           description: Connection status
 *         apiKey:
 *           type: string
 *           description: Encrypted API key
 *         lastSyncedAt:
 *           type: string
 *           format: date-time
 *         syncConfig:
 *           $ref: '#/components/schemas/MailchimpSyncConfig'
 *         lists:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/MailchimpList'
 *         campaigns:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/MailchimpCampaign'
 *         automations:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/MailchimpAutomation'
 *         members:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/MailchimpMember'
 *         tags:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/MailchimpTag'
 *         segments:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/MailchimpSegment'
 *         webhooks:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/MailchimpWebhook'
 *
 *     MailchimpSyncConfig:
 *       type: object
 *       properties:
 *         syncInterval:
 *           type: string
 *           enum: [realtime, hourly, daily, weekly]
 *           default: daily
 *         syncDirection:
 *           type: string
 *           enum: [one_way_to_mailchimp, one_way_from_mailchimp, two_way]
 *           default: two_way
 *         autoSync:
 *           type: boolean
 *           default: true
 *         syncPatients:
 *           type: boolean
 *           default: true
 *         syncAppointments:
 *           type: boolean
 *           default: false
 *
 *     MailchimpList:
 *       type: object
 *       properties:
 *         listId:
 *           type: string
 *           description: Mailchimp list ID
 *         name:
 *           type: string
 *           description: List name
 *         memberCount:
 *           type: integer
 *           description: Number of members
 *         syncEnabled:
 *           type: boolean
 *           description: Whether sync is enabled for this list
 *         dateCreated:
 *           type: string
 *           format: date-time
 *         lastSyncedAt:
 *           type: string
 *           format: date-time
 *
 *     MailchimpCampaign:
 *       type: object
 *       properties:
 *         campaignId:
 *           type: string
 *           description: Mailchimp campaign ID
 *         title:
 *           type: string
 *           description: Campaign title
 *         subject:
 *           type: string
 *           description: Email subject line
 *         status:
 *           type: string
 *           enum: [draft, scheduled, sending, sent, canceled, paused]
 *         type:
 *           type: string
 *           enum: [regular, plaintext, absplit, rss, variate]
 *         listId:
 *           type: string
 *           description: Target list ID
 *         sentDate:
 *           type: string
 *           format: date-time
 *         stats:
 *           $ref: '#/components/schemas/MailchimpCampaignStats'
 *
 *     MailchimpCampaignStats:
 *       type: object
 *       properties:
 *         emailsSent:
 *           type: integer
 *         opensTotal:
 *           type: integer
 *         uniqueOpens:
 *           type: integer
 *         openRate:
 *           type: number
 *           format: float
 *         clicksTotal:
 *           type: integer
 *         uniqueClicks:
 *           type: integer
 *         clickRate:
 *           type: number
 *           format: float
 *         unsubscribes:
 *           type: integer
 *         bounces:
 *           type: integer
 *
 *     MailchimpAutomationObj:
 *       type: object
 *       properties:
 *         automationId:
 *           type: string
 *           description: Mailchimp automation ID
 *         title:
 *           type: string
 *           description: Automation title
 *         status:
 *           type: string
 *           enum: [save, paused, sending]
 *         listId:
 *           type: string
 *           description: Target list ID
 *         triggerSettings:
 *           type: object
 *           description: Automation trigger configuration
 *         emailsCount:
 *           type: integer
 *           description: Number of emails in automation
 *         recipientsCount:
 *           type: integer
 *           description: Number of recipients
 *         dateCreated:
 *           type: string
 *           format: date-time
 *         dateStarted:
 *           type: string
 *           format: date-time
 *         stats:
 *           $ref: '#/components/schemas/MailchimpAutomationStats'
 *
 *     MailchimpAutomationStats:
 *       type: object
 *       properties:
 *         emailsSent:
 *           type: integer
 *         opensTotal:
 *           type: integer
 *         uniqueOpens:
 *           type: integer
 *         clicksTotal:
 *           type: integer
 *         uniqueClicks:
 *           type: integer
 *         unsubscribes:
 *           type: integer
 *         revenue:
 *           type: number
 *           format: float
 *
 *     MailchimpMember:
 *       type: object
 *       properties:
 *         memberId:
 *           type: string
 *           description: Mailchimp member ID
 *         emailAddress:
 *           type: string
 *           format: email
 *           description: Member email address
 *         listId:
 *           type: string
 *           description: List ID member belongs to
 *         status:
 *           type: string
 *           enum: [subscribed, unsubscribed, cleaned, pending, transactional]
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         phone:
 *           type: string
 *         dateAdded:
 *           type: string
 *           format: date-time
 *         lastChanged:
 *           type: string
 *           format: date-time
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         mergeFields:
 *           type: object
 *           description: Custom merge fields
 *
 *     MailchimpTag:
 *       type: object
 *       properties:
 *         tagId:
 *           type: string
 *           description: Mailchimp tag ID
 *         name:
 *           type: string
 *           description: Tag name
 *         listId:
 *           type: string
 *           description: Associated list ID
 *         memberCount:
 *           type: integer
 *           description: Number of members with this tag
 *         dateCreated:
 *           type: string
 *           format: date-time
 *
 *     MailchimpSegment:
 *       type: object
 *       properties:
 *         segmentId:
 *           type: string
 *           description: Mailchimp segment ID
 *         name:
 *           type: string
 *           description: Segment name
 *         listId:
 *           type: string
 *           description: Associated list ID
 *         type:
 *           type: string
 *           enum: [static, saved]
 *           description: Segment type
 *         memberCount:
 *           type: integer
 *           description: Number of members in segment
 *         options:
 *           type: object
 *           description: Segment configuration options
 *         dateCreated:
 *           type: string
 *           format: date-time
 *
 *     MailchimpWebhook:
 *       type: object
 *       properties:
 *         webhookId:
 *           type: string
 *           description: Mailchimp webhook ID
 *         listId:
 *           type: string
 *           description: Associated list ID
 *         url:
 *           type: string
 *           format: uri
 *           description: Webhook URL
 *         events:
 *           type: object
 *           properties:
 *             subscribe:
 *               type: boolean
 *             unsubscribe:
 *               type: boolean
 *             profile:
 *               type: boolean
 *             cleaned:
 *               type: boolean
 *             upemail:
 *               type: boolean
 *             campaign:
 *               type: boolean
 *         sources:
 *           type: object
 *           properties:
 *             user:
 *               type: boolean
 *             admin:
 *               type: boolean
 *             api:
 *               type: boolean
 *         isActive:
 *           type: boolean
 *         dateCreated:
 *           type: string
 *           format: date-time
 *
 *     MailchimpStats:
 *       type: object
 *       properties:
 *         totalLists:
 *           type: integer
 *         totalMembers:
 *           type: integer
 *         totalCampaigns:
 *           type: integer
 *         totalAutomations:
 *           type: integer
 *         subscribedMembers:
 *           type: integer
 *         unsubscribedMembers:
 *           type: integer
 *         cleanedMembers:
 *           type: integer
 *         pendingMembers:
 *           type: integer
 *         campaignsSent:
 *           type: integer
 *         totalRevenue:
 *           type: number
 *           format: float
 *         averageOpenRate:
 *           type: number
 *           format: float
 *         averageClickRate:
 *           type: number
 *           format: float
 *
 *     MailchimpWebhookEvent:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           enum: [subscribe, unsubscribe, profile, cleaned, upemail, campaign]
 *           description: Event type
 *         fired_at:
 *           type: string
 *           format: date-time
 *           description: When the event occurred
 *         data:
 *           type: object
 *           description: Event-specific data
 *           properties:
 *             email:
 *               type: string
 *               format: email
 *             list_id:
 *               type: string
 *             id:
 *               type: string
 *             reason:
 *               type: string
 *             old_email:
 *               type: string
 *               format: email
 *             new_email:
 *               type: string
 *               format: email
 *             subject:
 *               type: string
 *
 *   tags:
 *     - name: Mailchimp Integration
 *       description: Mailchimp email marketing integration endpoints
 */

const { protect } = require('../middleware/auth');
const mailchimpController = require('../controllers/mailchimpController');
const router = express.Router();
router.use(protect);

/**
 * @swagger
 * /api/mailchimp/connect:
 *   post:
 *     tags: [Mailchimp Integration]
 *     summary: Connect to Mailchimp
 *     description: Establish connection with Mailchimp account using API key
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - apiKey
 *             properties:
 *               apiKey:
 *                 type: string
 *                 description: Mailchimp API key
 *                 example: "your-api-key-us1"
 *               syncConfig:
 *                 $ref: '#/components/schemas/MailchimpSyncConfig'
 *     responses:
 *       200:
 *         description: Successfully connected to Mailchimp
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/MailchimpConnection'
 *       400:
 *         description: Invalid API key or connection failed
 *       500:
 *         description: Server error during connection
 */
router.post('/connect', mailchimpController.connect);

/**
 * @swagger
 * /api/mailchimp/disconnect:
 *   post:
 *     tags: [Mailchimp Integration]
 *     summary: Disconnect from Mailchimp
 *     description: Disconnect and remove Mailchimp integration
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully disconnected from Mailchimp
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: No active Mailchimp connection found
 *       500:
 *         description: Server error during disconnection
 */
router.post('/disconnect', mailchimpController.disconnect);

/**
 * @swagger
 * /api/mailchimp/connection:
 *   get:
 *     tags: [Mailchimp Integration]
 *     summary: Get connection status
 *     description: Get current Mailchimp connection status and details
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Connection status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/MailchimpConnection'
 *       404:
 *         description: No Mailchimp connection found
 *       500:
 *         description: Server error retrieving connection
 */
router.get('/connection', mailchimpController.getConnection);

/**
 * @swagger
 * /api/mailchimp/lists:
 *   get:
 *     tags: [Mailchimp Integration]
 *     summary: Get all Mailchimp lists
 *     description: Retrieve all Mailchimp mailing lists for the organization
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: syncEnabled
 *         schema:
 *           type: boolean
 *         description: Filter by sync enabled status
 *     responses:
 *       200:
 *         description: Lists retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 lists:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MailchimpList'
 *                 total:
 *                   type: integer
 *       404:
 *         description: Mailchimp connection not found
 *       500:
 *         description: Failed to retrieve lists
 *   post:
 *     tags: [Mailchimp Integration]
 *     summary: Add or update a list
 *     description: Add or update a Mailchimp list in the local database
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - listId
 *               - name
 *             properties:
 *               listId:
 *                 type: string
 *                 description: Mailchimp list ID
 *               name:
 *                 type: string
 *                 description: List name
 *               memberCount:
 *                 type: integer
 *                 description: Number of members
 *                 default: 0
 *               syncEnabled:
 *                 type: boolean
 *                 description: Enable sync for this list
 *                 default: true
 *     responses:
 *       200:
 *         description: List added/updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Mailchimp connection not found
 *       500:
 *         description: Failed to add/update list
 */
router.get('/lists', mailchimpController.getLists);
router.post('/lists', mailchimpController.addOrUpdateList);
/**
 * @swagger
 * /api/mailchimp/campaigns:
 *   get:
 *     tags: [Mailchimp Integration]
 *     summary: Get all campaigns
 *     description: Retrieve all Mailchimp campaigns with optional filtering and pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, scheduled, sending, sent, canceled, paused]
 *         description: Filter campaigns by status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of campaigns per page
 *     responses:
 *       200:
 *         description: Campaigns retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 campaigns:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MailchimpCampaign'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *       500:
 *         description: Failed to retrieve campaigns
 *   post:
 *     tags: [Mailchimp Integration]
 *     summary: Add or update a campaign
 *     description: Add or update a Mailchimp campaign in the local database
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - campaignId
 *             properties:
 *               campaignId:
 *                 type: string
 *                 description: Mailchimp campaign ID
 *               title:
 *                 type: string
 *                 description: Campaign title
 *               subject:
 *                 type: string
 *                 description: Email subject line
 *               status:
 *                 type: string
 *                 enum: [draft, scheduled, sending, sent, canceled, paused]
 *               type:
 *                 type: string
 *                 enum: [regular, plaintext, absplit, rss, variate]
 *               listId:
 *                 type: string
 *                 description: Target list ID
 *               sentDate:
 *                 type: string
 *                 format: date-time
 *               stats:
 *                 $ref: '#/components/schemas/MailchimpCampaignStats'
 *     responses:
 *       200:
 *         description: Campaign added/updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid campaign data
 *       404:
 *         description: Mailchimp connection not found
 *       500:
 *         description: Failed to add/update campaign
 */
router.get('/campaigns', mailchimpController.getCampaigns);
router.post('/campaigns', mailchimpController.addOrUpdateCampaign);

/**
 * @swagger
 * /api/mailchimp/campaigns/{campaignId}:
 *   get:
 *     tags: [Mailchimp Integration]
 *     summary: Get campaign by ID
 *     description: Retrieve a specific Mailchimp campaign by its ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *         description: Mailchimp campaign ID
 *     responses:
 *       200:
 *         description: Campaign retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 campaign:
 *                   $ref: '#/components/schemas/MailchimpCampaign'
 *       404:
 *         description: Campaign or connection not found
 *       500:
 *         description: Failed to retrieve campaign
 */
router.get('/campaigns/:campaignId', mailchimpController.getCampaignById);

/**
 * @swagger
 * /api/mailchimp/campaigns/{campaignId}/stats:
 *   put:
 *     tags: [Mailchimp Integration]
 *     summary: Update campaign statistics
 *     description: Update the statistics for a specific campaign
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: string
 *         description: Mailchimp campaign ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MailchimpCampaignStats'
 *     responses:
 *       200:
 *         description: Campaign stats updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Campaign or connection not found
 *       500:
 *         description: Failed to update campaign stats
 */
router.put('/campaigns/:campaignId/stats', mailchimpController.updateCampaignStats);
/**
 * @swagger
 * /api/mailchimp/automations:
 *   get:
 *     tags: [Mailchimp Integration]
 *     summary: Get all automations
 *     description: Retrieve all Mailchimp automations with optional filtering and pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [save, paused, sending]
 *         description: Filter automations by status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of automations per page
 *     responses:
 *       200:
 *         description: Automations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 automations:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MailchimpAutomationObj'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *       500:
 *         description: Failed to retrieve automations
 *   post:
 *     tags: [Mailchimp Integration]
 *     summary: Add or update an automation
 *     description: Add or update a Mailchimp automation in the local database
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - automationId
 *               - title
 *             properties:
 *               automationId:
 *                 type: string
 *                 description: Mailchimp automation ID
 *               title:
 *                 type: string
 *                 description: Automation title
 *               status:
 *                 type: string
 *                 enum: [save, paused, sending]
 *               listId:
 *                 type: string
 *                 description: Target list ID
 *               triggerSettings:
 *                 type: object
 *                 description: Automation trigger configuration
 *               emailsCount:
 *                 type: integer
 *                 description: Number of emails in automation
 *               recipientsCount:
 *                 type: integer
 *                 description: Number of recipients
 *               dateCreated:
 *                 type: string
 *                 format: date-time
 *               dateStarted:
 *                 type: string
 *                 format: date-time
 *               stats:
 *                 $ref: '#/components/schemas/MailchimpAutomationStats'
 *     responses:
 *       200:
 *         description: Automation added/updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid automation data
 *       404:
 *         description: Mailchimp connection not found
 *       500:
 *         description: Failed to add/update automation
 */
router.get('/automations', mailchimpController.getAutomations);
router.post('/automations', mailchimpController.addOrUpdateAutomation);

/**
 * @swagger
 * /api/mailchimp/automations/{automationId}:
 *   get:
 *     tags: [Mailchimp Integration]
 *     summary: Get automation by ID
 *     description: Retrieve a specific Mailchimp automation by its ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: automationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Mailchimp automation ID
 *     responses:
 *       200:
 *         description: Automation retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 automation:
 *                   $ref: '#/components/schemas/MailchimpAutomationObj'
 *       404:
 *         description: Automation or connection not found
 *       500:
 *         description: Failed to retrieve automation
 */
router.get('/automations/:automationId', mailchimpController.getAutomationById);

/**
 * @swagger
 * /api/mailchimp/automations/{automationId}/stats:
 *   put:
 *     tags: [Mailchimp Integration]
 *     summary: Update automation statistics
 *     description: Update the statistics for a specific automation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: automationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Mailchimp automation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MailchimpAutomationStats'
 *     responses:
 *       200:
 *         description: Automation stats updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Automation or connection not found
 *       500:
 *         description: Failed to update automation stats
 */
router.put('/automations/:automationId/stats', mailchimpController.updateAutomationStats);
/**
 * @swagger
 * /api/mailchimp/members:
 *   get:
 *     tags: [Mailchimp Integration]
 *     summary: Get all members
 *     description: Retrieve all Mailchimp list members with optional filtering and pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: listId
 *         schema:
 *           type: string
 *         description: Filter members by specific list ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [subscribed, unsubscribed, cleaned, pending, transactional]
 *         description: Filter members by subscription status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of members per page
 *     responses:
 *       200:
 *         description: Members retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 members:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MailchimpMember'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *       404:
 *         description: Mailchimp connection not found
 *       500:
 *         description: Failed to retrieve members
 *   post:
 *     tags: [Mailchimp Integration]
 *     summary: Add or update a member
 *     description: Add or update a member in a Mailchimp list
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - listId
 *             properties:
 *               memberId:
 *                 type: string
 *                 description: Mailchimp member ID (auto-generated if not provided)
 *               emailAddress:
 *                 type: string
 *                 format: email
 *                 description: Member email address (required if memberId not provided)
 *               listId:
 *                 type: string
 *                 description: List ID to add member to
 *               status:
 *                 type: string
 *                 enum: [subscribed, unsubscribed, cleaned, pending, transactional]
 *                 default: subscribed
 *               firstName:
 *                 type: string
 *                 description: Member first name
 *               lastName:
 *                 type: string
 *                 description: Member last name
 *               phone:
 *                 type: string
 *                 description: Member phone number
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Tags to assign to member
 *               mergeFields:
 *                 type: object
 *                 description: Custom merge fields
 *     responses:
 *       200:
 *         description: Member added/updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid member data
 *       404:
 *         description: Mailchimp connection not found
 *       500:
 *         description: Failed to add/update member
 */
router.get('/members', mailchimpController.getMembers);
router.post('/members', mailchimpController.addOrUpdateMember);

/**
 * @swagger
 * /api/mailchimp/members/{email}/tags:
 *   post:
 *     tags: [Mailchimp Integration]
 *     summary: Add tag to member
 *     description: Add a tag to a specific member by email address
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: Member email address
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tagName
 *             properties:
 *               tagName:
 *                 type: string
 *                 description: Name of the tag to add
 *                 example: "VIP Customer"
 *     responses:
 *       200:
 *         description: Tag added to member successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Tag name is required
 *       404:
 *         description: Member or connection not found
 *       500:
 *         description: Failed to add tag to member
 */
router.post('/members/:email/tags', mailchimpController.addTagToMember);

/**
 * @swagger
 * /api/mailchimp/members/{email}/tags/{tagName}:
 *   delete:
 *     tags: [Mailchimp Integration]
 *     summary: Remove tag from member
 *     description: Remove a specific tag from a member by email address
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: Member email address
 *       - in: path
 *         name: tagName
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the tag to remove
 *     responses:
 *       200:
 *         description: Tag removed from member successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Member, tag, or connection not found
 *       500:
 *         description: Failed to remove tag from member
 */
router.delete('/members/:email/tags/:tagName', mailchimpController.removeTagFromMember);
/**
 * @swagger
 * /api/mailchimp/tags:
 *   get:
 *     tags: [Mailchimp Integration]
 *     summary: Get all tags
 *     description: Retrieve all available tags with optional list filtering
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: listId
 *         schema:
 *           type: string
 *         description: Filter tags by specific list ID
 *     responses:
 *       200:
 *         description: Tags retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 tags:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MailchimpTag'
 *                 total:
 *                   type: integer
 *       404:
 *         description: Mailchimp connection not found
 *       500:
 *         description: Failed to retrieve tags
 *   post:
 *     tags: [Mailchimp Integration]
 *     summary: Create a new tag
 *     description: Create a new tag for member organization
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tagId
 *               - name
 *             properties:
 *               tagId:
 *                 type: string
 *                 description: Unique tag identifier
 *                 example: "vip-customers"
 *               name:
 *                 type: string
 *                 description: Display name for the tag
 *                 example: "VIP Customers"
 *               listId:
 *                 type: string
 *                 description: Associated list ID (optional)
 *     responses:
 *       200:
 *         description: Tag created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid tag data or tag already exists
 *       404:
 *         description: Mailchimp connection not found
 *       500:
 *         description: Failed to create tag
 */
router.get('/tags', mailchimpController.getTags);
router.post('/tags', mailchimpController.createTag);

/**
 * @swagger
 * /api/mailchimp/segments:
 *   get:
 *     tags: [Mailchimp Integration]
 *     summary: Get all segments
 *     description: Retrieve all available segments with optional list filtering
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: listId
 *         schema:
 *           type: string
 *         description: Filter segments by specific list ID
 *     responses:
 *       200:
 *         description: Segments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 segments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MailchimpSegment'
 *                 total:
 *                   type: integer
 *       404:
 *         description: Mailchimp connection not found
 *       500:
 *         description: Failed to retrieve segments
 *   post:
 *     tags: [Mailchimp Integration]
 *     summary: Create a new segment
 *     description: Create a new audience segment for targeted campaigns
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - segmentId
 *               - name
 *               - listId
 *             properties:
 *               segmentId:
 *                 type: string
 *                 description: Unique segment identifier
 *                 example: "active-patients"
 *               name:
 *                 type: string
 *                 description: Display name for the segment
 *                 example: "Active Patients"
 *               listId:
 *                 type: string
 *                 description: Associated list ID
 *               type:
 *                 type: string
 *                 enum: [static, saved]
 *                 default: static
 *                 description: Segment type
 *               options:
 *                 type: object
 *                 description: Segment configuration options
 *                 properties:
 *                   match:
 *                     type: string
 *                     enum: [any, all]
 *                     default: any
 *                   conditions:
 *                     type: array
 *                     items:
 *                       type: object
 *     responses:
 *       200:
 *         description: Segment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid segment data or segment already exists
 *       404:
 *         description: Mailchimp connection not found
 *       500:
 *         description: Failed to create segment
 */
router.get('/segments', mailchimpController.getSegments);
router.post('/segments', mailchimpController.createSegment);
/**
 * @swagger
 * /api/mailchimp/webhooks:
 *   get:
 *     tags: [Mailchimp Integration]
 *     summary: Get all webhooks
 *     description: Retrieve all configured Mailchimp webhooks
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Webhooks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 webhooks:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MailchimpWebhook'
 *                 total:
 *                   type: integer
 *       404:
 *         description: Mailchimp connection not found
 *       500:
 *         description: Failed to retrieve webhooks
 *   post:
 *     tags: [Mailchimp Integration]
 *     summary: Create a webhook
 *     description: Create a new webhook to receive Mailchimp events
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - webhookId
 *               - listId
 *               - url
 *             properties:
 *               webhookId:
 *                 type: string
 *                 description: Unique webhook identifier
 *               listId:
 *                 type: string
 *                 description: Associated list ID
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: Webhook endpoint URL
 *                 example: "https://yourdomain.com/api/mailchimp/webhook/events"
 *               events:
 *                 type: object
 *                 description: Events to listen for
 *                 properties:
 *                   subscribe:
 *                     type: boolean
 *                     default: true
 *                   unsubscribe:
 *                     type: boolean
 *                     default: true
 *                   profile:
 *                     type: boolean
 *                     default: true
 *                   cleaned:
 *                     type: boolean
 *                     default: true
 *                   upemail:
 *                     type: boolean
 *                     default: true
 *                   campaign:
 *                     type: boolean
 *                     default: false
 *               sources:
 *                 type: object
 *                 description: Event sources to monitor
 *                 properties:
 *                   user:
 *                     type: boolean
 *                     default: true
 *                   admin:
 *                     type: boolean
 *                     default: true
 *                   api:
 *                     type: boolean
 *                     default: true
 *     responses:
 *       200:
 *         description: Webhook created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid webhook data
 *       404:
 *         description: Mailchimp connection not found
 *       500:
 *         description: Failed to create webhook
 */
router.get('/webhooks', mailchimpController.getWebhooks);
router.post('/webhooks', mailchimpController.createWebhook);

/**
 * @swagger
 * /api/mailchimp/webhooks/{webhookId}:
 *   delete:
 *     tags: [Mailchimp Integration]
 *     summary: Delete a webhook
 *     description: Remove a configured webhook
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: webhookId
 *         required: true
 *         schema:
 *           type: string
 *         description: Webhook ID to delete
 *     responses:
 *       200:
 *         description: Webhook deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Webhook or connection not found
 *       500:
 *         description: Failed to delete webhook
 */
router.delete('/webhooks/:webhookId', mailchimpController.deleteWebhook);

/**
 * @swagger
 * /api/mailchimp/webhook/events:
 *   post:
 *     tags: [Mailchimp Integration]
 *     summary: Receive webhook events from Mailchimp
 *     description: Endpoint for receiving webhook events from Mailchimp (called by Mailchimp)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MailchimpWebhookEvent'
 *     responses:
 *       200:
 *         description: Webhook received and processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         description: Failed to process webhook
 */
router.post('/webhook/events', mailchimpController.webhookEvents);
/**
 * @swagger
 * /api/mailchimp/config:
 *   get:
 *     tags: [Mailchimp Integration]
 *     summary: Get sync configuration
 *     description: Retrieve current Mailchimp synchronization configuration
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuration retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 config:
 *                   $ref: '#/components/schemas/MailchimpSyncConfig'
 *       404:
 *         description: Mailchimp connection not found
 *       500:
 *         description: Failed to retrieve configuration
 *   put:
 *     tags: [Mailchimp Integration]
 *     summary: Update sync configuration
 *     description: Update Mailchimp synchronization settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               syncInterval:
 *                 type: string
 *                 enum: [realtime, hourly, daily, weekly]
 *                 description: How frequently to sync data
 *               syncDirection:
 *                 type: string
 *                 enum: [one_way_to_mailchimp, one_way_from_mailchimp, two_way]
 *                 description: Direction of data synchronization
 *               autoSync:
 *                 type: boolean
 *                 description: Enable automatic synchronization
 *               syncPatients:
 *                 type: boolean
 *                 description: Include patient data in sync
 *               syncAppointments:
 *                 type: boolean
 *                 description: Include appointment data in sync
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 config:
 *                   $ref: '#/components/schemas/MailchimpSyncConfig'
 *       400:
 *         description: Invalid configuration values
 *       404:
 *         description: Mailchimp connection not found
 *       500:
 *         description: Failed to update configuration
 */
router.get('/config', mailchimpController.getConfig);
router.put('/config', mailchimpController.updateConfig);

/**
 * @swagger
 * /api/mailchimp/stats:
 *   get:
 *     tags: [Mailchimp Integration]
 *     summary: Get overall statistics
 *     description: Retrieve comprehensive Mailchimp integration statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 stats:
 *                   $ref: '#/components/schemas/MailchimpStats'
 *                 connection:
 *                   type: object
 *                   properties:
 *                     isConnected:
 *                       type: boolean
 *                     accountName:
 *                       type: string
 *                     lastSyncedAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Mailchimp connection not found
 *       500:
 *         description: Failed to retrieve statistics
 */
router.get('/stats', mailchimpController.getStats);

module.exports = router;
