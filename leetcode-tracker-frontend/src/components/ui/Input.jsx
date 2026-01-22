import { forwardRef } from 'react';

/**
 * Input component with validation states
 * Supports text, email, password, and search types
 */
const Input = forwardRef(({
  type = 'text',
  label,
  error,
  helperText,
  className = '',
  containerClassName = '',
  id,
  ...props
}, ref) => {
  const baseStyles = 'w-full px-4 py-2 bg-black-elevated text-text-primary border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black-base disabled:opacity-50 disabled:cursor-not-allowed';
  
  const stateStyles = error
    ? 'border-accent-danger focus:ring-accent-danger'
    : 'border-border-subtle focus:border-accent-primary focus:ring-accent-primary';

  const combinedClassName = `${baseStyles} ${stateStyles} ${className}`;

  // Generate unique IDs for accessibility
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-text-primary">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        type={type}
        className={combinedClassName}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-sm text-accent-danger flex items-center gap-1" role="alert">
          <svg
            className="w-4 h-4"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
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
      {helperText && !error && (
        <p id={helperId} className="text-sm text-text-secondary">
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
