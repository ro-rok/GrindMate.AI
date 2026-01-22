/**
 * LoadingSpinner Component
 * Reusable loading spinner with different sizes
 * 
 * Features:
 * - Multiple size variants (sm, md, lg)
 * - Accessible with aria-label
 * - Uses design tokens for colors
 */
const LoadingSpinner = ({ 
  size = 'md', 
  className = '',
  label = 'Loading...' 
}) => {
  const sizeStyles = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  return (
    <div className={`flex items-center justify-center ${className}`} role="status" aria-label={label}>
      <svg
        className={`animate-spin ${sizeStyles[size]}`}
        style={{ color: 'var(--accent-primary)' }}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
};

export default LoadingSpinner;
