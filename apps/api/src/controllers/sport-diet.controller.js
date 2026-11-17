const { query } = require('../config/database');
const { petFrozen } = require('../utils/subscription');
const { getActiveSportDietForPet } = require('../utils/sport-diet.utils');

const isInt = (v) => Number.isInteger(Number(v));
const bad = (res, message) => res.status(400).json({ error: { message, status: 400 } });
const SUPPORTED_SPECIES = ['dog', 'cat'];

const getTemplates = async (req, res) => {
  try {
    const { species } = req.query;
    if (species !== undefined && !SUPPORTED_SPECIES.includes(species)) {
      return bad(res, 'Diety sportowe są dostępne tylko dla psów i kotów');
    }
    let sql = 'SELECT * FROM sport_diet_templates';
    const params = [];
    if (species) {
      sql += ' WHERE species = $1';
      params.push(species);
    }
    sql += ' ORDER BY calorie_multiplier ASC';

    const result = await query(sql, params);
    res.json({ templates: result.rows });
  } catch (error) {
    console.error('Get sport diet templates error:', error);
    res.status(500).json({
      error: { message: 'Wystąpił błąd podczas pobierania szablonów diet sportowych', status: 500 },
    });
  }
};

const getAssignments = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { petId } = req.query;

    if (petId !== undefined && !isInt(petId)) return bad(res, 'Nieprawidłowy identyfikator zwierzęcia');

    let sql = `SELECT psd.*, t.name as template_name, t.key as template_key, t.calorie_multiplier,
                      t.activity_level, t.meal_frequency, t.recommended_foods, t.avoid_foods, t.tips,
                      p.name as pet_name
               FROM pet_sport_diets psd
               JOIN sport_diet_templates t ON psd.template_id = t.id
               JOIN pets p ON psd.pet_id = p.id
               WHERE psd.user_id = $1 AND psd.is_active = true AND p.is_frozen = false`;
    const params = [userId];

    if (petId) {
      sql += ' AND psd.pet_id = $2';
      params.push(petId);
    }

    sql += ' ORDER BY psd.assigned_at DESC';

    const result = await query(sql, params);
    res.json({ assignments: result.rows });
  } catch (error) {
    console.error('Get sport diet assignments error:', error);
    res.status(500).json({
      error: { message: 'Wystąpił błąd podczas pobierania przypisanych diet sportowych', status: 500 },
    });
  }
};

const getAssignmentByPet = async (req, res) => {
  try {
    const userId = req.user.userId;
    const petId = req.params.petId;

    if (!isInt(petId)) return bad(res, 'Nieprawidłowy identyfikator zwierzęcia');

    const petCheck = await query('SELECT id, is_frozen FROM pets WHERE id = $1 AND user_id = $2', [petId, userId]);
    if (petCheck.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Zwierzę nie zostało znalezione', status: 404 } });
    }
    if (petCheck.rows[0].is_frozen) return petFrozen(res);

    const assignment = await getActiveSportDietForPet(petId);
    res.json({ assignment });
  } catch (error) {
    console.error('Get sport diet by pet error:', error);
    res.status(500).json({
      error: { message: 'Wystąpił błąd podczas pobierania diety sportowej', status: 500 },
    });
  }
};

const assignDiet = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { petId, templateId } = req.body;

    if (!isInt(petId) || !isInt(templateId)) {
      return bad(res, 'Nieprawidłowy identyfikator zwierzęcia lub szablonu');
    }

    const petCheck = await query('SELECT id, species, is_frozen FROM pets WHERE id = $1 AND user_id = $2', [petId, userId]);
    if (petCheck.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Zwierzę nie zostało znalezione', status: 404 } });
    }
    if (petCheck.rows[0].is_frozen) return petFrozen(res);

    const templateCheck = await query('SELECT id, species FROM sport_diet_templates WHERE id = $1', [templateId]);
    if (templateCheck.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Szablon diety nie został znaleziony', status: 404 } });
    }

    if (templateCheck.rows[0].species !== petCheck.rows[0].species) {
      return res.status(400).json({
        error: { message: 'Ta dieta jest przeznaczona dla innego gatunku', status: 400 },
      });
    }

    await query('UPDATE pet_sport_diets SET is_active = false WHERE pet_id = $1 AND is_active = true', [petId]);

    const result = await query(
      `INSERT INTO pet_sport_diets (pet_id, user_id, template_id, is_active, assigned_at, created_at, updated_at)
       VALUES ($1, $2, $3, true, NOW(), NOW(), NOW())
       RETURNING *`,
      [petId, userId, templateId]
    );

    res.status(201).json({
      message: 'Dieta sportowa została przypisana pomyślnie',
      assignment: result.rows[0],
    });
  } catch (error) {
    console.error('Assign sport diet error:', error);
    res.status(500).json({
      error: { message: 'Wystąpił błąd podczas przypisywania diety sportowej', status: 500 },
    });
  }
};

const unassignDiet = async (req, res) => {
  try {
    const userId = req.user.userId;
    const petId = req.params.petId;

    if (!isInt(petId)) return bad(res, 'Nieprawidłowy identyfikator zwierzęcia');

    const result = await query(
      `UPDATE pet_sport_diets SET is_active = false, updated_at = NOW()
       WHERE pet_id = $1 AND user_id = $2 AND is_active = true
       RETURNING id`,
      [petId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { message: 'Nie znaleziono aktywnej diety sportowej dla tego zwierzęcia', status: 404 },
      });
    }

    res.json({ message: 'Dieta sportowa została odłączona pomyślnie' });
  } catch (error) {
    console.error('Unassign sport diet error:', error);
    res.status(500).json({
      error: { message: 'Wystąpił błąd podczas odłączania diety sportowej', status: 500 },
    });
  }
};

module.exports = {
  getTemplates,
  getAssignments,
  getAssignmentByPet,
  assignDiet,
  unassignDiet,
};
