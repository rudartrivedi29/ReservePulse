import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHealthCheck } from '../hooks/useHealthCheck';
import { LivePulseCard } from '../components/LivePulseCard';
import { ArchitectureExplorer } from '../components/ArchitectureExplorer';
import { ApiPlayground } from '../components/ApiPlayground';
import { ReservationSimulator } from '../components/ReservationSimulator';
import { DesignSystemShowcase } from '../components/DesignSystemShowcase';
import type { SystemStatus, ServiceConnectionState } from '../types';

export interface HomePageProps {
  status?: SystemStatus | null;
  state?: ServiceConnectionState;
  error?: string | null;
  onRefresh?: () => Promise<void>;
  lastChecked?: Date | null;
  activeView?: 'system' | 'design-system';
  onViewChange?: (view: 'system' | 'design-system') => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  status: propStatus,
  state: propState,
  error: propError,
  onRefresh: propOnRefresh,
  lastChecked: propLastChecked,
  activeView: propActiveView,
  onViewChange: propOnViewChange,
}) => {
  const health = useHealthCheck();
  const navigate = useNavigate();

  const status = propStatus !== undefined ? propStatus : health.status;
  const state = propState !== undefined ? propState : health.state;
  const error = propError !== undefined ? propError : health.error;
  const lastChecked = propLastChecked !== undefined ? propLastChecked : health.lastChecked;

  const [localActiveView, setLocalActiveView] = useState<'system' | 'design-system'>('system');
  const activeView = propActiveView !== undefined ? propActiveView : localActiveView;
  const handleViewChange = propOnViewChange || setLocalActiveView;

  const [isPinging, setIsPinging] = useState(false);

  const handleManualPing = async () => {
    setIsPinging(true);
    if (propOnRefresh) {
      await propOnRefresh();
    } else {
      await health.refetch();
    }
    setTimeout(() => setIsPinging(false), 500);
  };

  return (
    <div className="homepage-container">
      {/* View Switcher Top Bar */}
      <div className="flex items-center justify-center my-4">
        <div className="inline-flex p-1 rounded-2xl bg-white/80 backdrop-blur-md border border-emerald-200/80 shadow-sm">
          <button
            type="button"
            onClick={() => handleViewChange('system')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeView === 'system'
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md shadow-emerald-600/25'
                : 'text-slate-600 hover:text-emerald-800'
            }`}
          >
            <span>⚡</span>
            <span>Architecture &amp; System Pulse</span>
          </button>

          <button
            type="button"
            onClick={() => handleViewChange('design-system')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeView === 'design-system'
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md shadow-emerald-600/25'
                : 'text-slate-600 hover:text-emerald-800'
            }`}
          >
            <span>🎨</span>
            <span>Design System Primitives</span>
          </button>
        </div>
      </div>

      {activeView === 'design-system' ? (
        /* ReservePulse Frontend Design System Showcase */
        <DesignSystemShowcase />
      ) : (
        /* Foundation Architecture & Pulse View from Prompt 01 */
        <>
          {/* Hero Section */}
          <section className="hero-pulse-section" id="hero">
            <div className="hero-pill-badge">
              <span className="pill-dot-live" />
              <span>ReservePulse v0.1.0 Foundation Architecture</span>
            </div>

            <h1 className="hero-main-title">
              High-Resilience Resource &amp; <br />
              <span className="emerald-gradient-text">Reservation Orchestration</span>
            </h1>

            <p className="hero-main-desc">
              A decoupled, developer-friendly multi-tier architecture engineered with React 19, Express, 
              TypeScript, and versioned database migrations. Built from the ground up for high concurrency, 
              zero collision conflicts, and independent deployment.
            </p>

            <div className="hero-cta-group">
              <button
                type="button"
                onClick={() => navigate('/services')}
                className="hero-btn-primary"
              >
                <span>🚀</span>
                Browse Services
              </button>

              <button
                type="button"
                onClick={() => handleViewChange('design-system')}
                className="hero-btn-secondary"
              >
                <span>🎨</span>
                Design System
              </button>

              <a href="#pulse" className="hero-btn-glass">
                System Pulse Monitor
              </a>
            </div>
          </section>

          {/* 1. Live System Pulse Heartbeat Monitor */}
          <LivePulseCard
            status={status}
            state={state}
            error={error}
            onRefresh={handleManualPing}
            lastChecked={lastChecked}
            isPinging={isPinging}
          />

          {/* 2. Decoupled Architecture Topology */}
          <ArchitectureExplorer />

          {/* 3. Interactive API Playground */}
          <ApiPlayground />

          {/* 4. Concurrency Locking Simulator */}
          <ReservationSimulator />
        </>
      )}
    </div>
  );
};
