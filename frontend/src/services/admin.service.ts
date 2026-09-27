import { apiClient } from './api';

export interface AdminUserItem {
  id: string;
  email: string;
  fullName: string;
  role: 'CUSTOMER' | 'ORGANISER' | 'ADMIN';
  phone?: string;
  isActive: boolean;
  isVerified: boolean;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  servicesCount?: number;
  resourcesCount?: number;
  bookingsCount?: number;
}

export interface AdminDashboardStats {
  totalUsers: number;
  totalProviders: number;
  totalAppointments: number;
  userStats: {
    total: number;
    customers: number;
    organisers: number;
    admins: number;
    active: number;
    deactivated: number;
  };
  appointmentStats: {
    total: number;
    pending: number;
    confirmed: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    paymentFailed: number;
  };
  serviceStats: {
    totalServices: number;
    publishedServices: number;
    totalResources: number;
    operationalResources: number;
  };
  recentAppointments: Array<{
    id: string;
    bookingReference: string;
    serviceId: string;
    resourceId: string;
    serviceName?: string;
    resourceName?: string;
    customerName?: string;
    guestName?: string;
    customerEmail?: string;
    guestEmail?: string;
    startTime: string;
    endTime: string;
    status: string;
    totalAmount?: number;
    currency?: string;
  }>;
  recentUsers: AdminUserItem[];
}

export interface ListUsersParams {
  search?: string;
  role?: 'ALL' | 'CUSTOMER' | 'ORGANISER' | 'ADMIN';
  status?: 'all' | 'active' | 'deactivated';
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'name' | 'email' | 'role';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateAdminUserPayload {
  email: string;
  fullName: string;
  role: 'CUSTOMER' | 'ORGANISER' | 'ADMIN';
  password?: string;
  phone?: string;
  isActive?: boolean;
}

export const adminService = {
  /**
   * Fetch platform-wide telemetry, KPIs, user and appointment statistics
   */
  async getDashboardStats(): Promise<AdminDashboardStats> {
    const res = await apiClient.get<AdminDashboardStats>('/admin/stats');
    return res.data!;
  },

  /**
   * Fetch paginated list of users with search and filtering
   */
  async getUsers(params: ListUsersParams = {}): Promise<{
    users: AdminUserItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.role && params.role !== 'ALL') query.append('role', params.role);
    if (params.status && params.status !== 'all') query.append('status', params.status);
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.sortOrder) query.append('sortOrder', params.sortOrder);

    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await apiClient.get<AdminUserItem[]>(`/admin/users${qs}`);
    return {
      users: res.data || [],
      total: (res as any).meta?.total ?? res.data?.length ?? 0,
      page: (res as any).meta?.page ?? 1,
      limit: (res as any).meta?.limit ?? 20,
      totalPages: (res as any).meta?.totalPages ?? 1,
    };
  },

  /**
   * Fetch detailed user profile with their services or appointments
   */
  async getUserDetails(userId: string): Promise<AdminUserItem & {
    services?: any[];
    resources?: any[];
    recentBookings?: any[];
  }> {
    const res = await apiClient.get<AdminUserItem & {
      services?: any[];
      resources?: any[];
      recentBookings?: any[];
    }>(`/admin/users/${userId}`);
    return res.data!;
  },

  /**
   * Activate or deactivate a user account with safety checks
   */
  async updateUserStatus(
    userId: string,
    isActive: boolean,
    reason?: string
  ): Promise<AdminUserItem> {
    const res = await apiClient.patch<AdminUserItem>(`/admin/users/${userId}/status`, {
      isActive,
      reason,
    });
    return res.data!;
  },

  /**
   * Change user role between CUSTOMER, ORGANISER, and ADMIN
   */
  async updateUserRole(
    userId: string,
    role: 'CUSTOMER' | 'ORGANISER' | 'ADMIN'
  ): Promise<AdminUserItem> {
    const res = await apiClient.patch<AdminUserItem>(`/admin/users/${userId}/role`, {
      role,
    });
    return res.data!;
  },

  /**
   * Fetch service providers (organisers)
   */
  async getProviders(params: ListUsersParams = {}): Promise<{
    providers: AdminUserItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.status && params.status !== 'all') query.append('status', params.status);
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());

    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await apiClient.get<AdminUserItem[]>(`/admin/providers${qs}`);
    return {
      providers: res.data || [],
      total: (res as any).meta?.total ?? res.data?.length ?? 0,
      page: (res as any).meta?.page ?? 1,
      limit: (res as any).meta?.limit ?? 20,
      totalPages: (res as any).meta?.totalPages ?? 1,
    };
  },

  /**
   * Provision a new user account directly by admin
   */
  async createUser(payload: CreateAdminUserPayload): Promise<AdminUserItem> {
    const res = await apiClient.post<AdminUserItem>('/admin/users', payload);
    return res.data!;
  },
};
