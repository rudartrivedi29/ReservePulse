import React from 'react';

export type CardVariant = 'glass' | 'elevated' | 'outlined' | 'flat' | 'interactive';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  variant?: CardVariant;
  title?: React.ReactNode;

  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}

const variantStyles: Record<CardVariant, string> = {
  glass:
    'bg-white/90 backdrop-blur-md border border-emerald-100/90 shadow-glass',
  elevated:
    'bg-white border border-slate-100 shadow-xl shadow-slate-200/50',
  outlined:
    'bg-white border border-slate-200/80 shadow-xs',
  flat:
    'bg-slate-50/80 border border-slate-100 shadow-none',
  interactive:
    'bg-white/95 backdrop-blur-sm border border-emerald-100 hover:border-emerald-400 hover:shadow-glass-hover transition-all duration-200 cursor-pointer active:scale-[0.99]',
};

export const Card: React.FC<CardProps> = ({
  variant = 'glass',
  title,
  subtitle,
  icon,
  footer,
  children,
  className = '',
  hoverable = false,
  ...props
}) => {
  const isBackwardsCompatSimple = (title || subtitle || icon) && !props.role;

  return (
    <div
      className={`
        rounded-2xl overflow-hidden font-sans transition-all duration-200
        ${variantStyles[variant]}
        ${hoverable && variant !== 'interactive' ? 'hover:-translate-y-0.5 hover:shadow-glass-hover cursor-pointer' : ''}
        ${className}
      `.trim()}
      {...props}
    >
      {isBackwardsCompatSimple && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-50/80 bg-emerald-50/20">
          <div className="flex items-center gap-3">
            {icon && (
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 text-sm font-semibold">
                {icon}
              </span>
            )}
            <div>
              {title && (
                <h3 className="text-base font-bold text-slate-800 tracking-tight">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={isBackwardsCompatSimple ? 'p-6' : ''}>
        {children}
      </div>

      {footer && (
        <div className="px-6 py-3.5 bg-slate-50/50 border-t border-slate-100 text-xs text-slate-500">
          {footer}
        </div>
      )}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div
    className={`flex items-start justify-between px-6 py-5 border-b border-slate-100/80 ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <h3
    className={`text-lg font-bold text-slate-900 tracking-tight font-sans ${className}`}
    {...props}
  >
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <p
    className={`text-xs text-slate-500 mt-1 font-sans ${className}`}
    {...props}
  >
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`p-6 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div
    className={`flex items-center justify-between px-6 py-4 bg-slate-50/50 border-t border-slate-100 ${className}`}
    {...props}
  >
    {children}
  </div>
);
