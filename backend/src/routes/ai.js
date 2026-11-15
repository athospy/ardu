const express = require('express');
const router = express.Router();
const {
  getRecommendedQuote,
  generateBatchQuotes,
  getUserAIQuotes,
  getRandomAIQuote,
  regenerateQuote,
  checkAIStatus,
} = require('../controllers/aiController');
const { protect } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');

// Public routes
router.get('/status', checkAIStatus);

// Protected routes with rate limiting
router.get('/recommended-quote', protect, aiLimiter, getRecommendedQuote);
router.post('/generate-batch', protect, aiLimiter, generateBatchQuotes);
router.get('/quotes', protect, getUserAIQuotes);
router.get('/random', protect, getRandomAIQuote);
router.post('/regenerate', protect, aiLimiter, regenerateQuote);

module.exports = router;
