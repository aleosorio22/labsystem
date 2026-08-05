const express = require('express');
const { z } = require('zod');
const { asyncHandler } = require('../../../core/errors');
const { authMiddleware, requirePermission } = require('../../../core/middlewares/authMiddleware');
const { validate } = require('../../../core/middlewares/validateMiddleware');
const userController = require('../controllers/userController');

const router = express.Router();
router.use(authMiddleware);

const userSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  username: z.string().min(3, 'Mínimo 3 caracteres'),
  email: z.string().email('Correo inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres').optional(),
  role_id: z.coerce.number().int().positive('Rol requerido'),
  active: z.coerce.boolean().default(true),
});

router.get('/', requirePermission('usuarios.ver'), asyncHandler(userController.getAll));
router.post('/', requirePermission('usuarios.crear'), validate(userSchema), asyncHandler(userController.create));
router.put('/:id', requirePermission('usuarios.editar'), validate(userSchema.partial()), asyncHandler(userController.update));
router.delete('/:id', requirePermission('usuarios.eliminar'), asyncHandler(userController.desactivar));

module.exports = router;
