const { User, Trip } = require('../config/db');

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

async function getMe(userId) {
  const user = await User.findByPk(userId);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  return sanitizeUser(user);
}

async function updateProfile(userId, { name, email }) {
  const user = await User.findByPk(userId);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  const updates = {};
  if (typeof name === 'string') updates.name = name;
  if (typeof email === 'string') updates.email = email || null;
  if (Object.keys(updates).length === 0) {
    return sanitizeUser(user);
  }
  try {
    await user.update(updates);
  } catch (e) {
    // Handle unique email conflict
    if (/unique/i.test(e.message) || e.name === 'SequelizeUniqueConstraintError') {
      const err = new Error('Email already in use');
      err.status = 409;
      throw err;
    }
    throw e;
  }
  return sanitizeUser(user);
}

async function listMyTrips(userId, { limit = 20, offset = 0 } = {}) {
  const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const parsedOffset = Math.max(0, parseInt(offset, 10) || 0);
  const { rows, count } = await Trip.findAndCountAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
    limit: parsedLimit,
    offset: parsedOffset,
  });
  return {
    total: count,
    limit: parsedLimit,
    offset: parsedOffset,
    items: rows.map((t) => t.toJSON()),
  };
}

async function deleteAccount(userId) {
  const user = await User.findByPk(userId);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  await user.destroy(); // paranoid soft delete
  return { ok: true };
}

module.exports = {
  getMe,
  updateProfile,
  listMyTrips,
  deleteAccount,
};
