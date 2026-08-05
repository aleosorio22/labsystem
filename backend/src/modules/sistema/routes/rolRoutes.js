const express = require('express');
const { z } = require('zod');
const { asyncHandler } = require('../../../core/errors');
const { authMiddleware, requirePermission } = require('../../../core/middlewares/authMiddleware');
const { validate } = require('../../../core/middlewares/validateMiddleware');
const rolController = require('../controllers/rolController');

const router = express.Router();
router.use(authMiddleware);

const roleSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  descripcion: z.string().optional().nullable(),
  permisos: z.array(z.number().int()).default([]),
});

router.get('/permisos', requirePermission('roles.ver', 'usuarios.ver'), asyncHandler(rolController.getPermisos));
router.get('/', requirePermission('roles.ver', 'usuarios.ver'), asyncHandler(rolController.getAll));
router.post('/', requirePermission('roles.editar'), validate(roleSchema), asyncHandler(rolController.create));
router.put('/:id', requirePermission('roles.editar'), validate(roleSchema), asyncHandler(rolController.update));
router.delete('/:id', requirePermission('roles.editar'), asyncHandler(rolController.eliminar));

module.exports = router;
