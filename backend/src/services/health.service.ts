import { config } from '../config/env';
import { checkDatabaseHealth, DatabaseHealthResult } from '../config/database';

export interface SystemMemoryMetrics {
  rssMb: number;
  heapUsedMb: number;
  heapTotalMb: number;
}

export interface DetailedSystemStatus {
  service: string;
  version: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptimeSeconds: number;
  timestamp: string;
  environment: string;
  nodeVersion: string;
  memory: SystemMemoryMetrics;
  database: DatabaseHealthResult;
}

export class HealthService {
  public static async getSystemStatus(): Promise<DetailedSystemStatus> {
    const dbHealth = await checkDatabaseHealth();
    const memory = process.memoryUsage();

    const status: 'healthy' | 'degraded' = dbHealth.isConnected ? 'healthy' : 'degraded';

    return {
      service: 'ReservePulse Backend API',
      version: '0.1.0',
      status,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      environment: config.env,
      nodeVersion: process.version,
      memory: {
        rssMb: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
        heapUsedMb: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMb: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100,
      },
      database: dbHealth,
    };
  }

  public static async getDatabaseStatus(): Promise<DatabaseHealthResult> {
    return checkDatabaseHealth();
  }
}
