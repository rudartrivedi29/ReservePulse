import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/admin.service';
import { ResourceService } from '../services/resource.service';
import { successResponse } from '../utils/apiResponse';
import {
  ListUsersQuery,
  UpdateUserStatusInput,
  UpdateUserRoleInput,
  CreateAdminUserInput,
} from '../validators/admin.validator';

export class AdminController {
  /**
   * GET /api/v1/admin/stats
   * GET /api/v1/admin/dashboard
   * Retrieve platform-wide telemetry, KPIs, user & appointment statistics
   */
  public static async getDashboardStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const stats = await AdminService.getDashboardStats();
      res.json(successResponse(stats, 'Admin dashboard telemetry retrieved successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/users
   * Searchable, filterable, and paginated directory of platform users and providers
   */
  public static async getUsers(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query = req.query as unknown as ListUsersQuery;
      const result = await AdminService.getUsers(query);
      res.json(
        successResponse(result.users, 'Users directory retrieved successfully', {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/users/:userId
   * Retrieve full details of a specific user with their services/appointments
   */
  public static async getUserDetails(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId } = req.params;
      const user = await AdminService.getUserDetails(userId);
      res.json(successResponse(user, 'User details retrieved successfully'));
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/admin/users/:userId/status
   * Account activation / deactivation with self-protection and last-admin safeguards
   */
  public static async updateUserStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId } = req.params;
      const input = req.body as UpdateUserStatusInput;
      const updatedUser = await AdminService.updateUserStatus(
        userId,
        input.isActive,
        req.user!,
        input.reason
      );
      res.json(
        successResponse(
          updatedUser,
          `User account ${input.isActive ? 'activated' : 'deactivated'} successfully`
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/admin/users/:userId/role
   * Role management with validation and demotion safeguards
   */
  public static async updateUserRole(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { userId } = req.params;
      const input = req.body as UpdateUserRoleInput;
      const updatedUser = await AdminService.updateUserRole(
        userId,
        input.role,
        req.user!
      );
      res.json(
        successResponse(
          updatedUser,
          `User role updated to ${updatedUser.role} successfully`
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/providers
   * Dedicated endpoint for service providers (organisers)
   */
  public static async getProviders(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query = req.query as unknown as ListUsersQuery;
      const result = await AdminService.getProviders(query);
      res.json(
        successResponse(result.providers, 'Service providers retrieved successfully', {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/resources
   * Global resource fleet governance
   */
  public static async getResources(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const resources = await ResourceService.getOrganiserResources('', {}, true);
      const operationalCount = resources.filter(
        (r) => r.status === 'active' || r.status === 'operational'
      ).length;
      const operationalPct =
        resources.length > 0 ? Math.round((operationalCount / resources.length) * 100) : 100;

      res.json(
        successResponse(
          {
            totalResources: resources.length,
            operationalPct,
            resources,
          },
          'Global resource fleet retrieved successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/users
   * Provision new user account directly by platform administrator
   */
  public static async createUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const input = req.body as CreateAdminUserInput;
      const newUser = await AdminService.createUser(input, req.user!);
      res.status(201).json(
        successResponse(newUser, `User account ${newUser.email} provisioned successfully`)
      );
    } catch (error) {
      next(error);
    }
  }
}
