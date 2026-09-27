import { z } from 'zod';
import { DAY_NAMES, DayName } from '../models/schedule.model';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;

/**
 * Converts "HH:mm" or "HH:mm:ss" to total minutes from midnight
 */
export const timeToMinutes = (timeStr: string): number => {
  const parts = timeStr.split(':').map((p) => parseInt(p, 10));
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) {
    throw new Error(`Invalid time string: ${timeStr}`);
  }
  return parts[0] * 60 + parts[1];
};

/**
 * Standardizes time string to "HH:mm:ss"
 */
export const normalizeTime = (timeStr: string): string => {
  const parts = timeStr.split(':');
  const hours = parts[0].padStart(2, '0');
  const minutes = parts[1].padStart(2, '0');
  const seconds = parts[2] ? parts[2].padStart(2, '0') : '00';
  return `${hours}:${minutes}:${seconds}`;
};

export const timeIntervalSchema = z
  .object({
    id: z.string().optional(),
    startTime: z.string().regex(timeRegex, 'Start time must be formatted as HH:mm or HH:mm:ss'),
    endTime: z.string().regex(timeRegex, 'End time must be formatted as HH:mm or HH:mm:ss'),
  })
  .refine(
    (val) => {
      try {
        const start = timeToMinutes(val.startTime);
        const end = timeToMinutes(val.endTime);
        return start < end;
      } catch {
        return false;
      }
    },
    {
      message: 'Start time must be earlier than end time',
      path: ['endTime'],
    }
  );

export const dayScheduleSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    dayName: z.enum([
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ]).optional(),
    isAvailable: z.boolean().default(true),
    intervals: z.array(timeIntervalSchema).default([]),
  })
  .superRefine((day, ctx) => {
    if (!day.isAvailable || day.intervals.length <= 1) {
      return;
    }

    // Sort intervals by start time
    const sorted = [...day.intervals].sort(
      (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    );

    const dayName: DayName = day.dayName || DAY_NAMES[day.dayOfWeek];

    // Check for collisions between overlapping intervals
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      const currentEnd = timeToMinutes(current.endTime);
      const nextStart = timeToMinutes(next.startTime);

      if (currentEnd > nextStart) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Overlapping working periods on ${dayName}: [${current.startTime} - ${current.endTime}] overlaps with [${next.startTime} - ${next.endTime}]`,
          path: ['intervals', i + 1],
        });
      }
    }
  });

export const updateWeeklyScheduleSchema = z.object({
  schedule: z.array(dayScheduleSchema).min(1, 'Schedule array cannot be empty'),
});

export const availabilityQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be in YYYY-MM-DD format'),
});

export type TimeIntervalInput = z.infer<typeof timeIntervalSchema>;
export type DayScheduleInput = z.infer<typeof dayScheduleSchema>;
export type UpdateWeeklyScheduleInput = z.infer<typeof updateWeeklyScheduleSchema>;
export type AvailabilityQueryInput = z.infer<typeof availabilityQuerySchema>;
