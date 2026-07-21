import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/index.js';
import { errorHandler } from './core/errors.js';

import authRoutes from './modules/auth/auth.routes.js';
import usuariosRoutes from './modules/usuarios/usuarios.routes.js';
import rolesRoutes from './modules/roles/roles.routes.js';
import catalogosRoutes from './modules/catalogos/catalogos.routes.js';
import pacientesRoutes from './modules/pacientes/pacientes.routes.js';
import medicosRoutes from './modules/medicos/medicos.routes.js';
import examenesRoutes from './modules/examenes/examenes.routes.js';
import ordenesRoutes from './modules/ordenes/ordenes.routes.js';
import reportesRoutes from './modules/reportes/reportes.routes.js';
import empresaRoutes from './modules/empresa/empresa.routes.js';
import bitacoraRoutes from './modules/bitacora/bitacora.routes.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: '2mb' }));
  if (config.env === 'development') app.use(morgan('dev'));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.use('/api/auth', authRoutes);
  app.use('/api/usuarios', usuariosRoutes);
  app.use('/api/roles', rolesRoutes);
  app.use('/api/catalogos', catalogosRoutes);
  app.use('/api/pacientes', pacientesRoutes);
  app.use('/api/medicos', medicosRoutes);
  app.use('/api/examenes', examenesRoutes);
  app.use('/api/ordenes', ordenesRoutes);
  app.use('/api/reportes', reportesRoutes);
  app.use('/api/empresa', empresaRoutes);
  app.use('/api/bitacora', bitacoraRoutes);

  app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
  app.use(errorHandler);

  return app;
}
