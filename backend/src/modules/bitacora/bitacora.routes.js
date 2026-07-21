import { Router } from 'express';
import { db } from '../../db/knex.js';
import { asyncHandler } from '../../core/errors.js';
import { authenticate, requirePermission } from '../../core/middlewares/auth.js';

const router = Router();
router.use(authenticate, requirePermission('bitacora.ver'));

router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 30, tabla, accion, desde, hasta } = req.query;
  let query = db('bitacora as b')
    .leftJoin('users as u', 'b.user_id', 'u.id')
    .select('b.*', 'u.name as usuario');

  if (tabla) query = query.where('b.nombre_tabla', tabla);
  if (accion) query = query.where('b.accion', accion);
  if (desde) query = query.whereRaw('DATE(b.created_at) >= ?', [desde]);
  if (hasta) query = query.whereRaw('DATE(b.created_at) <= ?', [hasta]);

  const [{ total }] = await query.clone().clearSelect().count('* as total');
  const data = await query.orderBy('b.id', 'desc')
    .limit(+limit).offset((Math.max(1, +page) - 1) * +limit);
  res.json({ data, total, page: +page, pages: Math.ceil(total / +limit) });
}));

export default router;
