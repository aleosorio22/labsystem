/**
 * ETL: copia los datos de la BD legada (seanlabsantafe, Laravel) hacia la
 * BD nueva (labsystem). Es idempotente: trunca las tablas destino y vuelve
 * a cargar, conservando los IDs originales para no romper relaciones.
 *
 * Uso:  npm run etl:legacy
 * (configura LEGACY_DB_NAME en .env; el usuario de BD necesita SELECT ahí)
 */
import 'dotenv/config';
import knexFactory from 'knex';
import knexConfig from '../knexfile.js';

const destino = knexFactory(knexConfig);
const legado = knexFactory({
  ...knexConfig,
  connection: {
    ...knexConfig.connection,
    database: process.env.LEGACY_DB_NAME || 'seanlabsantafe',
    // las fechas viajan como texto para no corromper valores tipo 0000-00-00
    dateStrings: true,
  },
});

const limpiar = (s) => (typeof s === 'string' ? s.replace(/[\t\r\n]+/g, ' ').trim() : s);
// la BD legada tiene registros con nombre NULL o vacío
const obligatorio = (s, fallback = 'N/D') => limpiar(s) || fallback;
// fechas inválidas del legado (0000-00-00) → fallback
const fecha = (d, fallback = null) => (!d || String(d).startsWith('0000')) ? fallback : d;

async function copiarTabla(nombre, { origen = nombre, transform = (r) => r, chunk = 500 } = {}) {
  const filas = await legado(origen).select('*');
  const transformadas = filas.map(transform).filter(Boolean).map((row) => {
    for (const k of Object.keys(row)) row[k] = limpiar(row[k]);
    return row;
  });
  if (transformadas.length) {
    await destino.batchInsert(nombre, transformadas, chunk);
  }
  console.log(`  ${nombre}: ${transformadas.length} filas`);
}

async function main() {
  console.log('Iniciando ETL desde', process.env.LEGACY_DB_NAME || 'seanlabsantafe');

  await destino.raw('SET FOREIGN_KEY_CHECKS = 0');

  const tablasDestino = [
    'archivos', 'bitacora', 'resultado_orina', 'resultado_heces',
    'cotizacion_detalle', 'cotizacion', 'combo_examen', 'examen',
    'parametros_orinas', 'categoria_orinas', 'parametros_heces', 'categoria_heces',
    'palabra_cualitativo', 'categoria_examen', 'unidad_medida',
    'medico', 'paciente', 'sexo', 'users', 'empresa',
  ];
  for (const t of tablasDestino) await destino(t).truncate();

  // --- Catálogos ---
  await copiarTabla('sexo', { transform: (r) => ({ ...r, nombre: obligatorio(r.nombre) }) });
  await copiarTabla('unidad_medida', { transform: (r) => ({ ...r, nombre: obligatorio(r.nombre) }) });
  await copiarTabla('categoria_examen', {
    transform: (r) => ({ id: r.id, nombre: obligatorio(r.nombre), orden: r.orden ?? 0, estado: r.estado, created_at: r.created_at, updated_at: r.updated_at }),
  });
  await copiarTabla('palabra_cualitativo', { transform: (r) => ({ ...r, nombre: obligatorio(r.nombre) }) });

  await copiarTabla('categoria_heces', {
    transform: (r) => ({ id: r.id, nombre: obligatorio(r.nombre), orden: r.orden ?? 0, estado: r.estado, created_at: r.created_at, updated_at: r.updated_at }),
  });
  await copiarTabla('parametros_heces', {
    transform: (r) => ({ id: r.id, categoria_heces_id: r.categoria_heces_id, nombre: obligatorio(r.multi_seleccion), estado: r.estado, created_at: r.created_at, updated_at: r.updated_at }),
  });
  await copiarTabla('categoria_orinas', {
    transform: (r) => ({ id: r.id, nombre: obligatorio(r.nombre), orden: r.orden ?? 0, estado: r.estado, created_at: r.created_at, updated_at: r.updated_at }),
  });
  await copiarTabla('parametros_orinas', {
    transform: (r) => ({ id: r.id, categoria_orina_id: r.categoria_orina_id, nombre: obligatorio(r.multi_seleccion), estado: r.estado, created_at: r.created_at, updated_at: r.updated_at }),
  });

  // --- Empresa ---
  await copiarTabla('empresa');

  // --- Usuarios: conserva hash bcrypt de Laravel y mapea rol (spatie) ---
  const rolesLegado = await legado('roles').select('id', 'name');
  const rolesNuevo = await destino('roles').select('id', 'nombre');
  const mapaRol = new Map(); // id legado -> id nuevo
  for (const rl of rolesLegado) {
    const rn = rolesNuevo.find((x) => x.nombre.toLowerCase() === rl.name.toLowerCase());
    if (rn) mapaRol.set(rl.id, rn.id);
  }
  const asignaciones = await legado('model_has_roles').select('role_id', 'model_id');
  await copiarTabla('users', {
    transform: (r) => {
      const asig = asignaciones.find((a) => a.model_id === r.id);
      return {
        id: r.id, name: r.name, username: r.username, email: r.email,
        password: r.password,
        role_id: asig ? (mapaRol.get(asig.role_id) ?? null) : null,
        active: r.active, created_at: r.created_at, updated_at: r.updated_at,
      };
    },
  });

  // --- Pacientes y médicos ---
  await copiarTabla('paciente', {
    transform: (r) => ({
      id: r.id, dpi: r.dpi, nombres: obligatorio(r.nombres), apellidos: obligatorio(r.apellidos, ''),
      mail: r.mail, telefono: r.telefono, celular: r.celular, direccion: r.direccion,
      nit: r.nit, id_sexo: r.id_sexo, fecha_nacimiento: fecha(r.fecha_nacimiento, '1900-01-01'),
      tipo_sangre: r.tipo_sangre, estado: r.estado, created_at: r.created_at, updated_at: r.updated_at,
    }),
  });
  await copiarTabla('medico', {
    transform: (r) => ({
      id: r.id, nombres: obligatorio(r.nombres), apellidos: obligatorio(r.apellidos, ''),
      no_cuenta: r.no_cuenta, telefono: r.telefono, celular: r.celular,
      direccion: r.direccion, mail: r.mail, porcentaje: r.porcentaje ?? 0,
      comision: r.comision ?? 0, socio: r.socio ?? 0, estado: r.estado,
      created_at: r.created_at, updated_at: r.updated_at,
    }),
  });

  // --- Exámenes y combos ---
  await copiarTabla('examen', {
    transform: (r) => ({
      id: r.id, id_categoria: r.id_categoria, codigo: obligatorio(r.codigo, String(r.id)), nombre: obligatorio(r.nombre),
      precio: r.precio, rango_inferior: r.rango_inferior, rango_superior: r.rango_superior,
      valor_deseado: r.valor_deseado, valor_craig: r.valor_craig,
      valor_bosnan: r.valor_bosnan, valor_scully: r.valor_scully,
      tipo_examen: r.tipo_examen, id_unidad_medida: r.id_unidad_medida,
      pprueba: r.pprueba ?? 0, insumos: r.insumos ?? 0, estado: r.estado,
      created_at: r.created_at, updated_at: r.updated_at,
    }),
  });
  await copiarTabla('combo_examen', {
    transform: (r) => ({
      id: r.id, id_examen: r.id_examen, es_principal: r.es_principal ?? 0,
      es_secundario: r.es_secundario ?? 0, aparece_en_cotizacion: r.aparece_en_cotizacion ?? 0,
      id_examen_principal: r.id_examen_principal,
    }),
  });

  // --- Órdenes y resultados ---
  const medicosIds = new Set(await destino('medico').pluck('id'));
  await copiarTabla('cotizacion', {
    transform: (r) => ({
      id: r.id, id_paciente: r.id_paciente, id_medico: r.id_medico,
      fecha_cotizacion: fecha(r.fecha_cotizacion, r.created_at?.slice(0, 10) ?? '1900-01-01'),
      observaciones: r.observaciones,
      estado_documento: r.estado_documento,
      // el legado usa 0/1 como "sin médico hijo"; solo conservamos ids reales
      id_medico_hijo: medicosIds.has(r.id_medico_hijo) && r.id_medico_hijo > 1 ? r.id_medico_hijo : null,
      comision_medico_hijo: r.comision_medico_hijo ?? 0,
      estado: r.estado, created_at: r.created_at, updated_at: r.updated_at,
    }),
  });
  await copiarTabla('cotizacion_detalle', {
    transform: (r) => ({
      id: r.id, id_cotizacion: r.id_cotizacion, id_examen: r.id_examen,
      precio: r.precio, cantidad: r.cantidad, resultado: r.resultado,
      descuento: r.descuento ?? 0, comision: r.comision ?? 0,
      pprueba: r.pprueba ?? 0, insumos: r.insumos ?? 0,
      coniva: r.coniva ?? 1, estado: r.estado,
      created_at: r.created_at, updated_at: r.updated_at,
    }),
    chunk: 1000,
  });
  await copiarTabla('resultado_heces', {
    transform: (r) => ({
      id: r.id, id_cotizacion: r.id_cotizacion, id_categoria_heces: r.id_categoria_heces,
      id_parametro_heces: r.id_parametro_heces, estado: r.estado,
      created_at: r.created_at, updated_at: r.updated_at,
    }),
  });
  await copiarTabla('resultado_orina', {
    transform: (r) => ({
      id: r.id, id_cotizacion: r.id_cotizacion, id_categoria_orina: r.id_categoria_orina,
      valor: r.valor, id_parametro_orina: r.id_parametro_orina, estado: r.estado,
      created_at: r.created_at, updated_at: r.updated_at,
    }),
  });

  // --- Bitácora histórica ---
  const usersIds = new Set(await destino('users').pluck('id'));
  await copiarTabla('bitacora', {
    transform: (r) => ({
      id: r.id, user_id: usersIds.has(r.user_id) ? r.user_id : null,
      accion: r.accion, info_anterior: r.info_anterior, info_nueva: r.info_nueva,
      nombre_tabla: r.nombre_tabla, created_at: r.created_at,
    }),
    chunk: 200,
  });

  await destino.raw('SET FOREIGN_KEY_CHECKS = 1');

  // Verificación rápida de integridad
  const conteos = {};
  for (const t of ['paciente', 'medico', 'examen', 'cotizacion', 'cotizacion_detalle', 'users']) {
    const [{ n }] = await destino(t).count('* as n');
    conteos[t] = +n;
  }
  console.log('ETL completado. Conteos destino:', conteos);
  console.log('Nota: corre "npm run seed" después del ETL para restaurar el usuario admin.');
}

main()
  .catch((err) => { console.error('ETL falló:', err); process.exitCode = 1; })
  .finally(async () => { await destino.destroy(); await legado.destroy(); });
