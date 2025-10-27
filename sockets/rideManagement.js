// Socket.IO Ride Management implementation
// Follows Docs/rideManagement.md

const { Server } = require('socket.io');

// Configuration with env fallbacks
const SEARCH_RADIUS_KM = parseFloat(process.env.SEARCH_RADIUS_KM || '5');
const DRIVER_RESPONSE_TIMEOUT = parseInt(process.env.DRIVER_RESPONSE_TIMEOUT || '30000', 10);
const BASE_FARE = parseFloat(process.env.BASE_FARE || '3');
const PER_KM_RATE = parseFloat(process.env.PER_KM_RATE || '1.5');

// Haversine distance in kilometers
function distanceKm(a, b) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function fareEstimate(distanceKmVal) {
  const fare = BASE_FARE + PER_KM_RATE * (distanceKmVal || 0);
  return fare.toFixed(2);
}

// In-memory stores (simple; replace with DB/Redis in prod)
const drivers = new Map(); // driverId -> { socketId, location, status: 'available'|'busy'|'offline', activeRideId }
const riders = new Map(); // riderId -> { socketId }
const rides = new Map(); // rideId -> ride object

// Ride object shape reference:
// {
//   id, riderId, pickup, destination, distance, estimatedFare,
//   status: 'searching'|'accepted'|'in_progress'|'completed'|'cancelled'|'failed',
//   assignedDriverId, queue: [driverId...], timeouts: { current: Timeout },
// }

function generateRideId(riderId) {
  return `ride_${Date.now()}_${riderId}`;
}

function getSocketById(io, socketId) {
  return io.sockets.sockets.get(socketId);
}

function buildDriverPublicInfo(driver) {
  return {
    id: driver.driverId,
    location: driver.location,
  };
}

function initRideManagement(server) {
  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    path: '/socket.io',
  });

  function emitError(socket, message) {
    try { socket.emit('error', { message }); } catch (_) {}
  }

  function sendRequestToNextDriver(io, ride) {
    // Clear any existing timeout
    if (ride.timeouts && ride.timeouts.current) {
      clearTimeout(ride.timeouts.current);
      ride.timeouts.current = null;
    }

    while (ride.queue.length > 0) {
      const nextDriverId = ride.queue.shift();
      const driver = drivers.get(nextDriverId);
      if (!driver || driver.status !== 'available') {
        continue;
      }
      // mark driver as pending for this ride
      driver.status = 'busy'; // temporarily busy during request window
      driver.pendingRideId = ride.id;
      // send request
      const driverSocket = getSocketById(io, driver.socketId);
      if (!driverSocket) {
        // driver offline
        driver.status = 'offline';
        driver.pendingRideId = null;
        continue;
      }
      driverSocket.emit('ride:request', {
        rideId: ride.id,
        pickup: ride.pickup,
        destination: ride.destination,
        distance: ride.distance,
        estimatedFare: ride.estimatedFare,
        riderId: ride.riderId,
      });
      // start timeout
      ride.timeouts.current = setTimeout(() => {
        // let this driver know the request expired
        const dSock = getSocketById(io, driver.socketId);
        if (dSock) {
          dSock.emit('ride:expired', { rideId: ride.id });
        }
        // free driver back to available if not accepted
        if (driver.pendingRideId === ride.id && ride.status === 'searching') {
          driver.status = 'available';
          driver.pendingRideId = null;
        }
        // try next
        sendRequestToNextDriver(io, ride);
      }, DRIVER_RESPONSE_TIMEOUT);

      return; // waiting for response from this driver
    }

    // no drivers left
    ride.status = 'failed';
    const rider = riders.get(ride.riderId);
    if (rider) {
      const riderSocket = getSocketById(io, rider.socketId);
      if (riderSocket) {
        riderSocket.emit('ride:no_drivers', {
          rideId: ride.id,
          message: 'No drivers available in your area',
        });
      }
    }
  }

  io.on('connection', (socket) => {
    // DRIVER REGISTER
    socket.on('driver:connect', (data) => {
      const { driverId, location } = data || {};
      if (!driverId) return emitError(socket, 'Driver not registered');
      drivers.set(driverId, {
        driverId,
        socketId: socket.id,
        location: location || null,
        status: 'available',
        activeRideId: null,
        pendingRideId: null,
      });
      socket.data.role = 'driver';
      socket.data.driverId = driverId;
      if (location) socket.data.location = location;
      socket.emit('driver:connected', { driverId, status: 'available' });
    });

    // RIDER REGISTER
    socket.on('rider:connect', (data) => {
      const { riderId } = data || {};
      if (!riderId) return emitError(socket, 'Rider not registered');
      riders.set(riderId, { riderId, socketId: socket.id });
      socket.data.role = 'rider';
      socket.data.riderId = riderId;
      socket.emit('rider:connected', { riderId });
    });

    // DRIVER UPDATE LOCATION
    socket.on('driver:update_location', (data) => {
      const { location } = data || {};
      const driverId = socket.data.driverId;
      if (!driverId || !drivers.has(driverId)) return emitError(socket, 'Driver not registered');
      const d = drivers.get(driverId);
      d.location = location || d.location;
      socket.data.location = d.location;
      // If on active ride, forward to rider
      const rideId = d.activeRideId;
      if (rideId) {
        const ride = rides.get(rideId);
        if (ride) {
          const rider = riders.get(ride.riderId);
          if (rider) {
            const riderSocket = getSocketById(io, rider.socketId);
            if (riderSocket) {
              riderSocket.emit('driver:location', { location: d.location, rideId });
            }
          }
        }
      }
    });

    // RIDER REQUEST RIDE
    socket.on('ride:request', (data) => {
      const riderId = socket.data.riderId;
      if (!riderId || !riders.has(riderId)) return emitError(socket, 'Rider not registered');
      const { pickup, destination } = data || {};
      if (!pickup || !destination) return emitError(socket, 'Invalid ride or driver');

      // Find nearby available drivers
      const availableDrivers = [];
      drivers.forEach((d) => {
        if (d.status === 'available' && d.location) {
          const dist = distanceKm(pickup, d.location);
          if (dist <= SEARCH_RADIUS_KM) {
            availableDrivers.push({ driverId: d.driverId, dist });
          }
        }
      });
      availableDrivers.sort((a, b) => a.dist - b.dist);

      const rideId = generateRideId(riderId);
      const totalDistance = distanceKm(pickup, destination);
      const ride = {
        id: rideId,
        riderId,
        pickup,
        destination,
        distance: parseFloat(totalDistance.toFixed(2)),
        estimatedFare: fareEstimate(totalDistance),
        status: 'searching',
        assignedDriverId: null,
        queue: availableDrivers.map((x) => x.driverId),
        timeouts: { current: null },
      };
      rides.set(rideId, ride);

      // Inform rider
      socket.emit('ride:searching', { rideId, driversFound: availableDrivers.length });

      if (availableDrivers.length === 0) {
        socket.emit('ride:no_drivers', { message: 'No drivers available in your area' });
        ride.status = 'failed';
        return;
      }

      // request to first driver
      sendRequestToNextDriver(io, ride);
    });

    // DRIVER ACCEPT RIDE
    socket.on('ride:accept', (data) => {
      const driverId = socket.data.driverId;
      if (!driverId || !drivers.has(driverId)) return emitError(socket, 'Driver not registered');
      const { rideId } = data || {};
      const ride = rideId && rides.get(rideId);
      if (!ride) return emitError(socket, 'Ride not found');
      const driver = drivers.get(driverId);

      if (ride.status !== 'searching' || driver.pendingRideId !== rideId) {
        // Someone else already accepted
        socket.emit('ride:already_accepted', { rideId });
        return;
      }

      // Accept
      ride.status = 'accepted';
      ride.assignedDriverId = driverId;
      driver.activeRideId = ride.id;
      driver.pendingRideId = null;
      driver.status = 'busy';

      // clear timeout
      if (ride.timeouts && ride.timeouts.current) {
        clearTimeout(ride.timeouts.current);
        ride.timeouts.current = null;
      }

      // notify driver
      socket.emit('ride:accepted_confirm', {
        rideId: ride.id,
        pickup: ride.pickup,
        destination: ride.destination,
        riderId: ride.riderId,
      });

      // notify rider
      const rider = riders.get(ride.riderId);
      if (rider) {
        const driverObj = drivers.get(driverId);
        const riderSocket = getSocketById(io, rider.socketId);
        if (riderSocket) {
          // naive ETA based on straight-line distance at 30 km/h
          let eta = 10;
          try {
            if (driverObj && driverObj.location && ride.pickup) {
              const dkm = distanceKm(driverObj.location, ride.pickup);
              eta = Math.max(1, Math.round((dkm / 30) * 60));
            }
          } catch (_) {}
          riderSocket.emit('ride:accepted', {
            rideId: ride.id,
            driver: {
              id: driverId,
              location: driverObj?.location || null,
              eta,
            },
          });
        }
      }
    });

    // DRIVER DECLINE
    socket.on('ride:decline', (data) => {
      const driverId = socket.data.driverId;
      if (!driverId || !drivers.has(driverId)) return emitError(socket, 'Driver not registered');
      const { rideId } = data || {};
      const ride = rideId && rides.get(rideId);
      if (!ride) return; // silent
      const driver = drivers.get(driverId);
      if (driver.pendingRideId === rideId && ride.status === 'searching') {
        driver.pendingRideId = null;
        driver.status = 'available';
        // move to next driver
        sendRequestToNextDriver(io, ride);
      }
    });

    // DRIVER START RIDE
    socket.on('ride:start', (data) => {
      const driverId = socket.data.driverId;
      if (!driverId || !drivers.has(driverId)) return emitError(socket, 'Driver not registered');
      const { rideId } = data || {};
      const ride = rideId && rides.get(rideId);
      if (!ride) return emitError(socket, 'Ride not found');
      if (ride.assignedDriverId !== driverId) return emitError(socket, 'Invalid ride or driver');
      ride.status = 'in_progress';
      socket.emit('ride:started_confirm', { rideId });
      const rider = riders.get(ride.riderId);
      if (rider) {
        const riderSocket = getSocketById(io, rider.socketId);
        riderSocket && riderSocket.emit('ride:started', { rideId });
      }
    });

    // DRIVER COMPLETE RIDE
    socket.on('ride:complete', (data) => {
      const driverId = socket.data.driverId;
      if (!driverId || !drivers.has(driverId)) return emitError(socket, 'Driver not registered');
      const { rideId } = data || {};
      const ride = rideId && rides.get(rideId);
      if (!ride) return emitError(socket, 'Ride not found');
      if (ride.assignedDriverId !== driverId) return emitError(socket, 'Invalid ride or driver');
      ride.status = 'completed';
      const fare = ride.estimatedFare || fareEstimate(ride.distance);
      socket.emit('ride:completed_confirm', { rideId, fare });
      const rider = riders.get(ride.riderId);
      if (rider) {
        const riderSocket = getSocketById(io, rider.socketId);
        riderSocket && riderSocket.emit('ride:completed', { rideId, fare });
      }
      // free driver
      const driver = drivers.get(driverId);
      if (driver) {
        driver.activeRideId = null;
        driver.status = 'available';
      }
    });

    // RIDER CANCEL
    socket.on('ride:cancel', (data) => {
      const riderId = socket.data.riderId;
      if (!riderId || !riders.has(riderId)) return emitError(socket, 'Rider not registered');
      const { rideId } = data || {};
      const ride = rideId && rides.get(rideId);
      if (!ride) return emitError(socket, 'Ride not found');
      if (ride.riderId !== riderId) return emitError(socket, 'Unauthorized');

      ride.status = 'cancelled';
      socket.emit('ride:cancelled_confirm', { rideId });

      // notify driver
      if (ride.assignedDriverId) {
        const driver = drivers.get(ride.assignedDriverId);
        if (driver) {
          const dSock = getSocketById(io, driver.socketId);
          dSock && dSock.emit('ride:cancelled', { rideId });
          driver.activeRideId = null;
          driver.status = 'available';
        }
      }
    });

    // RIDER ASK NEARBY DRIVERS
    socket.on('drivers:nearby', (data) => {
      const { location } = data || {};
      if (!location) return emitError(socket, 'Invalid ride or driver');
      const result = [];
      drivers.forEach((d) => {
        if (d.status === 'available' && d.location) {
          const dist = distanceKm(location, d.location);
          result.push({ id: d.driverId, location: d.location, distance: parseFloat(dist.toFixed(2)) });
        }
      });
      result.sort((a, b) => a.distance - b.distance);
      socket.emit('drivers:list', { drivers: result });
    });

    socket.on('disconnect', () => {
      // If driver
      if (socket.data.role === 'driver') {
        const driverId = socket.data.driverId;
        const d = driverId && drivers.get(driverId);
        if (d) {
          d.status = 'offline';
          d.socketId = null;
          // notify rider if active ride
          if (d.activeRideId) {
            const ride = rides.get(d.activeRideId);
            if (ride) {
              const rider = riders.get(ride.riderId);
              if (rider) {
                const riderSocket = getSocketById(io, rider.socketId);
                riderSocket && riderSocket.emit('driver:disconnected', { rideId: ride.id });
              }
            }
          }
        }
      }

      // If rider
      if (socket.data.role === 'rider') {
        const riderId = socket.data.riderId;
        const r = riderId && riders.get(riderId);
        if (r) {
          r.socketId = null; // mark offline but retain mapping
        }
      }
    });
  });

  return io;
}

module.exports = initRideManagement;
