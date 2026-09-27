import { Request, Response, NextFunction } from 'express';
import { HealthService } from '../services/health.service';
import { successResponse, errorResponse } from '../utils/apiResponse';

export class HealthController {
  /**
   * Comprehensive System Health Check
   * GET /api/v1/health
   */
  public static async getHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = await HealthService.getSystemStatus();
      const message =
        status.status === 'healthy'
          ? 'ReservePulse API is healthy and operational'
          : 'ReservePulse API is degraded: database service is currently offline';

      res.status(200).json(successResponse(status, message));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lightweight Liveness Probe
   * GET /api/v1/health/ping
   */
  public static getPing(req: Request, res: Response): void {
    res.status(200).json(
      successResponse(
        {
          ping: 'pong',
          uptimeSeconds: Math.floor(process.uptime()),
        },
        'Pong'
      )
    );
  }

  /**
   * Dedicated PostgreSQL Database Connectivity Probe
   * GET /api/v1/health/database
   */
  public static async getDatabaseHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dbStatus = await HealthService.getDatabaseStatus();

      if (dbStatus.isConnected) {
        res.status(200).json(
          successResponse(dbStatus, 'PostgreSQL database connection is healthy')
        );
      } else {
        res.status(503).json(
          errorResponse(
            'PostgreSQL database connection is currently unavailable',
            'DATABASE_UNAVAILABLE',
            dbStatus
          )
        );
      }
    } catch (error) {
      next(error);
    }
  }
}
