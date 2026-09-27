import { Router } from 'express';
import { ScheduleController } from '../controllers/schedule.controller';
import { validateQuery } from '../validators';
import { availabilityQuerySchema } from '../validators/schedule.validator';

const router = Router();

/**
 * Public: Get normalized availability for a resource across a date range
 */
router.get(
  '/resources/:resourceId/availability',
  validateQuery(availabilityQuerySchema),
  ScheduleController.getNormalizedAvailability
);

/**
 * Public: Get weekly schedule structure for a resource
 */
router.get('/resources/:resourceId', ScheduleController.getResourceSchedule);

export const scheduleRoutes = router;
