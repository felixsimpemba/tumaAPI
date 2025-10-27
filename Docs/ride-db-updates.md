# Ride Management: Recommended Database Updates

This document proposes minimal, incremental database changes to complement the new WebSocket-based ride management (Docs/rideManagement.md). These updates let you persist key events and state that are currently kept in-memory, without breaking existing REST flows or Sequelize models.

You can adopt them gradually: start with ride_requests (for auditing) and trip_locations (for route history), then add attempts and heartbeats as your needs grow.

---

## Goals
- Persist requested/accepted/cancelled ride metadata for auditing and analytics
- Keep a history of driver locations during in-progress trips (optional)
- Track driver availability and last-seen heartbeat to improve reliability
- Avoid disruption to existing `trips`, `drivers`, and `payments` tables

---

## New Tables

### 1) ride_requests
Represents a rider's request while the system is matching drivers. A request may fail (no drivers), be cancelled, or become a trip after acceptance.

Columns:
- id BIGINT UNSIGNED PK
- riderId BIGINT UNSIGNED NOT NULL → FK users(id)
- pickup JSON NOT NULL  // { address, lat, lng }
- dropoff JSON NOT NULL
- distance DECIMAL(10,2) NULL  // straight-line km estimate
- estimatedFare DECIMAL(12,2) NULL
- status ENUM('searching','accepted','cancelled','failed') NOT NULL DEFAULT 'searching'
- acceptedDriverId BIGINT UNSIGNED NULL → FK drivers(id)
- createdAt DATETIME NOT NULL
- updatedAt DATETIME NOT NULL
- Indexes: (riderId), (status), (acceptedDriverId)

Usage:
- Insert when a rider emits `ride:request`
- Update status on `ride:accepted`, `ride:cancel`, or when queue exhausts (no drivers)
- Link to `trips` after acceptance by storing the resulting tripId on the `trips` table or via a join table

---

### 2) ride_request_attempts
Audit trail of which drivers were asked to accept a given request, with outcome and timing.

Columns:
- id BIGINT UNSIGNED PK
- rideRequestId BIGINT UNSIGNED NOT NULL → FK ride_requests(id) ON DELETE CASCADE
- driverId BIGINT UNSIGNED NOT NULL → FK drivers(id) ON DELETE CASCADE
- outcome ENUM('sent','accepted','declined','timeout','offline') NOT NULL DEFAULT 'sent'
- respondedAt DATETIME NULL
- createdAt DATETIME NOT NULL
- updatedAt DATETIME NOT NULL
- Indexes: (rideRequestId), (driverId), (outcome)

Usage:
- Insert a row when sending `ride:request` to a driver
- Update to `accepted`, `declined`, or `timeout`

---

### 3) trip_locations (optional but valuable)
Stores a time series of locations for a trip for mapping, support, and fraud checks.

Columns:
- id BIGINT UNSIGNED PK
- tripId BIGINT UNSIGNED NOT NULL → FK trips(id) ON DELETE CASCADE
- actor ENUM('driver','rider') NOT NULL DEFAULT 'driver'
- lat DECIMAL(10,7) NOT NULL
- lng DECIMAL(10,7) NOT NULL
- speedKph DECIMAL(6,2) NULL
- heading SMALLINT NULL  // degrees 0..359
- createdAt DATETIME NOT NULL
- updatedAt DATETIME NOT NULL
- Indexes: (tripId), (createdAt)

Usage:
- On `driver:update_location` during an active trip, optionally persist at a chosen sampling interval (e.g., every 5–10 seconds) to control volume.

---

### 4) driver_heartbeats (optional)
Tracks last known driver status and connectivity for better availability logic.

Columns:
- id BIGINT UNSIGNED PK
- driverId BIGINT UNSIGNED NOT NULL → FK drivers(id) ON DELETE CASCADE
- lat DECIMAL(10,7) NULL
- lng DECIMAL(10,7) NULL
- status ENUM('available','busy','offline') NOT NULL DEFAULT 'offline'
- socketId VARCHAR(100) NULL
- lastSeenAt DATETIME NOT NULL
- createdAt DATETIME NOT NULL
- updatedAt DATETIME NOT NULL
- Indexes: (driverId), (status), (lastSeenAt)

Usage:
- Update on `driver:connect`, `driver:update_location`, and `disconnect`

---

## SQL DDL (MySQL 8.0+)

```sql
-- 1) ride_requests
CREATE TABLE IF NOT EXISTS ride_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  riderId BIGINT UNSIGNED NOT NULL,
  pickup JSON NOT NULL,
  dropoff JSON NOT NULL,
  distance DECIMAL(10,2) NULL,
  estimatedFare DECIMAL(12,2) NULL,
  status ENUM('searching','accepted','cancelled','failed') NOT NULL DEFAULT 'searching',
  acceptedDriverId BIGINT UNSIGNED NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_rr_rider (riderId),
  KEY idx_rr_status (status),
  KEY idx_rr_accepted (acceptedDriverId),
  CONSTRAINT fk_rr_rider FOREIGN KEY (riderId) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_rr_driver FOREIGN KEY (acceptedDriverId) REFERENCES drivers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) ride_request_attempts
CREATE TABLE IF NOT EXISTS ride_request_attempts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  rideRequestId BIGINT UNSIGNED NOT NULL,
  driverId BIGINT UNSIGNED NOT NULL,
  outcome ENUM('sent','accepted','declined','timeout','offline') NOT NULL DEFAULT 'sent',
  respondedAt DATETIME NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_rra_rr (rideRequestId),
  KEY idx_rra_driver (driverId),
  KEY idx_rra_outcome (outcome),
  CONSTRAINT fk_rra_rr FOREIGN KEY (rideRequestId) REFERENCES ride_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_rra_driver FOREIGN KEY (driverId) REFERENCES drivers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3) trip_locations
CREATE TABLE IF NOT EXISTS trip_locations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tripId BIGINT UNSIGNED NOT NULL,
  actor ENUM('driver','rider') NOT NULL DEFAULT 'driver',
  lat DECIMAL(10,7) NOT NULL,
  lng DECIMAL(10,7) NOT NULL,
  speedKph DECIMAL(6,2) NULL,
  heading SMALLINT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_tl_trip (tripId),
  KEY idx_tl_created (createdAt),
  CONSTRAINT fk_tl_trip FOREIGN KEY (tripId) REFERENCES trips(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4) driver_heartbeats
CREATE TABLE IF NOT EXISTS driver_heartbeats (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  driverId BIGINT UNSIGNED NOT NULL,
  lat DECIMAL(10,7) NULL,
  lng DECIMAL(10,7) NULL,
  status ENUM('available','busy','offline') NOT NULL DEFAULT 'offline',
  socketId VARCHAR(100) NULL,
  lastSeenAt DATETIME NOT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_dhb_driver (driverId),
  KEY idx_dhb_status (status),
  KEY idx_dhb_lastSeen (lastSeenAt),
  CONSTRAINT fk_dhb_driver FOREIGN KEY (driverId) REFERENCES drivers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Sequelize Model Sketches (optional)
These are illustrative; you can add them under `/models` when you decide to persist. They won’t be wired by default.

```js
// models/rideRequest.js
module.exports = (sequelize, DataTypes) => {
  const RideRequest = sequelize.define('RideRequest', {
    riderId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    pickup: { type: DataTypes.JSON, allowNull: false },
    dropoff: { type: DataTypes.JSON, allowNull: false },
    distance: { type: DataTypes.DECIMAL(10,2) },
    estimatedFare: { type: DataTypes.DECIMAL(12,2) },
    status: { type: DataTypes.ENUM('searching','accepted','cancelled','failed'), defaultValue: 'searching' },
    acceptedDriverId: { type: DataTypes.BIGINT.UNSIGNED },
  }, { tableName: 'ride_requests' });
  return RideRequest;
};

// models/rideRequestAttempt.js
module.exports = (sequelize, DataTypes) => {
  const RideRequestAttempt = sequelize.define('RideRequestAttempt', {
    rideRequestId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    driverId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    outcome: { type: DataTypes.ENUM('sent','accepted','declined','timeout','offline'), defaultValue: 'sent' },
    respondedAt: { type: DataTypes.DATE },
  }, { tableName: 'ride_request_attempts' });
  return RideRequestAttempt;
};

// models/tripLocation.js
module.exports = (sequelize, DataTypes) => {
  const TripLocation = sequelize.define('TripLocation', {
    tripId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    actor: { type: DataTypes.ENUM('driver','rider'), defaultValue: 'driver' },
    lat: { type: DataTypes.DECIMAL(10,7), allowNull: false },
    lng: { type: DataTypes.DECIMAL(10,7), allowNull: false },
    speedKph: { type: DataTypes.DECIMAL(6,2) },
    heading: { type: DataTypes.SMALLINT },
  }, { tableName: 'trip_locations' });
  return TripLocation;
};
```

---

## Migration/Application Plan
- Phase 1 (Audit only):
  - Create `ride_requests` and `ride_request_attempts` tables
  - From the WebSocket layer, insert a row on request; log each driver attempt with outcome
- Phase 2 (Trip telemetry):
  - Create `trip_locations`; sample and persist driver locations during active trips
- Phase 3 (Reliability):
  - Create `driver_heartbeats` and update it on connect/location/disconnect

You can toggle persistence via env flags (see below) and keep it disabled in dev until ready.

---

## Environment Flags (proposed)
Add these to `.env` (default off). They are not wired yet in code — safe to add now and enable when you implement persistence.

```
WS_PERSIST_RIDES=false
WS_PERSIST_LOCATIONS=false
WS_LOCATION_SAMPLE_INTERVAL_MS=10000
```

---

## Why not store everything on trips?
The in-memory matching occurs before a trip exists. Persisting it separately (ride_requests + attempts) gives better observability, allows SLA metrics (search time, timeout rates), and doesn’t pollute the canonical trip record.

---

## Next Steps
1) Confirm which parts you want to persist first (audit vs. telemetry vs. reliability)
2) I’ll add Sequelize models and minimal writes inside `sockets/rideManagement.js` guarded by the env flags
3) Provide a migration script to create tables automatically in dev (`npm run db:sync`) and SQL for prod
