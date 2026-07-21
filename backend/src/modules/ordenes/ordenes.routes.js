import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/knex.js';
import { asyncHandler, AppError } from '../../core/errors.js';
import { authenticate, requirePermission } from '../../core/middlewares/auth.js';
import { validate } from '../../core/middlewares/validate.js';
import { audit } from '../../core/audit.js';
import { compararPassword } from '../auth/auth.routes.js';
import * as service from './ordenes.service.js';
import { ESTADO_DOC } from './ordenes.service.js';
import { pdfCotizacion, pdfResultados } from './ordenes.pdf.js';

const router = Router();
router.use(authenticate);

const itemSchema = z.object({
  id_examen: z.coerce.number().int().positive(),
  cantidad: z.coerce.number().int().min(1).default(1),
  precio: z.coerce.number().min(0),
  descuento: z.coerce.number().min(0).default(0),
  comision: z.coerce.number().min(0).default(0),
  pprueba: z.coerce.number().min(0).optional(),
  insumos: z.coerce.number().min(0).optional(),
  resultado: z.string().optional().nullable(),
});

const ordenSchema = z.object({
  id_paciente: z.coerce.number().int().positive('Paciente requerido'),
  id_medico: z.coerce.number().int().positive('Médico requerido'),
  fecha_cotizacion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  observaciones: z.string().max(350).optional().nullable(),
  estado_documento: z.coerce.number().int().min(1).max(2).optional(),
  id_medico_hijo: z.coerce.number().int().positive().optional().nullable(),
  comision_medico_hijo: z.coerce.number().min(0).default(0),
  coniva: z.coerce.boolean().default(true),
  items: z.array(itemSchema).min(1, 'Agrega al menos un examen'),
});

router.get('/', requirePermission('ordenes.ver', 'resultados.ver'), asyncHandler(async (req, res) => {
  const { estado_documento, q, page, limit, desde, hasta } = req.query;
  res.json(await service.listarOrdenes({
    estadoDocumento: estado_documento ? Number(estado_documento) : undefined,
    q, page, limit, desde, hasta,
  }));
}));

router.get('/:id', requirePermission('ordenes.ver', 'resultados.ver'), asyncHandler(async (req, res) => {
  res.json(await service.obtenerOrden(req.params.id));
}));

router.post('/', requirePermission('ordenes.crear'), validate(ordenSchema), asyncHandler(async (req, res) => {
  const id = await service.crearOrden(req.validated, req.user.id);
  await audit({ userId: req.user.id, accion: 'Creación', tabla: 'cotizacion', registroId: id, nuevo: req.validated });
  res.status(201).json(await service.obtenerOrden(id));
}));

router.put('/:id', requirePermission('ordenes.editar'), validate(ordenSchema), asyncHandler(async (req, res) => {
  const anterior = await service.actualizarOrden(req.params.id, req.validated);
  await audit({ userId: req.user.id, accion: 'Edición', tabla: 'cotizacion', registroId: anterior.id, anterior, nuevo: req.validated });
  res.json(await service.obtenerOrden(req.params.id));
}));

/**
 * Anular orden: igual que el sistema anterior, exige reconfirmar la
 * contraseña del usuario que la anula.
 */
router.post('/:id/anular', requirePermission('ordenes.eliminar'),
  validate(z.object({ password_actual: z.string().min(1, 'Contraseña requerida') })),
  asyncHandler(async (req, res) => {
    const user = await db('users').where('id', req.user.id).first();
    if (!compararPassword(req.validated.password_actual, user.password)) {
      throw new AppError('La contraseña no coincide', 422);
    }
    const orden = await db('cotizacion').where({ id: req.params.id, estado: 1 }).first();
    if (!orden) throw new AppError('Orden no encontrada', 404);
    await db('cotizacion').where('id', orden.id).update({ estado: 0, updated_at: db.fn.now() });
    await audit({ userId: req.user.id, accion: 'Anulación', tabla: 'cotizacion', registroId: orden.id, anterior: orden });
    res.json({ ok: true });
  }));

// Transiciones de estado del documento
const transiciones = [
  ['convertir-venta', ESTADO_DOC.ANALISIS, 'ordenes.convertir', 'Cotización pasada a análisis'],
  ['regresar-cotizacion', ESTADO_DOC.COTIZACION, 'ordenes.convertir', 'Análisis regresado a cotización'],
  ['finalizar', ESTADO_DOC.FINALIZADO, 'resultados.finalizar', 'Análisis finalizado'],
  ['reabrir', ESTADO_DOC.ANALISIS, 'resultados.reabrir', 'Análisis reabierto'],
];
for (const [ruta, estado, permiso, accion] of transiciones) {
  router.post(`/:id/${ruta}`, requirePermission(permiso), asyncHandler(async (req, res) => {
    const anterior = await service.cambiarEstadoDocumento(req.params.id, estado);
    await audit({
      userId: req.user.id, accion, tabla: 'cotizacion', registroId: anterior.id,
      anterior: { estado_documento: anterior.estado_documento }, nuevo: { estado_documento: estado },
    });
    res.json({ ok: true });
  }));
}

// Captura de resultados
router.post('/:id/resultados', requirePermission('resultados.capturar'),
  validate(z.object({
    resultados: z.array(z.object({
      id_detalle: z.coerce.number().int().positive(),
      resultado: z.string().nullable().default(''),
    })),
  })),
  asyncHandler(async (req, res) => {
    await service.guardarResultados(req.params.id, req.validated.resultados);
    await audit({ userId: req.user.id, accion: 'Captura de resultados', tabla: 'cotizacion_detalle', registroId: +req.params.id, nuevo: req.validated });
    res.json({ ok: true });
  }));

router.post('/:id/resultados-heces', requirePermission('resultados.capturar'),
  validate(z.object({
    filas: z.array(z.object({
      id_categoria_heces: z.coerce.number().int().positive(),
      id_parametro_heces: z.coerce.number().int().positive(),
    })),
  })),
  asyncHandler(async (req, res) => {
    await service.guardarResultadoHeces(req.params.id, req.validated.filas);
    await audit({ userId: req.user.id, accion: 'Captura resultados heces', tabla: 'resultado_heces', registroId: +req.params.id, nuevo: req.validated });
    res.json({ ok: true });
  }));

router.post('/:id/resultados-orina', requirePermission('resultados.capturar'),
  validate(z.object({
    filas: z.array(z.object({
      id_categoria_orina: z.coerce.number().int().positive(),
      id_parametro_orina: z.coerce.number().int().positive().optional().nullable(),
      valor: z.string().optional().nullable(),
    })),
  })),
  asyncHandler(async (req, res) => {
    await service.guardarResultadoOrina(req.params.id, req.validated.filas);
    await audit({ userId: req.user.id, accion: 'Captura resultados orina', tabla: 'resultado_orina', registroId: +req.params.id, nuevo: req.validated });
    res.json({ ok: true });
  }));

// PDFs
const streamPdf = (res, doc, nombre) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${nombre}"`);
  doc.pipe(res);
  doc.end();
};

router.get('/:id/pdf/cotizacion', requirePermission('ordenes.ver'), asyncHandler(async (req, res) => {
  streamPdf(res, await pdfCotizacion(req.params.id), `cotizacion_${req.params.id}.pdf`);
}));

router.get('/:id/pdf/resultados', requirePermission('resultados.imprimir'), asyncHandler(async (req, res) => {
  streamPdf(res, await pdfResultados(req.params.id), `resultados_${req.params.id}.pdf`);
}));

/** Datos para compartir por WhatsApp (el frontend abre wa.me) */
router.get('/:id/whatsapp', requirePermission('resultados.imprimir'), asyncHandler(async (req, res) => {
  const orden = await service.obtenerOrden(req.params.id);
  res.json({
    celular: orden.celular_paciente,
    mensaje: `Estimado(a) ${orden.paciente}, sus resultados de laboratorio de la orden #${orden.id} ya están listos.`,
  });
}));

export default router;
