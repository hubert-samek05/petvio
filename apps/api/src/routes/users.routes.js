const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');
const { query } = require('../config/database');

router.get('/count', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query('SELECT COUNT(*) as count FROM users');
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Error getting user count:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas pobierania liczby użytkowników' });
  }
});

router.get('/pets/count', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query('SELECT COUNT(*) as count FROM pets');
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Error getting pets count:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas pobierania liczby zwierząt' });
  }
});

router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let whereClause = '';
    let params = [];

    if (search) {
      whereClause = 'WHERE email ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1';
      params.push(`%${search}%`);
    }

    const result = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.phone, u.created_at,
              (SELECT array_agg(DISTINCT dt.platform) FROM device_tokens dt WHERE dt.user_id = u.id) AS platforms,
              (SELECT MAX(dt.last_seen_at) FROM device_tokens dt WHERE dt.user_id = u.id) AS last_seen_at
       FROM users u ${whereClause} 
       ORDER BY u.created_at DESC 
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) as count FROM users ${whereClause}`,
      params
    );

    res.json({
      users: result.rows.map(u => ({
        id: u.id,
        email: u.email,
        first_name: u.first_name,
        last_name: u.last_name,
        role: u.role,
        phone: u.phone,
        platforms: u.platforms || [],
        last_seen_at: u.last_seen_at,
        created_at: u.created_at
      })),
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas pobierania użytkowników' });
  }
});

router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, email, first_name, last_name, role, phone, avatar_url, created_at FROM users WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Użytkownik nie został znaleziony' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      phone: user.phone,
      avatar_url: user.avatar_url,
      created_at: user.created_at
    });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas pobierania użytkownika' });
  }
});

// GET /api/users/:id/detail — pełny widok admina: profil + zwierzęta + subskrypcja + statystyki
router.get('/:id/detail', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userRes = await query(
      `SELECT id, email, first_name, last_name, role, phone, city, bio, birthday,
              avatar_url, auth_provider, plan, plan_source, plan_billing, plan_expires_at,
              trial_used_at, created_at, updated_at
       FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Użytkownik nie został znaleziony' });
    }

    const userId = userRes.rows[0].id;
    const [pets, counts, subEvents, devices] = await Promise.all([
      query(
        'SELECT id, name, species, breed, birth_date, gender, weight, photo_url, created_at FROM pets WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      ),
      query(
        `SELECT
           (SELECT COUNT(*)::int FROM pets WHERE user_id = $1) AS pets,
           (SELECT COUNT(*)::int FROM walks WHERE user_id = $1) AS walks,
           (SELECT COUNT(*)::int FROM forum_posts WHERE user_id = $1) AS forum_posts,
           (SELECT COUNT(*)::int FROM user_posts WHERE user_id = $1) AS posts,
           (SELECT COUNT(*)::int FROM messages WHERE sender_id = $1) AS messages,
           (SELECT COUNT(*)::int FROM specialists WHERE submitted_by = $1) AS specialist_submissions`,
        [userId]
      ),
      query(
        'SELECT event_type, plan, billing, source, amount_grosz, currency, created_at FROM subscription_events WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
        [userId]
      ),
      query(
        'SELECT platform, created_at, last_seen_at FROM device_tokens WHERE user_id = $1 ORDER BY last_seen_at DESC NULLS LAST',
        [userId]
      ),
    ]);

    res.json({
      user: userRes.rows[0],
      pets: pets.rows,
      stats: counts.rows[0],
      subscriptionEvents: subEvents.rows,
      devices: devices.rows,
    });
  } catch (error) {
    console.error('Error getting user detail:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas pobierania szczegółów użytkownika' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (!targetId) return res.status(400).json({ error: 'Nieprawidłowe ID użytkownika' });

    // Blokady: nie pozwol adminowi odebrac sobie roli ani zostawic system bez admina
    const current = await query('SELECT id, role, email FROM users WHERE id = $1', [targetId]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Użytkownik nie został znaleziony' });
    }
    const target = current.rows[0];
    const newRole = req.body.role ?? target.role;

    if (target.id === req.user.userId && newRole !== 'admin') {
      return res.status(400).json({ error: 'Nie możesz odebrać sobie uprawnień administratora' });
    }
    if (target.role === 'admin' && newRole !== 'admin') {
      const admins = await query("SELECT COUNT(*)::int AS c FROM users WHERE role = 'admin'");
      if (admins.rows[0].c <= 1) {
        return res.status(400).json({ error: 'Nie można odebrać roli ostatniemu administratorowi' });
      }
    }
    if (newRole && !['user', 'admin'].includes(newRole)) {
      return res.status(400).json({ error: 'Nieprawidłowa rola' });
    }

    // Unikalny email przy zmianie
    if (req.body.email !== undefined) {
      const email = String(req.body.email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Nieprawidłowy adres email' });
      }
      const dup = await query('SELECT id FROM users WHERE LOWER(email) = $1 AND id <> $2', [email, targetId]);
      if (dup.rows.length > 0) {
        return res.status(409).json({ error: 'Ten adres email jest już zajęty' });
      }
      req.body.email = email;
    }

    const FIELDS = ['first_name', 'last_name', 'email', 'phone', 'city', 'bio', 'birthday',
                    'role', 'plan', 'plan_source', 'plan_billing', 'plan_expires_at'];
    const sets = [];
    const params = [];
    for (const field of FIELDS) {
      if (req.body[field] !== undefined) {
        params.push(req.body[field] === '' ? null : req.body[field]);
        sets.push(`${field} = $${params.length}`);
      }
    }
    if (sets.length === 0) {
      return res.status(400).json({ error: 'Brak pól do aktualizacji' });
    }
    sets.push('updated_at = NOW()');
    params.push(targetId);

    const result = await query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length}
       RETURNING id, email, first_name, last_name, role, phone, city`,
      params
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas aktualizacji użytkownika' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (!targetId) return res.status(400).json({ error: 'Nieprawidłowe ID użytkownika' });

    if (targetId === req.user.userId) {
      return res.status(400).json({ error: 'Nie możesz usunąć własnego konta administratora' });
    }

    const target = await query('SELECT role FROM users WHERE id = $1', [targetId]);
    if (target.rows.length === 0) {
      return res.status(404).json({ error: 'Użytkownik nie został znaleziony' });
    }
    if (target.rows[0].role === 'admin') {
      const admins = await query("SELECT COUNT(*)::int AS c FROM users WHERE role = 'admin'");
      if (admins.rows[0].c <= 1) {
        return res.status(400).json({ error: 'Nie można usunąć ostatniego administratora' });
      }
    }

    await query('DELETE FROM users WHERE id = $1', [targetId]);
    res.json({ message: 'Użytkownik został usunięty' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas usuwania użytkownika' });
  }
});

module.exports = router;
