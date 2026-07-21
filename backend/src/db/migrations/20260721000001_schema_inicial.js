/**
 * Esquema inicial del sistema de laboratorio.
 * Mantiene nombres de tablas/columnas compatibles con la BD legada
 * (seanlabsantafe) para que el ETL de producción sea casi 1:1,
 * pero agrega claves foráneas reales, índices y un RBAC simplificado.
 */

const commonDefaults = (table, knex) => {
  table.boolean('estado').notNullable().defaultTo(true);
  table.timestamp('created_at').defaultTo(knex.fn.now());
  table.timestamp('updated_at').defaultTo(knex.fn.now());
};

export async function up(knex) {
  // ---------- RBAC ----------
  await knex.schema.createTable('roles', (t) => {
    t.increments('id');
    t.string('nombre', 100).notNullable().unique();
    t.string('descripcion', 255);
    commonDefaults(t, knex);
  });

  await knex.schema.createTable('permissions', (t) => {
    t.increments('id');
    t.string('codigo', 100).notNullable().unique(); // p.ej. pacientes.crear
    t.string('nombre', 191).notNullable();
    t.string('modulo', 60).notNullable();
  });

  await knex.schema.createTable('role_permissions', (t) => {
    t.integer('role_id').unsigned().notNullable()
      .references('id').inTable('roles').onDelete('CASCADE');
    t.integer('permission_id').unsigned().notNullable()
      .references('id').inTable('permissions').onDelete('CASCADE');
    t.primary(['role_id', 'permission_id']);
  });

  await knex.schema.createTable('users', (t) => {
    t.increments('id');
    t.string('name', 191).notNullable();
    t.string('username', 191).notNullable().unique();
    t.string('email', 191).notNullable().unique();
    t.string('password', 191).notNullable();
    t.integer('role_id').unsigned().references('id').inTable('roles');
    t.boolean('active').notNullable().defaultTo(true);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // ---------- Empresa / configuración ----------
  await knex.schema.createTable('empresa', (t) => {
    t.increments('id');
    t.string('nit', 30);
    t.string('nombre_contable', 191);
    t.string('nombre_comercial', 191);
    t.string('direccion', 255);
    t.string('telefonos', 100);
    t.string('email', 191);
    t.string('logotipo', 255);
    t.date('fecha_inicio');
    t.string('no_patente', 100);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // ---------- Catálogos ----------
  await knex.schema.createTable('sexo', (t) => {
    t.increments('id');
    t.string('nombre', 100).notNullable();
    commonDefaults(t, knex);
  });

  await knex.schema.createTable('unidad_medida', (t) => {
    t.increments('id');
    t.string('nombre', 191).notNullable();
    commonDefaults(t, knex);
  });

  await knex.schema.createTable('categoria_examen', (t) => {
    t.increments('id');
    t.string('nombre', 191).notNullable();
    t.integer('orden').notNullable().defaultTo(0); // orden de impresión en resultados
    commonDefaults(t, knex);
  });

  await knex.schema.createTable('tipo_examen', (t) => {
    t.increments('id');
    t.string('nombre', 100).notNullable(); // Numerico, Positivo/Negativo, Tecleado, Heces, Orina, Estatico
    commonDefaults(t, knex);
  });

  await knex.schema.createTable('palabra_cualitativo', (t) => {
    t.increments('id');
    t.string('nombre', 191).notNullable(); // valores sugeridos para exámenes cualitativos
    commonDefaults(t, knex);
  });

  // ---------- Exámenes ----------
  await knex.schema.createTable('examen', (t) => {
    t.increments('id');
    t.integer('id_categoria').unsigned().notNullable()
      .references('id').inTable('categoria_examen');
    t.string('codigo', 60).notNullable().unique();
    t.string('nombre', 191).notNullable();
    t.decimal('precio', 10, 2).notNullable().defaultTo(0);
    t.decimal('rango_inferior', 10, 2);
    t.decimal('rango_superior', 10, 2);
    t.text('valor_deseado');   // texto de valores de referencia (impreso en resultados)
    t.text('valor_craig');     // campos históricos de referencia por plantilla
    t.text('valor_bosnan');
    t.text('valor_scully');
    t.integer('tipo_examen').unsigned().notNullable()
      .references('id').inTable('tipo_examen');
    t.integer('id_unidad_medida').unsigned().notNullable()
      .references('id').inTable('unidad_medida');
    t.decimal('pprueba', 10, 2).defaultTo(0); // costo de la prueba
    t.decimal('insumos', 10, 2).defaultTo(0); // costo de insumos
    commonDefaults(t, knex);
  });

  await knex.schema.createTable('combo_examen', (t) => {
    t.increments('id');
    t.integer('id_examen').unsigned().notNullable()
      .references('id').inTable('examen');
    t.boolean('es_principal').notNullable().defaultTo(false);
    t.boolean('es_secundario').notNullable().defaultTo(false);
    t.boolean('aparece_en_cotizacion').notNullable().defaultTo(false);
    t.integer('id_examen_principal').unsigned().notNullable()
      .references('id').inTable('examen');
    t.index(['id_examen_principal']);
  });

  // ---------- Pacientes y médicos ----------
  await knex.schema.createTable('paciente', (t) => {
    t.increments('id');
    t.string('dpi', 30);
    t.string('nombres', 191).notNullable();
    t.string('apellidos', 191).notNullable();
    t.string('mail', 191);
    t.string('telefono', 30);
    t.string('celular', 30);
    t.string('direccion', 255);
    t.string('nit', 20);
    t.integer('id_sexo').unsigned().notNullable().references('id').inTable('sexo');
    t.date('fecha_nacimiento').notNullable();
    t.string('tipo_sangre', 10);
    commonDefaults(t, knex);
    t.index(['apellidos', 'nombres']);
  });

  await knex.schema.createTable('medico', (t) => {
    t.increments('id');
    t.string('nombres', 191).notNullable();
    t.string('apellidos', 191).notNullable();
    t.string('no_cuenta', 191);
    t.string('telefono', 30);
    t.string('celular', 30);
    t.string('direccion', 255);
    t.string('mail', 191);
    t.integer('porcentaje').notNullable().defaultTo(0); // % de comisión por defecto
    t.integer('comision').notNullable().defaultTo(0);
    t.boolean('socio').notNullable().defaultTo(false);
    commonDefaults(t, knex);
  });

  // ---------- Órdenes (cotización → análisis → finalizado) ----------
  await knex.schema.createTable('cotizacion', (t) => {
    t.increments('id');
    t.integer('id_paciente').unsigned().notNullable().references('id').inTable('paciente');
    t.integer('id_medico').unsigned().notNullable().references('id').inTable('medico');
    t.date('fecha_cotizacion').notNullable();
    t.string('observaciones', 350);
    // 1 = cotización, 2 = venta / análisis en proceso, 3 = análisis finalizado
    t.tinyint('estado_documento').notNullable().defaultTo(1);
    t.integer('id_medico_hijo').unsigned().references('id').inTable('medico');
    t.decimal('comision_medico_hijo', 10, 2).defaultTo(0);
    t.integer('created_by').unsigned().references('id').inTable('users');
    commonDefaults(t, knex);
    t.index(['estado_documento', 'estado']);
    t.index(['fecha_cotizacion']);
  });

  await knex.schema.createTable('cotizacion_detalle', (t) => {
    t.increments('id');
    t.integer('id_cotizacion').unsigned().notNullable()
      .references('id').inTable('cotizacion').onDelete('CASCADE');
    t.integer('id_examen').unsigned().notNullable().references('id').inTable('examen');
    t.decimal('precio', 10, 2).notNullable().defaultTo(0);
    t.integer('cantidad').notNullable().defaultTo(1);
    t.text('resultado');
    t.decimal('descuento', 10, 2).defaultTo(0);
    t.decimal('comision', 10, 2).defaultTo(0);
    t.decimal('pprueba', 10, 2).defaultTo(0);
    t.decimal('insumos', 10, 2).defaultTo(0);
    t.boolean('coniva').notNullable().defaultTo(true);
    commonDefaults(t, knex);
    t.index(['id_cotizacion', 'estado']);
  });

  // ---------- Heces / Orina ----------
  await knex.schema.createTable('categoria_heces', (t) => {
    t.increments('id');
    t.string('nombre', 191).notNullable();
    t.integer('orden').notNullable().defaultTo(0);
    commonDefaults(t, knex);
  });

  await knex.schema.createTable('parametros_heces', (t) => {
    t.increments('id');
    t.integer('categoria_heces_id').unsigned().notNullable()
      .references('id').inTable('categoria_heces');
    // en la BD legada esta columna se llama multi_seleccion y guarda la opción
    t.string('nombre', 191).notNullable();
    commonDefaults(t, knex);
  });

  await knex.schema.createTable('resultado_heces', (t) => {
    t.increments('id');
    t.integer('id_cotizacion').unsigned().notNullable()
      .references('id').inTable('cotizacion').onDelete('CASCADE');
    t.integer('id_categoria_heces').unsigned().notNullable()
      .references('id').inTable('categoria_heces');
    t.integer('id_parametro_heces').unsigned().notNullable()
      .references('id').inTable('parametros_heces');
    commonDefaults(t, knex);
    t.index(['id_cotizacion', 'estado']);
  });

  await knex.schema.createTable('categoria_orinas', (t) => {
    t.increments('id');
    t.string('nombre', 191).notNullable();
    t.integer('orden').notNullable().defaultTo(0);
    commonDefaults(t, knex);
  });

  await knex.schema.createTable('parametros_orinas', (t) => {
    t.increments('id');
    t.integer('categoria_orina_id').unsigned().notNullable()
      .references('id').inTable('categoria_orinas');
    t.string('nombre', 191).notNullable();
    commonDefaults(t, knex);
  });

  await knex.schema.createTable('resultado_orina', (t) => {
    t.increments('id');
    t.integer('id_cotizacion').unsigned().notNullable()
      .references('id').inTable('cotizacion').onDelete('CASCADE');
    t.integer('id_categoria_orina').unsigned().notNullable()
      .references('id').inTable('categoria_orinas');
    t.string('valor', 191); // valor libre cuando el parámetro es de texto
    t.integer('id_parametro_orina').unsigned()
      .references('id').inTable('parametros_orinas');
    commonDefaults(t, knex);
    t.index(['id_cotizacion', 'estado']);
  });

  // ---------- Auditoría y archivos ----------
  await knex.schema.createTable('bitacora', (t) => {
    t.bigIncrements('id');
    t.integer('user_id').unsigned().references('id').inTable('users');
    t.string('accion', 60).notNullable(); // Creación, Edición, Eliminación, Login...
    t.text('info_anterior', 'longtext');
    t.text('info_nueva', 'longtext');
    t.string('nombre_tabla', 100);
    t.integer('registro_id').unsigned();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.index(['nombre_tabla', 'registro_id']);
    t.index(['created_at']);
  });

  await knex.schema.createTable('archivos', (t) => {
    t.increments('id');
    t.uuid('uuid').notNullable().unique();
    t.integer('id_cotizacion').unsigned().notNullable()
      .references('id').inTable('cotizacion').onDelete('CASCADE');
    t.string('titulo', 191).notNullable();
    t.string('nombre_original', 255).notNullable();
    t.string('ruta', 255).notNullable();
    t.string('mime', 100);
    t.integer('subido_por').unsigned().references('id').inTable('users');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  const tables = [
    'archivos', 'bitacora',
    'resultado_orina', 'parametros_orinas', 'categoria_orinas',
    'resultado_heces', 'parametros_heces', 'categoria_heces',
    'cotizacion_detalle', 'cotizacion',
    'medico', 'paciente',
    'combo_examen', 'examen',
    'palabra_cualitativo', 'tipo_examen', 'categoria_examen',
    'unidad_medida', 'sexo', 'empresa',
    'users', 'role_permissions', 'permissions', 'roles',
  ];
  for (const t of tables) await knex.schema.dropTableIfExists(t);
}
