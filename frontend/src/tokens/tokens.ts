/**
 * ReservePulse Design System Tokens
 * Comprehensive design tokens for modern booking SaaS interface
 */

export const colors = {
  brand: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669', // Primary brand color
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
    950: '#022c22',
  },
  mint: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',
    600: '#0d9488',
    700: '#0f766e',
  },
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
  status: {
    success: {
      light: '#ecfdf5',
      border: '#a7f3d0',
      text: '#065f46',
      main: '#10b981',
      dark: '#047857',
    },
    warning: {
      light: '#fffbeb',
      border: '#fde68a',
      text: '#92400e',
      main: '#f59e0b',
      dark: '#d97706',
    },
    danger: {
      light: '#fff1f2',
      border: '#fecdd3',
      text: '#9f1239',
      main: '#f43f5e',
      dark: '#e11d48',
    },
    info: {
      light: '#f0f9ff',
      border: '#bae6fd',
      text: '#075985',
      main: '#0ea5e9',
      dark: '#0284c7',
    },
    purple: {
      light: '#faf5ff',
      border: '#e9d5ff',
      text: '#6b21a8',
      main: '#a855f7',
      dark: '#7e22ce',
    },
  },
  surface: {
    canvas: '#f4fbf6',
    white: '#ffffff',
    glass: 'rgba(255, 255, 255, 0.88)',
    glassCard: 'rgba(255, 255, 255, 0.94)',
    glassCardHover: 'rgba(255, 255, 255, 0.98)',
    muted: '#f8fafc',
  },
} as const;

export const typography = {
  fonts: {
    sans: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },
  sizes: {
    xs: { fontSize: '0.75rem', lineHeight: '1rem' },
    sm: { fontSize: '0.875rem', lineHeight: '1.25rem' },
    base: { fontSize: '1rem', lineHeight: '1.5rem' },
    lg: { fontSize: '1.125rem', lineHeight: '1.75rem' },
    xl: { fontSize: '1.25rem', lineHeight: '1.75rem' },
    '2xl': { fontSize: '1.5rem', lineHeight: '2rem' },
    '3xl': { fontSize: '1.875rem', lineHeight: '2.25rem' },
    '4xl': { fontSize: '2.25rem', lineHeight: '2.5rem' },
  },
  weights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
} as const;

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
  glass: '0 10px 30px -4px rgba(5, 150, 105, 0.08), 0 2px 8px 0 rgba(15, 23, 42, 0.03), inset 0 1px 1px 0 rgba(255, 255, 255, 0.9)',
  glassHover: '0 18px 36px -4px rgba(5, 150, 105, 0.14), 0 4px 14px 0 rgba(15, 23, 42, 0.05), inset 0 1px 2px 0 rgba(255, 255, 255, 1)',
  glow: '0 0 22px -3px rgba(16, 185, 129, 0.4)',
  glowDanger: '0 0 22px -3px rgba(244, 63, 94, 0.35)',
} as const;

export const radii = {
  xs: '0.25rem',
  sm: '0.375rem',
  md: '0.625rem',
  lg: '0.875rem',
  xl: '1.125rem',
  '2xl': '1.5rem',
  full: '9999px',
} as const;

export const transitions = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: '400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

export const tokens = {
  colors,
  typography,
  shadows,
  radii,
  transitions,
};

export default tokens;
