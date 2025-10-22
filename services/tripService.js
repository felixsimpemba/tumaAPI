const { Trip, Driver, Vehicle, User } = require('../config/db');

function sanitizeTrip(trip) {
  const json = trip.toJSON();
  return {
    id: json.id,
    userId: json.userId,
    driverId: json.driverId,
    pickup: json.pickup,
    dropoff: json.dropoff,
    distance: json.distance,
    fare: json.fare,
    status: json.status,
    createdAt: json.createdAt,
    updatedAt: json.updatedAt,
  };
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

function estimateFareKm(distanceKm) {
  // Basic fare estimation: base UGX 2000 + UGX 1200 per km
  const base = 2000;
  const perKm = 1200;
  const fare = base + perKm * (Number(distanceKm) || 0);
  return Number(fare.toFixed(0));
}

async function assignNearestDriver(pickup) {
  // Find approved & online drivers with coordinates and compute nearest
  const drivers = await Driver.findAll({ where: { status: 'approved', online: true }, include: [{ model: Vehicle, as: 'vehicle' }] });
  const lat = Number(pickup?.lat);
  const lng = Number(pickup?.lng);
  if (!drivers.length || isNaN(lat) || isNaN(lng)) return null;
  let best = null;
  let bestDist = Infinity;
  for (const d of drivers) {
    if (d.lat == null || d.lng == null) continue;
    const dist = haversineKm(lat, lng, Number(d.lat), Number(d.lng));
    if (dist < bestDist) {
      bestDist = dist;
      best = d;
    }
  }
  return best ? { driverId: best.id, distanceKm: bestDist } : null;
}

async function bookTrip(userId, { pickup, dropoff }) {
  if (!userId) { const err = new Error('Unauthorized'); err.status = 401; throw err; }
  if (!pickup || !dropoff) { const err = new Error('pickup and dropoff are required'); err.status = 400; throw err; }
  const hasCoords = (pt) => pt && typeof pt.lat !== 'undefined' && typeof pt.lng !== 'undefined';
  let distanceKm = null;
  if (hasCoords(pickup) && hasCoords(dropoff)) {
    distanceKm = haversineKm(Number(pickup.lat), Number(pickup.lng), Number(dropoff.lat), Number(dropoff.lng));
  }
  const fare = distanceKm != null ? estimateFareKm(distanceKm) : null;

  // Optionally assign nearest driver
  let driverId = null;
  const assign = await assignNearestDriver(pickup);
  if (assign) driverId = assign.driverId;

  const trip = await Trip.create({ userId, driverId, pickup, dropoff, distance: distanceKm != null ? Number(distanceKm.toFixed(2)) : null, fare, status: 'requested' });
  return sanitizeTrip(trip);
}

const ALLOWED_TRANSITIONS = {
  requested: ['accepted', 'cancelled'],
  accepted: ['in-progress', 'cancelled'],
  'in-progress': ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

async function updateStatus(userId, { tripId, status }) {
  if (!userId) { const err = new Error('Unauthorized'); err.status = 401; throw err; }
  if (!tripId || !status) { const err = new Error('tripId and status are required'); err.status = 400; throw err; }
  const trip = await Trip.findByPk(tripId);
  if (!trip) { const err = new Error('Trip not found'); err.status = 404; throw err; }

  // Authorization: rider or assigned driver (via driver.userId)
  let isOwner = trip.userId === userId;
  let isDriver = false;
  if (trip.driverId) {
    const driver = await Driver.findByPk(trip.driverId);
    if (driver && driver.userId === userId) isDriver = true;
  }
  if (!isOwner && !isDriver) { const err = new Error('Forbidden'); err.status = 403; throw err; }

  const from = trip.status;
  const to = String(status);
  const allowed = ALLOWED_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) { const err = new Error(`Invalid status transition: ${from} -> ${to}`); err.status = 400; throw err; }

  await trip.update({ status: to });
  return sanitizeTrip(trip);
}

async function getById(userId, id) {
  if (!userId) { const err = new Error('Unauthorized'); err.status = 401; throw err; }
  const trip = await Trip.findByPk(id);
  if (!trip) { const err = new Error('Trip not found'); err.status = 404; throw err; }

  // Authorization: rider or assigned driver
  if (trip.userId !== userId) {
    if (!trip.driverId) { const err = new Error('Forbidden'); err.status = 403; throw err; }
    const driver = await Driver.findByPk(trip.driverId);
    if (!driver || driver.userId !== userId) { const err = new Error('Forbidden'); err.status = 403; throw err; }
  }
  return sanitizeTrip(trip);
}

async function history(userId, { role = 'user', limit = 20, offset = 0 } = {}) {
  if (!userId) { const err = new Error('Unauthorized'); err.status = 401; throw err; }
  const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const parsedOffset = Math.max(0, parseInt(offset, 10) || 0);

  const where = role === 'driver' ? { driverId: (await Driver.findOne({ where: { userId } }))?.id || -1 } : { userId };
  const { rows, count } = await Trip.findAndCountAll({ where, order: [['createdAt', 'DESC']], limit: parsedLimit, offset: parsedOffset });
  return { total: count, limit: parsedLimit, offset: parsedOffset, items: rows.map((t) => sanitizeTrip(t)) };
}

module.exports = {
  bookTrip,
  getById,
  updateStatus,
  history,
};
