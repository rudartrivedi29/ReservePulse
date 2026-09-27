import { apiClient } from './api';
import type { ApiResponse } from '../types';

export type AppointmentType = 'individual' | 'group' | 'resource_constrained';
export type PaymentSetting = 'free' | 'paid' | 'pay_in_person';
export type ResourceAssignmentMode = 'automatic' | 'manual' | 'any_available' | 'single_resource';

export interface ServiceItem {
  id: string;
  organiserId: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  priceAmount: number;
  priceCurrency: string;
  isActive: boolean;
  isPublished: boolean;
  capacityType: AppointmentType;
  defaultCapacity: number;
  maxAdvanceBookingDays: number;
  minLeadTimeHours: number;
  requiresManualConfirmation: boolean;
  resourceAssignmentMode: ResourceAssignmentMode;
  paymentSetting: PaymentSetting;
  shareToken: string;
  shareUrl?: string;
  previewMode?: boolean;
  previewNotice?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServicePayload {
  name: string;
  description: string;
  category?: string;
  durationMinutes: number;
  capacityType: AppointmentType;
  defaultCapacity: number;
  paymentSetting: PaymentSetting;
  priceAmount?: number;
  priceCurrency?: string;
  requiresManualConfirmation: boolean;
  resourceAssignmentMode: ResourceAssignmentMode;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  maxAdvanceBookingDays?: number;
  minLeadTimeHours?: number;
  isPublished?: boolean;
}

export type UpdateServicePayload = Partial<CreateServicePayload>;

export const serviceClient = {
  /**
   * Fetch services managed by authenticated organiser
   */
  async getOrganiserServices(params?: { category?: string; status?: string }): Promise<ApiResponse<ServiceItem[]>> {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.status) query.append('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiClient.get<ServiceItem[]>(`/organiser/services${qs}`);
  },

  /**
   * Fetch all published public services
   */
  async getPublicServices(): Promise<ApiResponse<ServiceItem[]>> {
    return apiClient.get<ServiceItem[]>('/services');
  },

  /**
   * Fetch service details by ID
   */
  async getServiceById(id: string): Promise<ApiResponse<ServiceItem>> {
    return apiClient.get<ServiceItem>(`/services/${id}`);
  },

  /**
   * Preview unpublished service using secret share token
   */
  async previewByShareToken(shareToken: string): Promise<ApiResponse<ServiceItem>> {
    return apiClient.get<ServiceItem>(`/services/preview/${shareToken}`);
  },

  /**
   * Create a new service (Organiser only)
   */
  async createService(payload: CreateServicePayload): Promise<ApiResponse<ServiceItem>> {
    return apiClient.post<ServiceItem>('/organiser/services', payload);
  },

  /**
   * Update an existing service (Organiser owner only)
   */
  async updateService(id: string, payload: UpdateServicePayload): Promise<ApiResponse<ServiceItem>> {
    return apiClient.put<ServiceItem>(`/organiser/services/${id}`, payload);
  },

  /**
   * Publish service
   */
  async publishService(id: string): Promise<ApiResponse<ServiceItem>> {
    return apiClient.patch<ServiceItem>(`/organiser/services/${id}/publish`);
  },

  /**
   * Unpublish service (sets to draft)
   */
  async unpublishService(id: string): Promise<ApiResponse<ServiceItem>> {
    return apiClient.patch<ServiceItem>(`/organiser/services/${id}/unpublish`);
  },

  /**
   * Regenerate secret preview share token
   */
  async regenerateShareToken(id: string): Promise<ApiResponse<{ shareToken: string; shareUrl: string }>> {
    return apiClient.post<{ shareToken: string; shareUrl: string }>(`/organiser/services/${id}/regenerate-share-link`);
  },

  /**
   * Delete service
   */
  async deleteService(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete<{ message: string }>(`/organiser/services/${id}`);
  },

  /**
   * Fetch currently bookable appointment slots for a service
   */
  async getServiceAvailability(
    serviceId: string,
    params: {
      startDate: string;
      endDate: string;
      resourceId?: string;
      slotStep?: number;
      attendees?: number;
      shareToken?: string;
    }
  ): Promise<ApiResponse<ServiceAvailabilityResponse>> {
    const query = new URLSearchParams();
    query.set('startDate', params.startDate);
    query.set('endDate', params.endDate);
    if (params.resourceId) query.set('resourceId', params.resourceId);
    if (params.slotStep) query.set('slotStep', String(params.slotStep));
    if (params.attendees) query.set('attendees', String(params.attendees));
    if (params.shareToken) query.set('shareToken', params.shareToken);

    return apiClient.get<ServiceAvailabilityResponse>(`/services/${serviceId}/availability?${query.toString()}`);
  },
};

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
  status: string;
}

export interface DayAvailability {
  date: string;
  dayOfWeek: number;
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
