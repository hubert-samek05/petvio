const { query } = require('../config/database');
const { petFrozen } = require('../utils/subscription');

const parseId = (value) => (/^\d+$/.test(String(value)) ? Number(value) : null);

const sendError = (res, status, message) => res.status(status).json({ error: { message, status } });

/** Punkty trasy: tylko {lat,lng[,timestamp]} z liczbami w poprawnych zakresach, max 5000. */
const sanitizePoints = (points) => {
  if (!Array.isArray(points)) return [];
  return points
    .filter((p) => p && typeof p === 'object'
      && Number.isFinite(Number(p.lat)) && Math.abs(Number(p.lat)) <= 90
      && Number.isFinite(Number(p.lng)) && Math.abs(Number(p.lng)) <= 180)
    .map((p) => {
      const pt = { lat: Number(p.lat), lng: Number(p.lng) };
      if (Number.isFinite(Number(p.timestamp))) pt.timestamp = Number(p.timestamp);
      return pt;
    })
    .slice(0, 5000);
};

const MAX_FUTURE_MS = 24 * 3600 * 1000; // tolerancja na rozjezdzany zegar klienta

const getWalks = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { petId } = req.query;

    let sql = `SELECT w.id, w.pet_id, w.started_at, w.duration_seconds, w.distance_meters,
                      w.points, w.created_at,
                      p.name AS pet_name, p.species AS pet_species, p.photo_url AS pet_photo_url
               FROM walks w
               JOIN pets p ON w.pet_id = p.id
               WHERE w.user_id = $1 AND p.is_frozen = false`;
    const params = [userId];

    if (petId !== undefined && petId !== '') {
      const pid = parseId(petId);
      if (!pid) return sendError(res, 400, 'Nieprawidłowy identyfikator zwierzęcia');
      sql += ' AND w.pet_id = $2';
      params.push(pid);
    }

    sql += ' ORDER BY w.started_at DESC LIMIT 200';

    const result = await query(sql, params);

    res.json({
      walks: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Get walks error:', error);
    sendError(res, 500, 'Wystąpił błąd podczas pobierania spacerów');
  }
};

const createWalk = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { petId, startedAt, durationSeconds, distanceMeters, points } = req.body || {};

    const pid = parseId(petId);
    if (!pid || !startedAt) {
      return sendError(res, 400, 'Wymagane pola: petId, startedAt');
    }

    const start = new Date(startedAt);
    if (isNaN(start.getTime())) {
      return sendError(res, 400, 'Nieprawidłowa data rozpoczęcia spaceru');
    }
    if (start.getTime() > Date.now() + MAX_FUTURE_MS) {
      return sendError(res, 400, 'Data rozpoczęcia spaceru nie może być z przyszłości');
    }

    const petCheck = await query(
      'SELECT id, is_frozen FROM pets WHERE id = $1 AND user_id = $2',
      [pid, userId]
    );

    if (petCheck.rows.length === 0) {
      return sendError(res, 404, 'Zwierzę nie zostało znalezione');
    }
    if (petCheck.rows[0].is_frozen) return petFrozen(res);

    const safePoints = sanitizePoints(points);
    const safeDuration = Math.max(0, Math.min(Math.floor(Number(durationSeconds) || 0), 2147483647));
    const safeDistance = Math.max(0, Math.min(Number(distanceMeters) || 0, 99999999.99));

    const result = await query(
      `INSERT INTO walks (user_id, pet_id, started_at, duration_seconds, distance_meters, points, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [userId, pid, start.toISOString(), safeDuration, safeDistance, JSON.stringify(safePoints)]
    );

    res.status(201).json({
      message: 'Spacer został zapisany',
      walk: result.rows[0],
    });
  } catch (error) {
    console.error('Create walk error:', error);
    sendError(res, 500, 'Wystąpił błąd podczas zapisywania spaceru');
  }
};

const getWalkById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const walkId = parseId(req.params.id);
    if (!walkId) return sendError(res, 400, 'Nieprawidłowy identyfikator spaceru');

    const result = await query(
      `SELECT w.*, p.name AS pet_name, p.species AS pet_species, p.photo_url AS pet_photo_url
       FROM walks w
       JOIN pets p ON w.pet_id = p.id
       WHERE w.id = $1 AND w.user_id = $2`,
      [walkId, userId]
    );

    if (result.rows.length === 0) {
      return sendError(res, 404, 'Spacer nie został znaleziony');
    }

    res.json({ walk: result.rows[0] });
  } catch (error) {
    console.error('Get walk error:', error);
    sendError(res, 500, 'Wystąpił błąd podczas pobierania spaceru');
  }
};

const deleteWalk = async (req, res) => {
  try {
    const userId = req.user.userId;
    const walkId = parseId(req.params.id);
    if (!walkId) return sendError(res, 400, 'Nieprawidłowy identyfikator spaceru');

    const result = await query(
      'DELETE FROM walks WHERE id = $1 AND user_id = $2 AND NOT EXISTS (SELECT 1 FROM pets p WHERE p.id = walks.pet_id AND p.is_frozen) RETURNING id',
      [walkId, userId]
    );

    if (result.rows.length === 0) {
      return sendError(res, 404, 'Spacer nie został znaleziony');
    }

    res.json({ message: 'Spacer został usunięty' });
  } catch (error) {
    console.error('Delete walk error:', error);
    sendError(res, 500, 'Wystąpił błąd podczas usuwania spaceru');
  }
};

module.exports = {
  getWalks,
  createWalk,
  getWalkById,
  deleteWalk,
};
