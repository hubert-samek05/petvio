const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const { getMe, startTrial, getHistory } = require('../controllers/subscription.controller');
const { checkout, paymentSession, confirm, paylog, portal, cancel, resume } = require('../controllers/stripe.controller');

router.use(authenticateToken);
router.get('/me', getMe);
router.get('/history', getHistory);
router.post('/trial', startTrial);
router.post('/checkout', checkout);
router.post('/payment-session', paymentSession);
router.post('/confirm', confirm);
router.post('/paylog', paylog);
router.post('/portal', portal);
router.post('/cancel', cancel);
router.post('/resume', resume);

module.exports = router;
