import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { successResponse } from '../utils/apiResponse';
import { AnalyticsQuery } from '../validators/analytics.validator';

export class AnalyticsController {
  /**
   * GET /api/v1/analytics/overview
   * GET /api/v1/organiser/analytics
   * Retrieve complete analytics overview: headline KPIs, appointment trends, peak hours, and provider utilization
   */
  public static async getOverview(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query = req.query as unknown as AnalyticsQuery;
      const data = await AnalyticsService.getAnalyticsOverview(query, req.user!);
      res.json(successResponse(data, 'Platform analytics overview retrieved successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/analytics/appointments
   * Retrieve appointment trends, fulfillment metrics, and status breakdowns
   */
  public static async getAppointments(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query = req.query as unknown as AnalyticsQuery;
      const data = await AnalyticsService.getAnalyticsOverview(query, req.user!);
      res.json(
        successResponse(
          {
            summary: data.summary,
            trend: data.trend,
            statusBreakdown: data.statusBreakdown,
            meta: data.meta,
          },
          'Appointment analytics retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/analytics/peak-hours
   * Retrieve hourly booking distribution, peak demand hours, and busiest operational windows
   */
  public static async getPeakHours(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query = req.query as unknown as AnalyticsQuery;
      const data = await AnalyticsService.getAnalyticsOverview(query, req.user!);
      res.json(
        successResponse(
          {
            peakHours: data.peakHours,
            meta: data.meta,
          },
          'Peak booking hours analytics retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/analytics/utilization
   * Retrieve provider and resource capacity utilization, booked hours, and efficiency rates
   */
  public static async getUtilization(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query = req.query as unknown as AnalyticsQuery;
      const data = await AnalyticsService.getAnalyticsOverview(query, req.user!);
      res.json(
        successResponse(
          {
            fleetUtilizationRate: data.summary.fleetUtilizationRate,
            providerUtilization: data.providerUtilization,
            meta: data.meta,
          },
          'Provider utilization metrics retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }
}
