import { useState, useEffect, useCallback } from 'react';
import { HealthService } from '../services/health.service';
import type { SystemStatus, ServiceConnectionState } from '../types';

export interface UseHealthCheckReturn {
  status: SystemStatus | null;
  state: ServiceConnectionState;
  error: string | null;
  refetch: () => Promise<void>;
  lastChecked: Date | null;
}

export const useHealthCheck = (pollingIntervalMs = 0): UseHealthCheckReturn => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [state, setState] = useState<ServiceConnectionState>('checking');
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchHealth = useCallback(async () => {
    setState('checking');
    try {
      const response = await HealthService.checkHealth();
      if (response.data) {
        setStatus(response.data);
        setState('connected');
        setError(null);
      } else {
        setState('disconnected');
        setError('No data received from backend');
      }
    } catch (err: unknown) {
      setState('disconnected');
      setError(err instanceof Error ? err.message : 'Unable to connect to backend');
    } finally {
      setLastChecked(new Date());
    }
  }, []);

  useEffect(() => {
    fetchHealth();

    if (pollingIntervalMs > 0) {
      const interval = setInterval(fetchHealth, pollingIntervalMs);
      return () => clearInterval(interval);
    }
  }, [fetchHealth, pollingIntervalMs]);

  return {
    status,
    state,
    error,
    refetch: fetchHealth,
    lastChecked,
  };
};
