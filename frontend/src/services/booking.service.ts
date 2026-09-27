import { apiClient } from './api';
import type { ApiResponse } from '../types';
import type { ResourceItem } from './resource.service';

export interface BookableSlot {
  id: string;
  serviceId: string;
  resourceId: string;
  resourceName: string;
  resourceType: string;
  date: string;
  startTime: string;
  endTime: string;
  startDateTime: string;
  endDateTime: string;
  durationMinutes: number;
  maxCapacity: number;
  bookedCapacity: number;
  remainingCapacity: number;
  isBookable: boolean;
  status: 'available' | 'locked' | 'booked' | 'unavailable';
}

export interface DayAvailability {
  date: string;
  dayOfWeek: number;
  dayName: string;
  hasAvailability: boolean;
  totalSlotsCount: number;
  slots: BookableSlot[];
}

export interface ServiceAvailabilityData {
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

export interface ServiceQuestionItem {
  id: string;
  serviceId: string;
  questionText: string;
  questionType: 'text' | 'textarea' | 'select' | 'checkbox' | 'number';
  options: string[];
  isRequired: boolean;
  orderIndex: number;
}

export interface BookingAnswerItem {
  questionId: string;
  questionText: string;
  answerText: string;
}

export type BookingStatusType =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'payment-failed'
  | 'payment_failed';

export interface PaymentIntentResponse {
  paymentIntentId: string;
  clientSecret: string;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  requiresAdvancePayment: boolean;
}

export interface PaymentSummaryResponse {
  id?: string;
  transactionReference?: string;
  paymentMethod?: string;
  amount: number;
  currency: string;
  status: 'unpaid' | 'pending' | 'paid' | 'refunded' | 'partially_refunded' | 'failed';
  paidAt?: string;
}

export interface BookingItem {
  id: string;
  bookingReference: string;
  serviceId: string;
  serviceName: string;
  serviceCategory?: string;
  serviceDurationMinutes?: number;
  organiserId?: string;
  resourceId?: string | null;
  resourceName?: string;
  resourceType?: string;
  resourceLocation?: string;
  customerId?: string | null;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  startTime: string;
  endTime: string;
  attendeeCount: number;
  status: BookingStatusType;
  paymentStatus: 'unpaid' | 'pending' | 'paid' | 'refunded' | 'partially_refunded' | 'failed';
  totalPrice: number;
  priceCurrency: string;
  notes?: string | null;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  answers: BookingAnswerItem[];
  paymentIntent?: PaymentIntentResponse | null;
  paymentSummary?: PaymentSummaryResponse | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingPayload {
  serviceId: string;
  resourceId: string;
  startDateTime: string;
  endDateTime?: string;
  slotId?: string;
  attendeeCount: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  notes?: string;
  answers?: { questionId: string; answerText: string }[];
  idempotencyKey?: string;
}

export interface BookingFilters {
  status?: string;
  timeFilter?: 'all' | 'upcoming' | 'past' | 'today' | 'this_week';
  search?: string;
  serviceId?: string;
  resourceId?: string;
  organiserId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export const bookingClient = {
  /**
   * 1. Create a customer reservation with double availability validation
   */
  async createBooking(payload: CreateBookingPayload): Promise<ApiResponse<BookingItem>> {
    const headers: Record<string, string> = {};
    if (payload.idempotencyKey) {
      headers['Idempotency-Key'] = payload.idempotencyKey;
    }
    return apiClient.post<BookingItem>('/bookings', payload, { headers });
  },

  /**
   * 2. Fetch customer bookings with upcoming / past filters
   */
  async getCustomerBookings(filters?: BookingFilters): Promise<ApiResponse<BookingItem[]>> {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters?.timeFilter) params.append('timeFilter', filters.timeFilter);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<BookingItem[]>(`/customer/bookings${qs}`);
  },

  /**
   * 3. Fetch organiser bookings with full filtering and search
   */
  async getOrganiserBookings(filters?: BookingFilters): Promise<ApiResponse<BookingItem[]>> {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters?.timeFilter) params.append('timeFilter', filters.timeFilter);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.serviceId) params.append('serviceId', filters.serviceId);
    if (filters?.resourceId) params.append('resourceId', filters.resourceId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<BookingItem[]>(`/organiser/bookings${qs}`);
  },

  /**
   * 4. Fetch platform-wide admin bookings
   */
  async getAdminBookings(filters?: BookingFilters): Promise<ApiResponse<BookingItem[]>> {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters?.timeFilter) params.append('timeFilter', filters.timeFilter);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.serviceId) params.append('serviceId', filters.serviceId);
    if (filters?.resourceId) params.append('resourceId', filters.resourceId);
    if (filters?.organiserId) params.append('organiserId', filters.organiserId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<BookingItem[]>(`/admin/bookings${qs}`);
  },

  /**
   * 5. Fetch detailed booking by ID or reference code
   */
  async getBookingDetails(idOrReference: string): Promise<ApiResponse<BookingItem>> {
    return apiClient.get<BookingItem>(`/bookings/${idOrReference}`);
  },

  /**
   * 6. Confirm a pending reservation (Organiser / Admin)
   */
  async confirmBooking(
    idOrReference: string,
    options?: { notes?: string; markPaymentPaid?: boolean }
  ): Promise<ApiResponse<BookingItem>> {
    return apiClient.patch<BookingItem>(`/organiser/bookings/${idOrReference}/confirm`, options || {});
  },

  /**
   * 7. Cancel booking and release slot (Customer / Organiser / Admin)
   */
  async cancelBooking(idOrReference: string, reason?: string): Promise<ApiResponse<BookingItem>> {
    return apiClient.patch<BookingItem>(`/bookings/${idOrReference}/cancel`, { reason });
  },

  /**
   * 8. Fetch intake questions for a service
   */
  async getServiceQuestions(serviceId: string): Promise<ApiResponse<ServiceQuestionItem[]>> {
    return apiClient.get<ServiceQuestionItem[]>(`/services/${serviceId}/questions`);
  },

  /**
   * 9. Fetch resources/providers assigned to a service
   */
  async getServiceResources(serviceId: string): Promise<ApiResponse<ResourceItem[]>> {
    return apiClient.get<ResourceItem[]>(`/services/${serviceId}/resources`);
  },

  /**
   * 10. Query real-time available appointment slots from existing Slot Engine
   */
  async getServiceAvailability(
    serviceId: string,
    params: {
      startDate: string;
      endDate: string;
      resourceId?: string;
      attendees?: number;
      slotStep?: number;
      shareToken?: string;
    }
  ): Promise<ApiResponse<ServiceAvailabilityData>> {
    const query = new URLSearchParams({
      startDate: params.startDate,
      endDate: params.endDate,
    });
    if (params.resourceId) query.append('resourceId', params.resourceId);
    if (params.attendees) query.append('attendees', String(params.attendees));
    if (params.slotStep) query.append('slotStep', String(params.slotStep));
    if (params.shareToken) query.append('shareToken', params.shareToken);

    return apiClient.get<ServiceAvailabilityData>(
      `/availability/services/${serviceId}?${query.toString()}`
    );
  },
};
