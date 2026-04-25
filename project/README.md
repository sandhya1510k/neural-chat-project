# NeuralChat — Production-Ready AI Chatbot

Real-time AI chat application built with React, Node.js, Socket.io, MongoDB, and OpenAI GPT.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Prerequisites](#prerequisites)
4. [Environment Setup](#environment-setup)
5. [Running Locally](#running-locally)
6. [API Reference](#api-reference)
7. [Socket Events](#socket-events)
8. [Database Schema](#database-schema)
9. [Sample Postman Requests](#sample-postman-requests)
10. [Deployment Notes](#deployment-notes)

---

## Architecture Overview

```
Browser (React + Socket.io client)
        │
        │  HTTP (REST) — Auth, conversation CRUD, message history
        │  WebSocket   — Real-time messaging, typing indicators
        ▼
Node.js / Express Server
        │
        ├── REST Routes (/api/auth, /api/chat)
        │       └── Controllers → Services → MongoDB (Mongoose)
        │
        └── Socket.io Handler
                ├── JWT middleware (authenticates every socket)
                ├── send_message → chatService.saveMessage
                │               → openaiService.getChatCompletion
                │               → emit receive_message
                └── disconnect  → mark user offline
```

### Key Design Decisions

| Decision | Rationale |
|---|---|
| Socket.io for chat | True bi-directional real-time; easier than raw WebSocket |
| REST for CRUD | Conversations/history don't need real-time; HTTP caching works |
| JWT in socket `auth` | Secure; token travels in handshake, not query string |
| Optimistic UI | User message appears instantly before server ACK |
| Context window trimming | Last 20 messages sent to OpenAI to control token cost |
| Soft-delete conversations | `isActive: false` preserves data, allows recovery |

---

## Project Structure

```
project/
├── backend/
│   ├── server.js              # Entry: HTTP server + Socket.io init
│   ├── app.js                 # Express setup, middleware, routes
│   ├── config/
│   │   └── db.js              # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js  # signup, login, getMe
│   │   └── chatController.js  # conversations CRUD, message history
│   ├── middleware/
│   │   ├── authMiddleware.js  # JWT protect(), verifySocketToken()
│   │   └── errorMiddleware.js # notFound, global errorHandler
│   ├── models/
│   │   ├── User.js            # name, email, password (hashed), isOnline
│   │   ├── Conversation.js    # userId, title, lastMessage, messageCount
│   │   └── Message.js         # conversationId, userId, role, text, tokens
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── chatRoutes.js
│   ├── services/
│   │   ├── authService.js     # registerUser, loginUser, generateToken
│   │   ├── chatService.js     # conversation + message DB operations
│   │   └── openaiService.js   # getChatCompletion (OpenAI wrapper)
│   ├── sockets/
│   │   └── socketHandler.js   # All Socket.io logic
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── public/
    │   └── index.html
    └── src/
        ├── App.js             # Router + context providers
        ├── index.js
        ├── index.css          # CSS variables + global styles
        ├── context/
        │   ├── AuthContext.js # user, token, login(), logout()
        │   └── ChatContext.js # conversations, messages, socket events
        ├── pages/
        │   ├── LoginPage.js
        │   ├── SignupPage.js
        │   └── ChatPage.js    # Layout shell (Sidebar + ChatWindow)
        ├── components/
        │   ├── auth/
        │   │   └── AuthLayout.js
        │   ├── chat/
        │   │   ├── Sidebar.js           # Conversation list
        │   │   ├── ConversationItem.js  # Single conversation row
        │   │   ├── ChatWindow.js        # Header + body container
        │   │   ├── MessageList.js       # Scrollable message feed
        │   │   ├── MessageBubble.js     # Single message (user/bot)
        │   │   ├── MessageInput.js      # Auto-grow textarea + send
        │   │   └── TypingIndicator.js   # Animated dots
        │   └── ui/
        │       └── LoadingScreen.js
        ├── hooks/
        │   ├── useAutoScroll.js
        │   └── useLocalStorage.js
        ├── services/
        │   └── api.js         # Axios instance + authAPI + chatAPI
        └── socket/
            └── socketClient.js # Socket singleton factory
```

---

## Prerequisites

- **Node.js** v18+
- **MongoDB** running locally OR a MongoDB Atlas connection string
- **OpenAI API key** — get one at https://platform.openai.com/api-keys

---

## Environment Setup

### Backend `.env`

Create `backend/.env` (copy from `.env.example`):

```env
PORT=5000
NODE_ENV=development

MONGO_URI=mongodb://localhost:27017/ai_chatbot

JWT_SECRET=change_this_to_a_long_random_string
JWT_EXPIRES_IN=7d

OPENAI_API_KEY=sk-...your-key...
OPENAI_MODEL=gpt-3.5-turbo

CLIENT_URL=http://localhost:3000
```

### Frontend `.env`

Create `frontend/.env` (copy from `.env.example`):

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

---

## Running Locally

### 1. Install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Start MongoDB (if local)

```bash
# macOS with Homebrew
brew services start mongodb-community

# Ubuntu / WSL
sudo systemctl start mongod

# Or use Docker
docker run -d -p 27017:27017 --name mongo mongo:7
```

### 3. Start backend

```bash
cd backend
npm run dev   # Uses nodemon for hot reload
```

Expected output:
```
✅ MongoDB connected: localhost
🚀 Server running on port 5000 [development]
```

### 4. Start frontend

```bash
cd frontend
npm start
```

Open http://localhost:3000

---

## API Reference

All endpoints return JSON. Protected routes require:
```
Authorization: Bearer <jwt_token>
```

### Authentication

#### POST `/api/auth/signup`

Register a new user.

**Request body:**
```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "password": "secret123"
}
```

**Response `201`:**
```json
{
  "success": true,
  "message": "Account created successfully",
  "token": "eyJhbGci...",
  "user": {
    "_id": "65a1b2c3...",
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "createdAt": "2024-01-10T12:00:00.000Z"
  }
}
```

---

#### POST `/api/auth/login`

**Request body:**
```json
{
  "email": "ada@example.com",
  "password": "secret123"
}
```

**Response `200`:** same shape as signup.

---

#### GET `/api/auth/me` 🔒

Returns current authenticated user.

**Response `200`:**
```json
{
  "success": true,
  "user": {
    "_id": "65a1b2c3...",
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "isOnline": true,
    "lastSeen": "2024-01-10T12:05:00.000Z",
    "createdAt": "2024-01-10T12:00:00.000Z"
  }
}
```

---

### Chat

#### POST `/api/chat/conversations` 🔒

Create a new conversation.

**Request body (optional):**
```json
{ "title": "My Python Questions" }
```

**Response `201`:**
```json
{
  "success": true,
  "conversation": {
    "_id": "65b1c2d3...",
    "userId": "65a1b2c3...",
    "title": "New Conversation",
    "messageCount": 0,
    "lastMessage": "",
    "isActive": true,
    "createdAt": "2024-01-10T12:01:00.000Z",
    "updatedAt": "2024-01-10T12:01:00.000Z"
  }
}
```

---

#### GET `/api/chat/conversations` 🔒

List all active conversations for the authenticated user.

**Response `200`:**
```json
{
  "success": true,
  "conversations": [
    {
      "_id": "65b1c2d3...",
      "title": "How does React work?",
      "lastMessage": "React uses a virtual DOM to...",
      "messageCount": 6,
      "updatedAt": "2024-01-10T12:10:00.000Z"
    }
  ]
}
```

---

#### DELETE `/api/chat/conversations/:id` 🔒

Soft-deletes a conversation (sets `isActive: false`).

**Response `200`:**
```json
{ "success": true, "message": "Conversation deleted" }
```

---

#### GET `/api/chat/conversations/:id/messages` 🔒

Fetch full message history for a conversation.

**Response `200`:**
```json
{
  "success": true,
  "messages": [
    {
      "_id": "65c1d2e3...",
      "conversationId": "65b1c2d3...",
      "userId": "65a1b2c3...",
      "role": "user",
      "text": "Explain async/await in JavaScript",
      "createdAt": "2024-01-10T12:02:00.000Z"
    },
    {
      "_id": "65c1d2e4...",
      "role": "bot",
      "text": "Async/await is syntactic sugar over Promises...",
      "tokens": 312,
      "createdAt": "2024-01-10T12:02:03.000Z"
    }
  ]
}
```

---

## Socket Events

### Client → Server

#### `send_message`
```json
{
  "conversationId": "65b1c2d3...",
  "message": "What is the capital of France?"
}
```

---

### Server → Client

#### `message_saved`
Fired immediately after the user's message is persisted (confirms delivery).
```json
{
  "_id": "65c1d2e3...",
  "conversationId": "65b1c2d3...",
  "role": "user",
  "text": "What is the capital of France?",
  "createdAt": "2024-01-10T12:03:00.000Z"
}
```

#### `bot_typing`
```json
{ "conversationId": "65b1c2d3...", "isTyping": true }
{ "conversationId": "65b1c2d3...", "isTyping": false }
```

#### `receive_message`
Fired when the OpenAI response is ready.
```json
{
  "_id": "65c1d2e5...",
  "conversationId": "65b1c2d3...",
  "role": "bot",
  "text": "The capital of France is Paris.",
  "createdAt": "2024-01-10T12:03:02.000Z"
}
```

#### `online_users`
Emitted to all clients when someone connects/disconnects.
```json
["65a1b2c3...", "65a1b2c4..."]
```

#### `error_event`
```json
{ "message": "Failed to get AI response. Please try again." }
```

---

## Database Schema

### Users Collection
```js
{
  _id: ObjectId,
  name: String,           // required, 2-50 chars
  email: String,          // unique, lowercase
  password: String,       // bcrypt hash, never returned in queries
  isOnline: Boolean,      // updated on socket connect/disconnect
  lastSeen: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Conversations Collection
```js
{
  _id: ObjectId,
  userId: ObjectId,       // ref: User
  title: String,          // auto-set from first message
  isActive: Boolean,      // false = soft-deleted
  messageCount: Number,
  lastMessage: String,    // first 100 chars for sidebar preview
  createdAt: Date,
  updatedAt: Date
}
```

### Messages Collection
```js
{
  _id: ObjectId,
  conversationId: ObjectId,  // ref: Conversation
  userId: ObjectId,           // ref: User
  role: "user" | "bot",
  text: String,
  tokens: Number,             // OpenAI tokens used (bot messages)
  isError: Boolean,
  createdAt: Date,
  updatedAt: Date
}
// Compound index: { conversationId: 1, createdAt: 1 }
```

---

## Sample Postman Requests

Import the following as a Postman collection, or run with `curl`:

```bash
# 1. Signup
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada Lovelace","email":"ada@test.com","password":"test1234"}'

# 2. Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@test.com","password":"test1234"}'

# 3. Get current user (replace TOKEN)
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer TOKEN"

# 4. Create conversation
curl -X POST http://localhost:5000/api/chat/conversations \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Chat"}'

# 5. List conversations
curl http://localhost:5000/api/chat/conversations \
  -H "Authorization: Bearer TOKEN"

# 6. Get messages for a conversation
curl http://localhost:5000/api/chat/conversations/CONV_ID/messages \
  -H "Authorization: Bearer TOKEN"

# 7. Health check
curl http://localhost:5000/api/health
```

---

## Deployment Notes

### Backend (e.g. Railway / Render / Fly.io)
- Set all `.env` variables in the platform dashboard
- `MONGO_URI` → your MongoDB Atlas connection string
- `CLIENT_URL` → your deployed frontend URL (for CORS)
- `NODE_ENV=production`

### Frontend (e.g. Vercel / Netlify)
- Set `REACT_APP_API_URL` and `REACT_APP_SOCKET_URL` to your backend URL
- Remove the `"proxy"` field from `package.json` in production

### MongoDB Atlas (free tier works fine)
1. Create cluster at https://cloud.mongodb.com
2. Add database user + whitelist `0.0.0.0/0` (or specific IP)
3. Copy connection string → paste as `MONGO_URI`

---

## Security Checklist

- [x] Passwords hashed with bcrypt (salt rounds: 12)
- [x] JWT secret via environment variable
- [x] Password field excluded from all DB queries (`select: false`)
- [x] Socket connections authenticated via JWT middleware
- [x] Conversation ownership verified before every operation
- [x] Input validation on all endpoints
- [x] Global error handler prevents stack trace leakage in production
- [x] CORS restricted to known origin

---

*Built with Node.js · Express · Socket.io · MongoDB · React · OpenAI*
