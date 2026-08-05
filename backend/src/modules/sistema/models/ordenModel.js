const db = require('../../../core/config/database');
const { notFound, AppError } = require('../../../core/errors');

const ESTADO_DOC = { COTIZACION: 1, ANALISIS: 2, FINALIZADO: 3 };

/**
 * Expande los exámenes de la orden dentro de una transacción: si un examen
 * es principal de un combo, se insertan sus exámenes internos (el primero
 * hereda precio/descuento y los demás van con precio 0), replicando la
 * lógica del sistema anterior.
 */
async function insertarDetalles(conn, idCotizacion, items, coniva) {
  const [principales] = await conn.execute(
    'SELECT id_examen FROM combo_examen WHERE es_principal = 1',
  );
  const idsPrincipales = principales.map((r) => r.id_examen);

  const insertarDetalle = (d) => conn.execute(
    `INSERT INTO cotizacion_detalle
       (id_cotizacion, id_examen, cantidad, precio, descuento, comision, pprueba, insumos, coniva, resultado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [idCotizacion, d.id_examen, d.cantidad, d.precio, d.descuento, d.comision,
      d.pprueba, d.insumos, coniva ? 1 : 0, d.resultado ?? null],
  );

  for (const item of items) {
    if (idsPrincipales.includes(item.id_examen)) {
      const [internos] = await conn.execute(
        `SELECT e.* FROM combo_examen c JOIN examen e ON c.id_examen = e.id
         WHERE c.es_principal = 0 AND c.id_examen_principal = ? AND e.estado = 1`,
        [item.id_examen],
      );
      let primero = true;
      for (const interno of internos) {
        await insertarDetalle({
          id_examen: interno.id,
          cantidad: 1,
          precio: primero ? item.precio : 0,
          descuento: primero ? (item.descuento ?? 0) : 0,
          comision: primero ? (item.comision ?? 0) : 0,
          pprueba: primero ? (item.pprueba ?? interno.pprueba ?? 0) : 0,
          insumos: primero ? (item.insumos ?? interno.insumos ?? 0) : 0,
          resultado: item.resultado,
        });
        primero = false;
      }
    } else {
      await insertarDetalle({
        id_examen: item.id_examen,
        cantidad: item.cantidad ?? 1,
        precio: item.precio,
        descuento: item.descuento ?? 0,
        comision: item.comision ?? 0,
        pprueba: item.pprueba ?? 0,
        insumos: item.insumos ?? 0,
        resultado: item.resultado,
      });
    }
  }
}

class OrdenModel {
  static async crear(data, userId) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.execute(
        `INSERT INTO cotizacion
           (id_paciente, id_medico, fecha_cotizacion, observaciones, estado_documento,
            id_medico_hijo, comision_medico_hijo, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.id_paciente, data.id_medico, data.fecha_cotizacion, data.observaciones ?? null,
          data.estado_documento ?? ESTADO_DOC.COTIZACION,
          data.id_medico_hijo ?? null, data.comision_medico_hijo ?? 0, userId],
      );
      const id = result.insertId;
      await insertarDetalles(conn, id, data.items, data.coniva ?? true);
      await conn.commit();
      return id;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  static async actualizar(id, data) {
    const [[orden]] = await db.execute(
      'SELECT * FROM cotizacion WHERE id = ? AND estado = 1', [id],
    );
    if (!orden) throw notFound('Orden no encontrada');
    if (orden.estado_documento === ESTADO_DOC.FINALIZADO) {
      throw new AppError('No se puede editar un análisis finalizado', 422);
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute(
        `UPDATE cotizacion SET id_paciente = ?, id_medico = ?, fecha_cotizacion = ?,
           observaciones = ?, id_medico_hijo = ?, comision_medico_hijo = ?, updated_at = NOW()
         WHERE id = ?`,
        [data.id_paciente, data.id_medico, data.fecha_cotizacion, data.observaciones ?? null,
          data.id_medico_hijo ?? null, data.comision_medico_hijo ?? 0, id],
      );
      // igual que el sistema anterior: se desactivan los detalles y se reinsertan
      await conn.execute('UPDATE cotizacion_detalle SET estado = 0 WHERE id_cotizacion = ?', [id]);
      await insertarDetalles(conn, id, data.items, data.coniva ?? true);
      await conn.commit();
      return orden;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  static async obtener(id) {
    const [[orden]] = await db.execute(
      `SELECT c.*,
         CONCAT(p.nombres, ' ', p.apellidos) AS paciente,
         TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) AS edad_paciente,
         p.id_sexo, p.celular AS celular_paciente,
         CONCAT(m.nombres, ' ', m.apellidos) AS medico,
         CONCAT(mh.nombres, ' ', mh.apellidos) AS medico_hijo
       FROM cotizacion c
       JOIN paciente p ON c.id_paciente = p.id
       JOIN medico m ON c.id_medico = m.id
       LEFT JOIN medico mh ON c.id_medico_hijo = mh.id
       WHERE c.id = ? AND c.estado = 1`,
      [id],
    );
    if (!orden) throw notFound('Orden no encontrada');

    const [detalles] = await db.execute(
      `SELECT d.*, e.codigo, e.nombre AS examen, e.tipo_examen,
         e.rango_inferior, e.rango_superior, e.valor_deseado,
         ce.nombre AS categoria, um.nombre AS unidad_medida
       FROM cotizacion_detalle d
       JOIN examen e ON d.id_examen = e.id
       JOIN categoria_examen ce ON e.id_categoria = ce.id
       JOIN unidad_medida um ON e.id_unidad_medida = um.id
       WHERE d.id_cotizacion = ? AND d.estado = 1
       ORDER BY ce.orden, ce.nombre, e.nombre`,
      [id],
    );
    orden.detalles = detalles;
    orden.total = detalles.reduce((s, d) => s + Number(d.precio), 0);

    const [heces] = await db.execute(
      'SELECT * FROM resultado_heces WHERE id_cotizacion = ? AND estado = 1', [id],
    );
    const [orina] = await db.execute(
      'SELECT * FROM resultado_orina WHERE id_cotizacion = ? AND estado = 1', [id],
    );
    orden.resultado_heces = heces;
    orden.resultado_orina = orina;
    return orden;
  }

  static async listar({ estadoDocumento, q, page = 1, limit = 20, desde, hasta }) {
    let where = 'WHERE c.estado = 1';
    const params = [];
    if (estadoDocumento) {
      where += ' AND c.estado_documento = ?';
      params.push(estadoDocumento);
    }
    if (desde) {
      where += ' AND c.fecha_cotizacion >= ?';
      params.push(desde);
    }
    if (hasta) {
      where += ' AND c.fecha_cotizacion <= ?';
      params.push(hasta);
    }
    if (q) {
      where += ` AND (CONCAT(p.nombres, ' ', p.apellidos) LIKE ? OR c.id LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`);
    }

    const from = `FROM cotizacion c
      JOIN paciente p ON c.id_paciente = p.id
      JOIN medico m ON c.id_medico = m.id`;

    const [[{ total }]] = await db.execute(`SELECT COUNT(*) AS total ${from} ${where}`, params);
    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);
    const [data] = await db.execute(
      `SELECT c.id, c.fecha_cotizacion, c.estado_documento, c.observaciones, c.created_at,
         CONCAT(p.nombres, ' ', p.apellidos) AS paciente,
         CONCAT(m.nombres, ' ', m.apellidos) AS medico,
         (SELECT COALESCE(SUM(d.precio), 0) FROM cotizacion_detalle d
          WHERE d.id_cotizacion = c.id AND d.estado = 1) AS total
       ${from} ${where}
       ORDER BY c.id DESC LIMIT ${Number(limit)} OFFSET ${offset}`,
      params,
    );
    return { data, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
  }

  static async cambiarEstadoDocumento(id, nuevoEstado) {
    const [[orden]] = await db.execute(
      'SELECT * FROM cotizacion WHERE id = ? AND estado = 1', [id],
    );
    if (!orden) throw notFound('Orden no encontrada');

    const transicionesValidas = {
      [ESTADO_DOC.COTIZACION]: [ESTADO_DOC.ANALISIS],
      [ESTADO_DOC.ANALISIS]: [ESTADO_DOC.COTIZACION, ESTADO_DOC.FINALIZADO],
      [ESTADO_DOC.FINALIZADO]: [ESTADO_DOC.ANALISIS],
    };
    if (!transicionesValidas[orden.estado_documento]?.includes(nuevoEstado)) {
      throw new AppError('Transición de estado no permitida', 422);
    }

    await db.execute(
      'UPDATE cotizacion SET estado_documento = ?, updated_at = NOW() WHERE id = ?',
      [nuevoEstado, id],
    );
    return orden;
  }

  static async anular(id) {
    const [[orden]] = await db.execute(
      'SELECT * FROM cotizacion WHERE id = ? AND estado = 1', [id],
    );
    if (!orden) throw notFound('Orden no encontrada');
    await db.execute('UPDATE cotizacion SET estado = 0, updated_at = NOW() WHERE id = ?', [id]);
    return orden;
  }

  static async guardarResultados(id, resultados) {
    const [[orden]] = await db.execute(
      'SELECT * FROM cotizacion WHERE id = ? AND estado = 1', [id],
    );
    if (!orden) throw notFound('Orden no encontrada');
    if (orden.estado_documento !== ESTADO_DOC.ANALISIS) {
      throw new AppError('Solo se pueden capturar resultados de análisis en proceso', 422);
    }
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      for (const r of resultados) {
        await conn.execute(
          'UPDATE cotizacion_detalle SET resultado = ?, updated_at = NOW() WHERE id = ? AND id_cotizacion = ?',
          [r.resultado, r.id_detalle, id],
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

  static async guardarResultadoHeces(id, filas) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute('DELETE FROM resultado_heces WHERE id_cotizacion = ?', [id]);
      for (const f of filas) {
        await conn.execute(
          `INSERT INTO resultado_heces (id_cotizacion, id_categoria_heces, id_parametro_heces)
           VALUES (?, ?, ?)`,
          [id, f.id_categoria_heces, f.id_parametro_heces],
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

  static async guardarResultadoOrina(id, filas) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute('DELETE FROM resultado_orina WHERE id_cotizacion = ?', [id]);
      for (const f of filas) {
        await conn.execute(
          `INSERT INTO resultado_orina (id_cotizacion, id_categoria_orina, id_parametro_orina, valor)
           VALUES (?, ?, ?, ?)`,
          [id, f.id_categoria_orina, f.id_parametro_orina ?? null, f.valor ?? null],
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
}

module.exports = { OrdenModel, ESTADO_DOC };
