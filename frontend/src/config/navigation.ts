/**
 * ReservePulse Centralized Navigation Configuration
 * Defines role-based navigation trees, route paths, icons, and metadata
 */

export type AppRole = 'public' | 'customer' | 'organiser' | 'admin';

export type NavIconName =
  | 'dashboard'
  | 'services'
  | 'calendar'
  | 'bookings'
  | 'resources'
  | 'analytics'
  | 'users'
  | 'profile'
  | 'settings'
  | 'pulse'
  | 'palette'
  | 'home';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: NavIconName;
  description?: string;
  badge?: string;
  badgeVariant?: 'emerald' | 'blue' | 'amber' | 'rose' | 'purple' | 'slate';
  category?: 'Core' | 'Management' | 'Platform' | 'Account';
}

export interface RoleConfig {
  id: AppRole;
  label: string;
  tagline: string;
  defaultPath: string;
  badgeColor: 'emerald' | 'blue' | 'amber' | 'purple';
  userGreeting: string;
  avatarSeed: string;
}

export const ROLE_CONFIGS: Record<AppRole, RoleConfig> = {
  public: {
    id: 'public',
    label: 'Public Visitor',
    tagline: 'Explore available reservation resources & schedules',
    defaultPath: '/',
    badgeColor: 'slate' as unknown as 'blue',
    userGreeting: 'Welcome, Guest',
    avatarSeed: 'guest',
  },
  customer: {
    id: 'customer',
    label: 'Customer Portal',
    tagline: 'Manage personal reservations and explore bookable slots',
    defaultPath: '/customer/dashboard',
    badgeColor: 'blue',
    userGreeting: 'Alex Morgan (Customer)',
    avatarSeed: 'alex',
  },
  organiser: {
    id: 'organiser',
    label: 'Organiser Workspace',
    tagline: 'Manage schedules, slot allocations, and capacity queues',
    defaultPath: '/organiser/dashboard',
    badgeColor: 'emerald',
    userGreeting: 'Jordan Vance (Organiser)',
    avatarSeed: 'jordan',
  },
  admin: {
    id: 'admin',
    label: 'Admin Console',
    tagline: 'Global platform governance, fleet telemetry & user roles',
    defaultPath: '/admin/dashboard',
    badgeColor: 'purple',
    userGreeting: 'Morgan Reed (Admin)',
    avatarSeed: 'morgan',
  },
};

export const ROLE_NAVIGATION: Record<AppRole, NavItem[]> = {
  public: [
    {
      id: 'pub-home',
      label: 'Home & Pulse',
      path: '/',
      icon: 'home',
      category: 'Core',
    },
    {
      id: 'pub-services',
      label: 'Explore Services',
      path: '/services',
      icon: 'services',
      badge: 'Live',
      badgeVariant: 'emerald',
      category: 'Core',
    },
    {
      id: 'pub-calendar',
      label: 'Public Calendar',
      path: '/calendar',
      icon: 'calendar',
      category: 'Core',
    },
    {
      id: 'pub-design',
      label: 'Design System',
      path: '/design-system',
      icon: 'palette',
      badge: '1.0',
      badgeVariant: 'purple',
      category: 'Platform',
    },
  ],

  customer: [
    {
      id: 'cust-dash',
      label: 'Dashboard',
      path: '/customer/dashboard',
      icon: 'dashboard',
      category: 'Core',
    },
    {
      id: 'cust-services',
      label: 'Book Services',
      path: '/customer/services',
      icon: 'services',
      category: 'Core',
    },
    {
      id: 'cust-calendar',
      label: 'Reservation Calendar',
      path: '/customer/calendar',
      icon: 'calendar',
      category: 'Core',
    },
    {
      id: 'cust-bookings',
      label: 'My Bookings',
      path: '/customer/bookings',
      icon: 'bookings',
      badge: '3 Active',
      badgeVariant: 'emerald',
      category: 'Core',
    },
    {
      id: 'cust-profile',
      label: 'Profile',
      path: '/customer/profile',
      icon: 'profile',
      category: 'Account',
    },
    {
      id: 'cust-settings',
      label: 'Settings',
      path: '/customer/settings',
      icon: 'settings',
      category: 'Account',
    },
  ],

  organiser: [
    {
      id: 'org-dash',
      label: 'Dashboard',
      path: '/organiser/dashboard',
      icon: 'dashboard',
      category: 'Core',
    },
    {
      id: 'org-services',
      label: 'Services Catalog',
      path: '/organiser/services',
      icon: 'services',
      category: 'Management',
    },
    {
      id: 'org-calendar',
      label: 'Master Schedule',
      path: '/organiser/calendar',
      icon: 'calendar',
      category: 'Management',
    },
    {
      id: 'org-bookings',
      label: 'Bookings Queue',
      path: '/organiser/bookings',
      icon: 'bookings',
      badge: '5 Pending',
      badgeVariant: 'amber',
      category: 'Management',
    },
    {
      id: 'org-resources',
      label: 'Resource Allocation',
      path: '/organiser/resources',
      icon: 'resources',
      category: 'Management',
    },
    {
      id: 'org-analytics',
      label: 'Capacity Analytics',
      path: '/organiser/analytics',
      icon: 'analytics',
      category: 'Management',
    },
    {
      id: 'org-profile',
      label: 'Profile',
      path: '/organiser/profile',
      icon: 'profile',
      category: 'Account',
    },
    {
      id: 'org-settings',
      label: 'Workspace Settings',
      path: '/organiser/settings',
      icon: 'settings',
      category: 'Account',
    },
  ],

  admin: [
    {
      id: 'adm-dash',
      label: 'Admin Dashboard',
      path: '/admin/dashboard',
      icon: 'dashboard',
      category: 'Core',
    },
    {
      id: 'adm-users',
      label: 'Users & Roles',
      path: '/admin/users',
      icon: 'users',
      badge: '18 Active',
      badgeVariant: 'blue',
      category: 'Management',
    },
    {
      id: 'adm-resources',
      label: 'Resource Fleet',
      path: '/admin/resources',
      icon: 'resources',
      category: 'Management',
    },
    {
      id: 'adm-bookings',
      label: 'Platform Bookings',
      path: '/admin/bookings',
      icon: 'bookings',
      category: 'Management',
    },
    {
      id: 'adm-services',
      label: 'All Services',
      path: '/admin/services',
      icon: 'services',
      category: 'Management',
    },
    {
      id: 'adm-calendar',
      label: 'Global Calendar',
      path: '/admin/calendar',
      icon: 'calendar',
      category: 'Management',
    },
    {
      id: 'adm-analytics',
      label: 'System Analytics',
      path: '/admin/analytics',
      icon: 'analytics',
      category: 'Platform',
    },
    {
      id: 'adm-pulse',
      label: 'System Pulse & Health',
      path: '/admin/pulse',
      icon: 'pulse',
      badge: 'Online',
      badgeVariant: 'emerald',
      category: 'Platform',
    },
    {
      id: 'adm-design',
      label: 'Design System',
      path: '/admin/design-system',
      icon: 'palette',
      category: 'Platform',
    },
    {
      id: 'adm-settings',
      label: 'Platform Settings',
      path: '/admin/settings',
      icon: 'settings',
      category: 'Platform',
    },
    {
      id: 'adm-profile',
      label: 'Admin Profile',
      path: '/admin/profile',
      icon: 'profile',
      category: 'Account',
    },
  ],
};
