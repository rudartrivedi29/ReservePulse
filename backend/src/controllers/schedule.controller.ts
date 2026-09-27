import { Request, Response, NextFunction } from 'express';
import { SchedulingService } from '../services/schedule.service';
import { successResponse } from '../utils/apiResponse';

export class ScheduleController {
  /**
   * Get weekly working hours schedule for a resource
   */
  public static async getResourceSchedule(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const resourceId = req.params.resourceId || req.params.id;
      const organiserId = req.user?.id;
      const isAdmin = req.user?.role === 'ADMIN';

      const schedule = await SchedulingService.getWeeklySchedule(
        resourceId,
        organiserId,
        isAdmin
      );

      res.json(successResponse(schedule, 'Weekly schedule retrieved successfully'));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update weekly working hours schedule for a resource
   */
  public static async updateResourceSchedule(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const resourceId = req.params.resourceId || req.params.id;
      const organiserId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';

      const schedule = await SchedulingService.updateWeeklySchedule(
        resourceId,
        organiserId,
        req.body.schedule,
        isAdmin
      );

      res.json(
        successResponse(schedule, 'Weekly working schedule updated successfully')
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get normalized day-by-day availability intervals for a date range (Slot engine input)
   */
  public static async getNormalizedAvailability(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const resourceId = req.params.resourceId || req.params.id;
      const { startDate, endDate } = req.query;

      const availability = await SchedulingService.getNormalizedAvailability(
        resourceId,
        startDate as string,
        endDate as string
      );

      res.json(
        successResponse(
          availability,
          'Normalized availability schedule retrieved successfully'
        )
      );
    } catch (err) {
      next(err);
    }
  }
}
