import { SlotEngineService } from '../services/slot-engine.service';
import { ResourceService } from '../services/resource.service';

/**
 * Unit & Integration Test Suite for Slot-Generation Engine
 * Validates boundaries, overlapping schedules, unavailable resources, capacity, and REST APIs.
 */
async function runSlotEngineTests() {
  console.log('================================================================');
  console.log('🧪 ReservePulse Slot-Generation Engine Verification Suite');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: any) {
    totalTests++;
    if (!condition) {
      console.error(`❌ FAILED: ${testName}`, details || '');
      throw new Error(`Test failed: ${testName}`);
    }
    passedTests++;
    console.log(`✓ [${passedTests}] ${testName}`);
  }

  // Clear any existing test bookings
  SlotEngineService.clearTestBookings();

  // Test target date for deterministic tests: Monday 2026-10-12
  const targetDate = '2026-10-12';
  // Reference time: Monday 2026-10-12 06:00:00 UTC (before standard morning shift starts at 08:00)
  const refTimeMorning = new Date('2026-10-12T06:00:00.000Z');

  // -------------------------------------------------------------------------
  // 1. BOUNDARIES TESTING
  // -------------------------------------------------------------------------
  console.log('\n--- 1. BOUNDARIES TESTING ---');

  // Test 1.1: Exact working hours boundary fit
  // srv_comp_001 (duration 60m, bufferBefore 10m, bufferAfter 15m, totalSpan 85m)
  // res_h100_node1 has working hours. Let's test standard slot generation:
  const availComp = await SlotEngineService.generateSlots({
    serviceId: 'srv_comp_001',
    startDate: targetDate,
    endDate: targetDate,
    referenceTime: refTimeMorning,
  });

  assert(availComp.totalBookableSlots > 0, 'Generates valid slots for active compute service');
  const day1Slots = availComp.days[0].slots;
  assert(day1Slots.length > 0, 'Day contains bookable slots');

  // Verify every slot strictly obeys the duration
  for (const s of day1Slots) {
    assert(s.durationMinutes === 60, `Slot duration must equal service duration (60m), got ${s.durationMinutes}`);
    assert(s.isBookable === true, 'All returned slots must be strictly currently bookable');
    assert(s.status === 'available', 'Slot status must be available');
  }

  // Test 1.2: Past Slots Boundary check
  // Set referenceTime to 14:00 UTC on targetDate: no slots starting <= 14:00 should be returned
  const refTimeAfternoon = new Date('2026-10-12T14:00:00.000Z');
  const availAfternoon = await SlotEngineService.generateSlots({
    serviceId: 'srv_comp_001',
    startDate: targetDate,
    endDate: targetDate,
    referenceTime: refTimeAfternoon,
  });

  for (const s of availAfternoon.days[0].slots) {
    const slotTimeMs = new Date(s.startDateTime).getTime();
    assert(
      slotTimeMs > refTimeAfternoon.getTime(),
      `Slot at ${s.startTime} must strictly start after reference time (14:00)`,
      s
    );
  }

  // Test 1.3: Minimum Lead Time Boundary
  // srv_comp_001 has min_lead_time_hours = 2
  // With refTime at 08:00 UTC, slots starting before 10:00 UTC (8:00 + 2h) must be discarded
  const refTimeLead = new Date('2026-10-12T08:00:00.000Z');
  const availLeadTime = await SlotEngineService.generateSlots({
    serviceId: 'srv_comp_001',
    startDate: targetDate,
    endDate: targetDate,
    referenceTime: refTimeLead,
  });

  const earliestSlotMs = new Date(availLeadTime.days[0].slots[0].startDateTime).getTime();
  const minAllowedMs = refTimeLead.getTime() + 2 * 60 * 60 * 1000;
  assert(
    earliestSlotMs >= minAllowedMs,
    `Earliest slot (${availLeadTime.days[0].slots[0].startTime}) must respect 2h minimum lead time`
  );

  // Test 1.4: Maximum Advance Booking Days Boundary
  // srv_comp_001 has max_advance_booking_days = 30
  // Querying a date 40 days in the future relative to refTime should return 0 slots
  const futureDate = '2026-11-25'; // 44 days ahead of Oct 12
  const availFarFuture = await SlotEngineService.generateSlots({
    serviceId: 'srv_comp_001',
    startDate: futureDate,
    endDate: futureDate,
    referenceTime: refTimeMorning,
  });
  assert(availFarFuture.totalBookableSlots === 0, 'Slots exceeding max_advance_booking_days are excluded');

  // -------------------------------------------------------------------------
  // 2. OVERLAPPING SCHEDULES & BOOKING CONFLICTS
  // -------------------------------------------------------------------------
  console.log('\n--- 2. OVERLAPPING SCHEDULES & CONFLICTS ---');

  // Pick a candidate slot from day1Slots (e.g. res_h100_node1)
  const candidateSlot = day1Slots.find((s) => s.resourceId === 'res_h100_node1');
  assert(Boolean(candidateSlot), 'Found candidate slot for res_h100_node1');
  const targetStartTime = candidateSlot!.startTime;
  const targetStartDateTime = candidateSlot!.startDateTime;
  const targetEndDateTime = candidateSlot!.endDateTime;

  // Test 2.1: Exact overlap booking reduces capacity to 0
  // srv_comp_001 has capacity_type resource_constrained, default_capacity 4
  SlotEngineService.addTestBooking({
    booking_reference: 'bk_test_overlap_exact',
    service_id: 'srv_comp_001',
    resource_id: 'res_h100_node1',
    start_time: new Date(targetStartDateTime),
    end_time: new Date(targetEndDateTime),
    attendee_count: 4, // Fully consumes capacity
    status: 'confirmed',
  });

  const availAfterBooking = await SlotEngineService.generateSlots({
    serviceId: 'srv_comp_001',
    startDate: targetDate,
    endDate: targetDate,
    referenceTime: refTimeMorning,
  });

  const blockedSlot = availAfterBooking.days[0].slots.find(
    (s) => s.startTime === targetStartTime && s.resourceId === 'res_h100_node1'
  );
  assert(blockedSlot === undefined, `Slot at ${targetStartTime} is fully booked and excluded from bookable slots`);

  // Test 2.2: Partial overlap with buffer before
  // srv_comp_001 has bufferBefore = 10m.
  // The next slot's footprint starts 10m before its startTime.
  // Because the booking ends at targetEndDateTime, any slot whose footprint starts before targetEndDateTime collides!
  const nextSlot = day1Slots.find(
    (s) => s.resourceId === 'res_h100_node1' && s.startTime > targetStartTime
  );
  assert(Boolean(nextSlot), 'Found next consecutive slot');
  const nextSlotBlocked = availAfterBooking.days[0].slots.find(
    (s) => s.startTime === nextSlot!.startTime && s.resourceId === 'res_h100_node1'
  );
  assert(
    nextSlotBlocked === undefined,
    `Next consecutive slot at ${nextSlot!.startTime} colliding with buffer is excluded`
  );

  // Test 2.3: Non-colliding slot later in the day remains bookable
  const freeSlot = availAfterBooking.days[0].slots.find(
    (s) => s.resourceId === 'res_h100_node1' && s.startTime >= '16:00'
  );
  assert(Boolean(freeSlot), `Non-overlapping slot at ${freeSlot?.startTime} remains bookable with full capacity`);
  assert(freeSlot?.remainingCapacity === 4, 'Remaining capacity on free slot is 4');

  // Test 2.4: Cancelled booking does NOT block slots
  SlotEngineService.clearTestBookings();
  SlotEngineService.addTestBooking({
    booking_reference: 'bk_test_cancelled',
    service_id: 'srv_comp_001',
    resource_id: 'res_h100_node1',
    start_time: new Date(targetStartDateTime),
    end_time: new Date(targetEndDateTime),
    attendee_count: 4,
    status: 'cancelled', // Cancelled booking
  });

  const availCancelled = await SlotEngineService.generateSlots({
    serviceId: 'srv_comp_001',
    startDate: targetDate,
    endDate: targetDate,
    referenceTime: refTimeMorning,
  });
  const unblockedSlot = availCancelled.days[0].slots.find(
    (s) => s.startTime === targetStartTime && s.resourceId === 'res_h100_node1'
  );
  assert(Boolean(unblockedSlot), `Cancelled bookings do not block slots; ${targetStartTime} slot is bookable`);

  // -------------------------------------------------------------------------
  // 3. UNAVAILABLE RESOURCES TESTING
  // -------------------------------------------------------------------------
  console.log('\n--- 3. UNAVAILABLE RESOURCES TESTING ---');

  // Test 3.1: Inactive / Maintenance resource yields 0 slots
  // res_studio_backup has status = 'inactive'
  const availInactive = await SlotEngineService.generateSlots({
    serviceId: 'srv_comp_001',
    startDate: targetDate,
    endDate: targetDate,
    resourceId: 'res_studio_backup', // Inactive resource
    referenceTime: refTimeMorning,
  });
  assert(availInactive.totalBookableSlots === 0, 'Inactive / maintenance resources produce 0 bookable slots');

  // Test 3.2: Weekend / Off-day availability
  // Boardroom Alpha (assigned to srv_suite_002 or general services)
  // Let's test Sunday (2026-10-18) where res_staff_jordan is off
  const sundayDate = '2026-10-18';
  const availSundayStaff = await SlotEngineService.generateSlots({
    serviceId: 'srv_suite_002',
    startDate: sundayDate,
    endDate: sundayDate,
    resourceId: 'res_staff_jordan',
    referenceTime: new Date('2026-10-18T05:00:00.000Z'),
  });
  assert(availSundayStaff.totalBookableSlots === 0, 'Resource scheduled off on Sunday returns 0 slots');

  // Test 3.3: Specific non-assigned resource yields 0 slots
  const availWrongResource = await SlotEngineService.generateSlots({
    serviceId: 'srv_suite_002',
    startDate: targetDate,
    endDate: targetDate,
    resourceId: 'res_h100_node1', // Compute resource NOT assigned to suite service
    referenceTime: refTimeMorning,
  });
  assert(availWrongResource.totalBookableSlots === 0, 'Unassigned resource for a service returns 0 slots');

  // -------------------------------------------------------------------------
  // 4. CAPACITY & GROUP APPOINTMENTS TESTING
  // -------------------------------------------------------------------------
  console.log('\n--- 4. CAPACITY MANAGEMENT TESTING ---');

  SlotEngineService.clearTestBookings();

  // Test 4.1: Individual service (srv_suite_002) has default_capacity = 1 and capacity_type = 'individual'
  const availIndividual = await SlotEngineService.generateSlots({
    serviceId: 'srv_suite_002',
    startDate: targetDate,
    endDate: targetDate,
    referenceTime: refTimeMorning,
  });
  assert(availIndividual.service.capacityType === 'individual', 'Service capacity type is individual');
  assert(availIndividual.days[0].slots[0].maxCapacity === 1, 'Max capacity is 1 for individual service');

  // Book 1 attendee on first slot of srv_suite_002 (res_pod_private_1)
  const targetSlotIndividual = availIndividual.days[0].slots[0];
  SlotEngineService.addTestBooking({
    booking_reference: 'bk_indiv_01',
    service_id: 'srv_suite_002',
    resource_id: targetSlotIndividual.resourceId,
    start_time: new Date(targetSlotIndividual.startDateTime),
    end_time: new Date(targetSlotIndividual.endDateTime),
    attendee_count: 1,
    status: 'confirmed',
  });

  const availIndividualAfter = await SlotEngineService.generateSlots({
    serviceId: 'srv_suite_002',
    startDate: targetDate,
    endDate: targetDate,
    referenceTime: refTimeMorning,
  });
  const bookedSlotCheck = availIndividualAfter.days[0].slots.find(
    (s) => s.startDateTime === targetSlotIndividual.startDateTime && s.resourceId === targetSlotIndividual.resourceId
  );
  assert(bookedSlotCheck === undefined, 'Individual slot is excluded after single booking (capacity 1->0)');

  // Test 4.2: Group service capacity reduction
  // srv_comp_001 with default_capacity = 4. Let's add a partial booking of 2 attendees
  SlotEngineService.clearTestBookings();

  SlotEngineService.addTestBooking({
    booking_reference: 'bk_partial_02',
    service_id: 'srv_comp_001',
    resource_id: 'res_h100_node1',
    start_time: new Date(targetStartDateTime),
    end_time: new Date(targetEndDateTime),
    attendee_count: 2, // 2 out of 4 booked
    status: 'confirmed',
  });

  // Query with attendeeCount = 1: slot SHOULD be available with remainingCapacity = 2
  const availPartial1 = await SlotEngineService.generateSlots({
    serviceId: 'srv_comp_001',
    startDate: targetDate,
    endDate: targetDate,
    attendeeCount: 1,
    referenceTime: refTimeMorning,
  });
  const partialSlot = availPartial1.days[0].slots.find(
    (s) => s.startTime === targetStartTime && s.resourceId === 'res_h100_node1'
  );
  assert(Boolean(partialSlot), 'Partially booked slot remains bookable for 1 attendee');
  assert(partialSlot?.maxCapacity === 4, 'Slot max capacity is 4');
  assert(partialSlot?.bookedCapacity === 2, 'Slot booked capacity is 2');
  assert(partialSlot?.remainingCapacity === 2, 'Slot remaining capacity is 2');

  // Query with attendeeCount = 3: remaining capacity is 2, so requesting 3 exceeds remaining -> EXCLUDED
  const availPartial3 = await SlotEngineService.generateSlots({
    serviceId: 'srv_comp_001',
    startDate: targetDate,
    endDate: targetDate,
    attendeeCount: 3, // Needs 3, but only 2 left
    referenceTime: refTimeMorning,
  });
  const partialSlotExcluded = availPartial3.days[0].slots.find(
    (s) => s.startTime === targetStartTime && s.resourceId === 'res_h100_node1'
  );
  assert(partialSlotExcluded === undefined, 'Slot is excluded when requested attendees (3) exceeds remaining capacity (2)');

  // -------------------------------------------------------------------------
  // 5. CONFIGURABLE SLOT CREATION & MULTIPLE RESOURCES
  // -------------------------------------------------------------------------
  console.log('\n--- 5. CONFIGURABLE SLOT CREATION & MULTI-RESOURCE ---');

  // Test 5.1: Custom slot step size (staggered 30-min intervals)
  const availStaggered = await SlotEngineService.generateSlots({
    serviceId: 'srv_comp_001',
    startDate: targetDate,
    endDate: targetDate,
    slotStepMinutes: 30, // 30-min step
    referenceTime: refTimeMorning,
  });
  assert(availStaggered.query.slotStepMinutes === 30, 'Slot step recorded in query metadata');
  // Staggered step produces more slots than standard 60-min step
  const availStandard = await SlotEngineService.generateSlots({
    serviceId: 'srv_comp_001',
    startDate: targetDate,
    endDate: targetDate,
    slotStepMinutes: 60,
    referenceTime: refTimeMorning,
  });
  assert(
    availStaggered.totalBookableSlots > availStandard.totalBookableSlots,
    `Staggered 30m slots (${availStaggered.totalBookableSlots}) > standard 60m slots (${availStandard.totalBookableSlots})`
  );

  // Test 5.2: Multiple Resources for a single service
  // srv_suite_002 is assigned to both res_pod_private_1 and res_staff_jordan
  const availMulti = await SlotEngineService.generateSlots({
    serviceId: 'srv_suite_002',
    startDate: targetDate,
    endDate: targetDate,
    referenceTime: refTimeMorning,
  });
  const distinctResources = new Set(availMulti.days[0].slots.map((s) => s.resourceId));
  assert(distinctResources.size >= 2, `Multiple resources generate slots for service (found ${distinctResources.size})`);
  assert(distinctResources.has('res_pod_private_1'), 'res_pod_private_1 is present in slots');
  assert(distinctResources.has('res_staff_jordan'), 'res_staff_jordan is present in slots');

  // -------------------------------------------------------------------------
  // 6. REST API INTEGRATION VERIFICATION (HTTP Endpoints)
  // -------------------------------------------------------------------------
  console.log('\n--- 6. REST API INTEGRATION VERIFICATION ---');
  const baseUrl = 'http://localhost:5000/api/v1';

  // Test 6.1: GET /api/v1/services/:id/availability
  const apiRes1 = await fetch(
    `${baseUrl}/services/srv_comp_001/availability?startDate=${targetDate}&endDate=${targetDate}`
  );
  assert(apiRes1.ok, `GET /services/:id/availability status: ${apiRes1.status} OK`);
  const json1 = await apiRes1.json();
  assert(json1.success === true, 'API response success flag is true');
  assert(json1.data.service.id === 'srv_comp_001', 'Service ID in API response matches');
  assert(json1.data.totalBookableSlots > 0, `Returned ${json1.data.totalBookableSlots} bookable slots`);

  // Test 6.2: GET /api/v1/availability/services/:serviceId (Dedicated availability route)
  const apiRes2 = await fetch(
    `${baseUrl}/availability/services/srv_comp_001?startDate=${targetDate}&endDate=${targetDate}&slotStep=30&attendees=1`
  );
  assert(apiRes2.ok, `GET /availability/services/:serviceId status: ${apiRes2.status} OK`);
  const json2 = await apiRes2.json();
  assert(json2.data.query.slotStepMinutes === 30, 'Query slotStep=30 correctly parsed and applied');

  // Test 6.3: Validation Error on inverted date range (422)
  const apiResInvalid = await fetch(
    `${baseUrl}/services/srv_comp_001/availability?startDate=2026-10-20&endDate=2026-10-10`
  );
  assert(apiResInvalid.status === 422, `Inverted date range returns 422 Validation Error (got ${apiResInvalid.status})`);

  // Test 6.4: Validation Error on window > 90 days (422)
  const apiResWindow = await fetch(
    `${baseUrl}/services/srv_comp_001/availability?startDate=2026-01-01&endDate=2026-06-01`
  );
  assert(apiResWindow.status === 422, `Window > 90 days returns 422 Validation Error (got ${apiResWindow.status})`);

  // Test 6.5: Unpublished draft service with secret shareToken (200)
  const apiResShare = await fetch(
    `${baseUrl}/services/srv_quantum_003/availability?startDate=${targetDate}&endDate=${targetDate}&shareToken=secret_share_preview_draft_quantum_777`
  );
  assert(apiResShare.status === 200, `Draft service with valid shareToken returns 200 (got ${apiResShare.status})`);

  // Test 6.6: Unpublished draft service without shareToken (404)
  const apiResDraftNoToken = await fetch(
    `${baseUrl}/services/srv_quantum_003/availability?startDate=${targetDate}&endDate=${targetDate}`
  );
  assert(apiResDraftNoToken.status === 404, `Unpublished service without shareToken returns 404 (got ${apiResDraftNoToken.status})`);

  console.log('\n================================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} SLOT ENGINE UNIT & INTEGRATION TESTS PASSED!`);
  console.log('================================================================\n');
}

runSlotEngineTests().catch((err) => {
  console.error('\n❌ Slot Engine Verification failed:', err);
  process.exit(1);
});

export {};
