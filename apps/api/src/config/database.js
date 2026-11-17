const { Pool, types } = require('pg');
require('dotenv').config();

// DATE (OID 1082) zwracamy jako tekst YYYY-MM-DD — domyślnie pg robi z niego Date w strefie serwera,
// co po serializacji do JSON przesuwa dzień o -1 przy każdym zapisie formularza.
types.setTypeParser(1082, (value) => value);

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'petvio',
  user: process.env.DB_USER || 'petvio_user',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  options: '-c search_path=public',
});

pool.on('connect', () => {
  console.log('✓ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  process.exit(-1);
});

const query = (text, params) => pool.query(text, params);

module.exports = {
  pool,
  query,
};
