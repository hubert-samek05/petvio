const { query } = require('../config/database');
const { getActiveSportDietForPet } = require('../utils/sport-diet.utils');
const { getActiveBarfPlanForPet } = require('../utils/barf.utils');

const getLogs = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { petId, date, type, from, to } = req.query;

    let conditions = ['f.user_id = $1'];
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

    const petCheck = await query(
      'SELECT id FROM pets WHERE id = $1 AND user_id = $2',
      [petId, userId]
    );

    if (petCheck.rows.length === 0) {
      return res.status(404).json({
        error: { message: 'Zwierzę nie zostało znalezione', status: 404 },
      });
    }

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
    const {
      petId,
      logDate,
      mealTime,
      mealType,
      foodName,
      foodType,
      amount,
      unit,
      calories,
      notes,
      completed,
    } = req.body;

    if (!petId || !logDate || !mealType || !foodName) {
      return res.status(400).json({
        error: {
          message: 'Wymagane pola: petId, logDate, mealType, foodName',
          status: 400,
        },
      });
    }

    if (mealType !== 'plan' && mealType !== 'log') {
      return res.status(400).json({
        error: {
          message: 'mealType musi mieć wartość plan lub log',
          status: 400,
        },
      });
    }

    const petCheck = await query(
      'SELECT id FROM pets WHERE id = $1 AND user_id = $2',
      [petId, userId]
    );

    if (petCheck.rows.length === 0) {
      return res.status(404).json({
        error: { message: 'Zwierzę nie zostało znalezione', status: 404 },
      });
    }

    const result = await query(
      `INSERT INTO feeding_logs
        (pet_id, user_id, log_date, meal_time, meal_type, food_name, food_type,
         amount, unit, calories, completed, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
       RETURNING *`,
      [petId, userId, logDate, mealTime || null, mealType, foodName, foodType || null,
       amount || null, unit || null, calories || null, completed === true, notes || null]
    );

    res.status(201).json({
      message: 'Wpisu karmienia został dodany pomyślnie',
      log: result.rows[0],
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

    const result = await query(
      `SELECT f.*, p.name as pet_name, p.species as pet_species
       FROM feeding_logs f
       JOIN pets p ON f.pet_id = p.id
       WHERE f.id = $1 AND f.user_id = $2`,
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
    const {
      logDate,
      mealTime,
      mealType,
      foodName,
      foodType,
      amount,
      unit,
      calories,
      notes,
      completed,
    } = req.body;

    if (mealType && mealType !== 'plan' && mealType !== 'log') {
      return res.status(400).json({
        error: {
          message: 'mealType musi mieć wartość plan lub log',
          status: 400,
        },
      });
    }

    const result = await query(
      `UPDATE feeding_logs f
       SET log_date = COALESCE($1, f.log_date),
           meal_time = COALESCE($2, f.meal_time),
           meal_type = COALESCE($3, f.meal_type),
           food_name = COALESCE($4, f.food_name),
           food_type = COALESCE($5, f.food_type),
           amount = COALESCE($6, f.amount),
           unit = COALESCE($7, f.unit),
           calories = COALESCE($8, f.calories),
           notes = COALESCE($9, f.notes),
           completed = COALESCE($10, f.completed),
           updated_at = NOW()
       WHERE f.id = $11 AND f.user_id = $12
       RETURNING *`,
      [logDate || null, mealTime || null, mealType || null, foodName || null,
       foodType || null, amount || null, unit || null, calories || null, notes || null,
       completed === undefined ? null : completed, logId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { message: 'Wpis karmienia nie został znaleziony', status: 404 },
      });
    }

    res.json({
      message: 'Wpis karmienia został zaktualizowany pomyślnie',
      log: result.rows[0],
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

    const result = await query(
      'DELETE FROM feeding_logs WHERE id = $1 AND user_id = $2 RETURNING id',
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

    const petCheck = await query(
      'SELECT id FROM pets WHERE id = $1 AND user_id = $2',
      [petId, userId]
    );

    if (petCheck.rows.length === 0) {
      return res.status(404).json({
        error: { message: 'Zwierzę nie zostało znalezione', status: 404 },
      });
    }

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
