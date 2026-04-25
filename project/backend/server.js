/**
 * server.js — Main entry point
 * Bootstraps Express, Socket.io, and MongoDB connection
 */

require("dotenv").config();
const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");
const initSocket = require("./sockets/socketHandler");

const PORT = process.env.PORT || 5000;

// Create HTTP server (required for Socket.io)
const server = http.createServer(app);

// Initialize Socket.io on the server
initSocket(server);

// Connect to MongoDB, then start server
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV}]`);
  });
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err.message);
  server.close(() => process.exit(1));
});
