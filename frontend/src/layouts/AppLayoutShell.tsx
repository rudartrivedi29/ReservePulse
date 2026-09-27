import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/navigation/Sidebar';
import { AppHeader } from '../components/navigation/AppHeader';
import type { AppRole } from '../config/navigation';

export interface AppLayoutShellProps {
  role: AppRole;
  children?: React.ReactNode;
}

export const AppLayoutShell: React.FC<AppLayoutShellProps> = ({ role, children }) => {
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans flex text-slate-800">
      {/* Background Soft Refraction Mesh */}
      <div className="fixed inset-0 pointer-events-none opacity-40 z-0">
        <div className="ambient-blob blob-top-left" aria-hidden="true" />
        <div className="ambient-blob blob-top-right" aria-hidden="true" />
      </div>

      {/* Responsive Centralized Sidebar */}
      <Sidebar
        role={role}
        isOpenMobile={isOpenMobile}
        onCloseMobile={() => setIsOpenMobile(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      {/* Main Content Area */}
      <div
        className={`
          flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out relative z-10
          ${isCollapsed ? 'lg:pl-20' : 'lg:pl-64'}
        `.trim()}
      >
        {/* Sticky App Header */}
        <AppHeader
          role={role}
          onOpenMobile={() => setIsOpenMobile(true)}
          isSidebarCollapsed={isCollapsed}
        />

        {/* Page Content Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-200">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};
