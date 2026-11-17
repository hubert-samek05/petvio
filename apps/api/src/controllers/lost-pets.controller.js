const { query } = require('../config/database');
const { petFrozen } = require('../utils/subscription');

// E-mail wlasciciela NIE jest zwracany publicznie — kontakt przez podany telefon.
const SELECT_FIELDS = `
  l.id, l.user_id, l.pet_id, l.pet_name, l.species, l.breed, l.color, l.age, l.gender,
  l.description, l.distinguishing_features, l.last_seen_location, l.last_seen_city,
  l.last_seen_lat, l.last_seen_lng, l.last_seen_date, l.reward, l.owner_phone, l.photo,
  l.status, l.found_at, l.created_at,
  u.first_name AS owner_first_name, u.last_name AS owner_last_name
`;

const sendError = (res, status, message) => res.status(status).json({ error: { message, status } });

const SPECIES = ['dog', 'cat', 'rabbit', 'bird', 'hamster', 'other'];
const GENDERS = ['male', 'female'];
const MAX_TEXT = {
  petName: 100, breed: 100, color: 60, description: 2000,
  distinguishingFeatures: 500, lastSeenLocation: 255, lastSeenCity: 100,
  reward: 60, ownerPhone: 30,
};
// Zdjecie jako data URL — twarde ograniczenie rozmiaru wiersza.
const MAX_PHOTO_LEN = 600 * 1024;

const toStr = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : null);
const isDateStr = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime());
const isFiniteCoord = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

const parseId = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// GET /api/lost-pets?status=lost&city=Warszawa&lat=..&lng=..&radius=25
// lat/lng/radius — serwerowe filtrowanie promienia (grunt pod powiadomienia push).
const getLostPets = async (req, res) => {
  try {
    const { status, city } = req.query;
    let sql = `SELECT ${SELECT_FIELDS}`;
    const params = [];
    const hasGeo =
      req.query.lat !== undefined || req.query.lng !== undefined || req.query.radius !== undefined;

    let lat = null, lng = null, radius = null;
    if (hasGeo) {
      lat = Number(req.query.lat);
      lng = Number(req.query.lng);
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
        cos(radians(${latP})) * cos(radians(l.last_seen_lat)) *
        cos(radians(l.last_seen_lng) - radians(${lngP})) +
        sin(radians(${latP})) * sin(radians(l.last_seen_lat))
      )))) AS distance_km`;
    }

    sql += ` FROM lost_pets l JOIN users u ON u.id = l.user_id WHERE 1=1`;
    if (status && ['lost', 'found'].includes(status)) {
      params.push(status);
      sql += ` AND l.status = $${params.length}`;
    }
    if (city) {
      params.push(String(city).slice(0, 100));
      sql += ` AND l.last_seen_city = $${params.length}`;
    }
    if (hasGeo) {
      // filtr promienia w podzapytaniu (alias distance_km), rekordy bez wspolrzednych przepuszczamy
      params.push(radius);
      sql = `SELECT * FROM (${sql}) t WHERE t.distance_km IS NULL OR t.distance_km <= $${params.length}`;
      sql += ' ORDER BY t.distance_km ASC NULLS LAST, t.created_at DESC';
    } else {
      sql += ' ORDER BY l.created_at DESC';
    }
    sql += ' LIMIT 500';
    const result = await query(sql, params);
    res.json({ lostPets: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Get lost pets error:', error);
    sendError(res, 500, 'Nie udało się pobrać zgłoszeń');
  }
};

// POST /api/lost-pets — utwórz zgłoszenie zaginięcia
const createLostPet = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      petId, species, age, gender, lastSeenLat, lastSeenLng, lastSeenDate, photo,
    } = req.body;
    const petName = toStr(req.body.petName, MAX_TEXT.petName);
    const description = toStr(req.body.description, MAX_TEXT.description);
    const lastSeenLocation = toStr(req.body.lastSeenLocation, MAX_TEXT.lastSeenLocation);

    if (!petName || !description || !lastSeenLocation || !lastSeenDate) {
      return sendError(res, 400, 'Imię, opis, miejsce i data zaginięcia są wymagane');
    }
    if (!isDateStr(lastSeenDate)) {
      return sendError(res, 400, 'Nieprawidłowa data zaginięcia');
    }
    if (new Date(lastSeenDate) > new Date(Date.now() + 86400000)) {
      return sendError(res, 400, 'Data zaginięcia nie może być w przyszłości');
    }
    if (species !== undefined && !SPECIES.includes(species)) {
      return sendError(res, 400, 'Nieprawidłowy gatunek');
    }
    if (gender !== undefined && gender !== null && !GENDERS.includes(gender)) {
      return sendError(res, 400, 'Nieprawidłowa płeć');
    }
    const ageNum = age === undefined || age === null || age === '' ? null : Number(age);
    if (ageNum !== null && (!Number.isInteger(ageNum) || ageNum < 0 || ageNum > 50)) {
      return sendError(res, 400, 'Wiek musi być liczbą całkowitą 0–50');
    }
    if (lastSeenLat !== undefined && lastSeenLat !== null && !isFiniteCoord(Number(lastSeenLat), -90, 90)) {
      return sendError(res, 400, 'Nieprawidłowa szerokość geograficzna');
    }
    if (lastSeenLng !== undefined && lastSeenLng !== null && !isFiniteCoord(Number(lastSeenLng), -180, 180)) {
      return sendError(res, 400, 'Nieprawidłowa długość geograficzna');
    }
    if (photo !== undefined && photo !== null && (typeof photo !== 'string' || photo.length > MAX_PHOTO_LEN || !photo.startsWith('data:image/'))) {
      return sendError(res, 400, 'Nieprawidłowe zdjęcie (maks. ~450 KB po kompresji)');
    }

    const petIdNum = petId === undefined || petId === null || petId === '' ? null : parseId(petId);
    if (petId !== undefined && petId !== null && petId !== '' && petIdNum === null) {
      return sendError(res, 400, 'Nieprawidłowe ID pupila');
    }
    if (petIdNum) {
      const petCheck = await query('SELECT id, is_frozen FROM pets WHERE id = $1 AND user_id = $2', [petIdNum, userId]);
      if (petCheck.rows.length === 0) {
        return sendError(res, 403, 'To zwierzę nie należy do Ciebie');
      }
      if (petCheck.rows[0].is_frozen) return petFrozen(res);
    }

    const result = await query(
      `INSERT INTO lost_pets (
        user_id, pet_id, pet_name, species, breed, color, age, gender, description,
        distinguishing_features, last_seen_location, last_seen_city,
        last_seen_lat, last_seen_lng, last_seen_date, reward, owner_phone, photo
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      RETURNING id`,
      [
        userId, petIdNum, petName, species || 'dog',
        toStr(req.body.breed, MAX_TEXT.breed), toStr(req.body.color, MAX_TEXT.color),
        ageNum, gender || null, description,
        toStr(req.body.distinguishingFeatures, MAX_TEXT.distinguishingFeatures),
        lastSeenLocation, toStr(req.body.lastSeenCity, MAX_TEXT.lastSeenCity),
        lastSeenLat ?? null, lastSeenLng ?? null,
        lastSeenDate, toStr(req.body.reward, MAX_TEXT.reward),
        toStr(req.body.ownerPhone, MAX_TEXT.ownerPhone),
        photo || null,
      ]
    );

    const created = await query(
      `SELECT ${SELECT_FIELDS} FROM lost_pets l JOIN users u ON u.id = l.user_id WHERE l.id = $1`,
      [result.rows[0].id]
    );

    // Powiadom użytkowników z tego samego miasta — możliwe, że ktoś widział zwierzę
    const city = toStr(req.body.lastSeenCity, MAX_TEXT.lastSeenCity);
    if (city) {
      const nearby = await query(
        `SELECT id FROM users WHERE LOWER(TRIM(city)) = LOWER(TRIM($1)) AND id <> $2 LIMIT 300`,
        [city, userId]
      );
      const { notify } = require('./notifications.controller');
      const me = await query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
      const owner = [me.rows[0]?.first_name, me.rows[0]?.last_name].filter(Boolean).join(' ') || 'Ktoś';
      for (const u of nearby.rows) {
        notify(u.id, 'lost_pet_nearby',
          `Zaginął ${petName} w Twojej okolicy`,
          `${owner} szuka ${petName} — ostatnio widziany(a): ${lastSeenLocation}. Jeśli coś wiesz, zajrzyj do zgłoszenia.`,
          '/dashboard/lost-pets'
        );
      }
    }

    res.status(201).json({ lostPet: created.rows[0] });
  } catch (error) {
    console.error('Create lost pet error:', error);
    sendError(res, 500, 'Nie udało się utworzyć zgłoszenia');
  }
};

const setStatus = (status) => async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return sendError(res, 400, 'Nieprawidłowe ID zgłoszenia');
    const result = await query(
      `UPDATE lost_pets SET status = $3, found_at = ${status === 'found' ? 'CURRENT_TIMESTAMP' : 'NULL'},
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, req.user.userId, status]
    );
    if (result.rows.length === 0) {
      return sendError(res, 404, 'Zgłoszenie nie istnieje lub nie jest Twoje');
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Set status error:', error);
    sendError(res, 500, 'Nie udało się zaktualizować zgłoszenia');
  }
};

// PATCH /api/lost-pets/:id/found | /lost — tylko właściciel
const markAsFound = setStatus('found');
const markAsLost = setStatus('lost');

// DELETE /api/lost-pets/:id — właściciel usuwa zgłoszenie
const deleteLostPet = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return sendError(res, 400, 'Nieprawidłowe ID zgłoszenia');
    const result = await query('DELETE FROM lost_pets WHERE id = $1 AND user_id = $2 AND NOT EXISTS (SELECT 1 FROM pets p WHERE p.id = lost_pets.pet_id AND p.is_frozen) RETURNING id', [
      id,
      req.user.userId,
    ]);
    if (result.rows.length === 0) {
      return sendError(res, 404, 'Zgłoszenie nie istnieje lub nie jest Twoje');
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete lost pet error:', error);
    sendError(res, 500, 'Nie udało się usunąć zgłoszenia');
  }
};

module.exports = { getLostPets, createLostPet, markAsFound, markAsLost, deleteLostPet };
