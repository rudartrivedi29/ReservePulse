import React, { useState, useCallback, useMemo, useId } from 'react';
import {
  ToastContext,
  type ToastItem,

  type ToastType,
  type ToastPosition,
} from './ToastContext';

export type { ToastItem, ToastType, ToastPosition };

const toastConfig: Record<
  ToastType,
  { bg: string; border: string; iconColor: string; icon: React.ReactNode }
> = {
  success: {
    bg: 'bg-white',
    border: 'border-emerald-200/90',
    iconColor: 'text-emerald-600 bg-emerald-50',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  error: {
    bg: 'bg-white',
    border: 'border-rose-200/90',
    iconColor: 'text-rose-600 bg-rose-50',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  warning: {
    bg: 'bg-white',
    border: 'border-amber-200/90',
    iconColor: 'text-amber-600 bg-amber-50',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  info: {
    bg: 'bg-white',
    border: 'border-sky-200/90',
    iconColor: 'text-sky-600 bg-sky-50',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 020 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  loading: {
    bg: 'bg-white',
    border: 'border-emerald-200/90',
    iconColor: 'text-emerald-600 bg-emerald-50',
    icon: (
      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    ),
  },
};

export const ToastProvider: React.FC<{
  children: React.ReactNode;
  position?: ToastPosition;
}> = ({ children, position = 'bottom-right' }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idPrefix = useId();

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (toastData: Omit<ToastItem, 'id'>) => {
      const id = `${idPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const duration = toastData.duration ?? (toastData.type === 'loading' ? 0 : 4500);

      const newToast: ToastItem = {
        ...toastData,
        id,
        duration,
      };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }

      return id;
    },
    [idPrefix, dismissToast]
  );

  const toast = useMemo(
    () => ({
      success: (title: string, description?: string, options?: Partial<ToastItem>) =>
        showToast({ type: 'success', title, description, ...options }),
      error: (title: string, description?: string, options?: Partial<ToastItem>) =>
        showToast({ type: 'error', title, description, ...options }),
      warning: (title: string, description?: string, options?: Partial<ToastItem>) =>
        showToast({ type: 'warning', title, description, ...options }),
      info: (title: string, description?: string, options?: Partial<ToastItem>) =>
        showToast({ type: 'info', title, description, ...options }),
      loading: (title: string, description?: string, options?: Partial<ToastItem>) =>
        showToast({ type: 'loading', title, description, ...options }),
    }),
    [showToast]
  );

  const contextValue = useMemo(
    () => ({ toasts, showToast, dismissToast, toast }),
    [toasts, showToast, dismissToast, toast]
  );

  const positionClasses: Record<ToastPosition, string> = {
    'top-right': 'top-4 right-4 items-end',
    'top-left': 'top-4 left-4 items-start',
    'bottom-right': 'bottom-4 right-4 items-end',
    'bottom-left': 'bottom-4 left-4 items-start',
    'top-center': 'top-4 left-1/2 -translate-x-1/2 items-center',
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {/* Toast viewport container */}
      <div
        className={`fixed z-50 flex flex-col gap-2.5 pointer-events-none p-2 sm:p-4 max-w-md w-full ${positionClasses[position]}`}
      >
        {toasts.map((item) => {
          const cfg = toastConfig[item.type];

          return (
            <div
              key={item.id}
              className={`
                pointer-events-auto flex items-start gap-3 w-full max-w-sm p-4 rounded-xl
                border shadow-lg shadow-slate-900/10 backdrop-blur-md
                ${cfg.bg} ${cfg.border}
                transform transition-all duration-300 animate-in slide-in-from-bottom-2
              `}
              role="alert"
            >
              <div
                className={`p-1.5 rounded-lg shrink-0 flex items-center justify-center ${cfg.iconColor}`}
              >
                {cfg.icon}
              </div>

              <div className="flex-1 min-w-0 font-sans">
                <h4 className="text-xs font-bold text-slate-800 leading-tight">
                  {item.title}
                </h4>
                {item.description && (
                  <p className="mt-1 text-xs text-slate-500 leading-snug">
                    {item.description}
                  </p>
                )}
                {item.action && (
                  <button
                    type="button"
                    onClick={() => {
                      item.action?.onClick();
                      dismissToast(item.id);
                    }}
                    className="mt-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 underline underline-offset-2 cursor-pointer"
                  >
                    {item.action.label}
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => dismissToast(item.id)}
                className="text-slate-400 hover:text-slate-600 p-1 -mr-1 -mt-1 rounded cursor-pointer transition-colors"
                aria-label="Dismiss toast"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
