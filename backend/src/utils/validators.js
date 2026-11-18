const { body, param, query, validationResult } = require('express-validator');

// Validation middleware to check for errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      errors: errors.array() 
    });
  }
  next();
};

// User registration validation
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters'),
  validate,
];

// Login validation
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  validate,
];

// Update motivation validation
const motivationValidation = [
  body('motivation')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Motivation must be between 10 and 500 characters'),
  validate,
];

// Profile update validation (the Settings screen's notifications switch)
const profileValidation = [
  body('name').optional().trim().isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('language').optional().isIn(['en', 'es'])
    .withMessage('Language must be en or es'),
  body('notificationEnabled').optional().isBoolean({ strict: true })
    .withMessage('notificationEnabled must be true or false'),
  validate,
];

// Push token validation
const pushTokenValidation = [
  body('expoPushToken')
    .notEmpty()
    .withMessage('Expo push token is required'),
  validate,
];

// Quote validation
const quoteValidation = [
  body('text')
    .if((value, { req }) => !req.body.is_ai_generated)
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Quote must be between 10 and 500 characters'),
  body('author')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Author name must not exceed 255 characters'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category must not exceed 100 characters'),
  validate,
];

// Pagination validation
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  validate,
];

// Search query validation
const searchValidation = [
  query('q')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .escape()
    .withMessage('Search query must be 1-100 characters'),
  validate,
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  motivationValidation,
  profileValidation,
  pushTokenValidation,
  quoteValidation,
  paginationValidation,
  searchValidation,
};
