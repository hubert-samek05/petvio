const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const { askAssistant } = require('../controllers/ai-assistant.controller');

router.use(authenticateToken);
router.post('/ask', askAssistant);

module.exports = router;
