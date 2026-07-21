import { Router } from 'express';
import { z } from 'zod';
import { crudRouter } from '../../core/crud.js';
import { db } from '../../db/knex.js';
import { authenticate, requirePermission } from '../../core/middlewares/auth.js';
import { asyncHandler } from '../../core/errors.js';

const router = Router();

const nombreSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  estado: z.coerce.boolean().optional(),
});
const nombreOrdenSchema = nombreSchema.extend({
  orden: z.coerce.number().int().min(0).optional(),
});

router.use('/sexos', crudRouter({ tabla: 'sexo', schema: nombreSchema }));
router.use('/unidades-medida', crudRouter({ tabla: 'unidad_medida', schema: nombreSchema }));
router.use('/categorias-examen', crudRouter({ tabla: 'categoria_examen', schema: nombreOrdenSchema }));
router.use('/palabras-cualitativo', crudRouter({ tabla: 'palabra_cualitativo', schema: nombreSchema }));
router.use('/categorias-heces', crudRouter({ tabla: 'categoria_heces', schema: nombreOrdenSchema, orderBy: 'orden' }));
router.use('/categorias-orina', crudRouter({ tabla: 'categoria_orinas', schema: nombreOrdenSchema, orderBy: 'orden' }));

const paramHecesSchema = z.object({
  categoria_heces_id: z.coerce.number().int().positive(),
  nombre: z.string().min(1),
  estado: z.coerce.boolean().optional(),
});
const paramOrinaSchema = z.object({
  categoria_orina_id: z.coerce.number().int().positive(),
  nombre: z.string().min(1),
  estado: z.coerce.boolean().optional(),
});

router.use('/parametros-heces', crudRouter({ tabla: 'parametros_heces', schema: paramHecesSchema }));
router.use('/parametros-orina', crudRouter({ tabla: 'parametros_orinas', schema: paramOrinaSchema }));

// Tipos de examen: solo lectura (su semántica está ligada al código)
router.get('/tipos-examen', authenticate, requirePermission('catalogos.ver', 'examenes.ver'),
  asyncHandler(async (_req, res) => {
    res.json(await db('tipo_examen').where('estado', 1).orderBy('id'));
  }));

export default router;
