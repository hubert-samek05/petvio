const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const feedingLogController = require('../controllers/feeding-log.controller');

router.use(authenticateToken);

router.get('/', feedingLogController.getLogs);
router.get('/summary', feedingLogController.getDailySummary);
router.get('/pet/:petId', feedingLogController.getLogsByPet);
router.get('/:id', feedingLogController.getLogById);
router.post('/', feedingLogController.createLog);
router.put('/:id', feedingLogController.updateLog);
router.delete('/:id', feedingLogController.deleteLog);

module.exports = router;
