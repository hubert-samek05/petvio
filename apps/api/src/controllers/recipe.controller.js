const { query } = require('../config/database');

const isInt = (v) => Number.isInteger(Number(v));
const bad = (res, message) => res.status(400).json({ error: { message, status: 400 } });
const SPECIES = ['dog', 'cat', 'both'];
const CATEGORIES = ['main_meal', 'treat', 'cake', 'barf', 'snack', 'other'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const VISIBILITIES = ['private', 'public'];

// Walidacja pól przepisu; partial=true przy edycji (tylko obecne klucze)
function validateRecipeFields(body, { partial = false } = {}) {
  const errors = [];
  const values = {};
  const check = (name, fn) => {
    if (partial && !(name in body)) return;
    const err = fn(body[name]);
    if (err) errors.push(err);
  };
  const optInt = (name, label, max) => {
    check(name, (v) => {
      if (v === null || v === undefined || v === '') return null;
      if (!isInt(v) || Number(v) < 0 || Number(v) > max) return `${label} musi być liczbą 0–${max}`;
      return null;
    });
    if (!partial || name in body) {
      const v = body[name];
      values[name] = v === null || v === undefined || v === '' ? null : parseInt(v, 10);
    }
  };
  const optText = (name, max) => {
    check(name, (v) => (typeof v === 'string' && v.length > max ? `Pole może mieć maksymalnie ${max} znaków` : null));
    if (!partial || name in body) values[name] = typeof body[name] === 'string' && body[name].trim() ? body[name].trim() : null;
  };
  const reqText = (name, label, max) => {
    check(name, (v) => {
      if (typeof v !== 'string' || !v.trim()) return `${label} jest wymagane`;
      if (v.trim().length > max) return `${label} może mieć maksymalnie ${max} znaków`;
      return null;
    });
    if (!partial || name in body) values[name] = typeof body[name] === 'string' ? body[name].trim() : body[name];
  };

  reqText('title', 'Nazwa przepisu', 255);
  reqText('ingredients', 'Lista składników', 10000);
  reqText('instructions', 'Sposób przygotowania', 10000);
  optText('description', 2000);

  check('species', (v) => (v !== undefined && !SPECIES.includes(v) ? 'Nieprawidłowy gatunek' : null));
  if (!partial || 'species' in body) values.species = body.species || 'both';

  check('category', (v) => (v !== undefined && !CATEGORIES.includes(v) ? 'Nieprawidłowa kategoria' : null));
  if (!partial || 'category' in body) values.category = body.category || 'main_meal';

  check('difficulty', (v) => (v !== undefined && !DIFFICULTIES.includes(v) ? 'Nieprawidłowy poziom trudności' : null));
  if (!partial || 'difficulty' in body) values.difficulty = body.difficulty || 'easy';

  check('visibility', (v) => (v !== undefined && !VISIBILITIES.includes(v) ? 'Widoczność musi mieć wartość private lub public' : null));
  if (!partial || 'visibility' in body) values.visibility = body.visibility || 'private';

  optInt('prepTimeMinutes', 'Czas przygotowania', 10000);
  optInt('servings', 'Liczba porcji', 1000);
  optInt('caloriesPerServing', 'Kalorie na porcję', 10000);

  return { errors, values };
}

const RECIPE_FIELDS = `
  r.id, r.user_id, r.title, r.species, r.category, r.description, r.ingredients,
  r.instructions, r.prep_time_minutes, r.servings, r.calories_per_serving,
  r.difficulty, r.visibility, r.likes_count, r.created_at, r.updated_at,
  u.first_name as author_first_name, u.last_name as author_last_name
`;

const getMyRecipes = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { species, category, search } = req.query;

    if (species !== undefined && !SPECIES.includes(species)) return bad(res, 'Nieprawidłowy gatunek');
    if (category !== undefined && !CATEGORIES.includes(category)) return bad(res, 'Nieprawidłowa kategoria');

    const conditions = ['r.user_id = $1'];
    const params = [userId];
    let paramIndex = 2;

    if (species) {
      conditions.push(`r.species = $${paramIndex}`);
      params.push(species);
      paramIndex++;
    }
    if (category) {
      conditions.push(`r.category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }
    if (search) {
      conditions.push(`(r.title ILIKE $${paramIndex} OR r.description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const result = await query(
      `SELECT ${RECIPE_FIELDS},
        EXISTS(SELECT 1 FROM recipe_likes rl WHERE rl.recipe_id = r.id AND rl.user_id = $1) as is_liked
       FROM recipes r
       JOIN users u ON r.user_id = u.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY r.created_at DESC`,
      params
    );

    res.json({ recipes: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Get my recipes error:', error);
    res.status(500).json({
      error: { message: 'Wystąpił błąd podczas pobierania przepisów', status: 500 },
    });
  }
};

const getCommunityRecipes = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { species, category, sort, search } = req.query;

    if (species !== undefined && !SPECIES.includes(species)) return bad(res, 'Nieprawidłowy gatunek');
    if (category !== undefined && !CATEGORIES.includes(category)) return bad(res, 'Nieprawidłowa kategoria');

    const conditions = [`r.visibility = 'public'`];
    const params = [userId];
    let paramIndex = 2;

    if (species) {
      conditions.push(`r.species = $${paramIndex}`);
      params.push(species);
      paramIndex++;
    }
    if (category) {
      conditions.push(`r.category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }
    if (search) {
      conditions.push(`r.title ILIKE $${paramIndex}`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const orderBy = sort === 'popular' ? 'r.likes_count DESC, r.created_at DESC' : 'r.created_at DESC';

    const result = await query(
      `SELECT ${RECIPE_FIELDS},
        EXISTS(SELECT 1 FROM recipe_likes rl WHERE rl.recipe_id = r.id AND rl.user_id = $1) as is_liked
       FROM recipes r
       JOIN users u ON r.user_id = u.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY ${orderBy}`,
      params
    );

    res.json({ recipes: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Get community recipes error:', error);
    res.status(500).json({
      error: { message: 'Wystąpił błąd podczas pobierania przepisów społeczności', status: 500 },
    });
  }
};

const getRecipeById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const recipeId = req.params.id;

    if (!isInt(recipeId)) return bad(res, 'Nieprawidłowy identyfikator przepisu');

    const result = await query(
      `SELECT ${RECIPE_FIELDS},
        EXISTS(SELECT 1 FROM recipe_likes rl WHERE rl.recipe_id = r.id AND rl.user_id = $1) as is_liked
       FROM recipes r
       JOIN users u ON r.user_id = u.id
       WHERE r.id = $2 AND (r.visibility = 'public' OR r.user_id = $1)`,
      [userId, recipeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { message: 'Przepis nie został znaleziony', status: 404 },
      });
    }

    res.json({ recipe: result.rows[0] });
  } catch (error) {
    console.error('Get recipe error:', error);
    res.status(500).json({
      error: { message: 'Wystąpił błąd podczas pobierania przepisu', status: 500 },
    });
  }
};

const createRecipe = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { errors, values } = validateRecipeFields(req.body);
    if (errors.length > 0) return bad(res, errors[0]);

    const result = await query(
      `INSERT INTO recipes
        (user_id, title, species, category, description, ingredients, instructions,
         prep_time_minutes, servings, calories_per_serving, difficulty, visibility, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
       RETURNING *`,
      [
        userId,
        values.title,
        values.species,
        values.category,
        values.description,
        values.ingredients,
        values.instructions,
        values.prepTimeMinutes,
        values.servings,
        values.caloriesPerServing,
        values.difficulty,
        values.visibility,
      ]
    );

    res.status(201).json({
      message: 'Przepis został dodany pomyślnie',
      recipe: result.rows[0],
    });
  } catch (error) {
    console.error('Create recipe error:', error);
    res.status(500).json({
      error: { message: 'Wystąpił błąd podczas dodawania przepisu', status: 500 },
    });
  }
};

const updateRecipe = async (req, res) => {
  try {
    const userId = req.user.userId;
    const recipeId = req.params.id;

    if (!isInt(recipeId)) return bad(res, 'Nieprawidłowy identyfikator przepisu');

    const { errors, values } = validateRecipeFields(req.body, { partial: true });
    if (errors.length > 0) return bad(res, errors[0]);

    const sets = [];
    const params = [];
    const colMap = {
      title: 'title', species: 'species', category: 'category', description: 'description',
      ingredients: 'ingredients', instructions: 'instructions', prepTimeMinutes: 'prep_time_minutes',
      servings: 'servings', caloriesPerServing: 'calories_per_serving', difficulty: 'difficulty',
      visibility: 'visibility',
    };
    for (const [key, col] of Object.entries(colMap)) {
      if (!(key in values)) continue;
      params.push(values[key]);
      sets.push(`${col} = $${params.length}`);
    }

    if (sets.length === 0) return bad(res, 'Brak danych do aktualizacji');

    params.push(recipeId, userId);
    const result = await query(
      `UPDATE recipes SET ${sets.join(', ')}, updated_at = NOW()
       WHERE id = $${params.length - 1} AND user_id = $${params.length}
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { message: 'Przepis nie został znaleziony', status: 404 },
      });
    }

    res.json({
      message: 'Przepis został zaktualizowany pomyślnie',
      recipe: result.rows[0],
    });
  } catch (error) {
    console.error('Update recipe error:', error);
    res.status(500).json({
      error: { message: 'Wystąpił błąd podczas aktualizacji przepisu', status: 500 },
    });
  }
};

const deleteRecipe = async (req, res) => {
  try {
    const userId = req.user.userId;
    const recipeId = req.params.id;

    if (!isInt(recipeId)) return bad(res, 'Nieprawidłowy identyfikator przepisu');

    const result = await query(
      'DELETE FROM recipes WHERE id = $1 AND user_id = $2 RETURNING id',
      [recipeId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { message: 'Przepis nie został znaleziony', status: 404 },
      });
    }

    res.json({ message: 'Przepis został usunięty pomyślnie' });
  } catch (error) {
    console.error('Delete recipe error:', error);
    res.status(500).json({
      error: { message: 'Wystąpił błąd podczas usuwania przepisu', status: 500 },
    });
  }
};

const toggleLike = async (req, res) => {
  try {
    const userId = req.user.userId;
    const recipeId = req.params.id;

    if (!isInt(recipeId)) return bad(res, 'Nieprawidłowy identyfikator przepisu');

    const recipeCheck = await query(
      `SELECT id, visibility, user_id FROM recipes WHERE id = $1`,
      [recipeId]
    );

    if (recipeCheck.rows.length === 0) {
      return res.status(404).json({
        error: { message: 'Przepis nie został znaleziony', status: 404 },
      });
    }

    const recipe = recipeCheck.rows[0];
    if (recipe.visibility !== 'public' && recipe.user_id !== userId) {
      return res.status(404).json({
        error: { message: 'Przepis nie został znaleziony', status: 404 },
      });
    }

    // Atomowo: najpierw próba usunięcia polubienia, potem wstawienie (ON CONFLICT).
    const deleted = await query(
      'DELETE FROM recipe_likes WHERE recipe_id = $1 AND user_id = $2 RETURNING id',
      [recipeId, userId]
    );

    const liked = deleted.rows.length === 0;
    if (liked) {
      await query(
        'INSERT INTO recipe_likes (recipe_id, user_id) VALUES ($1, $2) ON CONFLICT (recipe_id, user_id) DO NOTHING',
        [recipeId, userId]
      );
      await query('UPDATE recipes SET likes_count = likes_count + 1 WHERE id = $1', [recipeId]);
    } else {
      await query('UPDATE recipes SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = $1', [recipeId]);
    }

    const updated = await query('SELECT likes_count FROM recipes WHERE id = $1', [recipeId]);

    res.json({
      liked,
      likesCount: updated.rows[0].likes_count,
    });
  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({
      error: { message: 'Wystąpił błąd podczas aktualizacji polubienia', status: 500 },
    });
  }
};

module.exports = {
  getMyRecipes,
  getCommunityRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  toggleLike,
};
