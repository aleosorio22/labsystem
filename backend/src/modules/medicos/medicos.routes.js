import { z } from 'zod';
import { crudRouter } from '../../core/crud.js';

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

export default crudRouter({
  tabla: 'medico',
  schema: medicoSchema,
  permisoBase: 'medicos',
  searchColumns: ['nombres', 'apellidos'],
  orderBy: 'apellidos',
});
