-- Tuma API - MySQL Database Schema (derived from Sequelize models)
-- Engine/charset settings
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Drop tables if you need a clean slate (uncomment carefully in dev only)
-- DROP TABLE IF EXISTS ratings;
-- DROP TABLE IF EXISTS notifications;
-- DROP TABLE IF EXISTS otps;
-- DROP TABLE IF EXISTS payments;
-- DROP TABLE IF EXISTS trips;
-- DROP TABLE IF EXISTS vehicles;
-- DROP TABLE IF EXISTS drivers;
-- DROP TABLE IF EXISTS users;

-- users
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NULL,
  phone VARCHAR(32) NOT NULL,
  email VARCHAR(160) NULL,
  role ENUM('user','driver','admin') NOT NULL DEFAULT 'user',
  phoneVerifiedAt DATETIME NULL,
  deletedAt DATETIME NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_phone (phone),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- drivers
CREATE TABLE IF NOT EXISTS drivers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  userId BIGINT UNSIGNED NOT NULL,
  vehicleId BIGINT UNSIGNED NULL,
  licenseDocUrl VARCHAR(512) NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  online TINYINT(1) NOT NULL DEFAULT 0,
  lat DECIMAL(10,7) NULL,
  lng DECIMAL(10,7) NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_drivers_userId (userId),
  KEY idx_drivers_status_online (status, online),
  CONSTRAINT fk_drivers_userId__users_id FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
  -- Note: vehicleId kept without FK to avoid circular dependency with vehicles
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- vehicles
CREATE TABLE IF NOT EXISTS vehicles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  driverId BIGINT UNSIGNED NOT NULL,
  type ENUM('car','bike','van','other') NOT NULL DEFAULT 'car',
  plateNumber VARCHAR(32) NOT NULL,
  color VARCHAR(32) NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_vehicles_plateNumber (plateNumber),
  KEY idx_vehicles_driverId (driverId),
  CONSTRAINT fk_vehicles_driverId__drivers_id FOREIGN KEY (driverId) REFERENCES drivers(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- trips
CREATE TABLE IF NOT EXISTS trips (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  userId BIGINT UNSIGNED NOT NULL,
  driverId BIGINT UNSIGNED NULL,
  pickup JSON NOT NULL,
  dropoff JSON NOT NULL,
  distance DECIMAL(10,2) NULL,
  fare DECIMAL(12,2) NULL,
  status ENUM('requested','accepted','in-progress','completed','cancelled') NOT NULL DEFAULT 'requested',
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_trips_userId (userId),
  KEY idx_trips_driverId (driverId),
  KEY idx_trips_status (status),
  CONSTRAINT fk_trips_userId__users_id FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_trips_driverId__drivers_id FOREIGN KEY (driverId) REFERENCES drivers(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- payments
CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tripId BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  method ENUM('mtn_momo','airtel_money','cash','card','other') NOT NULL DEFAULT 'cash',
  status ENUM('pending','success','failed') NOT NULL DEFAULT 'pending',
  providerRef VARCHAR(128) NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_payments_tripId (tripId),
  KEY idx_payments_status (status),
  KEY idx_payments_method (method),
  CONSTRAINT fk_payments_tripId__trips_id FOREIGN KEY (tripId) REFERENCES trips(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- otps
CREATE TABLE IF NOT EXISTS otps (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  phone VARCHAR(32) NOT NULL,
  purpose ENUM('login','register','reset') NOT NULL DEFAULT 'login',
  codeHash VARCHAR(255) NOT NULL,
  expiresAt DATETIME NOT NULL,
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  consumedAt DATETIME NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_otps_phone (phone),
  KEY idx_otps_purpose (purpose),
  KEY idx_otps_expiresAt (expiresAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- notifications
CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  userId BIGINT UNSIGNED NOT NULL,
  title VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  `read` TINYINT(1) NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_notifications_userId (userId),
  KEY idx_notifications_read (`read`),
  CONSTRAINT fk_notifications_userId__users_id FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ratings
CREATE TABLE IF NOT EXISTS ratings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tripId BIGINT UNSIGNED NOT NULL,
  userId BIGINT UNSIGNED NOT NULL,
  driverId BIGINT UNSIGNED NOT NULL,
  rating INT UNSIGNED NOT NULL,
  comment VARCHAR(500) NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_ratings_tripId (tripId),
  KEY idx_ratings_userId (userId),
  KEY idx_ratings_driverId (driverId),
  CONSTRAINT fk_ratings_tripId__trips_id FOREIGN KEY (tripId) REFERENCES trips(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ratings_userId__users_id FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ratings_driverId__drivers_id FOREIGN KEY (driverId) REFERENCES drivers(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- Notes:
-- 1) MySQL prior to 8.0 ignores CHECK constraints; rating bounds (1..5) should be enforced at the app layer.
-- 2) We avoided a circular FK between drivers.vehicleId and vehicles.driverId by omitting the drivers.vehicleId FK.
--    The column exists for app convenience. If you need the FK, you can add it later with an ALTER TABLE after both tables exist.
-- 3) JSON columns (pickup/dropoff) require MySQL 5.7+; recommend MySQL 8.0+.
