const db = require('../../../core/config/database');

const SELECT_BASE = `SELECT e.*, ce.nombre AS categoria, um.nombre AS unidad_medida, te.nombre AS tipo
  FROM examen e
  JOIN categoria_examen ce ON e.id_categoria = ce.id
  JOIN unidad_medida um ON e.id_unidad_medida = um.id
  JOIN tipo_examen te ON e.tipo_examen = te.id`;

const CAMPOS = ['id_categoria', 'codigo', 'nombre', 'precio', 'rango_inferior',
  'rango_superior', 'valor_deseado', 'valor_craig', 'valor_bosnan', 'valor_scully',
  'tipo_examen', 'id_unidad_medida', 'pprueba', 'insumos'];

class ExamenModel {
  static async getAll({ q, incluirInactivos = false } = {}) {
    let where = incluirInactivos ? 'WHERE 1=1' : 'WHERE e.estado = 1';
    const params = [];
    if (q) {
      where += ' AND (e.nombre LIKE ? OR e.codigo LIKE ? OR ce.nombre LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    const [rows] = await db.execute(`${SELECT_BASE} ${where} ORDER BY e.nombre`, params);
    return rows;
  }

  /** Exámenes que se pueden vender: excluye los internos de combos */
  static async getVendibles() {
    const [rows] = await db.execute(
      `${SELECT_BASE}
       WHERE e.estado = 1
         AND e.id NOT IN (SELECT id_examen FROM combo_examen WHERE es_principal = 0)
       ORDER BY e.nombre`,
    );
    return rows;
  }

  static async findById(id) {
    const [[row]] = await db.execute(`${SELECT_BASE} WHERE e.id = ?`, [id]);
    return row;
  }

  static async findByCodigo(codigo, exceptoId = null) {
    const [rows] = await db.execute(
      'SELECT id FROM examen WHERE codigo = ? AND id != ?',
      [codigo, exceptoId ?? 0],
    );
    return rows[0];
  }

  static async create(data) {
    const [result] = await db.execute(
      `INSERT INTO examen (${CAMPOS.join(', ')}) VALUES (${CAMPOS.map(() => '?').join(', ')})`,
      CAMPOS.map((c) => data[c] ?? null),
    );
    return result.insertId;
  }

  static async update(id, data) {
    const campos = CAMPOS.filter((c) => data[c] !== undefined);
    const valores = campos.map((c) => data[c] ?? null);
    if (data.estado !== undefined) {
      campos.push('estado');
      valores.push(data.estado ? 1 : 0);
    }
    if (!campos.length) return false;
    const [result] = await db.execute(
      `UPDATE examen SET ${campos.map((c) => `${c} = ?`).join(', ')}, updated_at = NOW() WHERE id = ?`,
      [...valores, id],
    );
    return result.affectedRows > 0;
  }

  static async softDelete(id) {
    const [result] = await db.execute(
      'UPDATE examen SET estado = 0, updated_at = NOW() WHERE id = ?', [id],
    );
    return result.affectedRows > 0;
  }

  // ── Combos ──────────────────────────────────────────────────────────

  static async getCombos() {
    const [rows] = await db.execute(
      `SELECT c.*, e.nombre, e.codigo FROM combo_examen c
       JOIN examen e ON c.id_examen = e.id
       ORDER BY c.id_examen_principal, c.es_principal DESC, c.id`,
    );
    return rows;
  }

  /** Reemplaza la definición completa de un combo (principal + internos) */
  static async guardarCombo(idPrincipal, internos) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute('DELETE FROM combo_examen WHERE id_examen_principal = ?', [idPrincipal]);
      await conn.execute(
        `INSERT INTO combo_examen (id_examen, es_principal, es_secundario, aparece_en_cotizacion, id_examen_principal)
         VALUES (?, 1, 0, 1, ?)`,
        [idPrincipal, idPrincipal],
      );
      for (let i = 0; i < internos.length; i++) {
        await conn.execute(
          `INSERT INTO combo_examen (id_examen, es_principal, es_secundario, aparece_en_cotizacion, id_examen_principal)
           VALUES (?, 0, ?, 0, ?)`,
          [internos[i], i === 0 ? 1 : 0, idPrincipal],
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

  static async eliminarCombo(idPrincipal) {
    await db.execute('DELETE FROM combo_examen WHERE id_examen_principal = ?', [idPrincipal]);
  }
}

module.exports = ExamenModel;
