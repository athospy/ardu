const cron = require('node-cron');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

// Start the notification scheduler
function startNotificationScheduler() {
  const cronExpression = process.env.NOTIFICATION_CRON || '0 9,12,15,18,21 * * *';

  logger.info(`Starting notification scheduler with cron: ${cronExpression}`);

  // Schedule notification job
  cron.schedule(cronExpression, async () => {
    logger.info('Running scheduled notification job...');

    try {
      const result = await notificationService.sendBatchNotifications();
      logger.info(`Scheduled notifications completed: ${result.sent} sent, ${result.failed} failed`);
    } catch (error) {
      logger.error('Error in scheduled notification job:', error);
    }
  });

  logger.info('✅ Notification scheduler started successfully');
}

module.exports = startNotificationScheduler;
