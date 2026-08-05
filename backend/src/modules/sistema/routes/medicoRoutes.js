const express = require('express');
const { z } = require('zod');
const { asyncHandler } = require('../../../core/errors');
const { authMiddleware, requirePermission } = require('../../../core/middlewares/authMiddleware');
const { validate } = require('../../../core/middlewares/validateMiddleware');
const medicoController = require('../controllers/medicoController');

const router = express.Router();
router.use(authMiddleware);

const medicoSchema = z.object({
  nombres: z.string().min(1, 'Nombres requeridos'),
  apellidos: z.string().min(1, 'Apellidos requeridos'),
  no_cuenta: z.string().max(191).optional().nullable(),
  telefono: z.string().max(30).optional().nullable(),
  celular: z.string().max(30).optional().nullable(),
  direccion: z.string().max(255).optional().nullable(),
  mail: z.string().email('Correo inválido').optional().nullable().or(z.literal('')),
  porcentaje: z.coerce.number().int().min(0).max(100).default(0),
  comision: z.coerce.number().int().min(0).default(0),
  socio: z.coerce.boolean().default(false),
  estado: z.coerce.boolean().optional(),
});

router.get('/', requirePermission('medicos.ver'), asyncHandler(medicoController.getAll));
router.get('/:id', requirePermission('medicos.ver'), asyncHandler(medicoController.getById));
router.post('/', requirePermission('medicos.crear'), validate(medicoSchema), asyncHandler(medicoController.create));
router.put('/:id', requirePermission('medicos.editar'), validate(medicoSchema.partial()), asyncHandler(medicoController.update));
router.delete('/:id', requirePermission('medicos.eliminar'), asyncHandler(medicoController.eliminar));

module.exports = router;
