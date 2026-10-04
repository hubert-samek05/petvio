const express = require('express');
const { authenticateToken } = require('../middleware/auth.middleware');
const { getBreeds, calculate } = require('../controllers/calorie-calculator.controller');

const router = express.Router();

router.get('/breeds', authenticateToken, getBreeds);
router.post('/calculate', authenticateToken, calculate);

module.exports = router;
