import React, { forwardRef, useId } from 'react';

export type SelectSize = 'sm' | 'md' | 'lg';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  helperText?: string;
  error?: string;
  selectSize?: SelectSize;
  leftIcon?: React.ReactNode;
  options?: SelectOption[];
  placeholder?: string;
  fullWidth?: boolean;
}

const sizeClasses: Record<SelectSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-3.5 py-2 text-sm rounded-xl',
  lg: 'px-4 py-3 text-base rounded-xl',
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      helperText,
      error,
      selectSize = 'md',
      leftIcon,
      options,
      placeholder,
      fullWidth = true,
      id,
      disabled,
      required,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = id || generatedId;

    return (
      <div className={`${fullWidth ? 'w-full' : 'inline-block'} font-sans`}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            {label}
            {required && <span className="text-rose-500 ml-1 font-bold">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center justify-center pointer-events-none text-slate-400">
              {leftIcon}
            </div>
          )}

          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            required={required}
            className={`
              w-full bg-white text-slate-900 appearance-none
              border transition-all duration-200 cursor-pointer
              focus:outline-none pr-10
              ${
                error
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-3 focus:ring-rose-500/15'
                  : 'border-slate-200 hover:border-emerald-300 focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/15'
              }
              ${sizeClasses[selectSize]}
              ${leftIcon ? 'pl-10' : ''}
              ${disabled ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed' : ''}
              shadow-xs
              ${className}
            `.trim()}
            {...props}
          >
            {placeholder && (
              <option value="" disabled hidden>
                {placeholder}
              </option>
            )}

            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          {/* Clean chevron icon */}
          <div className="absolute right-3.5 pointer-events-none text-slate-400">
            <svg
              className="w-4 h-4"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>

        {error && (
          <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1 font-medium">
            <svg
              className="w-3.5 h-3.5 shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        )}

        {!error && helperText && (
          <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
