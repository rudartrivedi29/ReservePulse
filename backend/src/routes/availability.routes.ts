import { Router } from 'express';
import { AvailabilityController } from '../controllers/availability.controller';
import { validateQuery } from '../validators';
import { serviceAvailabilityQuerySchema } from '../validators/availability.validator';

const router = Router();

/**
 * GET /api/v1/availability/services/:serviceId
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD), resourceId, slotStep, attendees, shareToken
 */
router.get(
  '/services/:serviceId',
  validateQuery(serviceAvailabilityQuerySchema),
  AvailabilityController.getServiceAvailability
);

export const availabilityRoutes = router;
