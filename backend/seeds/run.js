const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');

async function runSeeds() {
  try {
    console.log('🌱 Seeding database with default quotes...');
    
    const seedFile = path.join(__dirname, 'default_quotes.sql');
    const sql = fs.readFileSync(seedFile, 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

runSeeds();
