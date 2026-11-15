const db = require('../src/config/database');
const { generateQuoteMultiStep } = require('../src/config/ollama');
const { sendPushNotification } = require('../src/config/expo');
const logger = require('../src/utils/logger');

// Configuration - reduced batch size for VPS stability
const BATCH_SIZE = parseInt(process.env.AI_BATCH_SIZE) || 2; // Reduced from 3 to 2 for VPS stability
const MAX_PROMPT_LENGTH = parseInt(process.env.AI_MAX_PROMPT_LENGTH) || 8000;

/**
 * Generate pending AI quotes in batches
 * Self-throttling: max 5 quotes per run (adaptive scheduling)
 */
async function generatePendingAIQuotes() {
  logger.info('🤖 Starting AI quote generation job...');
  
  try {
    // Get pending AI quotes with hard cap (self-throttling)
    const pendingQuotes = await db.query(
      `SELECT q.id, q.category, q.author, u.id as user_id, u.motivation, u.language, u.expo_push_token
       FROM quotes q
       JOIN user_quotes uq ON uq.quote_id = q.id
       JOIN users u ON u.id = uq.user_id
       WHERE q.ai_generation_status = 'pending'
       AND uq.is_ai_generated = true
       ORDER BY q.created_at ASC
       LIMIT 5`
    );

    const quotes = pendingQuotes.rows;
    logger.info(`📊 Found ${quotes.length} pending AI quotes to generate`);

    if (quotes.length === 0) {
      logger.info('✨ No pending AI quotes to generate');
      return { generated: 0, failed: 0 };
    }

    // Split into batches
    const batches = createBatches(quotes);
    logger.info(`📦 Split into ${batches.length} batch(es) for processing`);

    let totalGenerated = 0;
    let totalFailed = 0;
    const usersNotified = new Set();

    // Process each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      logger.info(`🔄 Processing batch ${i + 1}/${batches.length} with ${batch.length} quotes...`);

      try {
        // Mark all as processing (BATCH UPDATE)
        await db.query(
          `UPDATE quotes 
           SET ai_generation_status = 'processing' 
           WHERE id = ANY($1)`,
          [batch.map(q => q.id)]
        );

        // Prepare batch data with existing quotes for context
        const batchData = await Promise.all(batch.map(async (q) => {
          // Get user's existing quotes to avoid duplicates
          const existingQuotes = await getUserRecentQuotes(q.user_id);
          
          return {
            id: q.id,
            motivation: q.motivation || 'personal growth and success',
            language: q.language || 'en',
            existingQuotes: existingQuotes, // Pass existing quotes for context
          };
        }));

        // Get recent quotes for similarity checking
        const recentQuotes = await getRecentGlobalQuotes();
        logger.info(`📋 Checking against ${recentQuotes.length} recent quotes for similarity`);
        
        // Generate quotes one at a time with multi-step approach
        const generatedQuotes = [];
        
        for (const item of batchData) {
          try {
            logger.info(`🔄 Generating quote for id ${item.id}...`);
            const quote = await generateQuoteMultiStep(item.motivation, item.language, recentQuotes);
            generatedQuotes.push({ ...quote, id: item.id });
            logger.info(`✅ Generated quote for motivation: "${item.motivation.substring(0, 30)}..."`);
            logger.info(`   Text: "${quote.text}"`);
          } catch (error) {
            logger.error(`❌ Failed to generate quote for id ${item.id}:`);
            logger.error(`   Error: ${error.message}`);
            logger.error(`   Stack: ${error.stack}`);
            generatedQuotes.push({ id: item.id, error: error.message });
          }
        }

        // Process each generated quote individually (partial success support)
        for (const quote of batch) {
          const generated = generatedQuotes.find(g => g.id === quote.id);
          
          if (!generated) {
            logger.warn(`⚠️  Missing AI output for quote #${quote.id}`);
            await markQuoteFailed(quote.id, 'Missing AI output');
            totalFailed++;
            continue;
          }

          // Check if AI returned an error for this quote
          if (generated.error) {
            logger.error(`❌ AI error for quote #${quote.id}: ${generated.error}`);
            await markQuoteFailed(quote.id, generated.error);
            totalFailed++;
            continue;
          }

          try {
            await db.query(
              `UPDATE quotes
               SET text = $1,
                   ai_generation_status = 'completed',
                   ai_generated_at = NOW()
               WHERE id = $2`,
              [generated.text, generated.id]
            );

            logger.info(`✅ Generated quote #${generated.id}: "${generated.text.substring(0, 50)}..."`);
            totalGenerated++;

            // Track user for notification
            if (quote.expo_push_token) {
              usersNotified.add(JSON.stringify({
                userId: quote.user_id,
                token: quote.expo_push_token,
                quoteText: generated.text,
                quoteId: generated.id, // Critical for favorites to work
              }));
            }
          } catch (error) {
            logger.error(`❌ Failed to save quote #${generated.id}:`, error.message);
            await markQuoteFailed(generated.id, error.message);
            totalFailed++;
          }
        }

      } catch (error) {
        logger.error(`❌ Unexpected batch error ${i + 1}:`, error.message);
        
        // Mark all quotes in batch as failed
        await db.query(
          `UPDATE quotes
           SET ai_generation_status = 'failed',
               ai_error_message = $1
           WHERE id = ANY($2)`,
          [error.message, batch.map(q => q.id)]
        );
        totalFailed += batch.length;
      }
    }

    // Send push notifications to users
    if (usersNotified.size > 0) {
      logger.info(`📲 Sending push notifications to ${usersNotified.size} user(s)...`);
      await sendNotifications(Array.from(usersNotified).map(u => JSON.parse(u)));
    }

    logger.info(`🎉 Generation completed! Generated: ${totalGenerated}, Failed: ${totalFailed}`);
    
    // AI job summary for production monitoring
    logger.info('🧠 AI Job Summary', {
      model: process.env.OLLAMA_MODEL || 'unknown',
      batch_size: BATCH_SIZE,
      generated: totalGenerated,
      failed: totalFailed,
      debug_mode: process.env.DEBUG_AI === 'true',
      total_quotes_processed: quotes.length,
    });
    
    return { generated: totalGenerated, failed: totalFailed };
    
  } catch (error) {
    logger.error('❌ AI generation job failed:', error);
    throw error;
  }
}

/**
 * Split quotes into batches considering size and prompt length limits
 */
function createBatches(quotes) {
  const batches = [];
  let currentBatch = [];
  let currentLength = 0;

  for (const quote of quotes) {
    const estimatedLength = (quote.motivation || '').length + 100; // Rough estimate per quote
    
    // Start new batch if: hitting size limit OR exceeding prompt length
    if (currentBatch.length >= BATCH_SIZE || 
        (currentLength + estimatedLength > MAX_PROMPT_LENGTH && currentBatch.length > 0)) {
      batches.push(currentBatch);
      currentBatch = [];
      currentLength = 0;
    }
    
    currentBatch.push(quote);
    currentLength += estimatedLength;
  }

  // Add final batch
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

/**
 * Mark quote as failed with error message
 */
async function markQuoteFailed(quoteId, errorMessage) {
  await db.query(
    `UPDATE quotes
     SET ai_generation_status = 'failed',
         ai_error_message = $1
     WHERE id = $2`,
    [errorMessage, quoteId]
  );
}

/**
 * Sanitize text for push notifications
 * Ensures no malformed JSON or special characters break push delivery
 */
function sanitizeForPush(text) {
  return text
    .replace(/[{}[\]"]/g, '') // Remove JSON-like characters
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim()
    .slice(0, 200); // Max length for push
}

/**
 * Send push notifications to users about new AI quotes
 */
async function sendNotifications(users) {
  const uniqueUsers = users.reduce((acc, user) => {
    if (!acc.find(u => u.userId === user.userId)) {
      acc.push(user);
    }
    return acc;
  }, []);

  for (const user of uniqueUsers) {
    try {
      await sendPushNotification(
        user.token,
        '✨ Your AI Quote is Ready!',
        sanitizeForPush(user.quoteText), // Always sanitize for push safety
        { 
          type: 'ai_quote_generated',
          id: user.quoteId, // Critical for favorites to work
        }
      );
      logger.info(`📤 Sent notification to user ${user.userId}`);
    } catch (error) {
      logger.error(`Failed to send notification to user ${user.userId}:`, error.message);
    }
  }
}

/**
 * Get user's recent quotes for context (currently unused but kept for future)
 */
async function getUserRecentQuotes(userId) {
  const result = await db.query(
    `SELECT q.text
     FROM user_quotes uq
     JOIN quotes q ON q.id = uq.quote_id
     WHERE uq.user_id = $1 
     AND q.text IS NOT NULL
     ORDER BY uq.created_at DESC
     LIMIT 5`,
    [userId]
  );
  
  return result.rows.map(row => row.text);
}

/**
 * Get recent global quotes for similarity checking
 * Returns last 200 quote texts from the database
 */
async function getRecentGlobalQuotes() {
  const result = await db.query(
    `SELECT text
     FROM quotes
     WHERE text IS NOT NULL
     AND ai_generation_status = 'completed'
     ORDER BY created_at DESC
     LIMIT 200`
  );
  
  return result.rows.map(row => row.text);
}

/**
 * Retry failed AI quote generations
 */
async function retryFailedQuotes() {
  logger.info('🔄 Retrying failed AI quote generations...');
  
  const failedQuotes = await db.query(
    `SELECT q.id, uq.user_id, q.ai_error_message
     FROM quotes q
     JOIN user_quotes uq ON uq.quote_id = q.id
     WHERE uq.is_ai_generated = true
     AND q.ai_generation_status = 'failed'
     LIMIT 10`
  );

  logger.info(`Found ${failedQuotes.rows.length} failed quotes to retry`);

  for (const quote of failedQuotes.rows) {
    try {
      // Reset to pending for today
      await db.query(
        `UPDATE quotes 
         SET ai_generation_status = 'pending',
             ai_generate_on = CURRENT_DATE,
             ai_error_message = NULL
         WHERE id = $1`,
        [quote.id]
      );
      
      logger.info(`Queued quote #${quote.id} for retry`);
    } catch (error) {
      logger.error(`Failed to retry quote #${quote.id}:`, error);
    }
  }

  return failedQuotes.rows.length;
}

// Run the job if executed directly
if (require.main === module) {
  generatePendingAIQuotes()
    .then((result) => {
      console.log('✅ Job completed successfully');
      console.log(`Generated: ${result.generated}, Failed: ${result.failed}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Job failed:', error);
      process.exit(1);
    });
}

module.exports = { 
  generatePendingAIQuotes,
  retryFailedQuotes,
};
