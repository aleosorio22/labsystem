const express = require('express');
const { z } = require('zod');
const { asyncHandler } = require('../../../core/errors');
const { authMiddleware, requirePermission } = require('../../../core/middlewares/authMiddleware');
const { validate } = require('../../../core/middlewares/validateMiddleware');
const pacienteController = require('../controllers/pacienteController');

const router = express.Router();
router.use(authMiddleware);

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

router.get('/', requirePermission('pacientes.ver'), asyncHandler(pacienteController.getAll));
router.get('/cumpleanios', requirePermission('pacientes.ver'), asyncHandler(pacienteController.getCumpleanios));
router.get('/:id', requirePermission('pacientes.ver'), asyncHandler(pacienteController.getById));
router.post('/', requirePermission('pacientes.crear'), validate(pacienteSchema), asyncHandler(pacienteController.create));
router.put('/:id', requirePermission('pacientes.editar'), validate(pacienteSchema.partial()), asyncHandler(pacienteController.update));
router.delete('/:id', requirePermission('pacientes.eliminar'), asyncHandler(pacienteController.eliminar));

module.exports = router;
