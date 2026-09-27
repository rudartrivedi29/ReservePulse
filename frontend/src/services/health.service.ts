import { apiClient } from './api';
import { API_ENDPOINTS } from '../utils/constants';
import type { ApiResponse, SystemStatus } from '../types';

export const HealthService = {
  async checkHealth(): Promise<ApiResponse<SystemStatus>> {
    return apiClient.get<SystemStatus>(API_ENDPOINTS.HEALTH);
  },

  async ping(): Promise<ApiResponse<{ ping: string }>> {
    return apiClient.get<{ ping: string }>(API_ENDPOINTS.PING);
  },
};
