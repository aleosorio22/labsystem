const db = require('../../../core/config/database');

/**
 * Modelo genérico para catálogos simples con borrado lógico (columna `estado`).
 * Cada catálogo se instancia con su tabla y opciones; ver catalogoRoutes.
 */
class CatalogoModel {
  constructor(tabla, { searchColumns = ['nombre'], orderBy = 'nombre', columnas = ['nombre', 'orden'] } = {}) {
    this.tabla = tabla;
    this.searchColumns = searchColumns;
    this.orderBy = orderBy;
    this.columnas = columnas;
  }

  async getAll({ q, incluirInactivos = false } = {}) {
    let where = incluirInactivos ? 'WHERE 1=1' : 'WHERE estado = 1';
    const params = [];
    if (q) {
      where += ` AND (${this.searchColumns.map((c) => `${c} LIKE ?`).join(' OR ')})`;
      this.searchColumns.forEach(() => params.push(`%${q}%`));
    }
    const [rows] = await db.execute(
      `SELECT * FROM ${this.tabla} ${where} ORDER BY ${this.orderBy}`, params,
    );
    return rows;
  }

  async findById(id) {
    const [[row]] = await db.execute(`SELECT * FROM ${this.tabla} WHERE id = ?`, [id]);
    return row;
  }

  async create(data) {
    const campos = this.columnas.filter((c) => data[c] !== undefined);
    const [result] = await db.execute(
      `INSERT INTO ${this.tabla} (${campos.join(', ')}) VALUES (${campos.map(() => '?').join(', ')})`,
      campos.map((c) => data[c] ?? null),
    );
    return result.insertId;
  }

  async update(id, data) {
    const campos = this.columnas.filter((c) => data[c] !== undefined);
    const valores = campos.map((c) => data[c] ?? null);
    if (data.estado !== undefined) {
      campos.push('estado');
      valores.push(data.estado ? 1 : 0);
    }
    if (!campos.length) return false;
    const [result] = await db.execute(
      `UPDATE ${this.tabla} SET ${campos.map((c) => `${c} = ?`).join(', ')}, updated_at = NOW() WHERE id = ?`,
      [...valores, id],
    );
    return result.affectedRows > 0;
  }

  async softDelete(id) {
    const [result] = await db.execute(
      `UPDATE ${this.tabla} SET estado = 0, updated_at = NOW() WHERE id = ?`, [id],
    );
    return result.affectedRows > 0;
  }
}

// Instancias por catálogo (tabla → columnas editables)
const catalogos = {
  sexos: new CatalogoModel('sexo', { columnas: ['nombre'] }),
  'unidades-medida': new CatalogoModel('unidad_medida', { columnas: ['nombre'] }),
  'categorias-examen': new CatalogoModel('categoria_examen', { columnas: ['nombre', 'orden'] }),
  'palabras-cualitativo': new CatalogoModel('palabra_cualitativo', { columnas: ['nombre'] }),
  'categorias-heces': new CatalogoModel('categoria_heces', { columnas: ['nombre', 'orden'], orderBy: 'orden' }),
  'categorias-orina': new CatalogoModel('categoria_orinas', { columnas: ['nombre', 'orden'], orderBy: 'orden' }),
  'parametros-heces': new CatalogoModel('parametros_heces', { columnas: ['nombre', 'categoria_heces_id'] }),
  'parametros-orina': new CatalogoModel('parametros_orinas', { columnas: ['nombre', 'categoria_orina_id'] }),
};

async function getTiposExamen() {
  const [rows] = await db.execute('SELECT * FROM tipo_examen WHERE estado = 1 ORDER BY id');
  return rows;
}

module.exports = { CatalogoModel, catalogos, getTiposExamen };
