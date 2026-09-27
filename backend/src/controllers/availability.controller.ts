import { Request, Response, NextFunction } from 'express';
import { SlotEngineService } from '../services/slot-engine.service';
import { successResponse } from '../utils/apiResponse';
import { ServiceAvailabilityQuery } from '../validators/availability.validator';

export class AvailabilityController {
  /**
   * GET /api/v1/services/:id/availability
   * GET /api/v1/availability/services/:serviceId
   * Exposes only currently bookable appointment slots for a service across a date range.
   */
  public static async getServiceAvailability(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const serviceId = req.params.serviceId || req.params.id;
      const query = req.query as unknown as ServiceAvailabilityQuery;

      const availability = await SlotEngineService.generateSlots({
        serviceId,
        startDate: query.startDate,
        endDate: query.endDate,
        resourceId: query.resourceId,
        slotStepMinutes: query.slotStep,
        attendeeCount: query.attendees,
        shareToken: query.shareToken,
      });

      res.json(
        successResponse(
          availability,
          `Available appointment slots retrieved for "${availability.service.name}" (${availability.totalBookableSlots} slots bookable)`
        )
      );
    } catch (error) {
      next(error);
    }
  }
}
