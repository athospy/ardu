#!/usr/bin/env node
// Seed the database with default quotes
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');

async function seedDatabase() {
  try {
    console.log('🌱 Seeding database with default quotes...');
    
    // Check if quotes already exist
    const result = await pool.query('SELECT COUNT(*) FROM quotes WHERE is_default = true');
    const count = parseInt(result.rows[0].count);
    
    if (count > 0) {
      console.log(`⏭️  Database already has ${count} default quotes - skipping seed`);
      console.log('💡 To re-seed, first delete existing quotes:');
      console.log('   DELETE FROM quotes WHERE is_default = true;');
      process.exit(0);
    }
    
    // Read seed file
    const seedFile = path.join(__dirname, '../seeds/default_quotes.sql');
    const sql = fs.readFileSync(seedFile, 'utf8');
    
    // Execute seed
    await pool.query(sql);
    
    // Verify
    const newResult = await pool.query('SELECT COUNT(*) FROM quotes WHERE is_default = true');
    const newCount = parseInt(newResult.rows[0].count);
    
    console.log(`✅ Seeded ${newCount} default quotes successfully!`);
    
    // Show breakdown by language
    const breakdown = await pool.query(`
      SELECT language, COUNT(*) as count 
      FROM quotes 
      WHERE is_default = true 
      GROUP BY language 
      ORDER BY language
    `);
    
    console.log('\n📊 Breakdown by language:');
    breakdown.rows.forEach(row => {
      console.log(`   ${row.language}: ${row.count} quotes`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seedDatabase();
