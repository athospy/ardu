const db = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// @desc    Create a new reflection
// @route   POST /api/reflections
// @access  Private
const createReflection = asyncHandler(async (req, res) => {
  const { quoteId, quoteText, author, reflection } = req.body;

  // Validate required fields
  if (!quoteText || !reflection) {
    return res.status(400).json({
      success: false,
      message: 'Quote text and reflection are required',
    });
  }

  // Generate ID (timestamp-based like frontend)
  const id = Date.now().toString();

  const result = await db.query(
    `INSERT INTO reflections (id, user_id, quote_id, quote_text, author, reflection)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [id, req.user.id, quoteId || null, quoteText, author || null, reflection]
  );

  // Increment user's total reflection count
  await db.query(
    `UPDATE users 
     SET total_reflections = total_reflections + 1,
         updated_at = NOW()
     WHERE id = $1`,
    [req.user.id]
  );

  logger.info(`Reflection created: ${id} by user ${req.user.email}`);

  res.status(201).json({
    success: true,
    data: result.rows[0],
  });
});

// @desc    Get all user reflections
// @route   GET /api/reflections
// @access  Private
const getReflections = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  // Get reflections with pagination
  const reflections = await db.query(
    `SELECT id, user_id, quote_id, quote_text, author, reflection, 
            created_at, updated_at
     FROM reflections
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [req.user.id, limit, offset]
  );

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM reflections WHERE user_id = $1`,
    [req.user.id]
  );

  res.json({
    success: true,
    data: {
      reflections: reflections.rows,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset,
    },
  });
});

// @desc    Get reflection count for user
// @route   GET /api/reflections/count
// @access  Private
const getReflectionCount = asyncHandler(async (req, res) => {
  const result = await db.query(
    `SELECT total_reflections FROM users WHERE id = $1`,
    [req.user.id]
  );

  res.json({
    success: true,
    count: result.rows[0]?.total_reflections || 0,
  });
});

// @desc    Delete a reflection
// @route   DELETE /api/reflections/:id
// @access  Private
const deleteReflection = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if reflection exists and belongs to user
  const checkResult = await db.query(
    `SELECT id FROM reflections WHERE id = $1 AND user_id = $2`,
    [id, req.user.id]
  );

  if (checkResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Reflection not found',
    });
  }

  // Delete the reflection
  await db.query(
    `DELETE FROM reflections WHERE id = $1 AND user_id = $2`,
    [id, req.user.id]
  );

  // Decrement user's total reflection count
  await db.query(
    `UPDATE users 
     SET total_reflections = GREATEST(0, total_reflections - 1),
         updated_at = NOW()
     WHERE id = $1`,
    [req.user.id]
  );

  logger.info(`Reflection deleted: ${id} by user ${req.user.email}`);

  res.json({
    success: true,
    message: 'Reflection deleted successfully',
  });
});

module.exports = {
  createReflection,
  getReflections,
  getReflectionCount,
  deleteReflection,
};
