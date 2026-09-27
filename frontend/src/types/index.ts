/**
 * ReservePulse Core Frontend Types
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: any;
  error?: {
    code: string;
    details?: unknown;
  };
  timestamp: string;
}

export interface DatabaseStatus {
  status: string;
  latencyMs: number;
}

export interface SystemStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptimeSeconds: number;
  timestamp: string;
  environment: string;
  database: DatabaseStatus;
}

export type ServiceConnectionState = 'checking' | 'connected' | 'disconnected';

export interface ResourceSlot {
  id: string;
  resourceName: string;
  category: 'Compute' | 'Workspace' | 'Consultation';
  capacity: string;
  timeSlot: string;
  status: 'available' | 'locked' | 'reserved';
  reservedBy?: string;
}

export interface EndpointTestResult {
  endpoint: string;
  method: string;
  statusCode: number;
  durationMs: number;
  data: unknown;
  timestamp: string;
}
