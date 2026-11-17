const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const {
  getAdoptions,
  createAdoption,
  toggleLike,
  updateStatus,
  deleteAdoption,
} = require('../controllers/adoptions.controller');

router.use(authenticateToken);
router.get('/', getAdoptions);
router.post('/', createAdoption);
router.post('/:id/like', toggleLike);
router.patch('/:id/status', updateStatus);
router.delete('/:id', deleteAdoption);

module.exports = router;
