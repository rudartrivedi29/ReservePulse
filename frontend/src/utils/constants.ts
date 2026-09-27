/**
 * Global frontend constants & configuration defaults
 */

export const APP_NAME = 'ReservePulse';
export const APP_DESCRIPTION = 'Modern Resilient Reservation & Resource Orchestration Platform';

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const API_ENDPOINTS = {
  HEALTH: '/health',
  PING: '/health/ping',
} as const;
