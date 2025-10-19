const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file', 'system', 'automated'],
      default: 'text',
    },
    content: {
      type: String,
      required: true,
    },
    attachments: [
      {
        type: {
          type: String,
          enum: ['image', 'document', 'video', 'audio', 'other'],
        },
        filename: String,
        url: String,
        size: Number,
        mimeType: String,
      },
    ],
    readBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    deliveredTo: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        deliveredAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: Date,
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    reactions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        emoji: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });

// Mark message as read
messageSchema.methods.markAsRead = async function (userId) {
  if (!this.readBy.some((r) => r.userId.toString() === userId.toString())) {
    this.readBy.push({ userId, readAt: new Date() });
    await this.save();
  }
};

// Get unread count for conversation
messageSchema.statics.getUnreadCount = async function (conversationId, userId) {
  return this.countDocuments({
    conversationId,
    senderId: { $ne: userId },
    'readBy.userId': { $ne: userId },
  });
};

module.exports = mongoose.model('Message', messageSchema);
