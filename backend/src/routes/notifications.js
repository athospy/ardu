const express = require('express');
const router = express.Router();
const {
  getHistory,
  sendTestNotification,
  getStats,
  triggerBatchNotifications,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

// Bulk send endpoint (for testing/cron jobs - no auth required)
router.post('/send-batch', triggerBatchNotifications);

// Protected routes (require authentication)
router.use(protect);

router.get('/history', getHistory);
router.post('/test', sendTestNotification);
router.get('/stats', getStats);

module.exports = router;
