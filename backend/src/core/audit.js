const db = require('./config/database');

/**
 * Registra una entrada en bitácora. No lanza: la auditoría nunca debe
 * romper la operación principal.
 */
async function audit({ userId, accion, tabla, registroId, anterior, nuevo }) {
  try {
    await db.execute(
      `INSERT INTO bitacora (user_id, accion, nombre_tabla, registro_id, info_anterior, info_nueva)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId ?? null,
        accion,
        tabla ?? null,
        registroId ?? null,
        anterior ? JSON.stringify(anterior) : null,
        nuevo ? JSON.stringify(nuevo) : null,
      ],
    );
  } catch (err) {
    console.error('Error escribiendo bitácora:', err.message);
  }
}

module.exports = { audit };
