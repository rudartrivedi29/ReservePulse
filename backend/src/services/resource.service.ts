import crypto from 'crypto';
import { db } from '../config/database';
import { logger } from '../utils/logger';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import {
  ResourceEntity,
  ResourceResponse,
  ServiceResourceEntity,
  AssignedServiceSummary,
  formatResourceResponse,
} from '../models/resource.model';
import {
  CreateResourceInput,
  UpdateResourceInput,
} from '../validators/resource.validator';
import { ServiceService } from './service.service';

// In-Memory storage for development and resilient database fallback
const inMemoryResources: Map<string, ResourceEntity> = new Map();
const inMemoryServiceResources: Map<string, ServiceResourceEntity> = new Map();

// Seed initial organiser demo resources
const seedDemoResources = () => {
  if (inMemoryResources.size > 0) return;

  const demoResources: ResourceEntity[] = [
    {
      id: 'res_h100_node1',
      organiser_id: 'usr_organiser_002',
      name: 'GPU Cluster Node 01 (8x H100)',
      resource_type: 'compute',
      description: 'Dedicated node with 8x NVIDIA H100 80GB SXM5 interconnected via NVLink.',
      location: 'Ashburn Data Center Rack 12',
      capacity: 8,
      status: 'active',
      created_at: new Date('2026-09-01T10:00:00Z'),
      updated_at: new Date('2026-09-01T10:00:00Z'),
    },
    {
      id: 'res_boardroom_alpha',
      organiser_id: 'usr_organiser_002',
      name: 'Executive Boardroom Alpha',
      resource_type: 'room',
      description: 'Soundproof executive suite with dual 85" 4K displays and Logitech Rally telepresence.',
      location: 'Building A, Floor 4, Suite 401',
      capacity: 16,
      status: 'active',
      created_at: new Date('2026-09-01T10:00:00Z'),
      updated_at: new Date('2026-09-01T10:00:00Z'),
    },
    {
      id: 'res_pod_private_1',
      organiser_id: 'usr_organiser_002',
      name: 'Private Consultation Pod 1',
      resource_type: 'pod',
      description: 'Acoustically isolated pod tailored for confidential 1-on-1 consultations.',
      location: 'Atrium East Wing, Ground Floor',
      capacity: 2,
      status: 'active',
      created_at: new Date('2026-09-01T10:00:00Z'),
      updated_at: new Date('2026-09-01T10:00:00Z'),
    },
    {
      id: 'res_staff_jordan',
      organiser_id: 'usr_organiser_002',
      name: 'Jordan Vance (Lead Architect)',
      resource_type: 'staff',
      description: 'Principal systems architect and certified enterprise solutions specialist.',
      location: 'Main Headquarters / Virtual',
      capacity: 1,
      status: 'active',
      created_at: new Date('2026-09-01T10:00:00Z'),
      updated_at: new Date('2026-09-01T10:00:00Z'),
    },
    {
      id: 'res_studio_backup',
      organiser_id: 'usr_organiser_002',
      name: 'Studio Recording Bay Delta',
      resource_type: 'studio',
      description: 'Multi-camera broadcast studio currently under hardware recalibration.',
      location: 'Media Center, Sub-Level 2',
      capacity: 4,
      status: 'inactive',
      created_at: new Date('2026-09-01T10:00:00Z'),
      updated_at: new Date('2026-09-01T10:00:00Z'),
    },
  ];

  demoResources.forEach((res) => inMemoryResources.set(res.id, res));

  // Seed initial service bindings
  const demoBindings: ServiceResourceEntity[] = [
    {
      id: 'sr_001',
      service_id: 'srv_comp_001',
      resource_id: 'res_h100_node1',
      is_required: true,
      allocation_quantity: 1,
      created_at: new Date('2026-09-01T10:00:00Z'),
    },
    {
      id: 'sr_002',
      service_id: 'srv_suite_002',
      resource_id: 'res_pod_private_1',
      is_required: true,
      allocation_quantity: 1,
      created_at: new Date('2026-09-01T10:00:00Z'),
    },
    {
      id: 'sr_003',
      service_id: 'srv_suite_002',
      resource_id: 'res_staff_jordan',
      is_required: false,
      allocation_quantity: 1,
      created_at: new Date('2026-09-01T10:00:00Z'),
    },
    {
      id: 'sr_004',
      service_id: 'srv_boardroom_004',
      resource_id: 'res_boardroom_alpha',
      is_required: true,
      allocation_quantity: 1,
      created_at: new Date('2026-09-01T10:00:00Z'),
    },
    {
      id: 'sr_005',
      service_id: 'srv_advisory_005',
      resource_id: 'res_staff_jordan',
      is_required: true,
      allocation_quantity: 1,
      created_at: new Date('2026-09-01T10:00:00Z'),
    },
    {
      id: 'sr_006',
      service_id: 'srv_workshop_006',
      resource_id: 'res_h100_node1',
      is_required: true,
      allocation_quantity: 1,
      created_at: new Date('2026-09-01T10:00:00Z'),
    },
    {
      id: 'sr_007',
      service_id: 'srv_quantum_003',
      resource_id: 'res_h100_node1',
      is_required: true,
      allocation_quantity: 1,
      created_at: new Date('2026-09-01T10:00:00Z'),
    },
  ];

  demoBindings.forEach((binding) => inMemoryServiceResources.set(binding.id, binding));
};

seedDemoResources();

export class ResourceService {
  /**
   * Helper: check if PostgreSQL database is connected
   */
  private static async isDbConnected(): Promise<boolean> {
    try {
      const res = await db.query('SELECT 1');
      return Boolean(res);
    } catch {
      return false;
    }
  }

  /**
   * Fetch services assigned to a resource
   */
  public static async getAssignedServicesForResource(
    resourceId: string
  ): Promise<AssignedServiceSummary[]> {
    if (await this.isDbConnected()) {
      const query = `
        SELECT 
          s.id, s.name, s.slug, s.category, s.duration_minutes,
          sr.is_required, sr.allocation_quantity
        FROM service_resources sr
        JOIN services s ON s.id = sr.service_id
        WHERE sr.resource_id = $1
        ORDER BY s.name ASC
      `;
      const res = await db.query(query, [resourceId]);
      return res.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        category: row.category || 'General',
        durationMinutes: Number(row.duration_minutes),
        isRequired: Boolean(row.is_required),
        allocationQuantity: Number(row.allocation_quantity) || 1,
      }));
    }

    // In-memory fallback
    const assigned: AssignedServiceSummary[] = [];
    for (const binding of inMemoryServiceResources.values()) {
      if (binding.resource_id === resourceId) {
        try {
          const service = await ServiceService.getServiceById(binding.service_id);
          assigned.push({
            id: service.id,
            name: service.name,
            slug: service.slug,
            category: service.category,
            durationMinutes: service.durationMinutes,
            isRequired: binding.is_required,
            allocationQuantity: binding.allocation_quantity,
          });
        } catch {
          // Service may have been deleted
        }
      }
    }
    return assigned;
  }

  /**
   * Get all resources owned by an organiser with optional filters
   */
  public static async getOrganiserResources(
    organiserId: string,
    filters?: { type?: string; status?: string; search?: string },
    isAdmin = false
  ): Promise<ResourceResponse[]> {
    if (await this.isDbConnected()) {
      let query = `
        SELECT * FROM resources 
        WHERE (organiser_id = $1 OR $2 = true)
      `;
      const params: any[] = [organiserId, isAdmin];

      if (filters?.type && filters.type !== 'all') {
        params.push(filters.type);
        query += ` AND resource_type = $${params.length}`;
      }

      if (filters?.status && filters.status !== 'all') {
        params.push(filters.status);
        query += ` AND status = $${params.length}`;
      }

      if (filters?.search) {
        params.push(`%${filters.search.toLowerCase()}%`);
        query += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(description) LIKE $${params.length} OR LOWER(location) LIKE $${params.length})`;
      }

      query += ' ORDER BY created_at DESC';

      const res = await db.query(query, params);
      const results: ResourceResponse[] = [];

      for (const row of res.rows) {
        const assignedServices = await this.getAssignedServicesForResource(row.id);
        results.push(formatResourceResponse(row as any, assignedServices));
      }

      return results;
    }

    // In-memory fallback
    seedDemoResources();
    let resources = Array.from(inMemoryResources.values()).filter(
      (r) => isAdmin || r.organiser_id === organiserId
    );

    if (filters?.type && filters.type !== 'all') {
      resources = resources.filter((r) => r.resource_type === filters.type);
    }

    if (filters?.status && filters.status !== 'all') {
      resources = resources.filter((r) => r.status === filters.status);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      resources = resources.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q)) ||
          (r.location && r.location.toLowerCase().includes(q))
      );
    }

    resources.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const formatted: ResourceResponse[] = [];
    for (const res of resources) {
      const assigned = await this.getAssignedServicesForResource(res.id);
      formatted.push(formatResourceResponse(res, assigned));
    }

    return formatted;
  }

  /**
   * Public: Get all active resources across the platform
   */
  public static async getPublicResources(): Promise<ResourceResponse[]> {
    if (await this.isDbConnected()) {
      const res = await db.query(
        "SELECT * FROM resources WHERE status = 'active' ORDER BY created_at DESC"
      );
      const results: ResourceResponse[] = [];
      for (const row of res.rows) {
        const assignedServices = await this.getAssignedServicesForResource(row.id);
        results.push(formatResourceResponse(row as any, assignedServices));
      }
      return results;
    }

    // In-memory fallback
    seedDemoResources();
    const active = Array.from(inMemoryResources.values()).filter(
      (r) => r.status === 'active'
    );
    active.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const formatted: ResourceResponse[] = [];
    for (const res of active) {
      const assigned = await this.getAssignedServicesForResource(res.id);
      formatted.push(formatResourceResponse(res, assigned));
    }
    return formatted;
  }

  /**
   * Get single resource by ID with ownership check
   */
  public static async getResourceById(
    resourceId: string,
    organiserId?: string,
    isAdmin = false
  ): Promise<ResourceResponse> {
    let resource: ResourceEntity | null = null;

    if (await this.isDbConnected()) {
      const res = await db.query('SELECT * FROM resources WHERE id = $1', [resourceId]);
      if (res.rows.length > 0) {
        resource = res.rows[0] as any;
      }
    } else {
      seedDemoResources();
      resource = inMemoryResources.get(resourceId) || null;
    }

    if (!resource) {
      throw new NotFoundError(`Resource with ID "${resourceId}" not found`);
    }

    // Ownership check
    if (organiserId && !isAdmin && resource.organiser_id !== organiserId) {
      throw new ForbiddenError('Forbidden: You do not own this resource');
    }

    const assignedServices = await this.getAssignedServicesForResource(resource.id);
    return formatResourceResponse(resource, assignedServices);
  }

  /**
   * Create a new resource and optionally assign services
   */
  public static async createResource(
    organiserId: string,
    data: CreateResourceInput
  ): Promise<ResourceResponse> {
    const id = `res_${crypto.randomUUID()}`;
    const now = new Date();

    const entity: ResourceEntity = {
      id,
      organiser_id: organiserId,
      name: data.name.trim(),
      resource_type: data.resourceType,
      description: data.description?.trim() || '',
      location: data.location?.trim() || '',
      capacity: Number(data.capacity) || 1,
      status: data.status || 'active',
      created_at: now,
      updated_at: now,
    };

    if (await this.isDbConnected()) {
      const insertQuery = `
        INSERT INTO resources (
          id, organiser_id, name, resource_type, description, location, capacity, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      const res = await db.query(insertQuery, [
        entity.id,
        entity.organiser_id,
        entity.name,
        entity.resource_type,
        entity.description,
        entity.location,
        entity.capacity,
        entity.status,
        entity.created_at,
        entity.updated_at,
      ]);
      const created = res.rows[0];

      // Assign initial services if provided
      if (data.serviceIds && data.serviceIds.length > 0) {
        for (const sId of data.serviceIds) {
          const bindingId = `sr_${crypto.randomUUID()}`;
          await db.query(
            `INSERT INTO service_resources (id, service_id, resource_id, is_required, allocation_quantity, created_at)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (service_id, resource_id) DO NOTHING`,
            [bindingId, sId, created.id, true, 1, now]
          );
        }
      }

      const assigned = await this.getAssignedServicesForResource(created.id);
      logger.info(`Resource created: ${created.name} (${created.id}) by organiser ${organiserId}`);
      return formatResourceResponse(created as any, assigned);
    }

    // In-memory fallback
    inMemoryResources.set(id, entity);

    if (data.serviceIds && data.serviceIds.length > 0) {
      for (const sId of data.serviceIds) {
        const bindingId = `sr_${crypto.randomUUID()}`;
        inMemoryServiceResources.set(bindingId, {
          id: bindingId,
          service_id: sId,
          resource_id: id,
          is_required: true,
          allocation_quantity: 1,
          created_at: now,
        });
      }
    }

    const assigned = await this.getAssignedServicesForResource(id);
    logger.info(`[In-Memory] Resource created: ${entity.name} (${entity.id}) by organiser ${organiserId}`);
    return formatResourceResponse(entity, assigned);
  }

  /**
   * Update an existing resource
   */
  public static async updateResource(
    resourceId: string,
    organiserId: string,
    data: UpdateResourceInput,
    isAdmin = false
  ): Promise<ResourceResponse> {
    // Check ownership first
    await this.getResourceById(resourceId, organiserId, isAdmin);
    const now = new Date();

    if (await this.isDbConnected()) {
      const updates: string[] = [];
      const params: any[] = [];

      if (data.name !== undefined) {
        params.push(data.name.trim());
        updates.push(`name = $${params.length}`);
      }
      if (data.resourceType !== undefined) {
        params.push(data.resourceType);
        updates.push(`resource_type = $${params.length}`);
      }
      if (data.description !== undefined) {
        params.push(data.description.trim());
        updates.push(`description = $${params.length}`);
      }
      if (data.location !== undefined) {
        params.push(data.location.trim());
        updates.push(`location = $${params.length}`);
      }
      if (data.capacity !== undefined) {
        params.push(Number(data.capacity));
        updates.push(`capacity = $${params.length}`);
      }
      if (data.status !== undefined) {
        params.push(data.status);
        updates.push(`status = $${params.length}`);
      }

      params.push(now);
      updates.push(`updated_at = $${params.length}`);

      params.push(resourceId);
      const updateQuery = `
        UPDATE resources
        SET ${updates.join(', ')}
        WHERE id = $${params.length}
        RETURNING *
      `;

      const res = await db.query(updateQuery, params);
      const updated = res.rows[0];

      // Update service bindings if provided
      if (data.serviceIds !== undefined) {
        await this.setAssignedServices(resourceId, data.serviceIds, organiserId, isAdmin);
      }

      const assigned = await this.getAssignedServicesForResource(updated.id);
      logger.info(`Resource updated: ${updated.name} (${updated.id})`);
      return formatResourceResponse(updated as any, assigned);
    }

    // In-memory fallback
    const inMemEntity = inMemoryResources.get(resourceId)!;
    const updatedEntity: ResourceEntity = {
      ...inMemEntity,
      name: data.name !== undefined ? data.name.trim() : inMemEntity.name,
      resource_type: data.resourceType !== undefined ? data.resourceType : inMemEntity.resource_type,
      description: data.description !== undefined ? data.description.trim() : inMemEntity.description,
      location: data.location !== undefined ? data.location.trim() : inMemEntity.location,
      capacity: data.capacity !== undefined ? Number(data.capacity) : inMemEntity.capacity,
      status: data.status !== undefined ? data.status : inMemEntity.status,
      updated_at: now,
    };

    inMemoryResources.set(resourceId, updatedEntity);

    if (data.serviceIds !== undefined) {
      await this.setAssignedServices(resourceId, data.serviceIds, organiserId, isAdmin);
    }

    const assigned = await this.getAssignedServicesForResource(resourceId);
    return formatResourceResponse(updatedEntity, assigned);
  }

  /**
   * Activate a resource
   */
  public static async activateResource(
    resourceId: string,
    organiserId: string,
    isAdmin = false
  ): Promise<ResourceResponse> {
    return this.updateResource(resourceId, organiserId, { status: 'active' }, isAdmin);
  }

  /**
   * Deactivate a resource
   */
  public static async deactivateResource(
    resourceId: string,
    organiserId: string,
    isAdmin = false
  ): Promise<ResourceResponse> {
    return this.updateResource(resourceId, organiserId, { status: 'inactive' }, isAdmin);
  }

  /**
   * Delete a resource
   */
  public static async deleteResource(
    resourceId: string,
    organiserId: string,
    isAdmin = false
  ): Promise<void> {
    // Ownership check
    await this.getResourceById(resourceId, organiserId, isAdmin);

    if (await this.isDbConnected()) {
      // Remove service_resources bindings first
      await db.query('DELETE FROM service_resources WHERE resource_id = $1', [resourceId]);
      await db.query('DELETE FROM resources WHERE id = $1', [resourceId]);
      logger.info(`Resource deleted: ${resourceId}`);
      return;
    }

    // In-memory fallback
    for (const [bindingId, binding] of inMemoryServiceResources.entries()) {
      if (binding.resource_id === resourceId) {
        inMemoryServiceResources.delete(bindingId);
      }
    }
    inMemoryResources.delete(resourceId);
    logger.info(`[In-Memory] Resource deleted: ${resourceId}`);
  }

  /**
   * Assign a resource to a service
   */
  public static async assignService(
    resourceId: string,
    serviceId: string,
    organiserId: string,
    isRequired = true,
    allocationQuantity = 1,
    isAdmin = false
  ): Promise<AssignedServiceSummary> {
    // Check resource ownership
    await this.getResourceById(resourceId, organiserId, isAdmin);

    // Check service ownership
    await ServiceService.getServiceById(serviceId, {
      id: organiserId,
      role: isAdmin ? 'ADMIN' : 'ORGANISER',
      email: '',
      fullName: '',
      isVerified: true,
    });

    const now = new Date();
    const bindingId = `sr_${crypto.randomUUID()}`;

    if (await this.isDbConnected()) {
      const query = `
        INSERT INTO service_resources (id, service_id, resource_id, is_required, allocation_quantity, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (service_id, resource_id) 
        DO UPDATE SET is_required = EXCLUDED.is_required, allocation_quantity = EXCLUDED.allocation_quantity
        RETURNING *
      `;
      await db.query(query, [bindingId, serviceId, resourceId, isRequired, allocationQuantity, now]);
    } else {
      // In-memory
      let existingBindingId: string | null = null;
      for (const [bId, b] of inMemoryServiceResources.entries()) {
        if (b.service_id === serviceId && b.resource_id === resourceId) {
          existingBindingId = bId;
          break;
        }
      }

      if (existingBindingId) {
        inMemoryServiceResources.set(existingBindingId, {
          ...inMemoryServiceResources.get(existingBindingId)!,
          is_required: isRequired,
          allocation_quantity: allocationQuantity,
        });
      } else {
        inMemoryServiceResources.set(bindingId, {
          id: bindingId,
          service_id: serviceId,
          resource_id: resourceId,
          is_required: isRequired,
          allocation_quantity: allocationQuantity,
          created_at: now,
        });
      }
    }

    const service = await ServiceService.getServiceById(serviceId);
    return {
      id: service.id,
      name: service.name,
      slug: service.slug,
      category: service.category,
      durationMinutes: service.durationMinutes,
      isRequired,
      allocationQuantity,
    };
  }

  /**
   * Unassign a resource from a service
   */
  public static async unassignService(
    resourceId: string,
    serviceId: string,
    organiserId: string,
    isAdmin = false
  ): Promise<void> {
    // Check resource ownership
    await this.getResourceById(resourceId, organiserId, isAdmin);

    if (await this.isDbConnected()) {
      await db.query(
        'DELETE FROM service_resources WHERE resource_id = $1 AND service_id = $2',
        [resourceId, serviceId]
      );
      return;
    }

    // In-memory
    for (const [bindingId, b] of inMemoryServiceResources.entries()) {
      if (b.resource_id === resourceId && b.service_id === serviceId) {
        inMemoryServiceResources.delete(bindingId);
      }
    }
  }

  /**
   * Bulk sync all assigned services for a resource
   */
  public static async setAssignedServices(
    resourceId: string,
    serviceIds: string[],
    organiserId: string,
    isAdmin = false
  ): Promise<AssignedServiceSummary[]> {
    // Check resource ownership
    await this.getResourceById(resourceId, organiserId, isAdmin);

    if (await this.isDbConnected()) {
      await db.query('DELETE FROM service_resources WHERE resource_id = $1', [resourceId]);
      const now = new Date();

      for (const sId of serviceIds) {
        const bindingId = `sr_${crypto.randomUUID()}`;
        await db.query(
          `INSERT INTO service_resources (id, service_id, resource_id, is_required, allocation_quantity, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (service_id, resource_id) DO NOTHING`,
          [bindingId, sId, resourceId, true, 1, now]
        );
      }
    } else {
      // In-memory
      for (const [bId, b] of inMemoryServiceResources.entries()) {
        if (b.resource_id === resourceId) {
          inMemoryServiceResources.delete(bId);
        }
      }

      const now = new Date();
      for (const sId of serviceIds) {
        const bindingId = `sr_${crypto.randomUUID()}`;
        inMemoryServiceResources.set(bindingId, {
          id: bindingId,
          service_id: sId,
          resource_id: resourceId,
          is_required: true,
          allocation_quantity: 1,
          created_at: now,
        });
      }
    }

    return this.getAssignedServicesForResource(resourceId);
  }

  /**
   * Get all active resources assigned to a particular service
   */
  public static async getResourcesForService(serviceId: string): Promise<ResourceResponse[]> {
    if (await this.isDbConnected()) {
      const query = `
        SELECT r.*
        FROM resources r
        JOIN service_resources sr ON sr.resource_id = r.id
        WHERE sr.service_id = $1
          AND r.status IN ('active', 'operational')
        ORDER BY r.name ASC
      `;
      const res = await db.query(query, [serviceId]);
      return res.rows.map((row: any) => formatResourceResponse(row as any));
    }

    // In-memory fallback
    const matchingResourceIds: string[] = [];
    for (const b of inMemoryServiceResources.values()) {
      if (b.service_id === serviceId) {
        matchingResourceIds.push(b.resource_id);
      }
    }

    const resources: ResourceResponse[] = [];
    for (const resId of matchingResourceIds) {
      const entity = inMemoryResources.get(resId);
      if (entity && (entity.status === 'active' || entity.status === 'operational')) {
        resources.push(formatResourceResponse(entity));
      }
    }
    return resources;
  }
}
