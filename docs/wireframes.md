# ReservePulse - UI/UX Wireframe & Layout Architecture

> **Design System**: Signature White & Emerald Green Glassmorphic UI  
> **Target Framework**: React 19 + TypeScript + Tailwind CSS 4.0  
> **Asset Storage**: Stored locally in [`docs/wireframes/`](./wireframes/)

---

## 🎨 1. Authentication & 1-Click Testing Sandbox Wireframe

![2-Column Authentication & Testing Sandbox Wireframe](./wireframes/auth_sandbox_wireframe.jpg)

### Layout Hierarchy & Architecture

```text
+---------------------------------------------------------------------------------------------------------+
| [Master Card: max-w-5xl, bg-white/95, border-emerald-200/90, rounded-3xl, shadow-2xl]                   |
|                                                                                                         |
| LEFT COLUMN: Form (5 Cols / 42%)                  RIGHT COLUMN: Testing Sandbox (7 Cols / 58%)          |
| +----------------------------------------------+  +---------------------------------------------------+ |
| | [Logo] ReservePulse                          |  | (•) INSTANT DEMO TEST PERSONAS   [🍪 Cookie DB]   | |
| |                                              |  | Pick any role below to test full capabilities:    | |
| | Welcome back                                 |  |                                                   | |
| | Sign in to manage schedules or inspect.      |  | +-----------------------------------------------+ | |
| |                                              |  | | [👤] Alex Morgan              [Client Portal] | | |
| | Email Address:                               |  | | customer@reservepulse.com                     | | |
| | [ name@example.com                         ] |  | | Browse catalog, select slots & intake forms.  | | |
| |                                              |  | | [ Fill Form ]             [ Login → (Green) ] | | |
| | Password:                 (Default: Role@123)|  | +-----------------------------------------------+ | |
| | [ ••••••••••••••••                         ] |  |                                                   | |
| |                                              |  | +-----------------------------------------------+ | |
| | +------------------------------------------+ |  | | [💼] Jordan Vance          [Operations Fleet] | | |
| | |      SIGN IN TO PLATFORM (Primary)       | |  | | organiser@reservepulse.com                    | | |
| | +------------------------------------------+ |  | | Publish services, manage resources & shifts. | | |
| |                                              |  | | [ Fill Form ]             [ Login → (Green) ] | | |
| | New to platform? Sign up    ← Return to Home |  | +-----------------------------------------------+ | |
| |                                              |  |                                                   | |
| |                                              |  | +-----------------------------------------------+ | |
| |                                              |  | | [🛡️] Morgan Reed              [Full Access]   | | |
| |                                              |  | | admin@reservepulse.com                        | | |
| |                                              |  | | Platform analytics, users & audit logs.       | | |
| |                                              |  | | [ Fill Form ]             [ Login → (Green) ] | | |
| |                                              |  | +-----------------------------------------------+ | |
| |                                              |  |                                                   | |
| |                                              |  | 💾 Data persists in Cookies.    [Reset Demo Data] | |
| +----------------------------------------------+  +---------------------------------------------------+ |
+---------------------------------------------------------------------------------------------------------+
```

---

## 📅 2. Interactive Booking Wizard & Dynamic Slot Grid Wireframe

![Interactive Booking Wizard & Slot Availability Grid](./wireframes/booking_wizard_wireframe.jpg)

### Component Specifications

```text
+---------------------------------------------------------------------------------------------------------+
| [Logo] ReservePulse         [Dashboard]  [Calendar]  [Bookings]  [Resources]            (🔔) [Profile]  |
+---------------------------------------------------------------------------------------------------------+
|                                                                                                         |
| LEFT PANEL: Calendar & Real-Time Availability (60%)     RIGHT PANEL: Intake Form & Summary (40%)        |
| +-----------------------------------------------------+ +---------------------------------------------+ |
| | < May 2024 >                                        | | New Reservation (Tue, May 14, 10:30 AM)     | |
| | Sun   Mon   Tue   Wed   Thu   Fri   Sat             | |                                             | |
| | 12    13   (14)    15    16    17    18             | | Customer Details                            | |
| +-----------------------------------------------------+ | Full Name:  [ Jane Doe                    ] | |
| | Available Time Slots (May 14)                       | | Email:      [ jane.doe@example.com        ] | |
| | +-----------------------+ +-----------------------+ | | Phone:      [ +1 555-012-3456             ] | |
| | | 09:00 AM - 10:00 AM   | | 10:30 AM - 11:30 AM   | | |---------------------------------------------| |
| | | [Available]  8/10 cap | | [Selected]   5/10 cap | | | Service & Questionnaire                     | |
| | +-----------------------+ +-----------------------+ | | Service:    [ Consultation (1 Hr)       v ] | |
| | +-----------------------+ +-----------------------+ | | Resource:   Executive Boardroom Alpha       | |
| | | 01:00 PM - 02:00 PM   | | 03:00 PM - 04:00 PM   | | | Duration:   60 mins (Buffers: 15m before)   | |
| | | [FULL]      10/10 cap | | [Available]  2/10 cap | | | Price:      $45.00                          | |
| | +-----------------------+ +-----------------------+ | |---------------------------------------------| |
| |                                                     | | +-----------------------------------------+ | |
| | Resource Status:                                    | | |        CONFIRM BOOKING (CTA)            | | |
| | (•) Room A (Available)  (•) Room B (In Use)         | | +-----------------------------------------+ | |
| +-----------------------------------------------------+ +---------------------------------------------+ |
+---------------------------------------------------------------------------------------------------------+
```

---

## 🗂️ 3. Service Catalog & Service Builder Modal Wireframe

![Service Catalog & Creation Modal Wireframe](./wireframes/service_catalog_wireframe.jpg)

### Features & Layout:
- **Category Filter Tabs**: `All`, `Workspace`, `Compute`, `Consultation`, `Hardware`, `Research`.
- **Service Cards**:
  - Duration pill (`60m`, `90m`, `120m`).
  - Capacity indicator (`up to 8 people`).
  - Price badge (`$120/hr` or `Free`).
  - Solid emerald **"Book Now"** action.
- **Service Builder Modal Overlay**:
  - Inputs for `Service Name`, `Category`, `Duration Slider` (15m to 240m), `Before/After Buffer Times` (0m to 60m), and `Intake Questionnaire Builder`.

---

## 🏢 4. Resource Fleet Inventory & Weekly Operating Shifts Wireframe

![Resource Fleet & Schedule Planner Wireframe](./wireframes/resource_schedule_wireframe.jpg)

### Features & Layout:
- **Left Column (Resource Fleet Inventory)**:
  - Inventory items: `Executive Boardroom Alpha` (Room), `GPU Node Cluster (8x H100)` (Compute), `Private Advisory Pod` (Pod).
  - Live operational status badges (`Available`, `In Use`, `Under Maintenance`).
- **Right Column (Weekly Schedule Planner)**:
  - Shift time-blocks from Monday to Friday (`09:00 AM - 05:00 PM`).
  - **Split-Shift Interval Toggles**: Toggle afternoon breaks (e.g. 1:00 PM – 2:00 PM).
  - **Buffer Configurations**: Pre-booking buffer (15 mins), post-booking buffer (30 mins).
  - **Restrictions**: Minimum lead time (4 hrs), maximum booking horizon (90 days).

---

## 📊 5. Executive Telemetry & Fleet Operations Dashboard Wireframe

![Analytics & Resource Dashboard Wireframe](./wireframes/analytics_dashboard_wireframe.jpg)

### Dashboard Layout Hierarchy
1. **Top Metric Strip (4 KPI Summary Cards)**:
   - **Total Revenue**: `$128,450` (`+12.5%` vs. previous period)
   - **Active Bookings**: `1,842` (`+8.1%` growth trendline)
   - **Fleet Utilization**: `78%` (with linear progress indicator)
   - **Completion Rate**: `94%` (circular gauge indicating non-cancelled appointments)
2. **Operational Schedule Matrix (Left)**:
   - Weekly time-blocked calendar (Mon–Sun, 08:00 AM – 10:00 PM) showing confirmed bookings.
3. **Hourly Occupancy Distribution (Center)**:
   - 24-hour histogram visualizing load concentration (busiest window: 02:00 PM – 04:00 PM).
4. **Live Resource Fleet Status (Right)**:
   - Real-time status list (`Operational`, `Maintenance`, `In Use`) with utilization percentages.

---

## 🛡️ 6. Platform Administration & User Governance Console Wireframe

![Platform Administration & User Governance Wireframe](./wireframes/admin_governance_wireframe.jpg)

### Features & Layout:
- **Top Admin Telemetry Bar**: Active users (`12,485`), Active projects (`1,842`), Audit logs (`97.3K`).
- **Search & Role Filter Bar**: Filter by `Customer`, `Organiser`, `Admin`.
- **Data Table**:
  - User name with avatar and email.
  - Role pill (`ADMIN` in dark, `ORGANIZER` in blue/teal, `CUSTOMER` in gray/emerald).
  - Interactive **Active / Inactive Status Toggle**.
  - Row actions: `Edit`, `Reset Password`, `More...`.
- **Live System Audit Logs (Bottom Panel)**:
  - Timestamped events: `User Update`, `Role Created`, `Login Success`, `Booking Confirmed`.

---

## 📐 Design Tokens & Visual Specs

| Token | CSS / Hex | Purpose |
| :--- | :--- | :--- |
| **Brand Primary** | `#059669` (`emerald-600`) | Main buttons, active tabs, indicator dots |
| **Brand Accent** | `#047857` (`emerald-700`) | Hover states, active borders |
| **Soft Surface Tint** | `#ECFDF5` (`emerald-50`) | Card backgrounds, badge fills, ambient mesh |
| **Surface White** | `#FFFFFF` (`white/95`) | Clean glassmorphic cards, inputs, dialogs |
| **Border Soft** | `#A7F3D0` (`emerald-200`) | Card borders, dividers, focus rings |
| **Text Heading** | `#0F172A` (`slate-900`) | Main titles, user names, primary labels |
| **Text Body** | `#334155` (`slate-700`) | Descriptions, table cells, form labels |
| **Text Muted** | `#64748B` (`slate-500`) | Subtitles, helper text, timestamps |

---

## 📱 Responsive Breakpoints

- **Desktop (`>= 1024px`)**: Full 2-column balanced split (5 cols / 7 cols) for Auth, side-by-side for booking wizard (60% / 40%), 4-column KPI strip.
- **Tablet (`768px - 1023px`)**: 2-column grid for KPIs, stacked cards with generous padding.
- **Mobile (`< 768px`)**: Single column stacked flow, tap-friendly action targets (min 44px height), full-width buttons.
