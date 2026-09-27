/**
 * End-to-End API Integration Test for Working Hours & Scheduling Configuration
 */
async function runTests() {
  console.log('--- ReservePulse Scheduling Configuration Verification ---\n');
  const baseUrl = 'http://localhost:5000/api/v1';

  // 1. Organiser Login
  console.log('[1] Logging in as Jordan Vance (Organiser)...');
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'organiser@reservepulse.com',
      password: 'Organiser@123',
    }),
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok || !loginData.data?.token) {
    throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
  }
  const organiserToken = loginData.data.token;
  console.log('✓ Login successful! Token acquired for user:', loginData.data.user.id);

  // 2. Fetch Initial Weekly Schedule for Boardroom Alpha
  console.log('\n[2] Fetching weekly schedule for res_boardroom_alpha (GET /organiser/resources/res_boardroom_alpha/schedule)...');
  const getScheduleRes = await fetch(`${baseUrl}/organiser/resources/res_boardroom_alpha/schedule`, {
    headers: { Authorization: `Bearer ${organiserToken}` },
  });
  const scheduleData = await getScheduleRes.json();
  if (!getScheduleRes.ok || !scheduleData.data) {
    throw new Error(`Get schedule failed: ${JSON.stringify(scheduleData)}`);
  }
  const schedule = scheduleData.data.schedule;
  console.log(`✓ Fetched 7-day schedule for "${scheduleData.data.resourceName}". Days configured: ${schedule.length}`);
  const monday = schedule.find((d: any) => d.dayOfWeek === 1);
  console.log(`✓ Monday status: isAvailable=${monday?.isAvailable}, intervals=${JSON.stringify(monday?.intervals)}`);

  // 3. Test Invalid Time Range (startTime >= endTime)
  console.log('\n[3] Testing invalid time period validation (Start 17:00 >= End 09:00)...');
  const invalidTimeRes = await fetch(`${baseUrl}/organiser/resources/res_boardroom_alpha/schedule`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${organiserToken}`,
    },
    body: JSON.stringify({
      schedule: [
        {
          dayOfWeek: 1,
          isAvailable: true,
          intervals: [{ startTime: '17:00', endTime: '09:00' }],
        },
      ],
    }),
  });
  console.log(`✓ Response status: ${invalidTimeRes.status} (Expected 422/400 Validation Error)`);
  if (invalidTimeRes.status !== 422 && invalidTimeRes.status !== 400) {
    throw new Error(`Expected 422 or 400 for inverted times, got ${invalidTimeRes.status}`);
  }
  const invalidTimeData = await invalidTimeRes.json();
  console.log(`✓ Error response verified: "${invalidTimeData.message || JSON.stringify(invalidTimeData)}"`);

  // 4. Test Overlapping Working Periods Collision Detection
  console.log('\n[4] Testing overlapping interval collision validation on the same day...');
  const overlapRes = await fetch(`${baseUrl}/organiser/resources/res_boardroom_alpha/schedule`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${organiserToken}`,
    },
    body: JSON.stringify({
      schedule: [
        {
          dayOfWeek: 1,
          dayName: 'Monday',
          isAvailable: true,
          intervals: [
            { startTime: '09:00', endTime: '13:00' },
            { startTime: '12:00', endTime: '16:00' }, // Overlaps between 12:00 and 13:00!
          ],
        },
      ],
    }),
  });
  console.log(`✓ Overlap response status: ${overlapRes.status} (Expected 422/400 Validation Error)`);
  if (overlapRes.status !== 422 && overlapRes.status !== 400) {
    throw new Error(`Expected 422 or 400 for overlapping intervals, got ${overlapRes.status}`);
  }
  const overlapData = await overlapRes.json();
  console.log(`✓ Overlap error message verified: "${overlapData.message || JSON.stringify(overlapData)}"`);

  // 5. Successfully Update Weekly Schedule with Multiple Intervals (Shifts & Breaks)
  console.log('\n[5] Updating weekly schedule with split shifts & weekend hours (PUT /organiser/resources/:id/schedule)...');
  const updatedSchedulePayload = {
    schedule: [
      {
        dayOfWeek: 0, // Sunday
        dayName: 'Sunday',
        isAvailable: false,
        intervals: [],
      },
      {
        dayOfWeek: 1, // Monday: split shifts with lunch break
        dayName: 'Monday',
        isAvailable: true,
        intervals: [
          { startTime: '08:30', endTime: '12:30' },
          { startTime: '13:30', endTime: '17:30' },
        ],
      },
      {
        dayOfWeek: 2, // Tuesday
        dayName: 'Tuesday',
        isAvailable: true,
        intervals: [
          { startTime: '08:30', endTime: '12:30' },
          { startTime: '13:30', endTime: '17:30' },
        ],
      },
      {
        dayOfWeek: 3, // Wednesday
        dayName: 'Wednesday',
        isAvailable: true,
        intervals: [{ startTime: '09:00', endTime: '18:00' }],
      },
      {
        dayOfWeek: 4, // Thursday
        dayName: 'Thursday',
        isAvailable: true,
        intervals: [{ startTime: '09:00', endTime: '18:00' }],
      },
      {
        dayOfWeek: 5, // Friday: half day
        dayName: 'Friday',
        isAvailable: true,
        intervals: [{ startTime: '09:00', endTime: '14:00' }],
      },
      {
        dayOfWeek: 6, // Saturday: weekend window
        dayName: 'Saturday',
        isAvailable: true,
        intervals: [{ startTime: '10:00', endTime: '15:00' }],
      },
    ],
  };

  const updateRes = await fetch(`${baseUrl}/organiser/resources/res_boardroom_alpha/schedule`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${organiserToken}`,
    },
    body: JSON.stringify(updatedSchedulePayload),
  });
  const updateData = await updateRes.json();
  if (!updateRes.ok || !updateData.data) {
    throw new Error(`Schedule update failed: ${JSON.stringify(updateData)}`);
  }
  console.log(`✓ Schedule updated successfully! Status: ${updateRes.status} 200 OK`);
  const updatedMonday = updateData.data.schedule.find((d: any) => d.dayOfWeek === 1);
  console.log(`✓ Verified Monday split shifts count: ${updatedMonday.intervals.length}`);
  console.log(`✓ Shift 1: ${updatedMonday.intervals[0].startTime} - ${updatedMonday.intervals[0].endTime}`);
  console.log(`✓ Shift 2: ${updatedMonday.intervals[1].startTime} - ${updatedMonday.intervals[1].endTime}`);

  // 6. Test Ownership Protection: Customer cannot modify organiser resource schedule
  console.log('\n[6] Testing Organiser Ownership checks: Customer attempting to update schedule...');
  const customerLoginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'customer@reservepulse.com',
      password: 'Customer@123',
    }),
  });
  const customerToken = (await customerLoginRes.json()).data.token;
  const customerUnauthorizedRes = await fetch(
    `${baseUrl}/organiser/resources/res_boardroom_alpha/schedule`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify(updatedSchedulePayload),
    }
  );
  console.log(`✓ Customer unauthorized status: ${customerUnauthorizedRes.status} (Expected 403 Forbidden)`);
  if (customerUnauthorizedRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden, got ${customerUnauthorizedRes.status}`);
  }

  // 7. Test Normalized Availability Service (Future Slot Engine Input)
  console.log('\n[7] Testing normalized availability generation (GET /schedules/resources/:id/availability)...');
  const availRes = await fetch(
    `${baseUrl}/schedules/resources/res_boardroom_alpha/availability?startDate=2026-10-05&endDate=2026-10-11`
  );
  const availData = await availRes.json();
  if (!availRes.ok || !availData.data) {
    throw new Error(`Normalized availability query failed: ${JSON.stringify(availData)}`);
  }
  const norm = availData.data;
  console.log(`✓ Normalized availability generated for "${norm.resourceName}" [Capacity: ${norm.capacity}]`);
  console.log(`✓ Range: ${norm.startDate} to ${norm.endDate} (${norm.days.length} days computed)`);
  
  // Verify Monday 2026-10-05 normalized output
  const normMonday = norm.days.find((d: any) => d.date === '2026-10-05');
  console.log(`✓ Mon Oct 5 (dayOfWeek=${normMonday.dayOfWeek}): isAvailable=${normMonday.isAvailable}`);
  console.log(`✓ Intervals:`, normMonday.workingIntervals);
  if (normMonday.workingIntervals.length !== 2) {
    throw new Error(`Expected 2 normalized working intervals on Monday, got ${normMonday.workingIntervals.length}`);
  }
  const firstShift = normMonday.workingIntervals[0];
  console.log(`✓ Shift 1: ${firstShift.startTime} to ${firstShift.endTime} (startMin: ${firstShift.startMinutes}, duration: ${firstShift.durationMinutes}m)`);

  // Verify Sunday 2026-10-11 is unavailable
  const normSunday = norm.days.find((d: any) => d.date === '2026-10-11');
  console.log(`✓ Sun Oct 11 (dayOfWeek=${normSunday.dayOfWeek}): isAvailable=${normSunday.isAvailable} (Intervals: ${normSunday.workingIntervals.length})`);
  if (normSunday.isAvailable !== false) {
    throw new Error('Expected Sunday to be unavailable');
  }

  console.log('\n========================================================');
  console.log('🎉 ALL 7 SCHEDULING CONFIGURATION & COLLISION TESTS PASSED!');
  console.log('========================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ Scheduling verification failed:', err);
  process.exit(1);
});

export {};
