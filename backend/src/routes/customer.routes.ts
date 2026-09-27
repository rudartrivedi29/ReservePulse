import { Router } from 'express';
import { authenticate, requireCustomer } from '../middleware/auth.middleware';
import { BookingController } from '../controllers/booking.controller';
import { validateQuery, validateBody } from '../validators';
import {
  createBookingSchema,
  cancelBookingSchema,
  listBookingsQuerySchema,
} from '../validators/booking.validator';
import { successResponse } from '../utils/apiResponse';
import { AuthService } from '../services/auth.service';

const router = Router();

// Apply customer authentication and authorization guard to all routes
router.use(authenticate, requireCustomer);

/**
 * GET /api/v1/customer/bookings
 * Customer personal booking history & upcoming reservations
 */
router.get(
  '/bookings',
  validateQuery(listBookingsQuerySchema),
  BookingController.getCustomerBookings
);

/**
 * POST /api/v1/customer/bookings
 * Create a new customer reservation
 */
router.post(
  '/bookings',
  validateBody(createBookingSchema),
  BookingController.createBooking
);

/**
 * GET /api/v1/customer/bookings/:idOrReference
 * Detailed reservation view for the authenticated customer
 */
router.get(
  '/bookings/:idOrReference',
  BookingController.getBookingDetails
);

/**
 * PATCH /api/v1/customer/bookings/:idOrReference/cancel
 * Cancel customer reservation and release slot
 */
router.patch(
  '/bookings/:idOrReference/cancel',
  validateBody(cancelBookingSchema),
  BookingController.cancelBooking
);

/**
 * GET /api/v1/customer/profile
 * Customer account details & notification preferences
 */
router.get('/profile', async (req, res, next) => {
  try {
    const user = await AuthService.findUserById(req.user!.id);
    res.json(
      successResponse(
        {
          id: req.user!.id,
          email: req.user!.email,
          fullName: req.user!.fullName,
          role: req.user!.role,
          phone: user?.phone,
          isVerified: req.user!.isVerified,
          isActive: user?.is_active ?? true,
          createdAt: user?.created_at,
          preferences: {
            timezone: 'UTC',
            notificationsEmail: true,
            notificationsSms: Boolean(user?.phone),
          },
        },
        'Customer profile preferences retrieved'
      )
    );
  } catch (err) {
    next(err);
  }
});

export const customerRoutes = router;
