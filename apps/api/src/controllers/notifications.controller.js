const { query } = require('../config/database');
const { registerDevice, removeDevice, sendPushToUser } = require('../utils/push');
const { sendTemplate } = require('../utils/email.templates');

// Typy powiadomień, które dodatkowo wysyłamy mailem (ważne, rzadkie zdarzenia).
// Częste typy (message, post_comment, follow, wall_post) — tylko in-app + push.
const EMAIL_NOTIFY_TYPES = new Set([
  'friend_request', 'friend_accepted',
  'group_approved', 'group_role', 'group_contest_win',
]);

// Helper — wywoływany z innych kontrolerów przy zdarzeniach
const notify = async (userId, type, title, body, link) => {
  try {
    if (!userId) return;
    await query(
      'INSERT INTO notifications (user_id, type, title, body, link) VALUES ($1, $2, $3, $4, $5)',
      [userId, type, title.slice(0, 200), body || null, link || null]
    );
    sendPushToUser(userId, { title, body, link }).catch(() => {});
    if (EMAIL_NOTIFY_TYPES.has(type)) {
      query('SELECT email, first_name FROM users WHERE id = $1', [userId])
        .then(({ rows }) => {
          const u = rows[0];
          if (u?.email) {
            return sendTemplate(u.email, 'notification', {
              name: u.first_name || 'Użytkowniku', title, body, link,
            });
          }
        })
        .catch(() => {});
    }
  } catch (e) {
    console.error('Notify error:', e.message);
  }
};

// GET /api/notifications — powiadomienia z DB + nadchodzące terminy zdrowotne
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;

    const [notifs, unread, reminders] = await Promise.all([
      query(
        `SELECT id, type, title, body, link, read_at, created_at
         FROM notifications WHERE user_id = $1
         ORDER BY created_at DESC LIMIT 50`,
        [userId]
      ),
      query(
        'SELECT COUNT(*)::int AS c FROM notifications WHERE user_id = $1 AND read_at IS NULL',
        [userId]
      ),
      // Nadchodzące terminy (health_records.next_date w oknie -7 .. +30 dni) — liczone na żywo
      query(
        `SELECT hr.id, hr.title, hr.record_type, hr.next_date, p.name AS pet_name, p.id AS pet_id
         FROM health_records hr
         JOIN pets p ON p.id = hr.pet_id
         WHERE p.user_id = $1 AND p.is_frozen = false
           AND hr.next_date IS NOT NULL
           AND hr.next_date <= CURRENT_DATE + INTERVAL '30 days'
           AND hr.next_date >= CURRENT_DATE - INTERVAL '7 days'
         ORDER BY hr.next_date ASC
         LIMIT 15`,
        [userId]
      ),
    ]);

    res.json({
      notifications: notifs.rows.map((r) => ({
        id: String(r.id),
        type: r.type,
        title: r.title,
        body: r.body,
        link: r.link,
        read: !!r.read_at,
        createdAt: r.created_at,
      })),
      unreadCount: unread.rows[0].c,
      reminders: reminders.rows.map((r) => ({
        id: `rem-${r.id}`,
        title: r.title,
        petName: r.pet_name,
        petId: String(r.pet_id),
        recordType: r.record_type,
        nextDate: r.next_date,
      })),
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: { message: 'Nie udało się pobrać powiadomień', status: 500 } });
  }
};

// POST /api/notifications/:id/read
const markRead = async (req, res) => {
  try {
    await query(
      'UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 AND read_at IS NULL',
      [req.params.id, req.user.userId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: { message: 'Nie udało się oznaczyć powiadomienia', status: 500 } });
  }
};

// POST /api/notifications/read-all
const markAllRead = async (req, res) => {
  try {
    await query(
      'UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND read_at IS NULL',
      [req.user.userId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: { message: 'Nie udało się oznaczyć powiadomień', status: 500 } });
  }
};

// POST /api/notifications/devices — rejestracja tokenu push (FCM)
const registerDeviceToken = async (req, res) => {
  try {
    const { token, platform } = req.body || {};
    if (typeof token !== 'string' || token.length < 10 || token.length > 4096) {
      return res.status(400).json({ error: { message: 'Nieprawidłowy token urządzenia', status: 400 } });
    }
    if (!['ios', 'android', 'web', 'unknown'].includes(platform)) {
      return res.status(400).json({ error: { message: 'Nieprawidłowa platforma', status: 400 } });
    }
    await registerDevice(req.user.userId, token, platform);
    res.json({ success: true });
  } catch (error) {
    console.error('Register device error:', error);
    res.status(500).json({ error: { message: 'Nie udało się zarejestrować urządzenia', status: 500 } });
  }
};

// DELETE /api/notifications/devices — usunięcie tokenu (wylogowanie)
const removeDeviceToken = async (req, res) => {
  try {
    const { token } = req.body || {};
    if (typeof token !== 'string' || token.length < 10 || token.length > 4096) {
      return res.status(400).json({ error: { message: 'Nieprawidłowy token urządzenia', status: 400 } });
    }
    await removeDevice(req.user.userId, token);
    res.json({ success: true });
  } catch (error) {
    console.error('Remove device error:', error);
    res.status(500).json({ error: { message: 'Nie udało się usunąć urządzenia', status: 500 } });
  }
};

module.exports = { getNotifications, markRead, markAllRead, registerDeviceToken, removeDeviceToken, notify };
