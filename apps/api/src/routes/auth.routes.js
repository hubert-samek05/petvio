const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');

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

module.exports = router;
