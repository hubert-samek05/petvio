const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const specialDietController = require('../controllers/special-diet.controller');

router.get('/', authenticateToken, specialDietController.getDiets);
router.get('/pet/:petId', authenticateToken, specialDietController.getDietsByPet);
router.get('/:id', authenticateToken, specialDietController.getDietById);
router.post('/', authenticateToken, specialDietController.createDiet);
router.put('/:id', authenticateToken, specialDietController.updateDiet);
router.delete('/:id', authenticateToken, specialDietController.deleteDiet);

module.exports = router;
