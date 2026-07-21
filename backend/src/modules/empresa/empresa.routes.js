import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/knex.js';
import { asyncHandler } from '../../core/errors.js';
import { authenticate, requirePermission } from '../../core/middlewares/auth.js';
import { validate } from '../../core/middlewares/validate.js';
import { audit } from '../../core/audit.js';

const router = Router();
router.use(authenticate);

const empresaSchema = z.object({
  nit: z.string().max(30).optional().nullable(),
  nombre_contable: z.string().max(191).optional().nullable(),
  nombre_comercial: z.string().max(191).optional().nullable(),
  direccion: z.string().max(255).optional().nullable(),
  telefonos: z.string().max(100).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  no_patente: z.string().max(100).optional().nullable(),
});

router.get('/', requirePermission('empresa.ver'), asyncHandler(async (_req, res) => {
  res.json(await db('empresa').first());
}));

router.put('/', requirePermission('empresa.editar'), validate(empresaSchema), asyncHandler(async (req, res) => {
  const anterior = await db('empresa').first();
  const data = { ...req.validated };
  if (data.email === '') data.email = null;
  await db('empresa').where('id', anterior.id).update({ ...data, updated_at: db.fn.now() });
  const row = await db('empresa').first();
  await audit({ userId: req.user.id, accion: 'Edición', tabla: 'empresa', registroId: anterior.id, anterior, nuevo: row });
  res.json(row);
}));

export default router;
