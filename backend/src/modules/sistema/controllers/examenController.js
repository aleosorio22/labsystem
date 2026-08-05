const { AppError, notFound } = require('../../../core/errors');
const { audit } = require('../../../core/audit');
const ExamenModel = require('../models/examenModel');

exports.getAll = async (req, res) => {
  const { q, incluirInactivos } = req.query;
  res.json(await ExamenModel.getAll({ q, incluirInactivos: Boolean(incluirInactivos) }));
};

exports.getVendibles = async (_req, res) => {
  res.json(await ExamenModel.getVendibles());
};

exports.getById = async (req, res) => {
  const row = await ExamenModel.findById(req.params.id);
  if (!row) throw notFound('Examen no encontrado');
  res.json(row);
};

exports.create = async (req, res) => {
  if (await ExamenModel.findByCodigo(req.validated.codigo)) {
    throw new AppError('El código ya existe', 422);
  }
  const id = await ExamenModel.create(req.validated);
  const row = await ExamenModel.findById(id);
  await audit({ userId: req.user.id, accion: 'Creación', tabla: 'examen', registroId: id, nuevo: row });
  res.status(201).json(row);
};

exports.update = async (req, res) => {
  const anterior = await ExamenModel.findById(req.params.id);
  if (!anterior) throw notFound('Examen no encontrado');
  if (req.validated.codigo && await ExamenModel.findByCodigo(req.validated.codigo, anterior.id)) {
    throw new AppError('El código ya existe', 422);
  }
  await ExamenModel.update(anterior.id, req.validated);
  const row = await ExamenModel.findById(anterior.id);
  await audit({ userId: req.user.id, accion: 'Edición', tabla: 'examen', registroId: anterior.id, anterior, nuevo: row });
  res.json(row);
};

exports.eliminar = async (req, res) => {
  const anterior = await ExamenModel.findById(req.params.id);
  if (!anterior) throw notFound('Examen no encontrado');
  await ExamenModel.softDelete(anterior.id);
  await audit({ userId: req.user.id, accion: 'Eliminación', tabla: 'examen', registroId: anterior.id, anterior });
  res.json({ ok: true });
};

// ── Combos ──────────────────────────────────────────────────────────

exports.getCombos = async (_req, res) => {
  res.json(await ExamenModel.getCombos());
};

exports.guardarCombo = async (req, res) => {
  const { id_examen_principal, internos } = req.validated;
  if (internos.includes(id_examen_principal)) {
    throw new AppError('El examen principal no puede ser interno de sí mismo', 422);
  }
  await ExamenModel.guardarCombo(id_examen_principal, internos);
  await audit({ userId: req.user.id, accion: 'Edición', tabla: 'combo_examen', registroId: id_examen_principal, nuevo: req.validated });
  res.json({ ok: true });
};

exports.eliminarCombo = async (req, res) => {
  await ExamenModel.eliminarCombo(req.params.idPrincipal);
  await audit({ userId: req.user.id, accion: 'Eliminación', tabla: 'combo_examen', registroId: Number(req.params.idPrincipal) });
  res.json({ ok: true });
};
