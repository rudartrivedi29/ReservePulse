import React from 'react';

export type EmptyStateVariant = 'default' | 'card' | 'compact';
export type EmptyStatePreset = 'no-reservations' | 'no-slots' | 'no-results' | 'custom';

export interface EmptyStateProps {
  preset?: EmptyStatePreset;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  variant?: EmptyStateVariant;
  className?: string;
}

const presets: Record<
  Exclude<EmptyStatePreset, 'custom'>,
  { title: string; description: string; icon: React.ReactNode }
> = {
  'no-reservations': {
    title: 'No Reservations Found',
    description: 'There are currently no active bookings or reservation locks in this timeframe.',
    icon: (
      <svg
        className="w-8 h-8 text-emerald-600"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.75"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.75 3v2.25M17.25 3v2.253 3.75m-18 0h24m-24 0v13.5A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V7.5M10 12h4m-2-2v4"
        />
      </svg>
    ),
  },
  'no-slots': {
    title: 'No Available Capacity',
    description: 'All resource allocation slots are currently reserved or locked by active sessions.',
    icon: (
      <svg
        className="w-8 h-8 text-amber-600"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.75"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
        />
      </svg>
    ),
  },
  'no-results': {
    title: 'No Matching Resources',
    description: 'Try adjusting your search criteria, filters, or date range to find open slots.',
    icon: (
      <svg
        className="w-8 h-8 text-sky-600"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.75"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
      </svg>
    ),
  },
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  preset = 'custom',
  title,
  description,
  icon,
  action,
  secondaryAction,
  variant = 'default',
  className = '',
}) => {
  const activeConfig =
    preset !== 'custom'
      ? presets[preset]
      : {
          title: title || 'No Data Available',
          description: description || 'There is nothing to display right now.',
          icon: icon || (
            <svg
              className="w-8 h-8 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.75"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
              />
            </svg>
          ),
        };

  const finalTitle = title || activeConfig.title;
  const finalDesc = description || activeConfig.description;
  const finalIcon = icon || activeConfig.icon;

  const isCard = variant === 'card';
  const isCompact = variant === 'compact';

  return (
    <div
      className={`
        flex flex-col items-center justify-center text-center font-sans
        ${isCompact ? 'py-6 px-4' : 'py-12 px-6'}
        ${isCard ? 'bg-white/90 backdrop-blur-md rounded-2xl border border-emerald-100 shadow-glass' : ''}
        ${className}
      `.trim()}
    >
      <div className="relative mb-4 flex items-center justify-center">
        {/* Subtle decorative glow orb */}
        <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-xl transform scale-125" />
        <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-50 to-white border border-emerald-200/60 shadow-sm">
          {finalIcon}
        </div>
      </div>

      <h3
        className={`font-bold text-slate-800 tracking-tight ${
          isCompact ? 'text-sm' : 'text-base sm:text-lg'
        }`}
      >
        {finalTitle}
      </h3>

      <p
        className={`text-slate-500 max-w-sm mt-1.5 ${
          isCompact ? 'text-xs' : 'text-xs sm:text-sm'
        }`}
      >
        {finalDesc}
      </p>

      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
};
