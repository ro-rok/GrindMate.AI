/**
 * Skeleton component
 * Premium loading placeholder with pulse animation
 * Multiple variants for different content types
 */
function Skeleton({
  variant = 'text', // 'text' | 'circular' | 'rectangular' | 'card' | 'row'
  width,
  height,
  className = '',
  lines = 1,
}) {
  const baseStyles = 'animate-pulse bg-[var(--bg-surface-2)] rounded';

  const variantStyles = {
    text: 'h-4',
    circular: 'rounded-full',
    rectangular: '',
    card: 'h-48 rounded-[var(--radius-lg)]',
    row: 'h-16 rounded-[var(--radius-md)]',
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`} aria-hidden="true">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${baseStyles} ${variantStyles[variant]}`}
            style={{
              width: i === lines - 1 ? '60%' : '100%',
              height: height || undefined,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      style={{
        width: width || undefined,
        height: height || undefined,
      }}
      aria-hidden="true"
      aria-busy="true"
    />
  );
}

export default Skeleton;
