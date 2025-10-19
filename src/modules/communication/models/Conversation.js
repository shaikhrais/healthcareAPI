const mongoose = require('mongoose');

// eslint-disable-next-line no-unused-vars
const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    conversationType: {
      type: String,
      enum: ['direct', 'group', 'patient_practitioner', 'team'],
      default: 'direct',
      index: true,
    },
    title: {
      type: String, // For group conversations
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    lastMessageAt: {
      type: Date,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      index: true,
    },
    relatedTo: {
      type: String,
      enum: ['appointment', 'treatment', 'general'],
      default: 'general',
    },
    relatedId: mongoose.Schema.Types.ObjectId,
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    archivedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isPinned: {
      type: Boolean,
      default: false,
    },
    pinnedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

// Indexes
conversationSchema.index({ participants: 1, isArchived: 1 });
conversationSchema.index({ conversationType: 1, lastMessageAt: -1 });

// Get user's conversations
conversationSchema.statics.getUserConversations = async function (userId, archived = false) {
  return this.find({
    participants: userId,
    isArchived: archived,
  })
    .populate('participants', 'firstName lastName role')
    .populate('lastMessage')
    .populate('patientId', 'firstName lastName')
    .sort({ lastMessageAt: -1 });
};

// Find or create direct conversation between two users
conversationSchema.statics.findOrCreateDirect = async function (user1Id, user2Id) {
  let conversation = await this.findOne({
    conversationType: 'direct',
    participants: { $all: [user1Id, user2Id], $size: 2 },
  });

  if (!conversation) {
    conversation = await this.create({
      conversationType: 'direct',
      participants: [user1Id, user2Id],
    });
  }

  return conversation;
};

// Archive conversation for user
conversationSchema.methods.archiveForUser = async function (userId) {
  if (!this.archivedBy.includes(userId)) {
    this.archivedBy.push(userId);

    // If all participants have archived, mark conversation as archived
    if (this.archivedBy.length === this.participants.length) {
      this.isArchived = true;
    }

    await this.save();
  }
};

// Pin conversation for user
conversationSchema.methods.pinForUser = async function (userId) {
  if (!this.pinnedBy.includes(userId)) {
    this.pinnedBy.push(userId);
    this.isPinned = true;
    await this.save();
  }
};

// Update last message
conversationSchema.methods.updateLastMessage = async function (messageId) {
  this.lastMessage = messageId;
  this.lastMessageAt = new Date();
  await this.save();
};

module.exports = mongoose.model('Conversation', conversationSchema);
