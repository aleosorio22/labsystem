const express = require('express');
const { asyncHandler } = require('../../../core/errors');
const { authMiddleware, requirePermission } = require('../../../core/middlewares/authMiddleware');
const bitacoraController = require('../controllers/bitacoraController');

const router = express.Router();
router.use(authMiddleware, requirePermission('bitacora.ver'));

router.get('/', asyncHandler(bitacoraController.getAll));

module.exports = router;
