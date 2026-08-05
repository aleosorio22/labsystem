const db = require('../../../core/config/database');

/** Filtro común: solo órdenes activas convertidas a venta (estado_documento 2 o 3) */
const FILTRO_VENTAS = `c.estado = 1 AND d.estado = 1 AND c.estado_documento IN (2, 3)`;

class ReporteModel {
  static async dashboard() {
    const [[pacientes]] = await db.execute(
      'SELECT COUNT(*) AS n FROM paciente WHERE estado = 1',
    );
    const [[ordenesHoy]] = await db.execute(
      'SELECT COUNT(*) AS n FROM cotizacion WHERE estado = 1 AND DATE(created_at) = CURDATE()',
    );
    const [[enProceso]] = await db.execute(
      'SELECT COUNT(*) AS n FROM cotizacion WHERE estado = 1 AND estado_documento = 2',
    );
    const [[finalizadosHoy]] = await db.execute(
      `SELECT COUNT(*) AS n FROM cotizacion
       WHERE estado = 1 AND estado_documento = 3 AND DATE(updated_at) = CURDATE()`,
    );
    const [[ventasMes]] = await db.execute(
      `SELECT COALESCE(SUM(d.precio), 0) AS total
       FROM cotizacion c JOIN cotizacion_detalle d ON d.id_cotizacion = c.id
       WHERE ${FILTRO_VENTAS}
         AND MONTH(c.fecha_cotizacion) = MONTH(CURDATE())
         AND YEAR(c.fecha_cotizacion) = YEAR(CURDATE())`,
    );
    const [ultimasOrdenes] = await db.execute(
      `SELECT c.id, c.estado_documento, c.fecha_cotizacion,
         CONCAT(p.nombres, ' ', p.apellidos) AS paciente
       FROM cotizacion c JOIN paciente p ON c.id_paciente = p.id
       WHERE c.estado = 1 ORDER BY c.id DESC LIMIT 8`,
    );

    return {
      pacientes: Number(pacientes.n),
      ordenesHoy: Number(ordenesHoy.n),
      enProceso: Number(enProceso.n),
      finalizadosHoy: Number(finalizadosHoy.n),
      ventasMes: Number(ventasMes.total || 0),
      ultimasOrdenes,
    };
  }

  static async ventas(desde, hasta) {
    const [filas] = await db.execute(
      `SELECT c.id AS orden, c.fecha_cotizacion,
         CONCAT(p.nombres, ' ', p.apellidos) AS paciente,
         CONCAT(m.nombres, ' ', m.apellidos) AS medico,
         e.nombre AS examen, d.precio, d.descuento
       FROM cotizacion c
       JOIN cotizacion_detalle d ON d.id_cotizacion = c.id
       JOIN paciente p ON c.id_paciente = p.id
       JOIN medico m ON c.id_medico = m.id
       JOIN examen e ON d.id_examen = e.id
       WHERE ${FILTRO_VENTAS} AND c.fecha_cotizacion BETWEEN ? AND ?
       ORDER BY c.fecha_cotizacion, c.id`,
      [desde, hasta],
    );
    const total = filas.reduce((s, f) => s + Number(f.precio), 0);
    return { filas, total };
  }

  static async ganancias(desde, hasta) {
    const [filas] = await db.execute(
      `SELECT e.nombre AS examen,
         COUNT(*) AS cantidad,
         SUM(d.precio) AS venta,
         SUM(d.pprueba) AS costo_prueba,
         SUM(d.insumos) AS costo_insumos,
         SUM(d.comision) AS comisiones,
         SUM(d.precio - d.pprueba - d.insumos - d.comision) AS ganancia
       FROM cotizacion c
       JOIN cotizacion_detalle d ON d.id_cotizacion = c.id
       JOIN examen e ON d.id_examen = e.id
       WHERE ${FILTRO_VENTAS} AND c.fecha_cotizacion BETWEEN ? AND ?
       GROUP BY e.id, e.nombre
       ORDER BY venta DESC`,
      [desde, hasta],
    );
    return { filas };
  }

  static async comisionesMedicos(desde, hasta) {
    const [filas] = await db.execute(
      `SELECT CONCAT(m.nombres, ' ', m.apellidos) AS medico,
         COUNT(DISTINCT c.id) AS ordenes,
         SUM(d.precio) AS venta,
         SUM(d.comision) AS comision
       FROM cotizacion c
       JOIN cotizacion_detalle d ON d.id_cotizacion = c.id
       JOIN medico m ON c.id_medico = m.id
       WHERE ${FILTRO_VENTAS} AND c.fecha_cotizacion BETWEEN ? AND ?
       GROUP BY m.id, m.nombres, m.apellidos
       ORDER BY venta DESC`,
      [desde, hasta],
    );
    return { filas };
  }
}

module.exports = ReporteModel;
