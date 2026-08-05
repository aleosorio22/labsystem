const { notFound } = require('../../../core/errors');
const { audit } = require('../../../core/audit');
const PacienteModel = require('../models/pacienteModel');

exports.getAll = async (req, res) => {
  const { q, page = 1, limit = 20 } = req.query;
  res.json(await PacienteModel.getPaginado({ q, page, limit }));
};

exports.getCumpleanios = async (_req, res) => {
  res.json(await PacienteModel.getCumpleanieros());
};

exports.getById = async (req, res) => {
  const row = await PacienteModel.findById(req.params.id);
  if (!row) throw notFound('Paciente no encontrado');
  res.json(row);
};

exports.create = async (req, res) => {
  const data = { ...req.validated, mail: req.validated.mail || null };
  const id = await PacienteModel.create(data);
  const row = await PacienteModel.findById(id);
  await audit({ userId: req.user.id, accion: 'Creación', tabla: 'paciente', registroId: id, nuevo: row });
  res.status(201).json(row);
};

exports.update = async (req, res) => {
  const anterior = await PacienteModel.findById(req.params.id);
  if (!anterior) throw notFound('Paciente no encontrado');
  const data = { ...req.validated };
  if (data.mail === '') data.mail = null;
  await PacienteModel.update(anterior.id, data);
  const row = await PacienteModel.findById(anterior.id);
  await audit({ userId: req.user.id, accion: 'Edición', tabla: 'paciente', registroId: anterior.id, anterior, nuevo: row });
  res.json(row);
};

exports.eliminar = async (req, res) => {
  const anterior = await PacienteModel.findById(req.params.id);
  if (!anterior) throw notFound('Paciente no encontrado');
  await PacienteModel.softDelete(anterior.id);
  await audit({ userId: req.user.id, accion: 'Eliminación', tabla: 'paciente', registroId: anterior.id, anterior });
  res.json({ ok: true });
};
