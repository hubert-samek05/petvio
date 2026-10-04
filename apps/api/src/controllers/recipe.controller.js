const { query } = require('../config/database');

const RECIPE_FIELDS = `
  r.id, r.user_id, r.title, r.species, r.category, r.description, r.ingredients,
  r.instructions, r.prep_time_minutes, r.servings, r.calories_per_serving,
  r.difficulty, r.visibility, r.likes_count, r.created_at, r.updated_at,
  u.first_name as author_first_name, u.last_name as author_last_name
`;

const getMyRecipes = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { species, category } = req.query;

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
    const {
      title,
      species,
      category,
      description,
      ingredients,
      instructions,
      prepTimeMinutes,
      servings,
      caloriesPerServing,
      difficulty,
      visibility,
    } = req.body;

    if (!title || !ingredients || !instructions) {
      return res.status(400).json({
        error: { message: 'Wymagane pola: title, ingredients, instructions', status: 400 },
      });
    }

    if (visibility && !['private', 'public'].includes(visibility)) {
      return res.status(400).json({
        error: { message: 'visibility musi mieć wartość private lub public', status: 400 },
      });
    }

    const result = await query(
      `INSERT INTO recipes
        (user_id, title, species, category, description, ingredients, instructions,
         prep_time_minutes, servings, calories_per_serving, difficulty, visibility, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
       RETURNING *`,
      [
        userId,
        title.trim(),
        species || 'both',
        category || 'main_meal',
        description || null,
        ingredients.trim(),
        instructions.trim(),
        prepTimeMinutes || null,
        servings || null,
        caloriesPerServing || null,
        difficulty || 'easy',
        visibility || 'private',
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
    const {
      title,
      species,
      category,
      description,
      ingredients,
      instructions,
      prepTimeMinutes,
      servings,
      caloriesPerServing,
      difficulty,
      visibility,
    } = req.body;

    if (visibility && !['private', 'public'].includes(visibility)) {
      return res.status(400).json({
        error: { message: 'visibility musi mieć wartość private lub public', status: 400 },
      });
    }

    const result = await query(
      `UPDATE recipes r
       SET title = COALESCE($1, r.title),
           species = COALESCE($2, r.species),
           category = COALESCE($3, r.category),
           description = COALESCE($4, r.description),
           ingredients = COALESCE($5, r.ingredients),
           instructions = COALESCE($6, r.instructions),
           prep_time_minutes = COALESCE($7, r.prep_time_minutes),
           servings = COALESCE($8, r.servings),
           calories_per_serving = COALESCE($9, r.calories_per_serving),
           difficulty = COALESCE($10, r.difficulty),
           visibility = COALESCE($11, r.visibility),
           updated_at = NOW()
       WHERE r.id = $12 AND r.user_id = $13
       RETURNING *`,
      [
        title || null,
        species || null,
        category || null,
        description === undefined ? null : description,
        ingredients || null,
        instructions || null,
        prepTimeMinutes || null,
        servings || null,
        caloriesPerServing || null,
        difficulty || null,
        visibility || null,
        recipeId,
        userId,
      ]
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
      return res.status(403).json({
        error: { message: 'Nie można polubić prywatnego przepisu', status: 403 },
      });
    }

    const existingLike = await query(
      'SELECT id FROM recipe_likes WHERE recipe_id = $1 AND user_id = $2',
      [recipeId, userId]
    );

    let liked;
    if (existingLike.rows.length > 0) {
      await query('DELETE FROM recipe_likes WHERE recipe_id = $1 AND user_id = $2', [recipeId, userId]);
      await query('UPDATE recipes SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = $1', [recipeId]);
      liked = false;
    } else {
      await query('INSERT INTO recipe_likes (recipe_id, user_id) VALUES ($1, $2)', [recipeId, userId]);
      await query('UPDATE recipes SET likes_count = likes_count + 1 WHERE id = $1', [recipeId]);
      liked = true;
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
