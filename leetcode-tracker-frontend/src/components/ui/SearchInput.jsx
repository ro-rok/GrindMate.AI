import { forwardRef, useState } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';

/**
 * SearchInput component with clear button and keyboard hints
 * Premium search input with enhanced focus states
 */
const SearchInput = forwardRef(({
  value,
  onChange,
  placeholder = 'Search...',
  keyboardHint,
  className = '',
  containerClassName = '',
  onClear,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const showClear = value && value.length > 0;

  const baseStyles = 'w-full pl-10 pr-10 py-2 bg-[var(--bg-surface)] text-[var(--text-primary)] border rounded-[var(--radius-md)] transition-all duration-[var(--duration-fast)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg-base)] disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-[var(--text-tertiary)]';
  const stateStyles = 'border-[var(--border-default)] hover:border-[var(--border-emphasis)] focus:border-[var(--accent-primary)] focus:ring-[var(--accent-primary)] focus:shadow-[var(--glow-brand)]';

  const combinedClassName = `${baseStyles} ${stateStyles} ${className}`;

  const handleClear = (e) => {
    e.stopPropagation();
    if (onClear) {
      onClear();
    } else if (onChange) {
      onChange({ target: { value: '' } });
    }
  };

  return (
    <div className={`relative ${containerClassName}`}>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none">
        <FaSearch className="w-4 h-4" aria-hidden="true" />
      </div>
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className={combinedClassName}
        aria-label={placeholder}
        {...props}
      />
      {showClear && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
          aria-label="Clear search"
        >
          <FaTimes className="w-3.5 h-3.5" />
        </button>
      )}
      {keyboardHint && isFocused && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <kbd className="px-2 py-1 text-xs font-mono text-[var(--text-tertiary)] bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] rounded">
            {keyboardHint}
          </kbd>
        </div>
      )}
    </div>
  );
});

SearchInput.displayName = 'SearchInput';

export default SearchInput;
