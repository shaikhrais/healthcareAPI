/**
 * ============================================
 * MESSAGING ENDPOINTS (13)
 * ============================================
 */

/**
 * @swagger
 * /api/messaging:
 *   get:
 *     tags: [Messaging]
 *     summary: Get user's recent messages and conversations summary
 *     description: Retrieve messaging overview for authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Messaging summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 conversations:
 *                   type: array
 *                 totalConversations:
 *                   type: integer
 *                 unreadCount:
 *                   type: integer
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/messaging/conversations:
 *   get:
 *     tags: [Messaging]
 *     summary: Get user's conversations
 *     description: Retrieve all conversations for authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: archived
 *         schema:
 *           type: boolean
 *         description: Include archived conversations
 *     responses:
 *       200:
 *         description: User's conversations
 *       500:
 *         description: Server error
 *   post:
 *     tags: [Messaging]
 *     summary: Create a new conversation
 *     description: Start a new conversation or get existing direct conversation
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               participantId:
 *                 type: string
 *                 description: User ID or array of user IDs
 *               conversationType:
 *                 type: string
 *                 enum: [direct, group]
 *               title:
 *                 type: string
 *               patientId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Conversation created
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/messaging/conversations/{id}/messages:
 *   get:
 *     tags: [Messaging]
 *     summary: Get messages in a conversation
 *     description: Retrieve messages for a conversation (Participants only)
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
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Load messages before this timestamp
 *     responses:
 *       200:
 *         description: Conversation messages
 *       403:
 *         description: Access denied
 *       404:
 *         description: Conversation not found
 *       500:
 *         description: Server error
 *   post:
 *     tags: [Messaging]
 *     summary: Send a message
 *     description: Send message in conversation (Participants only)
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
 *               messageType:
 *                 type: string
 *                 enum: [text, image, file]
 *                 default: text
 *               attachments:
 *                 type: array
 *               replyTo:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message sent
 *       403:
 *         description: Access denied
 *       404:
 *         description: Conversation not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/messaging/messages/{id}/read:
 *   patch:
 *     tags: [Messaging]
 *     summary: Mark message as read
 *     description: Mark a specific message as read
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
 *         description: Marked as read
 *       404:
 *         description: Message not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/messaging/conversations/{id}/read-all:
 *   patch:
 *     tags: [Messaging]
 *     summary: Mark all messages in conversation as read
 *     description: Mark all unread messages as read (Participants only)
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
 *       403:
 *         description: Access denied
 *       404:
 *         description: Conversation not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/messaging/messages/{id}/reactions:
 *   post:
 *     tags: [Messaging]
 *     summary: Add reaction to message
 *     description: Add or update emoji reaction to a message
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
 *       404:
 *         description: Message not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/messaging/messages/{id}:
 *   put:
 *     tags: [Messaging]
 *     summary: Edit a message
 *     description: Edit message content (Sender only)
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
 *     responses:
 *       200:
 *         description: Message edited
 *       403:
 *         description: Access denied
 *       404:
 *         description: Message not found
 *       500:
 *         description: Server error
 *   delete:
 *     tags: [Messaging]
 *     summary: Delete a message
 *     description: Soft delete a message (Sender only)
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
 *       403:
 *         description: Access denied
 *       404:
 *         description: Message not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/messaging/conversations/{id}/archive:
 *   post:
 *     tags: [Messaging]
 *     summary: Archive conversation for user
 *     description: Archive conversation (Participants only)
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
 *       403:
 *         description: Access denied
 *       404:
 *         description: Conversation not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/messaging/conversations/{id}/pin:
 *   post:
 *     tags: [Messaging]
 *     summary: Pin conversation for user
 *     description: Pin conversation to top of list (Participants only)
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
 *       403:
 *         description: Access denied
 *       404:
 *         description: Conversation not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/messaging/unread-count:
 *   get:
 *     tags: [Messaging]
 *     summary: Get total unread message count
 *     description: Retrieve total number of unread messages for user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 unreadCount:
 *                   type: integer
 *       500:
 *         description: Server error
 */

module.exports = {};
