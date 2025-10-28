// Fare calculation and distance utilities

// Configuration with env fallbacks
const BASE_FARE_ECONOMY = parseFloat(process.env.BASE_FARE_ECONOMY || '20');
const PER_KM_RATE_ECONOMY = parseFloat(process.env.PER_KM_RATE_ECONOMY || '5');
const BASE_FARE_CLASSIC = parseFloat(process.env.BASE_FARE_CLASSIC || '30');
const PER_KM_RATE_CLASSIC = parseFloat(process.env.PER_KM_RATE_CLASSIC || '8');

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Object} a - First coordinate {lat, lng}
 * @param {Object} b - Second coordinate {lat, lng}
 * @returns {number} Distance in kilometers
 */
function distanceKm(a, b) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Calculate fare based on distance and vehicle type
 * @param {number} distanceKmVal - Distance in kilometers
 * @param {string} vehicleType - 'Economy' or 'Classic'
 * @returns {number} Calculated fare
 */
function calculateFare(distanceKmVal, vehicleType = 'Economy') {
  let baseFare, perKmRate;
  if (vehicleType === 'Classic') {
    baseFare = BASE_FARE_CLASSIC;
    perKmRate = PER_KM_RATE_CLASSIC;
  } else {
    baseFare = BASE_FARE_ECONOMY;
    perKmRate = PER_KM_RATE_ECONOMY;
  }
  const fare = baseFare + perKmRate * (distanceKmVal || 0);
  return parseFloat(fare.toFixed(2));
}

/**
 * Estimate travel time based on distance and vehicle type
 * @param {number} distanceKmVal - Distance in kilometers
 * @param {string} vehicleType - 'Economy' or 'Classic'
 * @returns {number} Estimated time in minutes
 */
function estimateTime(distanceKmVal, vehicleType = 'Economy') {
  // Average speed: Economy 25 km/h, Classic 35 km/h
  const speed = vehicleType === 'Classic' ? 35 : 25;
  const timeMinutes = (distanceKmVal / speed) * 60;
  return parseFloat(timeMinutes.toFixed(2));
}

/**
 * Calculate fare estimates for all vehicle types
 * @param {Object} pickup - Pickup coordinates {lat, lng}
 * @param {Object} destination - Destination coordinates {lat, lng}
 * @returns {Object} Fare breakdown for Economy and Classic
 */
function calculateFareEstimates(pickup, destination) {
  const distance = distanceKm(pickup, destination);
  const economyFare = calculateFare(distance, 'Economy');
  const classicFare = calculateFare(distance, 'Classic');
  const economyTime = estimateTime(distance, 'Economy');
  const classicTime = estimateTime(distance, 'Classic');

  return {
    distance: parseFloat(distance.toFixed(2)),
    Economy: {
      Amount: economyFare,
      Distance: distance.toFixed(1),
      EstTime: economyTime.toFixed(2),
    },
    Classic: {
      Amount: classicFare,
      Distance: distance.toFixed(1),
      EstTime: classicTime.toFixed(2),
    },
  };
}

module.exports = {
  distanceKm,
  calculateFare,
  estimateTime,
  calculateFareEstimates,
};
