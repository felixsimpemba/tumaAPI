const { Driver, Vehicle, User } = require('../config/db');

function sanitizeDriver(driver, includeVehicle = true) {
  const json = driver.toJSON();
  const base = {
    id: json.id,
    userId: json.userId,
    vehicleId: json.vehicleId,
    licenseDocUrl: json.licenseDocUrl,
    status: json.status,
    online: json.online,
    lat: json.lat,
    lng: json.lng,
    createdAt: json.createdAt,
    updatedAt: json.updatedAt,
  };
  if (includeVehicle && json.vehicle) {
    base.vehicle = {
      id: json.vehicle.id,
      driverId: json.vehicle.driverId,
      type: json.vehicle.type,
      plateNumber: json.vehicle.plateNumber,
      color: json.vehicle.color,
      createdAt: json.vehicle.createdAt,
      updatedAt: json.vehicle.updatedAt,
    };
  }
  return base;
}

async function registerDriver(userId, { licenseDocUrl, vehicleType, plateNumber, color }) {
  if (!userId) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }
  // Require minimal vehicle data
  if (!plateNumber) {
    const err = new Error('plateNumber is required');
    err.status = 400;
    throw err;
  }
  // Ensure user exists
  const user = await User.findByPk(userId);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  // Prevent duplicate driver profile per user
  const existing = await Driver.findOne({ where: { userId } });
  if (existing) {
    const err = new Error('Driver profile already exists');
    err.status = 409;
    throw err;
  }

  // Create driver (pending, offline by default)
  const driver = await Driver.create({
    userId,
    licenseDocUrl: licenseDocUrl || null,
    status: 'pending',
    online: false,
    lat: null,
    lng: null,
  });

  // Create vehicle and link
  const vehicle = await Vehicle.create({
    driverId: driver.id,
    type: vehicleType || 'car',
    plateNumber,
    color: color || null,
  });
  await driver.update({ vehicleId: vehicle.id });

  // Optionally update user role to 'driver' if not already
  if (user.role !== 'driver') {
    try { await user.update({ role: 'driver' }); } catch (_) {}
  }

  // Reload with association
  const withAssoc = await Driver.findByPk(driver.id, { include: [{ model: Vehicle, as: 'vehicle' }] });
  return sanitizeDriver(withAssoc);
}

async function updateStatus(userId, { online, lat, lng, status }) {
  if (!userId) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }
  const driver = await Driver.findOne({ where: { userId }, include: [{ model: Vehicle, as: 'vehicle' }] });
  if (!driver) {
    const err = new Error('Driver profile not found');
    err.status = 404;
    throw err;
  }
  // Do not allow drivers to change verification status via this endpoint
  if (typeof status !== 'undefined') {
    const err = new Error('Status changes are not allowed');
    err.status = 403;
    throw err;
  }
  const updates = {};
  if (typeof online === 'boolean') updates.online = online;
  if (lat !== undefined) updates.lat = lat === null ? null : Number(lat);
  if (lng !== undefined) updates.lng = lng === null ? null : Number(lng);
  if (Object.keys(updates).length === 0) return sanitizeDriver(driver);
  await driver.update(updates);
  return sanitizeDriver(driver);
}

async function getDriverById(id) {
  const driver = await Driver.findByPk(id, { include: [{ model: Vehicle, as: 'vehicle' }] });
  if (!driver) {
    const err = new Error('Driver not found');
    err.status = 404;
    throw err;
  }
  return sanitizeDriver(driver);
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function findNearby({ lat, lng, radiusKm = 5, limit = 20 }) {
  if (lat === undefined || lng === undefined) {
    const err = new Error('lat and lng are required');
    err.status = 400;
    throw err;
  }
  const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const r = Number(radiusKm) || 5;

  // Fetch candidates: approved, online, with coordinates
  const candidates = await Driver.findAll({
    where: { status: 'approved', online: true },
    include: [{ model: Vehicle, as: 'vehicle' }],
  });
  const results = [];
  for (const d of candidates) {
    if (d.lat == null || d.lng == null) continue;
    const dist = haversineKm(Number(lat), Number(lng), Number(d.lat), Number(d.lng));
    if (dist <= r) {
      const item = sanitizeDriver(d);
      item.distanceKm = Number(dist.toFixed(3));
      results.push(item);
    }
  }
  results.sort((a, b) => a.distanceKm - b.distanceKm);
  return { total: results.length, items: results.slice(0, parsedLimit) };
}

module.exports = {
  registerDriver,
  updateStatus,
  getDriverById,
  findNearby,
};
