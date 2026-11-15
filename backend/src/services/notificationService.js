const { sendPushNotification, sendBatchNotifications } = require('../config/expo');
const db = require('../config/database');
const logger = require('../utils/logger');

class NotificationService {
  // Send a single notification to a user
  async sendNotificationToUser(userId, quoteId) {
    // Get user's push token
    const userResult = await db.query(
      'SELECT expo_push_token, notification_enabled FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = userResult.rows[0];

    if (!user.notification_enabled) {
      throw new Error('Notifications are disabled for this user');
    }

    if (!user.expo_push_token) {
      throw new Error('User has no push token registered');
    }

    // Get quote
    const quoteResult = await db.query(
      'SELECT text, author FROM quotes WHERE id = $1',
      [quoteId]
    );

    if (quoteResult.rows.length === 0) {
      throw new Error('Quote not found');
    }

    const quote = quoteResult.rows[0];

    try {
      // Send notification
      const ticket = await sendPushNotification(
        user.expo_push_token,
        '✨ Your Daily Motivation',
        quote.text,
        { 
          type: 'daily_quote',
          id: quoteId,
        }
      );

      // Log notification
      const notificationResult = await db.query(
        'INSERT INTO notifications (user_id, quote_id, status) VALUES ($1, $2, $3) RETURNING id',
        [userId, quoteId, 'sent']
      );

      const notificationId = notificationResult.rows[0].id;

      logger.info(`Notification sent to user ${userId}`);

      return { success: true, ticket, notificationId, quote };
    } catch (error) {
      // Log failed notification
      await db.query(
        'INSERT INTO notifications (user_id, quote_id, status, error_message) VALUES ($1, $2, $3, $4)',
        [userId, quoteId, 'failed', error.message]
      );

      logger.error(`Failed to send notification to user ${userId}:`, error);
      throw error;
    }
  }

  // Send notifications to all eligible users
  async sendBatchNotifications() {
    // Get all users with notifications enabled and push tokens
    const usersResult = await db.query(
      `SELECT id, expo_push_token, language 
       FROM users 
       WHERE notification_enabled = true 
       AND expo_push_token IS NOT NULL`
    );

    const users = usersResult.rows;
    logger.info(`Sending notifications to ${users.length} users`);

    const messages = [];
    const notificationLogs = [];

    for (const user of users) {
      try {
        // Get a random quote from user's personalized quotes (including AI-generated ones)
        const quoteResult = await db.query(
          `SELECT q.id, q.text, q.author
           FROM quotes q
           JOIN user_quotes uq ON uq.quote_id = q.id
           WHERE uq.user_id = $1
           AND q.text IS NOT NULL
           ORDER BY RANDOM()
           LIMIT 1`,
          [user.id]
        );

        if (quoteResult.rows.length === 0) {
          logger.warn(`No quotes available for user ${user.id}`);
          continue;
        }

        const quote = quoteResult.rows[0];

        messages.push({
          to: user.expo_push_token,
          sound: 'default',
          title: '✨ Your Daily Motivation',
          body: quote.text,
          data: { 
            type: 'daily_quote',
            id: quote.id,
          },
          priority: 'high',
        });

        notificationLogs.push({
          userId: user.id,
          quoteId: quote.id,
        });
      } catch (error) {
        logger.error(`Error preparing notification for user ${user.id}:`, error);
      }
    }

    if (messages.length === 0) {
      logger.info('No notifications to send');
      return { sent: 0, failed: 0 };
    }

    // Send batch
    try {
      const tickets = await sendBatchNotifications(messages);

      // Log notifications
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        const log = notificationLogs[i];

        if (ticket.status === 'ok') {
          await db.query(
            'INSERT INTO notifications (user_id, quote_id, status) VALUES ($1, $2, $3)',
            [log.userId, log.quoteId, 'sent']
          );
          successCount++;
        } else {
          await db.query(
            'INSERT INTO notifications (user_id, quote_id, status, error_message) VALUES ($1, $2, $3, $4)',
            [log.userId, log.quoteId, 'failed', ticket.message || 'Unknown error']
          );
          failCount++;
        }
      }

      logger.info(`Batch notifications sent: ${successCount} succeeded, ${failCount} failed`);

      return { sent: successCount, failed: failCount };
    } catch (error) {
      logger.error('Error sending batch notifications:', error);
      throw error;
    }
  }

  // Get user's notification history
  async getNotificationHistory(userId, limit = 50) {
    const result = await db.query(
      `SELECT n.id, n.status, n.sent_at, n.error_message,
              q.text as quote_text, q.author as quote_author
       FROM notifications n
       LEFT JOIN quotes q ON n.quote_id = q.id
       WHERE n.user_id = $1
       ORDER BY n.sent_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  }

  // Get notification statistics
  async getStats(userId = null) {
    let query;
    let params;

    if (userId) {
      query = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
        FROM notifications
        WHERE user_id = $1
      `;
      params = [userId];
    } else {
      query = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
          COUNT(DISTINCT user_id) as unique_users
        FROM notifications
      `;
      params = [];
    }

    const result = await db.query(query, params);
    return result.rows[0];
  }
}

module.exports = new NotificationService();
