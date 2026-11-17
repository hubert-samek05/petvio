const { query } = require('../../src/config/database');
(async () => {
  await query(`ALTER TABLE stories ADD COLUMN IF NOT EXISTS media_type VARCHAR(10)`);
  await query(`ALTER TABLE stories ADD COLUMN IF NOT EXISTS meta JSONB`);
  console.log('OK: story editor');
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
