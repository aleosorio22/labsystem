const bcrypt = require('bcryptjs');

/** Permisos por módulo: [código, nombre] */
const PERMISOS = {
  dashboard: [['dashboard.ver', 'Ver dashboard']],
  pacientes: [
    ['pacientes.ver', 'Ver pacientes'],
    ['pacientes.crear', 'Crear pacientes'],
    ['pacientes.editar', 'Editar pacientes'],
    ['pacientes.eliminar', 'Eliminar pacientes'],
  ],
  medicos: [
    ['medicos.ver', 'Ver médicos'],
    ['medicos.crear', 'Crear médicos'],
    ['medicos.editar', 'Editar médicos'],
    ['medicos.eliminar', 'Eliminar médicos'],
  ],
  examenes: [
    ['examenes.ver', 'Ver exámenes'],
    ['examenes.crear', 'Crear exámenes'],
    ['examenes.editar', 'Editar exámenes'],
    ['examenes.eliminar', 'Eliminar exámenes'],
  ],
  catalogos: [
    ['catalogos.ver', 'Ver catálogos'],
    ['catalogos.crear', 'Crear registros de catálogo'],
    ['catalogos.editar', 'Editar registros de catálogo'],
    ['catalogos.eliminar', 'Eliminar registros de catálogo'],
  ],
  ordenes: [
    ['ordenes.ver', 'Ver cotizaciones y órdenes'],
    ['ordenes.crear', 'Crear cotizaciones'],
    ['ordenes.editar', 'Editar cotizaciones'],
    ['ordenes.eliminar', 'Anular cotizaciones'],
    ['ordenes.convertir', 'Pasar cotización a análisis'],
  ],
  resultados: [
    ['resultados.ver', 'Ver análisis'],
    ['resultados.capturar', 'Capturar resultados'],
    ['resultados.finalizar', 'Finalizar análisis'],
    ['resultados.reabrir', 'Reabrir análisis finalizado'],
    ['resultados.imprimir', 'Imprimir/enviar resultados'],
  ],
  reportes: [['reportes.ver', 'Ver reportes']],
  usuarios: [
    ['usuarios.ver', 'Ver usuarios'],
    ['usuarios.crear', 'Crear usuarios'],
    ['usuarios.editar', 'Editar usuarios'],
    ['usuarios.eliminar', 'Desactivar usuarios'],
  ],
  roles: [
    ['roles.ver', 'Ver roles'],
    ['roles.editar', 'Administrar roles y permisos'],
  ],
  empresa: [['empresa.ver', 'Ver datos de la empresa'], ['empresa.editar', 'Editar datos de la empresa']],
  bitacora: [['bitacora.ver', 'Ver bitácora']],
};

/** Roles heredados del sistema anterior y sus permisos */
const ROLES = {
  'super-admin': { descripcion: 'Acceso total al sistema', permisos: '*' },
  Administrador: {
    descripcion: 'Administración completa excepto gestión de roles',
    permisos: (codigo) => !codigo.startsWith('roles.'),
  },
  Analista: {
    descripcion: 'Captura y finalización de resultados de laboratorio',
    permisos: [
      'dashboard.ver', 'pacientes.ver', 'examenes.ver', 'catalogos.ver',
      'ordenes.ver', 'resultados.ver', 'resultados.capturar',
      'resultados.finalizar', 'resultados.imprimir',
    ],
  },
  Secretaria: {
    descripcion: 'Recepción: pacientes, cotizaciones y ventas',
    permisos: [
      'dashboard.ver', 'pacientes.ver', 'pacientes.crear', 'pacientes.editar',
      'medicos.ver', 'examenes.ver', 'ordenes.ver', 'ordenes.crear',
      'ordenes.editar', 'ordenes.convertir', 'resultados.ver', 'resultados.imprimir',
    ],
  },
  'Secretaria-cotizacion': {
    descripcion: 'Solo creación de cotizaciones',
    permisos: [
      'dashboard.ver', 'pacientes.ver', 'pacientes.crear',
      'examenes.ver', 'ordenes.ver', 'ordenes.crear',
    ],
  },
};

async function seed(knex) {
  // Permisos (idempotente)
  const permisos = Object.entries(PERMISOS).flatMap(([modulo, lista]) =>
    lista.map(([codigo, nombre]) => ({ codigo, nombre, modulo })));
  await knex('permissions').insert(permisos).onConflict('codigo').ignore();
  const allPerms = await knex('permissions').select('id', 'codigo');

  for (const [nombre, def] of Object.entries(ROLES)) {
    let [role] = await knex('roles').where({ nombre });
    if (!role) {
      const [id] = await knex('roles').insert({ nombre, descripcion: def.descripcion });
      role = { id };
    }
    const asignados = allPerms.filter((p) => {
      if (def.permisos === '*') return true;
      if (typeof def.permisos === 'function') return def.permisos(p.codigo);
      return def.permisos.includes(p.codigo);
    });
    await knex('role_permissions').where({ role_id: role.id }).del();
    await knex('role_permissions').insert(
      asignados.map((p) => ({ role_id: role.id, permission_id: p.id })));
  }

  // Tipos de examen (ids fijos, compatibles con la BD legada)
  const tipos = [
    { id: 1, nombre: 'Numérico' },
    { id: 2, nombre: 'Positivo/Negativo' },
    { id: 3, nombre: 'Tecleado' },
    { id: 4, nombre: 'Heces' },
    { id: 5, nombre: 'Orina' },
    { id: 6, nombre: 'Estático' },
  ];
  await knex('tipo_examen').insert(tipos).onConflict('id').ignore();

  // Empresa (registro único editable desde la app)
  const empresa = await knex('empresa').first();
  if (!empresa) await knex('empresa').insert({ nombre_comercial: 'Laboratorio Santa Fe' });

  // Usuario administrador inicial (nombre distinto a los usuarios legados)
  const admin = await knex('users').where({ username: 'sysadmin' }).first();
  if (!admin) {
    const superAdmin = await knex('roles').where({ nombre: 'super-admin' }).first();
    await knex('users').insert({
      name: 'Administrador del Sistema',
      username: 'sysadmin',
      email: 'sysadmin@labsystem.local',
      password: bcrypt.hashSync('admin123', 10),
      role_id: superAdmin.id,
      active: true,
    });
  }
}

module.exports = { seed };
