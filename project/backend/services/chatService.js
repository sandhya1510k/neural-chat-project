/**
 * services/chatService.js — Chat business logic
 * Manages conversations and messages in MongoDB
 */

const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

/**
 * Create a new conversation for a user
 */
const createConversation = async (userId, title = "New Conversation") => {
  return await Conversation.create({ userId, title });
};

/**
 * Get all conversations for a user (sorted by latest)
 */
const getUserConversations = async (userId) => {
  return await Conversation.find({ userId, isActive: true })
    .sort({ updatedAt: -1 })
    .lean();
};

/**
 * Get a single conversation by ID (validates ownership)
 */
const getConversationById = async (conversationId, userId) => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    userId,
  });
  if (!conversation) {
    const error = new Error("Conversation not found");
    error.statusCode = 404;
    throw error;
  }
  return conversation;
};

/**
 * Delete (soft-delete) a conversation and its messages
 */
const deleteConversation = async (conversationId, userId) => {
  await getConversationById(conversationId, userId); // Verify ownership
  await Conversation.findByIdAndUpdate(conversationId, { isActive: false });
};

/**
 * Save a message to the database
 */
const saveMessage = async ({ conversationId, userId, role, text, tokens = 0 }) => {
  const message = await Message.create({
    conversationId,
    userId,
    role,
    text,
    tokens,
  });

  // Update conversation metadata
  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: text.substring(0, 100),
    $inc: { messageCount: 1 },
  });

  return message;
};

/**
 * Get all messages for a conversation (for history on load)
 */
const getConversationMessages = async (conversationId, userId) => {
  // Validate ownership first
  await getConversationById(conversationId, userId);

  return await Message.find({ conversationId })
    .sort({ createdAt: 1 })
    .lean();
};

/**
 * Auto-generate a conversation title from the first message
 */
const updateConversationTitle = async (conversationId, firstMessage) => {
  // Use first 50 chars of the first user message as title
  const title = firstMessage.length > 50
    ? firstMessage.substring(0, 47) + "..."
    : firstMessage;

  await Conversation.findByIdAndUpdate(conversationId, { title });
};

module.exports = {
  createConversation,
  getUserConversations,
  getConversationById,
  deleteConversation,
  saveMessage,
  getConversationMessages,
  updateConversationTitle,
};
