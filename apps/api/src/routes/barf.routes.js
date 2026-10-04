const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const barfController = require('../controllers/barf.controller');

router.get('/ingredients', authenticateToken, barfController.getIngredients);
router.post('/calculate', authenticateToken, barfController.previewCalculation);
router.get('/plans', authenticateToken, barfController.getPlans);
router.get('/plans/pet/:petId', authenticateToken, barfController.getPlanByPet);
router.post('/plans', authenticateToken, barfController.savePlan);
router.delete('/plans/pet/:petId', authenticateToken, barfController.deletePlan);

module.exports = router;
