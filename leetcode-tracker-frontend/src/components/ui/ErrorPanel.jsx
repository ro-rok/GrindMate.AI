import { useState } from 'react';
import Button from './Button';
import Card from './Card';
import { FaExclamationTriangle, FaRedo } from 'react-icons/fa';

/**
 * ErrorPanel component
 * Displays inline error messages with retry functionality
 * Used instead of toast-only error handling for critical failures
 */
function ErrorPanel({
  title = 'Error',
  message,
  onRetry,
  retryLabel = 'Retry',
  className = '',
  variant = 'error', // 'error' | 'warning' | 'info'
}) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (!onRetry) return;
    
    setIsRetrying(true);
    try {
      await onRetry();
    } catch (err) {
      // Error handled by onRetry
    } finally {
      setIsRetrying(false);
    }
  };

  const variantStyles = {
    error: 'border-[var(--border-danger)] bg-[var(--accent-danger-light)]',
    warning: 'border-[var(--border-warning)] bg-[var(--accent-warning-light)]',
    info: 'border-[var(--border-brand)] bg-[var(--accent-primary-light)]',
  };

  const iconColors = {
    error: 'text-[var(--accent-danger)]',
    warning: 'text-[var(--accent-warning)]',
    info: 'text-[var(--accent-primary)]',
  };

  return (
    <Card className={`p-4 ${variantStyles[variant]} ${className}`}>
      <div className="flex items-start gap-3">
        <FaExclamationTriangle 
          className={`${iconColors[variant]} flex-shrink-0 mt-0.5`}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
            {title}
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            {message}
          </p>
          {onRetry && (
            <div className="mt-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRetry}
                loading={isRetrying}
                className="flex items-center gap-2"
              >
                <FaRedo className="text-xs" />
                {retryLabel}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default ErrorPanel;
