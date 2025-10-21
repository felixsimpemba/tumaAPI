# Backend Development Plan

## 1. Overview
Build a modular Node.js + Express backend powering ride-hailing and parcel delivery with MySQL, Socket.IO for realtime, and FCM for notifications. Authentication is implemented in-house using OTP (SMS) with JWT sessions. The system supports users, drivers, trips/deliveries, payments, notifications, and admin/analytics operations.

Tech stack:
- Runtime: Node.js LTS, Express
- DB: MySQL 
- Auth:  JWT for API sessions
- Realtime: Socket.IO
- Notifications: Firebase Cloud Messaging (FCM) later
- Payments: MTN MoMo, Airtel Money (optionally Stripe sandbox)
- Maps/Distance: Google Maps Distance Matrix API


---

## 2. Repository Structure
```
backend/
 ├── src/
 │   ├── config/         
 │   ├── controllers/   
 │   ├── models/          
 │   ├── routes/        
 │   ├── middlewares/    
 │   ├── services/      
 │   ├── sockets/        
 │   ├── utils/         
 │   └── index.ts         
 ├── tests/             
 ├── package.json
 └── server.ts            
```
Note: This repo currently has an Express scaffold. We will evolve it incrementally to match the above structure with minimal disruption.

---

## 3. Domain Modules and Endpoints

(A) Auth Service
- POST /auth/request-otp
- POST /auth/verify-otp
- POST /auth/register
- POST /auth/login
- POST /auth/logout
Implementation notes:
- First-party OTP: generate 6-digit code; store hashed with expiry and attempt counter; throttle per phone/IP.
- Register/login via phone after OTP verification; issue short‑lived JWT access + refresh tokens.
- Secure refresh rotation, revoke on logout; prevent OTP reuse; codes expire in 2–5 minutes.

(B) User Service
- GET /users/me
- PUT /users/update
- GET /users/trips
- DELETE /users/account
Notes: store preferences; soft delete; audit.

(C) Driver Service
- POST /drivers/register
- PUT /drivers/update-status
- GET /drivers/:id
- GET /drivers/nearby
Notes: document uploads to Firebase Storage/S3, verification workflow (pending/approved/rejected), online/offline.

(D) Trip/Delivery Service
- POST /trips/book
- GET /trips/:id
- PUT /trips/update-status
- GET /trips/history
Notes: fare estimation with Google Distance Matrix; assign nearest available driver; state machine: requested → accepted → in-progress → completed → rated.

(E) Real-Time (Socket.IO)
Events:
- driverLocationUpdate
- rideRequest
- rideAccepted
- tripStatusChanged
Notes: namespaces/rooms by tripId/userId; authentication via JWT; store ephemeral presence.

(F) Payment Service
- POST /payments/initiate
- POST /payments/verify
- GET /payments/:tripId
Notes: Integrate MTN MoMo, Airtel Money; webhook verification; idempotency keys; secure secrets.

(G) Notification Service
- Push via FCM; persist notification records; in‑app unread counts.

(H) Admin Service
- GET /admin/drivers
- GET /admin/users
- GET /admin/trips
- POST /admin/approve-driver
- GET /admin/analytics
Notes: RBAC with admin role; pagination, filters.

(I) Analytics Service
- KPIs: trips/day, earnings, top drivers, active regions.
- Precompute aggregates via cron/queue or DB views.

---

## 4. Database Design (Initial)
Tables (simplified):
- users: id, name, phone, email, role, phoneVerifiedAt, createdAt, updatedAt
- drivers: id, userId, vehicleId, licenseDocUrl, status, online, lat, lng
- vehicles: id, driverId, type, plateNumber, color
- trips: id, userId, driverId, pickup, dropoff, distance, fare, status, createdAt
- payments: id, tripId, amount, method, status, providerRef
- otps: id, phone, purpose, codeHash, expiresAt, attempts, consumedAt, createdAt
- notifications: id, userId, title, message, read, createdAt
- ratings: id, tripId, userId, driverId, rating, comment
Indexes: users(phone), drivers(status, online, geospatial), trips(userId, driverId, status).
If using PostGIS, store driver locations as geography(Point, 4326) for proximity searches.

---

## 5. External Integrations
- SMS/OTP provider (e.g., Twilio, Termii, Africa's Talking): OTP delivery
- FCM: push notifications
- Google Maps API: distance, ETA, geocoding
- Storage: Firebase Storage/AWS S3 for driver documents
- Payments: MTN MoMo, Airtel Money, optional Stripe

---

## 6. Security, Compliance, and Reliability
- Enforce HTTPS; HSTS in production
- JWT on all protected routes; role-based access (user, driver, admin)
- Input validation with Zod/Joi; centralized error handler
- Rate limiting + CORS + Helmet
- Secrets via environment variables; never commit keys
- Audit logs for sensitive actions
- Idempotency for payments and booking
- Minimal PII; data retention policy; GDPR-friendly deletion

---

## 7. Development Phases & Milestones

Phase 1: Core API (2–3 weeks)
- Project scaffolding, configs, env handling
- Auth (OTP + JWT), Users, Drivers, Trips (without realtime)
- DB schema and migrations; basic tests
Output: Basic API for app testing

Phase 2: Realtime & Notifications (1–2 weeks)
- Socket.IO setup (auth, rooms, events)
- Live location updates and trip matching
- FCM push for key events
Output: Live updates & tracking

Phase 3: Payments (1–2 weeks)
- Integrate MTN MoMo and Airtel Money
- Initiate/verify flows; webhooks; receipts
Output: Functional payments

Phase 4: Admin & Analytics (1–2 weeks)
- Admin endpoints, RBAC, list views, approvals
- Analytics aggregation and endpoints
Output: Admin dashboard ready

Phase 5: Optimization & Ops (ongoing)
- Caching, rate limiting, logs, tracing
- Load/perf testing, query tuning, indexes
Output: Stable production version

---

## 8. API Design Conventions
- RESTful routes; JSON responses { success, data, error }
- Pagination: limit, offset (or cursor)
- Filtering/sorting with explicit query params
- Consistent error codes and messages
- Versioning: prefix with /v1

---

## 9. Environment Variables (example)
- PORT, NODE_ENV
- DATABASE_URL (PostgreSQL)
- SMS_PROVIDER, SMS_API_KEY, OTP_CODE_TTL, OTP_MAX_ATTEMPTS, OTP_RATE_LIMIT_WINDOW
- FCM_SERVER_KEY
- JWT_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES_IN
- GOOGLE_MAPS_API_KEY
- STORAGE_PROVIDER, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET
- MTN_MOMO_* and AIRTEL_MONEY_* keys
- BASE_URL, WEBHOOK_SECRET

Store local secrets in .env (not committed) and production secrets in provider vault.

---

## 10. Implementation Plan (Step-by-Step)
1) Initialize configs and env handling
- Add config loader (dotenv + schema validation)
- Set up logger, error middleware, and rate limiter

2) Database layer
- Choose Prisma; define schema; run initial migration
- Seed minimal data for dev

3) Auth module
- OTP service: generate/hash codes, store with expiry & attempts; implement rate limiting; integrate SMS sender
- Endpoints: /auth/request-otp, /auth/verify-otp, /auth/register, /auth/login, /auth/logout; JWT issuance and refresh rotation

4) Users & Drivers modules
- CRUD and profile endpoints; validation
- Driver verification workflow; nearby search (basic Haversine or PostGIS)

5) Trips module
- Booking flow with distance/fare calculation via Google Maps
- Status transitions; history queries; tests

6) Realtime (Socket.IO)
- Namespaces, room strategy; JWT auth
- Events: driverLocationUpdate, rideRequest, rideAccepted, tripStatusChanged

7) Notifications
- FCM service; store notifications
- Subscriptions via device tokens per user

8) Payments
- Initiate/verify endpoints; providers abstraction
- Webhook handlers; idempotency; reconciliation job

9) Admin & Analytics
- RBAC for admin
- Aggregation queries and endpoints

10) CI/CD & Ops
- Lint/test in CI; coverage thresholds
- Containerize (optional); deploy to Render/Railway/AWS ECS
- Observability: logs, health check, metrics endpoint

---

## 11. Testing Strategy
- Unit tests for services (mocks for external APIs)
- Integration tests with Supertest (spin up test DB)
- Contract tests for webhooks
- Load testing (k6/Artillery) for critical flows
- E2E happy paths in staging

---

## 12. Risks and Mitigations
- Payment provider variability → abstract provider, sandbox first
- Realtime scaling → rooms sharding; sticky sessions or Socket.IO adapter (Redis)
- Geospatial accuracy → use PostGIS; fallback to Haversine
- Data consistency → transactions, idempotency keys
- Security → enforce RBAC, validate inputs, least-privilege keys

---

## 13. Acceptance Criteria (Phase 1)
- Auth: Request-OTP/Verify-OTP/Register/Login/Logout works with OTP + JWT
- Users: get/update/me, trips list
- Drivers: register/update-status, nearby
- Trips: book, get by id, update-status, history
- Tests: ≥70% coverage for core services; CI green
- API documented (OpenAPI basic)

---

## 14. Documentation
- Maintain OpenAPI spec (/docs) and update per release
- README quickstart: env, migrations, run, test
- Architecture and sequence diagrams (optional)

---

## 15. Next Steps in This Repo
- Confirm directory alignment and gradually refactor toward the structure above
- Add .env.example with required keys
- Implement Phase 1 endpoints with placeholder integrations and mocks where needed
