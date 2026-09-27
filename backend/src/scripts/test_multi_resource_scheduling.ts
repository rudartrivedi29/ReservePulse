/**
 * Comprehensive Multi-Resource, Multi-Weekday & Schedule Change Verification
 */
async function runMultiResourceTests() {
  console.log('=== ReservePulse Multi-Resource & Weekday Scheduling Test Suite ===\n');
  const baseUrl = 'http://localhost:5000/api/v1';

  // 1. Authenticate Organiser
  console.log('[Step 1] Authenticating as Organiser...');
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'organiser@reservepulse.com',
      password: 'Organiser@123',
    }),
  });
  const loginJson = await loginRes.json();
  if (!loginRes.ok) throw new Error(`Login failed: ${JSON.stringify(loginJson)}`);
  const token = loginJson.data.token;
  console.log('✓ Organiser authenticated:', loginJson.data.user.email);

  // 2. Fetch fleet resources
  console.log('\n[Step 2] Fetching Organiser Resources...');
  const resListRes = await fetch(`${baseUrl}/organiser/resources`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const resListJson = await resListRes.json();
  const resources: any[] = resListJson.data || [];
  console.log(`✓ Retrieved ${resources.length} fleet resources.`);
  resources.forEach((r) => console.log(`  - [${r.id}] ${r.name} (${r.resourceType}, Cap: ${r.capacity})`));

  // 3. Test Resource 1: Executive Boardroom Alpha (res_boardroom_alpha)
  console.log('\n[Step 3] Testing Resource 1: Executive Boardroom Alpha...');
  const boardroomSchedule = [
    { dayOfWeek: 1, dayName: 'Monday', isAvailable: true, intervals: [{ startTime: '08:00', endTime: '12:00' }, { startTime: '13:00', endTime: '18:00' }] },
    { dayOfWeek: 2, dayName: 'Tuesday', isAvailable: true, intervals: [{ startTime: '08:00', endTime: '18:00' }] },
    { dayOfWeek: 3, dayName: 'Wednesday', isAvailable: true, intervals: [{ startTime: '08:00', endTime: '18:00' }] },
    { dayOfWeek: 4, dayName: 'Thursday', isAvailable: true, intervals: [{ startTime: '08:00', endTime: '18:00' }] },
    { dayOfWeek: 5, dayName: 'Friday', isAvailable: true, intervals: [{ startTime: '08:00', endTime: '15:00' }] },
    { dayOfWeek: 6, dayName: 'Saturday', isAvailable: false, intervals: [] },
    { dayOfWeek: 0, dayName: 'Sunday', isAvailable: false, intervals: [] },
  ];

  const updateBoardroomRes = await fetch(`${baseUrl}/organiser/resources/res_boardroom_alpha/schedule`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ schedule: boardroomSchedule }),
  });
  if (!updateBoardroomRes.ok) throw new Error(`Boardroom schedule update failed: ${updateBoardroomRes.statusText}`);
  console.log('✓ Successfully configured Boardroom Alpha 7-day schedule (Mon split shifts, Fri early close, Sat/Sun off).');

  // 4. Test Resource 2: GPU Acceleration Cluster (res_h100_node1) - 24/7 High-Performance Compute
  console.log('\n[Step 4] Testing Resource 2: GPU Acceleration Cluster Node 01...');
  const gpuSchedule = [
    { dayOfWeek: 1, dayName: 'Monday', isAvailable: true, intervals: [{ startTime: '00:00', endTime: '23:59' }] },
    { dayOfWeek: 2, dayName: 'Tuesday', isAvailable: true, intervals: [{ startTime: '00:00', endTime: '23:59' }] },
    { dayOfWeek: 3, dayName: 'Wednesday', isAvailable: true, intervals: [{ startTime: '00:00', endTime: '23:59' }] },
    { dayOfWeek: 4, dayName: 'Thursday', isAvailable: true, intervals: [{ startTime: '00:00', endTime: '23:59' }] },
    { dayOfWeek: 5, dayName: 'Friday', isAvailable: true, intervals: [{ startTime: '00:00', endTime: '23:59' }] },
    { dayOfWeek: 6, dayName: 'Saturday', isAvailable: true, intervals: [{ startTime: '00:00', endTime: '23:59' }] },
    { dayOfWeek: 0, dayName: 'Sunday', isAvailable: true, intervals: [{ startTime: '00:00', endTime: '23:59' }] },
  ];

  const updateGpuRes = await fetch(`${baseUrl}/organiser/resources/res_h100_node1/schedule`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ schedule: gpuSchedule }),
  });
  if (!updateGpuRes.ok) throw new Error(`GPU schedule update failed: ${updateGpuRes.statusText}`);
  console.log('✓ Successfully configured GPU Node 01 with 24/7 all-day intervals across all 7 weekdays.');

  // 5. Test Resource 3: Jordan Vance (res_staff_jordan) - 4-Day Compressed Work Week
  console.log('\n[Step 5] Testing Resource 3: Jordan Vance (Staff Specialist)...');
  const staffSchedule = [
    { dayOfWeek: 1, dayName: 'Monday', isAvailable: true, intervals: [{ startTime: '09:00', endTime: '13:00' }, { startTime: '14:00', endTime: '19:00' }] },
    { dayOfWeek: 2, dayName: 'Tuesday', isAvailable: true, intervals: [{ startTime: '09:00', endTime: '13:00' }, { startTime: '14:00', endTime: '19:00' }] },
    { dayOfWeek: 3, dayName: 'Wednesday', isAvailable: true, intervals: [{ startTime: '09:00', endTime: '13:00' }, { startTime: '14:00', endTime: '19:00' }] },
    { dayOfWeek: 4, dayName: 'Thursday', isAvailable: true, intervals: [{ startTime: '09:00', endTime: '13:00' }, { startTime: '14:00', endTime: '19:00' }] },
    { dayOfWeek: 5, dayName: 'Friday', isAvailable: false, intervals: [] }, // Compressed off day
    { dayOfWeek: 6, dayName: 'Saturday', isAvailable: false, intervals: [] },
    { dayOfWeek: 0, dayName: 'Sunday', isAvailable: false, intervals: [] },
  ];

  const updateStaffRes = await fetch(`${baseUrl}/organiser/resources/res_staff_jordan/schedule`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ schedule: staffSchedule }),
  });
  if (!updateStaffRes.ok) throw new Error(`Staff schedule update failed: ${updateStaffRes.statusText}`);
  console.log('✓ Successfully configured Jordan Vance with 4-day compressed schedule (Fri/Sat/Sun off).');

  // 6. Test Schedule Change: Update Staff from 4-day to 5-day with Saturday special shifts
  console.log('\n[Step 6] Testing Schedule Changes & Modifications on Resource 3...');
  const staffScheduleChange = [
    ...staffSchedule.filter((d) => d.dayOfWeek !== 5 && d.dayOfWeek !== 6),
    { dayOfWeek: 5, dayName: 'Friday', isAvailable: true, intervals: [{ startTime: '10:00', endTime: '16:00' }] },
    { dayOfWeek: 6, dayName: 'Saturday', isAvailable: true, intervals: [{ startTime: '10:00', endTime: '14:00' }] },
  ];
  const changeRes = await fetch(`${baseUrl}/organiser/resources/res_staff_jordan/schedule`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ schedule: staffScheduleChange }),
  });
  if (!changeRes.ok) throw new Error(`Staff schedule modification failed: ${changeRes.statusText}`);
  
  // Re-fetch and verify modification persisted
  const verifyRes = await fetch(`${baseUrl}/organiser/resources/res_staff_jordan/schedule`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const verifyJson = await verifyRes.json();
  const fri = verifyJson.data.schedule.find((d: any) => d.dayOfWeek === 5);
  const sat = verifyJson.data.schedule.find((d: any) => d.dayOfWeek === 6);
  if (!fri.isAvailable || fri.intervals[0].startTime !== '10:00') {
    throw new Error('Friday schedule modification did not persist properly');
  }
  if (!sat.isAvailable || sat.intervals[0].endTime !== '14:00') {
    throw new Error('Saturday schedule modification did not persist properly');
  }
  console.log('✓ Schedule change confirmed and persisted: Friday (10:00-16:00) and Saturday (10:00-14:00) active.');

  // 7. Test Normalized Availability outputs for all 3 resources across a 7-day calendar window
  console.log('\n[Step 7] Testing Normalized Availability for all resources (2026-10-12 to 2026-10-18)...');
  
  // Boardroom
  const normBoardroom = await (await fetch(`${baseUrl}/schedules/resources/res_boardroom_alpha/availability?startDate=2026-10-12&endDate=2026-10-18`)).json();
  const mondayBoardroom = normBoardroom.data.days.find((d: any) => d.dayOfWeek === 1);
  console.log(`✓ Boardroom Monday intervals: ${mondayBoardroom.workingIntervals.length} shifts (Shift 1 dur: ${mondayBoardroom.workingIntervals[0].durationMinutes}m)`);
  if (mondayBoardroom.workingIntervals.length !== 2) throw new Error('Expected 2 shifts for Boardroom Monday');

  // GPU Node
  const normGpu = await (await fetch(`${baseUrl}/schedules/resources/res_h100_node1/availability?startDate=2026-10-12&endDate=2026-10-18`)).json();
  const sundayGpu = normGpu.data.days.find((d: any) => d.dayOfWeek === 0);
  console.log(`✓ GPU Node Sunday intervals: ${sundayGpu.workingIntervals.length} shift, startMinutes: ${sundayGpu.workingIntervals[0].startMinutes}, endMinutes: ${sundayGpu.workingIntervals[0].endMinutes}`);
  if (sundayGpu.workingIntervals[0].endMinutes < 1400) throw new Error('Expected 24/7 compute window on Sunday');

  // Staff
  const normStaff = await (await fetch(`${baseUrl}/schedules/resources/res_staff_jordan/availability?startDate=2026-10-12&endDate=2026-10-18`)).json();
  const satStaff = normStaff.data.days.find((d: any) => d.dayOfWeek === 6);
  console.log(`✓ Staff Saturday intervals: ${satStaff.workingIntervals.length} shift (${satStaff.workingIntervals[0].startTime} - ${satStaff.workingIntervals[0].endTime}), duration: ${satStaff.workingIntervals[0].durationMinutes}m`);
  if (satStaff.workingIntervals[0].durationMinutes !== 240) throw new Error('Expected 240m duration on Saturday');

  // 8. Test Invalid Multi-Interval Overlaps on different weekdays
  console.log('\n[Step 8] Testing Edge Cases: Same-day Overlaps on Tuesday & Wednesday...');
  const badOverlapPayload = {
    schedule: [
      {
        dayOfWeek: 2, // Tuesday
        isAvailable: true,
        intervals: [
          { startTime: '10:00', endTime: '14:00' },
          { startTime: '13:30', endTime: '17:00' }, // 30-min collision with previous interval
        ],
      },
    ],
  };
  const badOverlapRes = await fetch(`${baseUrl}/organiser/resources/res_h100_node1/schedule`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(badOverlapPayload),
  });
  console.log(`✓ Collision rejection status: ${badOverlapRes.status} (Expected 422)`);
  if (badOverlapRes.status !== 422) throw new Error(`Expected 422 for collision, got ${badOverlapRes.status}`);

  console.log('\n========================================================================');
  console.log('🎉 ALL MULTI-RESOURCE, WEEKDAY & SCHEDULE CHANGE TESTS PASSED FLAWLESSLY!');
  console.log('========================================================================\n');
}

runMultiResourceTests().catch((err) => {
  console.error('\n❌ Multi-resource scheduling tests failed:', err);
  process.exit(1);
});
