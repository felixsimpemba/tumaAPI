-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               11.7.2-MariaDB - mariadb.org binary distribution
-- Server OS:                    Win64
-- HeidiSQL Version:             12.10.0.7000
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Dumping database structure for tumaapi
CREATE DATABASE IF NOT EXISTS `tumaapi` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci */;
USE `tumaapi`;

-- Dumping structure for table tumaapi.drivers
CREATE TABLE IF NOT EXISTS `drivers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `userId` bigint(20) unsigned NOT NULL,
  `vehicleId` bigint(20) unsigned DEFAULT NULL,
  `licenseDocUrl` varchar(512) DEFAULT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `online` tinyint(1) NOT NULL DEFAULT 0,
  `lat` decimal(10,7) DEFAULT NULL,
  `lng` decimal(10,7) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_drivers_userId` (`userId`),
  KEY `idx_drivers_status_online` (`status`,`online`),
  CONSTRAINT `fk_drivers_userId__users_id` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table tumaapi.driver_heartbeats
CREATE TABLE IF NOT EXISTS `driver_heartbeats` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `driverId` bigint(20) unsigned NOT NULL,
  `lat` decimal(10,7) DEFAULT NULL,
  `lng` decimal(10,7) DEFAULT NULL,
  `status` enum('available','busy','offline') NOT NULL DEFAULT 'offline',
  `socketId` varchar(100) DEFAULT NULL,
  `lastSeenAt` datetime NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_dhb_driver` (`driverId`),
  KEY `idx_dhb_status` (`status`),
  KEY `idx_dhb_lastSeen` (`lastSeenAt`),
  CONSTRAINT `fk_dhb_driver` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table tumaapi.notifications
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `userId` bigint(20) unsigned NOT NULL,
  `title` varchar(160) NOT NULL,
  `message` text NOT NULL,
  `read` tinyint(1) NOT NULL DEFAULT 0,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_userId` (`userId`),
  KEY `idx_notifications_read` (`read`),
  CONSTRAINT `fk_notifications_userId__users_id` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table tumaapi.otps
CREATE TABLE IF NOT EXISTS `otps` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `phone` varchar(32) NOT NULL,
  `purpose` enum('login','register','reset') NOT NULL DEFAULT 'login',
  `codeHash` varchar(255) NOT NULL,
  `expiresAt` datetime NOT NULL,
  `attempts` int(10) unsigned NOT NULL DEFAULT 0,
  `consumedAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_otps_phone` (`phone`),
  KEY `idx_otps_purpose` (`purpose`),
  KEY `idx_otps_expiresAt` (`expiresAt`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table tumaapi.payments
CREATE TABLE IF NOT EXISTS `payments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tripId` bigint(20) unsigned NOT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `method` enum('mtn_momo','airtel_money','cash','card','other') NOT NULL DEFAULT 'cash',
  `status` enum('pending','success','failed') NOT NULL DEFAULT 'pending',
  `providerRef` varchar(128) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_payments_tripId` (`tripId`),
  KEY `idx_payments_status` (`status`),
  KEY `idx_payments_method` (`method`),
  CONSTRAINT `fk_payments_tripId__trips_id` FOREIGN KEY (`tripId`) REFERENCES `trips` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table tumaapi.ratings
CREATE TABLE IF NOT EXISTS `ratings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tripId` bigint(20) unsigned NOT NULL,
  `userId` bigint(20) unsigned NOT NULL,
  `driverId` bigint(20) unsigned NOT NULL,
  `rating` int(10) unsigned NOT NULL,
  `comment` varchar(500) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ratings_tripId` (`tripId`),
  KEY `idx_ratings_userId` (`userId`),
  KEY `idx_ratings_driverId` (`driverId`),
  CONSTRAINT `fk_ratings_driverId__drivers_id` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ratings_tripId__trips_id` FOREIGN KEY (`tripId`) REFERENCES `trips` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ratings_userId__users_id` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table tumaapi.ride_requests
CREATE TABLE IF NOT EXISTS `ride_requests` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `riderId` bigint(20) unsigned NOT NULL,
  `pickup` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`pickup`)),
  `dropoff` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`dropoff`)),
  `distance` decimal(10,2) DEFAULT NULL,
  `estimatedFare` decimal(12,2) DEFAULT NULL,
  `status` enum('searching','accepted','cancelled','failed') NOT NULL DEFAULT 'searching',
  `acceptedDriverId` bigint(20) unsigned DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_rr_rider` (`riderId`),
  KEY `idx_rr_status` (`status`),
  KEY `idx_rr_accepted` (`acceptedDriverId`),
  CONSTRAINT `fk_rr_driver` FOREIGN KEY (`acceptedDriverId`) REFERENCES `drivers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_rr_rider` FOREIGN KEY (`riderId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table tumaapi.ride_request_attempts
CREATE TABLE IF NOT EXISTS `ride_request_attempts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `rideRequestId` bigint(20) unsigned NOT NULL,
  `driverId` bigint(20) unsigned NOT NULL,
  `outcome` enum('sent','accepted','declined','timeout','offline') NOT NULL DEFAULT 'sent',
  `respondedAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_rra_rr` (`rideRequestId`),
  KEY `idx_rra_driver` (`driverId`),
  KEY `idx_rra_outcome` (`outcome`),
  CONSTRAINT `fk_rra_driver` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rra_rr` FOREIGN KEY (`rideRequestId`) REFERENCES `ride_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table tumaapi.trips
CREATE TABLE IF NOT EXISTS `trips` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `userId` bigint(20) unsigned NOT NULL,
  `driverId` bigint(20) unsigned DEFAULT NULL,
  `pickup` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`pickup`)),
  `dropoff` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`dropoff`)),
  `distance` decimal(10,2) DEFAULT NULL,
  `fare` decimal(12,2) DEFAULT NULL,
  `status` enum('requested','accepted','in-progress','completed','cancelled') NOT NULL DEFAULT 'requested',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_trips_userId` (`userId`),
  KEY `idx_trips_driverId` (`driverId`),
  KEY `idx_trips_status` (`status`),
  CONSTRAINT `fk_trips_driverId__drivers_id` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_trips_userId__users_id` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table tumaapi.trip_locations
CREATE TABLE IF NOT EXISTS `trip_locations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tripId` bigint(20) unsigned NOT NULL,
  `actor` enum('driver','rider') NOT NULL DEFAULT 'driver',
  `lat` decimal(10,7) NOT NULL,
  `lng` decimal(10,7) NOT NULL,
  `speedKph` decimal(6,2) DEFAULT NULL,
  `heading` smallint(6) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_tl_trip` (`tripId`),
  KEY `idx_tl_created` (`createdAt`),
  CONSTRAINT `fk_tl_trip` FOREIGN KEY (`tripId`) REFERENCES `trips` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table tumaapi.users
CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) DEFAULT NULL,
  `phone` varchar(32) NOT NULL,
  `email` varchar(160) DEFAULT NULL,
  `role` enum('user','driver','admin') NOT NULL DEFAULT 'user',
  `phoneVerifiedAt` datetime DEFAULT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_phone` (`phone`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_role` (`role`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table tumaapi.vehicles
CREATE TABLE IF NOT EXISTS `vehicles` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `driverId` bigint(20) unsigned NOT NULL,
  `type` enum('car','bike','van','other') NOT NULL DEFAULT 'car',
  `plateNumber` varchar(32) NOT NULL,
  `color` varchar(32) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vehicles_plateNumber` (`plateNumber`),
  KEY `idx_vehicles_driverId` (`driverId`),
  CONSTRAINT `fk_vehicles_driverId__drivers_id` FOREIGN KEY (`driverId`) REFERENCES `drivers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
