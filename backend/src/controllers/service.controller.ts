import { Request, Response, NextFunction } from 'express';
import { ServiceService } from '../services/service.service';
import { successResponse } from '../utils/apiResponse';
import { CreateServiceInput, UpdateServiceInput } from '../validators/service.validator';

export class ServiceController {
  /**
   * GET /api/v1/organiser/services
   * List all services owned by the authenticated organiser
   */
  public static async getOrganiserServices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organiserId = req.user!.id;
      const { category, status } = req.query as { category?: string; status?: 'all' | 'published' | 'draft' };
      const services = await ServiceService.getOrganiserServices(organiserId, { category, status });
      res.status(200).json(successResponse(services, 'Organiser services catalog retrieved successfully'));
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/services
   * Public directory of published services
   */
  public static async getPublicServices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const services = await ServiceService.getPublicServices();
      res.status(200).json(successResponse(services, 'Public services retrieved successfully'));
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/services/:id
   * Get service details (drafts require ownership)
   */
  public static async getServiceById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const service = await ServiceService.getServiceById(id, req.user);
      res.status(200).json(successResponse(service, 'Service details retrieved'));
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/services/preview/:shareToken
   * Unpublished Share-Link Preview Endpoint
   */
  public static async previewServiceByShareToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { shareToken } = req.params;
      const service = await ServiceService.getServiceByShareToken(shareToken);
      res.status(200).json(
        successResponse(
          {
            ...service,
            previewMode: true,
            previewNotice: !service.isActive
              ? 'This service is currently UNPUBLISHED. You are viewing a private draft preview via secret share link.'
              : 'This service is published and active.',
          },
          'Service preview loaded successfully via share-link'
        )
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/organiser/services
   * Create new service
   */
  public static async createService(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organiserId = req.user!.id;
      const input: CreateServiceInput = req.body;
      const service = await ServiceService.createService(organiserId, input);
      res.status(201).json(successResponse(service, 'Service created successfully'));
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/v1/organiser/services/:id
   * Update existing service with organiser ownership check
   */
  public static async updateService(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const organiserId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';
      const input: UpdateServiceInput = req.body;

      const service = await ServiceService.updateService(id, organiserId, input, isAdmin);
      res.status(200).json(successResponse(service, 'Service updated successfully'));
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/organiser/services/:id/publish
   * Publish service to make it publicly discoverable
   */
  public static async publishService(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const organiserId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';

      const service = await ServiceService.setPublishStatus(id, organiserId, true, isAdmin);
      res.status(200).json(successResponse(service, `Service "${service.name}" is now published and active`));
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/organiser/services/:id/unpublish
   * Unpublish service back to draft status
   */
  public static async unpublishService(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const organiserId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';

      const service = await ServiceService.setPublishStatus(id, organiserId, false, isAdmin);
      res.status(200).json(
        successResponse(
          service,
          `Service "${service.name}" is now unpublished (Draft mode). Share via preview link to test.`
        )
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/organiser/services/:id/regenerate-share-link
   * Generate new secret token for unpublished preview sharing
   */
  public static async regenerateShareToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const organiserId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';

      const result = await ServiceService.regenerateShareToken(id, organiserId, isAdmin);
      res.status(200).json(successResponse(result, 'New unpublished preview link generated'));
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/organiser/services/:id
   * Delete service with organiser ownership check
   */
  public static async deleteService(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const organiserId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';

      const result = await ServiceService.deleteService(id, organiserId, isAdmin);
      res.status(200).json(successResponse(result, result.message));
    } catch (err) {
      next(err);
    }
  }
}
