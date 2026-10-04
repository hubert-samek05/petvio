const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const healthRecordController = require('../controllers/health-record.controller');

router.use(authenticateToken);

router.get('/pet/:petId', healthRecordController.getRecordsByPet);
router.post('/', healthRecordController.createRecord);
router.get('/:id', healthRecordController.getRecordById);
router.put('/:id', healthRecordController.updateRecord);
router.delete('/:id', healthRecordController.deleteRecord);

module.exports = router;
