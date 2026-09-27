import { apiClient } from './api';

export interface TimelineDataPoint {
  timestamp: string;
  label: string;
  total: number;
  active: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  pending: number;
}

export interface StatusBreakdownItem {
  status: string;
  label: string;
  count: number;
  percentage: number;
}

export interface HourlyDistributionItem {
  hour: number;
  label: string;
  bookingCount: number;
  percentage: number;
}

export interface PeakHoursAnalysis {
  hourlyDistribution: HourlyDistributionItem[];
  peakHour: number;
  peakHourLabel: string;
  peakCount: number;
  busiestWindow: string;
}

export interface ProviderUtilizationItem {
  providerId: string;
  providerName: string;
  providerType: string;
  totalAppointments: number;
  activeAppointments: number;
  cancelledAppointments: number;
  bookedMinutes: number;
  availableMinutes: number;
  utilizationRate: number;
  avgDurationMinutes: number;
}

export interface AnalyticsSummary {
  totalAppointments: number;
  activeAppointments: number;
  confirmedAppointments: number;
  pendingAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  cancellationRate: number;
  totalBookedHours: number;
  avgDurationMinutes: number;
  fleetUtilizationRate: number;
  peakHourLabel: string;
}

export interface AnalyticsMeta {
  timeFilter: string;
  startDate: string;
  endDate: string;
  scopedOrganiserId: string | null;
}

export interface AnalyticsOverviewResult {
  summary: AnalyticsSummary;
  trend: TimelineDataPoint[];
  statusBreakdown: StatusBreakdownItem[];
  peakHours: PeakHoursAnalysis;
  providerUtilization: ProviderUtilizationItem[];
  meta: AnalyticsMeta;
}

export interface AnalyticsQueryParams {
  timeFilter?: 'today' | 'week' | 'month' | 'custom';
  startDate?: string;
  endDate?: string;
  organiserId?: string;
  resourceId?: string;
  serviceId?: string;
}

export const analyticsService = {
  /**
   * Helper: Build query string from parameters
   */
  buildQueryString(params?: AnalyticsQueryParams): string {
    if (!params) return '';
    const search = new URLSearchParams();
    if (params.timeFilter) search.append('timeFilter', params.timeFilter);
    if (params.startDate) search.append('startDate', params.startDate);
    if (params.endDate) search.append('endDate', params.endDate);
    if (params.organiserId) search.append('organiserId', params.organiserId);
    if (params.resourceId) search.append('resourceId', params.resourceId);
    if (params.serviceId) search.append('serviceId', params.serviceId);
    const qs = search.toString();
    return qs ? `?${qs}` : '';
  },

  /**
   * Get full analytics overview (KPIs, trend, status, peak hours, provider utilization)
   */
  async getOverview(params?: AnalyticsQueryParams): Promise<AnalyticsOverviewResult> {
    const qs = this.buildQueryString(params);
    const response = await apiClient.get<AnalyticsOverviewResult>(`/analytics/overview${qs}`);
    if (!response.data) {
      throw new Error(response.message || 'Failed to retrieve analytics overview');
    }
    return response.data;
  },

  /**
   * Get appointment trends and status fulfillment breakdown
   */
  async getAppointments(params?: AnalyticsQueryParams): Promise<{
    summary: AnalyticsSummary;
    trend: TimelineDataPoint[];
    statusBreakdown: StatusBreakdownItem[];
    meta: AnalyticsMeta;
  }> {
    const qs = this.buildQueryString(params);
    const response = await apiClient.get<{
      summary: AnalyticsSummary;
      trend: TimelineDataPoint[];
      statusBreakdown: StatusBreakdownItem[];
      meta: AnalyticsMeta;
    }>(`/analytics/appointments${qs}`);
    if (!response.data) {
      throw new Error(response.message || 'Failed to retrieve appointment analytics');
    }
    return response.data;
  },

  /**
   * Get peak hours distribution and busiest operational windows
   */
  async getPeakHours(params?: AnalyticsQueryParams): Promise<{
    peakHours: PeakHoursAnalysis;
    meta: AnalyticsMeta;
  }> {
    const qs = this.buildQueryString(params);
    const response = await apiClient.get<{
      peakHours: PeakHoursAnalysis;
      meta: AnalyticsMeta;
    }>(`/analytics/peak-hours${qs}`);
    if (!response.data) {
      throw new Error(response.message || 'Failed to retrieve peak hours analytics');
    }
    return response.data;
  },

  /**
   * Get provider and resource capacity utilization
   */
  async getUtilization(params?: AnalyticsQueryParams): Promise<{
    fleetUtilizationRate: number;
    providerUtilization: ProviderUtilizationItem[];
    meta: AnalyticsMeta;
  }> {
    const qs = this.buildQueryString(params);
    const response = await apiClient.get<{
      fleetUtilizationRate: number;
      providerUtilization: ProviderUtilizationItem[];
      meta: AnalyticsMeta;
    }>(`/analytics/utilization${qs}`);
    if (!response.data) {
      throw new Error(response.message || 'Failed to retrieve utilization analytics');
    }
    return response.data;
  },
};
