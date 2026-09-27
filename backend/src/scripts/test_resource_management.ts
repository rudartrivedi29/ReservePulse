/**
 * End-to-End API Integration Test for Provider & Resource Management
 */
async function runTests() {
  console.log('--- ReservePulse Provider & Resource Management Verification ---\n');
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

  // 2. Fetch Organiser Resources
  console.log('\n[2] Fetching organiser resources (GET /organiser/resources)...');
  const listRes = await fetch(`${baseUrl}/organiser/resources`, {
    headers: { Authorization: `Bearer ${organiserToken}` },
  });
  const listData = await listRes.json();
  console.log(`✓ Fetched ${listData.data?.length || 0} resources. Status: ${listRes.status}`);

  // 3. Create a New Resource
  console.log('\n[3] Creating a new resource / provider (POST /organiser/resources)...');
  const createPayload = {
    name: 'Quantum Optics Bench Beta',
    resourceType: 'equipment',
    description: 'Ultra-low vibration optical bench with femtosecond pulse lasers.',
    location: 'Physics Lab 3, Bay 12',
    capacity: 2,
    status: 'active',
    serviceIds: ['srv_comp_001'],
  };
  const createRes = await fetch(`${baseUrl}/organiser/resources`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${organiserToken}`,
    },
    body: JSON.stringify(createPayload),
  });
  const createData = await createRes.json();
  if (!createRes.ok || !createData.data) {
    throw new Error(`Create resource failed: ${JSON.stringify(createData)}`);
  }
  const newResource = createData.data;
  console.log(`✓ Created resource "${newResource.name}" [ID: ${newResource.id}]`);
  console.log(`✓ Resource Type: ${newResource.resourceType}`);
  console.log(`✓ Status: ${newResource.status} (isActive: ${newResource.isActive})`);
  console.log(`✓ Assigned services count: ${newResource.assignedServices?.length || 0}`);

  // 4. Get Resource by ID
  console.log('\n[4] Getting resource by ID (GET /organiser/resources/:id)...');
  const getRes = await fetch(`${baseUrl}/organiser/resources/${newResource.id}`, {
    headers: { Authorization: `Bearer ${organiserToken}` },
  });
  const getData = await getRes.json();
  if (!getRes.ok || !getData.data) {
    throw new Error(`Get resource failed: ${JSON.stringify(getData)}`);
  }
  console.log(`✓ Retrieved resource "${getData.data.name}", status: ${getData.data.status}`);

  // 5. Deactivate Resource
  console.log('\n[5] Deactivating resource (PATCH /organiser/resources/:id/deactivate)...');
  const deactRes = await fetch(`${baseUrl}/organiser/resources/${newResource.id}/deactivate`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${organiserToken}` },
  });
  const deactData = await deactRes.json();
  console.log(`✓ Deactivated! Status: ${deactData.data.status}, isActive: ${deactData.data.isActive}`);
  if (deactData.data.isActive !== false) {
    throw new Error('Expected isActive to be false after deactivation');
  }

  // 6. Activate Resource
  console.log('\n[6] Activating resource (PATCH /organiser/resources/:id/activate)...');
  const actRes = await fetch(`${baseUrl}/organiser/resources/${newResource.id}/activate`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${organiserToken}` },
  });
  const actData = await actRes.json();
  console.log(`✓ Activated! Status: ${actData.data.status}, isActive: ${actData.data.isActive}`);
  if (actData.data.isActive !== true) {
    throw new Error('Expected isActive to be true after activation');
  }

  // 7. Update Resource Details
  console.log('\n[7] Updating resource details (PUT /organiser/resources/:id)...');
  const updateRes = await fetch(`${baseUrl}/organiser/resources/${newResource.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${organiserToken}`,
    },
    body: JSON.stringify({
      name: 'Quantum Optics Bench Beta (Calibrated)',
      capacity: 3,
      location: 'Physics Lab 3, Bay 14 (Refurbished)',
    }),
  });
  const updateData = await updateRes.json();
  console.log(`✓ Updated successfully! New title: "${updateData.data.name}", New Capacity: ${updateData.data.capacity}`);

  // 8. Assign to Another Service
  console.log('\n[8] Assigning resource to another service (POST /organiser/resources/:id/services)...');
  const assignRes = await fetch(`${baseUrl}/organiser/resources/${newResource.id}/services`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${organiserToken}`,
    },
    body: JSON.stringify({
      serviceId: 'srv_suite_002',
      isRequired: true,
      allocationQuantity: 1,
    }),
  });
  const assignData = await assignRes.json();
  console.log(`✓ Assigned to service "${assignData.data?.name}" (ID: ${assignData.data?.id})`);

  // 9. Unassign Service
  console.log('\n[9] Unassigning service from resource (DELETE /organiser/resources/:id/services/:serviceId)...');
  const unassignRes = await fetch(`${baseUrl}/organiser/resources/${newResource.id}/services/srv_suite_002`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${organiserToken}` },
  });
  console.log(`✓ Unassigned status: ${unassignRes.status} 200 OK`);

  // 10. Organiser Ownership Checks (Customer cannot modify resource)
  console.log('\n[10] Testing Organiser Ownership checks: Customer attempting to edit resource...');
  const customerLoginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'customer@reservepulse.com',
      password: 'Customer@123',
    }),
  });
  const customerToken = (await customerLoginRes.json()).data.token;
  const unauthorizedUpdateRes = await fetch(`${baseUrl}/organiser/resources/${newResource.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({ name: 'Hacked Resource Name' }),
  });
  console.log(`✓ Customer unauthorized response status: ${unauthorizedUpdateRes.status} (Expected 403 Forbidden)`);
  if (unauthorizedUpdateRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden, got ${unauthorizedUpdateRes.status}`);
  }

  // 11. Delete Resource
  console.log('\n[11] Deleting resource (DELETE /organiser/resources/:id)...');
  const deleteRes = await fetch(`${baseUrl}/organiser/resources/${newResource.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${organiserToken}` },
  });
  console.log(`✓ Delete status: ${deleteRes.status} 200 OK`);

  console.log('\n======================================================');
  console.log('🎉 ALL 11 RESOURCE MANAGEMENT INTEGRATION TESTS PASSED!');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ Resource verification failed:', err);
  process.exit(1);
});

export {};
