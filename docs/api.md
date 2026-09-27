# ReservePulse REST API Specification (v1)

> Comprehensive reference documentation for the ReservePulse reservation, appointment scheduling, and resource orchestration platform.

## Base URL
- **Local Development**: `http://localhost:5000/api/v1`
- **Root Metadata / Discovery**: `http://localhost:5000/`

---

## Standard JSON Response Envelopes

Every API response follows a consistent envelope structure.

### Success Envelope
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "totalPages": 8
  },
  "timestamp": "2026-09-25T15:00:00.000Z"
}
```

### Error Envelope
```json
{
  "success": false,
  "message": "Human-readable error explanation",
  "error": {
    "code": "SLOT_UNAVAILABLE",
    "details": {
      "slotUnavailable": true,
      "serviceId": "srv_suite_002",
      "resourceId": "res_pod_private_1",
      "remainingCapacity": 0
    }
  },
  "timestamp": "2026-09-25T15:00:00.000Z"
}
```

---

## Standard HTTP Status Codes

| HTTP Status | Error Code | Description |
| :--- | :--- | :--- |
| `200 OK` | — | Successful query, update, or deletion |
| `201 Created` | — | Resource, reservation, or payment intent created |
| `400 Bad Request` | `BAD_REQUEST` | Missing parameters, invalid logic, or missing required intake answers |
| `401 Unauthorized` | `UNAUTHORIZED` | Token missing, expired, or invalid credentials |
| `403 Forbidden` | `FORBIDDEN` | Insufficient role privileges or resource ownership violation |
| `404 Not Found` | `NOT_FOUND` | Requested entity does not exist or unpublished draft |
| `409 Conflict` | `SLOT_UNAVAILABLE` / `CONFLICT` | Concurrent booking collision or capacity overrun |
| `422 Unprocessable` | `VALIDATION_ERROR` | Schema validation error (e.g. inverted dates, negative values) |
| `500 Server Error` | `INTERNAL_SERVER_ERROR` | Unhandled exception or unexpected database failure |

---

## 1. Gateway & Health Probes

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Public | Service identity and top-level endpoint directory |
| `GET` | `/api/v1/health` | Public | Comprehensive health telemetry (uptime, database status, memory) |
| `GET` | `/api/v1/health/ping` | Public | Lightweight liveness probe for orchestrators and load balancers |
| `GET` | `/api/v1/health/database` | Public | Deep database connectivity and query latency check |

---

## 2. Authentication & Identity

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/signup` | Public | Register new user account (`CUSTOMER` or `ORGANISER`) |
| `POST` | `/api/v1/auth/login` | Public | Authenticate credentials and receive signed JWT |
| `POST` | `/api/v1/auth/verify-otp` | Public | Verify one-time email confirmation code |
| `POST` | `/api/v1/auth/resend-otp` | Public | Regenerate and resend active verification code |
| `POST` | `/api/v1/auth/forgot-password` | Public | Request password reset token |
| `POST` | `/api/v1/auth/reset-password` | Public | Submit new password with reset token |
| `GET` | `/api/v1/auth/me` | Bearer Token | Retrieve currently authenticated user profile |

---

## 3. Public Service Catalog & Availability

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/services` | Public | List active, published services with optional search and category filters |
| `GET` | `/api/v1/services/:id` | Public | Get published service details, pricing, duration, and capacity rules |
| `GET` | `/api/v1/services/preview/:shareToken` | Public | Preview unpublished draft service via cryptographically secret link |
| `GET` | `/api/v1/services/:id/availability` | Public | Real-time calculated slots (`startDate`, `endDate`, `resourceId`, `attendees`) |
| `GET` | `/api/v1/services/:id/questions` | Public | Active intake questions configured for customer checkout |
| `GET` | `/api/v1/services/:id/resources` | Public | Fleet resources assigned to fulfill this service |

---

## 4. Bookings & Reservation Engine

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/bookings` | Customer / Admin | Submit new reservation with answers and concurrency validation |
| `GET` | `/api/v1/bookings/:idOrRef` | Authenticated | Retrieve booking summary, schedule, provider, and payment status |
| `POST` | `/api/v1/bookings/:id/payment-intent` | Customer / Admin | Initialize payment intent token for advance paid service |
| `POST` | `/api/v1/bookings/:id/confirm-payment` | Customer / Admin | Capture payment and transition booking state to `confirmed` |
| `GET` | `/api/v1/bookings/:id/payment` | Authenticated | Audit history of payment transactions (PCI sanitized) |
| `PATCH` | `/api/v1/bookings/:idOrRef/cancel` | Customer / Admin | Cancel booking and immediately release reserved slot capacity |

---

## 5. Organiser Service & Resource Management

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/organiser/services` | Organiser / Admin | List all services owned by authenticated organiser (including drafts) |
| `POST` | `/api/v1/organiser/services` | Organiser / Admin | Create new service with duration, buffers, pricing, and capacity mode |
| `PUT` | `/api/v1/organiser/services/:id` | Organiser / Admin | Update service specifications and configuration |
| `PATCH` | `/api/v1/organiser/services/:id/publish` | Organiser / Admin | Make service public and bookable |
| `PATCH` | `/api/v1/organiser/services/:id/unpublish`| Organiser / Admin | Move service back to draft state |
| `POST` | `/api/v1/organiser/services/:id/regenerate-share-link` | Organiser / Admin | Generate new preview share token |
| `DELETE` | `/api/v1/organiser/services/:id` | Organiser / Admin | Soft-delete service |
| `GET` | `/api/v1/organiser/resources` | Organiser / Admin | List fleet resources (rooms, staff, pods, equipment, compute) |
| `POST` | `/api/v1/organiser/resources` | Organiser / Admin | Create resource with type, location, and max capacity |
| `PUT` | `/api/v1/organiser/resources/:id` | Organiser / Admin | Update resource specifications |
| `PATCH` | `/api/v1/organiser/resources/:id/activate` | Organiser / Admin | Mark resource operational |
| `PATCH` | `/api/v1/organiser/resources/:id/deactivate` | Organiser / Admin | Mark resource under maintenance / off |
| `POST` | `/api/v1/organiser/resources/:id/services` | Organiser / Admin | Link resource to fulfill a bookable service |
| `DELETE` | `/api/v1/organiser/resources/:id/services/:serviceId` | Organiser / Admin | Unlink resource from service |

---

## 6. Scheduling & Working Hours

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/organiser/resources/:id/schedule` | Organiser / Admin | Retrieve 7-day recurring working hour intervals |
| `PUT` | `/api/v1/organiser/resources/:id/schedule` | Organiser / Admin | Configure weekly schedule, split shifts, and days off |
| `GET` | `/api/v1/schedules/resources/:resourceId/availability` | Public | Normalized operational timeline across requested date range |

---

## 7. Configurable Intake Questions

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/services/:id/questions` | Public | Active intake questions ordered by index |
| `POST` | `/api/v1/organiser/services/:id/questions` | Organiser / Admin | Create question (`text`, `textarea`, `select`) with options |
| `PUT` | `/api/v1/organiser/services/:id/questions/:questionId` | Organiser / Admin | Update prompt, options, required flag, or sort order |
| `DELETE` | `/api/v1/organiser/services/:id/questions/:questionId` | Organiser / Admin | Delete intake question |
| `PUT` | `/api/v1/organiser/services/:id/questions/reorder` | Organiser / Admin | Batch reorder intake question list |

---

## 8. Organiser & Customer Ledgers

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/customer/bookings` | Customer / Admin | List upcoming and past appointments for logged-in customer |
| `GET` | `/api/v1/customer/profile` | Customer / Admin | View customer profile and booking summary |
| `GET` | `/api/v1/organiser/bookings` | Organiser / Admin | Search, filter, and paginate bookings across owned services |
| `PATCH` | `/api/v1/organiser/bookings/:id/confirm` | Organiser / Admin | Manually confirm a pending reservation |
| `PATCH` | `/api/v1/organiser/bookings/:id/cancel` | Organiser / Admin | Cancel reservation and release slot capacity |

---

## 9. Platform Governance (Admin Only)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/stats` | Admin Only | Real-time platform KPI counts (users, providers, appointments) |
| `GET` | `/api/v1/admin/users` | Admin Only | Searchable, paginated user registry with status & role filtering |
| `POST` | `/api/v1/admin/users` | Admin Only | Provision user or provider directly with pre-activated status |
| `GET` | `/api/v1/admin/users/:userId` | Admin Only | Deep user inspection including catalog, resources, and bookings |
| `PATCH` | `/api/v1/admin/users/:userId/status` | Admin Only | Activate or deactivate account (prevents self-deactivation) |
| `PATCH` | `/api/v1/admin/users/:userId/role` | Admin Only | Update role between `CUSTOMER`, `ORGANISER`, and `ADMIN` |
| `GET` | `/api/v1/admin/bookings` | Admin Only | Platform-wide reservation ledger across all organisers |
| `PATCH` | `/api/v1/admin/bookings/:id/confirm` | Admin Only | Administrative override confirmation |
| `PATCH` | `/api/v1/admin/bookings/:id/cancel` | Admin Only | Administrative override cancellation |

---

## 10. Operational Telemetry & Analytics

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/analytics/overview` | Organiser / Admin | Comprehensive dashboard payload: summary, trends, peak hours, utilization |
| `GET` | `/api/v1/analytics/appointments` | Organiser / Admin | Appointment status counts and breakdown percentages |
| `GET` | `/api/v1/analytics/peak-hours` | Organiser / Admin | 24-hour demand curve, identified peak hour, and busiest window |
| `GET` | `/api/v1/analytics/utilization` | Organiser / Admin | Provider capacity utilization rates, active hours, and fleet average |
| `GET` | `/api/v1/organiser/analytics` | Organiser / Admin | Alias route for overview analytics scoped to organiser workspace |

### Supported Analytics Query Parameters:
- `timeFilter`: `today` (24 hourly buckets), `week` (7 daily buckets, default), `month` (30 daily buckets), `custom`
- `startDate`: `YYYY-MM-DD` (Required when `timeFilter=custom`)
- `endDate`: `YYYY-MM-DD` (Required when `timeFilter=custom`)
- `serviceId`: Optional filter by specific service
- `resourceId`: Optional filter by specific resource
- `organiserId`: Optional platform-level filter (Admin only)
