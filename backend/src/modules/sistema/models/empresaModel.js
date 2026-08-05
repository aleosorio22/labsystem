const db = require('../../../core/config/database');

const CAMPOS = ['nit', 'nombre_contable', 'nombre_comercial', 'direccion',
  'telefonos', 'email', 'no_patente'];

class EmpresaModel {
  static async get() {
    const [[row]] = await db.execute('SELECT * FROM empresa LIMIT 1');
    return row;
  }

  static async update(data) {
    const actual = await EmpresaModel.get();
    const campos = CAMPOS.filter((c) => data[c] !== undefined);
    if (!campos.length) return actual;
    await db.execute(
      `UPDATE empresa SET ${campos.map((c) => `${c} = ?`).join(', ')}, updated_at = NOW() WHERE id = ?`,
      [...campos.map((c) => data[c] ?? null), actual.id],
    );
    return EmpresaModel.get();
  }
}

module.exports = EmpresaModel;
