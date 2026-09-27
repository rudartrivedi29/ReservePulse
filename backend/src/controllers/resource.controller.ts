import { Request, Response, NextFunction } from 'express';
import { ResourceService } from '../services/resource.service';
import { successResponse } from '../utils/apiResponse';

export class ResourceController {
  /**
   * Get all resources belonging to the authenticated organiser
   */
  public static async getOrganiserResources(req: Request, res: Response, next: NextFunction) {
    try {
      const organiserId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';
      const { type, status, search } = req.query;

      const resources = await ResourceService.getOrganiserResources(
        organiserId,
        {
          type: type as string | undefined,
          status: status as string | undefined,
          search: search as string | undefined,
        },
        isAdmin
      );

      res.json(successResponse(resources, 'Organiser resources retrieved successfully'));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get single resource by ID
   */
  public static async getResourceById(req: Request, res: Response, next: NextFunction) {
    try {
      const organiserId = req.user?.id;
      const isAdmin = req.user?.role === 'ADMIN';
      const resource = await ResourceService.getResourceById(req.params.id, organiserId, isAdmin);

      res.json(successResponse(resource, 'Resource retrieved successfully'));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Create a new resource / provider
   */
  public static async createResource(req: Request, res: Response, next: NextFunction) {
    try {
      const organiserId = req.user!.id;
      const resource = await ResourceService.createResource(organiserId, req.body);

      res.status(201).json(successResponse(resource, 'Resource created successfully'));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update resource details
   */
  public static async updateResource(req: Request, res: Response, next: NextFunction) {
    try {
      const organiserId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';
      const resource = await ResourceService.updateResource(
        req.params.id,
        organiserId,
        req.body,
        isAdmin
      );

      res.json(successResponse(resource, 'Resource updated successfully'));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Activate resource
   */
  public static async activateResource(req: Request, res: Response, next: NextFunction) {
    try {
      const organiserId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';
      const resource = await ResourceService.activateResource(req.params.id, organiserId, isAdmin);

      res.json(successResponse(resource, 'Resource activated successfully'));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Deactivate resource
   */
  public static async deactivateResource(req: Request, res: Response, next: NextFunction) {
    try {
      const organiserId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';
      const resource = await ResourceService.deactivateResource(req.params.id, organiserId, isAdmin);

      res.json(successResponse(resource, 'Resource deactivated successfully'));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Delete resource
   */
  public static async deleteResource(req: Request, res: Response, next: NextFunction) {
    try {
      const organiserId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';
      await ResourceService.deleteResource(req.params.id, organiserId, isAdmin);

      res.json(successResponse({ id: req.params.id }, 'Resource deleted successfully'));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get services assigned to this resource
   */
  public static async getAssignedServices(req: Request, res: Response, next: NextFunction) {
    try {
      const services = await ResourceService.getAssignedServicesForResource(req.params.id);
      res.json(successResponse(services, 'Assigned services retrieved'));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Assign resource to a service
   */
  public static async assignToService(req: Request, res: Response, next: NextFunction) {
    try {
      const organiserId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';
      const { serviceId, isRequired, allocationQuantity } = req.body;

      const assignment = await ResourceService.assignService(
        req.params.id,
        serviceId,
        organiserId,
        isRequired,
        allocationQuantity,
        isAdmin
      );

      res.json(successResponse(assignment, 'Resource assigned to service successfully'));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Synchronize list of services assigned to resource
   */
  public static async setAssignedServices(req: Request, res: Response, next: NextFunction) {
    try {
      const organiserId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';
      const { serviceIds } = req.body;

      const services = await ResourceService.setAssignedServices(
        req.params.id,
        serviceIds || [],
        organiserId,
        isAdmin
      );

      res.json(successResponse(services, 'Resource services synchronized successfully'));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Unassign resource from a service
   */
  public static async unassignFromService(req: Request, res: Response, next: NextFunction) {
    try {
      const organiserId = req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';

      await ResourceService.unassignService(
        req.params.id,
        req.params.serviceId,
        organiserId,
        isAdmin
      );

      res.json(
        successResponse(
          { resourceId: req.params.id, serviceId: req.params.serviceId },
          'Resource unassigned from service successfully'
        )
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * Public: Get active resources for a service
   */
  public static async getResourcesForService(req: Request, res: Response, next: NextFunction) {
    try {
      const serviceId = req.params.serviceId || req.params.id;
      const resources = await ResourceService.getResourcesForService(serviceId);
      res.json(successResponse(resources, 'Resources for service retrieved successfully'));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Public: Get all active public resources
   */
  public static async getPublicResources(req: Request, res: Response, next: NextFunction) {
    try {
      const resources = await ResourceService.getPublicResources();
      res.json(successResponse(resources, 'Public resources retrieved successfully'));
    } catch (err) {
      next(err);
    }
  }
}
