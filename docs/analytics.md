# ReservePulse Analytics Specification & Metric Definitions

## 1. Overview & Architecture

ReservePulse Analytics provides read-only operational telemetry, throughput aggregation, and capacity utilization metrics for organisers and platform administrators.

### Core Principles
- **Strictly Read-Only**: Analytics queries aggregate existing reservation and schedule records; they never alter booking records, payment statuses, or slot availability.
- **Cancelled Booking Exclusions**: To represent authentic operational throughput and genuine provider utilization, cancelled and payment-failed bookings are excluded from active booked duration, peak booking hours, and capacity calculations.
- **Multi-Tenant Scoping**:
  - `ORGANISER` role: Scoped strictly to services and resources owned by the authenticated organiser (`organiser_id = user.id`).
  - `ADMIN` role: Scoped platform-wide by default, with optional query filters by `organiserId`, `serviceId`, or `resourceId`.
  - `CUSTOMER` role: Denied access (403 Forbidden).
  - Unauthenticated requests: Denied access (401 Unauthorized).
- **Dual-Mode Persistence**: Aggregations execute optimized PostgreSQL queries when database connections are healthy, seamlessly falling back to in-memory stores during offline or demo runtime.

---

## 2. Metric Definitions & Mathematical Formulas

### 2.1 Headline Summary Metrics

| Metric | Code Key | Definition & Formula | Cancelled Bookings Handling |
| :--- | :--- | :--- | :--- |
| **Total Appointments** | `totalAppointments` | Total count of all bookings within the date window: $$N_{\text{total}}$$ | **Included** (represents all booking attempts and transactions) |
| **Active Appointments** | `activeAppointments` | Count of non-cancelled bookings (`confirmed`, `completed`, `pending`, `in_progress`): $$N_{\text{active}} = N_{\text{total}} - N_{\text{cancelled}}$$ | **Excluded** |
| **Confirmed Appointments** | `confirmedAppointments` | Count of confirmed reservations ready for or awaiting service delivery. | **Excluded** |
| **Completed Appointments** | `completedAppointments` | Count of reservations that have successfully concluded. | **Excluded** |
| **Pending Appointments** | `pendingAppointments` | Count of reservations awaiting manual confirmation or payment fulfillment. | **Excluded** |
| **Cancelled Appointments** | `cancelledAppointments` | Count of reservations marked as `cancelled` or `payment-failed`. | **Target Metric** |
| **Cancellation Rate** | `cancellationRate` | Percentage of total bookings cancelled or failed: $$\text{Rate} = \left(\frac{N_{\text{cancelled}}}{N_{\text{total}}}\right) \times 100$$ | Measures drop-off rate |
| **Total Booked Hours** | `totalBookedHours` | Total service hours delivered or scheduled: $$\text{Hours} = \frac{\sum_{i \in \text{Active}} (\text{end\_time}_i - \text{start\_time}_i)_{\text{mins}}}{60}$$ | **Excluded** (cancelled reservations do not consume provider time) |
| **Average Duration** | `avgDurationMinutes` | Mean duration per active appointment: $$\text{Avg} = \frac{\text{Total Booked Minutes}}{N_{\text{active}}}$$ | **Excluded** |
| **Fleet Utilization Rate** | `fleetUtilizationRate` | Mean capacity utilization across all monitored resources/providers: $$\bar{U} = \frac{\sum_{r=1}^R \text{utilizationRate}_r}{R}$$ | **Excluded** |
| **Peak Demand Hour** | `peakHourLabel` | 12-hour formatted label (e.g. `02:00 PM`) for the hour slot experiencing the highest active appointment volume. | **Excluded** |

---

### 2.2 Peak Booking Hours Analysis

Peak booking analysis maps appointment demand across a 24-hour business cycle (hours `00:00` through `23:00`):

1. **Hourly Distribution** (`hourlyDistribution`):
   - 24-element array corresponding to hours $h \in [0, 23]$.
   - Each element calculates `bookingCount` (count of active reservations starting in that hour) and `percentage` of total daily active volume.
   - **Exclusion**: Bookings with status `cancelled`, `payment-failed`, or `payment_failed` are strictly omitted from hourly bins.
2. **Peak Hour** (`peakHour`):
   - The hour index $h^* = \arg\max_{h} (\text{bookingCount}_h)$.
3. **Busiest Window** (`busiestWindow`):
   - A 4-hour operational window surrounding the peak hour:
     $$\text{Window} = [\max(8, h^* - 2), \min(20, h^* + 2)]$$
   - Example: If peak hour is 2:00 PM (14:00), busiest window is `12:00 PM - 04:00 PM`.

---

### 2.3 Provider & Resource Capacity Utilization

Measures how efficiently available provider time and resource slots are being used:

1. **Operational Capacity Minutes** (`availableMinutes`):
   - Based on standard 8-hour operational days and concurrent resource capacity:
     $$\text{Capacity} = (\text{Days in Timeframe}) \times 8 \times 60 \times (\text{resource.capacity})$$
2. **Booked Minutes** (`bookedMinutes`):
   - Sum of minutes allocated to active bookings for that specific provider:
     $$\text{Booked} = \sum_{b \in \text{Active Resource Bookings}} (\text{end\_time}_b - \text{start\_time}_b)_{\text{mins}}$$
3. **Utilization Rate (%)** (`utilizationRate`):
   - Clamped percentage of operational capacity utilized:
     $$\text{Utilization} = \min\left(100, \left(\frac{\text{Booked Minutes}}{\text{Capacity Minutes}}\right) \times 100\right)$$
4. **Health Bands**:
   - `< 50%`: Underutilized (high availability)
   - `50% - 75%`: Healthy / Moderate utilization
   - `75% - 90%`: Optimal operational throughput
   - `> 90%`: High demand / capacity constrained

---

## 3. Date Filtering System

The analytics API supports four standardized time filters:

| Filter | Query Param | Start Date | End Date | Timeline Resolution |
| :--- | :--- | :--- | :--- | :--- |
| **Today** | `timeFilter=today` | Today at `00:00:00` | Today at `23:59:59` | **Hourly** (24 hourly buckets) |
| **Last 7 Days** | `timeFilter=week` | Current Date $- 6$ days (`00:00:00`) | Current Date (`23:59:59`) | **Daily** (7 daily buckets) |
| **Last 30 Days** | `timeFilter=month` | Current Date $- 29$ days (`00:00:00`) | Current Date (`23:59:59`) | **Daily** (30 daily buckets) |
| **Custom Range** | `timeFilter=custom&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` | `startDate` at `00:00:00` | `endDate` at `23:59:59` | **Hourly** if span $\le 2$ days; **Daily** otherwise |

---

## 4. REST API Endpoints Specification

All endpoints require JWT Bearer authentication with `ORGANISER` or `ADMIN` roles.

### 4.1 GET `/api/v1/analytics/overview` (and `/api/v1/organiser/analytics`)
Returns comprehensive platform overview: headline KPIs, timeline trend, status breakdown, peak hours, and provider utilization.

**Query Parameters**:
- `timeFilter` (optional, default `week`): `'today' | 'week' | 'month' | 'custom'`
- `startDate` (required if `timeFilter=custom`): `YYYY-MM-DD`
- `endDate` (required if `timeFilter=custom`): `YYYY-MM-DD`
- `resourceId` (optional): Filter to a specific provider/resource
- `serviceId` (optional): Filter to a specific service
- `organiserId` (optional, Admin only): Filter to a specific organiser workspace

**Response Example (200 OK)**:
```json
{
  "success": true,
  "message": "Platform analytics overview retrieved successfully",
  "data": {
    "summary": {
      "totalAppointments": 42,
      "activeAppointments": 38,
      "confirmedAppointments": 24,
      "pendingAppointments": 4,
      "completedAppointments": 10,
      "cancelledAppointments": 4,
      "cancellationRate": 9.5,
      "totalBookedHours": 32.5,
      "avgDurationMinutes": 51,
      "fleetUtilizationRate": 68.4,
      "peakHourLabel": "02:00 PM"
    },
    "trend": [
      {
        "timestamp": "2026-09-19",
        "label": "Sat, Sep 19",
        "total": 5,
        "active": 5,
        "confirmed": 3,
        "completed": 2,
        "cancelled": 0,
        "pending": 0
      }
    ],
    "statusBreakdown": [
      { "status": "confirmed", "label": "Confirmed", "count": 24, "percentage": 57.1 },
      { "status": "completed", "label": "Completed", "count": 10, "percentage": 23.8 },
      { "status": "pending", "label": "Pending", "count": 4, "percentage": 9.5 },
      { "status": "in_progress", "label": "In Progress", "count": 0, "percentage": 0.0 },
      { "status": "cancelled", "label": "Cancelled", "count": 4, "percentage": 9.5 }
    ],
    "peakHours": {
      "hourlyDistribution": [
        { "hour": 14, "label": "02:00 PM", "bookingCount": 8, "percentage": 21.1 }
      ],
      "peakHour": 14,
      "peakHourLabel": "02:00 PM",
      "peakCount": 8,
      "busiestWindow": "12:00 PM - 04:00 PM"
    },
    "providerUtilization": [
      {
        "providerId": "res_dr_watson",
        "providerName": "Dr. Emily Watson",
        "providerType": "staff",
        "totalAppointments": 20,
        "activeAppointments": 18,
        "cancelledAppointments": 2,
        "bookedMinutes": 1080,
        "availableMinutes": 3360,
        "utilizationRate": 32.1,
        "avgDurationMinutes": 60
      }
    ],
    "meta": {
      "timeFilter": "week",
      "startDate": "2026-09-19T00:00:00.000Z",
      "endDate": "2026-09-25T23:59:59.999Z",
      "scopedOrganiserId": "usr_org_123"
    }
  },
  "timestamp": "2026-09-25T14:20:00.000Z"
}
```

### 4.2 GET `/api/v1/analytics/appointments`
Returns appointment trends and status distribution breakdown.

### 4.3 GET `/api/v1/analytics/peak-hours`
Returns 24-hour demand distribution, peak hour identification, and busiest operational windows (excluding cancelled bookings).

### 4.4 GET `/api/v1/analytics/utilization`
Returns per-resource utilization, capacity hours, and fleet-wide utilization index.

---

## 5. Frontend Reusable Chart Components

Located in `frontend/src/components/analytics/`:

1. **`TrendLineChart.tsx`**:
   - Responsive SVG area and polyline chart.
   - Dual metrics: Total Bookings (indigo area) and Active Bookings (emerald/teal gradient line).
   - Interactive hover tracking with tooltip callouts and vertical dashed guides.
   - Dynamic Y-axis scale with 15% headroom.

2. **`HourlyBarChart.tsx`**:
   - 24-hour SVG bar distribution.
   - Peak hour highlighted in amber/orange gradient with badge callout.
   - Every 3 hours labeled on X-axis (`12A`, `3A`, `6A`, `9A`, `12P`, `3P`, `6P`, `9P`).
   - Hover inspection showing booking count and volume percentage.

3. **`StatusDonutChart.tsx`**:
   - Pure SVG donut chart utilizing `stroke-dasharray` and `stroke-dashoffset`.
   - Distinct color coding for Confirmed (blue), Completed (emerald), Pending (amber), In Progress (purple), Cancelled (rose).
   - Dynamic center label showing total volume or hovered slice metric.
   - Hover-linked interactive legend.

4. **`ProviderUtilizationTable.tsx`**:
   - Tabular capacity inspection with search filtering and sorting (by utilization, appointments, or name).
   - Multi-threshold colored progress bars: Emerald (<50%), Indigo (50-75%), Amber (75-90%), Rose (>90%).
   - Explicit breakdown of active bookings, booked hours, avg duration, and cancelled counts.

---

## 6. Test Suite & Verification

The analytics implementation is validated by automated backend tests in `backend/src/scripts/test_analytics_flow.ts`:

```bash
# Run analytics test suite
npm run test:analytics
```

### Coverage Scope:
- **Date Range Resolution**: 7 tests verifying `today`, `week`, `month`, and `custom` intervals and day calculations.
- **Calculation Accuracy & Exclusions**: 18 tests verifying cancelled/failed bookings are excluded from booked hours, avg duration, and peak hours.
- **Multi-Tenant Isolation**: 6 tests verifying strict separation between organisers and platform-wide admin aggregation.
- **HTTP API Endpoints**: 23 tests verifying all REST endpoints, query parameters, metadata, and backward compatibility aliases.
- **Security & Read-Only Invariance**: 5 tests verifying 401 Unauthorized for unauthenticated requests, 403 Forbidden for customers, and bit-level invariance of booking records.
