const express = require('express');
const { z } = require('zod');
const { asyncHandler } = require('../../../core/errors');
const { authMiddleware, requirePermission } = require('../../../core/middlewares/authMiddleware');
const { validate } = require('../../../core/middlewares/validateMiddleware');
const empresaController = require('../controllers/empresaController');

const router = express.Router();
router.use(authMiddleware);

const empresaSchema = z.object({
  nit: z.string().max(30).optional().nullable(),
  nombre_contable: z.string().max(191).optional().nullable(),
  nombre_comercial: z.string().max(191).optional().nullable(),
  direccion: z.string().max(255).optional().nullable(),
  telefonos: z.string().max(100).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  no_patente: z.string().max(100).optional().nullable(),
});

router.get('/', requirePermission('empresa.ver'), asyncHandler(empresaController.get));
router.put('/', requirePermission('empresa.editar'), validate(empresaSchema), asyncHandler(empresaController.update));

module.exports = router;
