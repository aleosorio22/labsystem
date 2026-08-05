const { AppError } = require('../../../core/errors');
const { audit } = require('../../../core/audit');
const { OrdenModel, ESTADO_DOC } = require('../models/ordenModel');
const UserModel = require('../models/userModel');
const { pdfCotizacion, pdfResultados } = require('../utils/ordenPdf');

exports.ESTADO_DOC = ESTADO_DOC;

exports.getAll = async (req, res) => {
  const { estado_documento, q, page, limit, desde, hasta } = req.query;
  res.json(await OrdenModel.listar({
    estadoDocumento: estado_documento ? Number(estado_documento) : undefined,
    q, page, limit, desde, hasta,
  }));
};

exports.getById = async (req, res) => {
  res.json(await OrdenModel.obtener(req.params.id));
};

exports.create = async (req, res) => {
  const id = await OrdenModel.crear(req.validated, req.user.id);
  await audit({ userId: req.user.id, accion: 'Creación', tabla: 'cotizacion', registroId: id, nuevo: req.validated });
  res.status(201).json(await OrdenModel.obtener(id));
};

exports.update = async (req, res) => {
  const anterior = await OrdenModel.actualizar(req.params.id, req.validated);
  await audit({ userId: req.user.id, accion: 'Edición', tabla: 'cotizacion', registroId: anterior.id, anterior, nuevo: req.validated });
  res.json(await OrdenModel.obtener(req.params.id));
};

/**
 * Anular orden: igual que el sistema anterior, exige reconfirmar la
 * contraseña del usuario que la anula.
 */
exports.anular = async (req, res) => {
  const user = await UserModel.findById(req.user.id);
  if (!UserModel.compararPassword(req.validated.password_actual, user.password)) {
    throw new AppError('La contraseña no coincide', 422);
  }
  const orden = await OrdenModel.anular(req.params.id);
  await audit({ userId: req.user.id, accion: 'Anulación', tabla: 'cotizacion', registroId: orden.id, anterior: orden });
  res.json({ ok: true });
};

/** Fabrica el handler de cada transición de estado del documento */
exports.transicion = (estado, accion) => async (req, res) => {
  const anterior = await OrdenModel.cambiarEstadoDocumento(req.params.id, estado);
  await audit({
    userId: req.user.id, accion, tabla: 'cotizacion', registroId: anterior.id,
    anterior: { estado_documento: anterior.estado_documento }, nuevo: { estado_documento: estado },
  });
  res.json({ ok: true });
};

// ── Resultados ──────────────────────────────────────────────────────

exports.guardarResultados = async (req, res) => {
  await OrdenModel.guardarResultados(req.params.id, req.validated.resultados);
  await audit({ userId: req.user.id, accion: 'Captura de resultados', tabla: 'cotizacion_detalle', registroId: Number(req.params.id), nuevo: req.validated });
  res.json({ ok: true });
};

exports.guardarResultadosHeces = async (req, res) => {
  await OrdenModel.guardarResultadoHeces(req.params.id, req.validated.filas);
  await audit({ userId: req.user.id, accion: 'Captura resultados heces', tabla: 'resultado_heces', registroId: Number(req.params.id), nuevo: req.validated });
  res.json({ ok: true });
};

exports.guardarResultadosOrina = async (req, res) => {
  await OrdenModel.guardarResultadoOrina(req.params.id, req.validated.filas);
  await audit({ userId: req.user.id, accion: 'Captura resultados orina', tabla: 'resultado_orina', registroId: Number(req.params.id), nuevo: req.validated });
  res.json({ ok: true });
};

// ── PDFs y WhatsApp ─────────────────────────────────────────────────

const streamPdf = (res, doc, nombre) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${nombre}"`);
  doc.pipe(res);
  doc.end();
};

exports.pdfCotizacion = async (req, res) => {
  streamPdf(res, await pdfCotizacion(req.params.id), `cotizacion_${req.params.id}.pdf`);
};

exports.pdfResultados = async (req, res) => {
  streamPdf(res, await pdfResultados(req.params.id), `resultados_${req.params.id}.pdf`);
};

/** Datos para compartir por WhatsApp (el frontend abre wa.me) */
exports.whatsapp = async (req, res) => {
  const orden = await OrdenModel.obtener(req.params.id);
  res.json({
    celular: orden.celular_paciente,
    mensaje: `Estimado(a) ${orden.paciente}, sus resultados de laboratorio de la orden #${orden.id} ya están listos.`,
  });
};
