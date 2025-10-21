# Tuma API Database Schema

This document describes the relational schema used by the backend. It is derived from the current Sequelize models in the repository and targets MySQL 8.0+ (JSON type is used). If you prefer SQL, see Docs/db-schema.sql for a ready-to-run DDL script.

## Overview of Tables
- users
- drivers
- vehicles
- trips
- payments
- otps
- notifications
- ratings

## Entity Details

### users
- id BIGINT UNSIGNED PK
- name VARCHAR(120) NULL
- phone VARCHAR(32) NOT NULL UNIQUE
- email VARCHAR(160) NULL UNIQUE
- role ENUM('user','driver','admin') NOT NULL DEFAULT 'user'
- phoneVerifiedAt DATETIME NULL
- deletedAt DATETIME NULL (soft delete via Sequelize paranoid)
- createdAt DATETIME NOT NULL
- updatedAt DATETIME NOT NULL
- Indexes: phone, email, role

### drivers
- id BIGINT UNSIGNED PK
- userId BIGINT UNSIGNED NOT NULL → FK users(id) ON DELETE CASCADE
- vehicleId BIGINT UNSIGNED NULL (no FK to avoid circular reference with vehicles)
- licenseDocUrl VARCHAR(512) NULL
- status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending'
- online TINYINT(1) NOT NULL DEFAULT 0
- lat DECIMAL(10,7) NULL
- lng DECIMAL(10,7) NULL
- createdAt DATETIME NOT NULL
- updatedAt DATETIME NOT NULL
- Indexes: (userId), (status, online)

### vehicles
- id BIGINT UNSIGNED PK
- driverId BIGINT UNSIGNED NOT NULL → FK drivers(id) ON DELETE CASCADE
- type ENUM('car','bike','van','other') NOT NULL DEFAULT 'car'
- plateNumber VARCHAR(32) NOT NULL UNIQUE
- color VARCHAR(32) NULL
- createdAt DATETIME NOT NULL
- updatedAt DATETIME NOT NULL
- Indexes: (driverId), UNIQUE(plateNumber)

### trips
- id BIGINT UNSIGNED PK
- userId BIGINT UNSIGNED NOT NULL → FK users(id) ON DELETE CASCADE
- driverId BIGINT UNSIGNED NULL → FK drivers(id) ON DELETE SET NULL
- pickup JSON NOT NULL  // { address, lat, lng }
- dropoff JSON NOT NULL
- distance DECIMAL(10,2) NULL (km)
- fare DECIMAL(12,2) NULL
- status ENUM('requested','accepted','in-progress','completed','cancelled') NOT NULL DEFAULT 'requested'
- createdAt DATETIME NOT NULL
- updatedAt DATETIME NOT NULL
- Indexes: (userId), (driverId), (status)

### payments
- id BIGINT UNSIGNED PK
- tripId BIGINT UNSIGNED NOT NULL → FK trips(id) ON DELETE CASCADE
- amount DECIMAL(12,2) NOT NULL DEFAULT 0
- method ENUM('mtn_momo','airtel_money','cash','card','other') NOT NULL DEFAULT 'cash'
- status ENUM('pending','success','failed') NOT NULL DEFAULT 'pending'
- providerRef VARCHAR(128) NULL
- createdAt DATETIME NOT NULL
- updatedAt DATETIME NOT NULL
- Indexes: (tripId), (status), (method)

### otps
- id BIGINT UNSIGNED PK
- phone VARCHAR(32) NOT NULL
- purpose ENUM('login','register','reset') NOT NULL DEFAULT 'login'
- codeHash VARCHAR(255) NOT NULL
- expiresAt DATETIME NOT NULL
- attempts INT UNSIGNED NOT NULL DEFAULT 0
- consumedAt DATETIME NULL
- createdAt DATETIME NOT NULL
- updatedAt DATETIME NOT NULL
- Indexes: (phone), (purpose), (expiresAt)

### notifications
- id BIGINT UNSIGNED PK
- userId BIGINT UNSIGNED NOT NULL → FK users(id) ON DELETE CASCADE
- title VARCHAR(160) NOT NULL
- message TEXT NOT NULL
- read TINYINT(1) NOT NULL DEFAULT 0
- createdAt DATETIME NOT NULL
- updatedAt DATETIME NOT NULL
- Indexes: (userId), (read)

### ratings
- id BIGINT UNSIGNED PK
- tripId BIGINT UNSIGNED NOT NULL → FK trips(id) ON DELETE CASCADE
- userId BIGINT UNSIGNED NOT NULL → FK users(id) ON DELETE CASCADE
- driverId BIGINT UNSIGNED NOT NULL → FK drivers(id) ON DELETE CASCADE
- rating INT UNSIGNED NOT NULL (1..5)  
  Note: MySQL <8 ignores CHECK; enforce range at app level.
- comment VARCHAR(500) NULL
- createdAt DATETIME NOT NULL
- updatedAt DATETIME NOT NULL
- Indexes: (tripId), (userId), (driverId)

## Relationships
- users 1—1 drivers (each driver profile belongs to a user)
- users 1—N trips (as rider)
- users 1—N notifications
- users 1—N ratings (ratingsGiven)
- drivers 1—N trips
- drivers 1—1 vehicles
- drivers 1—N ratings (ratingsReceived)
- trips 1—1 payments
- trips 1—N ratings

Note: To avoid a circular foreign key, we keep `drivers.vehicleId` as a nullable reference without enforcing FK. `vehicles.driverId` is the enforced FK.

## How this maps to Sequelize
- Models are defined in /models and initialized in /models/index.js; associations mirror the above.
- Auto-creation is not run at server start. Use the provided script for development:
  - Safe (non-destructive) sync: `npm run db:sync`
  - Force (drop & recreate): `npm run db:sync:force` (dev only)

## Applying the SQL directly
If you prefer to create the schema manually:
1. Ensure your MySQL user is using a supported auth plugin (see Docs/mysql-auth-plugins.md).
2. Create a database (e.g., `CREATE DATABASE tumaapi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`).
3. Use the database (`USE tumaapi;`).
4. Run the statements in Docs/db-schema.sql.

## Indexing & Performance Notes
- Geospatial queries: consider adding a spatial index or using POINT types for (lat, lng) in `drivers` if you plan advanced proximity search. Current DECIMAL columns are sufficient for basic queries.
- Common filters have indexes: (status) on trips, (status, online) on drivers.
- Add composite indexes as usage patterns emerge.

## Compatibility
- MySQL 8.0+ recommended. JSON columns require MySQL 5.7+.
- If you switch to PostgreSQL later, JSONB and PostGIS can be used for improved geospatial capabilities.
