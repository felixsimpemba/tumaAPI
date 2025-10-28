// Location tracking and heartbeat management service

/**
 * Update driver heartbeat with location
 * @param {Object} models - Sequelize models
 * @param {number} driverId - Driver ID
 * @param {Object} coords - Coordinates {lat, lng}
 */
async function updateDriverLocation(models, driverId, coords) {
  const { DriverHeartbeat } = models;

  await DriverHeartbeat.update(
    { 
      lat: coords.lat, 
      lng: coords.lng, 
      lastSeenAt: new Date() 
    },
    { where: { driverId } }
  );
}

/**
 * Initialize or update driver heartbeat on connection
 * @param {Object} models - Sequelize models
 * @param {number} driverId - Driver ID
 * @param {string} socketId - Socket ID
 * @param {Object} location - Optional location {lat, lng}
 */
async function initializeDriverHeartbeat(models, driverId, socketId, location = null) {
  const { DriverHeartbeat, Driver } = models;

  // Get driver's last known location if not provided
  let lat = location?.lat;
  let lng = location?.lng;

  if (!lat || !lng) {
    const driver = await Driver.findByPk(driverId);
    if (driver) {
      lat = driver.lat;
      lng = driver.lng;
    }
  }

  await DriverHeartbeat.upsert({
    driverId,
    status: 'available',
    socketId,
    lastSeenAt: new Date(),
    lat,
    lng,
  });
}

/**
 * Mark driver as offline on disconnect
 * @param {Object} models - Sequelize models
 * @param {number} driverId - Driver ID
 */
async function markDriverOffline(models, driverId) {
  const { DriverHeartbeat } = models;

  await DriverHeartbeat.update(
    { status: 'offline', socketId: null, lastSeenAt: new Date() },
    { where: { driverId } }
  );
}

/**
 * Log driver location during active trip
 * @param {Object} models - Sequelize models
 * @param {number} tripId - Trip ID
 * @param {Object} coords - Coordinates {lat, lng}
 * @param {number} heading - Optional heading in degrees
 * @param {string} actor - Actor type ('driver' or 'rider')
 */
async function logTripLocation(models, tripId, coords, heading = null, actor = 'driver') {
  const { TripLocation } = models;

  await TripLocation.create({
    tripId,
    actor,
    lat: coords.lat,
    lng: coords.lng,
    heading,
  });
}

/**
 * Get driver's current location
 * @param {Object} models - Sequelize models
 * @param {number} driverId - Driver ID
 * @returns {Promise<Object>} Location object with coords and timestamp
 */
async function getDriverLocation(models, driverId) {
  const { DriverHeartbeat } = models;

  const heartbeat = await DriverHeartbeat.findOne({
    where: { driverId },
    order: [['lastSeenAt', 'DESC']],
  });

  if (heartbeat && heartbeat.lat && heartbeat.lng) {
    return {
      driverId,
      coords: {
        lat: parseFloat(heartbeat.lat),
        lng: parseFloat(heartbeat.lng),
      },
      timestamp: heartbeat.lastSeenAt.toISOString(),
    };
  }

  return null;
}

/**
 * Handle driver location update with trip tracking
 * @param {Object} models - Sequelize models
 * @param {number} driverId - Driver ID
 * @param {Object} coords - Coordinates {lat, lng}
 * @param {number} heading - Optional heading
 * @returns {Promise<Object>} Result with activeTrip info
 */
async function handleDriverLocationUpdate(models, driverId, coords, heading = null) {
  // Update heartbeat
  await updateDriverLocation(models, driverId, coords);

  // Check for active trip
  const { Trip } = models;
  const activeTrip = await Trip.findOne({
    where: { 
      driverId, 
      status: 'in-progress' 
    },
  });

  if (activeTrip) {
    // Log location for trip
    await logTripLocation(models, activeTrip.id, coords, heading, 'driver');

    return {
      hasActiveTrip: true,
      tripId: activeTrip.id,
      riderId: activeTrip.userId,
    };
  }

  return {
    hasActiveTrip: false,
  };
}

module.exports = {
  updateDriverLocation,
  initializeDriverHeartbeat,
  markDriverOffline,
  logTripLocation,
  getDriverLocation,
  handleDriverLocationUpdate,
};
