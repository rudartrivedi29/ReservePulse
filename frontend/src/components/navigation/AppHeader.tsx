import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui';
import { ROLE_CONFIGS, type AppRole } from '../../config/navigation';

export interface AppHeaderProps {
  onOpenMobile: () => void;
  role: AppRole;
  isSidebarCollapsed?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onOpenMobile,
  role,
}) => {

  const { user, switchRole, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const roleConfig = ROLE_CONFIGS[role];

  // Derive breadcrumbs from path
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbTitle =
    pathSegments.length > 0
      ? pathSegments[pathSegments.length - 1].replace(/-/g, ' ')
      : 'Overview';

  const handleRoleSelect = (targetRole: AppRole) => {
    switchRole(targetRole);
    navigate(ROLE_CONFIGS[targetRole].defaultPath);
    setShowRoleDropdown(false);
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8 bg-white/85 backdrop-blur-md border-b border-slate-200/80 font-sans transition-all">
      {/* Left: Mobile hamburger & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobile}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Open mobile menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        {/* Breadcrumb Indicator */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-400 capitalize hidden sm:inline">
            {roleConfig.label}
          </span>
          <span className="text-slate-300 hidden sm:inline">/</span>
          <h1 className="font-extrabold text-slate-800 tracking-tight capitalize text-sm sm:text-base">
            {breadcrumbTitle}
          </h1>
        </div>
      </div>

      {/* Middle: Quick Search (Desktop) */}
      <div className="hidden md:flex items-center max-w-xs w-full mx-4">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search slots, bookings, resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50/80 border border-slate-200/90 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* Right: Actions, Role Pill & User Controls */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Role-Aware Portal Switcher: Admins can jump all portals; other roles see their verified role pill */}
        {user.role === 'admin' ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-purple-50/90 hover:bg-purple-100/80 text-purple-800 border border-purple-200/80 transition-all cursor-pointer shadow-2xs"
              title="Admin Portal Switcher"
            >
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              <span className="hidden sm:inline">Workspace:</span>
              <span className="capitalize">{role}</span>
              <svg className="w-3.5 h-3.5 text-purple-700" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {showRoleDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowRoleDropdown(false)}
                  aria-hidden="true"
                />
                <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-md rounded-2xl border border-purple-100 shadow-xl z-50 p-2 space-y-1">
                  <div className="px-3 py-1.5 border-b border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Admin Portal Navigation
                    </p>
                  </div>
                  {(['admin', 'organiser', 'customer'] as AppRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleRoleSelect(r)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                        role === r
                          ? 'bg-purple-50 text-purple-800 font-bold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span className="capitalize">{ROLE_CONFIGS[r].label}</span>
                      {role === r && (
                        <span className="text-purple-600 font-bold text-xs">✓ Active</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100/90 text-slate-700 border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="capitalize">{roleConfig.label}</span>
          </div>
        )}

        {/* Notifications Icon Button */}
        <button
          type="button"
          onClick={() => (window.location.hash = '#notifications')}
          className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Notifications"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
        </button>

        {/* Role Quick CTA */}
        {role === 'customer' && (
          <Button
            size="xs"
            variant="primary"
            onClick={() => navigate('/customer/services')}
            className="hidden sm:inline-flex"
          >
            + Book Slot
          </Button>
        )}
        {role === 'organiser' && (
          <Button
            size="xs"
            variant="primary"
            onClick={() => navigate('/organiser/calendar')}
            className="hidden sm:inline-flex"
          >
            + New Schedule
          </Button>
        )}
        {role === 'admin' && (
          <Button
            size="xs"
            variant="outline"
            onClick={() => navigate('/admin/pulse')}
            className="hidden sm:inline-flex"
          >
            Pulse Telemetry
          </Button>
        )}

        {/* User Avatar & Session Dropdown */}
        <div className="relative flex items-center gap-2 pl-2 border-l border-slate-200">
          <button
            type="button"
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2 rounded-xl p-1 hover:bg-slate-100 transition-colors cursor-pointer"
            title="User Profile & Session"
          >
            <img
              src={user.avatar}
              alt={user.name}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-500/20"
            />
            <span className="text-xs font-semibold text-slate-700 hidden lg:inline max-w-[120px] truncate">
              {user.name.split(' ')[0]}
            </span>
            <svg className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {showUserDropdown && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUserDropdown(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 top-12 w-56 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl z-50 p-2 space-y-1">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-800 truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user.email || user.organization}</p>
                  <div className="mt-1">
                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {role.toUpperCase()}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    navigate(`/${role}/profile`);
                    setShowUserDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
                >
                  Account Profile
                </button>

                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate('/login');
                    setShowUserDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer flex items-center justify-between"
                >
                  <span>Sign Out</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
