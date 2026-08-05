class AppError extends Error {
  constructor(message, status = 400, details = undefined) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const notFound = (msg = 'Recurso no encontrado') => new AppError(msg, 404);
const forbidden = (msg = 'No tienes permiso para realizar esta acción') => new AppError(msg, 403);
const unauthorized = (msg = 'No autenticado') => new AppError(msg, 401);

/** Envuelve handlers async para propagar errores al middleware central */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  console.error(err);
  return res.status(500).json({ error: 'Error interno del servidor' });
}

module.exports = { AppError, notFound, forbidden, unauthorized, asyncHandler, errorHandler };
