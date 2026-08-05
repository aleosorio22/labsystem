const express = require('express');
const { z } = require('zod');
const { asyncHandler } = require('../../../core/errors');
const { authMiddleware, requirePermission } = require('../../../core/middlewares/authMiddleware');
const { validate } = require('../../../core/middlewares/validateMiddleware');
const reporteController = require('../controllers/reporteController');

const router = express.Router();
router.use(authMiddleware, requirePermission('reportes.ver', 'dashboard.ver'));

const rangoSchema = z.object({
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

router.get('/dashboard', asyncHandler(reporteController.dashboard));
router.get('/ventas', validate(rangoSchema, 'query'), asyncHandler(reporteController.ventas));
router.get('/ganancias', validate(rangoSchema, 'query'), asyncHandler(reporteController.ganancias));
router.get('/comisiones-medicos', validate(rangoSchema, 'query'), asyncHandler(reporteController.comisionesMedicos));

module.exports = router;
