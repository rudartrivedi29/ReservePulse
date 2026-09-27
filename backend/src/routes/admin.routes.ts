import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { successResponse } from '../utils/apiResponse';
import { validateBody, validateQuery } from '../validators';
import { AdminController } from '../controllers/admin.controller';
import { BookingController } from '../controllers/booking.controller';
import {
  listUsersQuerySchema,
  updateUserStatusSchema,
  updateUserRoleSchema,
  createAdminUserInputSchema,
} from '../validators/admin.validator';
import {
  listBookingsQuerySchema,
  confirmBookingSchema,
  cancelBookingSchema,
} from '../validators/booking.validator';

const router = Router();

// Apply admin-only authorization guard to ALL admin endpoints
router.use(authenticate, requireAdmin);

/**
 * Platform Telemetry & Dashboard Overview
 */
router.get('/stats', AdminController.getDashboardStats);
router.get('/dashboard', AdminController.getDashboardStats);

/**
 * User & Service Provider Governance Endpoints
 */
router.get('/users', validateQuery(listUsersQuerySchema), AdminController.getUsers);
router.post('/users', validateBody(createAdminUserInputSchema), AdminController.createUser);
router.get('/users/:userId', AdminController.getUserDetails);
router.patch(
  '/users/:userId/status',
  validateBody(updateUserStatusSchema),
  AdminController.updateUserStatus
);
router.patch(
  '/users/:userId/role',
  validateBody(updateUserRoleSchema),
  AdminController.updateUserRole
);

/**
 * Dedicated Service Providers (Organisers) Fleet
 */
router.get('/providers', validateQuery(listUsersQuerySchema), AdminController.getProviders);

/**
 * Global Resource Fleet Governance
 */
router.get('/resources', AdminController.getResources);

/**
 * Platform-wide Admin Booking Governance Endpoints
 */
router.get(
  '/bookings',
  validateQuery(listBookingsQuerySchema),
  BookingController.getAdminBookings
);
router.get(
  '/bookings/:idOrReference',
  BookingController.getBookingDetails
);
router.patch(
  '/bookings/:idOrReference/confirm',
  validateBody(confirmBookingSchema),
  BookingController.confirmBooking
);
router.patch(
  '/bookings/:idOrReference/cancel',
  validateBody(cancelBookingSchema),
  BookingController.cancelBooking
);

export const adminRoutes = router;
