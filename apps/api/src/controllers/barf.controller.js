const { query } = require('../config/database');
const { petFrozen } = require('../utils/subscription');

const isInt = (v) => Number.isInteger(Number(v));
const bad = (res, message) => res.status(400).json({ error: { message, status: 400 } });
const RATIO_MODEL_KEYS = ['standard', 'adjusted', 'senior_light', 'custom'];

// Wspólna walidacja parametrów kalkulacji / zapisu planu
function validatePlanInput(body, { requirePetId = false } = {}) {
  const errors = [];
  const { petId, weightKg, activityLevel, ratioModel, customRatios, mealsPerDay, notes } = body;

  if (requirePetId && !isInt(petId)) errors.push('Nieprawidłowy identyfikator zwierzęcia');

  const w = Number(weightKg);
  if (!isFinite(w) || w < 0.1 || w > 150) errors.push('Waga musi być liczbą z zakresu 0,1–150 kg');

  const act = activityLevel || 'active';
  if (!Object.keys(ACTIVITY_DAILY_PCT).includes(act)) errors.push('Nieprawidłowy poziom aktywności');

  const model = ratioModel || 'standard';
  if (!RATIO_MODEL_KEYS.includes(model)) errors.push('Nieprawidłowy model proporcji');

  const meals = mealsPerDay === undefined || mealsPerDay === null || mealsPerDay === '' ? 2 : Number(mealsPerDay);
  if (!Number.isInteger(meals) || meals < 1 || meals > 8) errors.push('Liczba posiłków musi być liczbą całkowitą 1–8');

  let ratios = null;
  if (model === 'custom') {
    if (!customRatios || typeof customRatios !== 'object') {
      errors.push('Dla modelu custom wymagane są proporcje customRatios');
    } else {
      const keys = ['musclePct', 'bonePct', 'liverPct', 'otherOrganPct', 'vegFruitPct'];
      const vals = keys.map((k) => Number(customRatios[k]));
      if (vals.some((v) => !isFinite(v) || v < 0 || v > 100)) {
        errors.push('Własne proporcje muszą być liczbami z zakresu 0–100');
      } else {
        const sum = vals.reduce((a, b) => a + b, 0);
        if (Math.abs(sum - 100) > 0.5) errors.push('Suma własnych proporcji musi wynosić 100%');
        else ratios = Object.fromEntries(keys.map((k, i) => [k, vals[i]]));
      }
    }
  }

  if (typeof notes === 'string' && notes.length > 2000) errors.push('Notatki mogą mieć maksymalnie 2000 znaków');

  return {
    errors,
    petId: isInt(petId) ? parseInt(petId, 10) : null,
    weightKg: w,
    activityLevel: act,
    ratioModel: model,
    customRatios: ratios,
    mealsPerDay: meals,
    notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
  };
}

const ACTIVITY_DAILY_PCT = {
  puppy: 5,
  active: 3,
  moderate: 2.5,
  senior: 2,
  weight_loss: 1.5,
};

const RATIO_MODELS = {
  standard: { musclePct: 80, bonePct: 10, liverPct: 5, otherOrganPct: 5, vegFruitPct: 0 },
  adjusted: { musclePct: 70, bonePct: 10, liverPct: 5, otherOrganPct: 5, vegFruitPct: 10 },
  senior_light: { musclePct: 75, bonePct: 10, liverPct: 5, otherOrganPct: 5, vegFruitPct: 5 },
};

const CALORIES_PER_GRAM_ESTIMATE = 1.5;

function computePlan({ weightKg, activityLevel, ratioModel, customRatios, mealsPerDay }) {
  const dailyPct = ACTIVITY_DAILY_PCT[activityLevel] || ACTIVITY_DAILY_PCT.active;
  const dailyFoodGrams = weightKg * 1000 * (dailyPct / 100);

  let ratios;
  if (ratioModel === 'custom' && customRatios) {
    ratios = customRatios;
  } else {
    ratios = RATIO_MODELS[ratioModel] || RATIO_MODELS.standard;
  }

  const total = ratios.musclePct + ratios.bonePct + ratios.liverPct + ratios.otherOrganPct + ratios.vegFruitPct;
  const normalize = (pct) => (total > 0 ? (pct / total) * 100 : 0);

  const musclePct = normalize(ratios.musclePct);
  const bonePct = normalize(ratios.bonePct);
  const liverPct = normalize(ratios.liverPct);
  const otherOrganPct = normalize(ratios.otherOrganPct);
  const vegFruitPct = normalize(ratios.vegFruitPct);

  const muscleMeatGrams = dailyFoodGrams * (musclePct / 100);
  const boneGrams = dailyFoodGrams * (bonePct / 100);
  const liverGrams = dailyFoodGrams * (liverPct / 100);
  const otherOrganGrams = dailyFoodGrams * (otherOrganPct / 100);
  const vegFruitGrams = dailyFoodGrams * (vegFruitPct / 100);

  const caloriesTarget = Math.round(dailyFoodGrams * CALORIES_PER_GRAM_ESTIMATE);
  const perMealGrams = mealsPerDay > 0 ? dailyFoodGrams / mealsPerDay : dailyFoodGrams;

  return {
    dailyPct,
    dailyFoodGrams: round1(dailyFoodGrams),
    musclePct: round2(musclePct),
    bonePct: round2(bonePct),
    liverPct: round2(liverPct),
    otherOrganPct: round2(otherOrganPct),
    vegFruitPct: round2(vegFruitPct),
    muscleMeatGrams: round1(muscleMeatGrams),
    boneGrams: round1(boneGrams),
    liverGrams: round1(liverGrams),
    otherOrganGrams: round1(otherOrganGrams),
    vegFruitGrams: round1(vegFruitGrams),
    caloriesTarget,
    perMealGrams: round1(perMealGrams),
  };
}

function round1(n) {
  return Math.round(n * 10) / 10;
}
function round2(n) {
  return Math.round(n * 100) / 100;
}

const CAUTION_DIET_TYPES = ['renal', 'diabetic', 'elimination', 'allergy', 'weight'];

const DIET_TYPE_LABELS = {
  renal: 'nerkowa',
  diabetic: 'cukrzycowa',
  elimination: 'eliminacyjna',
  weight: 'nadwaga / odchudzanie',
  allergy: 'alergia',
  other: 'inna',
};

async function getSpecialDietWarning(petId) {
  const result = await query(
    `SELECT name, diet_type FROM special_diets WHERE pet_id = $1 AND is_active = true AND diet_type != 'barf' ORDER BY created_at DESC`,
    [petId]
  );
  const conflicting = result.rows.filter((d) => CAUTION_DIET_TYPES.includes(d.diet_type));
  if (conflicting.length === 0) return null;
  const diet = conflicting[0];
  const label = DIET_TYPE_LABELS[diet.diet_type] || diet.diet_type;
  return `Zwierzę ma aktywną dietę specjalistyczną „${diet.name}” (${label}) – przed wdrożeniem lub zmianą diety BARF skonsultuj się z weterynarzem, aby uniknąć konfliktu z zaleceniami dietetycznymi.`;
}

const SUPPLEMENT_UNITS = ['g', 'ml', 'łyżeczka', 'kapsułka', 'szczypta'];

function parseSupplements(supplements) {
  if (!Array.isArray(supplements)) return [];
  return supplements
    .filter((s) => s && typeof s.name === 'string' && s.name.trim())
    .slice(0, 20)
    .map((s) => {
      const amount = Number(s.amount);
      return {
        name: s.name.trim().slice(0, 100),
        amount: isFinite(amount) && amount >= 0 && amount <= 10000 ? amount : null,
        unit: SUPPLEMENT_UNITS.includes(s.unit) ? s.unit : 'g',
        source: s.source === 'database' ? 'database' : 'custom',
        ingredientId: isInt(s.ingredientId) ? parseInt(s.ingredientId, 10) : null,
        notes: typeof s.notes === 'string' && s.notes.trim() ? s.notes.trim().slice(0, 500) : null,
      };
    });
}

const getIngredients = async (req, res) => {
  try {
    const { category, species, search, status } = req.query;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (category) {
      conditions.push(`category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }
    if (species) {
      conditions.push(`(species = $${paramIndex} OR species = 'both')`);
      params.push(species);
      paramIndex++;
    }
    if (status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }
    if (search) {
      conditions.push(`name ILIKE $${paramIndex}`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT * FROM barf_ingredients ${where} ORDER BY category, name`,
      params
    );

    res.json({ ingredients: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Get barf ingredients error:', error);
    res.status(500).json({
      error: { message: 'Wystąpił błąd podczas pobierania bazy składników BARF', status: 500 },
    });
  }
};

const previewCalculation = async (req, res) => {
  try {
    const v = validatePlanInput(req.body);
    if (v.errors.length > 0) return bad(res, v.errors[0]);

    const result = computePlan({
      weightKg: v.weightKg,
      activityLevel: v.activityLevel,
      ratioModel: v.ratioModel,
      customRatios: v.customRatios,
      mealsPerDay: v.mealsPerDay,
    });

    res.json(result);
  } catch (error) {
    console.error('Preview barf calculation error:', error);

    res.status(500).json({
      error: { message: 'Wystąpił błąd podczas obliczania planu BARF', status: 500 },
    });
  }
};

const getPlans = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { petId } = req.query;

    if (petId !== undefined && !isInt(petId)) return bad(res, 'Nieprawidłowy identyfikator zwierzęcia');

    let sql = `SELECT bp.*, p.name as pet_name, p.species as pet_species
               FROM barf_plans bp
               JOIN pets p ON bp.pet_id = p.id
               WHERE bp.user_id = $1 AND bp.is_active = true AND p.is_frozen = false`;
    const params = [userId];

    if (petId) {
      sql += ' AND bp.pet_id = $2';
      params.push(petId);
    }

    sql += ' ORDER BY bp.created_at DESC';

    const result = await query(sql, params);
    res.json({ plans: result.rows });
  } catch (error) {
    console.error('Get barf plans error:', error);
    res.status(500).json({
      error: { message: 'Wystąpił błąd podczas pobierania planów BARF', status: 500 },
    });
  }
};

const getPlanByPet = async (req, res) => {
  try {
    const userId = req.user.userId;
    const petId = req.params.petId;

    if (!isInt(petId)) return bad(res, 'Nieprawidłowy identyfikator zwierzęcia');

    const petCheck = await query('SELECT id, is_frozen FROM pets WHERE id = $1 AND user_id = $2', [petId, userId]);
    if (petCheck.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Zwierzę nie zostało znalezione', status: 404 } });
    }
    if (petCheck.rows[0].is_frozen) return petFrozen(res);

    const result = await query(
      `SELECT * FROM barf_plans WHERE pet_id = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1`,
      [petId]
    );

    const specialDietWarning = await getSpecialDietWarning(petId);

    res.json({ plan: result.rows[0] || null, specialDietWarning });
  } catch (error) {
    console.error('Get barf plan by pet error:', error);
    res.status(500).json({
      error: { message: 'Wystąpił błąd podczas pobierania planu BARF', status: 500 },
    });
  }
};

const savePlan = async (req, res) => {
  try {
    const userId = req.user.userId;
    const v = validatePlanInput(req.body, { requirePetId: true });
    if (v.errors.length > 0) return bad(res, v.errors[0]);

    const petCheck = await query('SELECT id, is_frozen FROM pets WHERE id = $1 AND user_id = $2', [v.petId, userId]);
    if (petCheck.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Zwierzę nie zostało znalezione', status: 404 } });
    }
    if (petCheck.rows[0].is_frozen) return petFrozen(res);

    const computed = computePlan({
      weightKg: v.weightKg,
      activityLevel: v.activityLevel,
      ratioModel: v.ratioModel,
      customRatios: v.customRatios,
      mealsPerDay: v.mealsPerDay,
    });

    await query('UPDATE barf_plans SET is_active = false WHERE pet_id = $1 AND is_active = true', [v.petId]);

    const parsedSupplements = parseSupplements(req.body.supplements);

    const result = await query(
      `INSERT INTO barf_plans
        (pet_id, user_id, weight_kg, activity_level, ratio_model, muscle_meat_pct, bone_pct, liver_pct,
         other_organ_pct, veg_fruit_pct, meals_per_day, daily_food_grams, muscle_meat_grams, bone_grams,
         liver_grams, other_organ_grams, veg_fruit_grams, calories_target, supplements, notes, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, true, NOW(), NOW())
       RETURNING *`,
      [
        v.petId,
        userId,
        v.weightKg,
        v.activityLevel,
        v.ratioModel,
        computed.musclePct,
        computed.bonePct,
        computed.liverPct,
        computed.otherOrganPct,
        computed.vegFruitPct,
        v.mealsPerDay,
        computed.dailyFoodGrams,
        computed.muscleMeatGrams,
        computed.boneGrams,
        computed.liverGrams,
        computed.otherOrganGrams,
        computed.vegFruitGrams,
        computed.caloriesTarget,
        JSON.stringify(parsedSupplements),
        v.notes,
      ]
    );

    res.status(201).json({
      message: 'Plan BARF został zapisany pomyślnie',
      plan: result.rows[0],
    });
  } catch (error) {
    console.error('Save barf plan error:', error);
    res.status(500).json({
      error: { message: 'Wystąpił błąd podczas zapisywania planu BARF', status: 500 },
    });
  }
};

const deletePlan = async (req, res) => {
  try {
    const userId = req.user.userId;
    const petId = req.params.petId;

    if (!isInt(petId)) return bad(res, 'Nieprawidłowy identyfikator zwierzęcia');

    const result = await query(
      `UPDATE barf_plans SET is_active = false, updated_at = NOW()
       WHERE pet_id = $1 AND user_id = $2 AND is_active = true
       RETURNING id`,
      [petId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { message: 'Nie znaleziono aktywnego planu BARF dla tego zwierzęcia', status: 404 },
      });
    }

    res.json({ message: 'Plan BARF został usunięty pomyślnie' });
  } catch (error) {
    console.error('Delete barf plan error:', error);
    res.status(500).json({
      error: { message: 'Wystąpił błąd podczas usuwania planu BARF', status: 500 },
    });
  }
};

module.exports = {
  getIngredients,
  previewCalculation,
  getPlans,
  getPlanByPet,
  savePlan,
  deletePlan,
};
