const { query } = require('../../src/config/database');
(async () => {
  await query(`ALTER TABLE user_posts ADD COLUMN IF NOT EXISTS feeling VARCHAR(60)`);
  await query(`ALTER TABLE user_posts ADD COLUMN IF NOT EXISTS location VARCHAR(120)`);
  await query(`ALTER TABLE user_posts ADD COLUMN IF NOT EXISTS background VARCHAR(40)`);
  console.log('OK: post enhancements');
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
