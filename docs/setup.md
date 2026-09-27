# ReservePulse Developer & Production Setup Guide

This guide provides complete instructions for installing, configuring, running, and deploying ReservePulse in both local development and production environments.

---

## 📋 System Prerequisites

| Dependency | Minimum Version | Recommended | Notes |
| :--- | :--- | :--- | :--- |
| **Node.js** | `>= 18.0.0` | `v20 LTS` or `v22 LTS` | Evaluated with modern ES modules |
| **npm** | `>= 9.0.0` | `v10+` / `v11+` | Package manager |
| **PostgreSQL** | `>= 14.0` | `v15+` / `v16+` | Optional for dev (in-memory fallback active) |
| **Git** | `>= 2.30.0` | Latest | Version control |

---

## 🚀 Quick Start (Local Development)

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/reservepulse.git
cd ReservePulse
```

### 2. Install Dependencies
ReservePulse uses independent dependency trees for root tooling, the Express backend, and the Vite frontend:
```bash
npm run install:all
```
*Alternatively, run `npm install` inside root, `backend/`, and `frontend/`.*

### 3. Environment Configuration

Copy the template files into active `.env` files:

```bash
# Backend configuration
cp backend/.env.example backend/.env

# Frontend configuration
cp frontend/.env.example frontend/.env
```

#### Backend Environment Variables (`backend/.env`)

```ini
# Application Mode & Port
NODE_ENV=development
PORT=5000
API_PREFIX=/api/v1
CORS_ORIGIN=http://localhost:5173

# Database Connection Pool
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/reservepulse_dev
DB_POOL_MAX=20
DB_IDLE_TIMEOUT_MS=30000
DB_CONNECTION_TIMEOUT_MS=5000

# Logging
LOG_LEVEL=debug

# Security & Authentication
JWT_SECRET=production_strong_secret_key_at_least_32_characters_long
JWT_EXPIRES_IN=7d
OTP_EXPIRY_MINUTES=10
```

#### Frontend Environment Variables (`frontend/.env`)

```ini
VITE_API_URL=http://localhost:5000/api/v1
VITE_APP_TITLE=ReservePulse
```

---

## 🗄️ Database Setup & Migrations

ReservePulse includes a dual-mode persistence architecture:
1. **PostgreSQL Mode**: When `DATABASE_URL` connects successfully, full ACID transactional row locks (`SELECT FOR UPDATE`) and PostgreSQL tables are utilized.
2. **In-Memory Fallback Mode**: If PostgreSQL is unreachable or unconfigured, the application gracefully initializes in-memory stores pre-populated with deterministic seed accounts and catalogs.

### Executing PostgreSQL Migrations

When running against a real PostgreSQL instance:

```bash
# 1. Create database
createdb -U postgres reservepulse_dev

# 2. Execute migrations chronologically
psql -U postgres -d reservepulse_dev -f database/migrations/001_initial_schema.sql
psql -U postgres -d reservepulse_dev -f database/migrations/002_reservepulse_schema.sql
psql -U postgres -d reservepulse_dev -f database/migrations/003_auth_credentials.sql
psql -U postgres -d reservepulse_dev -f database/migrations/004_service_management.sql
psql -U postgres -d reservepulse_dev -f database/migrations/005_resource_status_types.sql
psql -U postgres -d reservepulse_dev -f database/migrations/006_booking_concurrency_hardening.sql
psql -U postgres -d reservepulse_dev -f database/migrations/007_payment_ready_flow.sql
psql -U postgres -d reservepulse_dev -f database/migrations/008_admin_user_management.sql

# 3. Seed deterministic baseline datasets
psql -U postgres -d reservepulse_dev -f database/seed/seed.sql
```

### Migration Summary Reference

| Migration | Scope |
| :--- | :--- |
| `001_initial_schema.sql` | Base users and audit log schema |
| `002_reservepulse_schema.sql` | Services, resources, working hours, slots, questions, bookings, payments |
| `003_auth_credentials.sql` | Password hashes, verification status, and reset tokens |
| `004_service_management.sql` | Secret share preview tokens and draft lifecycle fields |
| `005_resource_status_types.sql` | Resource fleet operational statuses and assignments |
| `006_booking_concurrency_hardening.sql` | Concurrency locks, remaining capacity counters, atomic decrement triggers |
| `007_payment_ready_flow.sql` | Payment provider tracking, intent IDs, and transaction references |
| `008_admin_user_management.sql` | Platform administrative governance and active account flags |

---

## 💻 Running the Application

### Option A: Concurrent Development (Frontend + Backend)
```bash
npm run dev
```
Starts both servers concurrently with colored console output:
- **Frontend SPA**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **API Health**: [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health)

### Option B: Running Independently

#### Backend Only
```bash
cd backend
npm run dev
```
Runs `tsx watch src/server.ts` with instant TypeScript hot-reloading.

#### Frontend Only
```bash
cd frontend
npm run dev
```
Runs Vite dev server with Hot Module Replacement (HMR).

---

## 🧪 Testing & Verification

ReservePulse comes equipped with comprehensive functional and stress-testing scripts:

```bash
# Complete 66-point automated production audit
npm run test:audit

# Concurrency & double-booking stress test (6 concurrent bursts against single capacity slot)
npm run test:concurrency

# Configurable intake question builders and answer validation
npm run test:questions

# Payment state machine & PCI-DSS compliance checks
npm run test:payment

# Organiser service and schedule fleet tests
npm run test:organiser

# Admin governance & RBAC security checks
npm run test:admin

# Analytics aggregation and utilization checks
npm run test:analytics

# Typecheck both projects
npm run typecheck
```

---

## 📦 Production Build & Packaging

To compile both backend and frontend for production deployment:

```bash
npm run build
```

This executes:
1. `npm run build:backend`: Invokes `tsc` to compile backend TypeScript into `backend/dist/`.
2. `npm run build:frontend`: Invokes `tsc -b && vite build` to generate optimized production assets in `frontend/dist/`.

### Starting the Production Backend
```bash
npm run start
# Or directly:
cd backend && node dist/server.js
```

---

## 🔒 Production Readiness Checklist

Before promoting to production:

- [ ] **JWT Secret**: Ensure `JWT_SECRET` in `backend/.env` is set to a cryptographically secure random string ($\ge 32$ characters).
- [ ] **Database Connection Pool**: Set `DB_POOL_MAX` appropriately for your database instance capacity (typically 20–50).
- [ ] **CORS Configuration**: Restrict `CORS_ORIGIN` to your exact frontend domain(s) (e.g. `https://app.reservepulse.com`).
- [ ] **SSL / TLS**: Terminate HTTPS at the reverse proxy (Nginx / Cloudflare) with modern TLS 1.2+ protocols.
- [ ] **Reverse Proxy Headers**: Ensure `X-Forwarded-For` and `X-Forwarded-Proto` are passed through to Express for accurate client IP logging.
- [ ] **Health Monitoring**: Set up continuous uptime monitoring on `/api/v1/health`.
- [ ] **Error Boundaries**: Frontend includes React `ErrorBoundary` wraps to prevent UI lockup in unhandled runtime exceptions.

