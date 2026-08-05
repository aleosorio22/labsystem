const express = require('express');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const config = require('../../../core/config');
const { asyncHandler } = require('../../../core/errors');
const { authMiddleware } = require('../../../core/middlewares/authMiddleware');
const { validate } = require('../../../core/middlewares/validateMiddleware');
const authController = require('../controllers/authController');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.env === 'development' ? 1000 : 20,
  message: { error: 'Demasiados intentos, intenta de nuevo más tarde' },
});

const loginSchema = z.object({
  usuario: z.string().min(1, 'Usuario requerido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

const cambioSchema = z.object({
  password_actual: z.string().min(1),
  password_nueva: z.string().min(6, 'Mínimo 6 caracteres'),
});

router.post('/login', loginLimiter, validate(loginSchema), asyncHandler(authController.login));
router.get('/me', authMiddleware, asyncHandler(authController.me));
router.post('/cambiar-password', authMiddleware, validate(cambioSchema), asyncHandler(authController.cambiarPassword));

module.exports = router;
