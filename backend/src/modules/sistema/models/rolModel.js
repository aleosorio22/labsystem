const db = require('../../../core/config/database');

class RolModel {
  static async getAllConPermisos() {
    const [roles] = await db.execute('SELECT * FROM roles WHERE estado = 1 ORDER BY nombre');
    const [rels] = await db.execute('SELECT * FROM role_permissions');
    return roles.map((r) => ({
      ...r,
      permisos: rels.filter((x) => x.role_id === r.id).map((x) => x.permission_id),
    }));
  }

  static async getPermisosCatalogo() {
    const [rows] = await db.execute('SELECT * FROM permissions ORDER BY modulo, codigo');
    return rows;
  }

  static async findById(id) {
    const [[rol]] = await db.execute('SELECT * FROM roles WHERE id = ?', [id]);
    return rol;
  }

  static async create({ nombre, descripcion = null }, permisos = []) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.execute(
        'INSERT INTO roles (nombre, descripcion) VALUES (?, ?)',
        [nombre, descripcion],
      );
      const id = result.insertId;
      for (const p of permisos) {
        await conn.execute(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
          [id, p],
        );
      }
      await conn.commit();
      return id;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  static async update(id, { nombre, descripcion = null }, permisos = []) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute(
        'UPDATE roles SET nombre = ?, descripcion = ?, updated_at = NOW() WHERE id = ?',
        [nombre, descripcion, id],
      );
      await conn.execute('DELETE FROM role_permissions WHERE role_id = ?', [id]);
      for (const p of permisos) {
        await conn.execute(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
          [id, p],
        );
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  static async tieneUsuariosActivos(id) {
    const [rows] = await db.execute(
      'SELECT id FROM users WHERE role_id = ? AND active = 1 LIMIT 1',
      [id],
    );
    return rows.length > 0;
  }

  static async softDelete(id) {
    const [result] = await db.execute(
      'UPDATE roles SET estado = 0, updated_at = NOW() WHERE id = ?',
      [id],
    );
    return result.affectedRows > 0;
  }
}

module.exports = RolModel;
