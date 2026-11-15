const jwt = require('jsonwebtoken');
const { asyncHandler } = require('./errorHandler');
const db = require('../config/database');

// Protect routes - verify JWT token
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided',
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const result = await db.query(
      'SELECT id, email, name, motivation, language, notification_enabled, expo_push_token FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    // Attach user to request
    req.user = result.rows[0];
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token failed',
    });
  }
});

// Optional auth - doesn't fail if no token
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const result = await db.query(
        'SELECT id, email, name, motivation, language FROM users WHERE id = $1',
        [decoded.id]
      );
      
      if (result.rows.length > 0) {
        req.user = result.rows[0];
      }
    } catch (error) {
      // Token invalid, but we don't fail the request
    }
  }

  next();
});

module.exports = {
  protect,
  optionalAuth,
};
