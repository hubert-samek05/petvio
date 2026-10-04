const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');
const specialistController = require('../controllers/specialist.controller');

router.get('/', authenticateToken, specialistController.getAll);
router.get('/mine', authenticateToken, specialistController.getMine);
router.post('/', authenticateToken, specialistController.create);

router.get('/admin/pending', authenticateToken, requireAdmin, specialistController.getPending);
router.post('/:id/approve', authenticateToken, requireAdmin, specialistController.approve);
router.post('/:id/reject', authenticateToken, requireAdmin, specialistController.reject);
router.delete('/:id', authenticateToken, requireAdmin, specialistController.removeSpecialist);

module.exports = router;
