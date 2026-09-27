import { Router } from 'express';
import { authenticate, requireOrganiser } from '../middleware/auth.middleware';
import { successResponse } from '../utils/apiResponse';

import { ServiceController } from '../controllers/service.controller';
import { validateBody, validateQuery } from '../validators';
import { createServiceSchema, updateServiceSchema } from '../validators/service.validator';

import { ResourceController } from '../controllers/resource.controller';
import {
  createResourceSchema,
  updateResourceSchema,
  assignServiceSchema,
  setResourceServicesSchema,
} from '../validators/resource.validator';

import { ScheduleController } from '../controllers/schedule.controller';
import {
  updateWeeklyScheduleSchema,
  availabilityQuerySchema,
} from '../validators/schedule.validator';

import { BookingController } from '../controllers/booking.controller';
import {
  listBookingsQuerySchema,
  confirmBookingSchema,
  cancelBookingSchema,
} from '../validators/booking.validator';

import { questionRoutes } from './question.routes';
import { AnalyticsController } from '../controllers/analytics.controller';
import { analyticsQuerySchema } from '../validators/analytics.validator';

const router = Router();

// Apply organiser authorization guard to all routes
router.use(authenticate, requireOrganiser);

/**
 * Organiser Service Management Endpoints
 */
router.get('/services', ServiceController.getOrganiserServices);
router.post('/services', validateBody(createServiceSchema), ServiceController.createService);
router.get('/services/:id', ServiceController.getServiceById);
router.put('/services/:id', validateBody(updateServiceSchema), ServiceController.updateService);
router.patch('/services/:id/publish', ServiceController.publishService);
router.patch('/services/:id/unpublish', ServiceController.unpublishService);
router.post('/services/:id/regenerate-share-link', ServiceController.regenerateShareToken);
router.delete('/services/:id', ServiceController.deleteService);

/**
 * Organiser Service Intake Questions Management Endpoints
 */
router.use('/services/:serviceId/questions', questionRoutes);

/**
 * Organiser Resource & Provider Management Endpoints
 */
router.get('/resources', ResourceController.getOrganiserResources);
router.post('/resources', validateBody(createResourceSchema), ResourceController.createResource);
router.get('/resources/:id', ResourceController.getResourceById);
router.put('/resources/:id', validateBody(updateResourceSchema), ResourceController.updateResource);
router.patch('/resources/:id/activate', ResourceController.activateResource);
router.patch('/resources/:id/deactivate', ResourceController.deactivateResource);
router.delete('/resources/:id', ResourceController.deleteResource);

/**
 * Service-Resource Relationship Assignments
 */
router.get('/resources/:id/services', ResourceController.getAssignedServices);
router.post('/resources/:id/services', validateBody(assignServiceSchema), ResourceController.assignToService);
router.put('/resources/:id/services', validateBody(setResourceServicesSchema), ResourceController.setAssignedServices);
router.delete('/resources/:id/services/:serviceId', ResourceController.unassignFromService);

/**
 * Organiser Resource Working Hours & Weekly Schedule
 */
router.get('/resources/:id/schedule', ScheduleController.getResourceSchedule);
router.put('/resources/:id/schedule', validateBody(updateWeeklyScheduleSchema), ScheduleController.updateResourceSchedule);
router.get('/resources/:id/availability', validateQuery(availabilityQuerySchema), ScheduleController.getNormalizedAvailability);

/**
 * Organiser Booking & Reservation Management Endpoints
 */
router.get(
  '/bookings',
  validateQuery(listBookingsQuerySchema),
  BookingController.getOrganiserBookings
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

/**
 * GET /api/v1/organiser/analytics
 * Organiser resource utilization, peak hours, and queue metrics
 */
router.get(
  '/analytics',
  validateQuery(analyticsQuerySchema),
  AnalyticsController.getOverview
);

export const organiserRoutes = router;
