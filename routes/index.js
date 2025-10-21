var express = require('express');
var router = express.Router();
const { sequelize, checkConnection } = require('../config/db');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

// Health check (includes DB ping)
router.get('/healthz', async function(req, res) {
  try {
    await checkConnection();
    await sequelize.query('SELECT 1');
    res.json({ ok: true, db: 'up', time: new Date().toISOString() });
  } catch (e) {
    res.status(503).json({ ok: false, db: 'down', error: e?.message || 'DB error' });
  }
});

module.exports = router;
