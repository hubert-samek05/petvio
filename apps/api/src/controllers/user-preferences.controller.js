const { query } = require('../config/database');

const sendError = (res, status, message) => res.status(status).json({ error: { message, status } });

const isValidKey = (k) => typeof k === 'string' && /^[a-z0-9_-]{1,50}$/.test(k);

// Generyczne ustawienia per-użytkownik (checklisty, flagi UI itd.)
const getPreference = async (req, res) => {
  try {
    if (!isValidKey(req.params.key)) return sendError(res, 400, 'Nieprawidłowy klucz ustawienia');
    const result = await query(
      'SELECT pref_value FROM user_preferences WHERE user_id = $1 AND pref_key = $2',
      [req.user.userId, req.params.key]
    );
    res.json({ value: result.rows.length ? result.rows[0].pref_value : null });
  } catch (error) {
    console.error('Get user preference error:', error);
    sendError(res, 500, 'Wystąpił błąd podczas pobierania ustawienia');
  }
};

const setPreference = async (req, res) => {
  try {
    if (!isValidKey(req.params.key)) return sendError(res, 400, 'Nieprawidłowy klucz ustawienia');
    if (req.body === undefined || !('value' in (req.body || {}))) {
      return sendError(res, 400, 'Wymagane pole: value');
    }
    const value = req.body.value;
    if (value === undefined) return sendError(res, 400, 'Wymagane pole: value');
    if (JSON.stringify(value).length > 20000) {
      return sendError(res, 400, 'Wartość ustawienia jest zbyt duża');
    }
    await query(
      `INSERT INTO user_preferences (user_id, pref_key, pref_value, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, pref_key)
       DO UPDATE SET pref_value = EXCLUDED.pref_value, updated_at = NOW()`,
      [req.user.userId, req.params.key, JSON.stringify(value)]
    );
    res.json({ message: 'Ustawienie zapisane' });
  } catch (error) {
    console.error('Set user preference error:', error);
    sendError(res, 500, 'Wystąpił błąd podczas zapisywania ustawienia');
  }
};

module.exports = { getPreference, setPreference };
