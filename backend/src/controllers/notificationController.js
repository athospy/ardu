const notificationService = require('../services/notificationService');
const quoteService = require('../services/quoteService');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// @desc    Get notification history
// @route   GET /api/notifications/history
// @access  Private
const getHistory = asyncHandler(async (req, res) => {
  const { limit = 50 } = req.query;

  const history = await notificationService.getNotificationHistory(
    req.user.id,
    parseInt(limit)
  );

  res.json({
    success: true,
    data: history,
  });
});

// @desc    Send test notification
// @route   POST /api/notifications/test
// @access  Private
const sendTestNotification = asyncHandler(async (req, res) => {
  // Get a random quote
  const quote = await quoteService.getRandomQuote(req.user.id, req.user.language);

  if (!quote) {
    return res.status(404).json({
      success: false,
      message: 'No quotes available',
    });
  }

  // Send notification
  const result = await notificationService.sendNotificationToUser(req.user.id, quote.id);

  logger.info(`Test notification sent to user ${req.user.email}`);

  res.json({
    success: true,
    message: 'Test notification sent successfully',
    data: {
      quote: {
        id: quote.id,
        text: quote.text,
        author: quote.author,
      },
      notificationId: result.notificationId,
    },
  });
});

// @desc    Get notification statistics
// @route   GET /api/notifications/stats
// @access  Private
const getStats = asyncHandler(async (req, res) => {
  const stats = await notificationService.getStats(req.user.id);

  res.json({
    success: true,
    data: stats,
  });
});

// @desc    Trigger manual notification send (admin)
// @route   POST /api/notifications/send-batch
// @access  Public (for testing/cron jobs)
const triggerBatchNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.sendBatchNotifications();

  const triggeredBy = req.user ? req.user.email : 'system/cron';
  logger.info(`Manual batch notification triggered by ${triggeredBy}`);

  res.json({
    success: true,
    message: 'Batch notifications sent',
    data: result,
  });
});

module.exports = {
  getHistory,
  sendTestNotification,
  getStats,
  triggerBatchNotifications,
};
