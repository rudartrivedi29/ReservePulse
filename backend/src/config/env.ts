import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file (backend directory and/or root directory)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface AppConfig {
  env: string;
  isProduction: boolean;
  isDevelopment: boolean;
  port: number;
  apiPrefix: string;
  corsOrigin: string;
  database: {
    url: string;
    poolMax: number;
    idleTimeoutMs: number;
    connectionTimeoutMs: number;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  otp: {
    expiryMinutes: number;
  };
  logLevel: string;
}

const env = process.env.NODE_ENV || process.env.BACKEND_NODE_ENV || 'development';

export const config: AppConfig = {
  env,
  isProduction: env === 'production',
  isDevelopment: env === 'development',
  port: Number(process.env.PORT || process.env.BACKEND_PORT) || 5000,
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  corsOrigin: process.env.CORS_ORIGIN || process.env.BACKEND_CORS_ORIGIN || 'http://localhost:5173',
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/reservepulse_dev',
    poolMax: Number(process.env.DB_POOL_MAX) || 20,
    idleTimeoutMs: Number(process.env.DB_IDLE_TIMEOUT_MS) || 30000,
    connectionTimeoutMs: Number(process.env.DB_CONNECTION_TIMEOUT_MS) || 5000,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'reservepulse_super_secret_jwt_key_2026_dev!',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  otp: {
    expiryMinutes: Number(process.env.OTP_EXPIRY_MINUTES) || 10,
  },
  logLevel: process.env.LOG_LEVEL || 'debug',
};
