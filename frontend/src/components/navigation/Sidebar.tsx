import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { NavIcon } from './NavIcon';
import { Badge } from '../ui';
import { ROLE_NAVIGATION, ROLE_CONFIGS, type AppRole } from '../../config/navigation';
import { useAuth } from '../../context/AuthContext';

export interface SidebarProps {
  role: AppRole;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  role,
  isOpenMobile,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { user, switchRole, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = ROLE_NAVIGATION[role] || [];
  const roleConfig = ROLE_CONFIGS[role];

  // Group items by category
  const categories = Array.from(new Set(navItems.map((item) => item.category || 'General')));

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as AppRole;
    switchRole(newRole);
    navigate(ROLE_CONFIGS[newRole].defaultPath);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          fixed top-0 bottom-0 left-0 z-50 flex flex-col
          bg-white/95 backdrop-blur-xl border-r border-slate-200/90 shadow-lg lg:shadow-none
          transition-all duration-300 ease-in-out font-sans
          ${isCollapsed ? 'w-20' : 'w-64'}
          ${isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `.trim()}
      >
        {/* Brand & Workspace Identity */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <NavLink
            to={roleConfig.defaultPath}
            onClick={onCloseMobile}
            className="flex items-center gap-3 overflow-hidden"
          >
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

            {!isCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm text-slate-900 tracking-tight">ReservePulse</span>
                  <Badge variant={roleConfig.badgeColor} size="xs" pill={false}>
                    {role.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-400 truncate">{roleConfig.label}</p>
              </div>
            )}
          </NavLink>

          {/* Desktop Collapse Toggle / Mobile Close */}
          <div className="flex items-center">
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d={isCollapsed ? 'M13 5l7 7-7 7M5 5l7 7-7 7' : 'M11 19l-7-7 7-7m8 14l-7-7 7-7'}
                  />
                </svg>
              </button>
            )}

            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              aria-label="Close sidebar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation Categories & Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin">
          {categories.map((category) => {
            const items = navItems.filter((i) => (i.category || 'General') === category);
            if (items.length === 0) return null;

            return (
              <div key={category} className="space-y-1">
                {!isCollapsed && (
                  <h4 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {category}
                  </h4>
                )}

                <div className="space-y-0.5">
                  {items.map((item) => (
                    <NavLink
                      key={item.id}
                      to={item.path}
                      onClick={onCloseMobile}
                      className={({ isActive }) => `
                        flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold tracking-tight transition-all duration-150 group
                        ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/80 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                        }
                        ${isCollapsed ? 'justify-center px-2' : ''}
                      `.trim()}
                      title={isCollapsed ? item.label : undefined}
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={`shrink-0 transition-colors ${
                              isActive ? 'text-emerald-700' : 'text-slate-400 group-hover:text-slate-700'
                            }`}
                          >
                            <NavIcon name={item.icon} className="w-4 h-4" />
                          </span>

                          {!isCollapsed && (
                            <span className="flex-1 truncate">{item.label}</span>
                          )}

                          {!isCollapsed && item.badge && (
                            <Badge
                              variant={item.badgeVariant || 'emerald'}
                              size="xs"
                              className="ml-auto"
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom User Profile & Role-Aware Controls */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/70">
          {!isCollapsed ? (
            <div className="space-y-2.5">
              {/* Role-Aware Portal Switcher (Admins can switch all portals, others see current authorized workspace) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {user.role === 'admin' ? 'Workspace Portal:' : 'Active Role:'}
                  </span>
                  <Badge variant={roleConfig.badgeColor} size="xs">
                    {user.role ? user.role.toUpperCase() : role.toUpperCase()}
                  </Badge>
                </div>

                {user.role === 'admin' ? (
                  <div className="relative">
                    <select
                      value={role}
                      onChange={handleRoleChange}
                      className="w-full text-xs bg-white border border-slate-200 text-slate-800 rounded-lg px-2.5 py-1.5 pr-7 font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
                    >
                      <option value="admin">⚡ Admin Console</option>
                      <option value="organiser">📅 Organiser Workspace</option>
                      <option value="customer">👤 Customer Portal</option>
                    </select>
                    <div className="absolute right-2 top-2 pointer-events-none text-slate-400">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>{roleConfig.label}</span>
                    <span className="text-emerald-600 text-[11px] font-bold">✓ Active</span>
                  </div>
                )}
              </div>

              {/* User Identity Chip & Sign Out */}
              <div className="pt-1.5 border-t border-slate-200/60">
                <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-white transition-colors">
                  <NavLink
                    to={role === 'public' ? '/' : `/${role}/profile`}
                    onClick={onCloseMobile}
                    className="flex items-center gap-2.5 min-w-0 flex-1 group"
                  >
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-8 h-8 rounded-lg object-cover border border-emerald-300 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate group-hover:text-emerald-700">
                        {user.name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{user.email || user.organization}</p>
                    </div>
                  </NavLink>

                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      navigate('/login');
                      onCloseMobile();
                    }}
                    title="Sign Out"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-8 h-8 rounded-lg object-cover border border-emerald-300"
                title={`${user.name} (${role})`}
              />
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="p-1 rounded-md text-slate-400 hover:text-rose-600 cursor-pointer"
                title="Sign Out"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
