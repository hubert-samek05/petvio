const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const recipeController = require('../controllers/recipe.controller');

router.get('/mine', authenticateToken, recipeController.getMyRecipes);
router.get('/community', authenticateToken, recipeController.getCommunityRecipes);
router.get('/:id', authenticateToken, recipeController.getRecipeById);
router.post('/', authenticateToken, recipeController.createRecipe);
router.put('/:id', authenticateToken, recipeController.updateRecipe);
router.delete('/:id', authenticateToken, recipeController.deleteRecipe);
router.post('/:id/like', authenticateToken, recipeController.toggleLike);

module.exports = router;
