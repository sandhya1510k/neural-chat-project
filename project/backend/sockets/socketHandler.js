const { Server } = require("socket.io");
const { verifySocketToken } = require("../middleware/authMiddleware");
const chatService = require("../services/chatService");
const { getChatCompletionStream } = require("../services/openaiService");
const User = require("../models/User");
const Message = require("../models/Message");

const onlineUsers = new Map();

const initSocket = (httpServer) => {
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    process.env.CLIENT_URL,
  ].filter(Boolean);

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
          return callback(null, true);
        }
        callback(new Error("Not allowed by CORS"));
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication token missing"));
      const decoded = verifySocketToken(token);
      const user = await User.findById(decoded.id).select("-password");
      if (!user) return next(new Error("User not found"));
      socket.user = user;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.user._id.toString();
    console.log(`🔌 User connected: ${socket.user.name} [${socket.id}]`);

    onlineUsers.set(userId, socket.id);
    await User.findByIdAndUpdate(userId, { isOnline: true });
    io.emit("online_users", Array.from(onlineUsers.keys()));

    // ── Shared streaming helper ────────────────────────────────────────────────
    // Streams an AI response for a given user message, saves to DB, emits events.
    // streamingMessageId: the temp ID the client pre-allocated (for in-place updates)
    const streamResponse = async (conversationId, userMessageText, streamingMessageId) => {
      socket.emit("bot_typing", { conversationId, isTyping: true });

      const history = await Message.find({ conversationId })
        .sort({ createdAt: 1 })
        .limit(20)
        .lean();

      // Stream tokens to the client as they arrive
      const { content: botText, tokens } = await getChatCompletionStream(
        history,
        userMessageText,
        (token) => {
          socket.emit("bot_token", { conversationId, token, streamingMessageId });
        }
      );

      // Persist completed message
      const botMessage = await chatService.saveMessage({
        conversationId,
        userId,
        role: "bot",
        text: botText,
        tokens,
      });

      socket.emit("bot_typing", { conversationId, isTyping: false });

      // Replace the streaming bubble with the confirmed DB record
      socket.emit("bot_response_end", {
        streamingMessageId,
        message: {
          _id: botMessage._id,
          conversationId,
          role: "bot",
          text: botMessage.text,
          tokens: botMessage.tokens,
          createdAt: botMessage.createdAt,
        },
      });
    };

    // ── send_message ──────────────────────────────────────────────────────────
    socket.on("send_message", async ({ conversationId, message, streamingMessageId }) => {
      if (!conversationId || !message?.trim()) {
        socket.emit("error_event", { message: "conversationId and message are required" });
        return;
      }

      try {
        const conversation = await chatService.getConversationById(conversationId, userId);

        const userMessage = await chatService.saveMessage({
          conversationId,
          userId,
          role: "user",
          text: message.trim(),
        });

        if (conversation.messageCount === 0) {
          await chatService.updateConversationTitle(conversationId, message.trim());
        }

        socket.emit("message_saved", {
          _id: userMessage._id,
          conversationId,
          role: "user",
          text: userMessage.text,
          createdAt: userMessage.createdAt,
        });

        await streamResponse(conversationId, message.trim(), streamingMessageId);
      } catch (error) {
        console.error("Socket send_message error:", error.message);
        socket.emit("bot_typing", { conversationId, isTyping: false });
        socket.emit("error_event", {
          message: error.message || "Failed to get AI response. Please try again.",
        });
      }
    });

    // ── regenerate_message ────────────────────────────────────────────────────
    // Replaces the last bot message with a fresh AI response.
    // Payload: { conversationId, botMessageId, streamingMessageId }
    socket.on("regenerate_message", async ({ conversationId, botMessageId, streamingMessageId }) => {
      if (!conversationId || !botMessageId) {
        socket.emit("error_event", { message: "conversationId and botMessageId are required" });
        return;
      }

      try {
        await chatService.getConversationById(conversationId, userId);

        // Find the bot message and the user message before it
        const botMsg = await Message.findOne({ _id: botMessageId, conversationId });
        if (!botMsg || botMsg.role !== "bot") {
          socket.emit("error_event", { message: "Bot message not found" });
          return;
        }

        const userMsg = await Message.findOne({
          conversationId,
          role: "user",
          createdAt: { $lt: botMsg.createdAt },
        }).sort({ createdAt: -1 });

        if (!userMsg) {
          socket.emit("error_event", { message: "No preceding user message found" });
          return;
        }

        // Remove the old bot message and decrement counter
        await Message.findByIdAndDelete(botMessageId);
        await chatService.decrementMessageCount(conversationId);

        socket.emit("message_removed", { conversationId, messageId: botMessageId });

        await streamResponse(conversationId, userMsg.text, streamingMessageId);
      } catch (error) {
        console.error("Socket regenerate_message error:", error.message);
        socket.emit("bot_typing", { conversationId, isTyping: false });
        socket.emit("error_event", {
          message: error.message || "Failed to regenerate response.",
        });
      }
    });

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on("disconnect", async () => {
      console.log(`🔴 User disconnected: ${socket.user.name}`);
      onlineUsers.delete(userId);
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
      io.emit("online_users", Array.from(onlineUsers.keys()));
    });
  });

  return io;
};

module.exports = initSocket;
