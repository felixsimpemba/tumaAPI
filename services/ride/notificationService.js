// WebSocket notification service for riders and drivers

/**
 * Emit error to a socket
 * @param {Object} socket - Socket.IO socket
 * @param {string} message - Error message
 */
function emitError(socket, message) {
  try {
    socket.emit('error', { message });
  } catch (_) {}
}

/**
 * Notify rider that ride search has started
 * @param {Object} socket - Rider's socket
 * @param {number} requestId - Ride request ID
 */
function notifyRideSearching(socket, requestId) {
  socket.emit('ride_searching', {
    requestId,
    status: 'searching_drivers',
  });
}

/**
 * Notify rider that no drivers are available
 * @param {Object} socket - Rider's socket
 * @param {number} requestId - Ride request ID
 */
function notifyNoDrivers(socket, requestId) {
  socket.emit('ride_no_drivers', {
    requestId,
    message: 'No drivers available in your area',
  });
}

/**
 * Notify rider that a driver has been assigned
 * @param {Object} socket - Rider's socket
 * @param {Object} driver - Driver object
 * @param {number} requestId - Ride request ID
 * @param {number} riderId - Rider user ID
 */
function notifyRiderAssigned(socket, driver, requestId, riderId) {
  socket.emit('ride_assigned', {
    driver: {
      id: driver.id,
      name: driver.user?.name || 'Driver',
      vehicle: driver.vehicle?.type || 'Car',
      plate: driver.vehicle?.plateNumber || 'N/A',
    },
    user: {
      id: riderId,
    },
    requestId,
    status: 'driver_assigned',
  });
}

/**
 * Notify driver that ride has been assigned
 * @param {Object} socket - Driver's socket
 * @param {number} driverId - Driver ID
 * @param {number} requestId - Ride request ID
 */
function notifyDriverAssigned(socket, driverId, requestId) {
  socket.emit('ride_assigned', {
    driverId,
    requestId,
    status: 'driver_assigned',
  });
}

/**
 * Notify rider of ride status update
 * @param {Object} socket - Rider's socket
 * @param {number} requestId - Ride request ID
 * @param {string} status - Status code
 * @param {string} message - Status message
 */
function notifyRideStatusUpdate(socket, requestId, status, message) {
  socket.emit('ride_status_update', {
    requestId,
    status,
    message,
  });
}

/**
 * Confirm status update to driver
 * @param {Object} socket - Driver's socket
 * @param {number} requestId - Ride request ID
 * @param {string} status - Status code
 */
function confirmStatusUpdate(socket, requestId, status) {
  socket.emit('ride_status_updated', {
    requestId,
    status,
  });
}

/**
 * Send ride summary to rider on completion
 * @param {Object} socket - Rider's socket
 * @param {number} requestId - Ride request ID
 * @param {number} fare - Final fare
 * @param {string} duration - Trip duration
 */
function sendRideSummary(socket, requestId, fare, duration = 'N/A') {
  socket.emit('ride_summary', {
    requestId,
    status: 'completed',
    fare: parseFloat(fare),
    duration,
  });
}

/**
 * Broadcast driver location to rider
 * @param {Object} socket - Rider's socket
 * @param {number} driverId - Driver ID
 * @param {Object} coords - Coordinates {lat, lng}
 * @param {string} timestamp - ISO timestamp
 */
function broadcastDriverLocation(socket, driverId, coords, timestamp) {
  socket.emit('driver_location', {
    driverId,
    coords: {
      lat: parseFloat(coords.lat),
      lng: parseFloat(coords.lng),
    },
    timestamp,
  });
}

/**
 * Send driver location response to rider
 * @param {Object} socket - Rider's socket
 * @param {Object} locationData - Location data object
 */
function sendDriverLocation(socket, locationData) {
  if (locationData) {
    socket.emit('driver_location', locationData);
  } else {
    emitError(socket, 'Driver location not available');
  }
}

/**
 * Notify rider that driver disconnected
 * @param {Object} socket - Rider's socket
 */
function notifyDriverDisconnected(socket) {
  socket.emit('driver_disconnected', {
    message: 'Driver disconnected',
  });
}

/**
 * Notify driver that ride was already accepted by another driver
 * @param {Object} socket - Driver's socket
 * @param {number} requestId - Ride request ID
 */
function notifyRideAlreadyAccepted(socket, requestId) {
  socket.emit('ride_already_accepted', { requestId });
}

/**
 * Send connection confirmation
 * @param {Object} socket - Socket
 * @param {string} socketId - Socket ID
 */
function confirmConnection(socket, socketId) {
  socket.emit('connected', {
    message: 'Connection established',
    socketId,
  });
}

/**
 * Send fare calculation response
 * @param {Object} socket - Socket
 * @param {Object} fareData - Fare data with Economy and Classic
 */
function sendFareEstimate(socket, fareData) {
  socket.emit('ride_fare', fareData);
}

/**
 * Get socket by ID from Socket.IO server
 * @param {Object} io - Socket.IO server instance
 * @param {string} socketId - Socket ID
 * @returns {Object} Socket object or undefined
 */
function getSocketById(io, socketId) {
  return io.sockets.sockets.get(socketId);
}

module.exports = {
  emitError,
  notifyRideSearching,
  notifyNoDrivers,
  notifyRiderAssigned,
  notifyDriverAssigned,
  notifyRideStatusUpdate,
  confirmStatusUpdate,
  sendRideSummary,
  broadcastDriverLocation,
  sendDriverLocation,
  notifyDriverDisconnected,
  notifyRideAlreadyAccepted,
  confirmConnection,
  sendFareEstimate,
  getSocketById,
};
