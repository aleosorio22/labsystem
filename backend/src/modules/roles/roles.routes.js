import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/knex.js';
import { asyncHandler, notFound, AppError } from '../../core/errors.js';
import { authenticate, requirePermission } from '../../core/middlewares/auth.js';
import { validate } from '../../core/middlewares/validate.js';
import { audit } from '../../core/audit.js';

const router = Router();
router.use(authenticate);

router.get('/permisos', requirePermission('roles.ver', 'usuarios.ver'), asyncHandler(async (_req, res) => {
  res.json(await db('permissions').select('*').orderBy(['modulo', 'codigo']));
}));

router.get('/', requirePermission('roles.ver', 'usuarios.ver'), asyncHandler(async (_req, res) => {
  const roles = await db('roles').where('estado', 1).orderBy('nombre');
  const rels = await db('role_permissions').select('*');
  res.json(roles.map((r) => ({
    ...r,
    permisos: rels.filter((x) => x.role_id === r.id).map((x) => x.permission_id),
  })));
}));

const roleSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  descripcion: z.string().optional().nullable(),
  permisos: z.array(z.number().int()).default([]),
});

router.post('/', requirePermission('roles.editar'), validate(roleSchema), asyncHandler(async (req, res) => {
  const { permisos, ...data } = req.validated;
  const [id] = await db('roles').insert(data);
  if (permisos.length) {
    await db('role_permissions').insert(permisos.map((p) => ({ role_id: id, permission_id: p })));
  }
  await audit({ userId: req.user.id, accion: 'Creación', tabla: 'roles', registroId: id, nuevo: req.validated });
  res.status(201).json(await db('roles').where('id', id).first());
}));

router.put('/:id', requirePermission('roles.editar'), validate(roleSchema), asyncHandler(async (req, res) => {
  const anterior = await db('roles').where('id', req.params.id).first();
  if (!anterior) throw notFound();
  if (anterior.nombre === 'super-admin') {
    throw new AppError('El rol super-admin no se puede modificar', 422);
  }
  const { permisos, ...data } = req.validated;
  await db.transaction(async (trx) => {
    await trx('roles').where('id', anterior.id).update({ ...data, updated_at: db.fn.now() });
    await trx('role_permissions').where('role_id', anterior.id).del();
    if (permisos.length) {
      await trx('role_permissions').insert(permisos.map((p) => ({ role_id: anterior.id, permission_id: p })));
    }
  });
  await audit({ userId: req.user.id, accion: 'Edición', tabla: 'roles', registroId: anterior.id, anterior, nuevo: req.validated });
  res.json(await db('roles').where('id', anterior.id).first());
}));

router.delete('/:id', requirePermission('roles.editar'), asyncHandler(async (req, res) => {
  const rol = await db('roles').where('id', req.params.id).first();
  if (!rol) throw notFound();
  if (rol.nombre === 'super-admin') throw new AppError('El rol super-admin no se puede eliminar', 422);
  const enUso = await db('users').where('role_id', rol.id).where('active', 1).first();
  if (enUso) throw new AppError('Hay usuarios activos con este rol', 422);
  await db('roles').where('id', rol.id).update({ estado: 0, updated_at: db.fn.now() });
  await audit({ userId: req.user.id, accion: 'Eliminación', tabla: 'roles', registroId: rol.id, anterior: rol });
  res.json({ ok: true });
}));

export default router;
