/**
 * routes/authRoutes.js — Authentication endpoints
 *
 * POST /api/auth/signup   — Register new user
 * POST /api/auth/login    — Login user
 * GET  /api/auth/me       — Get current user (protected)
 */

const express = require("express");
const router = express.Router();
const { signup, login, getMe } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", protect, getMe);

module.exports = router;
