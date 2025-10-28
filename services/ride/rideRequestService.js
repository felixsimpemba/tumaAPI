// Ride request management service

const { distanceKm, calculateFare } = require('./fareCalculationService');
const { isDriverAvailable, updateDriverStatus } = require('./driverMatchingService');

const DRIVER_RESPONSE_TIMEOUT = parseInt(process.env.DRIVER_RESPONSE_TIMEOUT || '15000', 10);

/**
 * Create a new ride request in the database
 * @param {Object} models - Sequelize models
 * @param {number} riderId - Rider user ID
 * @param {Object} pickup - Pickup location {lat, lng, address}
 * @param {Object} destination - Destination location {lat, lng, address}
 * @param {string} fareType - Fare type (Economy/Classic) or vehicle type (bike/car)
 * @returns {Promise<Object>} Created ride request
 */
async function createRideRequest(models, riderId, pickup, destination, fareType) {
  const { RideRequest, User } = models;

  // Calculate distance and fare
  const distance = distanceKm(pickup, destination);
  
  // Map fareType to standard format
  let type = fareType;
  if (fareType === 'bike' || fareType === 'ride') {
    type = 'Economy';
  } else if (fareType === 'car' || fareType === 'delivery') {
    type = 'Classic';
  } else if (fareType !== 'Economy' && fareType !== 'Classic') {
    type = 'Economy'; // default
  }
  
  const estimatedFare = calculateFare(distance, type);

  // Create ride request in database
  const rideRequest = await RideRequest.create({
    riderId,
    pickup,
    dropoff: destination,
    distance: parseFloat(distance.toFixed(2)),
    estimatedFare,
    status: 'searching',
  });

  // Include rider info
  const rider = await User.findByPk(riderId);
  rideRequest.rider = rider;

  return rideRequest;
}

/**
 * Mark ride request as accepted by a driver
 * @param {Object} models - Sequelize models
 * @param {number} requestId - Ride request ID
 * @param {number} driverId - Driver ID
 * @returns {Promise<Object>} Updated ride request
 */
async function acceptRideRequest(models, requestId, driverId) {
  const { RideRequest, RideRequestAttempt, User } = models;

  // Accept the ride (only if still searching)
  await RideRequest.update(
    { status: 'accepted', acceptedDriverId: driverId },
    { where: { id: requestId, status: 'searching' } }
  );

  // Update attempt record
  await RideRequestAttempt.update(
    { outcome: 'accepted', respondedAt: new Date() },
    { where: { rideRequestId: requestId, driverId, outcome: 'sent' } }
  );

  // Update driver status to busy
  await updateDriverStatus(models, driverId, 'busy');

  // Get updated ride request
  const rideRequest = await RideRequest.findByPk(requestId, {
    include: [{ model: User, as: 'rider' }],
  });

  return rideRequest;
}

/**
 * Mark ride request as failed (no drivers available)
 * @param {Object} models - Sequelize models
 * @param {number} requestId - Ride request ID
 */
async function markRideRequestFailed(models, requestId) {
  const { RideRequest } = models;

  await RideRequest.update(
    { status: 'failed' },
    { where: { id: requestId } }
  );
}

/**
 * Mark ride request as cancelled
 * @param {Object} models - Sequelize models
 * @param {number} requestId - Ride request ID
 */
async function cancelRideRequest(models, requestId) {
  const { RideRequest } = models;

  await RideRequest.update(
    { status: 'cancelled' },
    { where: { id: requestId } }
  );
}

/**
 * Get ride request by ID
 * @param {Object} models - Sequelize models
 * @param {number} requestId - Ride request ID
 * @returns {Promise<Object>} Ride request with rider info
 */
async function getRideRequest(models, requestId) {
  const { RideRequest, User } = models;

  return await RideRequest.findByPk(requestId, {
    include: [{ model: User, as: 'rider' }],
  });
}

/**
 * Create a ride request attempt record
 * @param {Object} models - Sequelize models
 * @param {number} rideRequestId - Ride request ID
 * @param {number} driverId - Driver ID
 * @param {string} outcome - Outcome status
 */
async function createRideRequestAttempt(models, rideRequestId, driverId, outcome = 'sent') {
  const { RideRequestAttempt } = models;

  await RideRequestAttempt.create({
    rideRequestId,
    driverId,
    outcome,
  });
}

/**
 * Update ride request attempt outcome
 * @param {Object} models - Sequelize models
 * @param {number} rideRequestId - Ride request ID
 * @param {number} driverId - Driver ID
 * @param {string} outcome - New outcome
 */
async function updateRideRequestAttempt(models, rideRequestId, driverId, outcome) {
  const { RideRequestAttempt } = models;

  await RideRequestAttempt.update(
    { outcome, respondedAt: new Date() },
    { where: { rideRequestId, driverId, outcome: 'sent' } }
  );
}

/**
 * Send ride request to next driver in queue
 * @param {Object} io - Socket.IO instance
 * @param {Object} models - Sequelize models
 * @param {Object} rideRequest - Ride request object
 * @param {Map} activeRides - Active rides map
 * @param {Map} driverSockets - Driver sockets map
 * @param {Function} getSocketById - Function to get socket by ID
 */
async function sendRequestToNextDriver(io, models, rideRequest, activeRides, driverSockets, getSocketById) {
  const rideData = activeRides.get(rideRequest.id);
  if (!rideData) return;

  // Clear any existing timeout
  if (rideData.currentTimeout) {
    clearTimeout(rideData.currentTimeout);
    rideData.currentTimeout = null;
  }

  while (rideData.queue.length > 0) {
    const nextDriverId = rideData.queue.shift();
    
    // Check if driver is still available
    const available = await isDriverAvailable(models, nextDriverId);
    if (!available) {
      await createRideRequestAttempt(models, rideRequest.id, nextDriverId, 'offline');
      continue;
    }

    const driverSocketId = driverSockets.get(nextDriverId);
    if (!driverSocketId) {
      await createRideRequestAttempt(models, rideRequest.id, nextDriverId, 'offline');
      continue;
    }

    const driverSocket = getSocketById(io, driverSocketId);
    if (!driverSocket) {
      await createRideRequestAttempt(models, rideRequest.id, nextDriverId, 'offline');
      continue;
    }

    // Create attempt record
    await createRideRequestAttempt(models, rideRequest.id, nextDriverId, 'sent');

    // Update driver to busy temporarily
    await updateDriverStatus(models, nextDriverId, 'busy');

    // Send request to driver
    driverSocket.emit('new_ride_request', {
      requestId: rideRequest.id,
      user: {
        name: rideRequest.rider?.name || 'Customer',
        rating: 4.5, // TODO: Calculate from ratings
      },
      pickup: rideRequest.pickup,
      destination: rideRequest.dropoff,
      distance: `${rideRequest.distance} km`,
      fare: parseFloat(rideRequest.estimatedFare),
      expiresIn: DRIVER_RESPONSE_TIMEOUT / 1000,
    });

    // Start timeout
    rideData.currentTimeout = setTimeout(async () => {
      // Update attempt to timeout
      await updateRideRequestAttempt(models, rideRequest.id, nextDriverId, 'timeout');

      // Revert driver to available
      await updateDriverStatus(models, nextDriverId, 'available');

      // Reload ride request to check current status
      const currentRequest = await getRideRequest(models, rideRequest.id);
      if (currentRequest && currentRequest.status === 'searching') {
        // Try next driver
        sendRequestToNextDriver(io, models, currentRequest, activeRides, driverSockets, getSocketById);
      }
    }, DRIVER_RESPONSE_TIMEOUT);

    return; // Waiting for response from this driver
  }

  // No drivers left - mark as failed
  await markRideRequestFailed(models, rideRequest.id);
  activeRides.delete(rideRequest.id);
}

module.exports = {
  createRideRequest,
  acceptRideRequest,
  markRideRequestFailed,
  cancelRideRequest,
  getRideRequest,
  createRideRequestAttempt,
  updateRideRequestAttempt,
  sendRequestToNextDriver,
};
