const crypto = require('crypto');
const { Otp } = require('../config/db');
const config = require('../config/env');

// Simple in-memory rate limiter per phone (and optionally IP)
// For production, replace with Redis.
const rateState = new Map(); // key => { count, windowStart }

function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function generateCode() {
  // 6-digit numeric code
  const n = Math.floor(100000 + Math.random() * 900000);
  return String(n);
}

function isRateLimited(key) {
  const now = Date.now();
  const windowMs = config.otp.rateWindowSec * 1000;
  const entry = rateState.get(key);
  if (!entry) {
    rateState.set(key, { count: 1, windowStart: now });
    return false;
  }
  if (now - entry.windowStart > windowMs) {
    rateState.set(key, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  // allow up to 3 OTP requests per window for a single key
  const limited = entry.count > 3;
  rateState.set(key, entry);
  return limited;
}

async function createOtp({ phone, purpose = 'login', ip }) {
  const rateKey = `${phone}:${ip || 'noip'}`;
  if (isRateLimited(rateKey)) {
    const windowSec = config.otp.rateWindowSec;
    const resetIn = Math.max(0, windowSec - Math.floor((Date.now() - rateState.get(rateKey).windowStart) / 1000));
    const err = new Error('Too many OTP requests. Please try again later.');
    err.code = 'RATE_LIMITED';
    err.resetIn = resetIn;
    throw err;
  }
  const code = generateCode();
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + config.otp.ttl * 1000);

  // Create a new OTP record
  await Otp.create({ phone, purpose, codeHash, expiresAt, attempts: 0, consumedAt: null });

  // In a real implementation, send via SMS provider here. For now, log to console.
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[otp] ${purpose} code for ${phone}: ${code} (expires in ${config.otp.ttl}s)`);
    if (config.otp.universalEnabled) {
      console.log(`[otp] Universal testing code is ENABLED. You can use ${config.otp.universalCode} for any phone while in ${process.env.NODE_ENV || 'development'} mode.`);
    }
  }

  return { success: true, expiresAt };
}

async function verifyOtp({ phone, purpose = 'login', code }) {
  // Allow universal OTP for testing when enabled
  if (config.otp.universalEnabled && String(code) === String(config.otp.universalCode)) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[otp] Universal OTP used for ${phone}`);
    }
    return { success: true, universal: true };
  }
  const otp = await Otp.findOne({
    where: { phone, purpose, consumedAt: null },
    order: [['createdAt', 'DESC']],
  });
  if (!otp) {
    const err = new Error('OTP not found or already used.');
    err.code = 'OTP_NOT_FOUND';
    throw err;
  }
  if (otp.expiresAt && otp.expiresAt.getTime() < Date.now()) {
    const err = new Error('OTP has expired.');
    err.code = 'OTP_EXPIRED';
    throw err;
  }
  if (otp.attempts >= config.otp.maxAttempts) {
    const err = new Error('Maximum verification attempts exceeded.');
    err.code = 'OTP_MAX_ATTEMPTS';
    throw err;
  }

  const ok = otp.codeHash === hashCode(String(code));
  const newAttempts = otp.attempts + 1;
  if (!ok) {
    await otp.update({ attempts: newAttempts });
    const err = new Error('Invalid OTP code.');
    err.code = 'OTP_INVALID';
    throw err;
  }

  // Mark consumed
  await otp.update({ consumedAt: new Date(), attempts: newAttempts });
  return { success: true };
}

module.exports = {
  createOtp,
  verifyOtp,
};
