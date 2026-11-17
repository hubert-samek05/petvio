const { query } = require('../config/database');

const CATEGORIES = ['vet', 'groomer', 'hotel', 'petsitter', 'shop', 'trainer', 'shelter', 'breeder', 'cafe', 'other'];
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

const sendError = (res, status, message) => res.status(status).json({ error: { message, status } });
const toStr = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const parseId = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// Sanityzacja godzin otwarcia: {mon:{open:"08:00",close:"18:00"},sat:{closed:true},...}
const sanitizeHours = (input) => {
  if (!input || typeof input !== 'object') return {};
  const out = {};
  for (const d of DAYS) {
    const day = input[d];
    if (!day || typeof day !== 'object') continue;
    if (day.closed === true) { out[d] = { closed: true }; continue; }
    const open = typeof day.open === 'string' && TIME_RE.test(day.open) ? day.open : null;
    const close = typeof day.close === 'string' && TIME_RE.test(day.close) ? day.close : null;
    if (open && close) out[d] = { open, close };
  }
  return out;
};

const pageRow = (r) => ({
  id: String(r.id),
  ownerId: String(r.owner_id),
  name: r.name,
  category: r.category,
  description: r.description || null,
  email: r.email || null,
  phone: r.phone || null,
  website: r.website || null,
  address: r.address || null,
  city: r.city || null,
  lat: r.lat != null ? Number(r.lat) : null,
  lng: r.lng != null ? Number(r.lng) : null,
  openingHours: r.opening_hours || {},
  avatarUrl: r.avatar_url || null,
  coverUrl: r.cover_url || null,
  postCount: r.post_count != null ? Number(r.post_count) : undefined,
  createdAt: r.created_at,
});

const validate = (body, partial = false) => {
  const name = toStr(body.name, 120);
  if (!partial || body.name !== undefined) {
    if (!name) return { error: 'Nazwa strony jest wymagana' };
  }
  if (body.category !== undefined && !CATEGORIES.includes(body.category)) {
    return { error: 'Nieprawidłowa kategoria' };
  }
  const email = toStr(body.email, 254);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Nieprawidłowy adres email' };
  }
  const website = toStr(body.website, 255);
  if (website && !/^https?:\/\//i.test(website)) {
    return { error: 'Strona www musi zaczynać się od http(s)://' };
  }
  const lat = body.lat;
  const lng = body.lng;
  if (lat !== undefined && lat !== null && !(Number.isFinite(Number(lat)) && Number(lat) >= -90 && Number(lat) <= 90)) {
    return { error: 'Nieprawidłowa szerokość geograficzna' };
  }
  if (lng !== undefined && lng !== null && !(Number.isFinite(Number(lng)) && Number(lng) >= -180 && Number(lng) <= 180)) {
    return { error: 'Nieprawidłowa długość geograficzna' };
  }
  return {
    name, email, website,
    category: body.category || 'other',
    description: toStr(body.description, 2000),
    phone: toStr(body.phone, 30),
    address: toStr(body.address, 255),
    city: toStr(body.city, 100),
    lat: lat != null ? Number(lat) : null,
    lng: lng != null ? Number(lng) : null,
    openingHours: sanitizeHours(body.openingHours),
    avatarUrl: typeof body.avatarUrl === 'string' && body.avatarUrl.startsWith('data:image/') && body.avatarUrl.length < 700000 ? body.avatarUrl : null,
    coverUrl: typeof body.coverUrl === 'string' && body.coverUrl.startsWith('data:image/') && body.coverUrl.length < 1_200_000 ? body.coverUrl : null,
  };
};

// GET /api/business-pages — katalog publiczny (search po nazwie/mieście/kategorii)
const listPages = async (req, res) => {
  try {
    const conds = ['1=1'];
    const params = [];
    const q = toStr(req.query.q, 100);
    if (q) {
      params.push(`%${q}%`);
      conds.push(`(name ILIKE $${params.length} OR city ILIKE $${params.length})`);
    }
    if (req.query.category && CATEGORIES.includes(req.query.category)) {
      params.push(req.query.category);
      conds.push(`category = $${params.length}`);
    }
    const r = await query(
      `SELECT bp.*, (SELECT COUNT(*) FROM user_posts up WHERE up.page_id = bp.id) AS post_count
       FROM business_pages bp WHERE ${conds.join(' AND ')}
       ORDER BY bp.created_at DESC LIMIT 100`,
      params
    );
    res.json({ pages: r.rows.map(pageRow) });
  } catch (e) {
    console.error('List pages error:', e);
    sendError(res, 500, 'Nie udało się pobrać stron');
  }
};

// GET /api/business-pages/mine — moje strony
const myPages = async (req, res) => {
  try {
    const r = await query(
      `SELECT bp.*, (SELECT COUNT(*) FROM user_posts up WHERE up.page_id = bp.id) AS post_count
       FROM business_pages bp WHERE bp.owner_id = $1 ORDER BY bp.created_at`,
      [req.user.userId]
    );
    res.json({ pages: r.rows.map(pageRow) });
  } catch (e) {
    console.error('My pages error:', e);
    sendError(res, 500, 'Nie udało się pobrać Twoich stron');
  }
};

// GET /api/business-pages/:id — publiczna wizytówka
const getPage = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return sendError(res, 400, 'Nieprawidłowe ID strony');
    const r = await query(
      `SELECT bp.*, u.first_name AS owner_first_name, u.last_name AS owner_last_name,
              (SELECT COUNT(*) FROM user_posts up WHERE up.page_id = bp.id) AS post_count
       FROM business_pages bp JOIN users u ON u.id = bp.owner_id WHERE bp.id = $1`,
      [id]
    );
    if (r.rows.length === 0) return sendError(res, 404, 'Strona nie istnieje');
    const page = pageRow(r.rows[0]);
    page.ownerName = `${r.rows[0].owner_first_name || ''} ${r.rows[0].owner_last_name || ''}`.trim() || null;
    res.json({ page });
  } catch (e) {
    console.error('Get page error:', e);
    sendError(res, 500, 'Nie udało się pobrać strony');
  }
};

// POST /api/business-pages — nowa strona (limit 5 na konto)
const createPage = async (req, res) => {
  try {
    const v = validate(req.body);
    if (v.error) return sendError(res, 400, v.error);
    const count = await query('SELECT COUNT(*)::int AS c FROM business_pages WHERE owner_id = $1', [req.user.userId]);
    if (count.rows[0].c >= 5) return sendError(res, 429, 'Maksymalnie 5 stron na konto');
    const r = await query(
      `INSERT INTO business_pages
        (owner_id, name, category, description, email, phone, website, address, city, lat, lng, opening_hours, avatar_url, cover_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [req.user.userId, v.name, v.category, v.description, v.email, v.phone, v.website,
       v.address, v.city, v.lat, v.lng, JSON.stringify(v.openingHours), v.avatarUrl, v.coverUrl]
    );
    res.status(201).json({ page: pageRow(r.rows[0]) });
  } catch (e) {
    console.error('Create page error:', e);
    sendError(res, 500, 'Nie udało się utworzyć strony');
  }
};

// PATCH /api/business-pages/:id — właściciel
const updatePage = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return sendError(res, 400, 'Nieprawidłowe ID strony');
    const own = await query('SELECT id FROM business_pages WHERE id = $1 AND owner_id = $2', [id, req.user.userId]);
    if (own.rows.length === 0) return sendError(res, 404, 'Strona nie istnieje lub nie jest Twoja');
    const v = validate(req.body, true);
    if (v.error) return sendError(res, 400, v.error);
    const r = await query(
      `UPDATE business_pages SET
         name = COALESCE($2, name), category = COALESCE($3, category), description = $4,
         email = $5, phone = $6, website = $7, address = $8, city = $9,
         lat = $10, lng = $11, opening_hours = $12,
         avatar_url = COALESCE($13, avatar_url), cover_url = COALESCE($14, cover_url),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [id, v.name, req.body.category ? v.category : null, v.description, v.email, v.phone, v.website,
       v.address, v.city, v.lat, v.lng, JSON.stringify(v.openingHours), v.avatarUrl, v.coverUrl]
    );
    res.json({ page: pageRow(r.rows[0]) });
  } catch (e) {
    console.error('Update page error:', e);
    sendError(res, 500, 'Nie udało się zaktualizować strony');
  }
};

// DELETE /api/business-pages/:id — właściciel (posty strony zostają u autora, tracą page_id)
const deletePage = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return sendError(res, 400, 'Nieprawidłowe ID strony');
    const r = await query('DELETE FROM business_pages WHERE id = $1 AND owner_id = $2 RETURNING id', [id, req.user.userId]);
    if (r.rows.length === 0) return sendError(res, 404, 'Strona nie istnieje lub nie jest Twoja');
    res.json({ success: true });
  } catch (e) {
    console.error('Delete page error:', e);
    sendError(res, 500, 'Nie udało się usunąć strony');
  }
};

module.exports = { listPages, myPages, getPage, createPage, updatePage, deletePage, CATEGORIES };
