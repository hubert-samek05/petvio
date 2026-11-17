const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const { askAdvisor } = require('../controllers/herbal-advisor.controller');

router.use(authenticateToken);

router.post('/ask', askAdvisor);

module.exports = router;
