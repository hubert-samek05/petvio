const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const sportDietController = require('../controllers/sport-diet.controller');

router.get('/templates', authenticateToken, sportDietController.getTemplates);
router.get('/assignments', authenticateToken, sportDietController.getAssignments);
router.get('/pet/:petId', authenticateToken, sportDietController.getAssignmentByPet);
router.post('/assign', authenticateToken, sportDietController.assignDiet);
router.delete('/pet/:petId', authenticateToken, sportDietController.unassignDiet);

module.exports = router;
