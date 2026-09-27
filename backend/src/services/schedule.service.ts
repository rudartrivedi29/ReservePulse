import crypto from 'crypto';
import { db } from '../config/database';
import { logger } from '../utils/logger';
import { BadRequestError } from '../utils/errors';
import {
  WorkingHoursEntity,
  WeeklyScheduleResponse,
  DaySchedule,
  DAY_NAMES,
  DayName,
  NormalizedAvailabilityResponse,
  NormalizedAvailabilityDay,
  NormalizedInterval,
} from '../models/schedule.model';
import {
  DayScheduleInput,
  timeToMinutes,
  normalizeTime,
} from '../validators/schedule.validator';
import { ResourceService } from './resource.service';

// In-Memory store for development and resilient database fallback
const inMemoryWorkingHours: Map<string, WorkingHoursEntity> = new Map();

// Seed initial working hours for demo resources
const seedDemoWorkingHours = () => {
  if (inMemoryWorkingHours.size > 0) return;

  const now = new Date('2026-09-01T10:00:00Z');

  // Boardroom Alpha: Mon-Fri 08:00 - 18:00, Sat 10:00 - 16:00
  for (let day = 1; day <= 5; day++) {
    const id = `wh_boardroom_${day}`;
    inMemoryWorkingHours.set(id, {
      id,
      organiser_id: 'usr_organiser_002',
      resource_id: 'res_boardroom_alpha',
      day_of_week: day,
      start_time: '08:00:00',
      end_time: '18:00:00',
      is_available: true,
      created_at: now,
      updated_at: now,
    });
  }
  inMemoryWorkingHours.set('wh_boardroom_6', {
    id: 'wh_boardroom_6',
    organiser_id: 'usr_organiser_002',
    resource_id: 'res_boardroom_alpha',
    day_of_week: 6,
    start_time: '10:00:00',
    end_time: '16:00:00',
    is_available: true,
    created_at: now,
    updated_at: now,
  });

  // GPU Node 01: 24/7 Compute Mon-Sun 00:00 - 23:59:59
  for (let day = 0; day <= 6; day++) {
    const id = `wh_gpu_${day}`;
    inMemoryWorkingHours.set(id, {
      id,
      organiser_id: 'usr_organiser_002',
      resource_id: 'res_h100_node1',
      day_of_week: day,
      start_time: '00:00:00',
      end_time: '23:59:00',
      is_available: true,
      created_at: now,
      updated_at: now,
    });
  }

  // Private Pod 1: Mon-Fri with morning & afternoon shifts (09:00-12:30, 13:30-18:00)
  for (let day = 1; day <= 5; day++) {
    const id1 = `wh_pod_${day}_am`;
    const id2 = `wh_pod_${day}_pm`;
    inMemoryWorkingHours.set(id1, {
      id: id1,
      organiser_id: 'usr_organiser_002',
      resource_id: 'res_pod_private_1',
      day_of_week: day,
      start_time: '09:00:00',
      end_time: '12:30:00',
      is_available: true,
      created_at: now,
      updated_at: now,
    });
    inMemoryWorkingHours.set(id2, {
      id: id2,
      organiser_id: 'usr_organiser_002',
      resource_id: 'res_pod_private_1',
      day_of_week: day,
      start_time: '13:30:00',
      end_time: '18:00:00',
      is_available: true,
      created_at: now,
      updated_at: now,
    });
  }

  // Staff Jordan Vance: Mon-Fri 09:00 - 17:00
  for (let day = 1; day <= 5; day++) {
    const id = `wh_staff_jordan_${day}`;
    inMemoryWorkingHours.set(id, {
      id,
      organiser_id: 'usr_organiser_002',
      resource_id: 'res_staff_jordan',
      day_of_week: day,
      start_time: '09:00:00',
      end_time: '17:00:00',
      is_available: true,
      created_at: now,
      updated_at: now,
    });
  }
};

seedDemoWorkingHours();

export class SchedulingService {
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
   * Generates a default 7-day schedule (Mon-Fri 09:00 - 17:00, Sat & Sun off)
   */
  public static getDefaultWeeklySchedule(): DaySchedule[] {
    return [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
      const dayName: DayName = DAY_NAMES[dayOfWeek];
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
      return {
        dayOfWeek,
        dayName,
        isAvailable: isWeekday,
        intervals: isWeekday
          ? [{ startTime: '09:00', endTime: '17:00' }]
          : [],
      };
    });
  }

  /**
   * Fetch configured weekly schedule for a resource
   */
  public static async getWeeklySchedule(
    resourceId: string,
    organiserId?: string,
    isAdmin = false
  ): Promise<WeeklyScheduleResponse> {
    // 1. Ownership & existence check on resource
    const resource = await ResourceService.getResourceById(
      resourceId,
      organiserId,
      isAdmin
    );

    let rows: WorkingHoursEntity[] = [];

    if (await this.isDbConnected()) {
      const res = await db.query(
        `SELECT * FROM working_hours 
         WHERE resource_id = $1 
         ORDER BY day_of_week ASC, start_time ASC`,
        [resourceId]
      );
      rows = res.rows as any;
    } else {
      seedDemoWorkingHours();
      rows = Array.from(inMemoryWorkingHours.values()).filter(
        (wh) => wh.resource_id === resourceId
      );
      rows.sort(
        (a, b) =>
          a.day_of_week - b.day_of_week ||
          a.start_time.localeCompare(b.start_time)
      );
    }

    // If no schedule configured yet, return default
    if (rows.length === 0) {
      return {
        resourceId: resource.id,
        resourceName: resource.name,
        organiserId: resource.organiserId,
        schedule: this.getDefaultWeeklySchedule(),
      };
    }

    // Build day map for 0 to 6
    const scheduleByDay = new Map<number, DaySchedule>();
    for (let day = 0; day <= 6; day++) {
      scheduleByDay.set(day, {
        dayOfWeek: day,
        dayName: DAY_NAMES[day],
        isAvailable: false,
        intervals: [],
      });
    }

    let latestUpdated = resource.updatedAt;

    for (const row of rows) {
      const daySchedule = scheduleByDay.get(row.day_of_week)!;
      if (row.is_available) {
        daySchedule.isAvailable = true;
        daySchedule.intervals.push({
          id: row.id,
          startTime: row.start_time.substring(0, 5), // "HH:mm"
          endTime: row.end_time.substring(0, 5),     // "HH:mm"
        });
      }
      if (row.updated_at && String(row.updated_at) > latestUpdated) {
        latestUpdated = new Date(row.updated_at).toISOString();
      }
    }

    // Ensure intervals inside each day are sorted by start time
    for (const day of scheduleByDay.values()) {
      day.intervals.sort(
        (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
      );
    }

    return {
      resourceId: resource.id,
      resourceName: resource.name,
      organiserId: resource.organiserId,
      schedule: Array.from(scheduleByDay.values()),
      updatedAt: latestUpdated,
    };
  }

  /**
   * Save / update weekly schedule for a resource with collision validation
   */
  public static async updateWeeklySchedule(
    resourceId: string,
    organiserId: string,
    days: DayScheduleInput[],
    isAdmin = false
  ): Promise<WeeklyScheduleResponse> {
    // 1. Verify resource ownership
    const resource = await ResourceService.getResourceById(
      resourceId,
      organiserId,
      isAdmin
    );

    // 2. Validate all intervals and collision rules per day
    for (const day of days) {
      if (!day.isAvailable || !day.intervals || day.intervals.length === 0) {
        continue;
      }

      // Check start < end for each interval
      for (const interval of day.intervals) {
        const start = timeToMinutes(interval.startTime);
        const end = timeToMinutes(interval.endTime);
        if (start >= end) {
          throw new BadRequestError(
            `Invalid time interval on ${DAY_NAMES[day.dayOfWeek]}: start time (${interval.startTime}) must be earlier than end time (${interval.endTime})`
          );
        }
      }

      // Sort and check overlaps
      const sorted = [...day.intervals].sort(
        (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
      );

      for (let i = 0; i < sorted.length - 1; i++) {
        const curr = sorted[i];
        const next = sorted[i + 1];
        if (timeToMinutes(curr.endTime) > timeToMinutes(next.startTime)) {
          throw new BadRequestError(
            `Overlapping working periods on ${DAY_NAMES[day.dayOfWeek]}: [${curr.startTime} - ${curr.endTime}] overlaps with [${next.startTime} - ${next.endTime}]`
          );
        }
      }
    }

    const now = new Date();

    if (await this.isDbConnected()) {
      // Begin transaction to replace working hours
      await db.query('BEGIN');
      try {
        await db.query('DELETE FROM working_hours WHERE resource_id = $1', [
          resourceId,
        ]);

        for (const day of days) {
          if (!day.isAvailable || day.intervals.length === 0) {
            // Optional day off entry
            const offId = `wh_${crypto.randomUUID()}`;
            await db.query(
              `INSERT INTO working_hours (
                id, organiser_id, resource_id, day_of_week, start_time, end_time, is_available, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, '00:00:00', '00:00:00', false, $5, $5)`,
              [offId, resource.organiserId, resourceId, day.dayOfWeek, now]
            );
            continue;
          }

          for (const interval of day.intervals) {
            const rowId = `wh_${crypto.randomUUID()}`;
            await db.query(
              `INSERT INTO working_hours (
                id, organiser_id, resource_id, day_of_week, start_time, end_time, is_available, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, true, $7, $7)`,
              [
                rowId,
                resource.organiserId,
                resourceId,
                day.dayOfWeek,
                normalizeTime(interval.startTime),
                normalizeTime(interval.endTime),
                now,
              ]
            );
          }
        }

        await db.query('COMMIT');
        logger.info(`Updated working hours for resource ${resourceId}`);
      } catch (err) {
        await db.query('ROLLBACK');
        throw err;
      }

      return this.getWeeklySchedule(resourceId, organiserId, isAdmin);
    }

    // In-memory fallback
    // Remove existing
    for (const [id, wh] of inMemoryWorkingHours.entries()) {
      if (wh.resource_id === resourceId) {
        inMemoryWorkingHours.delete(id);
      }
    }

    // Insert new
    for (const day of days) {
      if (!day.isAvailable || day.intervals.length === 0) {
        continue;
      }

      for (const interval of day.intervals) {
        const id = `wh_${crypto.randomUUID()}`;
        inMemoryWorkingHours.set(id, {
          id,
          organiser_id: resource.organiserId,
          resource_id: resourceId,
          day_of_week: day.dayOfWeek,
          start_time: normalizeTime(interval.startTime),
          end_time: normalizeTime(interval.endTime),
          is_available: true,
          created_at: now,
          updated_at: now,
        });
      }
    }

    logger.info(`[In-Memory] Updated working hours for resource ${resourceId}`);
    return this.getWeeklySchedule(resourceId, organiserId, isAdmin);
  }

  /**
   * Reusable normalization method:
   * Exposes normalized day-by-day availability intervals for slot generation.
   */
  public static async getNormalizedAvailability(
    resourceId: string,
    startDateStr: string,
    endDateStr: string,
    organiserId?: string,
    isAdmin = false
  ): Promise<NormalizedAvailabilityResponse> {
    const resource = await ResourceService.getResourceById(
      resourceId,
      organiserId,
      isAdmin
    );

    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestError('Invalid date range parameters');
    }

    if (start > end) {
      throw new BadRequestError('startDate must be earlier than or equal to endDate');
    }

    // Max window check (90 days)
    const diffDays = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays > 90) {
      throw new BadRequestError('Availability queries cannot exceed 90 days');
    }

    // Fetch resource weekly template
    const weekly = await this.getWeeklySchedule(resourceId, organiserId, isAdmin);
    const weeklyMap = new Map<number, DaySchedule>();
    weekly.schedule.forEach((d) => weeklyMap.set(d.dayOfWeek, d));

    const days: NormalizedAvailabilityDay[] = [];
    const current = new Date(start);

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const dayOfWeek = current.getUTCDay(); // 0 = Sunday, 6 = Saturday
      const dayName = DAY_NAMES[dayOfWeek];
      const config = weeklyMap.get(dayOfWeek);

      // Check if resource is active
      const isResourceActive = resource.isActive;
      const isDayAvailable = Boolean(config?.isAvailable && isResourceActive);

      const workingIntervals: NormalizedInterval[] = [];

      if (isDayAvailable && config && config.intervals.length > 0) {
        for (const interval of config.intervals) {
          const startMin = timeToMinutes(interval.startTime);
          const endMin = timeToMinutes(interval.endTime);
          workingIntervals.push({
            startTime: normalizeTime(interval.startTime),
            endTime: normalizeTime(interval.endTime),
            startMinutes: startMin,
            endMinutes: endMin,
            durationMinutes: endMin - startMin,
          });
        }
      }

      days.push({
        date: dateStr,
        dayOfWeek,
        dayName,
        isAvailable: isDayAvailable && workingIntervals.length > 0,
        workingIntervals,
      });

      // Advance by 1 day
      current.setUTCDate(current.getUTCDate() + 1);
    }

    return {
      resourceId: resource.id,
      resourceName: resource.name,
      resourceType: resource.resourceType,
      capacity: resource.capacity,
      startDate: startDateStr,
      endDate: endDateStr,
      days,
    };
  }
}
