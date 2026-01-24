/**
 * Skeleton component
 * Loading placeholder matching card/question shapes
 */
function Skeleton({
  variant = 'text', // 'text' | 'circular' | 'rectangular' | 'card' | 'row'
  width,
  height,
  className = '',
  lines = 1,
}) {
  const baseStyles = 'animate-pulse bg-gray-800 rounded';

  const variantStyles = {
    text: 'h-4',
    circular: 'rounded-full',
    rectangular: '',
    card: 'h-48',
    row: 'h-12',
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${baseStyles} ${variantStyles[variant]}`}
            style={{
              width: i === lines - 1 ? '60%' : '100%',
              height: height || undefined,
            }}
            aria-hidden="true"
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
    />
  );
}

export default Skeleton;
