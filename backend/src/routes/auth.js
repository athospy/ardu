const express = require('express');
const router = express.Router();
const { register, login, refreshToken, logout } = require('../controllers/authController');
const { registerValidation, loginValidation } = require('../utils/validators');
const { authLimiter } = require('../middleware/rateLimiter');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/register', authLimiter, registerValidation, register);
router.post('/login', authLimiter, loginValidation, login);
router.post('/refresh', refreshToken);

// Protected routes
router.post('/logout', protect, logout);

module.exports = router;
