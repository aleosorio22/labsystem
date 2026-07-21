import { Router } from 'express';
import { db } from '../db/knex.js';
import { asyncHandler, notFound } from './errors.js';
import { authenticate, requirePermission } from './middlewares/auth.js';
import { validate } from './middlewares/validate.js';
import { audit } from './audit.js';

/**
 * Fábrica de CRUD para catálogos simples con columna `estado` (borrado lógico).
 *
 * options: {
 *   tabla, schema (zod), permisoBase ('catalogos' por defecto),
 *   searchColumns: ['nombre'], orderBy: 'nombre'
 * }
 */
export function crudRouter({ tabla, schema, permisoBase = 'catalogos', searchColumns = ['nombre'], orderBy = 'nombre' }) {
  const router = Router();
  router.use(authenticate);

  router.get('/', requirePermission(`${permisoBase}.ver`), asyncHandler(async (req, res) => {
    const { q, incluirInactivos } = req.query;
    let query = db(tabla).select('*');
    if (!incluirInactivos) query = query.where('estado', 1);
    if (q) {
      query = query.where((b) => {
        for (const col of searchColumns) b.orWhere(col, 'like', `%${q}%`);
      });
    }
    res.json(await query.orderBy(orderBy));
  }));

  router.get('/:id', requirePermission(`${permisoBase}.ver`), asyncHandler(async (req, res) => {
    const row = await db(tabla).where('id', req.params.id).first();
    if (!row) throw notFound();
    res.json(row);
  }));

  router.post('/', requirePermission(`${permisoBase}.crear`), validate(schema), asyncHandler(async (req, res) => {
    const [id] = await db(tabla).insert(req.validated);
    const row = await db(tabla).where('id', id).first();
    await audit({ userId: req.user.id, accion: 'Creación', tabla, registroId: id, nuevo: row });
    res.status(201).json(row);
  }));

  router.put('/:id', requirePermission(`${permisoBase}.editar`), validate(schema.partial()), asyncHandler(async (req, res) => {
    const anterior = await db(tabla).where('id', req.params.id).first();
    if (!anterior) throw notFound();
    await db(tabla).where('id', req.params.id).update({ ...req.validated, updated_at: db.fn.now() });
    const row = await db(tabla).where('id', req.params.id).first();
    await audit({ userId: req.user.id, accion: 'Edición', tabla, registroId: anterior.id, anterior, nuevo: row });
    res.json(row);
  }));

  router.delete('/:id', requirePermission(`${permisoBase}.eliminar`), asyncHandler(async (req, res) => {
    const anterior = await db(tabla).where('id', req.params.id).first();
    if (!anterior) throw notFound();
    await db(tabla).where('id', req.params.id).update({ estado: 0, updated_at: db.fn.now() });
    await audit({ userId: req.user.id, accion: 'Eliminación', tabla, registroId: anterior.id, anterior });
    res.json({ ok: true });
  }));

  return router;
}
