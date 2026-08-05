const jwt = require('jsonwebtoken');
const config = require('../../../core/config');
const { AppError } = require('../../../core/errors');
const { audit } = require('../../../core/audit');
const UserModel = require('../models/userModel');

exports.login = async (req, res) => {
  const { usuario, password } = req.validated;
  const user = await UserModel.findByUsernameOrEmail(usuario);

  if (!user || !UserModel.compararPassword(password, user.password)) {
    if (config.env === 'development') {
      console.warn(`Login fallido: usuario="${usuario}" ${user ? '(existe, contraseña incorrecta)' : '(no existe)'}`);
    }
    throw new AppError('Usuario o contraseña incorrectos', 401);
  }
  if (!user.active) throw new AppError('El usuario está desactivado', 403);

  const token = jwt.sign({ sub: user.id }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
  const publico = await UserModel.findPublicById(user.id);
  const permisos = await UserModel.getPermisosByRol(user.role_id);

  await audit({ userId: user.id, accion: 'Login', tabla: 'users', registroId: user.id });

  res.json({
    token,
    user: {
      id: publico.id, name: publico.name, username: publico.username,
      email: publico.email, rol: publico.rol, permisos,
    },
  });
};

exports.me = async (req, res) => {
  res.json({
    id: req.user.id, name: req.user.name, username: req.user.username,
    email: req.user.email, rol: req.user.rol, permisos: [...req.user.permisos],
  });
};

exports.cambiarPassword = async (req, res) => {
  const user = await UserModel.findById(req.user.id);
  if (!UserModel.compararPassword(req.validated.password_actual, user.password)) {
    throw new AppError('La contraseña actual no coincide', 422);
  }
  await UserModel.cambiarPassword(user.id, req.validated.password_nueva);
  await audit({ userId: user.id, accion: 'Cambio de contraseña', tabla: 'users', registroId: user.id });
  res.json({ ok: true });
};
