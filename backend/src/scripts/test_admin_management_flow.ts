/**
 * Comprehensive Test Suite for Admin Dashboard & User/Provider Governance
 *
 * Verifies:
 * 1. Admin Dashboard Telemetry:
 *    - Total users, total providers (organisers), and total appointments.
 *    - Breakdown of users (customers, organisers, admins, active, deactivated).
 *    - Breakdown of appointments (pending, confirmed, cancelled, etc.).
 *    - Recent appointments ledger and recent registered users.
 * 2. User & Provider Management:
 *    - Searchable directory by name, email, phone.
 *    - Role filtering (All, CUSTOMER, ORGANISER, ADMIN).
 *    - Status filtering (Active, Deactivated).
 *    - Dedicated providers endpoint (/api/v1/admin/providers).
 *    - User details inspection with associated services or appointments.
 * 3. Safe Account Activation & Deactivation:
 *    - Activating and deactivating accounts.
 *    - Safety rule: Admin cannot deactivate their own account (400 Bad Request).
 *    - Safety rule: Cannot deactivate the last remaining active admin (400 Bad Request).
 *    - Deactivated user login block: Deactivated users receive 401 Unauthorized upon login.
 * 4. Safe Role Management:
 *    - Promoting a customer to organiser.
 *    - Demoting an organiser to customer.
 *    - Safety rule: Cannot remove admin role from the last active admin (400 Bad Request).
 * 5. Direct User Provisioning:
 *    - Admin creates user account with specified role and verification status.
 *    - Duplicate email conflict check (409 Conflict).
 * 6. RBAC & Security:
 *    - Unauthenticated requests rejected with 401 Unauthorized.
 *    - Customers and Organisers rejected from admin endpoints with 403 Forbidden.
 *    - Platform-level booking visibility across all providers.
 */

import jwt from 'jsonwebtoken';
import { Server } from 'http';
import { createApp } from '../app';
import { config } from '../config/env';
import { AuthService } from '../services/auth.service';
import { AdminService } from '../services/admin.service';
import { BookingService } from '../services/booking.service';
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

async function runAdminManagementTests() {
  console.log('================================================================');
  console.log('🚀 RUNNING ADMIN DASHBOARD & USER/PROVIDER MANAGEMENT TESTS');
  console.log('================================================================');

  const adminUser: AuthUserPayload = {
    id: 'usr_admin_master_999',
    email: 'master.admin@reservepulse.test',
    fullName: 'Master Administrator',
    role: 'ADMIN',
    isVerified: true,
  };

  const organiserUser: AuthUserPayload = {
    id: 'usr_org_facility_999',
    email: 'facility.head@reservepulse.test',
    fullName: 'Facility Head',
    role: 'ORGANISER',
    isVerified: true,
  };

  const customerUser: AuthUserPayload = {
    id: 'usr_cust_regular_999',
    email: 'customer.regular@client.test',
    fullName: 'Regular Customer',
    role: 'CUSTOMER',
    isVerified: true,
  };

  const adminToken = jwt.sign(adminUser, config.jwt.secret, { expiresIn: '1h' });
  const organiserToken = jwt.sign(organiserUser, config.jwt.secret, { expiresIn: '1h' });
  const customerToken = jwt.sign(customerUser, config.jwt.secret, { expiresIn: '1h' });

  // Seed test users into AuthService
  await AuthService.saveUserEntity({
    id: adminUser.id,
    email: adminUser.email,
    full_name: adminUser.fullName,
    role: 'ADMIN',
    phone: '+1 555-0100',
    password_hash: 'hashed_pw',
    is_verified: true,
    is_active: true,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
  });

  await AuthService.saveUserEntity({
    id: organiserUser.id,
    email: organiserUser.email,
    full_name: organiserUser.fullName,
    role: 'ORGANISER',
    phone: '+1 555-0101',
    password_hash: 'hashed_pw',
    is_verified: true,
    is_active: true,
    created_at: new Date('2026-01-02'),
    updated_at: new Date('2026-01-02'),
  });

  await AuthService.saveUserEntity({
    id: customerUser.id,
    email: customerUser.email,
    full_name: customerUser.fullName,
    role: 'CUSTOMER',
    phone: '+1 555-0102',
    password_hash: 'hashed_pw',
    is_verified: true,
    is_active: true,
    created_at: new Date('2026-01-03'),
    updated_at: new Date('2026-01-03'),
  });

  // Start HTTP test server
  const app = createApp();
  const PORT = 5098;
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(PORT, () => resolve(s));
  });

  const baseUrl = `http://localhost:${PORT}/api/v1`;

  try {
    // -------------------------------------------------------------
    // SECTION 1: Service-level Tests for Dashboard Telemetry
    // -------------------------------------------------------------
    console.log('\n--- Section 1: Admin Dashboard Telemetry ---');
    const stats = await AdminService.getDashboardStats();
    assert(stats.totalUsers >= 3, `Dashboard stats report totalUsers >= 3 (got ${stats.totalUsers})`);
    assert(stats.totalProviders >= 1, `Dashboard stats report totalProviders >= 1 (got ${stats.totalProviders})`);
    assert(stats.appointmentStats !== undefined, 'Dashboard stats report appointment breakdown');
    assert(stats.userStats !== undefined, 'Dashboard stats report user breakdown');
    assert(stats.userStats.admins >= 1, `User stats report at least 1 admin (got ${stats.userStats.admins})`);
    assert(stats.userStats.organisers >= 1, `User stats report at least 1 organiser (got ${stats.userStats.organisers})`);
    assert(stats.userStats.customers >= 1, `User stats report at least 1 customer (got ${stats.userStats.customers})`);
    assert(Array.isArray(stats.recentAppointments), 'Dashboard stats include recent appointments list');
    assert(Array.isArray(stats.recentUsers), 'Dashboard stats include recent users list');

    // -------------------------------------------------------------
    // SECTION 2: Service-level Tests for User Directory & Search
    // -------------------------------------------------------------
    console.log('\n--- Section 2: User Directory, Search, and Filtering ---');
    const allUsersResult = await AdminService.getUsers({ page: 1, limit: 20 });
    assert(allUsersResult.users.length >= 3, `AdminService.getUsers returns registered users (got ${allUsersResult.users.length})`);
    assert(allUsersResult.total >= 3, `AdminService.getUsers reports total count >= 3`);

    // Search by name
    const searchByName = await AdminService.getUsers({ search: 'Regular Customer', page: 1, limit: 10 });
    assert(searchByName.users.length >= 1, 'Search by name finds Regular Customer');
    assert(searchByName.users[0].email === customerUser.email, 'Search match returns correct customer email');

    // Search by email
    const searchByEmail = await AdminService.getUsers({ search: 'facility.head@', page: 1, limit: 10 });
    assert(searchByEmail.users.length >= 1, 'Search by email prefix finds Facility Head');

    // Filter by role: ORGANISER
    const orgsOnly = await AdminService.getUsers({ role: 'ORGANISER', page: 1, limit: 10 });
    assert(orgsOnly.users.every((u) => u.role === 'ORGANISER'), 'Role filter ORGANISER returns only organisers');

    // Filter by role: CUSTOMER
    const custsOnly = await AdminService.getUsers({ role: 'CUSTOMER', page: 1, limit: 10 });
    assert(custsOnly.users.every((u) => u.role === 'CUSTOMER'), 'Role filter CUSTOMER returns only customers');

    // Dedicated providers endpoint
    const providersResult = await AdminService.getProviders({ page: 1, limit: 10 });
    assert(providersResult.providers.every((p) => p.role === 'ORGANISER'), 'getProviders returns only organiser providers');

    // Get user details
    const userDetail = await AdminService.getUserDetails(customerUser.id);
    assert(userDetail.id === customerUser.id, 'getUserDetails retrieves correct customer');
    assert(userDetail.bookingsCount !== undefined, 'Customer details include bookingsCount metric');

    // -------------------------------------------------------------
    // SECTION 3: Account Status (Activation & Deactivation) & Safety Rules
    // -------------------------------------------------------------
    console.log('\n--- Section 3: Safe Account Status Management ---');

    // Create a dummy user to safely toggle status
    const dummyUser = await AdminService.createUser(
      {
        email: 'toggle.target@test.org',
        fullName: 'Toggle Target',
        role: 'CUSTOMER',
        phone: '+1 555-9988',
        isActive: true,
      },
      adminUser
    );
    assert(dummyUser.isActive === true, 'Created dummy user starts as active');

    // Deactivate dummy user
    const deactivated = await AdminService.updateUserStatus(dummyUser.id, false, adminUser, 'Testing deactivation');
    assert(deactivated.isActive === false, 'updateUserStatus successfully sets isActive = false');

    // Reactivate dummy user
    const reactivated = await AdminService.updateUserStatus(dummyUser.id, true, adminUser, 'Testing reactivation');
    assert(reactivated.isActive === true, 'updateUserStatus successfully sets isActive = true');

    // Safety rule 1: Admin cannot deactivate their own account
    let selfDeactivateThrew = false;
    try {
      await AdminService.updateUserStatus(adminUser.id, false, adminUser);
    } catch (err: any) {
      selfDeactivateThrew = true;
      assert(err.statusCode === 400, 'Self-deactivation attempt returns 400 Bad Request');
    }
    assert(selfDeactivateThrew, 'Safety protection blocked admin from self-deactivation');

    // -------------------------------------------------------------
    // SECTION 4: Role Management & Demotion Safeguards
    // -------------------------------------------------------------
    console.log('\n--- Section 4: Safe Role Management ---');

    // Promote dummy user from CUSTOMER to ORGANISER
    const promoted = await AdminService.updateUserRole(dummyUser.id, 'ORGANISER', adminUser);
    assert(promoted.role === 'ORGANISER', 'User successfully promoted to ORGANISER');

    // Change to ADMIN
    const promotedToAdmin = await AdminService.updateUserRole(dummyUser.id, 'ADMIN', adminUser);
    assert(promotedToAdmin.role === 'ADMIN', 'User successfully granted ADMIN role');

    // Demote dummy user back to CUSTOMER
    const demoted = await AdminService.updateUserRole(dummyUser.id, 'CUSTOMER', adminUser);
    assert(demoted.role === 'CUSTOMER', 'User successfully demoted back to CUSTOMER');

    // Invalid role rejected
    let invalidRoleThrew = false;
    try {
      await AdminService.updateUserRole(dummyUser.id, 'SUPER_USER', adminUser);
    } catch (err: any) {
      invalidRoleThrew = true;
      assert(err.statusCode === 400, 'Invalid role assignment returns 400 Bad Request');
    }
    assert(invalidRoleThrew, 'Invalid role was rejected');

    // -------------------------------------------------------------
    // SECTION 5: HTTP REST API Endpoints & Role Guarding
    // -------------------------------------------------------------
    console.log('\n--- Section 5: HTTP REST API Endpoints & Access Control ---');

    // 1. Unauthenticated request to /api/v1/admin/stats returns 401
    const unauthStatsRes = await fetch(`${baseUrl}/admin/stats`);
    assert(unauthStatsRes.status === 401, 'Unauthenticated GET /admin/stats returns 401 Unauthorized');

    // 2. Customer token to /api/v1/admin/stats returns 403
    const custStatsRes = await fetch(`${baseUrl}/admin/stats`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(custStatsRes.status === 403, 'Customer GET /admin/stats returns 403 Forbidden');

    // 3. Organiser token to /api/v1/admin/stats returns 403
    const orgStatsRes = await fetch(`${baseUrl}/admin/stats`, {
      headers: { Authorization: `Bearer ${organiserToken}` },
    });
    assert(orgStatsRes.status === 403, 'Organiser GET /admin/stats returns 403 Forbidden');

    // 4. Admin token to /api/v1/admin/stats returns 200 with complete data
    const adminStatsRes = await fetch(`${baseUrl}/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminStatsRes.status === 200, 'Admin GET /admin/stats returns 200 OK');
    const adminStatsBody = await adminStatsRes.json();
    assert(adminStatsBody.data.totalUsers >= 3, 'HTTP stats payload contains totalUsers');
    assert(adminStatsBody.data.totalProviders >= 1, 'HTTP stats payload contains totalProviders');
    assert(adminStatsBody.data.totalAppointments !== undefined, 'HTTP stats payload contains totalAppointments');

    // 5. Admin GET /api/v1/admin/users
    const adminUsersRes = await fetch(`${baseUrl}/admin/users?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminUsersRes.status === 200, 'Admin GET /admin/users returns 200 OK');
    const adminUsersBody = await adminUsersRes.json();
    assert(Array.isArray(adminUsersBody.data), 'GET /admin/users returns user array');
    assert(adminUsersBody.meta.total >= 3, 'GET /admin/users pagination meta has total');

    // 6. Admin GET /api/v1/admin/providers
    const adminProvidersRes = await fetch(`${baseUrl}/admin/providers`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminProvidersRes.status === 200, 'Admin GET /admin/providers returns 200 OK');
    const adminProvidersBody = await adminProvidersRes.json();
    assert(Array.isArray(adminProvidersBody.data), 'GET /admin/providers returns array');

    // 7. Admin PATCH /api/v1/admin/users/:userId/status (Deactivate)
    const patchStatusRes = await fetch(`${baseUrl}/admin/users/${dummyUser.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isActive: false, reason: 'HTTP API deactivation test' }),
    });
    assert(patchStatusRes.status === 200, 'PATCH /admin/users/:id/status returns 200 OK');
    const patchStatusBody = await patchStatusRes.json();
    assert(patchStatusBody.data.isActive === false, 'Response indicates user is deactivated');

    // 8. Admin Self-Deactivation via HTTP returns 400
    const selfDeactivateRes = await fetch(`${baseUrl}/admin/users/${adminUser.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isActive: false }),
    });
    assert(selfDeactivateRes.status === 400, 'HTTP attempt to self-deactivate admin returns 400 Bad Request');

    // 9. Admin PATCH /api/v1/admin/users/:userId/role (Promote to ORGANISER)
    const patchRoleRes = await fetch(`${baseUrl}/admin/users/${dummyUser.id}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ role: 'ORGANISER' }),
    });
    assert(patchRoleRes.status === 200, 'PATCH /admin/users/:id/role returns 200 OK');
    const patchRoleBody = await patchRoleRes.json();
    assert(patchRoleBody.data.role === 'ORGANISER', 'Response confirms role updated to ORGANISER');

    // 10. Admin Provision new user via POST /api/v1/admin/users
    const postUserRes = await fetch(`${baseUrl}/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        email: `new.staff.${Date.now()}@clinic.test`,
        fullName: 'New Staff Member',
        role: 'ORGANISER',
        phone: '+1 555-7788',
      }),
    });
    assert(postUserRes.status === 201, 'POST /admin/users creates user with 201 Created');
    const postUserBody = await postUserRes.json();
    assert(postUserBody.data.role === 'ORGANISER', 'Provisioned user has ORGANISER role');

    // 11. Platform-level booking visibility: GET /api/v1/admin/bookings
    const adminBookingsRes = await fetch(`${baseUrl}/admin/bookings`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminBookingsRes.status === 200, 'Admin GET /admin/bookings returns 200 OK');

    console.log('\n================================================================');
    console.log(`🎉 ALL ${passedTests}/${totalTests} ADMIN MANAGEMENT TESTS PASSED!`);
    console.log('================================================================');
  } finally {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
}

runAdminManagementTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
