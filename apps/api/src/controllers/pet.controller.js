const { query } = require('../config/database');
const { getEffectivePlan, upgradeError, petFrozen, reconcileLimits } = require('../utils/subscription');

const SPECIES = ['dog', 'cat', 'rabbit', 'bird', 'hamster', 'other'];
const GENDERS = ['male', 'female'];
const FIELD_COLUMNS = {
  name: 'name',
  species: 'species',
  breed: 'breed',
  birthDate: 'birth_date',
  gender: 'gender',
  weight: 'weight',
  photoUrl: 'photo_url',
  microchipNumber: 'microchip_number',
};

const sendError = (res, status, message) => res.status(status).json({ error: { message, status } });

const parseId = (value) => (/^\d+$/.test(String(value)) ? Number(value) : null);

const isEmpty = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

const cleanText = (v, label, max) => {
  if (isEmpty(v)) return { value: null };
  if (typeof v !== 'string') return { error: `Pole ${label} musi być tekstem` };
  const t = v.trim();
  if (t.length > max) return { error: `Pole ${label} może mieć maksymalnie ${max} znaków` };
  return { value: t };
};

const FIELD_VALIDATORS = {
  name: (v) => {
    if (typeof v !== 'string' || !v.trim()) return { error: 'Imię jest wymagane' };
    if (v.trim().length > 100) return { error: 'Imię może mieć maksymalnie 100 znaków' };
    return { value: v.trim() };
  },
  species: (v) =>
    typeof v === 'string' && SPECIES.includes(v) ? { value: v } : { error: 'Nieprawidłowy gatunek zwierzęcia' },
  breed: (v) => cleanText(v, 'rasa', 100),
  microchipNumber: (v) => cleanText(v, 'numer chipa', 50),
  photoUrl: (v) => {
    if (isEmpty(v)) return { value: null };
    if (typeof v !== 'string' || !/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=\s]+$/.test(v)) {
      return { error: 'Nieprawidłowy format zdjęcia' };
    }
    if (v.length > 700000) return { error: 'Zdjęcie jest zbyt duże (maks. 500 KB po przeskalowaniu)' };
    return { value: v };
  },
  gender: (v) => {
    if (isEmpty(v)) return { value: null };
    return GENDERS.includes(v) ? { value: v } : { error: 'Nieprawidłowa płeć' };
  },
  weight: (v) => {
    if (isEmpty(v)) return { value: null };
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0 || n > 200) return { error: 'Waga musi być liczbą z zakresu 0–200 kg' };
    return { value: Math.round(n * 100) / 100 };
  },
  birthDate: (v) => {
    if (isEmpty(v)) return { value: null };
    const m = typeof v === 'string' && v.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
    const day = m && `${m[1]}-${m[2]}-${m[3]}`;
    const d = day && new Date(`${day}T00:00:00Z`);
    if (!d || isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== day) {
      return { error: 'Nieprawidłowa data urodzenia (format RRRR-MM-DD)' };
    }
    if (day < '1990-01-01') return { error: 'Data urodzenia jest zbyt odległa' };
    if (day > new Date().toISOString().slice(0, 10)) return { error: 'Data urodzenia nie może być z przyszłości' };
    return { value: day };
  },
};

const validatePet = (body, { partial }) => {
  const values = {};
  for (const key of Object.keys(FIELD_COLUMNS)) {
    if (partial && !(key in body)) continue;
    const result = FIELD_VALIDATORS[key](body[key]);
    if (result.error) return { error: result.error };
    values[FIELD_COLUMNS[key]] = result.value;
  }
  return { values };
};

const getAllPets = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await query(
      `SELECT id, name, species, breed, birth_date, gender, weight, photo_url, 
              microchip_number, is_frozen, created_at, updated_at
       FROM pets
       WHERE user_id = $1
       ORDER BY is_frozen, created_at DESC`,
      [userId]
    );

    res.json({
      pets: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Get pets error:', error);
    res.status(500).json({
      error: {
        message: 'Wystąpił błąd podczas pobierania zwierząt',
        status: 500,
      },
    });
  }
};

const createPet = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { error, values } = validatePet(req.body || {}, { partial: false });
    if (error) return sendError(res, 400, error);

    const eff = await getEffectivePlan(userId);
    if (eff && eff.plan.maxPets !== null) {
      const owned = await query('SELECT COUNT(*)::int AS c FROM pets WHERE user_id = $1', [userId]);
      if (owned.rows[0].c >= eff.plan.maxPets) {
        return upgradeError(
          res,
          'PET_LIMIT',
          `Wykorzystano limit zwierząt w planie ${eff.plan.name} (${eff.plan.maxPets}). Przejdź na wyższy plan, aby dodać kolejne.`,
          { limit: eff.plan.maxPets, plan: eff.planId, requiredPlan: eff.planId === 'mini' ? 'family' : 'xl' }
        );
      }
    }

    const result = await query(
      `INSERT INTO pets (user_id, name, species, breed, birth_date, gender, weight, 
                         photo_url, microchip_number, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING *`,
      [userId, values.name, values.species, values.breed, values.birth_date, values.gender,
       values.weight, values.photo_url, values.microchip_number]
    );

    res.status(201).json({
      message: 'Zwierzę zostało dodane pomyślnie',
      pet: result.rows[0],
    });
  } catch (error) {
    console.error('Create pet error:', error);
    sendError(res, 500, 'Wystąpił błąd podczas dodawania zwierzęcia');
  }
};

const getPetById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const petId = parseId(req.params.id);
    if (!petId) return sendError(res, 400, 'Nieprawidłowy identyfikator zwierzęcia');

    const result = await query(
      'SELECT * FROM pets WHERE id = $1 AND user_id = $2',
      [petId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          message: 'Zwierzę nie zostało znalezione',
          status: 404,
        },
      });
    }

    res.json({
      pet: result.rows[0],
    });
  } catch (error) {
    console.error('Get pet error:', error);
    res.status(500).json({
      error: {
        message: 'Wystąpił błąd podczas pobierania zwierzęcia',
        status: 500,
      },
    });
  }
};

const updatePet = async (req, res) => {
  try {
    const userId = req.user.userId;
    const petId = parseId(req.params.id);
    if (!petId) return sendError(res, 400, 'Nieprawidłowy identyfikator zwierzęcia');

    const { error, values } = validatePet(req.body || {}, { partial: true });
    if (error) return sendError(res, 400, error);

    const columns = Object.keys(values);
    if (columns.length === 0) return sendError(res, 400, 'Brak danych do aktualizacji');

    const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
    const result = await query(
      `UPDATE pets
       SET ${setClause}, updated_at = NOW()
       WHERE id = $${columns.length + 1} AND user_id = $${columns.length + 2} AND is_frozen = false
       RETURNING *`,
      [...columns.map((col) => values[col]), petId, userId]
    );

    if (result.rows.length === 0) {
      const pet = await query('SELECT is_frozen FROM pets WHERE id = $1 AND user_id = $2', [petId, userId]);
      if (pet.rows[0]?.is_frozen) return petFrozen(res);
      return sendError(res, 404, 'Zwierzę nie zostało znalezione');
    }

    res.json({
      message: 'Zwierzę zostało zaktualizowane pomyślnie',
      pet: result.rows[0],
    });
  } catch (error) {
    console.error('Update pet error:', error);
    sendError(res, 500, 'Wystąpił błąd podczas aktualizacji zwierzęcia');
  }
};

const deletePet = async (req, res) => {
  try {
    const userId = req.user.userId;
    const petId = parseId(req.params.id);
    if (!petId) return sendError(res, 400, 'Nieprawidłowy identyfikator zwierzęcia');

    const result = await query(
      'DELETE FROM pets WHERE id = $1 AND user_id = $2 RETURNING id',
      [petId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          message: 'Zwierzę nie zostało znalezione',
          status: 404,
        },
      });
    }

    await reconcileLimits(userId).catch(() => {});

    res.json({
      message: 'Zwierzę zostało usunięte pomyślnie',
    });
  } catch (error) {
    console.error('Delete pet error:', error);
    res.status(500).json({
      error: {
        message: 'Wystąpił błąd podczas usuwania zwierzęcia',
        status: 500,
      },
    });
  }
};

module.exports = {
  getAllPets,
  createPet,
  getPetById,
  updatePet,
  deletePet,
};
