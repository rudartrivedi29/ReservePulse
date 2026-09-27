import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/payment/payment.service';
import { successResponse } from '../utils/apiResponse';
import { ConfirmPaymentPayload } from '../validators/payment.validator';

export class PaymentController {
  /**
   * POST /api/v1/bookings/:idOrReference/payment-intent
   * Generate or retrieve a payment intent for a booking requiring advance payment
   */
  public static async createPaymentIntent(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const idOrReference = req.params.idOrReference || req.params.id || req.params.bookingId;
      const intent = await PaymentService.createIntentForBookingId(idOrReference, req.user);

      res.status(201).json(
        successResponse(
          intent,
          `Payment intent generated for booking "${idOrReference}"`
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/bookings/:idOrReference/confirm-payment
   * Capture and confirm payment for a booking
   */
  public static async confirmPayment(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const idOrReference = req.params.idOrReference || req.params.id || req.params.bookingId;
      const payload = req.body as ConfirmPaymentPayload;

      const result = await PaymentService.confirmPayment(
        idOrReference,
        payload,
        req.user
      );

      if (result.success) {
        res.json(
          successResponse(
            result,
            `Payment authorized and booking "${result.booking.bookingReference}" confirmed`
          )
        );
      } else {
        // Return 402 Payment Required or 400 Bad Request with result object
        res.status(402).json({
          success: false,
          message: result.errorMessage || 'Payment failed or declined',
          data: result,
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/bookings/:idOrReference/payment
   * Retrieve payment history and audit trail for a booking
   */
  public static async getPaymentDetails(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const idOrReference = req.params.idOrReference || req.params.id || req.params.bookingId;
      const details = await PaymentService.getPaymentDetailsForBooking(idOrReference);

      res.json(
        successResponse(
          details,
          `Payment records for booking "${idOrReference}" retrieved`
        )
      );
    } catch (error) {
      next(error);
    }
  }
}
