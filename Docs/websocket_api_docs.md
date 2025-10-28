# 🚖 Ride & Delivery WebSocket API Documentation

This document outlines the **WebSocket-based real-time communication flow** for the Ride & Delivery Booking System.

---

## 🧩 Overview

The WebSocket server manages live communication between:
- **Riders (Customers)** — who request rides or deliveries
- **Drivers** — who receive, accept, and complete requests
- **Server** — which coordinates and broadcasts messages between clients

### Message Format

Each message uses the following JSON format:

```json
{
  "event": "event_name",
  "data": { ... }
}
```

---

## 🧍‍♂️ Rider (Customer) Events

### 1. Connect

Establish a WebSocket session.

**Send:**
```json
{
  "event": "connect",
  "data": {
    "userId": "usr_12345",
    "role": "customer"
  }
}
```

**Receive:**
```json
{
  "event": "connected",
  "data": {
    "message": "Connection established",
    "socketId": "ws_8732"
  }
}
```

---

### 2. Request a Ride Fare

**Send:**
```json
{
  "event": "ride_fare",
  "data": {
    "pickup": {
      "lat": -15.4167,
      "lng": 28.2833,
      "address": "Kabwe Mall"
    },
    "destination": {
      "lat": -15.4333,
      "lng": 28.3000,
      "address": "Kabwe General Hospital"
    }
  }
}
```

**Receive:**

```json
{
  "event": "ride_fare",
  "data": {
    "Economy": {
      "Amount": 45,
      "Distance": "7",
      "EstTime" : "23.484745646"
    },
    "Classic": {
      "Amount": 65,
      "Distance": "7",
      "EstTime" : "19.484745646"
    }
  }
}
```

---


### 3. Request a Ride or Delivery

**Send:**
```json
{
  "event": "ride_request",
  "data": {
    "requestId": "req_9876",
    "pickup": {
      "lat": -15.4167,
      "lng": 28.2833,
      "address": "Kabwe Mall"
    },
    "destination": {
      "lat": -15.4333,
      "lng": 28.3000,
      "address": "Kabwe General Hospital"
    },
    "userId": "usr_12345",
    "type": "ride"
  }
}
```

**Receive:**
```json
{
  "event": "ride_searching",
  "data": {
    "requestId": "req_9876",
    "status": "searching_drivers"
  }
}
```

---


### 4. Receive Ride Assignment

**Receive:**
```json
{
  "event": "ride_assigned",
  "data": {
    "driver": {
      "id": "drv_7722",
      "name": "John Mwape",
      "vehicle": "Toyota Corolla",
      "plate": "ALB 1234"
    },
    "user": {
      "id": "usr_12345"
    },
    "requestId": "req_9876",
    "status": "driver_assigned"
  }
}
```

---

### 5. Receive Ride Status Updates

**Receive:**
```json
{
  "event": "ride_status_update",
  "data": {
    "requestId": "req_9876",
    "status": "arrived_at_pickup",
    "message": "Driver has arrived at your pickup location"
  }
}
```

**Possible statuses:**
- `accepted`
- `arrived_at_pickup`
- `ride_started`
- `completed`

---

### 6. Request Driver's Live Location

**Send:**
```json
{
  "event": "get_driver_location",
  "data": {
    "driverId": "drv_7722",
    "requestId": "req_9876"
  }
}
```

**Receive:**
```json
{
  "event": "driver_location",
  "data": {
    "driverId": "drv_7722",
    "coords": {
      "lat": -15.4199,
      "lng": 28.2897
    },
    "timestamp": "2025-10-28T15:32:00Z"
  }
}
```

---

### 7. Ride Completed Summary

**Receive:**
```json
{
  "event": "ride_summary",
  "data": {
    "requestId": "req_9876",
    "status": "completed",
    "fare": 40.0,
    "duration": "12 min"
  }
}
```

---

## 🚘 Driver Events

### 1. Connect

**Send:**
```json
{
  "event": "connect",
  "data": {
    "userId": "drv_7722",
    "role": "driver"
  }
}
```

**Receive:**
```json
{
  "event": "connected",
  "data": {
    "message": "Connection established",
    "socketId": "ws_8821"
  }
}
```

---

### 2. Receive New Ride Request

**Receive:**
```json
{
  "event": "new_ride_request",
  "data": {
    "requestId": "req_9876",
    "user": {
      "name": "Felix Simpemba",
      "rating": 4.9
    },
    "pickup": {
      "lat": -15.4167,
      "lng": 28.2833
    },
    "destination": {
      "lat": -15.4333,
      "lng": 28.3000
    },
    "distance": "2.5 km",
    "fare": 40.0,
    "expiresIn": 15
  }
}
```

---

### 3. Accept Ride Request

**Send:**
```json
{
  "event": "ride_accept",
  "data": {
    "driverId": "drv_7722",
    "requestId": "req_9876"
  }
}
```

**Receive (confirmation):**
```json
{
  "event": "ride_assigned",
  "data": {
    "driverId": "drv_7722",
    "requestId": "req_9876",
    "status": "driver_assigned"
  }
}
```

---

### 4. Update Ride Status

#### Accepted
```json
{
  "event": "update_ride_status",
  "data": {
    "requestId": "req_9876",
    "driverId": "drv_7722",
    "status": "accepted",
    "timestamp": "2025-10-28T15:35:00Z"
  }
}
```

#### Arrived at Pickup
```json
{
  "event": "update_ride_status",
  "data": {
    "requestId": "req_9876",
    "driverId": "drv_7722",
    "status": "arrived_at_pickup",
    "timestamp": "2025-10-28T15:40:00Z"
  }
}
```

#### Ride Started
```json
{
  "event": "update_ride_status",
  "data": {
    "requestId": "req_9876",
    "driverId": "drv_7722",
    "status": "ride_started",
    "timestamp": "2025-10-28T15:42:00Z"
  }
}
```

#### Completed
```json
{
  "event": "update_ride_status",
  "data": {
    "requestId": "req_9876",
    "driverId": "drv_7722",
    "status": "completed",
    "fare": 40.0,
    "timestamp": "2025-10-28T15:55:00Z"
  }
}
```

---

### 5. Send Live Location Updates

**Send (periodically):**
```json
{
  "event": "driver_location_update",
  "data": {
    "driverId": "drv_7722",
    "coords": {
      "lat": -15.4200,
      "lng": 28.2900
    },
    "heading": 180
  }
}
```

**Server broadcasts to rider:**
```json
{
  "event": "driver_location",
  "data": {
    "driverId": "drv_7722",
    "coords": {
      "lat": -15.4200,
      "lng": 28.2900
    }
  }
}
```

---

## 🗂 Event Summary

| Event                    | From | To | Description                     |
|--------------------------|------|-----|---------------------------------|
| `connect`                | All | Server | Establishes socket connection   |
| `ride_fare`              | Rider | Server | Requests amount for the ride    |
| `ride_request`           | Rider | Server | Send new ride request           |
| `new_ride_request`       | Server | Driver | Notify driver of a new request  |
| `ride_accept`            | Driver | Server | Accept ride request             |
| `ride_assigned`          | Server | Rider + Driver | Confirm ride assignment         |
| `update_ride_status`     | Driver | Server | Change ride stage               |
| `ride_status_update`     | Server | Rider + Driver | Notify clients about ride stage |
| `driver_location_update` | Driver | Server | Send live location              |
| `get_driver_location`    | Rider | Server | Request driver's location       |
| `driver_location`        | Server | Rider | Send driver's coordinates       |
| `ride_summary`           | Server | Rider + Driver | Trip completion summary         |

---

## ✅ Status Codes

| Status | Description |
|--------|-------------|
| `accepted` | Driver accepted the ride |
| `arrived_at_pickup` | Driver reached pickup location |
| `ride_started` | Ride or delivery started |
| `completed` | Ride or delivery finished |

---

## 📝 Notes

- All timestamps follow ISO 8601 format (`YYYY-MM-DDTHH:mm:ssZ`)
- Location coordinates use decimal degrees format
- Driver location updates should be sent every 3-5 seconds during active rides
- Ride requests expire after 15 seconds if not accepted
- All monetary values are in the local currency (ZMW)