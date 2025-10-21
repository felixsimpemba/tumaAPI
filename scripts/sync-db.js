#!/usr/bin/env node
// One-off script to create/update database tables from Sequelize models.
// Usage:
//   npm run db:sync           -> safe sync (no destructive changes)
//   npm run db:sync:force     -> drops and recreates tables (DANGEROUS, for fresh dev only)

process.env.NODE_NO_WARNINGS = '1';

const config = require('../config/env');
const { checkConnection, syncModels } = require('../config/db');

(async () => {
  const force = String(process.env.FORCE_SYNC || '').toLowerCase() === 'true';
  const alter = !force; // default to alter-like safe sync for dev convenience

  console.log(`[db:sync] Starting. env=${config.env} force=${force} alter=${alter}`);

  try {
    await checkConnection();
  } catch (err) {
    console.error('[db:sync] Failed to connect to DB.');
    console.error(err && err.message ? err.message : err);
    process.exit(1);
  }

  if (config.isProd && (force || alter)) {
    console.warn('[db:sync] Refusing to run sync with force/alter in production. Aborting.');
    process.exit(1);
  }

  try {
    await syncModels({ force, alter });
    console.log('[db:sync] Success. Tables are in sync with models.');
    process.exit(0);
  } catch (err) {
    console.error('[db:sync] Sync failed.');
    console.error(err && err.message ? err.message : err);
    process.exit(1);
  }
})();
