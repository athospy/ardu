const express = require('express');
const router = express.Router();
const {
  getAllQuotes,
  getRandomQuote,
  getFavoriteQuotes,
  toggleFavorite,
  createQuote,
  deleteQuote,
  getQuotesByCategory,
  searchQuotes,
  initializePersonalizedQuotes,
} = require('../controllers/quoteController');
const { protect, optionalAuth } = require('../middleware/auth');
const {
  quoteValidation,
  paginationValidation,
  searchValidation,
} = require('../utils/validators');
const { quoteLimiter } = require('../middleware/rateLimiter');

// Public routes (some with optional auth)
// SECURITY: Disabled unused endpoints (not called by mobile app)
// router.get('/', paginationValidation, getAllQuotes);
router.get('/random', optionalAuth, getRandomQuote);
router.get('/search', quoteLimiter, searchValidation, searchQuotes);
// router.get('/category/:category', getQuotesByCategory);

// Protected routes
router.get('/favorites', protect, paginationValidation, getFavoriteQuotes);
router.post('/initialize', protect, initializePersonalizedQuotes);
router.post('/:id/favorite', protect, toggleFavorite);
router.post('/', protect, quoteValidation, createQuote);
router.delete('/:id', protect, deleteQuote);

module.exports = router;
