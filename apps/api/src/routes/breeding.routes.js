const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireFeature } = require('../utils/subscription');
const {
  getCycles, addCycle, deleteCycle,
  getPregnancies, addPregnancy, updatePregnancy, deletePregnancy,
  getLitters, addLitter, deleteLitter,
} = require('../controllers/breeding.controller');

router.use(authenticateToken);
router.use(requireFeature('breeding'));
router.get('/cycles', getCycles);
router.post('/cycles', addCycle);
router.delete('/cycles/:id', deleteCycle);
router.get('/pregnancies', getPregnancies);
router.post('/pregnancies', addPregnancy);
router.patch('/pregnancies/:id', updatePregnancy);
router.delete('/pregnancies/:id', deletePregnancy);
router.get('/litters', getLitters);
router.post('/litters', addLitter);
router.delete('/litters/:id', deleteLitter);

module.exports = router;
