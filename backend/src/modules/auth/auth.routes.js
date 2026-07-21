import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../../db/knex.js';
import { config } from '../../config/index.js';
import { asyncHandler, AppError } from '../../core/errors.js';
import { validate } from '../../core/middlewares/validate.js';
import { authenticate } from '../../core/middlewares/auth.js';
import { audit } from '../../core/audit.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Demasiados intentos, intenta de nuevo más tarde' },
});

const loginSchema = z.object({
  usuario: z.string().min(1, 'Usuario requerido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

/** Los hashes de Laravel usan prefijo $2y$; bcryptjs trabaja con $2b$ */
export const compararPassword = (plain, hash) =>
  bcrypt.compareSync(plain, hash.replace(/^\$2y\$/, '$2b$'));

router.post('/login', loginLimiter, validate(loginSchema), asyncHandler(async (req, res) => {
  const { usuario, password } = req.validated;
  const user = await db('users')
    .where('username', usuario).orWhere('email', usuario)
    .first();

  if (!user || !compararPassword(password, user.password)) {
    throw new AppError('Usuario o contraseña incorrectos', 401);
  }
  if (!user.active) throw new AppError('El usuario está desactivado', 403);

  const token = jwt.sign({ sub: user.id }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

  const rol = await db('roles').where('id', user.role_id).first();
  const permisos = await db('role_permissions')
    .join('permissions', 'permissions.id', 'role_permissions.permission_id')
    .where('role_permissions.role_id', user.role_id)
    .pluck('permissions.codigo');

  await audit({ userId: user.id, accion: 'Login', tabla: 'users', registroId: user.id });

  res.json({
    token,
    user: {
      id: user.id, name: user.name, username: user.username,
      email: user.email, rol: rol?.nombre, permisos,
    },
  });
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  res.json({
    id: req.user.id, name: req.user.name, username: req.user.username,
    email: req.user.email, rol: req.user.rol, permisos: [...req.user.permisos],
  });
}));

const cambioSchema = z.object({
  password_actual: z.string().min(1),
  password_nueva: z.string().min(6, 'Mínimo 6 caracteres'),
});

router.post('/cambiar-password', authenticate, validate(cambioSchema), asyncHandler(async (req, res) => {
  const user = await db('users').where('id', req.user.id).first();
  if (!compararPassword(req.validated.password_actual, user.password)) {
    throw new AppError('La contraseña actual no coincide', 422);
  }
  await db('users').where('id', user.id).update({
    password: bcrypt.hashSync(req.validated.password_nueva, 10),
    updated_at: db.fn.now(),
  });
  await audit({ userId: user.id, accion: 'Cambio de contraseña', tabla: 'users', registroId: user.id });
  res.json({ ok: true });
}));

export default router;
