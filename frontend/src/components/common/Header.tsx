import React from 'react';
import { StatusBadge } from './StatusBadge';
import type { ServiceConnectionState } from '../../types';

interface HeaderProps {
  backendState: ServiceConnectionState;
  onRefreshHealth: () => void;
  isPinging: boolean;
  activeView?: 'system' | 'design-system';
  onViewChange?: (view: 'system' | 'design-system') => void;
}

export const Header: React.FC<HeaderProps> = ({
  backendState,
  onRefreshHealth,
  isPinging,
  activeView = 'design-system',
  onViewChange,
}) => {
  return (
    <header className="app-header">
      <div className="header-container">
        {/* Brand Identity */}
        <a
          href="#design-system"
          onClick={() => onViewChange && onViewChange('design-system')}
          className="brand-group"
        >
          <div className="brand-symbol">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#059669"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2v4" />
              <path d="M12 18v4" />
              <path d="M4.93 4.93l2.83 2.83" />
              <path d="M16.24 16.24l2.83 2.83" />
              <path d="M2 12h4" />
              <path d="M18 12h4" />
              <circle cx="12" cy="12" r="5" />
            </svg>
            <span className="pulse-glow-ring" />
          </div>
          <div className="brand-text">
            <div className="brand-name-row">
              <span className="brand-name">ReservePulse</span>
              <span className="version-pill">Design System v1.0</span>
            </div>
            <span className="brand-tagline">Resilient Reservation &amp; Orchestration Engine</span>
          </div>
        </a>

        {/* View Switcher Navigation */}
        <nav className="header-nav">
          <button
            type="button"
            onClick={() => onViewChange && onViewChange('design-system')}
            className={`nav-item flex items-center gap-1.5 cursor-pointer font-bold ${
              activeView === 'design-system' ? 'text-emerald-700 bg-emerald-50/80 rounded-lg px-2.5 py-1' : ''
            }`}
          >
            <span className="text-sm">🎨</span>
            <span>Design System</span>
          </button>

          <button
            type="button"
            onClick={() => onViewChange && onViewChange('system')}
            className={`nav-item flex items-center gap-1.5 cursor-pointer font-bold ${
              activeView === 'system' ? 'text-emerald-700 bg-emerald-50/80 rounded-lg px-2.5 py-1' : ''
            }`}
          >
            <span className="text-sm">⚡</span>
            <span>System Pulse</span>
          </button>

          {activeView === 'system' && (
            <>
              <a href="#pulse" className="nav-item">Pulse</a>
              <a href="#architecture" className="nav-item">Architecture</a>
              <a href="#playground" className="nav-item">Playground</a>
              <a href="#simulator" className="nav-item">Simulator</a>
            </>
          )}
        </nav>

        {/* Actions & Health Badge */}
        <div className="header-actions">
          <button
            type="button"
            className="btn-ping-pulse"
            onClick={onRefreshHealth}
            disabled={isPinging}
            title="Trigger instant probe check to backend"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              className={isPinging ? 'spin' : ''}
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>{isPinging ? 'Pinging...' : 'Pulse Check'}</span>
          </button>

          <StatusBadge
            state={backendState}
            label={backendState === 'connected' ? 'API Online :5000' : 'API Offline'}
          />
        </div>
      </div>
    </header>
  );
};
