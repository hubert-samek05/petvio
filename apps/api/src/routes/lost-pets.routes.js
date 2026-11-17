const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const {
  getLostPets,
  createLostPet,
  markAsFound,
  markAsLost,
  deleteLostPet,
} = require('../controllers/lost-pets.controller');

router.use(authenticateToken);
router.get('/', getLostPets);
router.post('/', createLostPet);
router.patch('/:id/found', markAsFound);
router.patch('/:id/lost', markAsLost);
router.delete('/:id', deleteLostPet);

module.exports = router;
