// Driver matching and availability service

const { Op } = require('sequelize');
const { distanceKm } = require('./fareCalculationService');

const SEARCH_RADIUS_KM = parseFloat(process.env.SEARCH_RADIUS_KM || '5');

/**
 * Find nearby available drivers for a ride request
 * @param {Object} models - Sequelize models
 * @param {Object} pickupLocation - Pickup coordinates {lat, lng}
 * @returns {Promise<Array>} Array of {driverId, dist} sorted by distance
 */
async function findNearbyDrivers(models, pickupLocation) {
  const { DriverHeartbeat, Driver } = models;

  // Find available drivers active in the last minute
  const availableHeartbeats = await DriverHeartbeat.findAll({
    where: {
      status: 'available',
      lat: { [Op.not]: null },
      lng: { [Op.not]: null },
      lastSeenAt: { [Op.gte]: new Date(Date.now() - 60000) },
    },
    include: [{ model: Driver, as: 'driver' }],
  });

  const nearbyDrivers = [];
  for (const heartbeat of availableHeartbeats) {
    const driverLocation = { 
      lat: parseFloat(heartbeat.lat), 
      lng: parseFloat(heartbeat.lng) 
    };
    const dist = distanceKm(pickupLocation, driverLocation);
    if (dist <= SEARCH_RADIUS_KM) {
      nearbyDrivers.push({ driverId: heartbeat.driverId, dist });
    }
  }

  // Sort by distance (closest first)
  nearbyDrivers.sort((a, b) => a.dist - b.dist);

  return nearbyDrivers;
}

/**
 * Check if a driver is currently available
 * @param {Object} models - Sequelize models
 * @param {number} driverId - Driver ID
 * @returns {Promise<boolean>} True if driver is available
 */
async function isDriverAvailable(models, driverId) {
  const { DriverHeartbeat } = models;

  const heartbeat = await DriverHeartbeat.findOne({
    where: { driverId, status: 'available' },
    order: [['lastSeenAt', 'DESC']],
  });

  return !!heartbeat;
}

/**
 * Update driver status
 * @param {Object} models - Sequelize models
 * @param {number} driverId - Driver ID
 * @param {string} status - New status ('available', 'busy', 'offline')
 */
async function updateDriverStatus(models, driverId, status) {
  const { DriverHeartbeat } = models;

  await DriverHeartbeat.update(
    { status, lastSeenAt: new Date() },
    { where: { driverId } }
  );
}

/**
 * Get driver details with user and vehicle info
 * @param {Object} models - Sequelize models
 * @param {number} driverId - Driver ID
 * @returns {Promise<Object>} Driver object with associations
 */
async function getDriverDetails(models, driverId) {
  const { Driver, User } = models;

  return await Driver.findByPk(driverId, {
    include: [
      { model: User, as: 'user' },
      { association: 'vehicle' },
    ],
  });
}

module.exports = {
  findNearbyDrivers,
  isDriverAvailable,
  updateDriverStatus,
  getDriverDetails,
};
