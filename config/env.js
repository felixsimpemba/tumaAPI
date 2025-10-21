// Environment loader and simple validation
// Loads .env (if present) and exports a config object with sane defaults for local dev.

const fs = require('fs');
const path = require('path');

// Load .env if exists
try {
  const dotenv = require('dotenv');
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  } else {
    // still call config to pick up process.env if already set by host
    dotenv.config();
  }
} catch (e) {
  // dotenv not installed yet; will be added via package.json update
}

function requireEnv(name, fallback) {
  const val = process.env[name];
  if (val === undefined || val === null || val === '') {
    if (fallback !== undefined) return fallback;
    return undefined;
  }
  return val;
}

const NODE_ENV = requireEnv('NODE_ENV', 'development');
const isProd = NODE_ENV === 'production';

// Database: support either DATABASE_URL connection string or discrete parts
const DB_DIALECT = requireEnv('DB_DIALECT', 'mysql'); // 'mysql' | 'postgres'
const DATABASE_URL = requireEnv('DATABASE_URL');
const DB_HOST = requireEnv('DB_HOST', '127.0.0.1');
const DB_PORT = parseInt(requireEnv('DB_PORT', DB_DIALECT === 'postgres' ? '5432' : '3306'), 10);
const DB_USER = requireEnv('DB_USER', 'root');
const DB_PASSWORD = requireEnv('DB_PASSWORD', 'root');
const DB_NAME = requireEnv('DB_NAME', 'tumaapi');

const config = {
  env: NODE_ENV,
  isProd,
  port: parseInt(requireEnv('PORT', '3000'), 10),
  jwt: {
    secret: requireEnv('JWT_SECRET', 'dev_secret_change_me'),
    expiresIn: requireEnv('JWT_EXPIRES_IN', '15m'),
    refreshSecret: requireEnv('JWT_REFRESH_SECRET', 'dev_refresh_change_me'),
    refreshExpiresIn: requireEnv('JWT_REFRESH_EXPIRES_IN', '7d'),
  },
  otp: {
    ttl: parseInt(requireEnv('OTP_CODE_TTL', '300'), 10),
    maxAttempts: parseInt(requireEnv('OTP_MAX_ATTEMPTS', '5'), 10),
    rateWindowSec: parseInt(requireEnv('OTP_RATE_LIMIT_WINDOW', '60'), 10),
    universalEnabled: (requireEnv('OTP_UNIVERSAL_ENABLED', isProd ? 'false' : 'true') === 'true'),
    universalCode: requireEnv('OTP_UNIVERSAL_CODE', '222222'),
  },
  db: {
    dialect: DB_DIALECT,
    url: DATABASE_URL,
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    name: DB_NAME,
    logging: requireEnv('DB_LOGGING', 'false') === 'true',
    ssl: requireEnv('DB_SSL', 'false') === 'true',
    connectRetries: parseInt(requireEnv('DB_CONNECT_RETRIES', '10'), 10),
    connectRetryDelayMs: parseInt(requireEnv('DB_CONNECT_RETRY_DELAY_MS', '1500'), 10),
  },
  googleMapsApiKey: requireEnv('GOOGLE_MAPS_API_KEY'),
  fcmServerKey: requireEnv('FCM_SERVER_KEY'),
  baseUrl: requireEnv('BASE_URL', `http://localhost:${requireEnv('PORT', '3000')}`),
};

module.exports = config;
