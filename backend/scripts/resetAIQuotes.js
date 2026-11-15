#!/usr/bin/env node

/**
 * Reset All AI Quotes for Regeneration
 * 
 * This script resets all AI quotes (completed or failed) back to pending status
 * Usage: node scripts/resetAIQuotes.js
 */

const db = require('../src/config/database');
const logger = require('../src/utils/logger');

async function resetAIQuotes() {
  console.log('🔄 Resetting all AI quotes to pending...\n');
  
  try {
    // Get all AI quotes (completed or failed)
    const quotesResult = await db.query(
      `SELECT q.id, uq.user_id, q.ai_generation_status, q.text
       FROM quotes q
       JOIN user_quotes uq ON uq.quote_id = q.id
       WHERE uq.is_ai_generated = true
       AND q.ai_generation_status IS NOT NULL
       ORDER BY q.created_at DESC`
    );

    const quotes = quotesResult.rows;

    if (quotes.length === 0) {
      console.log('✨ No AI quotes found!');
      return { reset: 0 };
    }

    console.log(`📊 Found ${quotes.length} AI quote(s):\n`);

    // Display quotes
    quotes.forEach((quote, index) => {
      console.log(`${index + 1}. Quote ID: ${quote.id}`);
      console.log(`   User ID: ${quote.user_id}`);
      console.log(`   Status: ${quote.ai_generation_status}`);
      console.log(`   Text: ${quote.text ? quote.text.substring(0, 60) + '...' : 'NULL (pending)'}`);
      console.log('');
    });

    // Reset all AI quotes to pending with today's date
    const resetResult = await db.query(
      `UPDATE quotes
       SET ai_generation_status = 'pending',
           ai_generate_on = CURRENT_DATE,
           ai_error_message = NULL,
           text = NULL
       WHERE id IN (
         SELECT q.id FROM quotes q
         JOIN user_quotes uq ON uq.quote_id = q.id
         WHERE uq.is_ai_generated = true
         AND q.ai_generation_status IS NOT NULL
       )
       RETURNING id`
    );

    const resetCount = resetResult.rows.length;

    console.log(`✅ Reset ${resetCount} quote(s) to pending status`);
    console.log(`📅 Generation date set to: ${new Date().toLocaleDateString()}`);
    console.log('\n💡 Run the generation script to regenerate:');
    console.log('   node scripts/generateAIQuotes.js\n');

    return { reset: resetCount };

  } catch (error) {
    console.error('❌ Error resetting quotes:', error);
    throw error;
  } finally {
    // Close database connection
    await db.pool.end();
  }
}

// Run the script
if (require.main === module) {
  resetAIQuotes()
    .then((result) => {
      console.log('✅ Reset script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Reset script failed:', error);
      process.exit(1);
    });
}

module.exports = resetAIQuotes;
