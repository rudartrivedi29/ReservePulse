/**
 * Domain Models for Slot Generation Engine & Availability Contracts
 */

export type SlotStatus = 'available' | 'locked' | 'booked' | 'unavailable';

export interface BookableSlot {
  /** Unique deterministic slot identifier */
  id: string;
  /** Service identifier */
  serviceId: string;
  /** Resource fulfilling the appointment */
  resourceId: string;
  resourceName: string;
  resourceType: string;
  /** Calendar date YYYY-MM-DD */
  date: string;
  /** Time of day "HH:mm" */
  startTime: string;
  endTime: string;
  /** Complete UTC/ISO timestamps */
  startDateTime: string;
  endDateTime: string;
  /** Duration in minutes */
  durationMinutes: number;
  /** Capacity calculations */
  maxCapacity: number;
  bookedCapacity: number;
  remainingCapacity: number;
  /** Whether the slot is currently bookable */
  isBookable: boolean;
  status: SlotStatus;
}

export interface DayAvailability {
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0-6 (0=Sun, 1=Mon, ..., 6=Sat)
  dayName: string;
  hasAvailability: boolean;
  totalSlotsCount: number;
  slots: BookableSlot[];
}

export interface ServiceAvailabilityResponse {
  service: {
    id: string;
    name: string;
    slug: string;
    durationMinutes: number;
    bufferBeforeMinutes: number;
    bufferAfterMinutes: number;
    capacityType: string;
    defaultCapacity: number;
    minLeadTimeHours: number;
    maxAdvanceBookingDays: number;
  };
  query: {
    startDate: string;
    endDate: string;
    resourceId?: string;
    slotStepMinutes?: number;
    attendeeCount: number;
  };
  totalBookableSlots: number;
  days: DayAvailability[];
}

import { BookingStatus } from './booking.model';

export interface ExistingBookingEntity {
  id: string;
  booking_reference: string;
  service_id: string;
  resource_id: string;
  start_time: Date;
  end_time: Date;
  attendee_count: number;
  status: BookingStatus;
  created_at?: Date;
}

export interface SlotGenerationOptions {
  serviceId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  resourceId?: string;
  slotStepMinutes?: number;
  attendeeCount?: number;
  referenceTime?: Date;
  shareToken?: string;
}
