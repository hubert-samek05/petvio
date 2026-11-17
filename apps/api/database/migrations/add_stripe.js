const { query } = require('../../src/config/database');
const fs = require('fs');
const path = require('path');

async function migrate() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, '030_stripe.sql'), 'utf8');
    await query(sql);
    console.log('✓ Migration stripe completed successfully');
    process.exit(0);
  } catch (e) {
    console.error('Migration failed:', e);
    process.exit(1);
  }
}

migrate();
