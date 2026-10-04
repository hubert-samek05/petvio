const { query } = require('../../src/config/database');

async function migrate() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS feeding_logs (
        id SERIAL PRIMARY KEY,
        pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        log_date DATE NOT NULL,
        meal_time TIME,
        meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('plan', 'log')),
        food_name VARCHAR(255) NOT NULL,
        food_type VARCHAR(50),
        amount DECIMAL(6,2),
        unit VARCHAR(20),
        calories DECIMAL(6,2),
        completed BOOLEAN DEFAULT FALSE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`CREATE INDEX IF NOT EXISTS idx_feeding_logs_pet_id ON feeding_logs(pet_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_feeding_logs_user_id ON feeding_logs(user_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_feeding_logs_log_date ON feeding_logs(log_date);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_feeding_logs_meal_type ON feeding_logs(meal_type);`);

    console.log('✓ Migration feeding_logs completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
