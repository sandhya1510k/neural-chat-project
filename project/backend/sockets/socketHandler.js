/**
 * sockets/socketHandler.js — Real-time Socket.io logic
 *
 * Events handled:
 *   connection         — authenticate user, join their room
 *   send_message       — receive user message, call OpenAI, emit response
 *   disconnect         — mark user offline
 */

const { Server } = require("socket.io");
const { verifySocketToken } = require("../middleware/authMiddleware");
const chatService = require("../services/chatService");
const { getChatCompletion } = require("../services/openaiService");
const User = require("../models/User");
const Message = require("../models/Message");

// Track online users: userId → socketId
const onlineUsers = new Map();

const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
  });

  // ─── Authentication Middleware ──────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Authentication token missing"));
      }

      const decoded = verifySocketToken(token);
      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        return next(new Error("User not found"));
      }

      socket.user = user; // Attach user to socket
      next();
    } catch (err) {
      next(new Error("Invalid or expired token"));
    }
  });

  // ─── Connection Handler ─────────────────────────────────────────────────────
  io.on("connection", async (socket) => {
    const userId = socket.user._id.toString();
    console.log(`🔌 User connected: ${socket.user.name} [${socket.id}]`);

    // Register as online
    onlineUsers.set(userId, socket.id);
    await User.findByIdAndUpdate(userId, { isOnline: true });

    // Broadcast updated online users list
    io.emit("online_users", Array.from(onlineUsers.keys()));

    // ─── send_message ─────────────────────────────────────────────────────────
    /**
     * Payload: { conversationId, message }
     * Flow:
     *   1. Validate conversation ownership
     *   2. Save user message to DB
     *   3. Emit bot_typing
     *   4. Call OpenAI API
     *   5. Save bot response to DB
     *   6. Emit receive_message
     */
    socket.on("send_message", async (payload) => {
      const { conversationId, message } = payload;

      if (!conversationId || !message?.trim()) {
        socket.emit("error_event", { message: "conversationId and message are required" });
        return;
      }

      try {
        // 1. Validate conversation belongs to user
        const conversation = await chatService.getConversationById(
          conversationId,
          userId
        );

        // 2. Save user message
        const userMessage = await chatService.saveMessage({
          conversationId,
          userId,
          role: "user",
          text: message.trim(),
        });

        // Auto-set title from first message
        if (conversation.messageCount === 0) {
          await chatService.updateConversationTitle(conversationId, message.trim());
        }

        // Emit user message back for confirmation
        socket.emit("message_saved", {
          _id: userMessage._id,
          conversationId,
          role: "user",
          text: userMessage.text,
          createdAt: userMessage.createdAt,
        });

        // 3. Signal bot is typing
        socket.emit("bot_typing", { conversationId, isTyping: true });

        // 4. Fetch message history for context
        const history = await Message.find({ conversationId })
          .sort({ createdAt: 1 })
          .limit(20)
          .lean();

        // 5. Call OpenAI
        const { content: botText, tokens } = await getChatCompletion(
          history.slice(0, -1), // All messages except the one we just saved
          message.trim()
        );

        // 6. Save bot response
        const botMessage = await chatService.saveMessage({
          conversationId,
          userId,
          role: "bot",
          text: botText,
          tokens,
        });

        // Stop typing indicator
        socket.emit("bot_typing", { conversationId, isTyping: false });

        // 7. Emit the bot response
        socket.emit("receive_message", {
          _id: botMessage._id,
          conversationId,
          role: "bot",
          text: botMessage.text,
          createdAt: botMessage.createdAt,
        });

      } catch (error) {
        console.error("Socket send_message error:", error.message);
        socket.emit("bot_typing", { conversationId, isTyping: false });
        socket.emit("error_event", {
          message: error.message || "Failed to get AI response. Please try again.",
        });
      }
    });

    // ─── Disconnect ──────────────────────────────────────────────────────────
    socket.on("disconnect", async () => {
      console.log(`🔴 User disconnected: ${socket.user.name}`);
      onlineUsers.delete(userId);
      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen: new Date(),
      });
      io.emit("online_users", Array.from(onlineUsers.keys()));
    });
  });

  return io;
};

module.exports = initSocket;
