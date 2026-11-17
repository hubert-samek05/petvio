const { query } = require('../../src/config/database');

async function migrate() {
  try {
    await query(`ALTER TABLE adoption_posts ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;`);
    await query(`ALTER TABLE adoption_posts ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;`);
    await query(`CREATE INDEX IF NOT EXISTS idx_adoption_posts_geo ON adoption_posts(lat, lng) WHERE lat IS NOT NULL;`);
    console.log('✓ Migration adoption_geo completed successfully');
    process.exit(0);
  } catch (e) {
    console.error('Migration failed:', e);
    process.exit(1);
  }
}

migrate();
