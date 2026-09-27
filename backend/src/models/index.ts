/**
 * ReservePulse Core Data Models & Type Definitions
 */

export interface BaseModel {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptimeSeconds: number;
  timestamp: string;
  environment: string;
  database: {
    status: string;
    latencyMs: number;
  };
}

export * from './service.model';
export * from './resource.model';
export * from './schedule.model';
export * from './slot.model';
export * from './question.model';
export * from './booking.model';
