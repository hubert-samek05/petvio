const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const pool = new Pool({host: 'localhost', port: 5432, database: 'petvio', user: 'petvio_user', password: 'petvio_secure_password_2026'});
async function createUser() {
  try {
    const hashedPassword = await bcrypt.hash('Test123!', 10);
    const result = await pool.query('INSERT INTO users (email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO UPDATE SET password_hash = $2 RETURNING id, email', ['test@petvio.pl', hashedPassword, 'Test', 'Użytkownik']);
    console.log('\n✅ GOTOWE!\n\nEmail: test@petvio.pl\nHasło: Test123!\n\nZaloguj się: https://petvio.pl/login\n');
  } catch (error) {
    console.error('Błąd:', error.message);
  } finally {
    await pool.end();
  }
}
createUser();
