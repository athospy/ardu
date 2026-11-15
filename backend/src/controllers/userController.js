const db = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const { isValidPushToken } = require('../config/expo');
const logger = require('../utils/logger');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getProfile = asyncHandler(async (req, res) => {
  const result = await db.query(
    `SELECT id, email, name, motivation, preferences, expo_push_token, 
            notification_enabled, language, created_at, updated_at 
     FROM users WHERE id = $1`,
    [req.user.id]
  );

  res.json({
    success: true,
    data: result.rows[0],
  });
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const { name, language, notificationEnabled } = req.body;
  
  const updates = [];
  const values = [];
  let paramCount = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramCount++}`);
    values.push(name);
  }
  
  if (language !== undefined) {
    updates.push(`language = $${paramCount++}`);
    values.push(language);
  }
  
  if (notificationEnabled !== undefined) {
    updates.push(`notification_enabled = $${paramCount++}`);
    values.push(notificationEnabled);
  }

  if (updates.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No fields to update',
    });
  }

  values.push(req.user.id);

  const result = await db.query(
    `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() 
     WHERE id = $${paramCount} 
     RETURNING id, email, name, motivation, language, notification_enabled`,
    values
  );

  logger.info(`User profile updated: ${req.user.email}`);

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: result.rows[0],
  });
});

// @desc    Update user motivation
// @route   PUT /api/users/motivation
// @access  Private
const updateMotivation = asyncHandler(async (req, res) => {
  const { motivation } = req.body;

  const result = await db.query(
    `UPDATE users SET motivation = $1, updated_at = NOW() 
     WHERE id = $2 
     RETURNING id, email, motivation`,
    [motivation, req.user.id]
  );

  logger.info(`User motivation updated: ${req.user.email}`);

  res.json({
    success: true,
    message: 'Motivation updated successfully',
    data: result.rows[0],
  });
});

// @desc    Update Expo push token
// @route   PUT /api/users/push-token
// @access  Private
const updatePushToken = asyncHandler(async (req, res) => {
  const { expoPushToken } = req.body;

  // Validate push token
  if (!isValidPushToken(expoPushToken)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid Expo push token',
    });
  }

  await db.query(
    'UPDATE users SET expo_push_token = $1, updated_at = NOW() WHERE id = $2',
    [expoPushToken, req.user.id]
  );

  logger.info(`Push token updated for user: ${req.user.email}`);

  res.json({
    success: true,
    message: 'Push token updated successfully',
  });
});

// @desc    Update user preferences
// @route   PUT /api/users/preferences
// @access  Private
const updatePreferences = asyncHandler(async (req, res) => {
  const { preferences } = req.body;

  // Merge with existing preferences
  const currentResult = await db.query(
    'SELECT preferences FROM users WHERE id = $1',
    [req.user.id]
  );

  const currentPreferences = currentResult.rows[0].preferences || {};
  const updatedPreferences = { ...currentPreferences, ...preferences };

  await db.query(
    'UPDATE users SET preferences = $1, updated_at = NOW() WHERE id = $2',
    [JSON.stringify(updatedPreferences), req.user.id]
  );

  logger.info(`Preferences updated for user: ${req.user.email}`);

  res.json({
    success: true,
    message: 'Preferences updated successfully',
    data: updatedPreferences,
  });
});

// @desc    Delete user account
// @route   DELETE /api/users/profile
// @access  Private
const deleteAccount = asyncHandler(async (req, res) => {
  await db.query('DELETE FROM users WHERE id = $1', [req.user.id]);

  logger.info(`User account deleted: ${req.user.email}`);

  res.json({
    success: true,
    message: 'Account deleted successfully',
  });
});

// @desc    Get user streak data
// @route   GET /api/users/streak
// @access  Private
const getStreak = asyncHandler(async (req, res) => {
  const result = await db.query(
    `SELECT current_streak, longest_streak, last_active_date, total_reflections
     FROM users 
     WHERE id = $1`,
    [req.user.id]
  );

  const user = result.rows[0];

  res.json({
    success: true,
    data: {
      currentStreak: user.current_streak || 0,
      longestStreak: user.longest_streak || 0,
      lastActiveDate: user.last_active_date ? new Date(user.last_active_date).toDateString() : null,
      totalReflections: user.total_reflections || 0,
    },
  });
});

// @desc    Check in for streak (called on app open)
// @route   POST /api/users/streak/checkin
// @access  Private
const streakCheckin = asyncHandler(async (req, res) => {
  // Get current user streak data
  const userResult = await db.query(
    `SELECT current_streak, longest_streak, last_active_date
     FROM users 
     WHERE id = $1`,
    [req.user.id]
  );

  const user = userResult.rows[0];
  const today = new Date().toDateString();
  const lastActive = user.last_active_date ? new Date(user.last_active_date).toDateString() : null;

  // Already checked in today
  if (lastActive === today) {
    return res.json({
      success: true,
      data: {
        currentStreak: user.current_streak || 0,
        longestStreak: user.longest_streak || 0,
        streakIncreased: false,
      },
    });
  }

  // Calculate new streak
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  let newStreak;
  let streakIncreased = false;

  if (lastActive === yesterdayStr) {
    // Consecutive day - increment streak
    newStreak = (user.current_streak || 0) + 1;
    streakIncreased = true;
  } else if (!lastActive) {
    // First time check-in
    newStreak = 1;
    streakIncreased = true;
  } else {
    // Streak broken - reset to 1
    newStreak = 1;
    streakIncreased = false;
  }

  const newLongestStreak = Math.max(newStreak, user.longest_streak || 0);

  // Update user streak
  await db.query(
    `UPDATE users 
     SET current_streak = $1,
         longest_streak = $2,
         last_active_date = CURRENT_DATE,
         updated_at = NOW()
     WHERE id = $3`,
    [newStreak, newLongestStreak, req.user.id]
  );

  logger.info(`Streak check-in: user ${req.user.email}, streak: ${newStreak}`);

  res.json({
    success: true,
    data: {
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      streakIncreased,
    },
  });
});

module.exports = {
  getProfile,
  updateProfile,
  updateMotivation,
  updatePushToken,
  updatePreferences,
  deleteAccount,
  getStreak,
  streakCheckin,
};

