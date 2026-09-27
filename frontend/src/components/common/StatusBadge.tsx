import React from 'react';
import type { ServiceConnectionState } from '../../types';

interface StatusBadgeProps {
  state: ServiceConnectionState;
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ state, label }) => {
  const getBadgeConfig = () => {
    switch (state) {
      case 'connected':
        return {
          text: label || 'Operational',
          className: 'badge-success',
          dotClass: 'dot-success',
        };
      case 'disconnected':
        return {
          text: label || 'Disconnected',
          className: 'badge-danger',
          dotClass: 'dot-danger',
        };
      case 'checking':
      default:
        return {
          text: label || 'Checking...',
          className: 'badge-warning',
          dotClass: 'dot-warning',
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <span className={`status-badge ${config.className}`}>
      <span className={`status-dot ${config.dotClass}`} />
      <span className="status-text">{config.text}</span>
    </span>
  );
};
