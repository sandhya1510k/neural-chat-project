/**
 * routes/chatRoutes.js — Chat/conversation endpoints (all protected)
 *
 * POST   /api/chat/conversations           — Create conversation
 * GET    /api/chat/conversations           — List conversations
 * DELETE /api/chat/conversations/:id       — Delete conversation
 * GET    /api/chat/conversations/:id/messages — Get message history
 */

const express = require("express");
const router = express.Router();
const {
  createConversation,
  getConversations,
  deleteConversation,
  getMessages,
} = require("../controllers/chatController");
const { protect } = require("../middleware/authMiddleware");

// All chat routes require authentication
router.use(protect);

router.route("/conversations").post(createConversation).get(getConversations);

router
  .route("/conversations/:id")
  .delete(deleteConversation);

router.get("/conversations/:id/messages", getMessages);

module.exports = router;
