import { db } from '../../db/knex.js';
import { notFound, AppError } from '../../core/errors.js';

export const ESTADO_DOC = { COTIZACION: 1, ANALISIS: 2, FINALIZADO: 3 };

/**
 * Expande los exámenes de la orden: si un examen es principal de un combo,
 * se insertan sus exámenes internos (el primero hereda precio/descuento y
 * los demás van con precio 0), replicando la lógica del sistema anterior.
 */
async function insertarDetalles(trx, idCotizacion, items, coniva) {
  const principales = await trx('combo_examen').where('es_principal', 1).pluck('id_examen');

  for (const item of items) {
    if (principales.includes(item.id_examen)) {
      const internosIds = await trx('combo_examen')
        .where({ es_principal: 0, id_examen_principal: item.id_examen })
        .pluck('id_examen');
      const internos = await trx('examen').whereIn('id', internosIds).where('estado', 1);

      let primero = true;
      for (const interno of internos) {
        await trx('cotizacion_detalle').insert({
          id_cotizacion: idCotizacion,
          id_examen: interno.id,
          cantidad: 1,
          precio: primero ? item.precio : 0,
          descuento: primero ? (item.descuento ?? 0) : 0,
          comision: primero ? (item.comision ?? 0) : 0,
          pprueba: primero ? (item.pprueba ?? interno.pprueba ?? 0) : 0,
          insumos: primero ? (item.insumos ?? interno.insumos ?? 0) : 0,
          coniva,
          resultado: item.resultado ?? null,
        });
        primero = false;
      }
    } else {
      await trx('cotizacion_detalle').insert({
        id_cotizacion: idCotizacion,
        id_examen: item.id_examen,
        cantidad: item.cantidad ?? 1,
        precio: item.precio,
        descuento: item.descuento ?? 0,
        comision: item.comision ?? 0,
        pprueba: item.pprueba ?? 0,
        insumos: item.insumos ?? 0,
        coniva,
        resultado: item.resultado ?? null,
      });
    }
  }
}

export async function crearOrden(data, userId) {
  return db.transaction(async (trx) => {
    const [id] = await trx('cotizacion').insert({
      id_paciente: data.id_paciente,
      id_medico: data.id_medico,
      fecha_cotizacion: data.fecha_cotizacion,
      observaciones: data.observaciones ?? null,
      estado_documento: data.estado_documento ?? ESTADO_DOC.COTIZACION,
      id_medico_hijo: data.id_medico_hijo ?? null,
      comision_medico_hijo: data.comision_medico_hijo ?? 0,
      created_by: userId,
    });
    await insertarDetalles(trx, id, data.items, data.coniva ?? true);
    return id;
  });
}

export async function actualizarOrden(id, data) {
  const orden = await db('cotizacion').where({ id, estado: 1 }).first();
  if (!orden) throw notFound('Orden no encontrada');
  if (orden.estado_documento === ESTADO_DOC.FINALIZADO) {
    throw new AppError('No se puede editar un análisis finalizado', 422);
  }

  await db.transaction(async (trx) => {
    await trx('cotizacion').where('id', id).update({
      id_paciente: data.id_paciente,
      id_medico: data.id_medico,
      fecha_cotizacion: data.fecha_cotizacion,
      observaciones: data.observaciones ?? null,
      id_medico_hijo: data.id_medico_hijo ?? null,
      comision_medico_hijo: data.comision_medico_hijo ?? 0,
      updated_at: db.fn.now(),
    });
    // igual que el sistema anterior: se desactivan los detalles y se reinsertan
    await trx('cotizacion_detalle').where('id_cotizacion', id).update({ estado: 0 });
    await insertarDetalles(trx, id, data.items, data.coniva ?? true);
  });
  return orden;
}

export async function obtenerOrden(id) {
  const orden = await db('cotizacion as c')
    .join('paciente as p', 'c.id_paciente', 'p.id')
    .join('medico as m', 'c.id_medico', 'm.id')
    .leftJoin('medico as mh', 'c.id_medico_hijo', 'mh.id')
    .select('c.*',
      db.raw("CONCAT(p.nombres, ' ', p.apellidos) as paciente"),
      db.raw('TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) as edad_paciente'),
      'p.id_sexo', 'p.celular as celular_paciente',
      db.raw("CONCAT(m.nombres, ' ', m.apellidos) as medico"),
      db.raw("CONCAT(mh.nombres, ' ', mh.apellidos) as medico_hijo"))
    .where('c.id', id).where('c.estado', 1)
    .first();
  if (!orden) throw notFound('Orden no encontrada');

  orden.detalles = await db('cotizacion_detalle as d')
    .join('examen as e', 'd.id_examen', 'e.id')
    .join('categoria_examen as ce', 'e.id_categoria', 'ce.id')
    .join('unidad_medida as um', 'e.id_unidad_medida', 'um.id')
    .select('d.*', 'e.codigo', 'e.nombre as examen', 'e.tipo_examen',
      'e.rango_inferior', 'e.rango_superior', 'e.valor_deseado',
      'ce.nombre as categoria', 'um.nombre as unidad_medida')
    .where('d.id_cotizacion', id).where('d.estado', 1)
    .orderBy(['ce.orden', 'ce.nombre', 'e.nombre']);

  orden.total = orden.detalles.reduce((s, d) => s + Number(d.precio), 0);

  orden.resultado_heces = await db('resultado_heces')
    .where({ id_cotizacion: id, estado: 1 });
  orden.resultado_orina = await db('resultado_orina')
    .where({ id_cotizacion: id, estado: 1 });

  return orden;
}

export async function listarOrdenes({ estadoDocumento, q, page = 1, limit = 20, desde, hasta }) {
  let query = db('cotizacion as c')
    .join('paciente as p', 'c.id_paciente', 'p.id')
    .join('medico as m', 'c.id_medico', 'm.id')
    .where('c.estado', 1);

  if (estadoDocumento) query = query.where('c.estado_documento', estadoDocumento);
  if (desde) query = query.where('c.fecha_cotizacion', '>=', desde);
  if (hasta) query = query.where('c.fecha_cotizacion', '<=', hasta);
  if (q) {
    query = query.where((b) => b
      .orWhere(db.raw("CONCAT(p.nombres, ' ', p.apellidos)"), 'like', `%${q}%`)
      .orWhere('c.id', 'like', `%${q}%`));
  }

  const [{ total }] = await query.clone().count('* as total');
  const data = await query
    .select('c.id', 'c.fecha_cotizacion', 'c.estado_documento', 'c.observaciones', 'c.created_at',
      db.raw("CONCAT(p.nombres, ' ', p.apellidos) as paciente"),
      db.raw("CONCAT(m.nombres, ' ', m.apellidos) as medico"),
      db.raw(`(SELECT COALESCE(SUM(d.precio), 0) FROM cotizacion_detalle d
               WHERE d.id_cotizacion = c.id AND d.estado = 1) as total`))
    .orderBy('c.id', 'desc')
    .limit(+limit).offset((Math.max(1, +page) - 1) * +limit);

  return { data, total, page: +page, pages: Math.ceil(total / +limit) };
}

export async function cambiarEstadoDocumento(id, nuevoEstado) {
  const orden = await db('cotizacion').where({ id, estado: 1 }).first();
  if (!orden) throw notFound('Orden no encontrada');

  const transicionesValidas = {
    [ESTADO_DOC.COTIZACION]: [ESTADO_DOC.ANALISIS],
    [ESTADO_DOC.ANALISIS]: [ESTADO_DOC.COTIZACION, ESTADO_DOC.FINALIZADO],
    [ESTADO_DOC.FINALIZADO]: [ESTADO_DOC.ANALISIS],
  };
  if (!transicionesValidas[orden.estado_documento]?.includes(nuevoEstado)) {
    throw new AppError('Transición de estado no permitida', 422);
  }

  await db('cotizacion').where('id', id)
    .update({ estado_documento: nuevoEstado, updated_at: db.fn.now() });
  return orden;
}

export async function guardarResultados(id, resultados) {
  const orden = await db('cotizacion').where({ id, estado: 1 }).first();
  if (!orden) throw notFound('Orden no encontrada');
  if (orden.estado_documento !== ESTADO_DOC.ANALISIS) {
    throw new AppError('Solo se pueden capturar resultados de análisis en proceso', 422);
  }
  await db.transaction(async (trx) => {
    for (const r of resultados) {
      await trx('cotizacion_detalle')
        .where({ id: r.id_detalle, id_cotizacion: id })
        .update({ resultado: r.resultado, updated_at: db.fn.now() });
    }
  });
}

export async function guardarResultadoHeces(id, filas) {
  await db.transaction(async (trx) => {
    await trx('resultado_heces').where('id_cotizacion', id).del();
    if (filas.length) {
      await trx('resultado_heces').insert(filas.map((f) => ({
        id_cotizacion: id,
        id_categoria_heces: f.id_categoria_heces,
        id_parametro_heces: f.id_parametro_heces,
      })));
    }
  });
}

export async function guardarResultadoOrina(id, filas) {
  await db.transaction(async (trx) => {
    await trx('resultado_orina').where('id_cotizacion', id).del();
    if (filas.length) {
      await trx('resultado_orina').insert(filas.map((f) => ({
        id_cotizacion: id,
        id_categoria_orina: f.id_categoria_orina,
        id_parametro_orina: f.id_parametro_orina ?? null,
        valor: f.valor ?? null,
      })));
    }
  });
}
