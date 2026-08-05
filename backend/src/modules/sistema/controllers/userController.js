const { AppError, notFound } = require('../../../core/errors');
const { audit } = require('../../../core/audit');
const UserModel = require('../models/userModel');

exports.getAll = async (_req, res) => {
  res.json(await UserModel.getAll());
};

exports.create = async (req, res) => {
  const data = req.validated;
  if (!data.password) throw new AppError('La contraseña es requerida', 422);
  if (await UserModel.existeUsernameOEmail(data.username, data.email)) {
    throw new AppError('El usuario o correo ya existe', 422);
  }
  const id = await UserModel.create(data);
  const row = await UserModel.findPublicById(id);
  await audit({ userId: req.user.id, accion: 'Creación', tabla: 'users', registroId: id, nuevo: row });
  res.status(201).json(row);
};

exports.update = async (req, res) => {
  const anterior = await UserModel.findById(req.params.id);
  if (!anterior) throw notFound();
  const data = req.validated;
  if ((data.username || data.email)
    && await UserModel.existeUsernameOEmail(data.username ?? anterior.username, data.email ?? anterior.email, anterior.id)) {
    throw new AppError('El usuario o correo ya existe', 422);
  }
  await UserModel.update(anterior.id, data);
  const row = await UserModel.findPublicById(anterior.id);
  await audit({
    userId: req.user.id, accion: 'Edición', tabla: 'users', registroId: anterior.id,
    anterior: { ...anterior, password: '[oculto]' }, nuevo: row,
  });
  res.json(row);
};

exports.desactivar = async (req, res) => {
  if (Number(req.params.id) === req.user.id) {
    throw new AppError('No puedes desactivar tu propio usuario', 422);
  }
  const anterior = await UserModel.findById(req.params.id);
  if (!anterior) throw notFound();
  await UserModel.desactivar(anterior.id);
  await audit({ userId: req.user.id, accion: 'Desactivación', tabla: 'users', registroId: anterior.id });
  res.json({ ok: true });
};
