#!/usr/bin/env node
// Manually mark migrations as executed in the database
const { pool } = require('../src/config/database');

async function markMigrationsExecuted() {
  try {
    console.log('🔧 Marking existing migrations as executed...');
    
    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✅ Migrations table ready');
    
    // Mark first migration as executed (it was already run)
    await pool.query(`
      INSERT INTO migrations (name) 
      VALUES ('001_initial_schema.sql')
      ON CONFLICT (name) DO NOTHING;
    `);
    
    console.log('✅ Marked 001_initial_schema.sql as executed');
    
    // Check what migrations are recorded
    const result = await pool.query('SELECT name, executed_at FROM migrations ORDER BY id');
    console.log('\n📋 Executed migrations:');
    result.rows.forEach(row => {
      console.log(`   - ${row.name} (${row.executed_at.toISOString()})`);
    });
    
    console.log('\n✅ Done! You can now run: node migrations/run.js');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

markMigrationsExecuted();
