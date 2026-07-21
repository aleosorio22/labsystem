import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/knex.js';
import { asyncHandler } from '../../core/errors.js';
import { authenticate, requirePermission } from '../../core/middlewares/auth.js';
import { validate } from '../../core/middlewares/validate.js';

const router = Router();
router.use(authenticate, requirePermission('reportes.ver', 'dashboard.ver'));

const rangoSchema = z.object({
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** Resumen para el dashboard */
router.get('/dashboard', asyncHandler(async (_req, res) => {
  const [pacientes] = await db('paciente').where('estado', 1).count('* as n');
  const [ordenesHoy] = await db('cotizacion').where('estado', 1)
    .whereRaw('DATE(created_at) = CURDATE()').count('* as n');
  const [enProceso] = await db('cotizacion').where({ estado: 1, estado_documento: 2 }).count('* as n');
  const [finalizadosHoy] = await db('cotizacion').where({ estado: 1, estado_documento: 3 })
    .whereRaw('DATE(updated_at) = CURDATE()').count('* as n');
  const [ventasMes] = await db('cotizacion as c')
    .join('cotizacion_detalle as d', 'd.id_cotizacion', 'c.id')
    .where('c.estado', 1).where('d.estado', 1)
    .whereIn('c.estado_documento', [2, 3])
    .whereRaw('MONTH(c.fecha_cotizacion) = MONTH(CURDATE()) AND YEAR(c.fecha_cotizacion) = YEAR(CURDATE())')
    .sum('d.precio as total');

  const ultimasOrdenes = await db('cotizacion as c')
    .join('paciente as p', 'c.id_paciente', 'p.id')
    .where('c.estado', 1)
    .select('c.id', 'c.estado_documento', 'c.fecha_cotizacion',
      db.raw("CONCAT(p.nombres, ' ', p.apellidos) as paciente"))
    .orderBy('c.id', 'desc').limit(8);

  res.json({
    pacientes: +pacientes.n,
    ordenesHoy: +ordenesHoy.n,
    enProceso: +enProceso.n,
    finalizadosHoy: +finalizadosHoy.n,
    ventasMes: Number(ventasMes.total || 0),
    ultimasOrdenes,
  });
}));

/** Ventas por rango de fechas (ventas = estado_documento 2 o 3) */
router.get('/ventas', validate(rangoSchema, 'query'), asyncHandler(async (req, res) => {
  const { desde, hasta } = req.validated;
  const filas = await db('cotizacion as c')
    .join('cotizacion_detalle as d', 'd.id_cotizacion', 'c.id')
    .join('paciente as p', 'c.id_paciente', 'p.id')
    .join('medico as m', 'c.id_medico', 'm.id')
    .join('examen as e', 'd.id_examen', 'e.id')
    .where('c.estado', 1).where('d.estado', 1)
    .whereIn('c.estado_documento', [2, 3])
    .whereBetween('c.fecha_cotizacion', [desde, hasta])
    .select('c.id as orden', 'c.fecha_cotizacion',
      db.raw("CONCAT(p.nombres, ' ', p.apellidos) as paciente"),
      db.raw("CONCAT(m.nombres, ' ', m.apellidos) as medico"),
      'e.nombre as examen', 'd.precio', 'd.descuento')
    .orderBy(['c.fecha_cotizacion', 'c.id']);

  const total = filas.reduce((s, f) => s + Number(f.precio), 0);
  res.json({ filas, total });
}));

/** Ganancias: ventas menos costos y comisiones, agrupado por examen */
router.get('/ganancias', validate(rangoSchema, 'query'), asyncHandler(async (req, res) => {
  const { desde, hasta } = req.validated;
  const filas = await db('cotizacion as c')
    .join('cotizacion_detalle as d', 'd.id_cotizacion', 'c.id')
    .join('examen as e', 'd.id_examen', 'e.id')
    .where('c.estado', 1).where('d.estado', 1)
    .whereIn('c.estado_documento', [2, 3])
    .whereBetween('c.fecha_cotizacion', [desde, hasta])
    .groupBy('e.id', 'e.nombre')
    .select('e.nombre as examen',
      db.raw('COUNT(*) as cantidad'),
      db.raw('SUM(d.precio) as venta'),
      db.raw('SUM(d.pprueba) as costo_prueba'),
      db.raw('SUM(d.insumos) as costo_insumos'),
      db.raw('SUM(d.comision) as comisiones'),
      db.raw('SUM(d.precio - d.pprueba - d.insumos - d.comision) as ganancia'))
    .orderByRaw('venta desc');
  res.json({ filas });
}));

/** Comisiones por médico */
router.get('/comisiones-medicos', validate(rangoSchema, 'query'), asyncHandler(async (req, res) => {
  const { desde, hasta } = req.validated;
  const filas = await db('cotizacion as c')
    .join('cotizacion_detalle as d', 'd.id_cotizacion', 'c.id')
    .join('medico as m', 'c.id_medico', 'm.id')
    .where('c.estado', 1).where('d.estado', 1)
    .whereIn('c.estado_documento', [2, 3])
    .whereBetween('c.fecha_cotizacion', [desde, hasta])
    .groupBy('m.id', 'm.nombres', 'm.apellidos')
    .select(db.raw("CONCAT(m.nombres, ' ', m.apellidos) as medico"),
      db.raw('COUNT(DISTINCT c.id) as ordenes'),
      db.raw('SUM(d.precio) as venta'),
      db.raw('SUM(d.comision) as comision'))
    .orderByRaw('venta desc');
  res.json({ filas });
}));

export default router;
