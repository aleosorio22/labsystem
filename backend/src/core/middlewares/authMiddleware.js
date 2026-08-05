const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../config/database');
const { unauthorized, forbidden } = require('../errors');

/** Verifica el JWT y carga usuario + permisos en req.user */
async function authMiddleware(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw unauthorized();

    let payload;
    try {
      payload = jwt.verify(token, config.jwt.secret);
    } catch {
      throw unauthorized('Sesión inválida o expirada');
    }

    const [[user]] = await db.execute(
      `SELECT u.id, u.name, u.username, u.email, u.role_id, u.active, r.nombre AS rol
       FROM users u LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [payload.sub],
    );
    if (!user || !user.active) throw unauthorized('Usuario inactivo');

    const [permisos] = await db.execute(
      `SELECT p.codigo FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
       WHERE rp.role_id = ?`,
      [user.role_id],
    );

    req.user = { ...user, permisos: new Set(permisos.map((p) => p.codigo)) };
    next();
  } catch (err) {
    next(err);
  }
}

/** Autoriza por código de permiso, p.ej. requirePermission('pacientes.crear') */
const requirePermission = (...codigos) => (req, _res, next) => {
  const ok = codigos.some((c) => req.user?.permisos?.has(c));
  if (!ok) return next(forbidden());
  next();
};

module.exports = { authMiddleware, requirePermission };
