const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const {
  getShares,
  invite,
  respond,
  updateShare,
  revokeShare,
  getSharedPets,
  getSharedPetDetail,
} = require('../controllers/sharing.controller');

router.use(authenticateToken);
router.get('/', getShares);
router.post('/invite', invite);
router.post('/:id/respond', respond);
router.patch('/:id', updateShare);
router.delete('/:id', revokeShare);
router.get('/shared-pets', getSharedPets);
router.get('/shared-pets/:petId', getSharedPetDetail);

module.exports = router;
