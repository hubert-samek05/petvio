const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const { getPreference, setPreference } = require('../controllers/user-preferences.controller');

router.use(authenticateToken);

router.get('/:key', getPreference);
router.put('/:key', setPreference);

module.exports = router;
