import React, { forwardRef } from 'react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'accent'
  | 'link';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-md shadow-emerald-600/20 hover:shadow-lg hover:shadow-emerald-600/30 border border-emerald-500/40 active:translate-y-px',
  secondary:
    'bg-white hover:bg-emerald-50/50 text-slate-700 hover:text-emerald-800 border border-emerald-100 hover:border-emerald-300 shadow-sm active:translate-y-px',
  outline:
    'bg-transparent hover:bg-emerald-50/60 text-emerald-700 hover:text-emerald-800 border-2 border-emerald-600/60 hover:border-emerald-600 active:translate-y-px',
  ghost:
    'bg-transparent hover:bg-emerald-50/70 text-slate-600 hover:text-emerald-700 border border-transparent active:translate-y-px',
  danger:
    'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 text-white shadow-md shadow-rose-600/20 hover:shadow-lg hover:shadow-rose-600/30 border border-rose-500/40 active:translate-y-px',
  accent:
    'bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white shadow-md shadow-indigo-600/20 hover:shadow-lg hover:shadow-indigo-600/30 border border-indigo-500/30 active:translate-y-px',
  link:
    'bg-transparent text-emerald-600 hover:text-emerald-800 underline-offset-4 hover:underline p-0 h-auto font-medium border-0 shadow-none',
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'text-xs px-2.5 py-1 rounded-md gap-1.5 font-medium',
  sm: 'text-xs px-3.5 py-1.5 rounded-lg gap-2 font-semibold',
  md: 'text-sm px-4 py-2 rounded-xl gap-2 font-semibold',
  lg: 'text-base px-5 py-2.5 rounded-xl gap-2.5 font-semibold',
  xl: 'text-lg px-6 py-3.5 rounded-2xl gap-3 font-bold',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled = false,
      className = '',
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isActuallyDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isActuallyDisabled}
        className={`
          inline-flex items-center justify-center font-sans tracking-tight transition-all duration-200 cursor-pointer
          focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-2
          ${variantStyles[variant]}
          ${variant !== 'link' ? sizeStyles[size] : ''}
          ${fullWidth ? 'w-full' : ''}
          ${isActuallyDisabled ? 'opacity-60 cursor-not-allowed pointer-events-none' : 'active:scale-[0.98]'}
          ${className}
        `.trim()}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin -ml-0.5 h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3.5"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
