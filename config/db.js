const config = require('./env');
const { Sequelize } = require('sequelize');

let sequelize;

const commonOptions = {
  logging: config.db.logging ? console.log : false,
  dialect: config.db.dialect,
  dialectOptions: config.db.ssl ? { ssl: { require: true, rejectUnauthorized: false } } : {},
  pool: {
    max: 10,
    min: 0,
    acquire: 20000,
    idle: 10000,
  },
  retry: {
    max: 0, // We'll implement our own connect retry below for clarity
  },
  timezone: '+00:00',
};

if (config.db.url) {
  sequelize = new Sequelize(config.db.url, commonOptions);
} else {
  sequelize = new Sequelize(config.db.name, config.db.user, config.db.password, {
    host: config.db.host,
    port: config.db.port,
    ...commonOptions,
  });
}

// Initialize models
const { initModels } = require('../models');
const models = initModels(sequelize);

async function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

async function checkConnection() {
  const maxAttempts = Math.max(1, Number(config.db.connectRetries || 1));
  const delayMs = Math.max(0, Number(config.db.connectRetryDelayMs || 0));
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (attempt > 1 && config.db.logging) {
        console.log(`[db] Retry attempt ${attempt}/${maxAttempts}...`);
      }
      await sequelize.authenticate();
      return true;
    } catch (err) {
      lastErr = err;
      const msg = (err && (err.message || String(err))) || '';
      const code = err && err.code;
      const looksLikeAuthPluginIssue = (
        code === 'ER_NOT_SUPPORTED_AUTH_MODE' ||
        /unknown plugin/i.test(msg) ||
        /auth_gssapi_client/i.test(msg) ||
        (/plugin/i.test(msg) && /auth/i.test(msg))
      );
      const isAccessDenied = code === 'ER_ACCESS_DENIED_ERROR' || /Access denied for user/i.test(msg);
      if (config.db.dialect === 'mysql' && (looksLikeAuthPluginIssue || isAccessDenied)) {
        const hints = [];
        if (looksLikeAuthPluginIssue) {
          hints.push('MySQL authentication plugin not supported by mysql2/Sequelize. Switch the DB user to mysql_native_password or caching_sha2_password. See Docs/mysql-auth-plugins.md for steps.');
        }
        if (isAccessDenied) {
          const pwNote = (config.db.password === '' || config.db.password === undefined) ? ' It looks like DB_PASSWORD may be empty; ensure the correct password is set.' : '';
          hints.push('Access denied: verify DB_USER/DB_PASSWORD, and that the user is allowed from this host (GRANT/ALTER USER host). Consider: ALTER USER \'YOUR_USER\'@\'YOUR_HOST\' IDENTIFIED BY \'YOUR_PASSWORD\';' + pwNote);
        }
        err.message = `${msg} \nHint: ${hints.join(' ')}`;
      }
      if (attempt < maxAttempts) {
        await sleep(delayMs);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

async function syncModels(options = {}) {
  const { force = false, alter = false } = options;
  if (config.isProd && (force || alter)) {
    console.warn('[db] Avoid sync with force/alter in production. Skipping.');
    return null;
  }
  return sequelize.sync({ force, alter });
}

module.exports = {
  sequelize,
  checkConnection,
  syncModels,
  ...models,
};
