import React from 'react';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type SpinnerColor = 'emerald' | 'white' | 'slate' | 'cyan';

const spinnerSizeClasses: Record<SpinnerSize, string> = {
  xs: 'w-3.5 h-3.5 border-2',
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-[2.5px]',
  lg: 'w-8 h-8 border-3',
  xl: 'w-12 h-12 border-4',
};

const spinnerColorClasses: Record<SpinnerColor, { border: string; active: string }> = {
  emerald: {
    border: 'border-emerald-200',
    active: 'border-t-emerald-600',
  },
  white: {
    border: 'border-white/30',
    active: 'border-t-white',
  },
  slate: {
    border: 'border-slate-200',
    active: 'border-t-slate-700',
  },
  cyan: {
    border: 'border-teal-200',
    active: 'border-t-teal-600',
  },
};

export interface SpinnerProps {
  size?: SpinnerSize;
  color?: SpinnerColor;
  className?: string;
  label?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = 'emerald',
  className = '',
  label,
}) => {
  const { border, active } = spinnerColorClasses[color];

  return (
    <div className="inline-flex items-center gap-2">
      <div
        className={`
          animate-spin rounded-full
          ${border} ${active}
          ${spinnerSizeClasses[size]}
          ${className}
        `.trim()}
        role="status"
        aria-label={label || 'Loading'}
      />
      {label && <span className="text-xs font-medium text-slate-600 font-sans">{label}</span>}
    </div>
  );
};

/* Skeleton Components */
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', ...props }) => {
  return (
    <div
      className={`animate-pulse bg-slate-200/80 rounded-lg ${className}`}
      {...props}
    />
  );
};

export const SkeletonText: React.FC<{
  lines?: number;
  lastLineWidth?: string;
  className?: string;
}> = ({ lines = 3, lastLineWidth = '70%', className = '' }) => {
  return (
    <div className={`space-y-2.5 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="h-3 bg-slate-200/80 rounded animate-pulse"
          style={{
            width: index === lines - 1 ? lastLineWidth : '100%',
          }}
        />
      ))}
    </div>
  );
};

export const SkeletonAvatar: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ size = 'md', className = '' }) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  };

  return (
    <div
      className={`rounded-full bg-slate-200/80 animate-pulse ${sizeMap[size]} ${className}`}
    />
  );
};

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`p-6 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-4 ${className}`}
    >
      <div className="flex items-center gap-3">
        <SkeletonAvatar size="md" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <SkeletonText lines={2} lastLineWidth="80%" />
      <div className="pt-2 flex justify-between items-center">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  );
};

/* Loading Overlay */
export interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
  blur?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message = 'Loading...',
  children,
  blur = true,
}) => {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div
          className={`
            absolute inset-0 z-30 flex flex-col items-center justify-center p-4
            bg-white/70 ${blur ? 'backdrop-blur-xs' : ''} rounded-2xl transition-all duration-200
          `}
        >
          <Spinner size="lg" color="emerald" />
          {message && (
            <p className="mt-3 text-xs font-semibold text-slate-700 tracking-wide font-sans animate-pulse">
              {message}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

/* Progress Bar */
export interface ProgressBarProps {
  value?: number; // 0 to 100
  indeterminate?: boolean;
  color?: 'emerald' | 'rose' | 'sky';
  height?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value = 0,
  indeterminate = false,
  color = 'emerald',
  height = 'md',
  showLabel = false,
  className = '',
}) => {
  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const colorClasses = {
    emerald: 'bg-emerald-500 shadow-sm shadow-emerald-500/50',
    rose: 'bg-rose-500 shadow-sm shadow-rose-500/50',
    sky: 'bg-sky-500 shadow-sm shadow-sky-500/50',
  };

  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={`w-full font-sans ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center text-xs text-slate-600 mb-1.5 font-medium">
          <span>Progress</span>
          <span>{clampedValue}%</span>
        </div>
      )}
      <div
        className={`w-full bg-slate-100 rounded-full overflow-hidden ${heightClasses[height]}`}
      >
        {indeterminate ? (
          <div
            className={`h-full w-2/5 rounded-full ${colorClasses[color]} animate-[indeterminate_1.5s_infinite_linear]`}
            style={{
              animation: 'indeterminate 1.5s infinite ease-in-out',
            }}
          />
        ) : (
          <div
            className={`h-full rounded-full transition-all duration-300 ${colorClasses[color]}`}
            style={{ width: `${clampedValue}%` }}
          />
        )}
      </div>
    </div>
  );
};
