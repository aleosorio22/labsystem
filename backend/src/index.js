const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./core/config');
const db = require('./core/config/database');
const { errorHandler } = require('./core/errors');

const authRoutes = require('./modules/sistema/routes/authRoutes');
const userRoutes = require('./modules/sistema/routes/userRoutes');
const rolRoutes = require('./modules/sistema/routes/rolRoutes');
const catalogoRoutes = require('./modules/sistema/routes/catalogoRoutes');
const pacienteRoutes = require('./modules/sistema/routes/pacienteRoutes');
const medicoRoutes = require('./modules/sistema/routes/medicoRoutes');
const examenRoutes = require('./modules/sistema/routes/examenRoutes');
const ordenRoutes = require('./modules/sistema/routes/ordenRoutes');
const reporteRoutes = require('./modules/sistema/routes/reporteRoutes');
const empresaRoutes = require('./modules/sistema/routes/empresaRoutes');
const bitacoraRoutes = require('./modules/sistema/routes/bitacoraRoutes');

const app = express();

// En hosting (Hostinger, nginx, etc.) la app corre detrás de un proxy que
// manda la IP real en X-Forwarded-For. Sin esto, express-rate-limit ve la IP
// del proxy para todos y un solo usuario podría agotar el límite de intentos
// de login de todo el mundo. Se confía solo en el primer salto.
if (config.env === 'production') app.set('trust proxy', 1);

// Middlewares
app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '2mb' }));
if (config.env === 'development') app.use(morgan('dev'));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', userRoutes);
app.use('/api/roles', rolRoutes);
app.use('/api/catalogos', catalogoRoutes);
app.use('/api/pacientes', pacienteRoutes);
app.use('/api/medicos', medicoRoutes);
app.use('/api/examenes', examenRoutes);
app.use('/api/ordenes', ordenRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/empresa', empresaRoutes);
app.use('/api/bitacora', bitacoraRoutes);

// Manejo de errores
app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use(errorHandler);

app.listen(config.port, async () => {
  try {
    await db.query('SELECT 1');
    console.log(`API escuchando en http://localhost:${config.port} (BD conectada)`);
  } catch (err) {
    console.error('No se pudo conectar a la base de datos:', err.message);
  }
});
