import Button from './Button';

/**
 * EmptyState component
 * Consistent messaging for no results states
 */
function EmptyState({
  title = 'No results found',
  message,
  icon,
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      {icon && (
        <div className="text-6xl mb-4 opacity-50" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="text-xl font-semibold text-text-primary mb-2">
        {title}
      </h3>
      {message && (
        <p className="text-text-secondary max-w-md mb-6">
          {message}
        </p>
      )}
      {actionLabel && onAction && (
        <Button
          variant="primary"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
