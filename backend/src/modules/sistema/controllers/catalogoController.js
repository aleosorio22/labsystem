const { notFound } = require('../../../core/errors');
const { audit } = require('../../../core/audit');
const { catalogos, getTiposExamen } = require('../models/catalogoModel');

/**
 * Controlador genérico: cada handler resuelve el catálogo por req.params.catalogo
 * (la ruta valida contra la lista blanca de catálogos registrados en el modelo).
 */
const modelo = (req) => catalogos[req.params.catalogo];

exports.getAll = async (req, res) => {
  const { q, incluirInactivos } = req.query;
  res.json(await modelo(req).getAll({ q, incluirInactivos: Boolean(incluirInactivos) }));
};

exports.getById = async (req, res) => {
  const row = await modelo(req).findById(req.params.id);
  if (!row) throw notFound();
  res.json(row);
};

exports.create = async (req, res) => {
  const m = modelo(req);
  const id = await m.create(req.validated);
  const row = await m.findById(id);
  await audit({ userId: req.user.id, accion: 'Creación', tabla: m.tabla, registroId: id, nuevo: row });
  res.status(201).json(row);
};

exports.update = async (req, res) => {
  const m = modelo(req);
  const anterior = await m.findById(req.params.id);
  if (!anterior) throw notFound();
  await m.update(anterior.id, req.validated);
  const row = await m.findById(anterior.id);
  await audit({ userId: req.user.id, accion: 'Edición', tabla: m.tabla, registroId: anterior.id, anterior, nuevo: row });
  res.json(row);
};

exports.eliminar = async (req, res) => {
  const m = modelo(req);
  const anterior = await m.findById(req.params.id);
  if (!anterior) throw notFound();
  await m.softDelete(anterior.id);
  await audit({ userId: req.user.id, accion: 'Eliminación', tabla: m.tabla, registroId: anterior.id, anterior });
  res.json({ ok: true });
};

exports.getTiposExamen = async (_req, res) => {
  res.json(await getTiposExamen());
};
