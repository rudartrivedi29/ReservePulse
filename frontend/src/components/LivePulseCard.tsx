import React, { useState } from 'react';
import type { SystemStatus, ServiceConnectionState } from '../types';

interface LivePulseCardProps {
  status: SystemStatus | null;
  state: ServiceConnectionState;
  error: string | null;
  onRefresh: () => void;
  lastChecked: Date | null;
  isPinging: boolean;
}

export const LivePulseCard: React.FC<LivePulseCardProps> = ({
  status,
  state,
  error,
  onRefresh,
  lastChecked,
  isPinging,
}) => {
  const [showJson, setShowJson] = useState(false);

  return (
    <div className="pulse-monitor-glass-card" id="pulse">
      {/* Top Banner Row */}
      <div className="pulse-card-header">
        <div className="pulse-title-group">
          <div className="pulse-icon-ring">
            <span className={`pulse-core ${state === 'connected' ? 'active' : 'offline'}`} />
          </div>
          <div>
            <h2 className="pulse-card-title">Live System Pulse</h2>
            <p className="pulse-card-desc">
              Continuous health monitor connecting React frontend to Express backend
            </p>
          </div>
        </div>

        <div className="pulse-header-actions">
          <button
            type="button"
            className="btn-pulse-action"
            onClick={onRefresh}
            disabled={isPinging}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={isPinging ? 'spin' : ''}>
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            {isPinging ? 'Probing...' : 'Refresh Pulse'}
          </button>
        </div>
      </div>

      {/* Connection Failure Alert */}
      {state === 'disconnected' && (
        <div className="pulse-error-banner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <strong>Backend Unreachable:</strong> {error || 'Ensure backend server is running on port 5000 (`npm run dev:backend`).'}
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="pulse-metrics-grid">
        <div className="metric-glass-pill">
          <span className="metric-tag">Service Status</span>
          <div className="metric-val-row">
            <span className={`status-led ${state === 'connected' ? 'led-green' : 'led-red'}`} />
            <span className="metric-val">
              {state === 'connected' ? 'Healthy & Operational' : 'Offline'}
            </span>
          </div>
        </div>

        <div className="metric-glass-pill">
          <span className="metric-tag">Backend Uptime</span>
          <div className="metric-val-row">
            <span className="metric-val">
              {status ? `${status.uptimeSeconds} seconds` : '--'}
            </span>
          </div>
        </div>

        <div className="metric-glass-pill">
          <span className="metric-tag">Environment</span>
          <div className="metric-val-row">
            <span className="metric-badge-env">
              {status ? status.environment : 'local'}
            </span>
          </div>
        </div>

        <div className="metric-glass-pill">
          <span className="metric-tag">Database Probe</span>
          <div className="metric-val-row">
            <span className="metric-val">
              {status ? `${status.database.status} (${status.database.latencyMs}ms)` : '--'}
            </span>
          </div>
        </div>
      </div>

      {/* Metadata & Collapsible Payload */}
      <div className="pulse-card-footer">
        <div className="pulse-meta-text">
          <span>Target: <code>http://localhost:5000/api/v1/health</code></span>
          {lastChecked && (
            <span>Verified: {lastChecked.toLocaleTimeString()}</span>
          )}
        </div>

        <button
          type="button"
          className="btn-toggle-json"
          onClick={() => setShowJson(!showJson)}
        >
          {showJson ? 'Hide Raw Response' : 'Inspect JSON Response'}
        </button>
      </div>

      {showJson && status && (
        <div className="pulse-json-drawer">
          <pre>{JSON.stringify(status, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};
