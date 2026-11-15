const authService = require('../services/authService');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;

  const result = await authService.register(email, password, name);

  logger.info(`New user registered: ${email}`);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: result,
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const result = await authService.login(email, password);

  logger.info(`User logged in: ${email}`);

  res.json({
    success: true,
    message: 'Login successful',
    data: result,
  });
});

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: 'Refresh token is required',
    });
  }

  const result = await authService.refreshToken(refreshToken);

  res.json({
    success: true,
    message: 'Token refreshed successfully',
    data: result,
  });
});

// @desc    Logout user (client-side mainly)
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  // In a JWT-based system, logout is handled client-side by removing tokens
  // This endpoint can be used for logging purposes
  logger.info(`User logged out: ${req.user.email}`);

  res.json({
    success: true,
    message: 'Logout successful',
  });
});

module.exports = {
  register,
  login,
  refreshToken,
  logout,
};
