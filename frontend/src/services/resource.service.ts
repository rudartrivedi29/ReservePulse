import { apiClient } from './api';
import type { ApiResponse } from '../types';

export type ResourceType =
  | 'staff'
  | 'room'
  | 'compute'
  | 'equipment'
  | 'pod'
  | 'studio'
  | 'vehicle'
  | 'other';

export type ResourceStatus =
  | 'active'
  | 'inactive'
  | 'operational'
  | 'maintenance'
  | 'decommissioned';

export interface AssignedServiceSummary {
  id: string;
  name: string;
  slug: string;
  category: string;
  durationMinutes: number;
  isRequired: boolean;
  allocationQuantity: number;
}

export interface ResourceItem {
  id: string;
  organiserId: string;
  name: string;
  resourceType: ResourceType;
  description: string;
  location: string;
  capacity: number;
  status: ResourceStatus;
  isActive: boolean;
  assignedServices?: AssignedServiceSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateResourcePayload {
  name: string;
  resourceType: ResourceType;
  description?: string;
  location?: string;
  capacity?: number;
  status?: ResourceStatus;
  serviceIds?: string[];
}

export type UpdateResourcePayload = Partial<CreateResourcePayload>;

export const resourceClient = {
  /**
   * Public: Fetch all active resources
   */
  async getPublicResources(): Promise<ApiResponse<ResourceItem[]>> {
    return apiClient.get<ResourceItem[]>('/resources');
  },

  /**
   * Fetch all resources managed by authenticated organiser
   */
  async getOrganiserResources(params?: {
    type?: string;
    status?: string;
    search?: string;
  }): Promise<ApiResponse<ResourceItem[]>> {
    const query = new URLSearchParams();
    if (params?.type && params.type !== 'all') query.append('type', params.type);
    if (params?.status && params.status !== 'all') query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiClient.get<ResourceItem[]>(`/organiser/resources${qs}`);
  },

  /**
   * Fetch single resource by ID
   */
  async getResourceById(id: string): Promise<ApiResponse<ResourceItem>> {
    return apiClient.get<ResourceItem>(`/organiser/resources/${id}`);
  },

  /**
   * Create a new resource / provider
   */
  async createResource(payload: CreateResourcePayload): Promise<ApiResponse<ResourceItem>> {
    return apiClient.post<ResourceItem>('/organiser/resources', payload);
  },

  /**
   * Update an existing resource
   */
  async updateResource(id: string, payload: UpdateResourcePayload): Promise<ApiResponse<ResourceItem>> {
    return apiClient.put<ResourceItem>(`/organiser/resources/${id}`, payload);
  },

  /**
   * Activate resource
   */
  async activateResource(id: string): Promise<ApiResponse<ResourceItem>> {
    return apiClient.patch<ResourceItem>(`/organiser/resources/${id}/activate`);
  },

  /**
   * Deactivate resource
   */
  async deactivateResource(id: string): Promise<ApiResponse<ResourceItem>> {
    return apiClient.patch<ResourceItem>(`/organiser/resources/${id}/deactivate`);
  },

  /**
   * Delete resource
   */
  async deleteResource(id: string): Promise<ApiResponse<{ id: string }>> {
    return apiClient.delete<{ id: string }>(`/organiser/resources/${id}`);
  },

  /**
   * Get services assigned to this resource
   */
  async getAssignedServices(resourceId: string): Promise<ApiResponse<AssignedServiceSummary[]>> {
    return apiClient.get<AssignedServiceSummary[]>(`/organiser/resources/${resourceId}/services`);
  },

  /**
   * Assign a service to this resource
   */
  async assignToService(
    resourceId: string,
    serviceId: string,
    options?: { isRequired?: boolean; allocationQuantity?: number }
  ): Promise<ApiResponse<AssignedServiceSummary>> {
    return apiClient.post<AssignedServiceSummary>(`/organiser/resources/${resourceId}/services`, {
      serviceId,
      isRequired: options?.isRequired ?? true,
      allocationQuantity: options?.allocationQuantity ?? 1,
    });
  },

  /**
   * Synchronize list of services assigned to resource
   */
  async setAssignedServices(
    resourceId: string,
    serviceIds: string[]
  ): Promise<ApiResponse<AssignedServiceSummary[]>> {
    return apiClient.put<AssignedServiceSummary[]>(`/organiser/resources/${resourceId}/services`, {
      serviceIds,
    });
  },

  /**
   * Unassign service from resource
   */
  async unassignFromService(
    resourceId: string,
    serviceId: string
  ): Promise<ApiResponse<{ resourceId: string; serviceId: string }>> {
    return apiClient.delete<{ resourceId: string; serviceId: string }>(
      `/organiser/resources/${resourceId}/services/${serviceId}`
    );
  },

  /**
   * Public: Get active resources assigned to a service
   */
  async getResourcesForService(serviceId: string): Promise<ApiResponse<ResourceItem[]>> {
    return apiClient.get<ResourceItem[]>(`/resources/service/${serviceId}`);
  },
};
