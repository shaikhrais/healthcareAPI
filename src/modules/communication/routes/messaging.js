
const express = require('express');
const { authMiddleware } = require('../../auth/middleware/auth');
const messagingController = require('../controllers/messagingController');
const router = express.Router();
router.use(authMiddleware);

/**
 * @swagger
 * components:
 *   schemas:
 *     Message:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Message ID
 *         conversationId:
 *           type: string
 *           description: ID of the conversation this message belongs to
 *         senderId:
 *           type: string
 *           description: ID of the user who sent the message
 *         content:
 *           type: string
 *           description: Message content
 *           example: "Hello, I have a question about my appointment."
 *         type:
 *           type: string
 *           enum: [text, image, file, system]
 *           example: "text"
 *         attachments:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *               filename:
 *                 type: string
 *               size:
 *                 type: number
 *         readBy:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               readAt:
 *                 type: string
 *                 format: date-time
 *         reactions:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               emoji:
 *                 type: string
 *         editHistory:
 *           type: array
 *           items:
 *             type: object
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     Conversation:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Conversation ID
 *         participants:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of participant user IDs
 *         type:
 *           type: string
 *           enum: [direct, group, support]
 *           example: "direct"
 *         title:
 *           type: string
 *           description: Conversation title (for group chats)
 *         lastMessage:
 *           $ref: '#/components/schemas/Message'
 *         unreadCount:
 *           type: object
 *           description: Unread message count per participant
 *         isArchived:
 *           type: boolean
 *           default: false
 *         isPinned:
 *           type: boolean
 *           default: false
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/messaging:
 *   get:
 *     tags: [Communication]
 *     summary: Get messaging summary
 *     description: Retrieve messaging overview including conversation counts and unread messages
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Messaging summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalConversations:
 *                       type: integer
 *                       example: 15
 *                     unreadMessages:
 *                       type: integer
 *                       example: 5
 *                     archivedConversations:
 *                       type: integer
 *                       example: 3
 *                     pinnedConversations:
 *                       type: integer
 *                       example: 2
 *       500:
 *         description: Failed to retrieve messaging summary
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

router.get('/', messagingController.getSummary);

/**
 * @swagger
 * /api/messaging/conversations:
 *   get:
 *     tags: [Communication]
 *     summary: Get user's conversations
 *     description: Retrieve all conversations for the current user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: archived
 *         schema:
 *           type: boolean
 *         description: Filter by archived status
 *       - in: query
 *         name: pinned
 *         schema:
 *           type: boolean
 *         description: Filter by pinned status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of conversations to return
 *     responses:
 *       200:
 *         description: Conversations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Conversation'
 *       500:
 *         description: Failed to retrieve conversations
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     tags: [Communication]
 *     summary: Create a new conversation
 *     description: Start a new conversation with specified participants
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - participants
 *             properties:
 *               participants:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of participant user IDs
 *                 example: ["user_123", "user_456"]
 *               type:
 *                 type: string
 *                 enum: [direct, group, support]
 *                 default: "direct"
 *               title:
 *                 type: string
 *                 description: Conversation title (for group chats)
 *                 example: "Team Discussion"
 *               initialMessage:
 *                 type: string
 *                 description: Optional initial message
 *                 example: "Hello, I'd like to discuss my treatment plan."
 *     responses:
 *       201:
 *         description: Conversation created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: Invalid conversation data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to create conversation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/conversations', messagingController.getConversations);
router.post('/conversations', messagingController.createConversation);
router.get('/conversations/:id/messages', messagingController.getMessages);
router.post('/conversations/:id/messages', messagingController.sendMessage);
router.patch('/messages/:id/read', messagingController.markMessageRead);
router.patch('/conversations/:id/read-all', messagingController.markAllRead);
router.post('/messages/:id/reactions', messagingController.addReaction);
router.delete('/messages/:id', messagingController.deleteMessage);
router.put('/messages/:id', messagingController.editMessage);
router.post('/conversations/:id/archive', messagingController.archiveConversation);
router.post('/conversations/:id/pin', messagingController.pinConversation);
router.get('/unread-count', messagingController.getUnreadCount);

/**
 * @swagger
 * /api/messaging/conversations/{id}/messages:
 *   get:
 *     tags: [Communication]
 *     summary: Get messages in a conversation
 *     description: Retrieve messages for a specific conversation with pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of messages to return
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Return messages before this timestamp (for cursor pagination)
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *       404:
 *         description: Conversation not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/messaging/conversations/{id}/messages:
 *   post:
 *     tags: [Communication]
 *     summary: Send a message in a conversation
 *     description: Send text, file or image message to a conversation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 example: "Hello, is my lab ready?"
 *               type:
 *                 type: string
 *                 enum: [text, image, file, system]
 *                 example: text
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                     filename:
 *                       type: string
 *                     size:
 *                       type: number
 *     responses:
 *       201:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       400:
 *         description: Invalid message data
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/messaging/messages/{id}/read:
 *   patch:
 *     tags: [Communication]
 *     summary: Mark a message as read
 *     description: Mark a specific message as read by the current user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message marked as read
 *       404:
 *         description: Message not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/messaging/conversations/{id}/read-all:
 *   patch:
 *     tags: [Communication]
 *     summary: Mark all messages in a conversation as read
 *     description: Mark all messages in the specified conversation as read for the current user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     responses:
 *       200:
 *         description: All messages marked as read
 *       404:
 *         description: Conversation not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/messaging/messages/{id}/reactions:
 *   post:
 *     tags: [Communication]
 *     summary: Add a reaction to a message
 *     description: Add or update a reaction (emoji) to a message
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - emoji
 *             properties:
 *               emoji:
 *                 type: string
 *                 example: "👍"
 *     responses:
 *       200:
 *         description: Reaction added
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Message not found
 */

/**
 * @swagger
 * /api/messaging/messages/{id}:
 *   delete:
 *     tags: [Communication]
 *     summary: Delete a message
 *     description: Delete a message (soft delete where applicable)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message deleted
 *       404:
 *         description: Message not found
 */

/**
 * @swagger
 * /api/messaging/messages/{id}:
 *   put:
 *     tags: [Communication]
 *     summary: Edit a message
 *     description: Edit the content of a message (if allowed by policy)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 example: "Updated message text"
 *     responses:
 *       200:
 *         description: Message updated
 *       400:
 *         description: Invalid input or edit not allowed
 *       404:
 *         description: Message not found
 */

/**
 * @swagger
 * /api/messaging/conversations/{id}/archive:
 *   post:
 *     tags: [Communication]
 *     summary: Archive a conversation
 *     description: Archive the specified conversation for the current user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     responses:
 *       200:
 *         description: Conversation archived
 *       404:
 *         description: Conversation not found
 */

/**
 * @swagger
 * /api/messaging/conversations/{id}/pin:
 *   post:
 *     tags: [Communication]
 *     summary: Pin a conversation
 *     description: Pin the specified conversation for quick access
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     responses:
 *       200:
 *         description: Conversation pinned
 *       404:
 *         description: Conversation not found
 */

/**
 * @swagger
 * /api/messaging/unread-count:
 *   get:
 *     tags: [Communication]
 *     summary: Get unread message count
 *     description: Return total unread message count for the current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 unreadCount:
 *                   type: integer
 *                   example: 5
 *       500:
 *         description: Server error
 */

module.exports = router;
