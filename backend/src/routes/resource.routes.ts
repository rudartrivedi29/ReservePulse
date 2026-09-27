import { Router } from 'express';
import { ResourceController } from '../controllers/resource.controller';

const router = Router();

/**
 * Public: Get all active resources
 */
router.get('/', ResourceController.getPublicResources);

/**
 * Public: Get active resources assigned to a service
 */
router.get('/service/:serviceId', ResourceController.getResourcesForService);

/**
 * Public / Generic Resource Details
 */
router.get('/:id', ResourceController.getResourceById);

export const resourceRoutes = router;
