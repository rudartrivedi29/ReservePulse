import { Request, Response, NextFunction } from 'express';
import { BookingService } from '../services/booking.service';
import { QuestionService } from '../services/question.service';
import { successResponse } from '../utils/apiResponse';
import { UnauthorizedError } from '../utils/errors';
import {
  CreateBookingInput,
  CancelBookingInput,
  ConfirmBookingInput,
  ListBookingsQuery,
} from '../validators/booking.validator';

export class BookingController {
  /**
   * POST /api/v1/bookings
   * Create a new booking reservation with server-side double availability validation
   */
  public static async createBooking(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const input = req.body as CreateBookingInput;
      // Also accept Idempotency-Key header if provided
      const headerKey = req.header('idempotency-key') || req.header('x-idempotency-key');
      if (headerKey && !input.idempotencyKey) {
        input.idempotencyKey = headerKey;
      }

      const booking = await BookingService.createBooking(input, req.user);

      res.status(201).json(
        successResponse(
          booking,
          `Reservation confirmed successfully! Reference: ${booking.bookingReference}`,
          { bookingReference: booking.bookingReference }
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/customer/bookings
   * Retrieve bookings for the authenticated customer (upcoming/past/cancelled)
   */
  public static async getCustomerBookings(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query = req.query as unknown as ListBookingsQuery;
      const customerId = req.user?.id;
      const customerEmail = req.user?.email;

      const result = await BookingService.getBookings({
        customerId,
        customerEmail,
        query,
      });

      res.json(
        successResponse(
          result.bookings,
          `Customer reservations retrieved successfully (${result.total} found)`,
          { total: result.total, page: result.page, limit: result.limit }
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/organiser/bookings
   * Retrieve bookings for the authenticated organiser's services with filtering and search
   */
  public static async getOrganiserBookings(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query = req.query as unknown as ListBookingsQuery;
      const organiserId = req.user!.id;
      const isAdmin = (req.user?.role || '').toUpperCase() === 'ADMIN';

      const result = await BookingService.getBookings({
        organiserId,
        isAdmin,
        query,
      });

      res.json(
        successResponse(
          result.bookings,
          `Organiser reservations retrieved successfully (${result.total} found)`,
          { total: result.total, page: result.page, limit: result.limit }
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/bookings
   * Retrieve platform-wide bookings for administrative governance with optional organiser filtering
   */
  public static async getAdminBookings(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query = req.query as unknown as ListBookingsQuery;

      const result = await BookingService.getBookings({
        isAdmin: true,
        query,
      });

      res.json(
        successResponse(
          result.bookings,
          `Global platform reservations retrieved successfully (${result.total} found)`,
          { total: result.total, page: result.page, limit: result.limit }
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/bookings/:idOrReference
   * Lookup booking details by reference code or internal ID with role and ownership checks
   */
  public static async getBookingDetails(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const idOrReference = req.params.idOrReference || req.params.id || req.params.reference;
      const booking = await BookingService.getBookingByIdOrReference(idOrReference, req.user);

      // Defend against unauthenticated enumeration of customer reservations by internal UUID
      if (booking.customerId && !req.user && idOrReference !== booking.bookingReference) {
        throw new UnauthorizedError('Authentication required to access customer reservation details');
      }

      res.json(
        successResponse(
          booking,
          `Booking details for reference "${booking.bookingReference}" retrieved`
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/bookings/:idOrReference/confirm
   * Manually confirm a pending reservation (Organiser / Admin)
   */
  public static async confirmBooking(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const idOrReference = req.params.idOrReference || req.params.id || req.params.reference;
      const input = (req.body || {}) as ConfirmBookingInput;

      const booking = await BookingService.confirmBooking(idOrReference, req.user!, input);

      res.json(
        successResponse(
          booking,
          `Reservation ${booking.bookingReference} has been successfully confirmed`
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/bookings/:idOrReference/cancel
   * Cancel an appointment and release slot capacity
   */
  public static async cancelBooking(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const idOrReference = req.params.idOrReference || req.params.id || req.params.reference;
      const { reason } = (req.body || {}) as CancelBookingInput;

      // Defend against unauthenticated cancellation of registered customer reservations
      const existing = await BookingService.getBookingByIdOrReference(idOrReference);
      if (existing.customerId && !req.user) {
        throw new UnauthorizedError('Authentication required to cancel a customer account reservation');
      }

      const booking = await BookingService.cancelBooking(idOrReference, reason, req.user);

      res.json(
        successResponse(
          booking,
          `Reservation ${booking.bookingReference} has been successfully cancelled and slot released`
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/services/:serviceId/questions
   * Retrieve intake questions for a service
   */
  public static async getServiceQuestions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const serviceId = req.params.serviceId || req.params.id;
      const questions = await QuestionService.getQuestionsForService(serviceId);

      res.json(
        successResponse(
          questions,
          `Intake questions for service "${serviceId}" retrieved`
        )
      );
    } catch (error) {
      next(error);
    }
  }
}
