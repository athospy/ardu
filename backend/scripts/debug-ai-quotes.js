#!/usr/bin/env node
// Debug AI quote generation - check why quotes aren't being picked up
const db = require('../src/config/database');

async function debugAIQuotes() {
  try {
    console.log('🔍 Debugging AI quote generation...\n');
    
    // 1. Check all pending AI quotes
    console.log('1️⃣ All pending AI quotes:');
    const allPending = await db.query(`
      SELECT id, category, author, ai_generation_status, ai_generate_on, 
             CURRENT_DATE as today,
             (ai_generate_on <= CURRENT_DATE) as should_generate_today
      FROM quotes 
      WHERE ai_generation_status = 'pending'
    `);
    console.table(allPending.rows);
    
    // 2. Check user_quotes entries for these quotes
    console.log('\n2️⃣ User_quotes entries for pending AI quotes:');
    const userQuotes = await db.query(`
      SELECT q.id as quote_id, uq.user_id, uq.is_ai_generated, uq.is_favorite
      FROM quotes q
      LEFT JOIN user_quotes uq ON uq.quote_id = q.id
      WHERE q.ai_generation_status = 'pending'
    `);
    console.table(userQuotes.rows);
    
    // 3. Run the exact query from the script
    console.log('\n3️⃣ Results from actual generation query:');
    const scriptQuery = await db.query(`
      SELECT q.id, q.category, q.author, q.ai_generation_status, q.ai_generate_on,
             u.id as user_id, u.motivation, u.language, 
             uq.is_ai_generated
      FROM quotes q
      JOIN user_quotes uq ON uq.quote_id = q.id
      JOIN users u ON u.id = uq.user_id
      WHERE q.ai_generation_status = 'pending'
      AND q.ai_generate_on <= CURRENT_DATE
      AND uq.is_ai_generated = true
      ORDER BY q.created_at ASC
    `);
    console.log(`Found ${scriptQuery.rows.length} quotes matching generation criteria:`);
    console.table(scriptQuery.rows);
    
    // 4. Check if issue is with date comparison
    console.log('\n4️⃣ Date comparison check:');
    const dateCheck = await db.query(`
      SELECT 
        ai_generate_on,
        CURRENT_DATE as today,
        ai_generate_on <= CURRENT_DATE as is_ready,
        ai_generate_on::text as date_string
      FROM quotes 
      WHERE ai_generation_status = 'pending'
    `);
    console.table(dateCheck.rows);
    
    // 5. Check users table
    console.log('\n5️⃣ Users with pending AI quotes:');
    const users = await db.query(`
      SELECT DISTINCT u.id, u.name, u.email, u.motivation, u.language
      FROM users u
      JOIN user_quotes uq ON uq.user_id = u.id
      JOIN quotes q ON q.id = uq.quote_id
      WHERE q.ai_generation_status = 'pending'
      AND uq.is_ai_generated = true
    `);
    console.table(users.rows);
    
    console.log('\n✅ Debug complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  }
}

debugAIQuotes();
