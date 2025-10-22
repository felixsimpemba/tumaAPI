const { Payment, Trip, Driver } = require('../config/db');

function sanitizePayment(p) {
  const json = p.toJSON();
  return {
    id: json.id,
    tripId: json.tripId,
    amount: Number(json.amount),
    method: json.method,
    status: json.status,
    providerRef: json.providerRef || null,
    createdAt: json.createdAt,
    updatedAt: json.updatedAt,
  };
}

async function assertCanAccessTrip(userId, trip) {
  if (trip.userId === userId) return true;
  if (trip.driverId) {
    const driver = await Driver.findByPk(trip.driverId);
    if (driver && driver.userId === userId) return true;
  }
  const err = new Error('Forbidden');
  err.status = 403;
  throw err;
}

async function initiate(userId, { tripId, method = 'cash', amount }) {
  if (!userId) { const err = new Error('Unauthorized'); err.status = 401; throw err; }
  if (!tripId) { const err = new Error('tripId is required'); err.status = 400; throw err; }
  const trip = await Trip.findByPk(tripId);
  if (!trip) { const err = new Error('Trip not found'); err.status = 404; throw err; }
  await assertCanAccessTrip(userId, trip);

  // If trip has a suggested fare use it unless overridden
  const amt = amount != null ? Number(amount) : (trip.fare != null ? Number(trip.fare) : 0);
  if (!amt || isNaN(amt) || amt <= 0) { const err = new Error('amount must be > 0'); err.status = 400; throw err; }

  const existing = await Payment.findOne({ where: { tripId } });
  if (existing) {
    // If already succeeded, prevent re-initiation
    if (existing.status === 'success') {
      const err = new Error('Payment already completed');
      err.status = 409;
      throw err;
    }
    await existing.update({ amount: amt, method, status: 'pending', providerRef: existing.providerRef || `mock_${Date.now()}` });
    return sanitizePayment(existing);
  }

  const payment = await Payment.create({ tripId, amount: amt, method, status: 'pending', providerRef: `mock_${Date.now()}` });
  return sanitizePayment(payment);
}

async function verify(userId, { tripId, success = true, providerRef }) {
  if (!userId) { const err = new Error('Unauthorized'); err.status = 401; throw err; }
  const payment = await Payment.findOne({ where: { tripId } });
  if (!payment) { const err = new Error('Payment not found'); err.status = 404; throw err; }
  const trip = await Trip.findByPk(tripId);
  if (!trip) { const err = new Error('Trip not found'); err.status = 404; throw err; }
  await assertCanAccessTrip(userId, trip);

  await payment.update({ status: success ? 'success' : 'failed', providerRef: providerRef || payment.providerRef });
  return sanitizePayment(payment);
}

async function getByTrip(userId, tripId) {
  if (!userId) { const err = new Error('Unauthorized'); err.status = 401; throw err; }
  const payment = await Payment.findOne({ where: { tripId } });
  if (!payment) { const err = new Error('Payment not found'); err.status = 404; throw err; }
  const trip = await Trip.findByPk(tripId);
  if (!trip) { const err = new Error('Trip not found'); err.status = 404; throw err; }
  await assertCanAccessTrip(userId, trip);
  return sanitizePayment(payment);
}

module.exports = {
  initiate,
  verify,
  getByTrip,
};
