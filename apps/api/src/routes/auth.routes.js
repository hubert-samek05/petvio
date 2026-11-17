const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail().withMessage('Podaj prawidłowy adres email'),
    body('password').isLength({ min: 8 }).withMessage('Hasło musi mieć minimum 8 znaków'),
    body('firstName').trim().notEmpty().withMessage('Imię jest wymagane'),
    body('lastName').trim().notEmpty().withMessage('Nazwisko jest wymagane'),
  ],
  authController.register
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Podaj prawidłowy adres email'),
    body('password').notEmpty().withMessage('Hasło jest wymagane'),
  ],
  authController.login
);

router.post('/logout', authController.logout);

// כניסה חברתית — Google / Apple (JWT מספק הזהות → JWT שלנו)
router.post('/google', authController.oauthGoogle);
router.post('/apple', authController.oauthApple);

router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

router.get('/me', authenticateToken, authController.getMe);
router.patch('/me', authenticateToken, authController.updateMe);
router.post('/change-password', authenticateToken, authController.changePassword);
router.delete('/me', authenticateToken, authController.deleteAccount);

module.exports = router;
