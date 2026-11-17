const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const walkController = require('../controllers/walk.controller');

router.use(authenticateToken);

router.get('/', walkController.getWalks);
router.post('/', walkController.createWalk);
router.get('/:id', walkController.getWalkById);
router.delete('/:id', walkController.deleteWalk);

module.exports = router;
