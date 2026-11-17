const { query } = require('../config/database');

const CACHE_TTL_MS = 30 * 1000;
let cache = { ts: 0, data: {} };

const readAll = async () => {
  if (Date.now() - cache.ts < CACHE_TTL_MS) return cache.data;
  try {
    const result = await query('SELECT key, value FROM app_settings');
    const data = {};
    for (const row of result.rows) data[row.key] = row.value;
    cache = { ts: Date.now(), data };
  } catch (error) {
    // Brak tabeli / problem z DB -> dzialaj na domyslnych wartosciach
    cache = { ts: Date.now(), data: cache.data || {} };
  }
  return cache.data;
};

const getSetting = async (key, fallback = null) => {
  const data = await readAll();
  return key in data ? data[key] : fallback;
};

const setSettings = async (entries) => {
  for (const [key, value] of Object.entries(entries)) {
    await query(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [key, JSON.stringify(value)]
    );
  }
  cache.ts = 0; // wymus odczyt na swiezo
};

module.exports = { getSetting, setSettings, readAll };
