#!/usr/bin/env node

/**
 * Retry Failed AI Quote Generations
 * 
 * This script resets failed AI quotes to pending status so they can be regenerated.
 * Usage: node scripts/retryFailedAIQuotes.js
 */

const db = require('../src/config/database');
const logger = require('../src/utils/logger');

async function retryFailedAIQuotes() {
  console.log('🔄 Resetting failed AI quotes to pending...\n');
  
  try {
    // Get all failed AI quotes
    const failedResult = await db.query(
      `SELECT q.id, uq.user_id, q.ai_error_message, q.created_at
       FROM quotes q
       JOIN user_quotes uq ON uq.quote_id = q.id
       WHERE uq.is_ai_generated = true
       AND q.ai_generation_status = 'failed'
       ORDER BY q.created_at DESC`
    );

    const failedQuotes = failedResult.rows;

    if (failedQuotes.length === 0) {
      console.log('✨ No failed AI quotes found!');
      return { reset: 0 };
    }

    console.log(`📊 Found ${failedQuotes.length} failed AI quote(s):\n`);

    // Display failed quotes
    failedQuotes.forEach((quote, index) => {
      console.log(`${index + 1}. Quote ID: ${quote.id}`);
      console.log(`   User ID: ${quote.user_id}`);
      console.log(`   Created: ${new Date(quote.created_at).toLocaleString()}`);
      console.log(`   Error: ${quote.ai_error_message || 'Unknown error'}`);
      console.log('');
    });

    // Reset all failed quotes to pending with today's date
    const resetResult = await db.query(
      `UPDATE quotes
       SET ai_generation_status = 'pending',
           ai_generate_on = CURRENT_DATE,
           ai_error_message = NULL
       WHERE ai_generation_status = 'failed'
       AND id IN (
         SELECT quote_id FROM user_quotes WHERE is_ai_generated = true
       )
       RETURNING id`
    );

    const resetCount = resetResult.rows.length;

    console.log(`✅ Reset ${resetCount} quote(s) to pending status`);
    console.log(`📅 Generation date set to: ${new Date().toLocaleDateString()}`);
    console.log('\n💡 Run the generation script to try again:');
    console.log('   node scripts/generateAIQuotes.js\n');

    return { reset: resetCount };

  } catch (error) {
    console.error('❌ Error resetting failed quotes:', error);
    throw error;
  } finally {
    // Close database connection
    await db.pool.end();
  }
}

// Run the script
if (require.main === module) {
  retryFailedAIQuotes()
    .then((result) => {
      console.log('✅ Retry script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Retry script failed:', error);
      process.exit(1);
    });
}

module.exports = retryFailedAIQuotes;
