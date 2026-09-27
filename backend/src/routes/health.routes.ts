import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';

const router = Router();

// 1. Detailed System & Database Health Status
router.get('/', HealthController.getHealth);

// 2. Ultra-lightweight Liveness Probe
router.get('/ping', HealthController.getPing);

// 3. Dedicated PostgreSQL Database Probe
router.get('/database', HealthController.getDatabaseHealth);
router.get('/db', HealthController.getDatabaseHealth);

export const healthRoutes = router;
