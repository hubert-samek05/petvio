const express = require('express');
const { authenticateToken } = require('../middleware/auth.middleware');
const { scanBarcode, analyze, searchProducts } = require('../controllers/food-scanner.controller');

const router = express.Router();

router.get('/scan', authenticateToken, scanBarcode);
router.post('/analyze', authenticateToken, analyze);
router.get('/search', authenticateToken, searchProducts);

module.exports = router;
