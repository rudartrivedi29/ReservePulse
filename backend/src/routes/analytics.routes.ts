import { Router } from 'express';
import { authenticate, requireRoles } from '../middleware/auth.middleware';
import { validateQuery } from '../validators';
import { analyticsQuerySchema } from '../validators/analytics.validator';
import { AnalyticsController } from '../controllers/analytics.controller';

const router = Router();

// Restrict analytics access to authenticated ORGANISER or ADMIN users
router.use(authenticate, requireRoles('ORGANISER', 'ADMIN'));

/**
 * GET /api/v1/analytics
 * GET /api/v1/analytics/overview
 * Comprehensive analytics overview: headline metrics, timeline trend, peak hours, and provider utilization
 */
router.get('/', validateQuery(analyticsQuerySchema), AnalyticsController.getOverview);
router.get('/overview', validateQuery(analyticsQuerySchema), AnalyticsController.getOverview);

/**
 * GET /api/v1/analytics/appointments
 * Appointment trends and fulfillment statistics
 */
router.get('/appointments', validateQuery(analyticsQuerySchema), AnalyticsController.getAppointments);

/**
 * GET /api/v1/analytics/peak-hours
 * Peak booking hours distribution (excluding cancelled bookings)
 */
router.get('/peak-hours', validateQuery(analyticsQuerySchema), AnalyticsController.getPeakHours);

/**
 * GET /api/v1/analytics/utilization
 * Capacity and utilization metrics across providers and resources
 */
router.get('/utilization', validateQuery(analyticsQuerySchema), AnalyticsController.getUtilization);

export const analyticsRoutes = router;
