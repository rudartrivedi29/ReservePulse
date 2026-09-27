import React, { forwardRef, useState, useId } from 'react';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  helperText?: string;
  error?: string;
  inputSize?: InputSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  fullWidth?: boolean;
}

const sizeClasses: Record<InputSize, { input: string; icon: string }> = {
  sm: {
    input: 'px-3 py-1.5 text-xs rounded-lg',
    icon: 'w-3.5 h-3.5',
  },
  md: {
    input: 'px-3.5 py-2 text-sm rounded-xl',
    icon: 'w-4 h-4',
  },
  lg: {
    input: 'px-4 py-3 text-base rounded-xl',
    icon: 'w-5 h-5',
  },
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      inputSize = 'md',
      leftIcon,
      rightIcon,
      clearable = false,
      onClear,
      fullWidth = true,
      id,
      type = 'text',
      disabled,
      required,
      className = '',
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const [showPassword, setShowPassword] = useState(false);

    const isPasswordType = type === 'password';
    const computedType = isPasswordType && showPassword ? 'text' : type;

    const hasValue = value !== undefined && value !== null && String(value).length > 0;

    return (
      <div className={`${fullWidth ? 'w-full' : 'inline-block'} font-sans`}>
        {label && (
          <label
            htmlFor={inputId}
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

          <input
            ref={ref}
            id={inputId}
            type={computedType}
            disabled={disabled}
            required={required}
            value={value}
            onChange={onChange}
            className={`
              w-full bg-white text-slate-900 placeholder:text-slate-400
              border transition-all duration-200
              focus:outline-none
              ${
                error
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-3 focus:ring-rose-500/15'
                  : 'border-slate-200 hover:border-emerald-300 focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/15'
              }
              ${sizeClasses[inputSize].input}
              ${leftIcon ? 'pl-10' : ''}
              ${rightIcon || clearable || isPasswordType ? 'pr-10' : ''}
              ${disabled ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed' : ''}
              shadow-xs
              ${className}
            `.trim()}
            {...props}
          />

          {/* Suffix / Action slots */}
          <div className="absolute right-3 flex items-center gap-1.5 text-slate-400">
            {clearable && hasValue && !disabled && (
              <button
                type="button"
                onClick={onClear}
                tabIndex={-1}
                className="hover:text-slate-600 focus:outline-none cursor-pointer p-0.5 rounded"
                aria-label="Clear input"
              >
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}

            {isPasswordType && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="hover:text-slate-600 focus:outline-none cursor-pointer p-0.5 rounded"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            )}

            {!isPasswordType && rightIcon && (
              <span className="flex items-center pointer-events-none">{rightIcon}</span>
            )}
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

Input.displayName = 'Input';
