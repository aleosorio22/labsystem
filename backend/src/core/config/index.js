require('dotenv').config();
const path = require('path');

const rootDir = path.resolve(__dirname, '../../..');

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  uploadsDir: path.resolve(rootDir, process.env.UPLOADS_DIR || 'storage/uploads'),
  legacyDbName: process.env.LEGACY_DB_NAME || 'seanlabsantafe',
};

if (!config.jwt.secret) {
  throw new Error('JWT_SECRET no está definido en .env');
}

module.exports = config;
