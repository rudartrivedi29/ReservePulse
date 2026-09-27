import React from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { Footer } from '../components/common/Footer';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui';


interface PublicLayoutProps {
  children?: React.ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  const { isAuthenticated, user, role, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="layout-root min-h-screen flex flex-col font-sans">
      {/* Soft ambient mint & emerald background light blobs */}
      <div className="ambient-blob blob-top-left" aria-hidden="true" />
      <div className="ambient-blob blob-top-right" aria-hidden="true" />
      <div className="ambient-blob blob-bottom-center" aria-hidden="true" />

      {/* Top Public Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-emerald-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand */}
          <NavLink to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-white shrink-0 shadow-md shadow-emerald-600/30">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v4" />
                <path d="M12 18v4" />
                <path d="M4.93 4.93l2.83 2.83" />
                <path d="M16.24 16.24l2.83 2.83" />
                <path d="M2 12h4" />
                <path d="M18 12h4" />
                <circle cx="12" cy="12" r="5" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 tracking-tight text-base">ReservePulse</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                  v0.1.0
                </span>
              </div>
              <span className="text-[11px] text-slate-400 hidden sm:block">Reservation &amp; Orchestration Engine</span>
            </div>
          </NavLink>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-xs font-semibold">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg transition-colors ${
                  isActive ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                }`
              }
            >
              Home &amp; Pulse
            </NavLink>
            <NavLink
              to="/services"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg transition-colors ${
                  isActive ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                }`
              }
            >
              Explore Services
            </NavLink>
            <NavLink
              to="/calendar"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg transition-colors ${
                  isActive ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                }`
              }
            >
              Public Calendar
            </NavLink>
            <NavLink
              to="/design-system"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg transition-colors ${
                  isActive ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                }`
              }
            >
              🎨 Design System
            </NavLink>
          </nav>

          {/* Auth State & Role Portals */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600 hidden sm:inline">
                  Hi, <strong className="text-slate-900">{user.name.split(' ')[0]}</strong>
                </span>
                <Button
                  size="xs"
                  variant="primary"
                  onClick={() => {
                    if (role === 'admin') navigate('/admin/dashboard');
                    else if (role === 'organiser') navigate('/organiser/dashboard');
                    else navigate('/customer/dashboard');
                  }}
                >
                  Dashboard
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => navigate('/login')}
                >
                  Sign In
                </Button>
                <Button
                  size="xs"
                  variant="primary"
                  onClick={() => navigate('/signup')}
                >
                  Get Started
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Public Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children || <Outlet />}
      </main>

      <Footer />
    </div>
  );
};
