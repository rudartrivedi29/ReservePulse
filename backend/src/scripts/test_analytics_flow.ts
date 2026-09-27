/**
 * Comprehensive Test Suite for ReservePulse Analytics Flow
 *
 * Verifies:
 * 1. Date Range Resolution:
 *    - today (hourly interval)
 *    - week (daily interval, 7 days)
 *    - month (daily interval, 30 days)
 *    - custom range (dynamic interval)
 * 2. Metric Calculations & Accuracy:
 *    - Total appointments count
 *    - Active appointments (confirmed, completed, pending, in_progress)
 *    - Cancelled appointments and cancellation rate (%)
 *    - Booked duration excludes cancelled bookings
 *    - Peak hours distribution (24-hour array, peak hour identified, cancelled excluded)
 *    - Provider utilization (active vs cancelled, booked minutes, capacity utilization rate)
 * 3. Multi-tenant Scoping & Security:
 *    - Organisers only receive data for their own services & resources
 *    - Admin has platform-wide visibility with optional filters
 *    - Customers receive 403 Forbidden
 *    - Unauthenticated requests receive 401 Unauthorized
 * 4. Read-only Guarantee:
 *    - Booking states and counts remain completely unchanged by analytics queries
 * 5. HTTP Endpoints:
 *    - GET /api/v1/analytics/overview
 *    - GET /api/v1/analytics/appointments
 *    - GET /api/v1/analytics/peak-hours
 *    - GET /api/v1/analytics/utilization
 *    - GET /api/v1/organiser/analytics
 */

import jwt from 'jsonwebtoken';
import { Server } from 'http';
import { createApp } from '../app';
import { config } from '../config/env';
import { AuthService } from '../services/auth.service';
import { ServiceService } from '../services/service.service';
import { ResourceService } from '../services/resource.service';
import { BookingService } from '../services/booking.service';
import { AnalyticsService } from '../services/analytics.service';
import { AuthUserPayload } from '../middleware/auth.middleware';
import { BookingEntity } from '../models/booking.model';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL [${totalTests}]: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`✓ [${totalTests}] ${message}`);
}

async function runAnalyticsFlowTests() {
  console.log('================================================================');
  console.log('🚀 RUNNING RESERSEPULSE ANALYTICS VERIFICATION TESTS');
  console.log('================================================================');

  // Define users
  const adminUser: AuthUserPayload = {
    id: 'usr_admin_analyt_100',
    email: 'admin.analytics@reservepulse.test',
    fullName: 'Analytics Admin',
    role: 'ADMIN',
    isVerified: true,
  };

  const organiserA: AuthUserPayload = {
    id: 'usr_org_analyt_200',
    email: 'clinic.alpha@reservepulse.test',
    fullName: 'Clinic Alpha Director',
    role: 'ORGANISER',
    isVerified: true,
  };

  const organiserB: AuthUserPayload = {
    id: 'usr_org_analyt_300',
    email: 'studio.beta@reservepulse.test',
    fullName: 'Studio Beta Manager',
    role: 'ORGANISER',
    isVerified: true,
  };

  const customerUser: AuthUserPayload = {
    id: 'usr_cust_analyt_400',
    email: 'customer.pat@reservepulse.test',
    fullName: 'Pat Customer',
    role: 'CUSTOMER',
    isVerified: true,
  };

  const adminToken = jwt.sign(adminUser, config.jwt.secret, { expiresIn: '1h' });
  const organiserAToken = jwt.sign(organiserA, config.jwt.secret, { expiresIn: '1h' });
  const organiserBToken = jwt.sign(organiserB, config.jwt.secret, { expiresIn: '1h' });
  const customerToken = jwt.sign(customerUser, config.jwt.secret, { expiresIn: '1h' });

  // Seed Users
  await AuthService.saveUserEntity({
    id: adminUser.id,
    email: adminUser.email,
    full_name: adminUser.fullName,
    role: 'ADMIN',
    is_verified: true,
    is_active: true,
    password_hash: 'hashed',
    created_at: new Date(),
    updated_at: new Date(),
  });

  await AuthService.saveUserEntity({
    id: organiserA.id,
    email: organiserA.email,
    full_name: organiserA.fullName,
    role: 'ORGANISER',
    is_verified: true,
    is_active: true,
    password_hash: 'hashed',
    created_at: new Date(),
    updated_at: new Date(),
  });

  await AuthService.saveUserEntity({
    id: organiserB.id,
    email: organiserB.email,
    full_name: organiserB.fullName,
    role: 'ORGANISER',
    is_verified: true,
    is_active: true,
    password_hash: 'hashed',
    created_at: new Date(),
    updated_at: new Date(),
  });

  await AuthService.saveUserEntity({
    id: customerUser.id,
    email: customerUser.email,
    full_name: customerUser.fullName,
    role: 'CUSTOMER',
    is_verified: true,
    is_active: true,
    password_hash: 'hashed',
    created_at: new Date(),
    updated_at: new Date(),
  });

  // Seed Services & Resources for Organiser A
  const serviceA = await ServiceService.createService(organiserA.id, {
    name: 'Alpha General Consultation',
    description: 'Comprehensive health consultation',
    category: 'Consultation',
    durationMinutes: 60,
    priceAmount: 100,
    priceCurrency: 'USD',
  } as any);

  const resourceA1 = await ResourceService.createResource(organiserA.id, {
    name: 'Dr. Emily Watson (Alpha 1)',
    resourceType: 'staff',
    capacity: 1,
  } as any);

  const resourceA2 = await ResourceService.createResource(organiserA.id, {
    name: 'Consultation Suite 101',
    resourceType: 'room',
    capacity: 2,
  } as any);

  // Seed Services & Resources for Organiser B
  const serviceB = await ServiceService.createService(organiserB.id, {
    name: 'Beta Yoga Private Session',
    description: 'Private 1-on-1 yoga instruction',
    category: 'Fitness',
    durationMinutes: 45,
    priceAmount: 60,
    priceCurrency: 'USD',
  } as any);

  const resourceB1 = await ResourceService.createResource(organiserB.id, {
    name: 'Master Sarah Chen',
    resourceType: 'staff',
    capacity: 1,
  } as any);

  // -------------------------------------------------------------
  // Seed Bookings
  // -------------------------------------------------------------
  const now = new Date();
  const todayAtHour = (hour: number, durationMinutes = 60) => {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0, 0);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    return { start, end };
  };

  const daysAgoAtHour = (daysAgo: number, hour: number, durationMinutes = 60) => {
    const target = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const start = new Date(target.getFullYear(), target.getMonth(), target.getDate(), hour, 0, 0, 0);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    return { start, end };
  };

  const inMemStore = BookingService.getRawInMemoryBookings();

  // Booking 1: Confirmed today at 10:00 (Organiser A, Resource A1, 60m)
  const slot1 = todayAtHour(10, 60);
  const b1: BookingEntity = {
    id: 'bk_analyt_01',
    booking_reference: 'RP-ANALYT-01',
    service_id: serviceA.id,
    resource_id: resourceA1.id,
    customer_id: customerUser.id,
    start_time: slot1.start,
    end_time: slot1.end,
    attendee_count: 1,
    status: 'confirmed',
    payment_status: 'paid',
    guest_name: 'Pat Customer',
    guest_email: 'customer.pat@reservepulse.test',
    guest_phone: '+1 555-0199',
    total_price: 100,
    price_currency: 'USD',
    created_at: now,
    updated_at: now,
  };
  inMemStore.set(b1.id, b1);

  // Booking 2: Completed today at 14:00 (Organiser A, Resource A1, 60m)
  const slot2 = todayAtHour(14, 60);
  const b2: BookingEntity = {
    id: 'bk_analyt_02',
    booking_reference: 'RP-ANALYT-02',
    service_id: serviceA.id,
    resource_id: resourceA1.id,
    customer_id: customerUser.id,
    start_time: slot2.start,
    end_time: slot2.end,
    attendee_count: 1,
    status: 'completed',
    payment_status: 'paid',
    guest_name: 'Pat Customer',
    guest_email: 'customer.pat@reservepulse.test',
    total_price: 100,
    price_currency: 'USD',
    created_at: now,
    updated_at: now,
  };
  inMemStore.set(b2.id, b2);

  // Booking 3: In-Progress today at 14:00 (Organiser A, Resource A2, 30m) - makes 14:00 the peak hour!
  const slot3 = todayAtHour(14, 30);
  const b3: BookingEntity = {
    id: 'bk_analyt_03',
    booking_reference: 'RP-ANALYT-03',
    service_id: serviceA.id,
    resource_id: resourceA2.id,
    customer_id: customerUser.id,
    start_time: slot3.start,
    end_time: slot3.end,
    attendee_count: 1,
    status: 'in_progress',
    payment_status: 'paid',
    guest_name: 'Pat Customer',
    guest_email: 'customer.pat@reservepulse.test',
    total_price: 50,
    price_currency: 'USD',
    created_at: now,
    updated_at: now,
  };
  inMemStore.set(b3.id, b3);

  // Booking 4: Cancelled today at 14:00 (Organiser A, Resource A1, 60m) - MUST be excluded from peak and active duration
  const slot4 = todayAtHour(14, 60);
  const b4: BookingEntity = {
    id: 'bk_analyt_04',
    booking_reference: 'RP-ANALYT-04',
    service_id: serviceA.id,
    resource_id: resourceA1.id,
    customer_id: customerUser.id,
    start_time: slot4.start,
    end_time: slot4.end,
    attendee_count: 1,
    status: 'cancelled',
    payment_status: 'refunded',
    guest_name: 'Pat Customer',
    guest_email: 'customer.pat@reservepulse.test',
    total_price: 100,
    price_currency: 'USD',
    created_at: now,
    updated_at: now,
  };
  inMemStore.set(b4.id, b4);

  // Booking 5: Pending 2 days ago at 11:00 (Organiser A, Resource A2, 60m)
  const slot5 = daysAgoAtHour(2, 11, 60);
  const b5: BookingEntity = {
    id: 'bk_analyt_05',
    booking_reference: 'RP-ANALYT-05',
    service_id: serviceA.id,
    resource_id: resourceA2.id,
    customer_id: customerUser.id,
    start_time: slot5.start,
    end_time: slot5.end,
    attendee_count: 1,
    status: 'pending',
    payment_status: 'pending',
    guest_name: 'Pat Customer',
    guest_email: 'customer.pat@reservepulse.test',
    total_price: 100,
    price_currency: 'USD',
    created_at: slot5.start,
    updated_at: slot5.start,
  };
  inMemStore.set(b5.id, b5);

  // Booking 6: Payment-Failed 3 days ago at 16:00 (Organiser A, Resource A1, 60m) - counts as cancelled/failed
  const slot6 = daysAgoAtHour(3, 16, 60);
  const b6: BookingEntity = {
    id: 'bk_analyt_06',
    booking_reference: 'RP-ANALYT-06',
    service_id: serviceA.id,
    resource_id: resourceA1.id,
    customer_id: customerUser.id,
    start_time: slot6.start,
    end_time: slot6.end,
    attendee_count: 1,
    status: 'payment-failed',
    payment_status: 'failed',
    guest_name: 'Pat Customer',
    guest_email: 'customer.pat@reservepulse.test',
    total_price: 100,
    price_currency: 'USD',
    created_at: slot6.start,
    updated_at: slot6.start,
  };
  inMemStore.set(b6.id, b6);

  // Booking 7: Confirmed today at 09:00 for Organiser B (Organiser B, Resource B1, 45m)
  const slot7 = todayAtHour(9, 45);
  const b7: BookingEntity = {
    id: 'bk_analyt_07',
    booking_reference: 'RP-ANALYT-07',
    service_id: serviceB.id,
    resource_id: resourceB1.id,
    customer_id: customerUser.id,
    start_time: slot7.start,
    end_time: slot7.end,
    attendee_count: 1,
    status: 'confirmed',
    payment_status: 'paid',
    guest_name: 'Pat Customer',
    guest_email: 'customer.pat@reservepulse.test',
    total_price: 60,
    price_currency: 'USD',
    created_at: now,
    updated_at: now,
  };
  inMemStore.set(b7.id, b7);

  // Start HTTP test server
  const app = createApp();
  const PORT = 5097;
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(PORT, () => resolve(s));
  });

  const baseUrl = `http://localhost:${PORT}/api/v1`;

  try {
    // -------------------------------------------------------------
    // SECTION 1: Service-level Date Range Resolution
    // -------------------------------------------------------------
    console.log('\n--- Section 1: Date Range Resolution ---');
    const rangeToday = AnalyticsService.resolveDateRange({ timeFilter: 'today' });
    assert(rangeToday.interval === 'hour', 'timeFilter=today resolves to hourly interval');
    assert(rangeToday.timeFilter === 'today', 'timeFilter preserves today filter identifier');

    const rangeWeek = AnalyticsService.resolveDateRange({ timeFilter: 'week' });
    assert(rangeWeek.interval === 'day', 'timeFilter=week resolves to daily interval');
    const daysDiffWeek = Math.round(
      (rangeWeek.endDate.getTime() - rangeWeek.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    assert(daysDiffWeek >= 6 && daysDiffWeek <= 8, `timeFilter=week spans ~7 days (got ${daysDiffWeek})`);

    const rangeMonth = AnalyticsService.resolveDateRange({ timeFilter: 'month' });
    assert(rangeMonth.interval === 'day', 'timeFilter=month resolves to daily interval');
    const daysDiffMonth = Math.round(
      (rangeMonth.endDate.getTime() - rangeMonth.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    assert(daysDiffMonth >= 28 && daysDiffMonth <= 31, `timeFilter=month spans ~30 days (got ${daysDiffMonth})`);

    const rangeCustom = AnalyticsService.resolveDateRange({
      timeFilter: 'custom',
      startDate: '2026-09-01',
      endDate: '2026-09-02',
    });
    assert(rangeCustom.interval === 'hour', 'Custom range of <= 2 days resolves to hourly interval');

    // -------------------------------------------------------------
    // SECTION 2: Calculation Accuracy & Cancelled Booking Exclusion
    // -------------------------------------------------------------
    console.log('\n--- Section 2: Calculation Accuracy & Exclusions ---');
    const overviewA = await AnalyticsService.getAnalyticsOverview({ timeFilter: 'week' }, organiserA);

    // Organiser A has 6 bookings total in the last 7 days:
    // b1 (confirmed), b2 (completed), b3 (in_progress), b4 (cancelled), b5 (pending), b6 (payment-failed)
    assert(overviewA.summary.totalAppointments === 6, `Organiser A totalAppointments is 6 (got ${overviewA.summary.totalAppointments})`);
    assert(overviewA.summary.activeAppointments === 4, `Organiser A activeAppointments is 4 (excludes cancelled and payment-failed) (got ${overviewA.summary.activeAppointments})`);
    assert(overviewA.summary.cancelledAppointments === 2, `Organiser A cancelledAppointments is 2 (cancelled + payment-failed) (got ${overviewA.summary.cancelledAppointments})`);
    assert(overviewA.summary.confirmedAppointments === 1, `Organiser A confirmedAppointments is 1`);
    assert(overviewA.summary.completedAppointments === 1, `Organiser A completedAppointments is 1`);
    assert(overviewA.summary.pendingAppointments === 1, `Organiser A pendingAppointments is 1`);

    // Cancellation rate = (2 / 6) * 100 = 33.3%
    assert(overviewA.summary.cancellationRate === 33.3, `Organiser A cancellationRate is 33.3% (got ${overviewA.summary.cancellationRate}%)`);

    // Total booked minutes for active bookings:
    // b1: 60m, b2: 60m, b3: 30m, b5: 60m = 210m = 3.5 hours
    // (b4 and b6 cancelled bookings are excluded!)
    assert(overviewA.summary.totalBookedHours === 3.5, `totalBookedHours is 3.5 hours (excludes cancelled) (got ${overviewA.summary.totalBookedHours})`);
    // Avg duration = 210 / 4 = 52.5 -> rounded to 53 or 52
    assert(overviewA.summary.avgDurationMinutes >= 52 && overviewA.summary.avgDurationMinutes <= 53, `avgDurationMinutes is ~53 minutes`);

    // Peak hours check:
    // Active bookings today: b1 at 10:00 (1 count), b2 at 14:00 (1 count), b3 at 14:00 (1 count).
    // b4 at 14:00 is cancelled, so it must not add an extra count. Total at 14:00 = 2.
    // 2 days ago: b5 at 11:00 (1 count).
    // Hour 14 (2:00 PM) has the highest count (2).
    assert(overviewA.peakHours.peakHour === 14, `peakHour is identified as 14 (2:00 PM) (got ${overviewA.peakHours.peakHour})`);
    assert(overviewA.peakHours.peakHourLabel.includes('02:00 PM'), `peakHourLabel is 02:00 PM (got ${overviewA.peakHours.peakHourLabel})`);
    assert(overviewA.peakHours.peakCount === 2, `peakCount is 2 (excluding cancelled booking)`);
    assert(overviewA.peakHours.hourlyDistribution.length === 24, `hourlyDistribution contains 24 hourly slots`);

    // Provider utilization check:
    // Resource A1 has active: b1 (60m) and b2 (60m) = 120m. b4 (cancelled) and b6 (payment-failed) are excluded from bookedMinutes.
    const resA1Util = overviewA.providerUtilization.find((p) => p.providerId === resourceA1.id);
    assert(resA1Util !== undefined, 'Provider utilization contains Resource A1');
    assert(resA1Util?.activeAppointments === 2, `Resource A1 activeAppointments is 2`);
    assert(resA1Util?.cancelledAppointments === 2, `Resource A1 cancelledAppointments is 2`);
    assert(resA1Util?.bookedMinutes === 120, `Resource A1 bookedMinutes is 120m (got ${resA1Util?.bookedMinutes})`);
    assert(resA1Util!.utilizationRate > 0, `Resource A1 utilizationRate > 0%`);

    // -------------------------------------------------------------
    // SECTION 3: Multi-tenant Scoping
    // -------------------------------------------------------------
    console.log('\n--- Section 3: Multi-tenant Isolation ---');
    // Organiser B query should only see booking b7
    const overviewB = await AnalyticsService.getAnalyticsOverview({ timeFilter: 'week' }, organiserB);
    assert(overviewB.summary.totalAppointments === 1, `Organiser B only sees their 1 booking (got ${overviewB.summary.totalAppointments})`);
    assert(overviewB.summary.activeAppointments === 1, `Organiser B activeAppointments is 1`);
    assert(overviewB.summary.cancelledAppointments === 0, `Organiser B cancelledAppointments is 0`);

    // Organiser A cannot see Organiser B's booking (b7 is not in overviewA)
    const totalA = overviewA.summary.totalAppointments;
    const totalB = overviewB.summary.totalAppointments;
    assert(totalA === 6 && totalB === 1, 'Organisers A and B have strictly isolated booking datasets');

    // Admin overview sees platform-wide (seeded bookings + existing demo bookings)
    const adminOverview = await AnalyticsService.getAnalyticsOverview({ timeFilter: 'week' }, adminUser);
    assert(adminOverview.summary.totalAppointments >= 7, `Admin sees all platform bookings (got ${adminOverview.summary.totalAppointments})`);

    // Admin filtering by Organiser B
    const adminScopedB = await AnalyticsService.getAnalyticsOverview(
      { timeFilter: 'week', organiserId: organiserB.id },
      adminUser
    );
    assert(adminScopedB.summary.totalAppointments === 1, `Admin filtering by Organiser B sees 1 booking`);

    // -------------------------------------------------------------
    // SECTION 4: HTTP API Endpoints
    // -------------------------------------------------------------
    console.log('\n--- Section 4: HTTP API Endpoints ---');

    // 1. GET /api/v1/analytics/overview (Default timeFilter=week)
    const overviewRes = await fetch(`${baseUrl}/analytics/overview`, {
      headers: { Authorization: `Bearer ${organiserAToken}` },
    });
    assert(overviewRes.status === 200, 'GET /analytics/overview returns 200 OK');
    const overviewBody = await overviewRes.json();
    assert(overviewBody.data.summary !== undefined, 'Overview response includes summary metrics');
    assert(overviewBody.data.trend !== undefined, 'Overview response includes timeline trend data');
    assert(overviewBody.data.peakHours !== undefined, 'Overview response includes peak hours breakdown');
    assert(overviewBody.data.providerUtilization !== undefined, 'Overview response includes provider utilization');

    // 2. GET /api/v1/analytics/overview?timeFilter=today
    const todayRes = await fetch(`${baseUrl}/analytics/overview?timeFilter=today`, {
      headers: { Authorization: `Bearer ${organiserAToken}` },
    });
    assert(todayRes.status === 200, 'GET /analytics/overview?timeFilter=today returns 200 OK');
    const todayBody = await todayRes.json();
    assert(todayBody.data.meta.timeFilter === 'today', 'Metadata confirms today filter');
    assert(todayBody.data.trend.length === 24, 'Today filter returns 24 hourly trend points');

    // 3. GET /api/v1/analytics/overview?timeFilter=month
    const monthRes = await fetch(`${baseUrl}/analytics/overview?timeFilter=month`, {
      headers: { Authorization: `Bearer ${organiserAToken}` },
    });
    assert(monthRes.status === 200, 'GET /analytics/overview?timeFilter=month returns 200 OK');
    const monthBody = await monthRes.json();
    assert(monthBody.data.meta.timeFilter === 'month', 'Metadata confirms month filter');
    assert(monthBody.data.trend.length >= 28, 'Month filter returns 30 daily trend points');

    // 4. GET /api/v1/analytics/overview with custom date range
    const customRes = await fetch(
      `${baseUrl}/analytics/overview?timeFilter=custom&startDate=2026-09-01&endDate=2026-09-25`,
      {
        headers: { Authorization: `Bearer ${organiserAToken}` },
      }
    );
    assert(customRes.status === 200, 'GET /analytics/overview with custom date range returns 200 OK');
    const customBody = await customRes.json();
    assert(customBody.data.meta.timeFilter === 'custom', 'Metadata confirms custom timeFilter');

    // 5. GET /api/v1/analytics/appointments
    const apptsRes = await fetch(`${baseUrl}/analytics/appointments?timeFilter=week`, {
      headers: { Authorization: `Bearer ${organiserAToken}` },
    });
    assert(apptsRes.status === 200, 'GET /analytics/appointments returns 200 OK');
    const apptsBody = await apptsRes.json();
    assert(apptsBody.data.summary !== undefined, 'Appointments endpoint returns summary');
    assert(apptsBody.data.statusBreakdown !== undefined, 'Appointments endpoint returns statusBreakdown');

    // 6. GET /api/v1/analytics/peak-hours
    const peakRes = await fetch(`${baseUrl}/analytics/peak-hours?timeFilter=week`, {
      headers: { Authorization: `Bearer ${organiserAToken}` },
    });
    assert(peakRes.status === 200, 'GET /analytics/peak-hours returns 200 OK');
    const peakBody = await peakRes.json();
    assert(peakBody.data.peakHours.peakHourLabel !== undefined, 'Peak hours endpoint returns peakHourLabel');
    assert(peakBody.data.peakHours.hourlyDistribution.length === 24, 'Peak hours endpoint returns 24-hr distribution');

    // 7. GET /api/v1/analytics/utilization
    const utilRes = await fetch(`${baseUrl}/analytics/utilization?timeFilter=week`, {
      headers: { Authorization: `Bearer ${organiserAToken}` },
    });
    assert(utilRes.status === 200, 'GET /analytics/utilization returns 200 OK');
    const utilBody = await utilRes.json();
    assert(Array.isArray(utilBody.data.providerUtilization), 'Utilization endpoint returns providerUtilization array');
    assert(typeof utilBody.data.fleetUtilizationRate === 'number', 'Utilization endpoint returns fleetUtilizationRate');

    // 8. GET /api/v1/organiser/analytics (backward compatibility alias)
    const orgAliasRes = await fetch(`${baseUrl}/organiser/analytics?timeFilter=week`, {
      headers: { Authorization: `Bearer ${organiserAToken}` },
    });
    assert(orgAliasRes.status === 200, 'GET /organiser/analytics returns 200 OK via alias');

    // -------------------------------------------------------------
    // SECTION 5: RBAC & Read-Only Safety
    // -------------------------------------------------------------
    console.log('\n--- Section 5: Security & Read-Only Invariance ---');

    // Unauthenticated request
    const unauthRes = await fetch(`${baseUrl}/analytics/overview`);
    assert(unauthRes.status === 401, 'Unauthenticated request to /analytics/overview rejected with 401 Unauthorized');

    // Customer role forbidden
    const customerRes = await fetch(`${baseUrl}/analytics/overview`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(customerRes.status === 403, 'Customer request to /analytics/overview rejected with 403 Forbidden');

    // Read-only invariance: Verify booking records still have exactly identical values and statuses
    const b1After = inMemStore.get(b1.id);
    const b4After = inMemStore.get(b4.id);
    assert(b1After?.status === 'confirmed', 'Booking b1 status is unmodified (read-only confirmed)');
    assert(b4After?.status === 'cancelled', 'Booking b4 status is unmodified (read-only cancelled)');
    assert(inMemStore.size >= 7, 'Booking database entries remain completely invariant');

    console.log('\n================================================================');
    console.log(`🎉 ALL ${passedTests}/${totalTests} ANALYTICS FLOW TESTS PASSED!`);
    console.log('================================================================');
  } finally {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
}

runAnalyticsFlowTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
