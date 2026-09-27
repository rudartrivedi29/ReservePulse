import { Router } from 'express';
import { BookingController } from '../controllers/booking.controller';
import { PaymentController } from '../controllers/payment.controller';
import { optionalAuthenticate } from '../middleware/auth.middleware';
import { validateBody } from '../validators';
import { createBookingSchema, cancelBookingSchema } from '../validators/booking.validator';
import { confirmPaymentSchema } from '../validators/payment.validator';

const router = Router();

// 1. Create a reservation with server-side double availability validation and duplicate prevention
router.post(
  '/',
  optionalAuthenticate,
  validateBody(createBookingSchema),
  BookingController.createBooking
);

// 2. Lookup booking details by reference code or ID
router.get(
  '/:idOrReference',
  optionalAuthenticate,
  BookingController.getBookingDetails
);

// 3. Cancel reservation and release slot capacity
router.patch(
  '/:idOrReference/cancel',
  optionalAuthenticate,
  validateBody(cancelBookingSchema),
  BookingController.cancelBooking
);

// 4. Payment flow: create payment intent for booking
router.post(
  '/:idOrReference/payment-intent',
  optionalAuthenticate,
  PaymentController.createPaymentIntent
);

// 5. Payment flow: safely confirm/capture payment without card data leakage
router.post(
  '/:idOrReference/confirm-payment',
  optionalAuthenticate,
  validateBody(confirmPaymentSchema),
  PaymentController.confirmPayment
);

// 6. Payment flow: retrieve payment records and transaction history
router.get(
  '/:idOrReference/payment',
  optionalAuthenticate,
  PaymentController.getPaymentDetails
);

export const bookingRoutes = router;

