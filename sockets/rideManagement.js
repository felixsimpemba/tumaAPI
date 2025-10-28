// Socket.IO Ride Management implementation
// Follows Docs/websocket_api_docs.md with database integration
// Refactored to use modular services

const { Server } = require('socket.io');

// Import ride services
const fareService = require('../services/ride/fareCalculationService');
const driverMatchingService = require('../services/ride/driverMatchingService');
const rideRequestService = require('../services/ride/rideRequestService');
const rideStatusService = require('../services/ride/rideStatusService');
const locationService = require('../services/ride/locationTrackingService');
const notificationService = require('../services/ride/notificationService');

function initRideManagement(server, models) {
  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    path: '/socket.io',
  });

  // In-memory stores for socket management
  const driverSockets = new Map(); // driverId -> socketId
  const riderSockets = new Map(); // userId -> socketId
  const activeRides = new Map(); // rideRequestId -> { timeouts, queue }

  // Helper to handle no drivers scenario
  async function handleNoDriversAvailable(requestId, riderId) {
    await rideRequestService.markRideRequestFailed(models, requestId);
    
    const riderSocketId = riderSockets.get(riderId);
    if (riderSocketId) {
      const riderSocket = notificationService.getSocketById(io, riderSocketId);
      if (riderSocket) {
        notificationService.notifyNoDrivers(riderSocket, requestId);
      }
    }
  }

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // USER_CONNECT EVENT - Universal connection handler
    socket.on('user_connect', async (data) => {
      const { userId, role } = data || {};
      if (!userId || !role) {
        return notificationService.emitError(socket, 'userId and role required');
      }

      if (role === 'customer') {
        // Register rider
        riderSockets.set(userId, socket.id);
        socket.data.role = 'customer';
        socket.data.userId = userId;
        notificationService.confirmConnection(socket, socket.id);
      } else if (role === 'driver') {
        // Register driver - find driver ID from userId
        const { Driver } = models;
        const driver = await Driver.findOne({ where: { userId } });
        if (!driver) {
          return notificationService.emitError(socket, 'Driver not found');
        }

        driverSockets.set(driver.id, socket.id);
        socket.data.role = 'driver';
        socket.data.userId = userId;
        socket.data.driverId = driver.id;

        // Initialize driver heartbeat
        await locationService.initializeDriverHeartbeat(models, driver.id, socket.id);

        notificationService.confirmConnection(socket, socket.id);
      } else {
        return notificationService.emitError(socket, 'Invalid role');
      }
    });

    // RIDE FARE REQUEST
    socket.on('ride_fare', async (data) => {
      const { pickup, destination } = data || {};
      if (!pickup || !destination) {
        return notificationService.emitError(socket, 'pickup and destination required');
      }

      const fareEstimates = fareService.calculateFareEstimates(pickup, destination);
      notificationService.sendFareEstimate(socket, fareEstimates);
    });

    // RIDE REQUEST
    socket.on('ride_request', async (data) => {
      const userId = socket.data.userId;
      if (!userId || socket.data.role !== 'customer') {
        return notificationService.emitError(socket, 'Customer not connected');
      }

      const { pickup, destination, type, fareType, fareAmount } = data || {};
      if (!pickup || !destination) {
        return notificationService.emitError(socket, 'pickup and destination required');
      }

      // Create ride request in database
      const rideRequest = await rideRequestService.createRideRequest(
        models, 
        userId, 
        pickup, 
        destination, 
        fareType || type
      );

      // Find nearby available drivers
      const nearbyDrivers = await driverMatchingService.findNearbyDrivers(models, pickup);

      // Inform rider
      notificationService.notifyRideSearching(socket, rideRequest.id);

      if (nearbyDrivers.length === 0) {
        await handleNoDriversAvailable(rideRequest.id, userId);
        return;
      }

      // Store active ride data
      activeRides.set(rideRequest.id, {
        queue: nearbyDrivers.map((d) => d.driverId),
        currentTimeout: null,
      });

      // Start sending requests
      await rideRequestService.sendRequestToNextDriver(
        io, 
        models, 
        rideRequest, 
        activeRides, 
        driverSockets, 
        notificationService.getSocketById
      );
    });

    // RIDE ACCEPT (Driver)
    socket.on('ride_accept', async (data) => {
      const driverId = socket.data.driverId;
      if (!driverId || socket.data.role !== 'driver') {
        return notificationService.emitError(socket, 'Driver not connected');
      }

      const { requestId } = data || {};
      const rideRequest = await rideRequestService.getRideRequest(models, requestId);

      if (!rideRequest) {
        return notificationService.emitError(socket, 'Ride request not found');
      }

      if (rideRequest.status !== 'searching') {
        notificationService.notifyRideAlreadyAccepted(socket, requestId);
        return;
      }

      // Accept the ride
      await rideRequestService.acceptRideRequest(models, requestId, driverId);

      // Clear timeout
      const rideData = activeRides.get(requestId);
      if (rideData && rideData.currentTimeout) {
        clearTimeout(rideData.currentTimeout);
      }
      activeRides.delete(requestId);

      // Get driver details
      const driver = await driverMatchingService.getDriverDetails(models, driverId);

      // Confirm to driver
      notificationService.notifyDriverAssigned(socket, driverId, requestId);

      // Notify rider
      const riderSocketId = riderSockets.get(rideRequest.riderId);
      if (riderSocketId) {
        const riderSocket = notificationService.getSocketById(io, riderSocketId);
        if (riderSocket) {
          notificationService.notifyRiderAssigned(riderSocket, driver, requestId, rideRequest.riderId);
        }
      }
    });

    // UPDATE RIDE STATUS (Driver)
    socket.on('update_ride_status', async (data) => {
      const driverId = socket.data.driverId;
      if (!driverId || socket.data.role !== 'driver') {
        return notificationService.emitError(socket, 'Driver not connected');
      }

      const { requestId, status } = data || {};
      
      // Validate status
      if (!rideStatusService.isValidStatus(status)) {
        return notificationService.emitError(socket, 'Invalid status');
      }

      const rideRequest = await rideRequestService.getRideRequest(models, requestId);

      if (!rideRequest || rideRequest.acceptedDriverId !== driverId) {
        return notificationService.emitError(socket, 'Unauthorized or ride not found');
      }

      // Handle status update
      const result = await rideStatusService.handleRideStatusUpdate(
        models, 
        rideRequest, 
        driverId, 
        status, 
        data
      );

      // Send summary to rider if completed
      if (result.tripCompleted) {
        const riderSocketId = riderSockets.get(rideRequest.riderId);
        if (riderSocketId) {
          const riderSocket = notificationService.getSocketById(io, riderSocketId);
          if (riderSocket) {
            notificationService.sendRideSummary(riderSocket, requestId, result.fare);
          }
        }
      }

      // Notify rider of status update
      const riderSocketId = riderSockets.get(rideRequest.riderId);
      if (riderSocketId) {
        const riderSocket = notificationService.getSocketById(io, riderSocketId);
        if (riderSocket) {
          const message = rideStatusService.getStatusMessage(status);
          notificationService.notifyRideStatusUpdate(riderSocket, requestId, status, message);
        }
      }

      // Confirm to driver
      notificationService.confirmStatusUpdate(socket, requestId, status);
    });

    // DRIVER LOCATION UPDATE
    socket.on('driver_location_update', async (data) => {
      const driverId = socket.data.driverId;
      if (!driverId || socket.data.role !== 'driver') {
        return notificationService.emitError(socket, 'Driver not connected');
      }

      const { coords, heading } = data || {};
      if (!coords || !coords.lat || !coords.lng) {
        return notificationService.emitError(socket, 'coords required');
      }

      // Handle location update with trip tracking
      const result = await locationService.handleDriverLocationUpdate(
        models, 
        driverId, 
        coords, 
        heading
      );

      // If driver has active trip, broadcast to rider
      if (result.hasActiveTrip) {
        const riderSocketId = riderSockets.get(result.riderId);
        if (riderSocketId) {
          const riderSocket = notificationService.getSocketById(io, riderSocketId);
          if (riderSocket) {
            notificationService.broadcastDriverLocation(
              riderSocket, 
              driverId, 
              coords, 
              new Date().toISOString()
            );
          }
        }
      }
    });

    // GET DRIVER LOCATION (Rider)
    socket.on('get_driver_location', async (data) => {
      const userId = socket.data.userId;
      if (!userId || socket.data.role !== 'customer') {
        return notificationService.emitError(socket, 'Customer not connected');
      }

      const { driverId } = data || {};
      
      const locationData = await locationService.getDriverLocation(models, driverId);
      notificationService.sendDriverLocation(socket, locationData);
    });

    // DISCONNECT
    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id}`);

      // If driver
      if (socket.data.role === 'driver' && socket.data.driverId) {
        const driverId = socket.data.driverId;
        driverSockets.delete(driverId);

        // Mark driver offline
        await locationService.markDriverOffline(models, driverId);

        // Check for active trips
        const activeTrip = await rideStatusService.getActiveTrip(models, driverId);

        if (activeTrip) {
          const riderSocketId = riderSockets.get(activeTrip.userId);
          if (riderSocketId) {
            const riderSocket = notificationService.getSocketById(io, riderSocketId);
            if (riderSocket) {
              notificationService.notifyDriverDisconnected(riderSocket);
            }
          }
        }
      }

      // If rider
      if (socket.data.role === 'customer' && socket.data.userId) {
        riderSockets.delete(socket.data.userId);
      }
    });
  });

  return io;
}

module.exports = initRideManagement;
