import { BookingService } from '../services/booking.service';
import { SlotUnavailableError, ConflictError } from '../utils/errors';
import { createApp } from '../app';
import type { Server } from 'http';

/**
 * Concurrency & Anti-Double-Booking Test Suite for ReservePulse
 * 
 * Verifies:
 * 1. Parallel 1-capacity slot contention: 10 parallel requests -> exactly 1 succeeds, 9 fail with SLOT_UNAVAILABLE.
 * 2. Capacity overrun protection: 6 parallel requests requesting 2 seats on a 4-capacity slot -> exactly 2 succeed (4 seats), 4 fail with SLOT_UNAVAILABLE.
 * 3. Buffer overlap concurrency protection: Two simultaneous requests colliding on buffer zones -> exactly 1 succeeds.
 * 4. Duplicate submission / idempotency key concurrency protection: 5 identical parallel requests -> exactly 1 booking recorded.
 * 5. Full HTTP REST API End-to-End concurrency: 8 parallel HTTP POST /api/v1/bookings -> exactly 1 HTTP 201, 7 HTTP 409 Conflict with code SLOT_UNAVAILABLE.
 */
async function runBookingConcurrencyTests() {
  console.log('================================================================');
  console.log('⚡ ReservePulse Booking Concurrency & Anti-Double-Booking Suite');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: unknown) {
    totalTests++;
    if (!condition) {
      console.error(`❌ FAILED: ${testName}`, details || '');
      throw new Error(`Test failed: ${testName}`);
    }
    passedTests++;
    console.log(`✓ [${passedTests}] ${testName}`);
  }

  // -------------------------------------------------------------------------
  // TEST SUITE 1: 1-SEAT CAPACITY RACE (10 PARALLEL REQUESTS)
  // -------------------------------------------------------------------------
  console.log('--- 1. PARALLEL 1-SEAT CONTENTION (ANTI-DOUBLE-BOOKING) ---');
  {
    const serviceId = 'srv_suite_002'; // Executive Architecture Suite (capacity: 1)
    const resourceId = 'res_pod_private_1'; // Private Pod (capacity: 1)
    const slotTime = '2026-11-20T10:00:00.000Z';
    const slotEndTime = '2026-11-20T10:45:00.000Z';

    const numContenders = 10;
    console.log(`Firing ${numContenders} simultaneous booking requests for 1-capacity slot...`);

    const promises = Array.from({ length: numContenders }, (_, i) => {
      return BookingService.createBooking({
        serviceId,
        resourceId,
        startDateTime: slotTime,
        endDateTime: slotEndTime,
        attendeeCount: 1,
        customerName: `Contender ${i + 1}`,
        customerEmail: `contender_${i + 1}_${Date.now()}@reservepulse.test`,
        notes: `Concurrency race test attempt #${i + 1}`,
        idempotencyKey: `idemp_race_1_${i}_${Date.now()}`,
        answers: [
          {
            questionId: 'qst_suite_001',
            answerText: `Test Project ${i + 1}`,
          },
        ],
      })
        .then((res) => ({ success: true, data: res, error: null }))
        .catch((err) => ({ success: false, data: null, error: err }));
    });

    const results = await Promise.all(promises);

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    assert(
      successful.length === 1,
      `Exactly 1 booking must succeed out of ${numContenders} concurrent requests (got ${successful.length})`
    );

    assert(
      failed.length === numContenders - 1,
      `Exactly ${numContenders - 1} bookings must fail with conflict (got ${failed.length})`
    );

    // Verify all failures are SlotUnavailableError with 409 status & SLOT_UNAVAILABLE code
    const slotUnavailableErrors = failed.filter(
      (f) =>
        f.error instanceof SlotUnavailableError ||
        f.error?.code === 'SLOT_UNAVAILABLE' ||
        f.error?.statusCode === 409
    );

    assert(
      slotUnavailableErrors.length === numContenders - 1,
      `All ${numContenders - 1} failed requests must return SlotUnavailableError (code: SLOT_UNAVAILABLE, status: 409)`
    );

    const winningBooking = successful[0].data!;
    assert(
      !!winningBooking.bookingReference && winningBooking.bookingReference.startsWith('BK-'),
      `Winning booking received valid reference: ${winningBooking.bookingReference}`
    );
  }

  // -------------------------------------------------------------------------
  // TEST SUITE 2: CAPACITY OVERRUN ON MULTI-ATTENDEE GROUP SLOTS
  // -------------------------------------------------------------------------
  console.log('\n--- 2. CAPACITY OVERRUN PROTECTION (GROUP SLOTS) ---');
  {
    // srv_comp_001 has maxCapacity = 4
    const serviceId = 'srv_comp_001';
    const resourceId = 'res_h100_node1';
    const slotTime = '2026-11-21T14:00:00.000Z';
    const slotEndTime = '2026-11-21T15:00:00.000Z';

    // 6 parallel contenders, each requesting 2 seats (total 12 seats requested for 4-capacity slot)
    const numContenders = 6;
    console.log(`Firing ${numContenders} requests (2 seats each = 12 seats) for a 4-capacity slot...`);

    const promises = Array.from({ length: numContenders }, (_, i) => {
      return BookingService.createBooking({
        serviceId,
        resourceId,
        startDateTime: slotTime,
        endDateTime: slotEndTime,
        attendeeCount: 2,
        customerName: `Group Contender ${i + 1}`,
        customerEmail: `group_contender_${i + 1}_${Date.now()}@reservepulse.test`,
        notes: `Group capacity race test attempt #${i + 1}`,
        idempotencyKey: `idemp_group_${i}_${Date.now()}`,
        answers: [
          {
            questionId: 'qst_comp_001',
            answerText: 'PyTorch Distributed',
          },
          {
            questionId: 'qst_comp_003',
            answerText: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIExampleKey',
          },
        ],
      })
        .then((res) => ({ success: true, data: res, error: null }))
        .catch((err) => ({ success: false, data: null, error: err }));
    });

    const results = await Promise.all(promises);

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    assert(
      successful.length === 2,
      `Exactly 2 requests must succeed (2 x 2 seats = 4 seats, full capacity) (got ${successful.length})`
    );

    assert(
      failed.length === 4,
      `Remaining 4 requests must be rejected for capacity overrun (got ${failed.length})`
    );

    for (const f of failed) {
      assert(
        f.error instanceof SlotUnavailableError || f.error?.code === 'SLOT_UNAVAILABLE',
        `Capacity overrun rejected with SLOT_UNAVAILABLE: ${f.error?.message}`
      );
    }
  }

  // -------------------------------------------------------------------------
  // TEST SUITE 3: BUFFER OVERLAP CONCURRENCY
  // -------------------------------------------------------------------------
  console.log('\n--- 3. BUFFER OVERLAP CONCURRENCY PROTECTION ---');
  {
    // Service srv_suite_002 has bufferBefore: 15m, bufferAfter: 15m, capacity: 1
    const serviceId = 'srv_suite_002';
    const resourceId = 'res_pod_private_1';

    // Request 1: 11:00 - 11:45 (footprint 10:45 - 12:00)
    // Request 2: 11:50 - 12:35 (footprint 11:35 - 12:50) -> Collides with Request 1's buffer!
    const req1Time = '2026-11-22T11:00:00.000Z';
    const req1EndTime = '2026-11-22T11:45:00.000Z';

    const req2Time = '2026-11-22T11:50:00.000Z';
    const req2EndTime = '2026-11-22T12:35:00.000Z';

    console.log('Firing 2 simultaneous booking requests colliding on service buffer boundaries...');

    const [res1, res2] = await Promise.all([
      BookingService.createBooking({
        serviceId,
        resourceId,
        startDateTime: req1Time,
        endDateTime: req1EndTime,
        attendeeCount: 1,
        customerName: 'Buffer Client 1',
        customerEmail: `buf1_${Date.now()}@reservepulse.test`,
        idempotencyKey: `idemp_buf_1_${Date.now()}`,
        answers: [{ questionId: 'qst_suite_001', answerText: 'Buffer Test 1' }],
      })
        .then((r) => ({ success: true, data: r, error: null }))
        .catch((e) => ({ success: false, data: null, error: e })),
      BookingService.createBooking({
        serviceId,
        resourceId,
        startDateTime: req2Time,
        endDateTime: req2EndTime,
        attendeeCount: 1,
        customerName: 'Buffer Client 2',
        customerEmail: `buf2_${Date.now()}@reservepulse.test`,
        idempotencyKey: `idemp_buf_2_${Date.now()}`,
        answers: [{ questionId: 'qst_suite_001', answerText: 'Buffer Test 2' }],
      })
        .then((r) => ({ success: true, data: r, error: null }))
        .catch((e) => ({ success: false, data: null, error: e })),
    ]);

    const successes = [res1, res2].filter((r) => r.success);
    const conflicts = [res1, res2].filter((r) => !r.success);

    assert(
      successes.length === 1 && conflicts.length === 1,
      'Buffer collision correctly serialized: exactly 1 booking allowed, 1 rejected'
    );
  }

  // -------------------------------------------------------------------------
  // TEST SUITE 4: DUPLICATE SUBMISSION & IDEMPOTENCY PROTECTION
  // -------------------------------------------------------------------------
  console.log('\n--- 4. DUPLICATE SUBMISSIONS & IDEMPOTENCY CONCURRENCY ---');
  {
    const serviceId = 'srv_suite_002';
    const resourceId = 'res_staff_jordan';
    const slotTime = '2026-11-23T15:00:00.000Z';
    const slotEndTime = '2026-11-23T15:45:00.000Z';
    const sharedIdempotencyKey = `idemp_dup_${Date.now()}`;

    console.log('Firing 5 identical requests concurrently with the same idempotency key...');

    const promises = Array.from({ length: 5 }, () => {
      return BookingService.createBooking({
        serviceId,
        resourceId,
        startDateTime: slotTime,
        endDateTime: slotEndTime,
        attendeeCount: 1,
        customerName: 'Repeated Submitter',
        customerEmail: 'duplicate_user@reservepulse.test',
        idempotencyKey: sharedIdempotencyKey,
        answers: [{ questionId: 'qst_suite_001', answerText: 'System Arch' }],
      })
        .then((res) => ({ success: true, data: res, error: null }))
        .catch((err) => ({ success: false, data: null, error: err }));
    });

    const results = await Promise.all(promises);
    const successful = results.filter((r) => r.success);
    const inFlightConflicts = results.filter((r) => !r.success);

    assert(successful.length >= 1, `At least one request succeeded (got ${successful.length})`);
    const firstRef = successful[0].data!.bookingReference;
    for (const s of successful) {
      assert(
        s.data!.bookingReference === firstRef,
        `Duplicate requests share identical reference (${firstRef})`
      );
    }

    for (const f of inFlightConflicts) {
      assert(
        f.error instanceof ConflictError || f.error?.statusCode === 409,
        `In-flight duplicate intercepted cleanly: ${f.error?.message}`
      );
    }
  }

  // -------------------------------------------------------------------------
  // TEST SUITE 5: HTTP REST API END-TO-END CONCURRENCY
  // -------------------------------------------------------------------------
  console.log('\n--- 5. FULL HTTP REST API END-TO-END CONCURRENCY (EXPRESS APP) ---');
  {
    const app = createApp();
    const server: Server = await new Promise((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });

    const port = (server.address() as any).port;
    const baseUrl = `http://127.0.0.1:${port}/api/v1`;

    try {
      const serviceId = 'srv_suite_002';
      const resourceId = 'res_pod_private_1';
      const slotTime = '2026-11-24T16:00:00.000Z';
      const slotEndTime = '2026-11-24T16:45:00.000Z';

      const numHttpClients = 8;
      console.log(`Sending ${numHttpClients} parallel HTTP POST /api/v1/bookings requests to port ${port}...`);

      const httpPromises = Array.from({ length: numHttpClients }, async (_, i) => {
        const response = await fetch(`${baseUrl}/bookings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': `http_idemp_${i}_${Date.now()}`,
          },
          body: JSON.stringify({
            serviceId,
            resourceId,
            startDateTime: slotTime,
            endDateTime: slotEndTime,
            attendeeCount: 1,
            customerName: `HTTP Client ${i + 1}`,
            customerEmail: `http_client_${i + 1}_${Date.now()}@reservepulse.test`,
            notes: `HTTP concurrency test client #${i + 1}`,
            answers: [{ questionId: 'qst_suite_001', answerText: 'API Integration' }],
          }),
        });

        const body = await response.json();
        return {
          status: response.status,
          body,
        };
      });

      const httpResults = await Promise.all(httpPromises);

      const status201s = httpResults.filter((r) => r.status === 201);
      const status409s = httpResults.filter((r) => r.status === 409);

      assert(
        status201s.length === 1,
        `HTTP API: Exactly 1 client received HTTP 201 Created (got ${status201s.length})`
      );

      assert(
        status409s.length === numHttpClients - 1,
        `HTTP API: Exactly ${numHttpClients - 1} clients received HTTP 409 Conflict (got ${status409s.length})`
      );

      const conflictResponse = status409s[0].body;
      assert(
        conflictResponse.success === false,
        'HTTP 409 response has success: false'
      );
      assert(
        conflictResponse.error?.code === 'SLOT_UNAVAILABLE',
        `HTTP 409 error code is SLOT_UNAVAILABLE (got ${conflictResponse.error?.code})`
      );
      assert(
        typeof conflictResponse.message === 'string' &&
          conflictResponse.message.toLowerCase().includes('no longer available'),
        `HTTP 409 message informs slot is no longer available: "${conflictResponse.message}"`
      );
    } finally {
      await new Promise<void>((resolve) => {
        if ('closeAllConnections' in server && typeof server.closeAllConnections === 'function') {
          server.closeAllConnections();
        }
        server.close(() => resolve());
      });
    }
  }

  // -------------------------------------------------------------------------
  // FINAL SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`🎉 ALL CONCURRENCY TESTS PASSED! (${passedTests}/${totalTests} verified)`);
  console.log('================================================================\n');
}

// Execute suite
runBookingConcurrencyTests()
  .then(() => {
    setTimeout(() => {
      process.exit(0);
    }, 100);
  })
  .catch((err) => {
    console.error('\n❌ CONCURRENCY TEST SUITE ENCOUNTERED UNEXPECTED ERROR:');
    console.error(err);
    process.exit(1);
  });
