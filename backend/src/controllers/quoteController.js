const quoteService = require('../services/quoteService');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// @desc    Get all quotes
// @route   GET /api/quotes
// @access  Public
const getAllQuotes = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, language = 'en' } = req.query;

  const result = await quoteService.getAllQuotes(
    parseInt(page),
    parseInt(limit),
    language
  );

  res.json({
    success: true,
    data: result,
  });
});

// @desc    Get or create initial personalized quotes (safe to call on login/sync)
// @route   POST /api/quotes/initialize
// @access  Private
const initializePersonalizedQuotes = asyncHandler(async (req, res) => {
  const { language } = req.body;
  const userId = req.user.id;

  const result = await quoteService.getInitialPersonalizedQuotes(userId, language);

  const statusCode = result.alreadyInitialized ? 200 : 201;

  logger.info(`User ${req.user.email} ${result.alreadyInitialized ? 'retrieved' : 'initialized'} personalized quotes`);

  res.status(statusCode).json({
    success: true,
    message: result.message,
    data: {
      quotes: result.quotes,
      count: result.count,
      alreadyInitialized: result.alreadyInitialized,
    },
  });
});

// @desc    Get random quote
// @route   GET /api/quotes/random
// @access  Public (but can be enhanced with user context)
const getRandomQuote = asyncHandler(async (req, res) => {
  const { language = 'en' } = req.query;
  const userId = req.user?.id || null;

  const quote = await quoteService.getRandomQuote(userId, language);

  if (!quote) {
    return res.status(404).json({
      success: false,
      message: 'No quotes found',
    });
  }

  res.json({
    success: true,
    data: quote,
  });
});

// @desc    Get user's favorite quotes
// @route   GET /api/quotes/favorites
// @access  Private
const getFavoriteQuotes = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const result = await quoteService.getFavoriteQuotes(
    req.user.id,
    parseInt(page),
    parseInt(limit)
  );

  res.json({
    success: true,
    data: result,
  });
});

// @desc    Toggle favorite quote
// @route   POST /api/quotes/:id/favorite
// @access  Private
const toggleFavorite = asyncHandler(async (req, res) => {
  const quoteId = parseInt(req.params.id);

  const result = await quoteService.toggleFavorite(req.user.id, quoteId);

  logger.info(`User ${req.user.email} toggled favorite for quote ${quoteId}`);

  res.json({
    success: true,
    message: result.isFavorite ? 'Quote added to favorites' : 'Quote removed from favorites',
    data: result,
  });
});

// @desc    Create custom quote
// @route   POST /api/quotes
// @access  Private
const createQuote = asyncHandler(async (req, res) => {
  const { text, author, category, language = 'en', is_ai_generated = false } = req.body;

  // Validate: non-AI quotes must have text
  if (!is_ai_generated && !text) {
    return res.status(400).json({
      success: false,
      message: 'Text is required for non-AI quotes',
    });
  }

  const quote = await quoteService.createCustomQuote(
    req.user.id,
    text,
    author,
    category,
    language,
    is_ai_generated
  );

  logger.info(`User ${req.user.email} created ${is_ai_generated ? 'AI' : 'custom'} quote`);

  res.status(201).json({
    success: true,
    message: is_ai_generated 
      ? 'AI quote created. Will be generated overnight.' 
      : 'Quote created successfully',
    data: quote,
  });
});

// @desc    Delete custom quote
// @route   DELETE /api/quotes/:id
// @access  Private
const deleteQuote = asyncHandler(async (req, res) => {
  const quoteId = parseInt(req.params.id);

  await quoteService.deleteCustomQuote(req.user.id, quoteId);

  logger.info(`User ${req.user.email} deleted quote ${quoteId}`);

  res.json({
    success: true,
    message: 'Quote deleted successfully',
  });
});

// @desc    Get quotes by category
// @route   GET /api/quotes/category/:category
// @access  Public
const getQuotesByCategory = asyncHandler(async (req, res) => {
  const { category } = req.params;
  const { language = 'en', limit = 10 } = req.query;

  const quotes = await quoteService.getQuotesByCategory(
    category,
    language,
    parseInt(limit)
  );

  res.json({
    success: true,
    data: quotes,
  });
});

// @desc    Search quotes
// @route   GET /api/quotes/search
// @access  Public
const searchQuotes = asyncHandler(async (req, res) => {
  const { q, language = 'en', limit = 20 } = req.query;

  if (!q) {
    return res.status(400).json({
      success: false,
      message: 'Search query is required',
    });
  }

  const quotes = await quoteService.searchQuotes(q, language, parseInt(limit));

  res.json({
    success: true,
    data: quotes,
  });
});

module.exports = {
  getAllQuotes,
  getRandomQuote,
  getFavoriteQuotes,
  toggleFavorite,
  createQuote,
  deleteQuote,
  getQuotesByCategory,
  searchQuotes,
  initializePersonalizedQuotes,
};
