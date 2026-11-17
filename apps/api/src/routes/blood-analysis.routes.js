const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireFeature } = require('../utils/subscription');
const { getAll, create, remove } = require('../controllers/blood-analysis.controller');

router.use(authenticateToken);
router.use(requireFeature('blood'));

router.get('/', getAll);
router.post('/', create);
router.delete('/:id', remove);

module.exports = router;
