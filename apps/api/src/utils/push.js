const fs = require('fs');
const { query } = require('../config/database');

// Leniwa inicjalizacja firebase-admin. Brak konfiguracji = wysyłka push wyłączona (no-op).
// Konfiguracja (jedno z):
//   FIREBASE_SERVICE_ACCOUNT_JSON — cały JSON konta serwisowego jako string
//   FIREBASE_SERVICE_ACCOUNT_PATH — ścieżka do pliku JSON konta serwisowego
let messaging = null;
let initFailed = false;

const getMessaging = () => {
  if (messaging || initFailed) return messaging;
  try {
    const admin = require('firebase-admin');
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    let credential = null;
    if (raw) {
      credential = admin.cert(JSON.parse(raw));
    } else if (path && fs.existsSync(path)) {
      credential = admin.cert(JSON.parse(fs.readFileSync(path, 'utf8')));
    }
    if (!credential) {
      initFailed = true; // nie logujemy co request — wysyłka po prostu nie działa
      return null;
    }
    const app = admin.initializeApp({ credential });
    const { getMessaging: getMsg } = require('firebase-admin/messaging');
    messaging = getMsg(app);
    console.log('✓ Firebase Messaging zainicjalizowane (push włączone)');
    return messaging;
  } catch (e) {
    initFailed = true;
    console.error('Firebase init error:', e.message);
    return null;
  }
};

const INVALID_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

// POST /api/notifications/devices — rejestracja/odświeżenie tokenu
const registerDevice = async (userId, token, platform) => {
  await query(
    `INSERT INTO device_tokens (user_id, token, platform) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, token) DO UPDATE
       SET platform = EXCLUDED.platform, last_seen_at = CURRENT_TIMESTAMP`,
    [userId, token, platform]
  );
  // Token mógł się przenieść między kontami (ta sama apka, inny user) — usuń z innych
  await query('DELETE FROM device_tokens WHERE token = $1 AND user_id <> $2', [token, userId]);
};

// DELETE /api/notifications/devices — wylogowanie/usunięcie tokenu
const removeDevice = async (userId, token) => {
  await query('DELETE FROM device_tokens WHERE user_id = $1 AND token = $2', [userId, token]);
};

// Wysyłka push do wszystkich urządzeń użytkownika. Nie rzuca — fire-and-forget.
const sendPushToUser = async (userId, { title, body, link }) => {
  const fcm = getMessaging();
  if (!fcm || !userId) return;
  try {
    const { rows } = await query(
      'SELECT id, token FROM device_tokens WHERE user_id = $1',
      [userId]
    );
    if (!rows.length) return;

    const res = await fcm.sendEachForMulticast({
      tokens: rows.map((r) => r.token),
      notification: { title: String(title).slice(0, 200), body: String(body || '').slice(0, 500) },
      data: link ? { link: String(link).slice(0, 500) } : {},
      android: {
        priority: 'high',
      },
      apns: {
        payload: { aps: { sound: 'default', 'content-available': 1 } },
      },
    });

    // Sprzątanie martwych tokenów
    const dead = [];
    res.responses.forEach((r, i) => {
      if (!r.success && r.error && INVALID_CODES.has(r.error.code)) dead.push(rows[i].id);
    });
    if (dead.length) {
      await query('DELETE FROM device_tokens WHERE id = ANY($1::int[])', [dead]);
    }
  } catch (e) {
    console.error('Push send error:', e.message);
  }
};

module.exports = { registerDevice, removeDevice, sendPushToUser };
