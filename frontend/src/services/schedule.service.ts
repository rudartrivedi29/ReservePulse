import { apiClient } from './api';
import type { ApiResponse } from '../types';

export interface TimeInterval {
  id?: string;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
}

export type DayName =
  | 'Sunday'
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday';

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
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
}

export interface NormalizedAvailabilityDay {
  date: string;
  dayOfWeek: number;
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

export const scheduleClient = {
  /**
   * Fetch weekly working hours schedule for a resource
   */
  async getResourceSchedule(resourceId: string): Promise<ApiResponse<WeeklyScheduleResponse>> {
    return apiClient.get<WeeklyScheduleResponse>(`/organiser/resources/${resourceId}/schedule`);
  },

  /**
   * Update weekly working hours schedule for a resource
   */
  async updateResourceSchedule(
    resourceId: string,
    schedule: DaySchedule[]
  ): Promise<ApiResponse<WeeklyScheduleResponse>> {
    return apiClient.put<WeeklyScheduleResponse>(`/organiser/resources/${resourceId}/schedule`, {
      schedule,
    });
  },

  /**
   * Fetch normalized availability across a calendar window (input contract for future slot engine)
   */
  async getNormalizedAvailability(
    resourceId: string,
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<NormalizedAvailabilityResponse>> {
    const query = new URLSearchParams({ startDate, endDate }).toString();
    return apiClient.get<NormalizedAvailabilityResponse>(
      `/schedules/resources/${resourceId}/availability?${query}`
    );
  },
};
