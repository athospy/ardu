const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const {
  createReflection,
  getReflections,
  getReflectionCount,
  deleteReflection,
} = require('../controllers/reflectionController');

// Validation middleware
const validate = (req, res, next) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      errors: errors.array() 
    });
  }
  next();
};

// Reflection validation
const reflectionValidation = [
  body('quoteText')
    .trim()
    .notEmpty()
    .withMessage('Quote text is required')
    .isLength({ max: 1000 })
    .withMessage('Quote text must not exceed 1000 characters'),
  body('reflection')
    .trim()
    .notEmpty()
    .withMessage('Reflection is required')
    .isLength({ min: 1, max: 5000 })
    .withMessage('Reflection must be between 1 and 5000 characters'),
  body('quoteId')
    .optional()
    .trim(),
  body('author')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Author name must not exceed 255 characters'),
  validate,
];

// All routes require authentication
router.use(protect);

// Reflection routes
router.post('/', reflectionValidation, createReflection);
router.get('/', getReflections);
router.get('/count', getReflectionCount);
router.delete('/:id', deleteReflection);

module.exports = router;
