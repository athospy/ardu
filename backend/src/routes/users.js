const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  updateMotivation,
  updatePushToken,
  updatePreferences,
  deleteAccount,
  getStreak,
  streakCheckin,
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const {
  motivationValidation,
  profileValidation,
  pushTokenValidation,
} = require('../utils/validators');

// All routes are protected
router.use(protect);

router.get('/profile', getProfile);
// The app's Settings screen calls this for the notifications switch.
router.put('/profile', profileValidation, updateProfile);
router.put('/motivation', motivationValidation, updateMotivation);
router.put('/push-token', pushTokenValidation, updatePushToken);
// SECURITY: Disabled unused endpoints (not called by mobile app)
// router.put('/preferences', updatePreferences);
// router.delete('/profile', deleteAccount);

// Streak endpoints
router.get('/streak', getStreak);
router.post('/streak/checkin', streakCheckin);

module.exports = router;
