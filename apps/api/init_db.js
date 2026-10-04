const { pool } = require('./src/config/database');
const bcrypt = require('bcrypt');

async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET search_path TO public');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        avatar_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS pets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        species VARCHAR(50) NOT NULL,
        breed VARCHAR(100),
        birth_date DATE,
        gender VARCHAR(20),
        weight DECIMAL(6,2),
        photo_url TEXT,
        microchip_number VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const hashedPassword = await bcrypt.hash('Test123!', 10);
    await client.query(
      'INSERT INTO users (email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO UPDATE SET password_hash = $2',
      ['test@petvio.pl', hashedPassword, 'Test', 'Użytkownik']
    );

    await client.query('COMMIT');
    console.log('\n✅ Baza danych zainicjalizowana!\n\nKonto testowe:\nEmail: test@petvio.pl\nHasło: Test123!\n\nZaloguj się: https://petvio.pl/login\n');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Błąd:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

initDatabase();
