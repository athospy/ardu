const aiService = require('../services/aiService');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// @desc    Get AI-recommended quote
// @route   GET /api/ai/recommended-quote
// @access  Private
const getRecommendedQuote = asyncHandler(async (req, res) => {
  const quote = await aiService.generateRecommendedQuote(req.user.id);

  res.json({
    success: true,
    message: 'AI quote generated successfully',
    data: quote,
  });
});

// @desc    Generate multiple AI quotes
// @route   POST /api/ai/generate-batch
// @access  Private
const generateBatchQuotes = asyncHandler(async (req, res) => {
  const { count = 3 } = req.body;

  if (count < 1 || count > 5) {
    return res.status(400).json({
      success: false,
      message: 'Count must be between 1 and 5',
    });
  }

  const quotes = await aiService.generateBatchQuotes(req.user.id, count);

  logger.info(`Generated ${quotes.length} AI quotes for user ${req.user.email}`);

  res.json({
    success: true,
    message: `Generated ${quotes.length} AI quotes`,
    data: quotes,
  });
});

// @desc    Get user's AI-generated quotes
// @route   GET /api/ai/quotes
// @access  Private
const getUserAIQuotes = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  const quotes = await aiService.getUserAIQuotes(req.user.id, parseInt(limit));

  res.json({
    success: true,
    data: quotes,
  });
});

// @desc    Get random AI quote from user's collection
// @route   GET /api/ai/random
// @access  Private
const getRandomAIQuote = asyncHandler(async (req, res) => {
  const quote = await aiService.getRandomAIQuote(req.user.id);

  if (!quote) {
    return res.status(404).json({
      success: false,
      message: 'No AI-generated quotes found. Generate one first!',
    });
  }

  res.json({
    success: true,
    data: quote,
  });
});

// @desc    Regenerate quote
// @route   POST /api/ai/regenerate
// @access  Private
const regenerateQuote = asyncHandler(async (req, res) => {
  const quote = await aiService.regenerateQuote(req.user.id);

  res.json({
    success: true,
    message: 'New quote generated',
    data: quote,
  });
});

// @desc    Check AI service availability
// @route   GET /api/ai/status
// @access  Public
const checkAIStatus = asyncHandler(async (req, res) => {
  const isAvailable = await aiService.checkAvailability();

  res.json({
    success: true,
    data: {
      available: isAvailable,
      model: process.env.OLLAMA_MODEL || 'llama2',
      host: process.env.OLLAMA_HOST || 'http://localhost:11434',
    },
  });
});

module.exports = {
  getRecommendedQuote,
  generateBatchQuotes,
  getUserAIQuotes,
  getRandomAIQuote,
  regenerateQuote,
  checkAIStatus,
};
