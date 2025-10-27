# Ride Management WebSocket API Documentation

## Connection

**Endpoint:** `ws://your-server.com` or `wss://your-server.com`

**Protocol:** Socket.IO

---

## Driver Registration

### `driver:connect` (Driver → Server)
Register driver after authentication.

**Request:**
```json
{
  "driverId": "driver_12345",
  "location": {
    "lat": -15.4167,
    "lng": 28.2833
  }
}
```

**Response:** `driver:connected`
```json
{
  "driverId": "driver_12345",
  "status": "available"
}
```

---

## Rider Registration

### `rider:connect` (Rider → Server)
Register rider after authentication.

**Request:**
```json
{
  "riderId": "rider_67890"
}
```

**Response:** `rider:connected`
```json
{
  "riderId": "rider_67890"
}
```

---

## Driver Events

### 1. Update Location

**Event:** `driver:update_location` (Driver → Server)

**Request:**
```json
{
  "location": {
    "lat": -15.4167,
    "lng": 28.2833
  }
}
```

**Response:** None (silent update)

**Side Effect:** If driver is on an active ride, location is sent to rider via `driver:location`.

---

### 2. Receive Ride Request

**Event:** `ride:request` (Server → Driver)

**Response:**
```json
{
  "rideId": "ride_1729785600000_rider_67890",
  "pickup": {
    "lat": -15.4200,
    "lng": 28.2900,
    "address": "123 Main Street, Lusaka"
  },
  "destination": {
    "lat": -15.3900,
    "lng": 28.3200,
    "address": "456 Park Avenue, Lusaka"
  },
  "distance": 3.45,
  "estimatedFare": "8.18",
  "riderId": "rider_67890"
}
```

**⏱️ Timeout:** 30 seconds to respond or ride goes to next driver.

---

### 3. Accept Ride

**Event:** `ride:accept` (Driver → Server)

**Request:**
```json
{
  "rideId": "ride_1729785600000_rider_67890"
}
```

**Success Response:** `ride:accepted_confirm`
```json
{
  "rideId": "ride_1729785600000_rider_67890",
  "pickup": {
    "lat": -15.4200,
    "lng": 28.2900,
    "address": "123 Main Street, Lusaka"
  },
  "destination": {
    "lat": -15.3900,
    "lng": 28.3200,
    "address": "456 Park Avenue, Lusaka"
  },
  "riderId": "rider_67890"
}
```

**Error Response:** `ride:already_accepted`
```json
{
  "rideId": "ride_1729785600000_rider_67890"
}
```

---

### 4. Decline Ride

**Event:** `ride:decline` (Driver → Server)

**Request:**
```json
{
  "rideId": "ride_1729785600000_rider_67890"
}
```

**Response:** None (ride automatically goes to next driver)

---

### 5. Request Expired

**Event:** `ride:expired` (Server → Driver)

**Response:**
```json
{
  "rideId": "ride_1729785600000_rider_67890"
}
```

---

### 6. Start Trip

**Event:** `ride:start` (Driver → Server)

Driver has picked up rider and is starting the trip.

**Request:**
```json
{
  "rideId": "ride_1729785600000_rider_67890"
}
```

**Success Response:** `ride:started_confirm`
```json
{
  "rideId": "ride_1729785600000_rider_67890"
}
```

**Side Effect:** Rider receives `ride:started` event.

---

### 7. Complete Trip

**Event:** `ride:complete` (Driver → Server)

**Request:**
```json
{
  "rideId": "ride_1729785600000_rider_67890"
}
```

**Success Response:** `ride:completed_confirm`
```json
{
  "rideId": "ride_1729785600000_rider_67890",
  "fare": "15.50"
}
```

**Side Effect:** Rider receives `ride:completed` event with fare.

---

### 8. Ride Cancelled

**Event:** `ride:cancelled` (Server → Driver)

Rider has cancelled the ride.

**Response:**
```json
{
  "rideId": "ride_1729785600000_rider_67890"
}
```

---

## Rider Events

### 1. Request Ride

**Event:** `ride:request` (Rider → Server)

**Request:**
```json
{
  "pickup": {
    "lat": -15.4200,
    "lng": 28.2900,
    "address": "123 Main Street, Lusaka"
  },
  "destination": {
    "lat": -15.3900,
    "lng": 28.3200,
    "address": "456 Park Avenue, Lusaka"
  }
}
```

**Success Response:** `ride:searching`
```json
{
  "rideId": "ride_1729785600000_rider_67890",
  "driversFound": 5
}
```

**No Drivers Response:** `ride:no_drivers`
```json
{
  "message": "No drivers available in your area"
}
```

---

### 2. Ride Accepted

**Event:** `ride:accepted` (Server → Rider)

A driver has accepted the ride.

**Response:**
```json
{
  "rideId": "ride_1729785600000_rider_67890",
  "driver": {
    "id": "driver_12345",
    "location": {
      "lat": -15.4167,
      "lng": 28.2833
    },
    "eta": 10
  }
}
```

---

### 3. Ride Started

**Event:** `ride:started` (Server → Rider)

Driver has started the trip.

**Response:**
```json
{
  "rideId": "ride_1729785600000_rider_67890"
}
```

---

### 4. Driver Location Updates

**Event:** `driver:location` (Server → Rider)

Real-time location updates during active ride.

**Response:**
```json
{
  "location": {
    "lat": -15.4167,
    "lng": 28.2833
  },
  "rideId": "ride_1729785600000_rider_67890"
}
```

**Frequency:** Sent whenever driver sends `driver:update_location`

---

### 5. Ride Completed

**Event:** `ride:completed` (Server → Rider)

**Response:**
```json
{
  "rideId": "ride_1729785600000_rider_67890",
  "fare": "15.50"
}
```

---

### 6. Cancel Ride

**Event:** `ride:cancel` (Rider → Server)

**Request:**
```json
{
  "rideId": "ride_1729785600000_rider_67890"
}
```

**Success Response:** `ride:cancelled_confirm`
```json
{
  "rideId": "ride_1729785600000_rider_67890"
}
```

**Side Effect:** Driver receives `ride:cancelled` event.

---

### 7. Get Nearby Drivers

**Event:** `drivers:nearby` (Rider → Server)

Get list of available drivers for map display.

**Request:**
```json
{
  "location": {
    "lat": -15.4200,
    "lng": 28.2900
  }
}
```

**Response:** `drivers:list`
```json
{
  "drivers": [
    {
      "id": "driver_123",
      "location": {
        "lat": -15.4167,
        "lng": 28.2833
      },
      "distance": 0.8
    },
    {
      "id": "driver_456",
      "location": {
        "lat": -15.4250,
        "lng": 28.2950
      },
      "distance": 1.2
    }
  ]
}
```

---

### 8. No Drivers Available

**Event:** `ride:no_drivers` (Server → Rider)

All drivers in queue were unavailable or didn't respond.

**Response:**
```json
{
  "rideId": "ride_1729785600000_rider_67890",
  "message": "No drivers available in your area"
}
```

---

### 9. Driver Disconnected

**Event:** `driver:disconnected` (Server → Rider)

Assigned driver disconnected during active ride.

**Response:**
```json
{
  "rideId": "ride_1729785600000_rider_67890"
}
```

---

## Error Event

**Event:** `error` (Server → Client)

**Response:**
```json
{
  "message": "Error description here"
}
```

**Common Errors:**
- "Rider not registered"
- "Driver not registered"
- "Ride not found"
- "Invalid ride or driver"
- "Unauthorized"

---

## Ride Flow Diagram

```
1. Rider sends ride:request
   ↓
2. Server finds nearby drivers (within 5km radius)
   ↓
3. Server sends ride:request to closest driver
   ↓
4a. Driver accepts (ride:accept)
    → Status: accepted
    → Rider gets ride:accepted
    → Driver gets ride:accepted_confirm
   ↓
5. Driver arrives and sends ride:start
   → Status: in_progress
   → Rider gets ride:started
   ↓
6. Driver sends ride:complete
   → Status: completed
   → Both get ride:completed with fare

4b. Driver declines (ride:decline) OR 30s timeout
    → Move to next driver in queue
    → Repeat step 3
    
4c. No more drivers available
    → Rider gets ride:no_drivers
    → Status: failed
    
Any time: Rider sends ride:cancel
    → Status: cancelled
    → Driver gets ride:cancelled
```

---

## Configuration

| Parameter | Value | Description |
|-----------|-------|-------------|
| `SEARCH_RADIUS_KM` | 5 | Search radius for drivers (km) |
| `DRIVER_RESPONSE_TIMEOUT` | 30000 | Driver response timeout (ms) |
| `BASE_FARE` | 3 | Base fare amount |
| `PER_KM_RATE` | 1.5 | Rate per kilometer |

---

## Example Usage

### Driver Client
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

// Register as driver
socket.emit('driver:connect', {
  driverId: 'driver_123',
  location: { lat: -15.4167, lng: 28.2833 }
});

// Update location every 10 seconds
setInterval(() => {
  socket.emit('driver:update_location', {
    location: { lat: -15.4167, lng: 28.2833 }
  });
}, 10000);

// Listen for ride requests
socket.on('ride:request', (data) => {
  console.log('New ride request:', data);
  // Show to driver, let them accept/decline
});

// Accept ride
socket.emit('ride:accept', { rideId: 'ride_xxx' });

// Start trip
socket.emit('ride:start', { rideId: 'ride_xxx' });

// Complete trip
socket.emit('ride:complete', { rideId: 'ride_xxx' });
```

### Rider Client
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

// Register as rider
socket.emit('rider:connect', {
  riderId: 'rider_789'
});

// Request ride
socket.emit('ride:request', {
  pickup: { 
    lat: -15.4200, 
    lng: 28.2900, 
    address: '123 Main St' 
  },
  destination: { 
    lat: -15.3900, 
    lng: 28.3200, 
    address: '456 Park Ave' 
  }
});

// Listen for ride status
socket.on('ride:searching', (data) => {
  console.log('Searching for drivers...', data);
});

socket.on('ride:accepted', (data) => {
  console.log('Driver accepted!', data.driver);
});

socket.on('driver:location', (data) => {
  console.log('Driver location:', data.location);
  // Update map
});

socket.on('ride:started', (data) => {
  console.log('Trip started!');
});

socket.on('ride:completed', (data) => {
  console.log('Trip completed. Fare:', data.fare);
});

// Cancel ride
socket.emit('ride:cancel', { rideId: 'ride_xxx' });
```

---

## Best Practices

1. **Driver Location Updates:** Send every 5-10 seconds during active rides
2. **Reconnection:** Implement exponential backoff for reconnections
3. **State Management:** Store ride state locally to handle disconnections
4. **Error Handling:** Always listen to `error` event
5. **UI Feedback:** Show loading states during `ride:searching`
6. **Timeout Handling:** Inform users about the 30-second driver response window
7. **Battery Optimization:** Reduce location frequency when driver is idle