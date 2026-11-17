const { query } = require('../config/database');
const { petFrozen } = require('../utils/subscription');
const { getActiveSportDietForPet, checkKeywordOverlap } = require('../utils/sport-diet.utils');
const { getActiveBarfPlanForPet } = require('../utils/barf.utils');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isInt = (v) => Number.isInteger(Number(v));
const bad = (res, message) => res.status(400).json({ error: { message, status: 400 } });

function isValidDateStr(s) {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00`);
  if (isNaN(d.getTime())) return false;
  const y = d.getFullYear();
  return y >= 1990 && y <= new Date().getFullYear() + 20;
}

// Wspólna walidacja pól diety — partial=true przy edycji (tylko obecne klucze)
function validateDietFields(body, { partial = false } = {}) {
  const errors = [];
  const values = {};
  const check = (name, fn) => {
    if (partial && !(name in body)) return;
    const err = fn(body[name]);
    if (err) errors.push(err);
  };

  check('petId', (v) => (v === undefined || v === null || !isInt(v) ? 'Nieprawidłowy identyfikator zwierzęcia' : null));
  if (!partial || 'petId' in body) values.petId = parseInt(body.petId, 10);

  check('name', (v) => {
    if (typeof v !== 'string' || !v.trim()) return 'Nazwa diety jest wymagana';
    if (v.trim().length > 255) return 'Nazwa może mieć maksymalnie 255 znaków';
    return null;
  });
  if (!partial || 'name' in body) values.name = typeof body.name === 'string' ? body.name.trim() : body.name;

  check('dietType', (v) => {
    if (typeof v !== 'string' || !v.trim()) return 'Typ diety jest wymagany';
    if (v.trim().length > 50) return 'Typ diety może mieć maksymalnie 50 znaków';
    return null;
  });
  if (!partial || 'dietType' in body) values.dietType = typeof body.dietType === 'string' ? body.dietType.trim() : body.dietType;

  for (const key of ['indication', 'allowedFoods', 'forbiddenFoods', 'recommendations', 'notes']) {
    check(key, (v) => (typeof v === 'string' && v.length > 2000 ? 'Pole może mieć maksymalnie 2000 znaków' : null));
    if (!partial || key in body) values[key] = body[key] || null;
  }

  check('startDate', (v) => (v !== null && v !== undefined && v !== '' && !isValidDateStr(v) ? 'Nieprawidłowa data rozpoczęcia (RRRR-MM-DD)' : null));
  if (!partial || 'startDate' in body) values.startDate = body.startDate || null;

  check('endDate', (v) => (v !== null && v !== undefined && v !== '' && !isValidDateStr(v) ? 'Nieprawidłowa data zakończenia (RRRR-MM-DD)' : null));
  if (!partial || 'endDate' in body) values.endDate = body.endDate || null;

  const s = values.startDate !== undefined ? values.startDate : body.startDate;
  const e = values.endDate !== undefined ? values.endDate : body.endDate;
  if (s && e && e < s) errors.push('Data zakończenia nie może być wcześniejsza niż rozpoczęcia');

  if (!partial || 'isActive' in body) values.isActive = body.isActive !== false;

  return { errors, values };
}

async function attachSportDietWarnings(diets) {
  const sportDietCache = {};
  const barfPlanCache = {};
  for (const diet of diets) {
    if (sportDietCache[diet.pet_id] === undefined) {
      sportDietCache[diet.pet_id] = await getActiveSportDietForPet(diet.pet_id);
    }
    const sportDiet = sportDietCache[diet.pet_id];
    if (sportDiet) {
      const conflicts = checkKeywordOverlap(diet.allowed_foods, sportDiet.avoid_foods);
      diet.sportDietWarning = conflicts.length > 0
        ? `Konflikt z aktywną dietą sportową „${sportDiet.name}”: ${conflicts.join(', ')} jest niezalecane przy tej diecie.`
        : null;
      diet.activeSportDiet = { name: sportDiet.name, key: sportDiet.key };
    } else {
      diet.sportDietWarning = null;
      diet.activeSportDiet = null;
    }

    if (diet.diet_type === 'barf') {
      if (barfPlanCache[diet.pet_id] === undefined) {
        barfPlanCache[diet.pet_id] = await getActiveBarfPlanForPet(diet.pet_id);
      }
      const barfPlan = barfPlanCache[diet.pet_id];
      diet.barfPlan = barfPlan
        ? {
            dailyFoodGrams: parseFloat(barfPlan.daily_food_grams),
            muscleMeatGrams: parseFloat(barfPlan.muscle_meat_grams),
            boneGrams: parseFloat(barfPlan.bone_grams),
            liverGrams: parseFloat(barfPlan.liver_grams),
            otherOrganGrams: parseFloat(barfPlan.other_organ_grams),
            vegFruitGrams: parseFloat(barfPlan.veg_fruit_grams),
            caloriesTarget: barfPlan.calories_target,
            mealsPerDay: barfPlan.meals_per_day,
            supplements: barfPlan.supplements || [],
          }
        : null;
    } else {
      diet.barfPlan = null;
    }
  }
  return diets;
}

const getDiets = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { petId } = req.query;

    if (petId !== undefined && !isInt(petId)) return bad(res, 'Nieprawidłowy identyfikator zwierzęcia');

    const conditions = ['d.user_id = $1', 'p.is_frozen = false'];
    const params = [userId];
    let paramIndex = 2;

    if (petId) {
      conditions.push(`d.pet_id = $${paramIndex}`);
      params.push(petId);
      paramIndex++;
    }

    const result = await query(
      `SELECT d.*, p.name as pet_name, p.species as pet_species
       FROM special_diets d
       JOIN pets p ON d.pet_id = p.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY d.is_active DESC, d.created_at DESC`,
      params
    );

    const diets = await attachSportDietWarnings(result.rows);

    res.json({
      diets,
      count: diets.length,
    });
  } catch (error) {
    console.error('Get special diets error:', error);
    res.status(500).json({
      error: {
        message: 'Wystąpił błąd podczas pobierania diet specjalistycznych',
        status: 500,
      },
    });
  }
};

const getDietsByPet = async (req, res) => {
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
      `SELECT d.*, p.name as pet_name, p.species as pet_species
       FROM special_diets d
       JOIN pets p ON d.pet_id = p.id
       WHERE d.pet_id = $1
       ORDER BY d.is_active DESC, d.created_at DESC`,
      [petId]
    );

    const diets = await attachSportDietWarnings(result.rows);

    res.json({
      diets,
      count: diets.length,
    });
  } catch (error) {
    console.error('Get special diets by pet error:', error);
    res.status(500).json({
      error: {
        message: 'Wystąpił błąd podczas pobierania diet specjalistycznych',
        status: 500,
      },
    });
  }
};

const getDietById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const dietId = req.params.id;

    if (!isInt(dietId)) return bad(res, 'Nieprawidłowy identyfikator diety');

    const result = await query(
      `SELECT d.*, p.name as pet_name, p.species as pet_species
       FROM special_diets d
       JOIN pets p ON d.pet_id = p.id
       WHERE d.id = $1 AND d.user_id = $2 AND p.is_frozen = false`,
      [dietId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { message: 'Dieta nie została znaleziona', status: 404 },
      });
    }

    res.json({ diet: result.rows[0] });
  } catch (error) {
    console.error('Get special diet error:', error);
    res.status(500).json({
      error: {
        message: 'Wystąpił błąd podczas pobierania diety',
        status: 500,
      },
    });
  }
};

const createDiet = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { errors, values } = validateDietFields(req.body);

    if (errors.length > 0) {
      return bad(res, errors[0]);
    }

    const petCheck = await query(
      'SELECT id, is_frozen FROM pets WHERE id = $1 AND user_id = $2',
      [values.petId, userId]
    );

    if (petCheck.rows.length === 0) {
      return res.status(404).json({
        error: { message: 'Zwierzę nie zostało znalezione', status: 404 },
      });
    }
    if (petCheck.rows[0].is_frozen) return petFrozen(res);

    const result = await query(
      `INSERT INTO special_diets
        (pet_id, user_id, name, diet_type, indication, allowed_foods, forbidden_foods,
         recommendations, notes, start_date, end_date, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
       RETURNING *`,
      [values.petId, userId, values.name, values.dietType, values.indication, values.allowedFoods,
       values.forbiddenFoods, values.recommendations, values.notes, values.startDate,
       values.endDate, values.isActive]
    );

    res.status(201).json({
      message: 'Dieta specjalistyczna została dodana pomyślnie',
      diet: result.rows[0],
    });
  } catch (error) {
    console.error('Create special diet error:', error);
    res.status(500).json({
      error: {
        message: 'Wystąpił błąd podczas dodawania diety specjalistycznej',
        status: 500,
      },
    });
  }
};

const updateDiet = async (req, res) => {
  try {
    const userId = req.user.userId;
    const dietId = req.params.id;

    if (!isInt(dietId)) return bad(res, 'Nieprawidłowy identyfikator diety');

    const existing = await query(
      'SELECT * FROM special_diets WHERE id = $1 AND user_id = $2',
      [dietId, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        error: { message: 'Dieta nie została znaleziona', status: 404 },
      });
    }

    const { errors, values } = validateDietFields(req.body, { partial: true });
    if (errors.length > 0) return bad(res, errors[0]);

    // Sprawdzenie pary dat również gdy przekazano tylko jedną — bierzemy nową wartość lub istniejącą z wiersza.
    const s = 'startDate' in values
      ? values.startDate
      : existing.rows[0].start_date ? String(existing.rows[0].start_date).slice(0, 10) : null;
    const e = 'endDate' in values
      ? values.endDate
      : existing.rows[0].end_date ? String(existing.rows[0].end_date).slice(0, 10) : null;
    if (s && e && e < s) {
      return bad(res, 'Data zakończenia nie może być wcześniejsza niż rozpoczęcia');
    }

    // Zmiana pupila — nowe zwierzę musi należeć do użytkownika.
    if ('petId' in values) {
      const petCheck = await query(
        'SELECT id, is_frozen FROM pets WHERE id = $1 AND user_id = $2',
        [values.petId, userId]
      );
      if (petCheck.rows.length === 0) {
        return res.status(404).json({
          error: { message: 'Zwierzę nie zostało znalezione', status: 404 },
        });
      }
      if (petCheck.rows[0].is_frozen) return petFrozen(res);
    }

    const sets = [];
    const params = [];
    const colMap = {
      petId: 'pet_id', name: 'name', dietType: 'diet_type', indication: 'indication',
      allowedFoods: 'allowed_foods', forbiddenFoods: 'forbidden_foods', recommendations: 'recommendations',
      notes: 'notes', startDate: 'start_date', endDate: 'end_date', isActive: 'is_active',
    };
    for (const [key, col] of Object.entries(colMap)) {
      if (!(key in values)) continue;
      params.push(values[key]);
      sets.push(`${col} = $${params.length}`);
    }

    if (sets.length === 0) return bad(res, 'Brak danych do aktualizacji');

    params.push(dietId, userId);
    const result = await query(
      `UPDATE special_diets SET ${sets.join(', ')}, updated_at = NOW()
       WHERE id = $${params.length - 1} AND user_id = $${params.length}
       RETURNING *`,
      params
    );

    res.json({
      message: 'Dieta specjalistyczna została zaktualizowana pomyślnie',
      diet: result.rows[0],
    });
  } catch (error) {
    console.error('Update special diet error:', error);
    res.status(500).json({
      error: {
        message: 'Wystąpił błąd podczas aktualizacji diety specjalistycznej',
        status: 500,
      },
    });
  }
};

const deleteDiet = async (req, res) => {
  try {
    const userId = req.user.userId;
    const dietId = req.params.id;

    if (!isInt(dietId)) return bad(res, 'Nieprawidłowy identyfikator diety');

    const result = await query(
      'DELETE FROM special_diets WHERE id = $1 AND user_id = $2 AND NOT EXISTS (SELECT 1 FROM pets p WHERE p.id = special_diets.pet_id AND p.is_frozen) RETURNING id',
      [dietId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { message: 'Dieta nie została znaleziona', status: 404 },
      });
    }

    res.json({
      message: 'Dieta specjalistyczna została usunięta pomyślnie',
    });
  } catch (error) {
    console.error('Delete special diet error:', error);
    res.status(500).json({
      error: {
        message: 'Wystąpił błąd podczas usuwania diety specjalistycznej',
        status: 500,
      },
    });
  }
};

module.exports = {
  getDiets,
  getDietsByPet,
  getDietById,
  createDiet,
  updateDiet,
  deleteDiet,
};
