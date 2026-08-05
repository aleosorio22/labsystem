const { notFound } = require('../../../core/errors');
const { audit } = require('../../../core/audit');
const MedicoModel = require('../models/medicoModel');

exports.getAll = async (req, res) => {
  const { q, incluirInactivos } = req.query;
  res.json(await MedicoModel.getAll({ q, incluirInactivos: Boolean(incluirInactivos) }));
};

exports.getById = async (req, res) => {
  const row = await MedicoModel.findById(req.params.id);
  if (!row) throw notFound('Médico no encontrado');
  res.json(row);
};

exports.create = async (req, res) => {
  const id = await MedicoModel.create(req.validated);
  const row = await MedicoModel.findById(id);
  await audit({ userId: req.user.id, accion: 'Creación', tabla: 'medico', registroId: id, nuevo: row });
  res.status(201).json(row);
};

exports.update = async (req, res) => {
  const anterior = await MedicoModel.findById(req.params.id);
  if (!anterior) throw notFound('Médico no encontrado');
  await MedicoModel.update(anterior.id, req.validated);
  const row = await MedicoModel.findById(anterior.id);
  await audit({ userId: req.user.id, accion: 'Edición', tabla: 'medico', registroId: anterior.id, anterior, nuevo: row });
  res.json(row);
};

exports.eliminar = async (req, res) => {
  const anterior = await MedicoModel.findById(req.params.id);
  if (!anterior) throw notFound('Médico no encontrado');
  await MedicoModel.softDelete(anterior.id);
  await audit({ userId: req.user.id, accion: 'Eliminación', tabla: 'medico', registroId: anterior.id, anterior });
  res.json({ ok: true });
};
