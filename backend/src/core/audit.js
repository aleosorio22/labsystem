import { db } from '../db/knex.js';

/**
 * Registra una entrada en bitácora. No lanza: la auditoría nunca debe
 * romper la operación principal.
 */
export async function audit({ userId, accion, tabla, registroId, anterior, nuevo }) {
  try {
    await db('bitacora').insert({
      user_id: userId ?? null,
      accion,
      nombre_tabla: tabla ?? null,
      registro_id: registroId ?? null,
      info_anterior: anterior ? JSON.stringify(anterior) : null,
      info_nueva: nuevo ? JSON.stringify(nuevo) : null,
    });
  } catch (err) {
    console.error('Error escribiendo bitácora:', err.message);
  }
}
