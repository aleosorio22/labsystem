import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/knex.js';
import { asyncHandler, notFound, AppError } from '../../core/errors.js';
import { authenticate, requirePermission } from '../../core/middlewares/auth.js';
import { validate } from '../../core/middlewares/validate.js';
import { audit } from '../../core/audit.js';

const router = Router();
router.use(authenticate);

const examenSchema = z.object({
  id_categoria: z.coerce.number().int().positive('Categoría requerida'),
  codigo: z.string().min(1, 'Código requerido').max(60),
  nombre: z.string().min(1, 'Nombre requerido'),
  precio: z.coerce.number().min(0),
  rango_inferior: z.coerce.number().optional().nullable(),
  rango_superior: z.coerce.number().optional().nullable(),
  valor_deseado: z.string().optional().nullable(),
  valor_craig: z.string().optional().nullable(),
  valor_bosnan: z.string().optional().nullable(),
  valor_scully: z.string().optional().nullable(),
  tipo_examen: z.coerce.number().int().min(1).max(6),
  id_unidad_medida: z.coerce.number().int().positive('Unidad requerida'),
  pprueba: z.coerce.number().min(0).default(0),
  insumos: z.coerce.number().min(0).default(0),
  estado: z.coerce.boolean().optional(),
});

const baseSelect = () => db('examen')
  .join('categoria_examen', 'examen.id_categoria', 'categoria_examen.id')
  .join('unidad_medida', 'examen.id_unidad_medida', 'unidad_medida.id')
  .join('tipo_examen', 'examen.tipo_examen', 'tipo_examen.id')
  .select('examen.*', 'categoria_examen.nombre as categoria',
    'unidad_medida.nombre as unidad_medida', 'tipo_examen.nombre as tipo');

router.get('/', requirePermission('examenes.ver', 'ordenes.ver'), asyncHandler(async (req, res) => {
  const { q, incluirInactivos } = req.query;
  let query = baseSelect();
  if (!incluirInactivos) query = query.where('examen.estado', 1);
  if (q) {
    query = query.where((b) => b
      .orWhere('examen.nombre', 'like', `%${q}%`)
      .orWhere('examen.codigo', 'like', `%${q}%`)
      .orWhere('categoria_examen.nombre', 'like', `%${q}%`));
  }
  res.json(await query.orderBy('examen.nombre'));
}));

/** Exámenes que se pueden vender: excluye los internos de combos */
router.get('/vendibles', requirePermission('ordenes.ver', 'ordenes.crear'), asyncHandler(async (_req, res) => {
  const internos = await db('combo_examen').where('es_principal', 0).pluck('id_examen');
  const rows = await baseSelect()
    .where('examen.estado', 1)
    .whereNotIn('examen.id', internos.length ? internos : [0])
    .orderBy('examen.nombre');
  res.json(rows);
}));

router.get('/combos', requirePermission('examenes.ver'), asyncHandler(async (_req, res) => {
  const combos = await db('combo_examen as c')
    .join('examen as e', 'c.id_examen', 'e.id')
    .select('c.*', 'e.nombre', 'e.codigo')
    .orderBy(['c.id_examen_principal', db.raw('c.es_principal desc'), 'c.id']);
  res.json(combos);
}));

const comboSchema = z.object({
  id_examen_principal: z.coerce.number().int().positive(),
  internos: z.array(z.coerce.number().int().positive()).min(1, 'Agrega al menos un examen interno'),
});

router.put('/combos', requirePermission('examenes.editar'), validate(comboSchema), asyncHandler(async (req, res) => {
  const { id_examen_principal, internos } = req.validated;
  if (internos.includes(id_examen_principal)) {
    throw new AppError('El examen principal no puede ser interno de sí mismo', 422);
  }
  await db.transaction(async (trx) => {
    await trx('combo_examen').where('id_examen_principal', id_examen_principal).del();
    await trx('combo_examen').insert({
      id_examen: id_examen_principal, es_principal: 1, es_secundario: 0,
      aparece_en_cotizacion: 1, id_examen_principal,
    });
    await trx('combo_examen').insert(internos.map((id, i) => ({
      id_examen: id, es_principal: 0, es_secundario: i === 0 ? 1 : 0,
      aparece_en_cotizacion: 0, id_examen_principal,
    })));
  });
  await audit({ userId: req.user.id, accion: 'Edición', tabla: 'combo_examen', registroId: id_examen_principal, nuevo: req.validated });
  res.json({ ok: true });
}));

router.delete('/combos/:idPrincipal', requirePermission('examenes.editar'), asyncHandler(async (req, res) => {
  await db('combo_examen').where('id_examen_principal', req.params.idPrincipal).del();
  await audit({ userId: req.user.id, accion: 'Eliminación', tabla: 'combo_examen', registroId: +req.params.idPrincipal });
  res.json({ ok: true });
}));

router.get('/:id', requirePermission('examenes.ver'), asyncHandler(async (req, res) => {
  const row = await baseSelect().where('examen.id', req.params.id).first();
  if (!row) throw notFound('Examen no encontrado');
  res.json(row);
}));

router.post('/', requirePermission('examenes.crear'), validate(examenSchema), asyncHandler(async (req, res) => {
  const existe = await db('examen').where('codigo', req.validated.codigo).first();
  if (existe) throw new AppError('El código ya existe', 422);
  const [id] = await db('examen').insert(req.validated);
  const row = await baseSelect().where('examen.id', id).first();
  await audit({ userId: req.user.id, accion: 'Creación', tabla: 'examen', registroId: id, nuevo: row });
  res.status(201).json(row);
}));

router.put('/:id', requirePermission('examenes.editar'), validate(examenSchema.partial()), asyncHandler(async (req, res) => {
  const anterior = await db('examen').where('id', req.params.id).first();
  if (!anterior) throw notFound('Examen no encontrado');
  if (req.validated.codigo) {
    const existe = await db('examen').where('codigo', req.validated.codigo)
      .whereNot('id', anterior.id).first();
    if (existe) throw new AppError('El código ya existe', 422);
  }
  await db('examen').where('id', anterior.id).update({ ...req.validated, updated_at: db.fn.now() });
  const row = await baseSelect().where('examen.id', anterior.id).first();
  await audit({ userId: req.user.id, accion: 'Edición', tabla: 'examen', registroId: anterior.id, anterior, nuevo: row });
  res.json(row);
}));

router.delete('/:id', requirePermission('examenes.eliminar'), asyncHandler(async (req, res) => {
  const anterior = await db('examen').where('id', req.params.id).first();
  if (!anterior) throw notFound('Examen no encontrado');
  await db('examen').where('id', anterior.id).update({ estado: 0, updated_at: db.fn.now() });
  await audit({ userId: req.user.id, accion: 'Eliminación', tabla: 'examen', registroId: anterior.id, anterior });
  res.json({ ok: true });
}));

export default router;
