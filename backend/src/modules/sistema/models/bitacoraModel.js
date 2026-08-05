const db = require('../../../core/config/database');

class BitacoraModel {
  static async getPaginado({ page = 1, limit = 30, tabla, accion, desde, hasta }) {
    let where = 'WHERE 1=1';
    const params = [];
    if (tabla) {
      where += ' AND b.nombre_tabla = ?';
      params.push(tabla);
    }
    if (accion) {
      where += ' AND b.accion = ?';
      params.push(accion);
    }
    if (desde) {
      where += ' AND DATE(b.created_at) >= ?';
      params.push(desde);
    }
    if (hasta) {
      where += ' AND DATE(b.created_at) <= ?';
      params.push(hasta);
    }

    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) AS total FROM bitacora b ${where}`, params,
    );
    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);
    const [data] = await db.execute(
      `SELECT b.*, u.name AS usuario FROM bitacora b
       LEFT JOIN users u ON b.user_id = u.id
       ${where} ORDER BY b.id DESC LIMIT ${Number(limit)} OFFSET ${offset}`,
      params,
    );
    return { data, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
  }
}

module.exports = BitacoraModel;
