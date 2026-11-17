const { query } = require('../../src/config/database');
const fs = require('fs');
const path = require('path');

async function migrate() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, '032_cancel_flag.sql'), 'utf8');
    await query(sql);
    console.log('✓ Migration cancel_flag completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('✗ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
