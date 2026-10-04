const express = require('express');
const { authenticateToken } = require('../middleware/auth.middleware');
const { scanBarcode, analyze } = require('../controllers/food-scanner.controller');

const router = express.Router();

router.get('/scan', authenticateToken, scanBarcode);
router.post('/analyze', authenticateToken, analyze);

module.exports = router;
