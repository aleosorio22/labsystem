import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/knex.js';
import { asyncHandler, notFound } from '../../core/errors.js';
import { authenticate, requirePermission } from '../../core/middlewares/auth.js';
import { validate } from '../../core/middlewares/validate.js';
import { audit } from '../../core/audit.js';

const router = Router();
router.use(authenticate);

const pacienteSchema = z.object({
  dpi: z.string().max(30).optional().nullable(),
  nombres: z.string().min(1, 'Nombres requeridos'),
  apellidos: z.string().min(1, 'Apellidos requeridos'),
  mail: z.string().email('Correo inválido').optional().nullable().or(z.literal('')),
  telefono: z.string().max(30).optional().nullable(),
  celular: z.string().max(30).optional().nullable(),
  direccion: z.string().max(255).optional().nullable(),
  nit: z.string().max(20).optional().nullable(),
  id_sexo: z.coerce.number().int().positive('Sexo requerido'),
  fecha_nacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  tipo_sangre: z.string().max(10).optional().nullable(),
});

const baseSelect = () => db('paciente')
  .join('sexo', 'paciente.id_sexo', 'sexo.id')
  .select('paciente.*', 'sexo.nombre as sexo',
    db.raw('TIMESTAMPDIFF(YEAR, paciente.fecha_nacimiento, CURDATE()) as edad'));

router.get('/', requirePermission('pacientes.ver'), asyncHandler(async (req, res) => {
  const { q, page = 1, limit = 20 } = req.query;
  const offset = (Math.max(1, +page) - 1) * +limit;

  let query = baseSelect().where('paciente.estado', 1);
  if (q) {
    query = query.where((b) => b
      .orWhere(db.raw("CONCAT(paciente.nombres, ' ', paciente.apellidos)"), 'like', `%${q}%`)
      .orWhere('paciente.dpi', 'like', `%${q}%`)
      .orWhere('paciente.celular', 'like', `%${q}%`));
  }
  const [{ total }] = await query.clone().clearSelect().count('* as total');
  const data = await query.orderBy('paciente.id', 'desc').limit(+limit).offset(offset);
  res.json({ data, total, page: +page, pages: Math.ceil(total / +limit) });
}));

router.get('/cumpleanios', requirePermission('pacientes.ver'), asyncHandler(async (_req, res) => {
  const data = await baseSelect()
    .where('paciente.estado', 1)
    .whereRaw('MONTH(paciente.fecha_nacimiento) = MONTH(CURDATE())')
    .orderByRaw('DAY(paciente.fecha_nacimiento)');
  res.json(data);
}));

router.get('/:id', requirePermission('pacientes.ver'), asyncHandler(async (req, res) => {
  const row = await baseSelect().where('paciente.id', req.params.id).first();
  if (!row) throw notFound('Paciente no encontrado');
  res.json(row);
}));

router.post('/', requirePermission('pacientes.crear'), validate(pacienteSchema), asyncHandler(async (req, res) => {
  const data = { ...req.validated, mail: req.validated.mail || null };
  const [id] = await db('paciente').insert(data);
  const row = await baseSelect().where('paciente.id', id).first();
  await audit({ userId: req.user.id, accion: 'Creación', tabla: 'paciente', registroId: id, nuevo: row });
  res.status(201).json(row);
}));

router.put('/:id', requirePermission('pacientes.editar'), validate(pacienteSchema.partial()), asyncHandler(async (req, res) => {
  const anterior = await db('paciente').where('id', req.params.id).first();
  if (!anterior) throw notFound('Paciente no encontrado');
  const data = { ...req.validated };
  if (data.mail === '') data.mail = null;
  await db('paciente').where('id', anterior.id).update({ ...data, updated_at: db.fn.now() });
  const row = await baseSelect().where('paciente.id', anterior.id).first();
  await audit({ userId: req.user.id, accion: 'Edición', tabla: 'paciente', registroId: anterior.id, anterior, nuevo: row });
  res.json(row);
}));

router.delete('/:id', requirePermission('pacientes.eliminar'), asyncHandler(async (req, res) => {
  const anterior = await db('paciente').where('id', req.params.id).first();
  if (!anterior) throw notFound('Paciente no encontrado');
  await db('paciente').where('id', anterior.id).update({ estado: 0, updated_at: db.fn.now() });
  await audit({ userId: req.user.id, accion: 'Eliminación', tabla: 'paciente', registroId: anterior.id, anterior });
  res.json({ ok: true });
}));

export default router;
