import Button from './Button';

/**
 * ErrorState Component
 * Reusable error display with retry functionality
 * 
 * Features:
 * - Error icon and message display
 * - Optional retry button
 * - Optional custom action button
 * - Uses design tokens for consistent styling
 */
const ErrorState = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  retryLabel = 'Retry',
  showRetry = true,
  customAction,
  className = ''
}) => {
  return (
    <div 
      className={`flex flex-col items-center justify-center text-center ${className}`}
      style={{ 
        padding: 'var(--space-12)',
        backgroundColor: 'var(--black-elevated)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)'
      }}
    >
      {/* Error Icon */}
      <div 
        className="mb-4"
        style={{
          width: '64px',
          height: '64px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <svg
          className="w-8 h-8"
          style={{ color: 'var(--accent-danger)' }}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      </div>

      {/* Error Title */}
      <h3 
        className="text-xl font-semibold mb-2"
        style={{ color: 'var(--text-primary)' }}
      >
        {title}
      </h3>

      {/* Error Message */}
      <p 
        className="mb-6 max-w-md"
        style={{ color: 'var(--text-secondary)' }}
      >
        {message}
      </p>

      {/* Actions */}
      <div className="flex gap-3">
        {showRetry && onRetry && (
          <Button variant="primary" onClick={onRetry}>
            {retryLabel}
          </Button>
        )}
        {customAction}
      </div>
    </div>
  );
};

export default ErrorState;
