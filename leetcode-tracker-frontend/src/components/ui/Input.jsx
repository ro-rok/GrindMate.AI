import { forwardRef, useState } from 'react';

/**
 * Input component with enhanced focus rings, clear button, and keyboard hints
 * Premium input with proper accessibility and visual feedback
 */
const Input = forwardRef(({
  type = 'text',
  label,
  error,
  helperText,
  className = '',
  containerClassName = '',
  id,
  keyboardHint,
  onClear,
  value,
  onChange,
  ...props
}, ref) => {
  const [internalValue, setInternalValue] = useState('');
  const hasValue = value !== undefined ? value !== '' : internalValue !== '';
  const showClearButton = hasValue && onClear && type !== 'password';
  const baseStyles = 'w-full px-4 py-2 bg-[var(--bg-surface)] text-[var(--text-primary)] border rounded-[var(--radius-md)] transition-all duration-[var(--duration-fast)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg-base)] disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-[var(--text-tertiary)]';
  
  const stateStyles = error
    ? 'border-[var(--accent-danger)] focus:border-[var(--accent-danger)] focus:ring-[var(--accent-danger)]'
    : 'border-[var(--border-default)] hover:border-[var(--border-emphasis)] focus:border-[var(--accent-primary)] focus:ring-[var(--accent-primary)] focus:shadow-[var(--glow-brand)]';

  const combinedClassName = `${baseStyles} ${stateStyles} ${className}`;

  // Generate unique IDs for accessibility
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  const handleChange = (e) => {
    if (onChange) {
      onChange(e);
    } else {
      setInternalValue(e.target.value);
    }
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else if (onChange) {
      onChange({ target: { value: '' } });
    } else {
      setInternalValue('');
    }
    if (ref?.current) {
      ref.current.focus();
    }
  };

  return (
    <div className={`flex flex-col gap-[var(--space-1_5)] ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-[var(--text-primary)]">
          {label}
          {keyboardHint && (
            <span className="ml-[var(--space-2)] text-xs text-[var(--text-tertiary)] font-normal">
              ({keyboardHint})
            </span>
          )}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={type}
          value={value !== undefined ? value : internalValue}
          onChange={handleChange}
          className={combinedClassName}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          {...props}
        />
        {showClearButton && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-[var(--space-2)] top-1/2 -translate-y-1/2 p-[var(--space-1)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors rounded-[var(--radius-sm)] hover:bg-[var(--bg-surface-2)] focus:outline-none focus-visible:shadow-[var(--focus-ring)]"
            aria-label="Clear input"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} className="text-sm text-[var(--accent-danger)] flex items-center gap-1" role="alert">
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
        <p id={helperId} className="text-sm text-[var(--text-secondary)]">
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
