const express = require('express');
const { z } = require('zod');
const { AppError, asyncHandler } = require('../../../core/errors');
const { authMiddleware, requirePermission } = require('../../../core/middlewares/authMiddleware');
const { validate } = require('../../../core/middlewares/validateMiddleware');
const { catalogos } = require('../models/catalogoModel');
const catalogoController = require('../controllers/catalogoController');

const router = express.Router();
router.use(authMiddleware);

// ── Esquemas por catálogo ───────────────────────────────────────────

const nombreSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  estado: z.coerce.boolean().optional(),
});
const nombreOrdenSchema = nombreSchema.extend({
  orden: z.coerce.number().int().min(0).optional(),
});
const paramHecesSchema = nombreSchema.extend({
  categoria_heces_id: z.coerce.number().int().positive(),
});
const paramOrinaSchema = nombreSchema.extend({
  categoria_orina_id: z.coerce.number().int().positive(),
});

const schemas = {
  sexos: nombreSchema,
  'unidades-medida': nombreSchema,
  'categorias-examen': nombreOrdenSchema,
  'palabras-cualitativo': nombreSchema,
  'categorias-heces': nombreOrdenSchema,
  'categorias-orina': nombreOrdenSchema,
  'parametros-heces': paramHecesSchema,
  'parametros-orina': paramOrinaSchema,
};

// Tipos de examen: solo lectura (su semántica está ligada al código)
router.get('/tipos-examen', requirePermission('catalogos.ver', 'examenes.ver'),
  asyncHandler(catalogoController.getTiposExamen));

// Lista blanca: el resto de rutas solo acepta catálogos registrados
router.param('catalogo', (req, _res, next, nombre) => {
  if (!catalogos[nombre]) return next(new AppError('Catálogo no encontrado', 404));
  next();
});

/** Valida el body contra el esquema del catálogo de la URL */
const validarCatalogo = (parcial = false) => (req, res, next) => {
  const schema = schemas[req.params.catalogo];
  return validate(parcial ? schema.partial() : schema)(req, res, next);
};

router.get('/:catalogo', requirePermission('catalogos.ver'), asyncHandler(catalogoController.getAll));
router.get('/:catalogo/:id', requirePermission('catalogos.ver'), asyncHandler(catalogoController.getById));
router.post('/:catalogo', requirePermission('catalogos.crear'), validarCatalogo(), asyncHandler(catalogoController.create));
router.put('/:catalogo/:id', requirePermission('catalogos.editar'), validarCatalogo(true), asyncHandler(catalogoController.update));
router.delete('/:catalogo/:id', requirePermission('catalogos.eliminar'), asyncHandler(catalogoController.eliminar));

module.exports = router;
