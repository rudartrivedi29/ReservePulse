import crypto from 'crypto';
import { db } from '../config/database';
import { logger } from '../utils/logger';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { ServiceEntity, ServiceResponse } from '../models/service.model';
import { CreateServiceInput, UpdateServiceInput } from '../validators/service.validator';
import { AuthUserPayload } from '../middleware/auth.middleware';

// In-Memory store for development and resilient database fallback
const inMemoryServices: Map<string, ServiceEntity> = new Map();

// Seed initial organiser demo services
const seedDemoServices = () => {
  if (inMemoryServices.size > 0) return;

  const demoServices: ServiceEntity[] = [
    {
      id: 'srv_comp_001',
      organiser_id: 'usr_organiser_002',
      name: 'High-Density Compute Allocation',
      slug: 'high-density-compute-allocation',
      description: 'Dedicated GPU-accelerated computing nodes reserved for intensive batch processing, neural model training, and simulation workloads.',
      category: 'Compute',
      duration_minutes: 60,
      buffer_before_minutes: 10,
      buffer_after_minutes: 15,
      price_amount: 120.0,
      price_currency: 'USD',
      is_active: true,
      capacity_type: 'resource_constrained',
      default_capacity: 4,
      max_advance_booking_days: 30,
      min_lead_time_hours: 2,
      requires_manual_confirmation: false,
      resource_assignment_mode: 'automatic',
      payment_setting: 'paid',
      share_token: 'tok_preview_compute_001_live',
      created_at: new Date('2026-09-01T10:00:00Z'),
      updated_at: new Date('2026-09-01T10:00:00Z'),
    },
    {
      id: 'srv_suite_002',
      organiser_id: 'usr_organiser_002',
      name: 'Executive Consultation Suite',
      slug: 'executive-consultation-suite',
      description: 'Acoustically isolated private meeting facility equipped with 4K telepresence, digital whiteboards, and concierge hospitality.',
      category: 'Workspace',
      duration_minutes: 45,
      buffer_before_minutes: 15,
      buffer_after_minutes: 15,
      price_amount: 75.0,
      price_currency: 'USD',
      is_active: true,
      capacity_type: 'individual',
      default_capacity: 1,
      max_advance_booking_days: 14,
      min_lead_time_hours: 4,
      requires_manual_confirmation: true,
      resource_assignment_mode: 'single_resource',
      payment_setting: 'pay_in_person',
      share_token: 'tok_preview_suite_002_live',
      created_at: new Date('2026-09-05T12:00:00Z'),
      updated_at: new Date('2026-09-05T12:00:00Z'),
    },
    {
      id: 'srv_quantum_003',
      organiser_id: 'usr_organiser_002',
      name: 'Quantum Algorithm Simulation Pod (Draft)',
      slug: 'quantum-algorithm-simulation-pod',
      description: 'Pre-release experimental quantum compute emulator access with senior quantum engineering assistance. Confidential access only.',
      category: 'Research',
      duration_minutes: 90,
      buffer_before_minutes: 30,
      buffer_after_minutes: 30,
      price_amount: 250.0,
      price_currency: 'USD',
      is_active: false, // Draft / Unpublished
      capacity_type: 'group',
      default_capacity: 6,
      max_advance_booking_days: 60,
      min_lead_time_hours: 24,
      requires_manual_confirmation: true,
      resource_assignment_mode: 'manual',
      payment_setting: 'paid',
      share_token: 'secret_share_preview_draft_quantum_777', // Secret share link for preview
      created_at: new Date('2026-09-10T08:00:00Z'),
      updated_at: new Date('2026-09-10T08:00:00Z'),
    },
  ];

  demoServices.forEach((s) => inMemoryServices.set(s.id, s));
  logger.info('In-memory demo services initialized', { count: demoServices.length });
};

seedDemoServices();

export class ServiceService {
  /**
   * Helper to format entity to client response
   */
  public static formatService(entity: ServiceEntity): ServiceResponse {
    return {
      id: entity.id,
      organiserId: entity.organiser_id,
      name: entity.name,
      slug: entity.slug,
      description: entity.description,
      category: entity.category,
      durationMinutes: entity.duration_minutes,
      bufferBeforeMinutes: entity.buffer_before_minutes,
      bufferAfterMinutes: entity.buffer_after_minutes,
      priceAmount: Number(entity.price_amount),
      priceCurrency: entity.price_currency,
      isActive: entity.is_active,
      isPublished: entity.is_active,
      capacityType: entity.capacity_type,
      defaultCapacity: entity.default_capacity,
      maxAdvanceBookingDays: entity.max_advance_booking_days,
      minLeadTimeHours: entity.min_lead_time_hours,
      requiresManualConfirmation: entity.requires_manual_confirmation,
      resourceAssignmentMode: entity.resource_assignment_mode,
      paymentSetting: entity.payment_setting,
      shareToken: entity.share_token,
      shareUrl: `/services/preview/${entity.share_token}`,
      metadata: entity.metadata,
      createdAt: entity.created_at.toISOString(),
      updatedAt: entity.updated_at.toISOString(),
    };
  }

  /**
   * Raw in-memory services store accessor
   */
  public static getRawInMemoryServices(): Map<string, ServiceEntity> {
    return inMemoryServices;
  }

  /**
   * Helper: Generate URL-safe slug from service name
   */
  public static generateSlug(name: string): string {
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return baseSlug || `service-${Date.now().toString(36)}`;
  }

  /**
   * Helper: Generate secure 32-char share token for unpublished previews
   */
  public static generateShareToken(): string {
    return `tok_${crypto.randomBytes(16).toString('hex')}`;
  }

  /**
   * 1. Get all services managed by a specific organiser
   */
  public static async getOrganiserServices(
    organiserId: string,
    options?: { category?: string; status?: 'all' | 'published' | 'draft' }
  ): Promise<ServiceResponse[]> {
    try {
      let queryText = `
        SELECT id, organiser_id, name, slug, description, category,
               duration_minutes, buffer_before_minutes, buffer_after_minutes,
               price_amount, price_currency, is_active, capacity_type,
               default_capacity, max_advance_booking_days, min_lead_time_hours,
               requires_manual_confirmation, resource_assignment_mode, payment_setting,
               share_token, metadata, created_at, updated_at
        FROM services
        WHERE organiser_id = $1
      `;
      const params: unknown[] = [organiserId];

      if (options?.status === 'published') {
        queryText += ' AND is_active = true';
      } else if (options?.status === 'draft') {
        queryText += ' AND is_active = false';
      }

      if (options?.category) {
        params.push(options.category);
        queryText += ` AND category = $${params.length}`;
      }

      queryText += ' ORDER BY created_at DESC;';

      const res = await db.query<ServiceEntity>(queryText, params);
      if (res.rows.length > 0) {
        return res.rows.map(this.formatService);
      }
    } catch (err) {
      logger.debug('PostgreSQL unavailable for getOrganiserServices, using memory fallback', {
        error: (err as Error).message,
      });
    }

    // In-Memory Fallback
    const list: ServiceEntity[] = [];
    for (const service of inMemoryServices.values()) {
      if (service.organiser_id === organiserId) {
        if (options?.status === 'published' && !service.is_active) continue;
        if (options?.status === 'draft' && service.is_active) continue;
        if (options?.category && service.category.toLowerCase() !== options.category.toLowerCase()) continue;
        list.push(service);
      }
    }

    list.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    return list.map(this.formatService);
  }

  /**
   * 2. Get all publicly listed / published services
   */
  public static async getPublicServices(): Promise<ServiceResponse[]> {
    try {
      const res = await db.query<ServiceEntity>(`
        SELECT * FROM services WHERE is_active = true ORDER BY created_at DESC;
      `);
      if (res.rows.length > 0) {
        return res.rows.map(this.formatService);
      }
    } catch (err) {
      logger.debug('PostgreSQL unavailable for getPublicServices, using memory fallback', {
        error: (err as Error).message,
      });
    }

    // In-memory fallback
    const list = Array.from(inMemoryServices.values()).filter((s) => s.is_active);
    return list.map(this.formatService);
  }

  /**
   * Platform-wide: Get all services for administration
   */
  public static async getAllServices(): Promise<ServiceResponse[]> {
    try {
      const res = await db.query<ServiceEntity>(
        'SELECT * FROM services ORDER BY created_at DESC;'
      );
      if (res.rows.length > 0) {
        return res.rows.map(this.formatService);
      }
    } catch (err) {
      logger.debug('PostgreSQL unavailable for getAllServices, using memory fallback');
    }

    return Array.from(inMemoryServices.values()).map(this.formatService);
  }

  /**
   * 3. Get single service by ID with ownership/draft check
   */
  public static async getServiceById(
    serviceId: string,
    requestingUser?: AuthUserPayload
  ): Promise<ServiceResponse> {
    let service: ServiceEntity | null = null;

    try {
      const res = await db.query<ServiceEntity>(
        'SELECT * FROM services WHERE id = $1 LIMIT 1;',
        [serviceId]
      );
      if (res.rows.length > 0) {
        service = res.rows[0];
      }
    } catch (err) {
      logger.debug('PostgreSQL query error, looking up in memory', { error: (err as Error).message });
    }

    if (!service) {
      service = inMemoryServices.get(serviceId) || null;
    }

    if (!service) {
      throw new NotFoundError(`Service with ID ${serviceId} could not be found.`);
    }

    // Draft authorization check: If service is unpublished, only owner or ADMIN can view it via normal ID
    if (!service.is_active) {
      const isOwner = requestingUser && requestingUser.id === service.organiser_id;
      const isAdmin = requestingUser && requestingUser.role === 'ADMIN';

      if (!isOwner && !isAdmin) {
        throw new ForbiddenError(
          'This service is currently in draft mode and not published to the public catalog. Use the secret share link to preview.'
        );
      }
    }

    return this.formatService(service);
  }

  /**
   * 4. Get service by secret Unpublished Share Token (Preview Link)
   */
  public static async getServiceByShareToken(shareToken: string): Promise<ServiceResponse> {
    let service: ServiceEntity | null = null;

    try {
      const res = await db.query<ServiceEntity>(
        'SELECT * FROM services WHERE share_token = $1 LIMIT 1;',
        [shareToken]
      );
      if (res.rows.length > 0) {
        service = res.rows[0];
      }
    } catch (err) {
      logger.debug('PostgreSQL query error for share token, looking up in memory', {
        error: (err as Error).message,
      });
    }

    if (!service) {
      for (const item of inMemoryServices.values()) {
        if (item.share_token === shareToken) {
          service = item;
          break;
        }
      }
    }

    if (!service) {
      throw new NotFoundError('Invalid or expired service preview share token.');
    }

    return this.formatService(service);
  }

  /**
   * 5. Create new service
   */
  public static async createService(
    organiserId: string,
    input: CreateServiceInput
  ): Promise<ServiceResponse> {
    const id = `srv_${crypto.randomUUID()}`;
    const slug = `${this.generateSlug(input.name)}-${Math.random().toString(36).slice(2, 6)}`;
    const shareToken = this.generateShareToken();

    const entity: ServiceEntity = {
      id,
      organiser_id: organiserId,
      name: input.name.trim(),
      slug,
      description: (input.description || '').trim(),
      category: (input.category || 'General').trim(),
      duration_minutes: input.durationMinutes,
      buffer_before_minutes: input.bufferBeforeMinutes ?? 0,
      buffer_after_minutes: input.bufferAfterMinutes ?? 0,
      price_amount: input.priceAmount ?? 0,
      price_currency: input.priceCurrency || 'USD',
      is_active: input.isPublished ?? false,
      capacity_type: input.capacityType || 'individual',
      default_capacity: input.defaultCapacity ?? 1,
      max_advance_booking_days: input.maxAdvanceBookingDays ?? 30,
      min_lead_time_hours: input.minLeadTimeHours ?? 1,
      requires_manual_confirmation: input.requiresManualConfirmation ?? false,
      resource_assignment_mode: input.resourceAssignmentMode || 'automatic',
      payment_setting: input.paymentSetting || 'free',
      share_token: shareToken,
      created_at: new Date(),
      updated_at: new Date(),
    };

    inMemoryServices.set(entity.id, entity);

    try {
      await db.query(
        `INSERT INTO services (
           id, organiser_id, name, slug, description, category,
           duration_minutes, buffer_before_minutes, buffer_after_minutes,
           price_amount, price_currency, is_active, capacity_type,
           default_capacity, max_advance_booking_days, min_lead_time_hours,
           requires_manual_confirmation, resource_assignment_mode, payment_setting,
           share_token, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22);`,
        [
          entity.id,
          entity.organiser_id,
          entity.name,
          entity.slug,
          entity.description,
          entity.category,
          entity.duration_minutes,
          entity.buffer_before_minutes,
          entity.buffer_after_minutes,
          entity.price_amount,
          entity.price_currency,
          entity.is_active,
          entity.capacity_type,
          entity.default_capacity,
          entity.max_advance_booking_days,
          entity.min_lead_time_hours,
          entity.requires_manual_confirmation,
          entity.resource_assignment_mode,
          entity.payment_setting,
          entity.share_token,
          entity.created_at,
          entity.updated_at,
        ]
      );
    } catch (err) {
      logger.debug('PostgreSQL insert error, service saved in-memory', {
        error: (err as Error).message,
      });
    }

    logger.info(`Service created successfully: ${entity.name} (${entity.id}) by organiser ${organiserId}`);
    return this.formatService(entity);
  }

  /**
   * 6. Update existing service with Organiser Ownership Check
   */
  public static async updateService(
    serviceId: string,
    organiserId: string,
    input: UpdateServiceInput,
    isAdmin: boolean
  ): Promise<ServiceResponse> {
    let service: ServiceEntity | null = null;

    try {
      const res = await db.query<ServiceEntity>(
        'SELECT * FROM services WHERE id = $1 LIMIT 1;',
        [serviceId]
      );
      if (res.rows.length > 0) service = res.rows[0];
    } catch {
      // In-memory fallback
    }

    if (!service) {
      service = inMemoryServices.get(serviceId) || null;
    }

    if (!service) {
      throw new NotFoundError(`Service with ID ${serviceId} could not be found.`);
    }

    // Ownership Verification
    if (service.organiser_id !== organiserId && !isAdmin) {
      throw new ForbiddenError('You do not have permission to modify this service. Organiser ownership required.');
    }

    // Update attributes
    if (input.name !== undefined) {
      service.name = input.name.trim();
      service.slug = `${this.generateSlug(input.name)}-${Math.random().toString(36).slice(2, 6)}`;
    }
    if (input.description !== undefined) service.description = input.description.trim();
    if (input.category !== undefined) service.category = input.category.trim();
    if (input.durationMinutes !== undefined) service.duration_minutes = input.durationMinutes;
    if (input.capacityType !== undefined) service.capacity_type = input.capacityType;
    if (input.defaultCapacity !== undefined) service.default_capacity = input.defaultCapacity;
    if (input.paymentSetting !== undefined) service.payment_setting = input.paymentSetting;
    if (input.priceAmount !== undefined) service.price_amount = input.priceAmount;
    if (input.priceCurrency !== undefined) service.price_currency = input.priceCurrency.toUpperCase();
    if (input.requiresManualConfirmation !== undefined) service.requires_manual_confirmation = input.requiresManualConfirmation;
    if (input.resourceAssignmentMode !== undefined) service.resource_assignment_mode = input.resourceAssignmentMode;
    if (input.bufferBeforeMinutes !== undefined) service.buffer_before_minutes = input.bufferBeforeMinutes;
    if (input.bufferAfterMinutes !== undefined) service.buffer_after_minutes = input.bufferAfterMinutes;
    if (input.maxAdvanceBookingDays !== undefined) service.max_advance_booking_days = input.maxAdvanceBookingDays;
    if (input.minLeadTimeHours !== undefined) service.min_lead_time_hours = input.minLeadTimeHours;
    if (input.isPublished !== undefined) service.is_active = input.isPublished;

    service.updated_at = new Date();
    inMemoryServices.set(service.id, service);

    try {
      await db.query(
        `UPDATE services SET
           name = $1, slug = $2, description = $3, category = $4,
           duration_minutes = $5, buffer_before_minutes = $6, buffer_after_minutes = $7,
           price_amount = $8, price_currency = $9, is_active = $10,
           capacity_type = $11, default_capacity = $12, max_advance_booking_days = $13,
           min_lead_time_hours = $14, requires_manual_confirmation = $15,
           resource_assignment_mode = $16, payment_setting = $17, updated_at = $18
         WHERE id = $19;`,
        [
          service.name,
          service.slug,
          service.description,
          service.category,
          service.duration_minutes,
          service.buffer_before_minutes,
          service.buffer_after_minutes,
          service.price_amount,
          service.price_currency,
          service.is_active,
          service.capacity_type,
          service.default_capacity,
          service.max_advance_booking_days,
          service.min_lead_time_hours,
          service.requires_manual_confirmation,
          service.resource_assignment_mode,
          service.payment_setting,
          service.updated_at,
          service.id,
        ]
      );
    } catch {
      // Memory fallback handled
    }

    logger.info(`Service updated successfully: ${service.name} (${service.id})`);
    return this.formatService(service);
  }

  /**
   * 7. Toggle Publish / Unpublish Status with Ownership Check
   */
  public static async setPublishStatus(
    serviceId: string,
    organiserId: string,
    isPublished: boolean,
    isAdmin: boolean
  ): Promise<ServiceResponse> {
    return this.updateService(serviceId, organiserId, { isPublished }, isAdmin);
  }

  /**
   * 8. Regenerate Secret Share Link Token for Unpublished Previews
   */
  public static async regenerateShareToken(
    serviceId: string,
    organiserId: string,
    isAdmin: boolean
  ): Promise<{ shareToken: string; shareUrl: string }> {
    let service = inMemoryServices.get(serviceId);
    if (!service) {
      try {
        const res = await db.query<ServiceEntity>('SELECT * FROM services WHERE id = $1;', [serviceId]);
        if (res.rows.length > 0) service = res.rows[0];
      } catch {
        // Fallback
      }
    }

    if (!service) {
      throw new NotFoundError(`Service with ID ${serviceId} could not be found.`);
    }

    if (service.organiser_id !== organiserId && !isAdmin) {
      throw new ForbiddenError('You do not have permission to regenerate this service preview token.');
    }

    const newToken = this.generateShareToken();
    service.share_token = newToken;
    service.updated_at = new Date();
    inMemoryServices.set(service.id, service);

    try {
      await db.query('UPDATE services SET share_token = $1, updated_at = $2 WHERE id = $3;', [
        newToken,
        service.updated_at,
        service.id,
      ]);
    } catch {
      // Fallback
    }

    logger.info(`Regenerated preview share token for service ${serviceId}: ${newToken}`);
    return {
      shareToken: newToken,
      shareUrl: `/services/preview/${newToken}`,
    };
  }

  /**
   * 9. Delete service with Organiser Ownership Check
   */
  public static async deleteService(
    serviceId: string,
    organiserId: string,
    isAdmin: boolean
  ): Promise<{ message: string }> {
    let service = inMemoryServices.get(serviceId);
    if (!service) {
      try {
        const res = await db.query<ServiceEntity>('SELECT * FROM services WHERE id = $1;', [serviceId]);
        if (res.rows.length > 0) service = res.rows[0];
      } catch {
        // Fallback
      }
    }

    if (!service) {
      throw new NotFoundError(`Service with ID ${serviceId} could not be found.`);
    }

    if (service.organiser_id !== organiserId && !isAdmin) {
      throw new ForbiddenError('You do not have permission to delete this service. Organiser ownership required.');
    }

    inMemoryServices.delete(serviceId);

    try {
      await db.query('DELETE FROM services WHERE id = $1;', [serviceId]);
    } catch {
      // Memory deletion handled
    }

    logger.info(`Service deleted: ${service.name} (${serviceId}) by organiser ${organiserId}`);
    return { message: `Service "${service.name}" has been permanently deleted.` };
  }
}
