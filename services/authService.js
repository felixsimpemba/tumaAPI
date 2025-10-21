const { User } = require('../config/db');
const config = require('../config/env');
const { createOtp, verifyOtp } = require('./otpService');
const { signAccessToken, signRefreshToken } = require('./jwtService');
const jwt = require('jsonwebtoken');

function signVerificationToken(payload) {
  // Short lived token to confirm OTP verification for register/login
  return jwt.sign(payload, config.jwt.refreshSecret, { expiresIn: '10m' });
}

function verifyVerificationToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret);
}

async function requestOtp({ phone, ip }) {
  if (!phone) {
    const err = new Error('Phone is required');
    err.status = 400;
    throw err;
  }
  // Always treat OTP as login purpose
  await createOtp({ phone, purpose: 'login', ip });
  // Check if user exists to guide frontend flow
  const existing = await User.findOne({ where: { phone } });
  const exists = !!existing;
  return { message: 'OTP sent (mocked for dev).', ttl: config.otp.ttl, exists };
}

async function verifyOtpCode({ phone, code }) {
  if (!phone || !code) {
    const err = new Error('Phone and code are required');
    err.status = 400;
    throw err;
  }
  await verifyOtp({ phone, code });
  const verificationToken = signVerificationToken({ phone, ok: true });
  return { verified: true, verificationToken };
}

async function register({ verificationToken, name, email }) {
  if (!verificationToken) {
    const err = new Error('verificationToken is required');
    err.status = 400;
    throw err;
  }
  let payload;
  try {
    payload = verifyVerificationToken(verificationToken);
  } catch (e) {
    const err = new Error('Invalid or expired verification token');
    err.status = 401;
    throw err;
  }
  const { phone } = payload || {};
  if (!phone) {
    const err = new Error('Verification token not valid for registration');
    err.status = 400;
    throw err;
  }
  // Create user if not exists
  let user = await User.findOne({ where: { phone } });
  if (user) {
    // If already exists, update verified timestamp and optionally update provided fields
    const updates = { phoneVerifiedAt: user.phoneVerifiedAt || new Date() };
    if (name) updates.name = name;
    if (email) updates.email = email;
    await user.update(updates);
  } else {
    user = await User.create({ phone, name: name || null, email: email || null, phoneVerifiedAt: new Date() });
  }
  const tokens = issueTokens(user);
  return { user: sanitizeUser(user), ...tokens };
}

async function login({ verificationToken }) {
  if (!verificationToken) {
    const err = new Error('verificationToken is required');
    err.status = 400;
    throw err;
  }
  let payload;
  try {
    payload = verifyVerificationToken(verificationToken);
  } catch (e) {
    const err = new Error('Invalid or expired verification token');
    err.status = 401;
    throw err;
  }
  const { phone } = payload || {};
  const user = await User.findOne({ where: { phone } });
  if (!user) {
    const err = new Error('User not found. Please register first.');
    err.status = 404;
    throw err;
  }
  if (!user.phoneVerifiedAt) {
    await user.update({ phoneVerifiedAt: new Date() });
  }
  const tokens = issueTokens(user);
  return { user: sanitizeUser(user), ...tokens };
}

async function logout(/* userId, token */) {
  // Stateless JWT: instruct client to discard tokens. For refresh rotation,
  // a persistent store is required; kept minimal for now.
  return { ok: true };
}

function issueTokens(user) {
  const payload = { sub: user.id, role: user.role || 'user' };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  return { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: config.jwt.expiresIn };
}

function sanitizeUser(user) {
  const json = user.toJSON();
  return {
    id: json.id,
    name: json.name,
    phone: json.phone,
    email: json.email,
    role: json.role,
    phoneVerifiedAt: json.phoneVerifiedAt,
    createdAt: json.createdAt,
    updatedAt: json.updatedAt,
  };
}

module.exports = {
  requestOtp,
  verifyOtpCode,
  register,
  login,
  logout,
};
