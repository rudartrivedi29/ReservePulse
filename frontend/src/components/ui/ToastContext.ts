import { createContext, useContext } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, 'id'>) => string;
  dismissToast: (id: string) => void;
  toast: {
    success: (title: string, description?: string, options?: Partial<ToastItem>) => string;
    error: (title: string, description?: string, options?: Partial<ToastItem>) => string;
    warning: (title: string, description?: string, options?: Partial<ToastItem>) => string;
    info: (title: string, description?: string, options?: Partial<ToastItem>) => string;
    loading: (title: string, description?: string, options?: Partial<ToastItem>) => string;
  };
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
