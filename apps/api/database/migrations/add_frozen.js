const { query } = require('../../src/config/database');
const fs = require('fs');
const path = require('path');

async function migrate() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, '031_frozen.sql'), 'utf8');
    await query(sql);
    console.log('✓ Migration frozen completed successfully');
    process.exit(0);
  } catch (e) {
    console.error('Migration failed:', e);
    process.exit(1);
  }
}

migrate();
