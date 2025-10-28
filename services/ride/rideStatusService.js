// Ride status and trip lifecycle management service

const { updateDriverStatus } = require('./driverMatchingService');

/**
 * Create a trip when ride starts
 * @param {Object} models - Sequelize models
 * @param {Object} rideRequest - Ride request object
 * @param {number} driverId - Driver ID
 * @returns {Promise<Object>} Created trip
 */
async function createTrip(models, rideRequest, driverId) {
  const { Trip } = models;

  const trip = await Trip.create({
    userId: rideRequest.riderId,
    driverId,
    pickup: rideRequest.pickup,
    dropoff: rideRequest.dropoff,
    distance: rideRequest.distance,
    fare: rideRequest.estimatedFare,
    status: 'in-progress',
  });

  return trip;
}

/**
 * Update trip status
 * @param {Object} models - Sequelize models
 * @param {number} riderId - Rider user ID
 * @param {number} driverId - Driver ID
 * @param {string} status - New status
 * @param {Object} additionalData - Additional data to update (e.g., fare)
 */
async function updateTripStatus(models, riderId, driverId, status, additionalData = {}) {
  const { Trip } = models;

  const updateData = { status, ...additionalData };

  await Trip.update(updateData, {
    where: { userId: riderId, driverId },
  });
}

/**
 * Get active trip for a driver
 * @param {Object} models - Sequelize models
 * @param {number} driverId - Driver ID
 * @returns {Promise<Object>} Active trip or null
 */
async function getActiveTrip(models, driverId) {
  const { Trip } = models;

  return await Trip.findOne({
    where: { driverId, status: 'in-progress' },
  });
}

/**
 * Handle ride status update from driver
 * @param {Object} models - Sequelize models
 * @param {Object} rideRequest - Ride request object
 * @param {number} driverId - Driver ID
 * @param {string} status - New status
 * @param {Object} data - Additional data (e.g., fare for completed)
 * @returns {Promise<Object>} Result object with status and messages
 */
async function handleRideStatusUpdate(models, rideRequest, driverId, status, data = {}) {
  const result = {
    status,
    requestId: rideRequest.id,
    tripCreated: false,
    tripCompleted: false,
  };

  // Handle ride_started - create trip
  if (status === 'ride_started') {
    const { Trip } = models;
    const existingTrip = await Trip.findOne({ 
      where: { userId: rideRequest.riderId, driverId } 
    });

    if (!existingTrip) {
      await createTrip(models, rideRequest, driverId);
      result.tripCreated = true;
    } else {
      await updateTripStatus(models, rideRequest.riderId, driverId, 'in-progress');
    }
  }

  // Handle completed - update trip and free driver
  if (status === 'completed') {
    const finalFare = data.fare || rideRequest.estimatedFare;

    await updateTripStatus(models, rideRequest.riderId, driverId, 'completed', {
      fare: finalFare,
    });

    // Set driver back to available
    await updateDriverStatus(models, driverId, 'available');

    result.tripCompleted = true;
    result.fare = parseFloat(finalFare);
  }

  return result;
}

/**
 * Get status update message for riders
 * @param {string} status - Status code
 * @returns {string} Human-readable message
 */
function getStatusMessage(status) {
  const messages = {
    accepted: 'Driver accepted your ride',
    arrived_at_pickup: 'Driver has arrived at your pickup location',
    ride_started: 'Your ride has started',
    completed: 'Ride completed',
  };

  return messages[status] || 'Status updated';
}

/**
 * Validate ride status transition
 * @param {string} status - Status to validate
 * @returns {boolean} True if valid
 */
function isValidStatus(status) {
  const validStatuses = ['accepted', 'arrived_at_pickup', 'ride_started', 'completed'];
  return validStatuses.includes(status);
}

module.exports = {
  createTrip,
  updateTripStatus,
  getActiveTrip,
  handleRideStatusUpdate,
  getStatusMessage,
  isValidStatus,
};
