const { query } = require('../config/database');

const VALID_STATUS = ['available', 'reserved', 'adopted'];
const SPECIES = ['dog', 'cat', 'rabbit', 'bird', 'hamster', 'other'];
const GENDERS = ['male', 'female'];
const SIZES = ['small', 'medium', 'large'];
const MAX_PHOTO_LEN = 600 * 1024;
const MAX_TEXT = {
  petName: 100, breed: 100, description: 2000, location: 255, city: 100, phone: 30,
};

const sendError = (res, status, message) => res.status(status).json({ error: { message, status } });
const toStr = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const parseId = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};
const isFiniteCoord = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

// E-mail autora NIE jest zwracany publicznie — kontakt przez podany telefon.
const SELECT_FIELDS = `
  p.id, p.user_id, p.pet_name, p.species, p.breed, p.age_value, p.age_unit,
  p.gender, p.size, p.description, p.location, p.city, p.lat, p.lng,
  p.vaccinated, p.sterilized, p.owner_phone, p.photo, p.status, p.created_at,
  u.first_name AS author_first_name, u.last_name AS author_last_name,
  COALESCE(l.like_count, 0)::int AS like_count,
  EXISTS(SELECT 1 FROM adoption_likes al WHERE al.post_id = p.id AND al.user_id = $1) AS liked
`;

// GET /api/adoptions?status=available&lat=..&lng=..&radius=25 — ogloszenia + polubienia + promien
const getAdoptions = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status } = req.query;
    let sql = `SELECT ${SELECT_FIELDS}`;
    const params = [userId];

    const hasGeo = req.query.lat !== undefined || req.query.lng !== undefined || req.query.radius !== undefined;
    let radius = null;
    if (hasGeo) {
      const lat = Number(req.query.lat);
      const lng = Number(req.query.lng);
      radius = Number(req.query.radius);
      if (!isFiniteCoord(lat, -90, 90) || !isFiniteCoord(lng, -180, 180)) {
        return sendError(res, 400, 'Nieprawidłowe współrzędne');
      }
      if (!Number.isFinite(radius) || radius <= 0 || radius > 500) {
        return sendError(res, 400, 'Promień musi być liczbą z zakresu 1–500 km');
      }
      params.push(lat, lng);
      const latP = `$${params.length - 1}`, lngP = `$${params.length}`;
      sql += `, (6371 * acos(LEAST(1, GREATEST(-1,
        cos(radians(${latP})) * cos(radians(p.lat)) *
        cos(radians(p.lng) - radians(${lngP})) +
        sin(radians(${latP})) * sin(radians(p.lat))
      )))) AS distance_km`;
    }

    sql += `
      FROM adoption_posts p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN (SELECT post_id, COUNT(*) AS like_count FROM adoption_likes GROUP BY post_id) l
        ON l.post_id = p.id
      WHERE 1=1
    `;
    if (status && VALID_STATUS.includes(status)) {
      params.push(status);
      sql += ` AND p.status = $${params.length}`;
    }
    if (hasGeo) {
      params.push(radius);
      sql = `SELECT * FROM (${sql}) t WHERE t.distance_km IS NULL OR t.distance_km <= $${params.length}`;
      sql += ' ORDER BY t.distance_km ASC NULLS LAST, t.created_at DESC';
    } else {
      sql += ' ORDER BY p.created_at DESC';
    }
    sql += ' LIMIT 500';
    const result = await query(sql, params);
    res.json({ posts: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Get adoptions error:', error);
    sendError(res, 500, 'Nie udało się pobrać ogłoszeń');
  }
};

// POST /api/adoptions — utwórz ogłoszenie adopcyjne
const createAdoption = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { species, gender, size, ageUnit, lat, lng, photo } = req.body;
    const petName = toStr(req.body.petName, MAX_TEXT.petName);
    const description = toStr(req.body.description, MAX_TEXT.description);
    const age = req.body.age;

    if (!petName || !description || age === undefined || age === null || age === '') {
      return sendError(res, 400, 'Imię, wiek i opis są wymagane');
    }
    const ageNum = Number(age);
    const unit = ageUnit === 'months' ? 'months' : 'years';
    const ageMax = unit === 'months' ? 600 : 50;
    if (!Number.isInteger(ageNum) || ageNum < 0 || ageNum > ageMax) {
      return sendError(res, 400, `Wiek musi być liczbą całkowitą 0–${ageMax} ${unit === 'months' ? 'mies.' : 'lat'}`);
    }
    if (species !== undefined && !SPECIES.includes(species)) {
      return sendError(res, 400, 'Nieprawidłowy gatunek');
    }
    if (gender !== undefined && gender !== null && !GENDERS.includes(gender)) {
      return sendError(res, 400, 'Nieprawidłowa płeć');
    }
    if (size !== undefined && size !== null && !SIZES.includes(size)) {
      return sendError(res, 400, 'Nieprawidłowy rozmiar');
    }
    if (lat !== undefined && lat !== null && !isFiniteCoord(Number(lat), -90, 90)) {
      return sendError(res, 400, 'Nieprawidłowa szerokość geograficzna');
    }
    if (lng !== undefined && lng !== null && !isFiniteCoord(Number(lng), -180, 180)) {
      return sendError(res, 400, 'Nieprawidłowa długość geograficzna');
    }
    if (photo !== undefined && photo !== null && (typeof photo !== 'string' || photo.length > MAX_PHOTO_LEN || !photo.startsWith('data:image/'))) {
      return sendError(res, 400, 'Nieprawidłowe zdjęcie (maks. ~450 KB po kompresji)');
    }

    const result = await query(
      `INSERT INTO adoption_posts (
        user_id, pet_name, species, breed, age_value, age_unit, gender, size,
        description, location, city, lat, lng, vaccinated, sterilized, owner_phone, photo
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING id`,
      [
        userId, petName, species || 'dog', toStr(req.body.breed, MAX_TEXT.breed), ageNum,
        unit, gender || null, size || null,
        description, toStr(req.body.location, MAX_TEXT.location), toStr(req.body.city, MAX_TEXT.city),
        lat ?? null, lng ?? null,
        !!req.body.vaccinated, !!req.body.sterilized,
        toStr(req.body.phone, MAX_TEXT.phone), photo || null,
      ]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (error) {
    console.error('Create adoption error:', error);
    sendError(res, 500, 'Nie udało się utworzyć ogłoszenia');
  }
};

// POST /api/adoptions/:id/like — toggle polubienia (atomowo, bez race)
const toggleLike = async (req, res) => {
  try {
    const postId = parseId(req.params.id);
    if (postId === null) return sendError(res, 400, 'Nieprawidłowe ID ogłoszenia');
    const userId = req.user.userId;

    const post = await query('SELECT 1 FROM adoption_posts WHERE id = $1', [postId]);
    if (post.rows.length === 0) return sendError(res, 404, 'Ogłoszenie nie istnieje');

    const deleted = await query(
      'DELETE FROM adoption_likes WHERE post_id = $1 AND user_id = $2 RETURNING 1',
      [postId, userId]
    );
    let liked = false;
    if (deleted.rows.length === 0) {
      await query(
        'INSERT INTO adoption_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [postId, userId]
      );
      liked = true;
      // Powiadom właściciela ogłoszenia o polubieniu (nie powiadamiaj o własnym)
      const post = await query(
        'SELECT user_id, pet_name FROM adoption_posts WHERE id = $1 AND user_id <> $2',
        [postId, userId]
      );
      if (post.rows.length) {
        const { notify } = require('./notifications.controller');
        const me = await query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
        const name = [me.rows[0]?.first_name, me.rows[0]?.last_name].filter(Boolean).join(' ') || 'Ktoś';
        notify(post.rows[0].user_id, 'adoption_like',
          'Polubienie ogłoszenia adopcyjnego',
          `${name} polubił(a) ogłoszenie „${post.rows[0].pet_name}".`,
          `/dashboard/adoptions?post=${postId}`
        );
      }
    }
    const count = await query('SELECT COUNT(*)::int AS c FROM adoption_likes WHERE post_id = $1', [postId]);
    res.json({ liked, likeCount: count.rows[0].c });
  } catch (error) {
    console.error('Like error:', error);
    sendError(res, 500, 'Nie udało się polubić ogłoszenia');
  }
};

// PATCH /api/adoptions/:id/status — autor zmienia status
const updateStatus = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return sendError(res, 400, 'Nieprawidłowe ID ogłoszenia');
    const { status } = req.body;
    if (!VALID_STATUS.includes(status)) {
      return sendError(res, 400, 'Nieprawidłowy status');
    }
    const result = await query(
      `UPDATE adoption_posts SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3 RETURNING id`,
      [status, id, req.user.userId]
    );
    if (result.rows.length === 0) {
      return sendError(res, 404, 'Ogłoszenie nie istnieje lub nie jest Twoje');
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Update status error:', error);
    sendError(res, 500, 'Nie udało się zaktualizować statusu');
  }
};

// DELETE /api/adoptions/:id — autor usuwa ogłoszenie
const deleteAdoption = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return sendError(res, 400, 'Nieprawidłowe ID ogłoszenia');
    const result = await query(
      'DELETE FROM adoption_posts WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.userId]
    );
    if (result.rows.length === 0) {
      return sendError(res, 404, 'Ogłoszenie nie istnieje lub nie jest Twoje');
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete adoption error:', error);
    sendError(res, 500, 'Nie udało się usunąć ogłoszenia');
  }
};

module.exports = { getAdoptions, createAdoption, toggleLike, updateStatus, deleteAdoption };
