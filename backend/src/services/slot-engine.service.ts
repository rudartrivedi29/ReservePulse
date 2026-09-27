import crypto from 'crypto';
import { db } from '../config/database';
import { logger } from '../utils/logger';
import { NotFoundError, BadRequestError } from '../utils/errors';
import {
  BookableSlot,
  DayAvailability,
  ServiceAvailabilityResponse,
  ExistingBookingEntity,
  SlotGenerationOptions,
} from '../models/slot.model';
import { ServiceService } from './service.service';
import { ResourceService } from './resource.service';
import { SchedulingService } from './schedule.service';

/**
 * In-memory store for bookings (used for testing and resilient fallback)
 */
const inMemoryBookings: Map<string, ExistingBookingEntity> = new Map();

/**
 * Helper: format minutes from midnight to HH:mm string
 */
export const minutesToTimeString = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * Helper: parse HH:mm to minutes from midnight
 */
export const timeStringToMinutes = (timeStr: string): number => {
  const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
  if (isNaN(h) || isNaN(m)) return 0;
  return h * 60 + m;
};

/**
 * Helper: combine date string (YYYY-MM-DD) and minute offset to UTC ISO string
 */
export const createUtcDateTime = (dateStr: string, minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${dateStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`;
};

export class SlotEngineService {
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
   * Add a booking to in-memory store (used for unit testing and development)
   */
  public static addTestBooking(booking: Omit<ExistingBookingEntity, 'id'> & { id?: string }): ExistingBookingEntity {
    const id = booking.id || `bk_test_${crypto.randomUUID()}`;
    const entity: ExistingBookingEntity = {
      id,
      booking_reference: booking.booking_reference || `ref_${id}`,
      service_id: booking.service_id,
      resource_id: booking.resource_id,
      start_time: new Date(booking.start_time),
      end_time: new Date(booking.end_time),
      attendee_count: booking.attendee_count,
      status: booking.status,
      created_at: booking.created_at || new Date(),
    };
    inMemoryBookings.set(id, entity);
    return entity;
  }

  /**
   * Update an existing in-memory booking status (e.g. cancelled)
   */
  public static updateBookingStatus(id: string, status: ExistingBookingEntity['status']): void {
    const existing = inMemoryBookings.get(id);
    if (existing) {
      existing.status = status;
      inMemoryBookings.set(id, existing);
    }
  }

  /**
   * Clear in-memory test bookings
   */
  public static clearTestBookings(): void {
    inMemoryBookings.clear();
  }

  /**
   * Fetch active bookings that overlap with a time window for given resources
   */
  public static async getActiveBookingsForResources(
    resourceIds: string[],
    windowStart: Date,
    windowEnd: Date
  ): Promise<ExistingBookingEntity[]> {
    if (resourceIds.length === 0) return [];

    if (await this.isDbConnected()) {
      const query = `
        SELECT 
          id, booking_reference, service_id, resource_id,
          start_time, end_time, attendee_count, status, created_at
        FROM bookings
        WHERE resource_id = ANY($1)
          AND status IN ('pending', 'confirmed', 'in_progress')
          AND end_time > $2
          AND start_time < $3
      `;
      try {
        const res = await db.query(query, [resourceIds, windowStart, windowEnd]);
        return res.rows.map((row: any) => ({
          id: row.id,
          booking_reference: row.booking_reference,
          service_id: row.service_id,
          resource_id: row.resource_id,
          start_time: new Date(row.start_time),
          end_time: new Date(row.end_time),
          attendee_count: Number(row.attendee_count),
          status: row.status,
          created_at: new Date(row.created_at),
        }));
      } catch (err) {
        logger.warn('Failed to query bookings from database, falling back to in-memory store', { error: err });
      }
    }

    // In-memory fallback
    const list: ExistingBookingEntity[] = [];
    const resourceSet = new Set(resourceIds);

    for (const b of inMemoryBookings.values()) {
      if (
        resourceSet.has(b.resource_id) &&
        ['pending', 'confirmed', 'in_progress'].includes(b.status) &&
        b.end_time.getTime() > windowStart.getTime() &&
        b.start_time.getTime() < windowEnd.getTime()
      ) {
        list.push(b);
      }
    }

    return list;
  }

  /**
   * Core Reusable Slot Generation Engine
   * Calculates only currently bookable appointment slots from service duration,
   * resource working schedules, existing bookings, capacity, and booking rules.
   */
  public static async generateSlots(
    options: SlotGenerationOptions
  ): Promise<ServiceAvailabilityResponse> {
    const {
      serviceId,
      startDate,
      endDate,
      resourceId,
      slotStepMinutes,
      attendeeCount = 1,
      referenceTime = new Date(),
      shareToken,
    } = options;

    // 1. Fetch Service Details
    let serviceEntity;
    try {
      serviceEntity = await ServiceService.getServiceById(serviceId);
    } catch {
      // Check if draft service is accessible via shareToken
      if (shareToken) {
        try {
          serviceEntity = await ServiceService.getServiceByShareToken(shareToken);
        } catch {
          throw new NotFoundError(`Service with ID "${serviceId}" not found`);
        }
      } else {
        throw new NotFoundError(`Service with ID "${serviceId}" not found`);
      }
    }

    // Service must be active (or authenticated preview via shareToken)
    if (!serviceEntity.isActive && serviceEntity.shareToken !== shareToken) {
      throw new NotFoundError(`Service with ID "${serviceId}" is currently unpublished`);
    }

    const duration = serviceEntity.durationMinutes;
    const bufferBefore = serviceEntity.bufferBeforeMinutes || 0;
    const bufferAfter = serviceEntity.bufferAfterMinutes || 0;
    const minLeadTimeHours = serviceEntity.minLeadTimeHours ?? 1;
    const maxAdvanceDays = serviceEntity.maxAdvanceBookingDays ?? 30;
    const stepSize = slotStepMinutes && slotStepMinutes > 0 ? slotStepMinutes : duration;

    // 2. Fetch Assigned Resources for the Service
    let candidateResources = await ResourceService.getResourcesForService(serviceId);

    // If a specific resource was requested, filter and validate
    if (resourceId) {
      candidateResources = candidateResources.filter((r) => r.id === resourceId);
    }

    // Filter to operational & active resources only
    candidateResources = candidateResources.filter(
      (r) => r.isActive && (r.status === 'active' || r.status === 'operational')
    );

    const serviceSummary = {
      id: serviceEntity.id,
      name: serviceEntity.name,
      slug: serviceEntity.slug,
      durationMinutes: duration,
      bufferBeforeMinutes: bufferBefore,
      bufferAfterMinutes: bufferAfter,
      capacityType: serviceEntity.capacityType,
      defaultCapacity: serviceEntity.defaultCapacity,
      minLeadTimeHours,
      maxAdvanceBookingDays: maxAdvanceDays,
    };

    const querySummary = {
      startDate,
      endDate,
      resourceId,
      slotStepMinutes: stepSize,
      attendeeCount,
    };

    // If no eligible resources exist, return empty availability immediately
    if (candidateResources.length === 0) {
      return {
        service: serviceSummary,
        query: querySummary,
        totalBookableSlots: 0,
        days: [],
      };
    }

    // 3. Query existing bookings for all candidate resources within the date window
    const windowStart = new Date(`${startDate}T00:00:00.000Z`);
    const windowEnd = new Date(`${endDate}T23:59:59.999Z`);
    const resourceIds = candidateResources.map((r) => r.id);

    const activeBookings = await this.getActiveBookingsForResources(
      resourceIds,
      windowStart,
      windowEnd
    );

    // 4. Fetch Normalized Working Schedules for each candidate resource
    const resourceAvailabilityMap = new Map<string, any>();
    for (const res of candidateResources) {
      const avail = await SchedulingService.getNormalizedAvailability(
        res.id,
        startDate,
        endDate
      );
      resourceAvailabilityMap.set(res.id, avail);
    }

    // 5. Generate candidate slots day by day
    const slotsByDate = new Map<string, BookableSlot[]>();
    const dayMetaMap = new Map<string, { dayOfWeek: number; dayName: string }>();

    // Temporal rule limits
    const nowMs = referenceTime.getTime();
    const minLeadTimeMs = minLeadTimeHours * 60 * 60 * 1000;
    const maxAdvanceBookingMs = maxAdvanceDays * 24 * 60 * 60 * 1000;

    for (const res of candidateResources) {
      const normSchedule = resourceAvailabilityMap.get(res.id);
      if (!normSchedule || !normSchedule.days) continue;

      for (const dayItem of normSchedule.days) {
        const dateStr: string = dayItem.date;
        if (!slotsByDate.has(dateStr)) {
          slotsByDate.set(dateStr, []);
        }
        if (!dayMetaMap.has(dateStr)) {
          dayMetaMap.set(dateStr, {
            dayOfWeek: dayItem.dayOfWeek,
            dayName: dayItem.dayName,
          });
        }

        // If resource is off or has no working intervals on this day, skip
        if (!dayItem.isAvailable || !dayItem.workingIntervals || dayItem.workingIntervals.length === 0) {
          continue;
        }

        // Compute effective capacity for this resource & service pair
        let maxCapacity = serviceEntity.defaultCapacity;
        if (serviceEntity.capacityType === 'individual') {
          maxCapacity = 1;
        } else if (serviceEntity.capacityType === 'resource_constrained') {
          maxCapacity = Math.min(serviceEntity.defaultCapacity, res.capacity);
        } else if (serviceEntity.capacityType === 'group') {
          maxCapacity = serviceEntity.defaultCapacity;
        }

        // Slice slots for each working interval
        for (const interval of dayItem.workingIntervals) {
          const intervalStartMin = interval.startMinutes;
          const intervalEndMin = interval.endMinutes;

          // Required minimum span: bufferBefore + duration + bufferAfter
          const totalSlotSpan = bufferBefore + duration + bufferAfter;
          if (interval.durationMinutes < totalSlotSpan) {
            continue;
          }

          // Candidate slot starts at intervalStartMin + bufferBefore
          // and ends when slotEndMin + bufferAfter <= intervalEndMin
          for (
            let slotStartMin = intervalStartMin + bufferBefore;
            slotStartMin + duration + bufferAfter <= intervalEndMin;
            slotStartMin += stepSize
          ) {
            const slotEndMin = slotStartMin + duration;

            // Generate ISO strings and Date timestamps
            const startIso = createUtcDateTime(dateStr, slotStartMin);
            const endIso = createUtcDateTime(dateStr, slotEndMin);
            const slotStartDate = new Date(startIso);
            const slotEndDate = new Date(endIso);
            const slotStartMs = slotStartDate.getTime();

            // Constraint 1: Must be strictly in the future relative to reference time
            if (slotStartMs <= nowMs) {
              continue;
            }

            // Constraint 2: Must satisfy minimum lead time
            if (slotStartMs - nowMs < minLeadTimeMs) {
              continue;
            }

            // Constraint 3: Must not exceed maximum advance booking window
            if (slotStartMs - nowMs > maxAdvanceBookingMs) {
              continue;
            }

            // Constraint 4: Check overlapping bookings and remaining capacity
            // Resource footprint includes required buffers before and after
            const footprintStartMs = slotStartMs - bufferBefore * 60 * 1000;
            const footprintEndMs = slotEndDate.getTime() + bufferAfter * 60 * 1000;

            const overlappingBookings = activeBookings.filter(
              (b) =>
                b.resource_id === res.id &&
                b.end_time.getTime() > footprintStartMs &&
                b.start_time.getTime() < footprintEndMs
            );

            const bookedCapacity = overlappingBookings.reduce(
              (sum, b) => sum + (b.attendee_count || 1),
              0
            );

            const remainingCapacity = Math.max(0, maxCapacity - bookedCapacity);

            // Is bookable check: must have enough capacity for requested attendees
            const isBookable = remainingCapacity >= attendeeCount && remainingCapacity > 0;

            // Only currently bookable slots are emitted
            if (isBookable) {
              const startTimeStr = minutesToTimeString(slotStartMin);
              const endTimeStr = minutesToTimeString(slotEndMin);
              const slotId = `slt_${res.id}_${dateStr}_${startTimeStr.replace(':', '')}_${endTimeStr.replace(':', '')}`;

              slotsByDate.get(dateStr)!.push({
                id: slotId,
                serviceId,
                resourceId: res.id,
                resourceName: res.name,
                resourceType: res.resourceType,
                date: dateStr,
                startTime: startTimeStr,
                endTime: endTimeStr,
                startDateTime: startIso,
                endDateTime: endIso,
                durationMinutes: duration,
                maxCapacity,
                bookedCapacity,
                remainingCapacity,
                isBookable: true,
                status: 'available',
              });
            }
          }
        }
      }
    }

    // 6. Build final aggregated response sorted by date and slot start time
    const days: DayAvailability[] = [];
    let totalBookableSlots = 0;

    // Generate date sequence between startDate and endDate
    const curDate = new Date(`${startDate}T00:00:00.000Z`);
    const stopDate = new Date(`${endDate}T00:00:00.000Z`);

    while (curDate <= stopDate) {
      const dStr = curDate.toISOString().split('T')[0];
      const slots = slotsByDate.get(dStr) || [];

      // Sort slots by startDateTime, then by resourceName
      slots.sort((a, b) => {
        const timeDiff = a.startDateTime.localeCompare(b.startDateTime);
        if (timeDiff !== 0) return timeDiff;
        return a.resourceName.localeCompare(b.resourceName);
      });

      const dayMeta = dayMetaMap.get(dStr) || {
        dayOfWeek: curDate.getUTCDay(),
        dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][curDate.getUTCDay()],
      };

      days.push({
        date: dStr,
        dayOfWeek: dayMeta.dayOfWeek,
        dayName: dayMeta.dayName,
        hasAvailability: slots.length > 0,
        totalSlotsCount: slots.length,
        slots,
      });

      totalBookableSlots += slots.length;
      curDate.setUTCDate(curDate.getUTCDate() + 1);
    }

    return {
      service: serviceSummary,
      query: querySummary,
      totalBookableSlots,
      days,
    };
  }
}
