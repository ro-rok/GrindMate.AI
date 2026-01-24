import { forwardRef } from 'react';

/**
 * Select component
 * Styled dropdown matching design system with keyboard navigation
 */
const Select = forwardRef(({
  children,
  className = '',
  ...props
}, ref) => {
  const baseStyles = 'w-full px-4 py-2 bg-black-elevated text-text-primary border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary transition-colors appearance-none cursor-pointer';

  // Add custom arrow
  const combinedClassName = `${baseStyles} ${className}`;

  return (
    <div className="relative">
      <select
        ref={ref}
        className={combinedClassName}
        {...props}
      >
        {children}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        <svg
          className="w-4 h-4 text-text-tertiary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
