# ReservePulse

> **High-Performance Multi-Tier Reservation & Resource Orchestration Platform**  
> Enterprise-grade scheduling, ACID-compliant concurrency, configurable intake forms, resilient payment state machines, and real-time operational analytics.

---

## 🏗️ System Architecture

ReservePulse is built on a clean, decoupled **Frontend / Backend / Database** tiered architecture designed for enterprise scalability, zero downtime, and strict separation of concerns.

```
ReservePulse/
├── frontend/                     # Single-Page Application (React 19 + TypeScript + Vite)
│   └── src/
│       ├── assets/               # Brand assets and styling utilities
│       ├── components/           # Reusable UI components & design system units
│       │   ├── admin/            # Platform administration consoles & user tables
│       │   ├── analytics/        # Interactive SVG KPI charts & distribution bars
│       │   ├── booking/          # Multi-step booking wizard with live sync
│       │   ├── common/           # ErrorBoundary, Skeletons, Modals, Badges, Toasts
│       │   ├── feedback/         # Toast container & notification manager
│       │   ├── layout/           # Header, Navigation, Footer shells
│       │   ├── organiser/        # Schedule planners, intake question builders
│       │   └── payment/          # Payment intent checkout & confirmation dialogs
│       ├── context/              # Toast & global application contexts
│       ├── hooks/                # Custom React hooks (useLiveAvailability, useAnalytics)
│       ├── layouts/              # Route layouts (MainLayout)
│       ├── pages/                # Route views (BookingWizard, Organiser, Admin, Analytics)
│       ├── services/             # Typed API clients & HTTP response unwrappers
│       ├── types/                # Domain types (User, Service, Booking, Payment, Analytics)
│       └── utils/                # Date math, formatters, slot helpers
│
├── backend/                      # High-Concurrency REST API (Node.js + Express + TypeScript)
│   └── src/
│       ├── config/               # Database pool, environment, JWT configuration
│       ├── controllers/          # Route controllers (Auth, Booking, Admin, Analytics, etc.)
│       ├── middleware/           # RBAC, JWT auth, Error middleware, Request logging
│       ├── models/               # Domain interfaces & entity contracts
│       ├── routes/               # API v1 route blueprints
│       ├── scripts/              # Automated audit & concurrency verification suites
│       ├── services/             # Business logic (AvailabilityEngine, BookingService, etc.)
│       ├── utils/                # Standardized ApiResponse envelope & Winston logger
│       ├── validators/           # Zod validation schemas
│       ├── app.ts                # Express application setup & middleware stack
│       └── server.ts             # Process lifecycle & graceful shutdown
│
├── database/                     # Persistence Layer
│   ├── migrations/               # Versioned chronological SQL migrations (001 - 008)
│   └── seed/                     # Deterministic seed datasets & demo accounts
│
├── docs/                         # Engineering Specifications
│   ├── analytics.md              # Analytics aggregation definitions & metrics formulas
│   ├── api.md                    # Complete REST API v1 endpoint specification
│   ├── architecture.md           # System design & Mermaid architectural blueprints
│   ├── availability.md           # Slot availability calculation engine design
│   ├── database.md               # Database schema reference & ER diagrams
│   └── setup.md                  # Comprehensive developer & production setup guide
│
├── .env.example                  # Root environment template
├── package.json                  # Root orchestration scripts
└── README.md                     # Platform documentation
```

---

## 🚀 Key Enterprise Capabilities

### 1. 🛡️ ACID-Compliant Concurrency & Double-Booking Prevention
- **Row-Level Locking**: Employs `SELECT ... FOR UPDATE` on slot capacity records inside transactional blocks (`BEGIN` / `COMMIT`).
- **Atomic Capacity Decrement**: Immediate validation of `remaining_capacity >= requested_attendees` prevents over-allocation.
- **Race Condition Rejection**: When multiple requests contend for the last available slot simultaneously, exactly one succeeds (`201 Created`) while competing bursts receive `409 Conflict` with `SLOT_UNAVAILABLE` details.
- **Graceful Client Recovery**: Frontend listens for `SLOT_UNAVAILABLE` error envelopes and immediately prompts the user with an actionable toast, clearing the stale slot and refetching real-time availability.

### 2. ⚡ Real-Time Slot Availability Engine
- Calculates availability across working hours, multiple split shifts per day, customized buffer periods, minimum advance notice, and maximum scheduling horizons.
- Accounts for existing non-cancelled bookings (`confirmed`, `pending`) and capacity thresholds.
- Polling and WebSocket-ready hooks (`useLiveAvailability`) trigger background refreshes with subtle UI sync indicators.

### 3. 📝 Configurable Intake Questions
- Organisers can define custom per-service questions with flexible field types: `text`, `textarea`, `select`, `checkbox`, `radio`.
- Drag-and-drop or index-based reordering, required/optional toggle, and option list management.
- Backend enforces required answers upon booking submission and immutably archives customer responses alongside the booking ledger.

### 4. 💳 Resilient Payment State Machine & Zero-Data-Leak Gateway
- Provider abstraction interface (`IPaymentProvider`) supports seamless extension (built-in `MockPaymentProvider` ready for Stripe / Adyen / Square).
- Decoupled payment intents, authorization, capture, and failure lifecycle:
  - `pending` $\rightarrow$ `confirmed` (captured)
  - `pending` $\rightarrow$ `payment_failed` (auto-releases slot capacity back to the pool)
  - `confirmed` $\rightarrow$ `cancelled` (releases slot capacity)
- **Zero Cardholder Data Storage**: Strict PCI compliance—no raw PAN, CVV, or magnetic stripe data is ever processed or stored on backend servers.

### 5. 👥 Role-Based Access Control (RBAC) & Governance
- Granular permissions mapped across three tiers:
  - `CUSTOMER`: Public catalog, slot querying, personal reservations, payment confirmation.
  - `ORGANISER`: Service catalog drafting/publishing, fleet resources, weekly operating schedules, booking management.
  - `ADMIN`: Platform-wide oversight, cross-tenant booking inspection, user activation/deactivation, role promotion/demotion.
- Safe admin governance guards: Self-deactivation and self-demotion are blocked with validation errors.

### 6. 📊 Real-Time Operational Analytics
- High-efficiency SQL aggregations for:
  - **Summary Metrics**: Total appointments, confirmed revenue, active providers, platform completion rate.
  - **Booking Trends**: Timeline volume grouped by dynamic time intervals (hourly, daily).
  - **Peak Hours**: 24-hour load distribution heatmaps to detect peak operational hours.
  - **Provider Utilization**: Utilization rate (%) and hours booked per provider.
- Filterable by presets (`today`, `week`, `month`) or arbitrary date ranges.

### 7. 💎 Production UX & Resilience
- **Error Boundaries**: Component-level error boundaries isolate unexpected render crashes without bringing down the entire application.
- **Skeleton Screens**: Content-matching shimmer loaders eliminate layout shift during async data fetches.
- **Optimistic Locking Alerts**: Instant toast alerts when slots are claimed by concurrent users.
- **Dual-Mode Persistence**: Production PostgreSQL with automated in-memory fallback for lightweight testing and development.

---

## 🔑 Demo Accounts & Pre-Seeded Roles

For testing and demonstration, the platform includes three pre-seeded accounts:

| Role | Email | Password | Access Privileges |
| :--- | :--- | :--- | :--- |
| **Customer** | `customer@reservepulse.com` | `Customer@123` | Booking Wizard, Personal Bookings |
| **Organiser** | `organiser@reservepulse.com` | `Organiser@123` | Services, Resources, Schedules, Bookings |
| **Admin** | `admin@reservepulse.com` | `Admin@123` | Admin Portal, User Management, Global Bookings, Analytics |

---

## ⚙️ Environment Variables

### Backend Configuration (`backend/.env`)

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | String | `development` | Runtime environment (`development`, `production`, `test`) |
| `PORT` | Number | `5000` | HTTP port for the Express backend |
| `API_PREFIX` | String | `/api/v1` | Base route prefix for all REST endpoints |
| `CORS_ORIGIN` | String | `http://localhost:5173` | Allowed CORS origins (comma-separated for multiples) |
| `DATABASE_URL` | String | `postgresql://postgres:postgres@localhost:5432/reservepulse_dev` | PostgreSQL connection URI |
| `DB_POOL_MAX` | Number | `20` | Maximum connections in pg pool |
| `DB_IDLE_TIMEOUT_MS` | Number | `30000` | Connection idle timeout in milliseconds |
| `DB_CONNECTION_TIMEOUT_MS` | Number | `5000` | Connection timeout before falling back |
| `LOG_LEVEL` | String | `debug` | Winston log level (`debug`, `info`, `warn`, `error`) |
| `JWT_SECRET` | String | *Min 32 chars* | HMAC SHA-256 signing secret for authentication tokens |
| `JWT_EXPIRES_IN` | String | `7d` | Token validity window |
| `OTP_EXPIRY_MINUTES` | Number | `10` | One-time password expiration time |

### Frontend Configuration (`frontend/.env`)

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `VITE_API_URL` | String | `http://localhost:5000/api/v1` | Backend API endpoint URL |
| `VITE_APP_TITLE` | String | `ReservePulse` | Browser tab title prefix |

---

## ⚡ Quick Start Guide

### 1. Prerequisites
- **Node.js**: `>= 18.0.0` (Recommended: v20 LTS or v22 LTS)
- **npm**: `>= 9.0.0`
- **PostgreSQL**: `>= 14.0` (Optional — system automatically activates in-memory mode if PostgreSQL is unavailable)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/your-org/reservepulse.git
cd ReservePulse

# Install all dependencies across root, backend, and frontend
npm run install:all
```

### 3. Configure Environment
```bash
# Copy backend template
cp backend/.env.example backend/.env

# Copy frontend template
cp frontend/.env.example frontend/.env
```

### 4. Database Setup (Optional)
If using a local or remote PostgreSQL instance:
```bash
# Create database
createdb -U postgres reservepulse_dev

# Run chronological migrations (001 through 008)
psql -U postgres -d reservepulse_dev -f database/migrations/001_initial_schema.sql
psql -U postgres -d reservepulse_dev -f database/migrations/002_reservepulse_schema.sql
psql -U postgres -d reservepulse_dev -f database/migrations/003_auth_credentials.sql
psql -U postgres -d reservepulse_dev -f database/migrations/004_service_management.sql
psql -U postgres -d reservepulse_dev -f database/migrations/005_resource_status_types.sql
psql -U postgres -d reservepulse_dev -f database/migrations/006_booking_concurrency_hardening.sql
psql -U postgres -d reservepulse_dev -f database/migrations/007_payment_ready_flow.sql
psql -U postgres -d reservepulse_dev -f database/migrations/008_admin_user_management.sql

# Seed demo dataset
psql -U postgres -d reservepulse_dev -f database/seed/seed.sql
```

### 5. Launch Development Servers
```bash
npm run dev
```
- **Frontend Application**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **System Health Check**: [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health)

---

## 🧪 Automated Test & Audit Suite

ReservePulse includes an automated end-to-end audit suite covering all 13 core subsystems (66 verification points) plus targeted stress tests:

```bash
# Run the complete 66-point production audit test suite
npm run test:audit

# Run specific functional suites
npm run test:concurrency   # 22 concurrency & double-booking stress checks
npm run test:questions     # Configurable question builder & answer validation
npm run test:payment       # 46 payment state machine & PCI compliance checks
npm run test:organiser     # Service, resource, and schedule management tests
npm run test:admin         # 49 platform governance & RBAC enforcement checks
npm run test:analytics     # Aggregation, peak hours, and utilization tests

# Full typecheck across entire frontend and backend
npm run typecheck
```

---

## 📡 REST API Summary

All endpoints return a standardized JSON envelope:
```json
{
  "success": true,
  "statusCode": 200,
  "data": { ... },
  "meta": { "timestamp": "2026-09-25T12:00:00.000Z" }
}
```

### Core API Route Map

| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Public | System status, uptime, and database connection state |
| `POST` | `/api/v1/auth/register` | Public | Register new customer account |
| `POST` | `/api/v1/auth/login` | Public | Authenticate user & issue JWT token |
| `GET` | `/api/v1/auth/me` | Authenticated | Retrieve authenticated user profile |
| `GET` | `/api/v1/services` | Public | Retrieve active services catalog |
| `GET` | `/api/v1/services/:id/preview` | Token / Public | Preview service (including draft state via share token) |
| `GET` | `/api/v1/services/:id/questions` | Public | Retrieve active customer intake questions |
| `GET` | `/api/v1/services/:id/availability` | Public | Calculate real-time available booking slots |
| `POST` | `/api/v1/bookings` | Public / Customer | Create reservation with ACID concurrency protection |
| `GET` | `/api/v1/bookings/:id` | Authenticated | Retrieve booking details and answers |
| `POST` | `/api/v1/bookings/:id/payment-intent` | Customer | Initialize payment intent |
| `POST` | `/api/v1/bookings/:id/confirm-payment` | Customer | Capture payment & transition booking to `confirmed` |
| `POST` | `/api/v1/bookings/:id/cancel` | Customer / Organiser | Cancel reservation and release slot capacity |
| `GET` | `/api/v1/organiser/services` | Organiser / Admin | List managed services |
| `POST` | `/api/v1/organiser/services` | Organiser / Admin | Create new service draft |
| `PATCH` | `/api/v1/organiser/services/:id/status` | Organiser / Admin | Publish or archive service |
| `GET` | `/api/v1/organiser/resources` | Organiser / Admin | List provider fleet & equipment |
| `PUT` | `/api/v1/organiser/resources/:id/schedule` | Organiser / Admin | Save weekly working hours & shifts |
| `GET` | `/api/v1/admin/stats` | Admin | Platform-wide operational overview |
| `GET` | `/api/v1/admin/users` | Admin | Paginated user management directory |
| `PATCH` | `/api/v1/admin/users/:id/status` | Admin | Activate or deactivate user account |
| `PATCH` | `/api/v1/admin/users/:id/role` | Admin | Promote or demote user role |
| `GET` | `/api/v1/analytics/overview` | Organiser / Admin | Key metrics, trends, peak hours, utilization |

*See [`docs/api.md`](./docs/api.md) for complete payload contracts, validation schemas, and query parameters.*

---

## 🚢 Production Deployment Guide

### Option 1: Docker & Container Orchestration

A multi-stage Docker build produces lightweight production images:

#### Backend `Dockerfile`
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src/ ./src/
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 5000
CMD ["node", "dist/server.js"]
```

#### Frontend `Dockerfile` (Nginx Alpine)
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig*.json vite.config.ts index.html ./
RUN npm ci
COPY src/ ./src/
COPY public/ ./public/
RUN npm run build

FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Option 2: PM2 & Nginx Reverse Proxy (Virtual Machine / Bare Metal)

#### 1. Compile Bundles
```bash
npm run build
```

#### 2. Configure PM2 (`ecosystem.config.js`)
```javascript
module.exports = {
  apps: [
    {
      name: 'reservepulse-api',
      script: './backend/dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ]
};
```
Start PM2 process:
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

#### 3. Configure Nginx Reverse Proxy
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend Single Page App
    location / {
        root /var/www/reservepulse/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API Proxy
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 📄 Documentation Sitemap

- [Developer Setup & Environment Guide](./docs/setup.md)
- [System Architecture & Data Flows](./docs/architecture.md)
- [REST API v1 Reference](./docs/api.md)
- [Availability Engine & Collision Detection](./docs/availability.md)
- [Database Schema & Migration Guide](./docs/database.md)
- [Analytics Formulas & Aggregation Engine](./docs/analytics.md)

---

## 📜 License & Compliance

ReservePulse is built under the MIT License. Designed in compliance with PCI-DSS guidance for hosted payment abstractions and zero-cardholder-data retention.

