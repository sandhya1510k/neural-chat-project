/**
 * controllers/chatController.js — Chat HTTP handlers
 * REST endpoints for conversation management and message history
 */

const chatService = require("../services/chatService");

/**
 * POST /api/chat/conversations — Create new conversation
 */
const createConversation = async (req, res, next) => {
  try {
    const { title } = req.body;
    const conversation = await chatService.createConversation(req.user.id, title);
    res.status(201).json({ success: true, conversation });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/chat/conversations — Get all user's conversations
 */
const getConversations = async (req, res, next) => {
  try {
    const conversations = await chatService.getUserConversations(req.user.id);
    res.json({ success: true, conversations });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/chat/conversations/:id — Delete a conversation
 */
const deleteConversation = async (req, res, next) => {
  try {
    await chatService.deleteConversation(req.params.id, req.user.id);
    res.json({ success: true, message: "Conversation deleted" });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/chat/conversations/:id/messages — Get message history
 */
const getMessages = async (req, res, next) => {
  try {
    const messages = await chatService.getConversationMessages(
      req.params.id,
      req.user.id
    );
    res.json({ success: true, messages });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/chat/search?q=... — Full-text search across conversations + messages
 */
const searchConversations = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.json({ success: true, results: [] });
    }
    const results = await chatService.searchConversations(req.user.id, q);
    res.json({ success: true, results });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createConversation,
  getConversations,
  deleteConversation,
  getMessages,
  searchConversations,
};
