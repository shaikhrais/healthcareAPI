const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const messagingController = {
  getSummary: async (req, res) => {},
  getConversations: async (req, res) => {},
  createConversation: async (req, res) => {},
  getMessages: async (req, res) => {},
  sendMessage: async (req, res) => {},
  markMessageRead: async (req, res) => {},
  markAllRead: async (req, res) => {},
  addReaction: async (req, res) => {},
  deleteMessage: async (req, res) => {},
  editMessage: async (req, res) => {},
  archiveConversation: async (req, res) => {},
  pinConversation: async (req, res) => {},
  getUnreadCount: async (req, res) => {},
};

module.exports = messagingController;
