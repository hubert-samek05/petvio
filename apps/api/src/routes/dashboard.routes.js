const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const { getSummary } = require('../controllers/dashboard.controller');

router.use(authenticateToken);
router.get('/summary', getSummary);

module.exports = router;
