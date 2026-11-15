const cron = require('node-cron');
const { generatePendingAIQuotes } = require('../../scripts/generateAIQuotes');
const logger = require('../utils/logger');

/**
 * Start the AI quote generation scheduler
 * Runs every 2 minutes by default (adaptive scheduling)
 * Exits fast if no pending quotes, picks up work sooner when available
 */
function startAIQuoteScheduler() {
  // Run every 2 minutes (*/2 * * * *)
  const cronExpression = process.env.AI_QUOTE_CRON || '*/2 * * * *';

  logger.info(`Starting AI quote generation scheduler with cron: ${cronExpression}`);

  // Schedule AI quote generation job
  cron.schedule(cronExpression, async () => {
    logger.info('🤖 Running scheduled AI quote generation job...');

    try {
      const result = await generatePendingAIQuotes();
      logger.info(`✅ AI quote generation completed: ${result.generated} generated, ${result.failed} failed`);
    } catch (error) {
      logger.error('❌ Error in scheduled AI quote generation job:', error);
    }
  }, {
    timezone: process.env.TZ || 'America/New_York'
  });

  logger.info('✅ AI quote generation scheduler started successfully (adaptive scheduling)');
}

module.exports = startAIQuoteScheduler;
