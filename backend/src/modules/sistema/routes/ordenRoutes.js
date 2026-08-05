const express = require('express');
const { z } = require('zod');
const { asyncHandler } = require('../../../core/errors');
const { authMiddleware, requirePermission } = require('../../../core/middlewares/authMiddleware');
const { validate } = require('../../../core/middlewares/validateMiddleware');
const ordenController = require('../controllers/ordenController');
const { ESTADO_DOC } = require('../models/ordenModel');

const router = express.Router();
router.use(authMiddleware);

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

const anularSchema = z.object({
  password_actual: z.string().min(1, 'Contraseña requerida'),
});

const resultadosSchema = z.object({
  resultados: z.array(z.object({
    id_detalle: z.coerce.number().int().positive(),
    resultado: z.string().nullable().default(''),
  })),
});

const hecesSchema = z.object({
  filas: z.array(z.object({
    id_categoria_heces: z.coerce.number().int().positive(),
    id_parametro_heces: z.coerce.number().int().positive(),
  })),
});

const orinaSchema = z.object({
  filas: z.array(z.object({
    id_categoria_orina: z.coerce.number().int().positive(),
    id_parametro_orina: z.coerce.number().int().positive().optional().nullable(),
    valor: z.string().optional().nullable(),
  })),
});

router.get('/', requirePermission('ordenes.ver', 'resultados.ver'), asyncHandler(ordenController.getAll));
router.get('/:id', requirePermission('ordenes.ver', 'resultados.ver'), asyncHandler(ordenController.getById));
router.post('/', requirePermission('ordenes.crear'), validate(ordenSchema), asyncHandler(ordenController.create));
router.put('/:id', requirePermission('ordenes.editar'), validate(ordenSchema), asyncHandler(ordenController.update));
router.post('/:id/anular', requirePermission('ordenes.eliminar'), validate(anularSchema), asyncHandler(ordenController.anular));

// Transiciones de estado del documento
router.post('/:id/convertir-venta', requirePermission('ordenes.convertir'),
  asyncHandler(ordenController.transicion(ESTADO_DOC.ANALISIS, 'Cotización pasada a análisis')));
router.post('/:id/regresar-cotizacion', requirePermission('ordenes.convertir'),
  asyncHandler(ordenController.transicion(ESTADO_DOC.COTIZACION, 'Análisis regresado a cotización')));
router.post('/:id/finalizar', requirePermission('resultados.finalizar'),
  asyncHandler(ordenController.transicion(ESTADO_DOC.FINALIZADO, 'Análisis finalizado')));
router.post('/:id/reabrir', requirePermission('resultados.reabrir'),
  asyncHandler(ordenController.transicion(ESTADO_DOC.ANALISIS, 'Análisis reabierto')));

// Captura de resultados
router.post('/:id/resultados', requirePermission('resultados.capturar'), validate(resultadosSchema),
  asyncHandler(ordenController.guardarResultados));
router.post('/:id/resultados-heces', requirePermission('resultados.capturar'), validate(hecesSchema),
  asyncHandler(ordenController.guardarResultadosHeces));
router.post('/:id/resultados-orina', requirePermission('resultados.capturar'), validate(orinaSchema),
  asyncHandler(ordenController.guardarResultadosOrina));

// PDFs y WhatsApp
router.get('/:id/pdf/cotizacion', requirePermission('ordenes.ver'), asyncHandler(ordenController.pdfCotizacion));
router.get('/:id/pdf/resultados', requirePermission('resultados.imprimir'), asyncHandler(ordenController.pdfResultados));
router.get('/:id/whatsapp', requirePermission('resultados.imprimir'), asyncHandler(ordenController.whatsapp));

module.exports = router;
