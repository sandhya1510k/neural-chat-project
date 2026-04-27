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

const decrementMessageCount = async (conversationId) => {
  await Conversation.findByIdAndUpdate(conversationId, {
    $inc: { messageCount: -1 },
  });
};

/**
 * Full-text search across conversation titles and message content for a user.
 * Falls back to regex if text index is not yet created.
 */
const searchConversations = async (userId, query) => {
  const q = query.trim();
  if (!q) return [];

  const regex = new RegExp(q, "i");

  // Find conversations whose title matches
  const titleMatches = await Conversation.find({
    userId,
    isActive: true,
    title: regex,
  })
    .sort({ updatedAt: -1 })
    .limit(20)
    .lean();

  // Find messages whose text matches and belong to the user's conversations
  const userConvIds = (
    await Conversation.find({ userId, isActive: true }).select("_id").lean()
  ).map((c) => c._id);

  const messageMatches = await Message.find({
    conversationId: { $in: userConvIds },
    text: regex,
  })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();

  // Collect conversation IDs from message matches
  const matchedConvIds = new Set(
    messageMatches.map((m) => m.conversationId.toString())
  );

  // Fetch those conversations (avoiding duplicates already in titleMatches)
  const titleMatchIds = new Set(titleMatches.map((c) => c._id.toString()));
  const extraIds = [...matchedConvIds].filter((id) => !titleMatchIds.has(id));

  const messageMatchConvs = extraIds.length
    ? await Conversation.find({ _id: { $in: extraIds } })
        .sort({ updatedAt: -1 })
        .lean()
    : [];

  // Combine and annotate with a snippet from the matching message
  const snippetMap = {};
  for (const msg of messageMatches) {
    const cid = msg.conversationId.toString();
    if (!snippetMap[cid]) {
      snippetMap[cid] = msg.text.substring(0, 100);
    }
  }

  const all = [...titleMatches, ...messageMatchConvs].map((conv) => ({
    ...conv,
    snippet: snippetMap[conv._id.toString()] || null,
  }));

  return all;
};

module.exports = {
  createConversation,
  getUserConversations,
  getConversationById,
  deleteConversation,
  saveMessage,
  getConversationMessages,
  updateConversationTitle,
  decrementMessageCount,
  searchConversations,
};
