import Button from './Button';

/**
 * EmptyState component
 * Premium empty state with consistent messaging and CTAs
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
    <div className={`flex flex-col items-center justify-center py-[var(--space-16)] px-[var(--space-4)] text-center ${className}`}>
      {icon && (
        <div className="text-6xl mb-[var(--space-6)] opacity-40" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-[var(--space-2)]">
        {title}
      </h3>
      {message && (
        <p className="text-[var(--text-secondary)] max-w-md mb-[var(--space-8)] leading-[var(--leading-relaxed)]">
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
