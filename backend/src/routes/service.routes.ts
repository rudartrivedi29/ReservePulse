import { Router } from 'express';
import { ServiceController } from '../controllers/service.controller';
import { AvailabilityController } from '../controllers/availability.controller';
import { BookingController } from '../controllers/booking.controller';
import { ResourceController } from '../controllers/resource.controller';
import { validateQuery } from '../validators';
import { serviceAvailabilityQuerySchema } from '../validators/availability.validator';

const router = Router();

// 1. Public catalog of published services
router.get('/', ServiceController.getPublicServices);

// 2. Secret Unpublished Share-Link Preview Endpoint (No authentication required)
router.get('/preview/:shareToken', ServiceController.previewServiceByShareToken);

// 3. Service availability endpoint (Returns only currently bookable slots)
router.get(
  '/:id/availability',
  validateQuery(serviceAvailabilityQuerySchema),
  AvailabilityController.getServiceAvailability
);

// 4. Service intake questions for customer booking flow
router.get('/:id/questions', BookingController.getServiceQuestions);

// 5. Service assigned providers and resources
router.get('/:id/resources', ResourceController.getResourcesForService);

// 6. Service details by ID (Public if published, or owner session if draft)
router.get('/:id', ServiceController.getServiceById);

export const serviceRoutes = router;
