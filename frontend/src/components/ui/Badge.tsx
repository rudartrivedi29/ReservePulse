import React from 'react';

export type BadgeVariant =
  | 'emerald'
  | 'blue'
  | 'amber'
  | 'rose'
  | 'purple'
  | 'slate'
  | 'outline';

export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  pulseDot?: boolean;
  icon?: React.ReactNode;
  pill?: boolean;
  removable?: boolean;
  onRemove?: () => void;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, { container: string; dot: string }> = {
  emerald: {
    container: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    dot: 'bg-emerald-500',
  },
  blue: {
    container: 'bg-sky-50 text-sky-800 border-sky-200/80',
    dot: 'bg-sky-500',
  },
  amber: {
    container: 'bg-amber-50 text-amber-800 border-amber-200/80',
    dot: 'bg-amber-500',
  },
  rose: {
    container: 'bg-rose-50 text-rose-800 border-rose-200/80',
    dot: 'bg-rose-500',
  },
  purple: {
    container: 'bg-purple-50 text-purple-800 border-purple-200/80',
    dot: 'bg-purple-500',
  },
  slate: {
    container: 'bg-slate-100 text-slate-700 border-slate-200/80',
    dot: 'bg-slate-500',
  },
  outline: {
    container: 'bg-transparent text-slate-700 border-slate-300',
    dot: 'bg-slate-400',
  },
};

const sizeStyles: Record<BadgeSize, string> = {
  xs: 'text-[10px] px-2 py-0.5 gap-1 font-medium',
  sm: 'text-xs px-2.5 py-0.5 gap-1.5 font-medium',
  md: 'text-xs px-3 py-1 gap-1.5 font-semibold',
  lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'emerald',
  size = 'sm',
  dot = false,
  pulseDot = false,
  icon,
  pill = true,
  removable = false,
  onRemove,
  className = '',
  children,
  ...props
}) => {
  const currentVariant = variantStyles[variant];

  return (
    <span
      className={`
        inline-flex items-center justify-center font-sans tracking-tight border
        ${currentVariant.container}
        ${sizeStyles[size]}
        ${pill ? 'rounded-full' : 'rounded-md'}
        ${className}
      `.trim()}
      {...props}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          {pulseDot && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${currentVariant.dot}`}
            />
          )}
          <span
            className={`relative inline-flex rounded-full h-1.5 w-1.5 ${currentVariant.dot}`}
          />
        </span>
      )}

      {icon && <span className="inline-flex shrink-0">{icon}</span>}

      <span>{children}</span>

      {removable && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 -mr-1 p-0.5 rounded-full hover:bg-black/10 focus:outline-none cursor-pointer"
          aria-label="Remove badge"
        >
          <svg
            className="w-3 h-3"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </span>
  );
};
