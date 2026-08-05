const bcrypt = require('bcryptjs');
const db = require('../../../core/config/database');

const COLS_PUBLICAS = `u.id, u.name, u.username, u.email, u.role_id, u.active,
  u.created_at, r.nombre AS rol`;

class UserModel {
  /** Los hashes de Laravel usan prefijo $2y$; bcryptjs trabaja con $2b$ */
  static compararPassword(plain, hash) {
    return bcrypt.compareSync(plain, hash.replace(/^\$2y\$/, '$2b$'));
  }

  static async findByUsernameOrEmail(usuario) {
    const [[user]] = await db.execute(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [usuario, usuario],
    );
    return user;
  }

  static async findById(id) {
    const [[user]] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
    return user;
  }

  static async findPublicById(id) {
    const [[user]] = await db.execute(
      `SELECT ${COLS_PUBLICAS} FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
      [id],
    );
    return user;
  }

  static async getPermisosByRol(roleId) {
    const [rows] = await db.execute(
      `SELECT p.codigo FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id WHERE rp.role_id = ?`,
      [roleId],
    );
    return rows.map((r) => r.codigo);
  }

  static async getAll() {
    const [rows] = await db.execute(
      `SELECT ${COLS_PUBLICAS} FROM users u LEFT JOIN roles r ON u.role_id = r.id ORDER BY u.name`,
    );
    return rows;
  }

  static async existeUsernameOEmail(username, email, exceptoId = null) {
    const [rows] = await db.execute(
      'SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?',
      [username, email, exceptoId ?? 0],
    );
    return rows.length > 0;
  }

  static async create({ name, username, email, password, role_id, active = true }) {
    const [result] = await db.execute(
      `INSERT INTO users (name, username, email, password, role_id, active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, username, email, bcrypt.hashSync(password, 10), role_id, active ? 1 : 0],
    );
    return result.insertId;
  }

  static async update(id, data) {
    const campos = [];
    const valores = [];
    for (const col of ['name', 'username', 'email', 'role_id']) {
      if (data[col] !== undefined) {
        campos.push(`${col} = ?`);
        valores.push(data[col]);
      }
    }
    if (data.active !== undefined) {
      campos.push('active = ?');
      valores.push(data.active ? 1 : 0);
    }
    if (data.password) {
      campos.push('password = ?');
      valores.push(bcrypt.hashSync(data.password, 10));
    }
    if (!campos.length) return false;
    valores.push(id);
    const [result] = await db.execute(
      `UPDATE users SET ${campos.join(', ')}, updated_at = NOW() WHERE id = ?`,
      valores,
    );
    return result.affectedRows > 0;
  }

  static async cambiarPassword(id, passwordNueva) {
    await db.execute(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
      [bcrypt.hashSync(passwordNueva, 10), id],
    );
  }

  static async desactivar(id) {
    const [result] = await db.execute(
      'UPDATE users SET active = 0, updated_at = NOW() WHERE id = ?',
      [id],
    );
    return result.affectedRows > 0;
  }
}

module.exports = UserModel;
