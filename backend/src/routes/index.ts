import { Router } from 'express';
import { healthRoutes } from './health.routes';
import { authRoutes } from './auth.routes';
import { customerRoutes } from './customer.routes';
import { organiserRoutes } from './organiser.routes';
import { adminRoutes } from './admin.routes';
import { serviceRoutes } from './service.routes';
import { resourceRoutes } from './resource.routes';
import { scheduleRoutes } from './schedule.routes';
import { availabilityRoutes } from './availability.routes';
import { bookingRoutes } from './booking.routes';
import { analyticsRoutes } from './analytics.routes';
import { successResponse } from '../utils/apiResponse';

const router = Router();

// API v1 Discovery / Metadata Root
router.get('/', (req, res) => {
  res.json(
    successResponse(
      {
        service: 'ReservePulse REST API',
        version: '1.0.0',
        documentation: '/docs',
        endpoints: {
          health: '/api/v1/health',
          ping: '/api/v1/health/ping',
          databaseHealth: '/api/v1/health/database',
          services: {
            catalog: 'GET /api/v1/services',
            preview: 'GET /api/v1/services/preview/:shareToken',
            details: 'GET /api/v1/services/:id',
            availability: 'GET /api/v1/services/:id/availability?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD',
            questions: 'GET /api/v1/services/:id/questions',
            resources: 'GET /api/v1/services/:id/resources',
          },
          availability: {
            serviceSlots: 'GET /api/v1/availability/services/:serviceId?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD',
          },
          bookings: {
            create: 'POST /api/v1/bookings',
            details: 'GET /api/v1/bookings/:idOrReference',
            cancel: 'PATCH /api/v1/bookings/:idOrReference/cancel',
          },
          analytics: {
            overview: 'GET /api/v1/analytics/overview?timeFilter=week [Requires ORGANISER or ADMIN]',
            appointments: 'GET /api/v1/analytics/appointments?timeFilter=week [Requires ORGANISER or ADMIN]',
            peakHours: 'GET /api/v1/analytics/peak-hours?timeFilter=week [Requires ORGANISER or ADMIN]',
            utilization: 'GET /api/v1/analytics/utilization?timeFilter=week [Requires ORGANISER or ADMIN]',
          },
          resources: {
            serviceResources: 'GET /api/v1/resources/service/:serviceId',
            details: 'GET /api/v1/resources/:id',
          },
          schedules: {
            resourceSchedule: 'GET /api/v1/schedules/resources/:resourceId',
            normalizedAvailability: 'GET /api/v1/schedules/resources/:resourceId/availability?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD',
          },
          auth: {
            signup: 'POST /api/v1/auth/signup',
            login: 'POST /api/v1/auth/login',
            verifyOtp: 'POST /api/v1/auth/verify-otp',
            resendOtp: 'POST /api/v1/auth/resend-otp',
            forgotPassword: 'POST /api/v1/auth/forgot-password',
            resetPassword: 'POST /api/v1/auth/reset-password',
            me: 'GET /api/v1/auth/me',
          },
          roleProtected: {
            customer: {
              bookings: 'GET /api/v1/customer/bookings [Requires CUSTOMER or ADMIN]',
              createBooking: 'POST /api/v1/customer/bookings [Requires CUSTOMER or ADMIN]',
              bookingDetails: 'GET /api/v1/customer/bookings/:idOrReference [Requires CUSTOMER or ADMIN]',
              cancelBooking: 'PATCH /api/v1/customer/bookings/:idOrReference/cancel [Requires CUSTOMER or ADMIN]',
              profile: 'GET /api/v1/customer/profile [Requires CUSTOMER or ADMIN]',
            },
            organiser: {
              services: 'GET /api/v1/organiser/services [Requires ORGANISER or ADMIN]',
              createService: 'POST /api/v1/organiser/services [Requires ORGANISER or ADMIN]',
              updateService: 'PUT /api/v1/organiser/services/:id [Requires ORGANISER or ADMIN]',
              publishService: 'PATCH /api/v1/organiser/services/:id/publish [Requires ORGANISER or ADMIN]',
              unpublishService: 'PATCH /api/v1/organiser/services/:id/unpublish [Requires ORGANISER or ADMIN]',
              regenerateShareLink: 'POST /api/v1/organiser/services/:id/regenerate-share-link [Requires ORGANISER or ADMIN]',
              deleteService: 'DELETE /api/v1/organiser/services/:id [Requires ORGANISER or ADMIN]',
              resources: 'GET /api/v1/organiser/resources [Requires ORGANISER or ADMIN]',
              createResource: 'POST /api/v1/organiser/resources [Requires ORGANISER or ADMIN]',
              updateResource: 'PUT /api/v1/organiser/resources/:id [Requires ORGANISER or ADMIN]',
              activateResource: 'PATCH /api/v1/organiser/resources/:id/activate [Requires ORGANISER or ADMIN]',
              deactivateResource: 'PATCH /api/v1/organiser/resources/:id/deactivate [Requires ORGANISER or ADMIN]',
              deleteResource: 'DELETE /api/v1/organiser/resources/:id [Requires ORGANISER or ADMIN]',
              assignService: 'POST /api/v1/organiser/resources/:id/services [Requires ORGANISER or ADMIN]',
              setAssignedServices: 'PUT /api/v1/organiser/resources/:id/services [Requires ORGANISER or ADMIN]',
              unassignService: 'DELETE /api/v1/organiser/resources/:id/services/:serviceId [Requires ORGANISER or ADMIN]',
              getSchedule: 'GET /api/v1/organiser/resources/:id/schedule [Requires ORGANISER or ADMIN]',
              updateSchedule: 'PUT /api/v1/organiser/resources/:id/schedule [Requires ORGANISER or ADMIN]',
              getAvailability: 'GET /api/v1/organiser/resources/:id/availability [Requires ORGANISER or ADMIN]',
              bookings: 'GET /api/v1/organiser/bookings [Requires ORGANISER or ADMIN]',
              analytics: 'GET /api/v1/organiser/analytics [Requires ORGANISER or ADMIN]',
            },
            admin: {
              users: 'GET /api/v1/admin/users [Requires ADMIN]',
              resources: 'GET /api/v1/admin/resources [Requires ADMIN]',
              platformOverview: 'GET /api/v1/admin/platform-overview [Requires ADMIN]',
            },
          },
        },
      },
      'ReservePulse API v1 Operational'
    )
  );
});

// Mount routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/services', serviceRoutes);
router.use('/resources', resourceRoutes);
router.use('/schedules', scheduleRoutes);
router.use('/availability', availabilityRoutes);
router.use('/bookings', bookingRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/customer', customerRoutes);
router.use('/organiser', organiserRoutes);
router.use('/admin', adminRoutes);

export const apiRouter = router;
