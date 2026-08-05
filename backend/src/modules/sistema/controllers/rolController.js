const { AppError, notFound } = require('../../../core/errors');
const { audit } = require('../../../core/audit');
const RolModel = require('../models/rolModel');

exports.getPermisos = async (_req, res) => {
  res.json(await RolModel.getPermisosCatalogo());
};

exports.getAll = async (_req, res) => {
  res.json(await RolModel.getAllConPermisos());
};

exports.create = async (req, res) => {
  const { permisos, ...data } = req.validated;
  const id = await RolModel.create(data, permisos);
  await audit({ userId: req.user.id, accion: 'Creación', tabla: 'roles', registroId: id, nuevo: req.validated });
  res.status(201).json(await RolModel.findById(id));
};

exports.update = async (req, res) => {
  const anterior = await RolModel.findById(req.params.id);
  if (!anterior) throw notFound();
  if (anterior.nombre === 'super-admin') {
    throw new AppError('El rol super-admin no se puede modificar', 422);
  }
  const { permisos, ...data } = req.validated;
  await RolModel.update(anterior.id, data, permisos);
  await audit({ userId: req.user.id, accion: 'Edición', tabla: 'roles', registroId: anterior.id, anterior, nuevo: req.validated });
  res.json(await RolModel.findById(anterior.id));
};

exports.eliminar = async (req, res) => {
  const rol = await RolModel.findById(req.params.id);
  if (!rol) throw notFound();
  if (rol.nombre === 'super-admin') throw new AppError('El rol super-admin no se puede eliminar', 422);
  if (await RolModel.tieneUsuariosActivos(rol.id)) {
    throw new AppError('Hay usuarios activos con este rol', 422);
  }
  await RolModel.softDelete(rol.id);
  await audit({ userId: req.user.id, accion: 'Eliminación', tabla: 'roles', registroId: rol.id, anterior: rol });
  res.json({ ok: true });
};
