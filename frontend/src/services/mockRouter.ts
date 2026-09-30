/**
 * Client-Side Mock Router for Standalone & Offline Execution
 * 
 * Intercepts all REST API endpoints and routes them directly to the
 * in-browser Cookie & LocalStorage database engine.
 */

import { cookieDb } from '../utils/cookieDb';
import type { ApiResponse } from '../types';

function ok<T>(data?: T, message?: string, meta?: any): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    meta,
    timestamp: new Date().toISOString(),
  };
}

export async function handleClientMockRequest<T>(
  method: string,
  rawEndpoint: string,
  body?: any
): Promise<ApiResponse<T>> {
  // Simulate minimal realistic latency for silky smooth micro-interactions
  await new Promise((resolve) => setTimeout(resolve, 60));

  const url = new URL(rawEndpoint, 'http://localhost');
  const path = url.pathname;
  const searchParams = url.searchParams;

  // --------------------------------------------------------------------------
  // Health & Pulse Endpoints
  // --------------------------------------------------------------------------
  if (path === '/health' || path === '/health/ping' || path === '/api/v1/health' || path === '/api/v1/health/ping') {
    return ok({
      status: 'healthy',
      service: 'ReservePulse Client Orchestration Engine',
      mode: 'standalone-cookie-db',
      database: 'connected (browser-cookie-storage)',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: 99.99,
      ping: 'pong',
    } as any, 'System healthy (Cookie DB Mode)');
  }

  // --------------------------------------------------------------------------
  // Auth Endpoints
  // --------------------------------------------------------------------------
  if (path === '/auth/login') {
    const session = cookieDb.loginUser(body?.email || 'customer@reservepulse.com', body?.password);
    return ok(session as any, 'Logged in successfully via Client Cookie DB');
  }

  if (path === '/auth/signup') {
    const session = cookieDb.registerUser({
      email: body?.email,
      fullName: body?.fullName || 'New User',
      role: body?.role || 'CUSTOMER',
      phone: body?.phone,
    });
    return ok(session as any, 'Account registered and authenticated in Client Cookie DB');
  }

  if (path === '/auth/verify-otp') {
    const session = cookieDb.loginUser(body?.email || 'customer@reservepulse.com');
    return ok(session as any, 'OTP verified successfully');
  }

  if (path === '/auth/resend-otp') {
    return ok({ otp: '123456', message: 'Demo verification code is 123456' } as any, 'Verification code resent');
  }

  if (path === '/auth/forgot-password') {
    return ok({ resetToken: 'tok_demo_reset_token', message: 'Password reset link generated' } as any, 'Reset link generated');
  }

  if (path === '/auth/reset-password') {
    return ok({ message: 'Password updated successfully' } as any, 'Password reset successfully');
  }

  if (path === '/auth/me') {
    const user = cookieDb.getCurrentUser() || {
      id: 'usr_cust_001',
      name: 'Alex Morgan',
      email: 'customer@reservepulse.com',
      role: 'customer',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
      organization: 'Enterprise Solutions Inc.',
      isVerified: true,
    };
    return ok({
      id: user.id || 'usr_cust_001',
      email: user.email,
      fullName: user.name,
      role: (user.role || 'customer').toUpperCase() as any,
      phone: user.phone,
      isVerified: true,
      createdAt: '2026-09-01T08:00:00.000Z',
      updatedAt: '2026-09-01T08:00:00.000Z',
    } as any);
  }

  // --------------------------------------------------------------------------
  // Service Endpoints
  // --------------------------------------------------------------------------
  if (path === '/services' || path === '/organiser/services') {
    if (method === 'POST') {
      const created = cookieDb.createService(body);
      return ok(created as any, 'Service created');
    }
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || undefined;
    const services = cookieDb.getServices(category, search);
    return ok(services as any);
  }

  if (path === '/services/categories') {
    return ok(['All', 'Workspace', 'Compute', 'Consulting', 'Hardware', 'Research'] as any);
  }

  const servicePreviewMatch = path.match(/^\/services\/preview\/([^/]+)$/);
  if (servicePreviewMatch) {
    const token = servicePreviewMatch[1];
    const service = cookieDb.getServiceByIdOrSlug(token);
    if (!service) throw new Error('Service preview not found');
    return ok(service as any);
  }

  // Availability Endpoints: Supports /services/:serviceId/availability and /availability/services/:serviceId
  const serviceAvailabilityMatch =
    path.match(/^(?:\/api\/v1)?\/services\/([^/]+)\/availability\/?$/) ||
    path.match(/^(?:\/api\/v1)?\/availability\/services\/([^/]+)\/?$/);
  if (serviceAvailabilityMatch) {
    const serviceId = serviceAvailabilityMatch[1] || serviceAvailabilityMatch[2];
    const start = searchParams.get('startDate') || undefined;
    const end = searchParams.get('endDate') || undefined;
    const resourceId = searchParams.get('resourceId') || undefined;
    const attendees = Number(searchParams.get('attendees')) || 1;
    const slotStep = Number(searchParams.get('slotStep')) || undefined;
    const avail = cookieDb.getAvailability(serviceId, start, end, resourceId, attendees, slotStep);
    return ok(avail as any);
  }

  // Schedule Normalized Availability for Calendar inspector
  const scheduleResourceAvailMatch = path.match(/^(?:\/api\/v1)?\/schedules\/resources\/([^/]+)\/availability\/?$/);
  if (scheduleResourceAvailMatch) {
    const resourceId = scheduleResourceAvailMatch[1];
    const start = searchParams.get('startDate') || new Date().toISOString().split('T')[0];
    const end = searchParams.get('endDate') || start;
    const resource = cookieDb.getResourceById(resourceId) || cookieDb.getResources()[0];
    const days: any[] = [];
    const [sy, sm, sd] = start.split('-').map(Number);
    const [ey, em, ed] = end.split('-').map(Number);
    const startD = new Date(sy || 2026, (sm || 1) - 1, sd || 1);
    const endD = new Date(ey || 2026, (em || 1) - 1, ed || 1);
    const cur = new Date(startD);
    while (cur <= endD) {
      const cy = cur.getFullYear();
      const cm = String(cur.getMonth() + 1).padStart(2, '0');
      const cday = String(cur.getDate()).padStart(2, '0');
      const dStr = `${cy}-${cm}-${cday}`;
      const dow = cur.getDay();
      const isWeekday = dow >= 1 && dow <= 5;
      days.push({
        date: dStr,
        dayOfWeek: dow,
        dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dow],
        isAvailable: isWeekday,
        workingIntervals: isWeekday ? [{
          startTime: '09:00',
          endTime: '17:00',
          startMinutes: 540,
          endMinutes: 1020,
          durationMinutes: 480,
        }] : [],
      });
      cur.setDate(cur.getDate() + 1);
    }
    return ok({
      resourceId,
      resourceName: resource?.name || 'Resource',
      resourceType: resource?.resourceType || 'room',
      capacity: resource?.capacity || 1,
      startDate: start,
      endDate: end,
      days,
    } as any);
  }

  const serviceQuestionsMatch = path.match(/^\/services\/([^/]+)\/questions$/);
  if (serviceQuestionsMatch) {
    const serviceId = serviceQuestionsMatch[1];
    const questions = cookieDb.getQuestionsForService(serviceId);
    return ok(questions as any);
  }

  const serviceDetailMatch = path.match(/^\/(?:services|organiser\/services)\/([^/]+)$/);
  if (serviceDetailMatch) {
    const serviceId = serviceDetailMatch[1];
    if (method === 'PUT') {
      const updated = cookieDb.updateService(serviceId, body);
      return ok(updated as any, 'Service updated');
    }
    if (method === 'DELETE') {
      cookieDb.deleteService(serviceId);
      return ok({ message: 'Service deleted' } as any);
    }
    const service = cookieDb.getServiceByIdOrSlug(serviceId);
    if (!service) throw new Error('Service not found');
    return ok(service as any);
  }

  const servicePublishMatch = path.match(/^\/organiser\/services\/([^/]+)\/(publish|unpublish)$/);
  if (servicePublishMatch) {
    const serviceId = servicePublishMatch[1];
    const isPub = servicePublishMatch[2] === 'publish';
    const updated = cookieDb.updateService(serviceId, { isPublished: isPub });
    return ok(updated as any, `Service ${isPub ? 'published' : 'unpublished'}`);
  }

  const serviceRegenShareMatch = path.match(/^\/organiser\/services\/([^/]+)\/regenerate-share-link$/);
  if (serviceRegenShareMatch) {
    const serviceId = serviceRegenShareMatch[1];
    const newTok = `tok_share_${Date.now()}`;
    cookieDb.updateService(serviceId, { shareToken: newTok });
    return ok({ shareToken: newTok, shareUrl: `/services/preview/${newTok}` } as any);
  }

  // --------------------------------------------------------------------------
  // Resource Endpoints
  // --------------------------------------------------------------------------
  if (path === '/resources' || path === '/organiser/resources') {
    if (method === 'POST') {
      const created = cookieDb.createResource(body);
      return ok(created as any, 'Resource created');
    }
    return ok(cookieDb.getResources() as any);
  }

  const serviceResourcesMatch = path.match(/^\/services\/([^/]+)\/resources$/) || path.match(/^\/resources\/service\/([^/]+)$/);
  if (serviceResourcesMatch) {
    return ok(cookieDb.getResources() as any);
  }

  const resourceDetailMatch = path.match(/^\/organiser\/resources\/([^/]+)$/);
  if (resourceDetailMatch) {
    const resourceId = resourceDetailMatch[1];
    if (method === 'PUT') {
      const updated = cookieDb.updateResource(resourceId, body);
      return ok(updated as any, 'Resource updated');
    }
    if (method === 'DELETE') {
      cookieDb.deleteResource(resourceId);
      return ok({ id: resourceId } as any, 'Resource deleted');
    }
    const resource = cookieDb.getResourceById(resourceId);
    return ok(resource as any);
  }

  const resourceToggleMatch = path.match(/^\/organiser\/resources\/([^/]+)\/(activate|deactivate)$/);
  if (resourceToggleMatch) {
    const resourceId = resourceToggleMatch[1];
    const isAct = resourceToggleMatch[2] === 'activate';
    const updated = cookieDb.updateResource(resourceId, { status: isAct ? 'operational' : 'maintenance' });
    return ok(updated as any);
  }

  const resourceScheduleMatch = path.match(/^\/organiser\/resources\/([^/]+)\/schedule$/);
  if (resourceScheduleMatch) {
    return ok({
      resourceId: resourceScheduleMatch[1],
      weeklySchedule: [
        { dayOfWeek: 1, isAvailable: true, shifts: [{ startTime: '09:00', endTime: '17:00' }] },
        { dayOfWeek: 2, isAvailable: true, shifts: [{ startTime: '09:00', endTime: '17:00' }] },
        { dayOfWeek: 3, isAvailable: true, shifts: [{ startTime: '09:00', endTime: '17:00' }] },
        { dayOfWeek: 4, isAvailable: true, shifts: [{ startTime: '09:00', endTime: '17:00' }] },
        { dayOfWeek: 5, isAvailable: true, shifts: [{ startTime: '09:00', endTime: '17:00' }] },
        { dayOfWeek: 6, isAvailable: false, shifts: [] },
        { dayOfWeek: 0, isAvailable: false, shifts: [] },
      ],
    } as any);
  }

  // --------------------------------------------------------------------------
  // Booking Endpoints
  // --------------------------------------------------------------------------
  if (path === '/bookings' || path === '/customer/bookings' || path === '/organiser/bookings' || path === '/admin/bookings') {
    if (method === 'POST') {
      const currentUser = cookieDb.getCurrentUser();
      const created = cookieDb.createBooking(body, currentUser);
      return ok(created as any, 'Reservation confirmed!');
    }
    const role = path.includes('/customer/') ? 'CUSTOMER' : path.includes('/organiser/') ? 'ORGANISER' : 'ADMIN';
    const currentUser = cookieDb.getCurrentUser();
    const bookings = cookieDb.getBookings(role, currentUser?.id);
    return ok(bookings as any);
  }

  const bookingCancelMatch = path.match(/^\/bookings\/([^/]+)\/cancel$/);
  if (bookingCancelMatch) {
    const cancelled = cookieDb.cancelBooking(bookingCancelMatch[1], body?.reason);
    return ok(cancelled as any, 'Booking cancelled');
  }

  const bookingConfirmMatch = path.match(/^\/organiser\/bookings\/([^/]+)\/confirm$/);
  if (bookingConfirmMatch) {
    const confirmed = cookieDb.confirmBooking(bookingConfirmMatch[1]);
    return ok(confirmed as any, 'Booking confirmed');
  }

  const bookingPaymentIntentMatch = path.match(/^\/bookings\/([^/]+)\/payment-intent$/);
  if (bookingPaymentIntentMatch) {
    return ok({
      paymentIntentId: `pi_demo_${Date.now()}`,
      clientSecret: 'secret_demo_client_secret',
      provider: 'mock',
      amount: 180,
      currency: 'USD',
      status: 'succeeded',
      requiresAdvancePayment: false,
    } as any);
  }

  const bookingPaymentMatch = path.match(/^\/bookings\/([^/]+)\/payment$/);
  if (bookingPaymentMatch) {
    return ok({
      id: `pay_${Date.now()}`,
      transactionReference: `TX-RP-${Math.floor(100000 + Math.random() * 900000)}`,
      paymentMethod: 'credit_card',
      amount: 180,
      currency: 'USD',
      status: 'paid',
      paidAt: new Date().toISOString(),
    } as any);
  }

  const bookingDetailMatch = path.match(/^\/bookings\/([^/]+)$/);
  if (bookingDetailMatch) {
    const booking = cookieDb.getBookingByIdOrRef(bookingDetailMatch[1]);
    if (!booking) throw new Error('Booking not found');
    return ok(booking as any);
  }

  // --------------------------------------------------------------------------
  // Admin & Analytics Endpoints
  // --------------------------------------------------------------------------
  if (path === '/admin/stats') {
    return ok(cookieDb.getAdminStats() as any);
  }

  if (path === '/admin/users') {
    const users = cookieDb.getAdminUsers();
    return ok(users as any, undefined, {
      total: users.length,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
  }

  const adminUserDetailMatch = path.match(/^\/admin\/users\/([^/]+)$/);
  if (adminUserDetailMatch) {
    const userId = adminUserDetailMatch[1];
    if (method === 'PATCH' && body?.role) {
      const updated = cookieDb.updateAdminUserRole(userId, body.role);
      return ok(updated as any, 'User role updated');
    }
  }

  if (path === '/admin/audit-logs') {
    return ok(cookieDb.getAuditLogs() as any);
  }

  if (path === '/analytics/dashboard') {
    const timeFilter = searchParams.get('timeFilter') || '30d';
    return ok(cookieDb.getAnalyticsOverview(timeFilter) as any);
  }

  if (path === '/analytics/occupancy') {
    return ok({
      fleetUtilization: 78.4,
      occupancyMatrix: [],
    } as any);
  }

  // --------------------------------------------------------------------------
  // Fallback Catch-All
  // --------------------------------------------------------------------------
  return ok((body || {}) as any, 'Operation executed successfully in client cookie DB');
}
