const db = require('../../../core/config/database');

const SELECT_BASE = `SELECT p.*, s.nombre AS sexo,
    TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) AS edad
  FROM paciente p JOIN sexo s ON p.id_sexo = s.id`;

const CAMPOS = ['dpi', 'nombres', 'apellidos', 'mail', 'telefono', 'celular',
  'direccion', 'nit', 'id_sexo', 'fecha_nacimiento', 'tipo_sangre'];

class PacienteModel {
  static async getPaginado({ q, page = 1, limit = 20 }) {
    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);
    let where = 'WHERE p.estado = 1';
    const params = [];
    if (q) {
      where += ` AND (CONCAT(p.nombres, ' ', p.apellidos) LIKE ? OR p.dpi LIKE ? OR p.celular LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) AS total FROM paciente p ${where}`, params,
    );
    const [data] = await db.execute(
      `${SELECT_BASE} ${where} ORDER BY p.id DESC LIMIT ${Number(limit)} OFFSET ${offset}`,
      params,
    );
    return { data, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
  }

  static async getCumpleanieros() {
    const [rows] = await db.execute(
      `${SELECT_BASE} WHERE p.estado = 1 AND MONTH(p.fecha_nacimiento) = MONTH(CURDATE())
       ORDER BY DAY(p.fecha_nacimiento)`,
    );
    return rows;
  }

  static async findById(id) {
    const [[row]] = await db.execute(`${SELECT_BASE} WHERE p.id = ?`, [id]);
    return row;
  }

  static async create(data) {
    const [result] = await db.execute(
      `INSERT INTO paciente (${CAMPOS.join(', ')}) VALUES (${CAMPOS.map(() => '?').join(', ')})`,
      CAMPOS.map((c) => data[c] ?? null),
    );
    return result.insertId;
  }

  static async update(id, data) {
    const campos = CAMPOS.filter((c) => data[c] !== undefined);
    if (!campos.length) return false;
    const [result] = await db.execute(
      `UPDATE paciente SET ${campos.map((c) => `${c} = ?`).join(', ')}, updated_at = NOW() WHERE id = ?`,
      [...campos.map((c) => data[c] ?? null), id],
    );
    return result.affectedRows > 0;
  }

  static async softDelete(id) {
    const [result] = await db.execute(
      'UPDATE paciente SET estado = 0, updated_at = NOW() WHERE id = ?', [id],
    );
    return result.affectedRows > 0;
  }
}

module.exports = PacienteModel;
