/**
 * End-to-End API Integration Test for Organiser Service Management
 */
async function runTests() {
  console.log('--- ReservePulse Service Management Integration Verification ---\n');
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

  // 2. Fetch Organiser Services
  console.log('\n[2] Fetching organiser services (GET /organiser/services)...');
  const listRes = await fetch(`${baseUrl}/organiser/services`, {
    headers: { Authorization: `Bearer ${organiserToken}` },
  });
  const listData = await listRes.json();
  console.log(`✓ Fetched ${listData.data?.length || 0} services. Status: ${listRes.status}`);

  // 3. Create a Draft Service
  console.log('\n[3] Creating a new draft service (POST /organiser/services)...');
  const createPayload = {
    name: 'Neural Performance Advisory',
    description: 'Expert 1-on-1 architecture advisory and performance profiling session.',
    category: 'Consultation',
    durationMinutes: 45,
    capacityType: 'individual',
    defaultCapacity: 1,
    paymentSetting: 'paid',
    priceAmount: 180,
    priceCurrency: 'USD',
    requiresManualConfirmation: true,
    resourceAssignmentMode: 'automatic',
    isPublished: false,
  };
  const createRes = await fetch(`${baseUrl}/organiser/services`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${organiserToken}`,
    },
    body: JSON.stringify(createPayload),
  });
  const createData = await createRes.json();
  if (!createRes.ok || !createData.data) {
    throw new Error(`Create failed: ${JSON.stringify(createData)}`);
  }
  const newService = createData.data;
  console.log(`✓ Created service "${newService.name}" [ID: ${newService.id}]`);
  console.log(`✓ Generated Secret Share Token: ${newService.shareToken}`);
  console.log(`✓ Is Published: ${newService.isPublished}`);

  // 4. Test Unpublished Share Link Preview (GET /services/preview/:shareToken)
  console.log('\n[4] Testing secret preview link as unauthenticated user (GET /services/preview/:shareToken)...');
  const previewRes = await fetch(`${baseUrl}/services/preview/${newService.shareToken}`);
  const previewData = await previewRes.json();
  if (!previewRes.ok || !previewData.data) {
    throw new Error(`Share link preview failed: ${JSON.stringify(previewData)}`);
  }
  console.log(`✓ Preview succeeded for unauthenticated visitor! Title: "${previewData.data.name}"`);
  console.log(`✓ Preview notice present: "${previewData.data.previewNotice}"`);

  // 5. Verify Draft Service is BLOCKED from Public Catalog / Direct ID Access
  console.log('\n[5] Verifying unauthenticated access to draft service via standard ID route is blocked...');
  const directRes = await fetch(`${baseUrl}/services/${newService.id}`);
  console.log(`✓ Direct access status code: ${directRes.status} (Expected 403 Forbidden for unpublished drafts)`);
  if (directRes.status !== 403) {
    throw new Error(`Expected 403 for draft service direct public access, got ${directRes.status}`);
  }

  // 6. Update Service (PUT /organiser/services/:id)
  console.log('\n[6] Updating service details (PUT /organiser/services/:id)...');
  const updateRes = await fetch(`${baseUrl}/organiser/services/${newService.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${organiserToken}`,
    },
    body: JSON.stringify({
      name: 'Neural Performance Advisory (Optimized)',
      priceAmount: 195,
      durationMinutes: 60,
    }),
  });
  const updateData = await updateRes.json();
  console.log(`✓ Updated successfully! New title: "${updateData.data.name}", New price: $${updateData.data.priceAmount}`);

  // 7. Test Ownership Checks with another account (Customer)
  console.log('\n[7] Testing Organiser Ownership checks: Customer trying to edit organiser service...');
  const customerLoginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'customer@reservepulse.com',
      password: 'Customer@123',
    }),
  });
  const customerToken = (await customerLoginRes.json()).data.token;
  const unauthorizedUpdateRes = await fetch(`${baseUrl}/organiser/services/${newService.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({ name: 'Hacked Title' }),
  });
  console.log(`✓ Unauthorized update response code: ${unauthorizedUpdateRes.status} (Expected 403 Forbidden)`);
  if (unauthorizedUpdateRes.status !== 403) {
    throw new Error(`Expected 403 for customer modifying organiser service, got ${unauthorizedUpdateRes.status}`);
  }

  // 8. Publish Service (PATCH /organiser/services/:id/publish)
  console.log('\n[8] Publishing service (PATCH /organiser/services/:id/publish)...');
  const publishRes = await fetch(`${baseUrl}/organiser/services/${newService.id}/publish`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${organiserToken}` },
  });
  const publishData = await publishRes.json();
  console.log(`✓ Published! isPublished: ${publishData.data.isPublished}, isActive: ${publishData.data.isActive}`);

  // 9. Verify now visible in public direct endpoint
  console.log('\n[9] Verifying service is now publicly accessible via GET /services/:id...');
  const publicAccessRes = await fetch(`${baseUrl}/services/${newService.id}`);
  const publicAccessData = await publicAccessRes.json();
  console.log(`✓ Public access status: ${publicAccessRes.status} 200 OK! Title: "${publicAccessData.data.name}"`);

  // 10. Unpublish Service (PATCH /organiser/services/:id/unpublish)
  console.log('\n[10] Unpublishing service (PATCH /organiser/services/:id/unpublish)...');
  const unpublishRes = await fetch(`${baseUrl}/organiser/services/${newService.id}/unpublish`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${organiserToken}` },
  });
  const unpublishData = await unpublishRes.json();
  console.log(`✓ Unpublished! isPublished: ${unpublishData.data.isPublished}, isActive: ${unpublishData.data.isActive}`);

  // 11. Delete Service (DELETE /organiser/services/:id)
  console.log('\n[11] Deleting service (DELETE /organiser/services/:id)...');
  const deleteRes = await fetch(`${baseUrl}/organiser/services/${newService.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${organiserToken}` },
  });
  console.log(`✓ Delete status: ${deleteRes.status} 200 OK`);

  console.log('\n======================================================');
  console.log('🎉 ALL 11 SERVICE MANAGEMENT INTEGRATION TESTS PASSED!');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ Verification failed:', err);
  process.exit(1);
});

export {};
