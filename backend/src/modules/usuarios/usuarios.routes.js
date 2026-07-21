import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../../db/knex.js';
import { asyncHandler, notFound, AppError } from '../../core/errors.js';
import { authenticate, requirePermission } from '../../core/middlewares/auth.js';
import { validate } from '../../core/middlewares/validate.js';
import { audit } from '../../core/audit.js';

const router = Router();
router.use(authenticate);

const userSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  username: z.string().min(3, 'Mínimo 3 caracteres'),
  email: z.string().email('Correo inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres').optional(),
  role_id: z.coerce.number().int().positive('Rol requerido'),
  active: z.coerce.boolean().default(true),
});

const publicCols = ['users.id', 'users.name', 'users.username', 'users.email',
  'users.role_id', 'users.active', 'users.created_at', 'roles.nombre as rol'];

router.get('/', requirePermission('usuarios.ver'), asyncHandler(async (req, res) => {
  const rows = await db('users')
    .leftJoin('roles', 'users.role_id', 'roles.id')
    .select(publicCols)
    .orderBy('users.name');
  res.json(rows);
}));

router.post('/', requirePermission('usuarios.crear'), validate(userSchema), asyncHandler(async (req, res) => {
  const data = req.validated;
  if (!data.password) throw new AppError('La contraseña es requerida', 422);

  const existe = await db('users').where('username', data.username).orWhere('email', data.email).first();
  if (existe) throw new AppError('El usuario o correo ya existe', 422);

  const [id] = await db('users').insert({ ...data, password: bcrypt.hashSync(data.password, 10) });
  const row = await db('users').leftJoin('roles', 'users.role_id', 'roles.id')
    .select(publicCols).where('users.id', id).first();
  await audit({ userId: req.user.id, accion: 'Creación', tabla: 'users', registroId: id, nuevo: row });
  res.status(201).json(row);
}));

router.put('/:id', requirePermission('usuarios.editar'), validate(userSchema.partial()), asyncHandler(async (req, res) => {
  const anterior = await db('users').where('id', req.params.id).first();
  if (!anterior) throw notFound();

  const data = { ...req.validated };
  if (data.password) data.password = bcrypt.hashSync(data.password, 10);
  else delete data.password;

  await db('users').where('id', req.params.id).update({ ...data, updated_at: db.fn.now() });
  const row = await db('users').leftJoin('roles', 'users.role_id', 'roles.id')
    .select(publicCols).where('users.id', req.params.id).first();
  await audit({
    userId: req.user.id, accion: 'Edición', tabla: 'users', registroId: anterior.id,
    anterior: { ...anterior, password: '[oculto]' }, nuevo: row,
  });
  res.json(row);
}));

router.delete('/:id', requirePermission('usuarios.eliminar'), asyncHandler(async (req, res) => {
  if (Number(req.params.id) === req.user.id) {
    throw new AppError('No puedes desactivar tu propio usuario', 422);
  }
  const anterior = await db('users').where('id', req.params.id).first();
  if (!anterior) throw notFound();
  await db('users').where('id', req.params.id).update({ active: 0, updated_at: db.fn.now() });
  await audit({ userId: req.user.id, accion: 'Desactivación', tabla: 'users', registroId: anterior.id });
  res.json({ ok: true });
}));

export default router;
