# ReservePulse System Architecture

## Overview
ReservePulse is built on a decoupled **Frontend / Backend / Database** tiered architecture designed for scalability, maintainability, and clean separation of concerns.

```mermaid
graph TD
    User([End User / Browser])
    
    subgraph Frontend ["Frontend (React + TypeScript + Vite)"]
        UI[Pages & Components]
        Layouts[MainLayout & Shell]
        Store[State / Store Layer]
        Hooks[Custom Hooks: useHealthCheck, etc.]
        Services[API Services Layer: api.ts]
        UI --> Layouts
        UI --> Hooks
        Hooks --> Services
        Services --> Store
    end

    subgraph Backend ["Backend API (Node.js + Express + TypeScript)"]
        Server[Express Server & Middleware]
        Router[API Router: /api/v1]
        Controllers[Controllers: health.controller.ts]
        ServicesBE[Service Layer: health.service.ts]
        Validators[Validators & DTOs]
        Models[Data Models & Interfaces]
        Server --> Router
        Router --> Validators
        Router --> Controllers
        Controllers --> ServicesBE
        ServicesBE --> Models
    end

    subgraph Database ["Data Tier"]
        Postgres[(Relational Database)]
        Migrations[Versioned Migrations]
        SeedData[Seed Scripts]
    end

    User --> UI
    Services -->|HTTP / JSON REST API| Server
    ServicesBE -->|Query Layer / Driver| Postgres
    Migrations -.->|Schema definition| Postgres
    SeedData -.->|Initial data| Postgres
```

## Directory Structure & Responsibilities

### Frontend (`/frontend`)
- **`src/components/`**: Reusable UI components (buttons, cards, badges, modal dialogs).
- **`src/pages/`**: View-level route components (`HomePage`, `NotFoundPage`).
- **`src/layouts/`**: Application scaffolding shells (`MainLayout` with header, navigation, footer).
- **`src/hooks/`**: Custom React hooks encapsulation logic and data fetching (`useHealthCheck`).
- **`src/services/`**: Network communication abstraction and API client configuration (`api.ts`).
- **`src/store/`**: Global state management and stores.
- **`src/utils/`**: Helper utilities, formatting functions, constants.
- **`src/types/`**: TypeScript type definitions and interfaces.
- **`src/assets/`**: Static assets, brand icons, SVG graphics.

### Backend (`/backend`)
- **`src/config/`**: Environment variable parsing, database configuration, security parameters.
- **`src/controllers/`**: Request handling, parameter extraction, and HTTP response formatting.
- **`src/middleware/`**: Cross-cutting concerns (request logging, error interception, CORS, auth).
- **`src/models/`**: Domain models, entity schemas, and core interfaces.
- **`src/routes/`**: Route definitions mapping endpoints to controller handlers.
- **`src/services/`**: Pure business logic, external integrations, and database access.
- **`src/utils/`**: Reusable logging, response envelopes, error classes.
- **`src/validators/`**: Input validation schemas and request validation middleware.

### Database (`/database`)
- **`migrations/`**: Chronological, immutable SQL schema migration files.
- **`seed/`**: Deterministic test and seed datasets for local and staging environments.

### Documentation (`/docs`)
- **`architecture.md`**: Architectural blueprint and component relationships.
- **`api.md`**: API specification and request/response contracts.
- **`setup.md`**: Developer environment setup and execution guides.
