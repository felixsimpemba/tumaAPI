const jwt = require('jsonwebtoken');
const config = require('../config/env');

function signAccessToken(payload, opts = {}) {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn, ...opts });
}

function signRefreshToken(payload, opts = {}) {
  return jwt.sign(payload, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn, ...opts });
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
