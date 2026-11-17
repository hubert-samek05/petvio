const { query } = require('../config/database');
const { petFrozen } = require('../utils/subscription');
const { getActiveSportDietForPet, keywordItemMatches } = require('../utils/sport-diet.utils');
const { getActiveBarfPlanForPet } = require('../utils/barf.utils');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const FOOD_TYPES = ['dry', 'wet', 'raw', 'home', 'treat', 'other'];
const UNITS = ['g', 'kcal', 'porcja', 'łyżka', 'puszka', 'sztuka'];
const MEAL_TYPES = ['plan', 'log'];

const isInt = (v) => Number.isInteger(Number(v));
const bad = (res, message) => res.status(400).json({ error: { message, status: 400 } });

function isValidDateStr(s) {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00`);
  if (isNaN(d.getTime())) return false;
  const y = d.getFullYear();
  return y >= 1990 && y <= new Date().getFullYear() + 10;
}

function parseDecimal(v, label, max) {
  if (v === null || v === undefined || v === '') return { ok: true, value: null };
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > max) {
    return { ok: false, message: `${label} musi być liczbą w zakresie 0–${max}` };
  }
  return { ok: true, value: n };
}

// Wspólna walidacja pól wpisu karmienia — zwraca { errors } lub { values }
function validateMealFields(body, { partial = false } = {}) {
  const errors = [];
  const values = {};

  const check = (name, fn) => {
    if (partial && !(name in body)) return;
    const err = fn(body[name]);
    if (err) errors.push(err);
  };

  check('petId', (v) => (v === undefined || v === null || !isInt(v) ? 'Nieprawidłowy identyfikator zwierzęcia' : null));
  if (!partial || 'petId' in body) values.petId = parseInt(body.petId, 10);

  check('logDate', (v) => (!v || !isValidDateStr(v) ? 'Nieprawidłowa data (wymagany format RRRR-MM-DD, zakres 1990 do +10 lat)' : null));
  if (!partial || 'logDate' in body) values.logDate = body.logDate || null;

  check('mealTime', (v) => (v !== null && v !== undefined && v !== '' && !TIME_RE.test(String(v)) ? 'Nieprawidłowa godzina (format GG:MM)' : null));
  if (!partial || 'mealTime' in body) values.mealTime = body.mealTime || null;

  check('mealType', (v) => (!v || !MEAL_TYPES.includes(v) ? 'mealType musi mieć wartość plan lub log' : null));
  if (!partial || 'mealType' in body) values.mealType = body.mealType;

  check('foodName', (v) => {
    if (typeof v !== 'string' || !v.trim()) return 'Nazwa posiłku jest wymagana';
    if (v.trim().length > 255) return 'Nazwa posiłku może mieć maksymalnie 255 znaków';
    return null;
  });
  if (!partial || 'foodName' in body) values.foodName = typeof body.foodName === 'string' ? body.foodName.trim() : body.foodName;

  check('foodType', (v) => (v !== null && v !== undefined && v !== '' && !FOOD_TYPES.includes(v) ? 'Nieprawidłowy typ karmy' : null));
  if (!partial || 'foodType' in body) values.foodType = body.foodType || null;

  check('unit', (v) => (v !== null && v !== undefined && v !== '' && !UNITS.includes(v) ? 'Nieprawidłowa jednostka' : null));
  if (!partial || 'unit' in body) values.unit = body.unit || null;

  if (!partial || 'amount' in body) {
    const a = parseDecimal(body.amount, 'Ilość', 9999.99);
    if (!a.ok) errors.push(a.message); else values.amount = a.value;
  }
  if (!partial || 'calories' in body) {
    const c = parseDecimal(body.calories, 'Kalorie', 9999.99);
    if (!c.ok) errors.push(c.message); else values.calories = c.value;
  }

  check('notes', (v) => (typeof v === 'string' && v.length > 2000 ? 'Notatki mogą mieć maksymalnie 2000 znaków' : null));
  if (!partial || 'notes' in body) values.notes = body.notes || null;

  if (!partial || 'completed' in body) values.completed = body.completed === true;

  return { errors, values };
}

const normalizeKeyword = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

// Sprawdza czy zapisany posiłek koliduje z zakazanymi
// składnikami aktywnych diet specjalistycznych pupila.
async function checkDietWarnings(petId, foodName, notes) {
  const diets = await query(
    `SELECT name, forbidden_foods FROM special_diets WHERE pet_id = $1 AND is_active = true`,
    [petId]
  );
  if (diets.rows.length === 0) return [];
  const text = normalizeKeyword(`${foodName || ''} ${notes || ''}`);
  const warnings = [];
  for (const diet of diets.rows) {
    if (!diet.forbidden_foods) continue;
    const forbidden = diet.forbidden_foods
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 3);
    const matched = forbidden.filter((f) => keywordItemMatches(text, f));
    if (matched.length > 0) {
      warnings.push(`Posiłek zawiera zakazane przy diecie „${diet.name}”: ${matched.join(', ')}`);
    }
  }
  return warnings;
}

const getLogs = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { petId, date, type, from, to } = req.query;

    if (petId !== undefined && !isInt(petId)) return bad(res, 'Nieprawidłowy identyfikator zwierzęcia');
    for (const [name, val] of [['date', date], ['from', from], ['to', to]]) {
      if (val !== undefined && !isValidDateStr(val)) {
        return bad(res, `Nieprawidłowy parametr ${name} (format RRRR-MM-DD)`);
      }
    }
    if (type !== undefined && !MEAL_TYPES.includes(type)) {
      return bad(res, 'Nieprawidłowy typ wpisu (plan lub log)');
    }

    let conditions = ['f.user_id = $1', 'p.is_frozen = false'];
    let params = [userId];
    let paramIndex = 2;

    if (petId) {
      conditions.push(`f.pet_id = $${paramIndex}`);
      params.push(petId);
      paramIndex++;
    }

    if (date) {
      conditions.push(`f.log_date = $${paramIndex}`);
      params.push(date);
      paramIndex++;
    }

    if (from) {
      conditions.push(`f.log_date >= $${paramIndex}`);
      params.push(from);
      paramIndex++;
    }

    if (to) {
      conditions.push(`f.log_date <= $${paramIndex}`);
      params.push(to);
      paramIndex++;
    }

    if (type && (type === 'plan' || type === 'log')) {
      conditions.push(`f.meal_type = $${paramIndex}`);
      params.push(type);
      paramIndex++;
    }

    const result = await query(
      `SELECT f.*, p.name as pet_name, p.species as pet_species
       FROM feeding_logs f
       JOIN pets p ON f.pet_id = p.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY f.log_date DESC, f.meal_time DESC, f.created_at DESC`,
      params
    );

    res.json({
      logs: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Get feeding logs error:', error);
    res.status(500).json({
      error: {
        message: 'Wystąpił błąd podczas pobierania dziennika karmienia',
        status: 500,
      },
    });
  }
};

const getLogsByPet = async (req, res) => {
  try {
    const userId = req.user.userId;
    const petId = req.params.petId;

    if (!isInt(petId)) return bad(res, 'Nieprawidłowy identyfikator zwierzęcia');

    const petCheck = await query(
      'SELECT id, is_frozen FROM pets WHERE id = $1 AND user_id = $2',
      [petId, userId]
    );

    if (petCheck.rows.length === 0) {
      return res.status(404).json({
        error: { message: 'Zwierzę nie zostało znalezione', status: 404 },
      });
    }
    if (petCheck.rows[0].is_frozen) return petFrozen(res);

    const result = await query(
      `SELECT f.*, p.name as pet_name, p.species as pet_species
       FROM feeding_logs f
       JOIN pets p ON f.pet_id = p.id
       WHERE f.pet_id = $1
       ORDER BY f.log_date DESC, f.meal_time DESC, f.created_at DESC`,
      [petId]
    );

    res.json({
      logs: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Get feeding logs by pet error:', error);
    res.status(500).json({
      error: {
        message: 'Wystąpił błąd podczas pobierania dziennika karmienia',
        status: 500,
      },
    });
  }
};

const createLog = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { errors, values } = validateMealFields(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: { message: errors[0], status: 400 } });
    }
    const { petId, logDate, mealTime, mealType, foodName, foodType, amount, unit, calories, notes, completed } = values;

    const petCheck = await query(
      'SELECT id, is_frozen FROM pets WHERE id = $1 AND user_id = $2',
      [petId, userId]
    );

    if (petCheck.rows.length === 0) {
      return res.status(404).json({
        error: { message: 'Zwierzę nie zostało znalezione', status: 404 },
      });
    }
    if (petCheck.rows[0].is_frozen) return petFrozen(res);

    const result = await query(
      `INSERT INTO feeding_logs
        (pet_id, user_id, log_date, meal_time, meal_type, food_name, food_type,
         amount, unit, calories, completed, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
       RETURNING *`,
      [petId, userId, logDate, mealTime, mealType, foodName, foodType,
       amount, unit, calories, completed, notes]
    );

    const dietWarnings = await checkDietWarnings(petId, foodName, notes);

    res.status(201).json({
      message: 'Wpisu karmienia został dodany pomyślnie',
      log: result.rows[0],
      dietWarnings,
    });
  } catch (error) {
    console.error('Create feeding log error:', error);
    res.status(500).json({
      error: {
        message: 'Wystąpił błąd podczas dodawania wpisu karmienia',
        status: 500,
      },
    });
  }
};

const getLogById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const logId = req.params.id;

    if (!isInt(logId)) return bad(res, 'Nieprawidłowy identyfikator wpisu');

    const result = await query(
      `SELECT f.*, p.name as pet_name, p.species as pet_species
       FROM feeding_logs f
       JOIN pets p ON f.pet_id = p.id
       WHERE f.id = $1 AND f.user_id = $2 AND p.is_frozen = false`,
      [logId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { message: 'Wpis karmienia nie został znaleziony', status: 404 },
      });
    }

    res.json({ log: result.rows[0] });
  } catch (error) {
    console.error('Get feeding log error:', error);
    res.status(500).json({
      error: {
        message: 'Wystąpił błąd podczas pobierania wpisu karmienia',
        status: 500,
      },
    });
  }
};

const updateLog = async (req, res) => {
  try {
    const userId = req.user.userId;
    const logId = req.params.id;

    if (!isInt(logId)) return bad(res, 'Nieprawidłowy identyfikator wpisu');

    const FIELD_MAP = {
      logDate: 'log_date',
      mealTime: 'meal_time',
      mealType: 'meal_type',
      foodName: 'food_name',
      foodType: 'food_type',
      amount: 'amount',
      unit: 'unit',
      calories: 'calories',
      notes: 'notes',
      completed: 'completed',
    };
    const provided = Object.keys(FIELD_MAP).filter((k) => k in req.body);
    if (provided.length === 0) {
      return bad(res, 'Brak danych do aktualizacji');
    }

    const { errors, values } = validateMealFields(req.body, { partial: true });
    if (errors.length > 0) {
      return res.status(400).json({ error: { message: errors[0], status: 400 } });
    }

    const sets = [];
    const params = [];
    provided.forEach((key, i) => {
      sets.push(`${FIELD_MAP[key]} = $${i + 1}`);
      params.push(values[key] === undefined ? null : values[key]);
    });
    params.push(logId, userId);

    const result = await query(
      `UPDATE feeding_logs f
       SET ${sets.join(', ')}, updated_at = NOW()
       WHERE f.id = $${params.length - 1} AND f.user_id = $${params.length}
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { message: 'Wpis karmienia nie został znaleziony', status: 404 },
      });
    }

    const dietWarnings = await checkDietWarnings(result.rows[0].pet_id, result.rows[0].food_name, result.rows[0].notes);

    res.json({
      message: 'Wpis karmienia został zaktualizowany pomyślnie',
      log: result.rows[0],
      dietWarnings,
    });
  } catch (error) {
    console.error('Update feeding log error:', error);
    res.status(500).json({
      error: {
        message: 'Wystąpił błąd podczas aktualizacji wpisu karmienia',
        status: 500,
      },
    });
  }
};

const deleteLog = async (req, res) => {
  try {
    const userId = req.user.userId;
    const logId = req.params.id;

    if (!isInt(logId)) return bad(res, 'Nieprawidłowy identyfikator wpisu');

    const result = await query(
      'DELETE FROM feeding_logs WHERE id = $1 AND user_id = $2 AND NOT EXISTS (SELECT 1 FROM pets p WHERE p.id = feeding_logs.pet_id AND p.is_frozen) RETURNING id',
      [logId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { message: 'Wpis karmienia nie został znaleziony', status: 404 },
      });
    }

    res.json({
      message: 'Wpis karmienia został usunięty pomyślnie',
    });
  } catch (error) {
    console.error('Delete feeding log error:', error);
    res.status(500).json({
      error: {
        message: 'Wystąpił błąd podczas usuwania wpisu karmienia',
        status: 500,
      },
    });
  }
};

const getDailySummary = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { petId, date } = req.query;

    if (!petId || !date) {
      return res.status(400).json({
        error: {
          message: 'Wymagane parametry: petId, date',
          status: 400,
        },
      });
    }
    if (!isInt(petId)) return bad(res, 'Nieprawidłowy identyfikator zwierzęcia');
    if (!isValidDateStr(date)) return bad(res, 'Nieprawidłowa data (format RRRR-MM-DD)');

    const petCheck = await query(
      'SELECT id, is_frozen FROM pets WHERE id = $1 AND user_id = $2',
      [petId, userId]
    );

    if (petCheck.rows.length === 0) {
      return res.status(404).json({
        error: { message: 'Zwierzę nie zostało znalezione', status: 404 },
      });
    }
    if (petCheck.rows[0].is_frozen) return petFrozen(res);

    const result = await query(
      `SELECT
        COUNT(*) FILTER (WHERE meal_type = 'log')::int as log_count,
        COUNT(*) FILTER (WHERE meal_type = 'plan')::int as plan_count,
        COUNT(*) FILTER (WHERE meal_type = 'plan' AND completed = true)::int as completed_plans,
        COALESCE(SUM(calories) FILTER (WHERE meal_type = 'log'), 0) as total_calories,
        COALESCE(SUM(amount) FILTER (WHERE meal_type = 'log'), 0) as total_amount
       FROM feeding_logs
       WHERE pet_id = $1 AND user_id = $2 AND log_date = $3`,
      [petId, userId, date]
    );

    const sportDiet = await getActiveSportDietForPet(petId);
    const barfPlan = await getActiveBarfPlanForPet(petId);

    res.json({
      summary: result.rows[0],
      sportDiet: sportDiet
        ? {
            name: sportDiet.name,
            key: sportDiet.key,
            multiplier: parseFloat(sportDiet.calorie_multiplier),
            mealFrequency: sportDiet.meal_frequency,
          }
        : null,
      barfPlan: barfPlan
        ? {
            id: barfPlan.id,
            dailyFoodGrams: parseFloat(barfPlan.daily_food_grams),
            muscleMeatGrams: parseFloat(barfPlan.muscle_meat_grams),
            boneGrams: parseFloat(barfPlan.bone_grams),
            liverGrams: parseFloat(barfPlan.liver_grams),
            otherOrganGrams: parseFloat(barfPlan.other_organ_grams),
            vegFruitGrams: parseFloat(barfPlan.veg_fruit_grams),
            caloriesTarget: barfPlan.calories_target,
            mealsPerDay: barfPlan.meals_per_day,
            perMealGrams: Math.round((parseFloat(barfPlan.daily_food_grams) / barfPlan.meals_per_day) * 10) / 10,
          }
        : null,
    });
  } catch (error) {
    console.error('Get daily summary error:', error);
    res.status(500).json({
      error: {
        message: 'Wystąpił błąd podczas pobierania podsumowania',
        status: 500,
      },
    });
  }
};

module.exports = {
  getLogs,
  getLogsByPet,
  createLog,
  getLogById,
  updateLog,
  deleteLog,
  getDailySummary,
};
