const { query } = require('../config/database');
const { getActiveSportDietForPet, checkKeywordOverlap } = require('../utils/sport-diet.utils');
const { getActiveBarfPlanForPet } = require('../utils/barf.utils');

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

    const conditions = ['d.user_id = $1'];
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

    const result = await query(
      `SELECT d.*, p.name as pet_name, p.species as pet_species
       FROM special_diets d
       JOIN pets p ON d.pet_id = p.id
       WHERE d.id = $1 AND d.user_id = $2`,
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
    const {
      petId,
      name,
      dietType,
      indication,
      allowedFoods,
      forbiddenFoods,
      recommendations,
      notes,
      startDate,
      endDate,
      isActive,
    } = req.body;

    if (!petId || !name || !dietType) {
      return res.status(400).json({
        error: {
          message: 'Wymagane pola: petId, name, dietType',
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
      `INSERT INTO special_diets
        (pet_id, user_id, name, diet_type, indication, allowed_foods, forbidden_foods,
         recommendations, notes, start_date, end_date, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
       RETURNING *`,
      [petId, userId, name, dietType, indication || null, allowedFoods || null,
       forbiddenFoods || null, recommendations || null, notes || null, startDate || null,
       endDate || null, isActive !== false]
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
    const {
      petId,
      name,
      dietType,
      indication,
      allowedFoods,
      forbiddenFoods,
      recommendations,
      notes,
      startDate,
      endDate,
      isActive,
    } = req.body;

    const result = await query(
      `UPDATE special_diets d
       SET pet_id = COALESCE($1, d.pet_id),
           name = COALESCE($2, d.name),
           diet_type = COALESCE($3, d.diet_type),
           indication = COALESCE($4, d.indication),
           allowed_foods = COALESCE($5, d.allowed_foods),
           forbidden_foods = COALESCE($6, d.forbidden_foods),
           recommendations = COALESCE($7, d.recommendations),
           notes = COALESCE($8, d.notes),
           start_date = COALESCE($9, d.start_date),
           end_date = COALESCE($10, d.end_date),
           is_active = COALESCE($11, d.is_active),
           updated_at = NOW()
       WHERE d.id = $12 AND d.user_id = $13
       RETURNING *`,
      [petId || null, name || null, dietType || null, indication || null, allowedFoods || null,
       forbiddenFoods || null, recommendations || null, notes || null, startDate || null,
       endDate || null, isActive === undefined ? null : isActive, dietId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { message: 'Dieta nie została znaleziona', status: 404 },
      });
    }

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

    const result = await query(
      'DELETE FROM special_diets WHERE id = $1 AND user_id = $2 RETURNING id',
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
