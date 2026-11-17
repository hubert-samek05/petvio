const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');
const { query } = require('../config/database');
const { templates, sendMail } = require('../utils/email.templates');
const subscriptionAdmin = require('../controllers/subscription.controller');
const { readAll, setSettings } = require('../utils/settings');

// POST /api/admin/mail/test — testowa wysyłka przez Resend na wskazany adres
router.post('/mail/test', authenticateToken, requireAdmin, async (req, res) => {
  const to = String(req.body?.email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return res.status(400).json({ error: 'Podaj poprawny adres e-mail' });
  }
  const tpl = templates.test();
  const result = await sendMail({ to, subject: tpl.subject, html: tpl.html });
  if (result.sent) return res.json({ ok: true, sent: true });
  if (result.skipped) return res.status(503).json({ ok: false, error: 'RESEND_API_KEY nie ustawiony w .env API' });
  res.status(502).json({ ok: false, error: result.error || 'Błąd wysyłki przez Resend' });
});

// Subscriptions (plany, statystyki, zdarzenia płatności, ręczne nadawanie)
router.get('/subscriptions/stats', authenticateToken, requireAdmin, subscriptionAdmin.adminStats);
router.get('/subscriptions/events', authenticateToken, requireAdmin, subscriptionAdmin.adminEvents);
router.get('/subscriptions', authenticateToken, requireAdmin, subscriptionAdmin.adminList);
router.post('/subscriptions/:userId/grant', authenticateToken, requireAdmin, subscriptionAdmin.adminGrant);
router.post('/subscriptions/:userId/revoke', authenticateToken, requireAdmin, subscriptionAdmin.adminRevoke);

// Forum posts
router.get('/forum-posts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT p.id, p.title, p.content, 'published' AS status, p.created_at, 
              u.email, u.first_name, u.last_name
       FROM forum_posts p
       JOIN users u ON p.user_id = u.id
       ORDER BY p.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await query('SELECT COUNT(*) as count FROM forum_posts');

    res.json({
      posts: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
    });
  } catch (error) {
    console.error('Error getting forum posts:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas pobierania postów forum' });
  }
});

// Hotels/Petsitters (from Place table + place_moderation)
router.get('/places', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = String(req.query.status || 'all');
    const search = String(req.query.search || '').trim();

    const conditions = [];
    const params = [];

    if (status !== 'all') {
      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Nieprawidłowy status' });
      }
      params.push(status);
      conditions.push(`COALESCE(pm.status, 'approved') = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(pp.name ILIKE $${params.length} OR pp.type ILIKE $${params.length} OR COALESCE(pp.address, '') ILIKE $${params.length})`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const fromClause = `FROM "Place" pp LEFT JOIN place_moderation pm ON pm.place_id = pp.id`;

    const result = await query(
      `SELECT pp.id, pp.name, pp.type,
              COALESCE(pm.status, 'approved') AS status,
              pm.admin_notes,
              pp."createdAt" AS created_at
       ${fromClause}
       ${whereClause}
       ORDER BY pp."createdAt" DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    const countResult = await query(
      `SELECT COUNT(*) as count ${fromClause} ${whereClause}`,
      params
    );

    res.json({
      places: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
    });
  } catch (error) {
    console.error('Error getting places:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas pobierania miejsc' });
  }
});

const setPlaceStatus = (status) => async (req, res) => {
  try {
    const placeId = String(req.params.id);
    const notes = typeof req.body?.admin_notes === 'string' ? req.body.admin_notes.slice(0, 2000) : null;
    const exists = await query('SELECT id FROM "Place" WHERE id = $1', [placeId]);
    if (exists.rows.length === 0) {
      return res.status(404).json({ error: 'Miejsce nie zostało znalezione' });
    }
    await query(
      `INSERT INTO place_moderation (place_id, status, admin_notes, reviewed_by, reviewed_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (place_id) DO UPDATE
       SET status = EXCLUDED.status, admin_notes = EXCLUDED.admin_notes,
           reviewed_by = EXCLUDED.reviewed_by, reviewed_at = NOW()`,
      [placeId, status, notes, req.user.userId]
    );
    res.json({ ok: true, status });
  } catch (error) {
    console.error(`Error setting place status ${status}:`, error);
    res.status(500).json({ error: 'Wystąpił błąd podczas aktualizacji miejsca' });
  }
};

router.put('/places/:id/approve', authenticateToken, requireAdmin, setPlaceStatus('approved'));
router.put('/places/:id/reject', authenticateToken, requireAdmin, setPlaceStatus('rejected'));

// Blog posts
router.get('/blog-posts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT bp.id, bp.title, bp.content,
              CASE WHEN bp.published THEN 'published' ELSE 'draft' END AS status,
              bp."publishedAt" AS published_at, bp."createdAt" AS created_at
       FROM "BlogPost" bp
       ORDER BY bp."createdAt" DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await query('SELECT COUNT(*) as count FROM "BlogPost"');

    res.json({
      posts: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit,
    });
  } catch (error) {
    console.error('Error getting blog posts:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas pobierania postów blogowych' });
  }
});

router.put('/blog-posts/:id/publish', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query(
      'UPDATE "BlogPost" SET published = true, "publishedAt" = NOW(), "updatedAt" = NOW() WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post nie został znaleziony' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error publishing blog post:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas publikacji postu' });
  }
});

router.post('/blog-posts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const title = String(req.body?.title || '').trim().slice(0, 300);
    const content = String(req.body?.content || '').trim();
    if (!title || !content) {
      return res.status(400).json({ error: 'Tytuł i treść są wymagane' });
    }

    const baseSlug = title
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/ł/g, 'l').replace(/Ł/g, 'l')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'post';
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    const category = String(req.body?.category || 'aktualnosci').trim().slice(0, 100);
    const result = await query(
      `INSERT INTO "BlogPost" (id, title, slug, excerpt, content, category, tags, published, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, '{}', false, NOW(), NOW())
       RETURNING id`,
      [slug, title, slug, content.slice(0, 300), content, category]
    );

    res.status(201).json({ id: result.rows[0].id });
  } catch (error) {
    console.error('Error creating blog post:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas tworzenia postu' });
  }
});

router.put('/blog-posts/:id/unpublish', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query(
      'UPDATE "BlogPost" SET published = false, "updatedAt" = NOW() WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post nie został znaleziony' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error unpublishing blog post:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas cofnięcia publikacji' });
  }
});

router.delete('/blog-posts/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query('DELETE FROM "BlogPost" WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post nie został znaleziony' });
    }
    res.json({ ok: true });
  } catch (error) {
    console.error('Error deleting blog post:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas usuwania postu' });
  }
});

// GET /api/admin/reports?days=30 — realne agregaty dla zakładki Raporty
router.get('/reports', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days) || 30, 1), 365);
    const range = `NOW() - INTERVAL '${days} days'`;
    const prevRange = `NOW() - INTERVAL '${days * 2} days'`;

    const [newUsers, prevUsers, newPets, newPosts, revenue, prevRevenue, specialists, topCities, usage] = await Promise.all([
      query(`SELECT COUNT(*)::int AS c FROM users WHERE created_at >= ${range}`),
      query(`SELECT COUNT(*)::int AS c FROM users WHERE created_at >= ${prevRange} AND created_at < ${range}`),
      query(`SELECT COUNT(*)::int AS c FROM pets WHERE created_at >= ${range}`),
      query(`SELECT COUNT(*)::int AS c FROM forum_posts WHERE created_at >= ${range}`),
      query(`SELECT COALESCE(SUM(amount_grosz), 0)::int AS s FROM subscription_events WHERE amount_grosz > 0 AND created_at >= ${range}`),
      query(`SELECT COALESCE(SUM(amount_grosz), 0)::int AS s FROM subscription_events WHERE amount_grosz > 0 AND created_at >= ${prevRange} AND created_at < ${range}`),
      query(`SELECT status, COUNT(*)::int AS c FROM specialists GROUP BY status`),
      query(`SELECT COALESCE(NULLIF(TRIM(city), ''), 'Brak danych') AS city, COUNT(*)::int AS users FROM users GROUP BY 1 ORDER BY users DESC LIMIT 5`),
      query(`SELECT 'Spacery' AS feature, COUNT(*)::int AS c FROM walks WHERE created_at >= ${range}
             UNION ALL SELECT 'Posty', COUNT(*)::int FROM user_posts WHERE created_at >= ${range}
             UNION ALL SELECT 'Wiadomości', COUNT(*)::int FROM messages WHERE created_at >= ${range}
             UNION ALL SELECT 'Wpisy zdrowia', COUNT(*)::int FROM health_records WHERE created_at >= ${range}`),
    ]);

    const pct = (curr, prev) => (prev > 0 ? Math.round(((curr - prev) / prev) * 100) : (curr > 0 ? 100 : 0));
    const specCounts = Object.fromEntries(specialists.rows.map((r) => [r.status, r.c]));

    res.json({
      days,
      users: { new: newUsers.rows[0].c, prev: prevUsers.rows[0].c, pctChange: pct(newUsers.rows[0].c, prevUsers.rows[0].c) },
      pets: { new: newPets.rows[0].c },
      forumPosts: { new: newPosts.rows[0].c },
      revenueGrosz: revenue.rows[0].s,
      revenuePrevGrosz: prevRevenue.rows[0].s,
      revenuePctChange: pct(revenue.rows[0].s, prevRevenue.rows[0].s),
      specialists: {
        total: specialists.rows.reduce((a, r) => a + r.c, 0),
        pending: specCounts.pending || 0,
        approved: specCounts.approved || 0,
      },
      topCities: topCities.rows,
      usage: usage.rows,
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas generowania raportu' });
  }
});

// GET/PUT /api/admin/settings — ustawienia aplikacji z tabeli app_settings
const DEFAULT_SETTINGS = {
  siteName: 'Petvio',
  siteDescription: 'Zarządzaj zdrowiem swojego pupila',
  maintenanceMode: false,
  allowRegistration: true,
  emailNotifications: true,
  defaultLanguage: 'pl',
};

router.get('/settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stored = await readAll();
    res.json({ settings: { ...DEFAULT_SETTINGS, ...stored } });
  } catch (error) {
    console.error('Error loading settings:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas pobierania ustawień' });
  }
});

router.put('/settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const allowed = Object.keys(DEFAULT_SETTINGS);
    const entries = {};
    for (const key of allowed) {
      if (key in (req.body || {})) entries[key] = req.body[key];
    }
    await setSettings(entries);
    const stored = await readAll();
    res.json({ settings: { ...DEFAULT_SETTINGS, ...stored } });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ error: 'Wystąpił błąd podczas zapisu ustawień' });
  }
});

module.exports = router;
