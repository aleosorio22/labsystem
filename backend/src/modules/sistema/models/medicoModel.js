const db = require('../../../core/config/database');

const CAMPOS = ['nombres', 'apellidos', 'no_cuenta', 'telefono', 'celular',
  'direccion', 'mail', 'porcentaje', 'comision', 'socio'];

class MedicoModel {
  static async getAll({ q, incluirInactivos = false } = {}) {
    let where = incluirInactivos ? 'WHERE 1=1' : 'WHERE estado = 1';
    const params = [];
    if (q) {
      where += ' AND (nombres LIKE ? OR apellidos LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }
    const [rows] = await db.execute(`SELECT * FROM medico ${where} ORDER BY apellidos`, params);
    return rows;
  }

  static async findById(id) {
    const [[row]] = await db.execute('SELECT * FROM medico WHERE id = ?', [id]);
    return row;
  }

  static async create(data) {
    const [result] = await db.execute(
      `INSERT INTO medico (${CAMPOS.join(', ')}) VALUES (${CAMPOS.map(() => '?').join(', ')})`,
      CAMPOS.map((c) => (c === 'socio' ? (data.socio ? 1 : 0) : data[c] ?? (c === 'porcentaje' || c === 'comision' ? 0 : null))),
    );
    return result.insertId;
  }

  static async update(id, data) {
    const campos = CAMPOS.filter((c) => data[c] !== undefined);
    const valores = campos.map((c) => (c === 'socio' ? (data.socio ? 1 : 0) : data[c] ?? null));
    if (data.estado !== undefined) {
      campos.push('estado');
      valores.push(data.estado ? 1 : 0);
    }
    if (!campos.length) return false;
    const [result] = await db.execute(
      `UPDATE medico SET ${campos.map((c) => `${c} = ?`).join(', ')}, updated_at = NOW() WHERE id = ?`,
      [...valores, id],
    );
    return result.affectedRows > 0;
  }

  static async softDelete(id) {
    const [result] = await db.execute(
      'UPDATE medico SET estado = 0, updated_at = NOW() WHERE id = ?', [id],
    );
    return result.affectedRows > 0;
  }
}

module.exports = MedicoModel;
