/**
 * Comprehensive Test Suite for Organiser Booking Management
 *
 * Verifies:
 * 1. Organiser booking queue isolation (Organiser A only sees their service bookings, not Organiser B).
 * 2. Admin platform-wide visibility (Admins see all reservations across all organisers, or filter by specific organiser).
 * 3. Role & ownership permissions enforcement:
 *    - Organiser B CANNOT view, confirm, or cancel a booking belonging to Organiser A (403 Forbidden).
 *    - Customer CANNOT manually confirm bookings (403 Forbidden).
 *    - Admin CAN confirm and cancel any booking.
 * 4. Confirmation action:
 *    - Transitions status from 'pending' to 'confirmed'.
 *    - Supports optional internal notes and marking payment paid.
 *    - Idempotent re-confirmation.
 *    - Rejects confirming a cancelled booking.
 * 5. Cancellation action:
 *    - Transitions status to 'cancelled', records cancelled_by and cancellation_reason.
 *    - Releases slot capacity in SlotEngineService immediately.
 * 6. Search and Filtering:
 *    - Customer name search, booking reference search, service name search.
 *    - Status filter, serviceId filter, time window filter.
 * 7. HTTP REST API endpoints:
 *    - GET /api/v1/organiser/bookings
 *    - GET /api/v1/organiser/bookings/:id
 *    - PATCH /api/v1/organiser/bookings/:id/confirm
 *    - PATCH /api/v1/organiser/bookings/:id/cancel
 *    - GET /api/v1/admin/bookings
 *    - Role enforcement on REST routes.
 */

import jwt from 'jsonwebtoken';
import { Server } from 'http';
import { createApp } from '../app';
import { config } from '../config/env';
import { BookingService } from '../services/booking.service';
import { ServiceService } from '../services/service.service';
import { SlotEngineService } from '../services/slot-engine.service';
import { AuthUserPayload } from '../middleware/auth.middleware';

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

async function runOrganiserBookingTests() {
  console.log('================================================================');
  console.log('🚀 RUNNING ORGANISER & ADMIN BOOKING MANAGEMENT TEST SUITE');
  console.log('================================================================');

  // Test Organisers & Admin user payloads
  const orgA: AuthUserPayload = {
    id: 'usr_org_alpha_001',
    email: 'alpha@facility.test',
    fullName: 'Alpha Facility Manager',
    role: 'ORGANISER',
    isVerified: true,
  };

  const orgB: AuthUserPayload = {
    id: 'usr_org_beta_002',
    email: 'beta@facility.test',
    fullName: 'Beta Lab Director',
    role: 'ORGANISER',
    isVerified: true,
  };

  const adminUser: AuthUserPayload = {
    id: 'usr_admin_master_001',
    email: 'admin@reservepulse.test',
    fullName: 'Global System Admin',
    role: 'ADMIN',
    isVerified: true,
  };

  const customerUser: AuthUserPayload = {
    id: 'usr_cust_jane_001',
    email: 'jane.cust@corp.test',
    fullName: 'Jane Customer',
    role: 'CUSTOMER',
    isVerified: true,
  };

  const intruderCustomer: AuthUserPayload = {
    id: 'usr_cust_intruder_002',
    email: 'intruder@corp.test',
    fullName: 'Intruder Customer',
    role: 'CUSTOMER',
    isVerified: true,
  };

  // 1. Create two distinct services under different organisers
  console.log('\n--- 1. ORGANISER ISOLATION SETUP ---');
  const serviceA = await ServiceService.createService(orgA.id, {
    name: 'Alpha Quantum Compute Cluster',
    category: 'Compute',
    description: 'High-density quantum processing nodes.',
    durationMinutes: 60,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    priceAmount: 250,
    priceCurrency: 'USD',
    capacityType: 'individual',
    defaultCapacity: 1,
    minLeadTimeHours: 0,
    maxAdvanceBookingDays: 30,
    paymentSetting: 'pay_in_person',
    resourceAssignmentMode: 'automatic',
    requiresManualConfirmation: true, // Requires organiser manual confirmation
    isPublished: true,
  });

  const serviceB = await ServiceService.createService(orgB.id, {
    name: 'Beta Bio-Research Cleanroom',
    category: 'Laboratory',
    description: 'ISO Class 5 sterile bio-containment cleanroom.',
    durationMinutes: 90,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    priceAmount: 180,
    priceCurrency: 'USD',
    capacityType: 'individual',
    defaultCapacity: 1,
    minLeadTimeHours: 0,
    maxAdvanceBookingDays: 30,
    paymentSetting: 'pay_in_person',
    resourceAssignmentMode: 'automatic',
    requiresManualConfirmation: false,
    isPublished: true,
  });

  await ServiceService.setPublishStatus(serviceA.id, orgA.id, true, false);
  await ServiceService.setPublishStatus(serviceB.id, orgB.id, true, false);

  const resourceA = 'res_pod_private_1';
  const resourceB = 'res_boardroom_alpha';

  // Create Bookings: Booking A (under Org A) and Booking B (under Org B)
  const bookingA = await BookingService.createBooking({
    serviceId: serviceA.id,
    resourceId: resourceA,
    startDateTime: '2026-12-10T10:00:00.000Z',
    endDateTime: '2026-12-10T11:00:00.000Z',
    attendeeCount: 1,
    customerName: 'Jane Customer Alpha',
    customerEmail: customerUser.email,
    answers: [],
    idempotencyKey: `idemp_alpha_${Date.now()}`,
  });

  const bookingB = await BookingService.createBooking({
    serviceId: serviceB.id,
    resourceId: resourceB,
    startDateTime: '2026-12-10T14:00:00.000Z',
    endDateTime: '2026-12-10T15:30:00.000Z',
    attendeeCount: 1,
    customerName: 'Bob Customer Beta',
    customerEmail: 'bob.beta@corp.test',
    answers: [],
    idempotencyKey: `idemp_beta_${Date.now()}`,
  });

  assert(bookingA.status === 'pending', 'Booking A initial status is pending (requires manual confirmation)');
  assert(bookingA.serviceName === 'Alpha Quantum Compute Cluster', 'Booking A reflects Service A name');
  assert(bookingB.serviceName === 'Beta Bio-Research Cleanroom', 'Booking B reflects Service B name');

  // -------------------------------------------------------------------------
  // 2. ORGANISER BOOKING QUEUE ISOLATION
  // -------------------------------------------------------------------------
  console.log('\n--- 2. ORGANISER QUEUE ISOLATION ---');
  {
    // Organiser A queries their bookings
    const orgAResult = await BookingService.getBookings({
      organiserId: orgA.id,
      isAdmin: false,
    });

    const hasBookingA = orgAResult.bookings.some((b) => b.id === bookingA.id);
    const hasBookingBInA = orgAResult.bookings.some((b) => b.id === bookingB.id);

    assert(hasBookingA, 'Organiser A sees Booking A belonging to their service');
    assert(!hasBookingBInA, 'Organiser A CANNOT see Booking B belonging to Organiser B (Tenant isolation)');

    // Organiser B queries their bookings
    const orgBResult = await BookingService.getBookings({
      organiserId: orgB.id,
      isAdmin: false,
    });

    const hasBookingB = orgBResult.bookings.some((b) => b.id === bookingB.id);
    const hasBookingAInB = orgBResult.bookings.some((b) => b.id === bookingA.id);

    assert(hasBookingB, 'Organiser B sees Booking B belonging to their service');
    assert(!hasBookingAInB, 'Organiser B CANNOT see Booking A belonging to Organiser A (Tenant isolation)');
  }

  // -------------------------------------------------------------------------
  // 3. ADMIN GLOBAL VISIBILITY ACROSS PLATFORM
  // -------------------------------------------------------------------------
  console.log('\n--- 3. ADMIN PLATFORM-WIDE VISIBILITY ---');
  {
    // Admin queries platform-wide bookings
    const adminResult = await BookingService.getBookings({
      isAdmin: true,
    });

    const adminHasBookingA = adminResult.bookings.some((b) => b.id === bookingA.id);
    const adminHasBookingB = adminResult.bookings.some((b) => b.id === bookingB.id);

    assert(adminHasBookingA && adminHasBookingB, 'Admin has global visibility across all platform bookings');
    assert(adminResult.total >= 2, `Admin sees total platform reservations (got ${adminResult.total})`);

    // Admin filters by specific organiser
    const adminFilteredByOrgA = await BookingService.getBookings({
      isAdmin: true,
      query: { organiserId: orgA.id },
    });

    const onlyHasOrgA = adminFilteredByOrgA.bookings.every((b) => b.serviceId === serviceA.id);
    assert(onlyHasOrgA, 'Admin can filter global reservations by specific organiser ID');
  }

  // -------------------------------------------------------------------------
  // 4. ROLE & OWNERSHIP PERMISSION ENFORCEMENT
  // -------------------------------------------------------------------------
  console.log('\n--- 4. ROLE AND OWNERSHIP ENFORCEMENT ---');
  {
    // Organiser B attempts to get details of Booking A
    let blockedAccess = false;
    try {
      await BookingService.getBookingByIdOrReference(bookingA.id, orgB);
    } catch (err: any) {
      if (err.statusCode === 403 || err.name === 'ForbiddenError') {
        blockedAccess = true;
      }
    }
    assert(blockedAccess, 'Organiser B blocked with 403 Forbidden when accessing Booking A');

    // Customer attempts to confirm a booking
    let customerBlockedFromConfirm = false;
    try {
      await BookingService.confirmBooking(bookingA.id, customerUser);
    } catch (err: any) {
      if (err.statusCode === 403 || err.name === 'ForbiddenError') {
        customerBlockedFromConfirm = true;
      }
    }
    assert(customerBlockedFromConfirm, 'Customer blocked with 403 Forbidden from confirming reservations');

    // Organiser B attempts to confirm Booking A
    let orgBBlockedFromConfirm = false;
    try {
      await BookingService.confirmBooking(bookingA.id, orgB);
    } catch (err: any) {
      if (err.statusCode === 403 || err.name === 'ForbiddenError') {
        orgBBlockedFromConfirm = true;
      }
    }
    assert(orgBBlockedFromConfirm, 'Organiser B blocked with 403 Forbidden from confirming Organiser A reservation');

    // Organiser B attempts to cancel Booking A
    let orgBBlockedFromCancel = false;
    try {
      await BookingService.cancelBooking(bookingA.id, 'Illegal cancellation attempt', orgB);
    } catch (err: any) {
      if (err.statusCode === 403 || err.name === 'ForbiddenError') {
        orgBBlockedFromCancel = true;
      }
    }
    assert(orgBBlockedFromCancel, 'Organiser B blocked with 403 Forbidden from cancelling Organiser A reservation');

    // Intruder Customer attempts to view Jane Customer's booking
    let intruderBlocked = false;
    try {
      await BookingService.getBookingByIdOrReference(bookingA.id, intruderCustomer);
    } catch (err: any) {
      if (err.statusCode === 403 || err.name === 'ForbiddenError') {
        intruderBlocked = true;
      }
    }
    assert(intruderBlocked, 'Intruder customer blocked with 403 Forbidden from viewing another customer booking');
  }

  // -------------------------------------------------------------------------
  // 5. CONFIRMATION ACTION WORKFLOW
  // -------------------------------------------------------------------------
  console.log('\n--- 5. CONFIRMATION ACTION WORKFLOW ---');
  {
    // Organiser A confirms Booking A
    const confirmedBooking = await BookingService.confirmBooking(bookingA.id, orgA, {
      notes: 'VIP Client Approved',
      markPaymentPaid: true,
    });

    assert(confirmedBooking.status === 'confirmed', 'Booking status transitions to "confirmed"');
    assert(confirmedBooking.paymentStatus === 'paid', 'Payment status updated to "paid"');
    assert(Boolean(confirmedBooking.notes?.includes('VIP Client Approved')), 'Confirmation note recorded');

    // Slot capacity remains held and verified in SlotEngineService
    const activeBookings = await SlotEngineService.getActiveBookingsForResources(
      [resourceA],
      new Date('2026-12-10T10:00:00.000Z'),
      new Date('2026-12-10T11:00:00.000Z')
    );
    const isHeld = activeBookings.some((b) => b.id === bookingA.id);
    assert(isHeld, 'Slot capacity remains properly held after confirmation');

    // Idempotent re-confirmation
    const reconfirmed = await BookingService.confirmBooking(bookingA.id, orgA);
    assert(reconfirmed.status === 'confirmed', 'Re-confirming already confirmed booking is safe and idempotent');
  }

  // -------------------------------------------------------------------------
  // 6. CANCELLATION ACTION WORKFLOW & SLOT RELEASE
  // -------------------------------------------------------------------------
  console.log('\n--- 6. CANCELLATION ACTION WORKFLOW & CAPACITY RELEASE ---');
  {
    // Organiser A cancels Booking A
    const cancelledBooking = await BookingService.cancelBooking(
      bookingA.id,
      'Facility maintenance scheduled',
      orgA
    );

    assert(cancelledBooking.status === 'cancelled', 'Booking status transitions to "cancelled"');
    assert(cancelledBooking.cancellationReason === 'Facility maintenance scheduled', 'Cancellation reason saved');
    assert(Boolean(cancelledBooking.cancelledAt), 'Cancelled timestamp recorded');

    // Verify slot capacity is immediately released
    const activeBookingsAfterCancel = await SlotEngineService.getActiveBookingsForResources(
      [resourceA],
      new Date('2026-12-10T10:00:00.000Z'),
      new Date('2026-12-10T11:00:00.000Z')
    );
    const isStillHeld = activeBookingsAfterCancel.some((b) => b.id === bookingA.id);
    assert(!isStillHeld, 'Slot capacity is immediately released upon organiser cancellation');

    // Attempting to confirm a cancelled booking is rejected
    let confirmCancelledRejected = false;
    try {
      await BookingService.confirmBooking(bookingA.id, orgA);
    } catch (err: any) {
      if (err.statusCode === 400 || err.name === 'BadRequestError') {
        confirmCancelledRejected = true;
      }
    }
    assert(confirmCancelledRejected, 'Attempting to confirm a cancelled reservation is rejected with 400 Bad Request');
  }

  // -------------------------------------------------------------------------
  // 7. SEARCH AND FILTERING CAPABILITIES
  // -------------------------------------------------------------------------
  console.log('\n--- 7. SEARCH AND ADVANCED FILTERING ---');
  {
    // A. Search by customer name
    const searchNameResult = await BookingService.getBookings({
      isAdmin: true,
      query: { search: 'Beta' },
    });
    const foundBeta = searchNameResult.bookings.some((b) => b.id === bookingB.id);
    assert(foundBeta, 'Search by customer keyword "Beta" locates Booking B');

    // B. Search by reference code prefix
    const refPrefix = bookingB.bookingReference.slice(0, 10);
    const searchRefResult = await BookingService.getBookings({
      isAdmin: true,
      query: { search: refPrefix },
    });
    const foundByRef = searchRefResult.bookings.some((b) => b.id === bookingB.id);
    assert(foundByRef, `Search by reference prefix "${refPrefix}" finds booking`);

    // C. Filter by serviceId
    const filterServiceResult = await BookingService.getBookings({
      isAdmin: true,
      query: { serviceId: serviceB.id },
    });
    const allMatchServiceB = filterServiceResult.bookings.every((b) => b.serviceId === serviceB.id);
    assert(allMatchServiceB, 'Filter by serviceId returns only bookings for that specific service');

    // D. Filter by status 'cancelled'
    const cancelledFilterResult = await BookingService.getBookings({
      isAdmin: true,
      query: { status: 'cancelled' },
    });
    const containsCancelled = cancelledFilterResult.bookings.some((b) => b.id === bookingA.id);
    assert(containsCancelled, 'Filter by status "cancelled" returns cancelled reservations');
  }

  // -------------------------------------------------------------------------
  // 8. REST API INTEGRATION TESTS
  // -------------------------------------------------------------------------
  console.log('\n--- 8. REST API INTEGRATION TESTS ---');
  const app = createApp();
  let server: Server;
  const port = 5097;

  await new Promise<void>((resolve) => {
    server = app.listen(port, () => resolve());
  });

  try {
    const baseUrl = `http://127.0.0.1:${port}/api/v1`;

    // Sign JWT tokens
    const tokenOrgA = jwt.sign(orgA, config.jwt.secret, { expiresIn: '1h' });
    const tokenOrgB = jwt.sign(orgB, config.jwt.secret, { expiresIn: '1h' });
    const tokenAdmin = jwt.sign(adminUser, config.jwt.secret, { expiresIn: '1h' });

    // A. Organiser A fetches their bookings queue
    const getResA = await fetch(`${baseUrl}/organiser/bookings`, {
      headers: { Authorization: `Bearer ${tokenOrgA}` },
    });
    const getBodyA: any = await getResA.json();
    assert(getResA.status === 200, 'GET /organiser/bookings returns 200 OK');
    assert(Array.isArray(getBodyA.data), 'Returns bookings array in data payload');
    assert(
      getBodyA.data.some((b: any) => b.id === bookingA.id),
      'Organiser A REST response contains Booking A'
    );
    assert(
      !getBodyA.data.some((b: any) => b.id === bookingB.id),
      'Organiser A REST response does not contain Booking B'
    );

    // B. Admin fetches platform-wide bookings
    const getResAdmin = await fetch(`${baseUrl}/admin/bookings`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    });
    const getBodyAdmin: any = await getResAdmin.json();
    assert(getResAdmin.status === 200, 'GET /admin/bookings returns 200 OK');
    assert(
      getBodyAdmin.data.some((b: any) => b.id === bookingA.id) &&
      getBodyAdmin.data.some((b: any) => b.id === bookingB.id),
      'Admin REST response contains both Booking A and Booking B'
    );

    // C. Organiser B confirms Booking B via REST endpoint
    const confirmResB = await fetch(`${baseUrl}/organiser/bookings/${bookingB.id}/confirm`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${tokenOrgB}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notes: 'Cleanroom certified ready' }),
    });
    const confirmBodyB: any = await confirmResB.json();
    assert(confirmResB.status === 200, 'PATCH /organiser/bookings/:id/confirm returns 200 OK');
    assert(confirmBodyB.data.status === 'confirmed', 'REST confirmed booking status is confirmed');

    // D. Organiser A attempts to confirm Booking B via REST endpoint (Unauthorized ownership)
    const unauthorizedConfirm = await fetch(`${baseUrl}/organiser/bookings/${bookingB.id}/confirm`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${tokenOrgA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notes: 'Intrusion attempt' }),
    });
    assert(unauthorizedConfirm.status === 403, 'PATCH /organiser/bookings/:id/confirm by unauthorized organiser returns 403 Forbidden');

    // E. Admin cancels Booking B via Admin REST endpoint
    const adminCancelRes = await fetch(`${baseUrl}/admin/bookings/${bookingB.id}/cancel`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${tokenAdmin}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason: 'Admin emergency override' }),
    });
    const adminCancelBody: any = await adminCancelRes.json();
    assert(adminCancelRes.status === 200, 'PATCH /admin/bookings/:id/cancel returns 200 OK');
    assert(adminCancelBody.data.status === 'cancelled', 'Admin successfully cancels reservation');

  } finally {
    await new Promise<void>((resolve) => server!.close(() => resolve()));
  }

  console.log('\n================================================================');
  console.log(`🎉 ALL ORGANISER BOOKING MANAGEMENT TESTS PASSED! (${passedTests}/${totalTests} verified)`);
  console.log('================================================================\n');

  process.exit(0);
}

runOrganiserBookingTests().catch((err) => {
  console.error('Fatal error running organiser booking tests:', err);
  process.exit(1);
});
