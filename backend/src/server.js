import { createApp } from './app.js';
import { config } from './config/index.js';
import { db } from './db/knex.js';

const app = createApp();

app.listen(config.port, async () => {
  try {
    await db.raw('SELECT 1');
    console.log(`API escuchando en http://localhost:${config.port} (BD conectada)`);
  } catch (err) {
    console.error('No se pudo conectar a la base de datos:', err.message);
  }
});
