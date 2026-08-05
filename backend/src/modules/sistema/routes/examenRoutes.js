const express = require('express');
const { z } = require('zod');
const { asyncHandler } = require('../../../core/errors');
const { authMiddleware, requirePermission } = require('../../../core/middlewares/authMiddleware');
const { validate } = require('../../../core/middlewares/validateMiddleware');
const examenController = require('../controllers/examenController');

const router = express.Router();
router.use(authMiddleware);

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

const comboSchema = z.object({
  id_examen_principal: z.coerce.number().int().positive(),
  internos: z.array(z.coerce.number().int().positive()).min(1, 'Agrega al menos un examen interno'),
});

router.get('/', requirePermission('examenes.ver', 'ordenes.ver'), asyncHandler(examenController.getAll));
router.get('/vendibles', requirePermission('ordenes.ver', 'ordenes.crear'), asyncHandler(examenController.getVendibles));
router.get('/combos', requirePermission('examenes.ver'), asyncHandler(examenController.getCombos));
router.put('/combos', requirePermission('examenes.editar'), validate(comboSchema), asyncHandler(examenController.guardarCombo));
router.delete('/combos/:idPrincipal', requirePermission('examenes.editar'), asyncHandler(examenController.eliminarCombo));
router.get('/:id', requirePermission('examenes.ver'), asyncHandler(examenController.getById));
router.post('/', requirePermission('examenes.crear'), validate(examenSchema), asyncHandler(examenController.create));
router.put('/:id', requirePermission('examenes.editar'), validate(examenSchema.partial()), asyncHandler(examenController.update));
router.delete('/:id', requirePermission('examenes.eliminar'), asyncHandler(examenController.eliminar));

module.exports = router;
