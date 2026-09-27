import React from 'react';
import { Header } from '../components/common/Header';
import { Footer } from '../components/common/Footer';
import type { ServiceConnectionState } from '../types';

interface MainLayoutProps {
  children: React.ReactNode;
  backendState: ServiceConnectionState;
  onRefreshHealth: () => void;
  isPinging: boolean;
  activeView?: 'system' | 'design-system';
  onViewChange?: (view: 'system' | 'design-system') => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  backendState,
  onRefreshHealth,
  isPinging,
  activeView = 'design-system',
  onViewChange,
}) => {
  return (
    <div className="layout-root">
      {/* Soft ambient mint & emerald light refraction orbs */}
      <div className="ambient-blob blob-top-left" aria-hidden="true" />
      <div className="ambient-blob blob-top-right" aria-hidden="true" />
      <div className="ambient-blob blob-bottom-center" aria-hidden="true" />

      <Header
        backendState={backendState}
        onRefreshHealth={onRefreshHealth}
        isPinging={isPinging}
        activeView={activeView}
        onViewChange={onViewChange}
      />

      <main className="layout-content">
        {children}
      </main>

      <Footer />
    </div>
  );
};
