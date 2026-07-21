import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';
import { db } from '../../db/knex.js';
import { unauthorized, forbidden } from '../errors.js';

/** Verifica el JWT y carga usuario + permisos en req.user */
export async function authenticate(req, _res, next) {
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

    const user = await db('users')
      .leftJoin('roles', 'users.role_id', 'roles.id')
      .select('users.id', 'users.name', 'users.username', 'users.email',
        'users.role_id', 'users.active', 'roles.nombre as rol')
      .where('users.id', payload.sub)
      .first();
    if (!user || !user.active) throw unauthorized('Usuario inactivo');

    const permisos = await db('role_permissions')
      .join('permissions', 'permissions.id', 'role_permissions.permission_id')
      .where('role_permissions.role_id', user.role_id)
      .pluck('permissions.codigo');

    req.user = { ...user, permisos: new Set(permisos) };
    next();
  } catch (err) {
    next(err);
  }
}

/** Autoriza por código de permiso, p.ej. requirePermission('pacientes.crear') */
export const requirePermission = (...codigos) => (req, _res, next) => {
  const ok = codigos.some((c) => req.user?.permisos?.has(c));
  if (!ok) return next(forbidden());
  next();
};
