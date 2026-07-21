import { AppError } from '../errors.js';

/**
 * Valida req.body (o req.query) contra un esquema zod.
 * Los datos validados/transformados quedan en req.validated.
 */
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      campo: i.path.join('.'),
      mensaje: i.message,
    }));
    return next(new AppError('Datos inválidos', 422, details));
  }
  req.validated = result.data;
  next();
};
