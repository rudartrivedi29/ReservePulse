export interface WorkingHoursEntity {
  id: string;
  organiser_id: string | null;
  resource_id: string | null;
  day_of_week: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  start_time: string; // e.g. "09:00:00"
  end_time: string; // e.g. "17:00:00"
  is_available: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface TimeInterval {
  id?: string;
  startTime: string; // "HH:mm" or "HH:mm:ss"
  endTime: string; // "HH:mm" or "HH:mm:ss"
}

export type DayName =
  | 'Sunday'
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday';

export const DAY_NAMES: DayName[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export interface DaySchedule {
  dayOfWeek: number; // 0 to 6
  dayName: DayName;
  isAvailable: boolean;
  intervals: TimeInterval[];
}

export interface WeeklyScheduleResponse {
  resourceId: string;
  resourceName?: string;
  organiserId: string;
  schedule: DaySchedule[];
  updatedAt?: string;
}

export interface NormalizedInterval {
  startTime: string; // "HH:mm:ss"
  endTime: string; // "HH:mm:ss"
  startMinutes: number; // minutes from midnight
  endMinutes: number; // minutes from midnight
  durationMinutes: number;
}

export interface NormalizedAvailabilityDay {
  date: string; // "YYYY-MM-DD"
  dayOfWeek: number; // 0 to 6
  dayName: DayName;
  isAvailable: boolean;
  workingIntervals: NormalizedInterval[];
}

export interface NormalizedAvailabilityResponse {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  capacity: number;
  startDate: string;
  endDate: string;
  days: NormalizedAvailabilityDay[];
}
