/**
 * Badge component for difficulty levels and topics
 * Supports different variants with appropriate colors
 */
const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  className = ''
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full border';

  const variantStyles = {
    default: 'bg-[var(--bg-surface-2)] text-[var(--text-secondary)] border-[var(--border-subtle)]',
    easy: 'bg-[var(--accent-success-light)] text-[var(--accent-success)] border-[var(--border-success)]',
    medium: 'bg-[var(--accent-warning-light)] text-[var(--accent-warning)] border-[var(--border-warning)]',
    hard: 'bg-[var(--accent-danger-light)] text-[var(--accent-danger)] border-[var(--border-danger)]',
    primary: 'bg-[var(--accent-primary-light)] text-[var(--accent-primary)] border-[var(--border-brand)]',
    success: 'bg-[var(--accent-success-light)] text-[var(--accent-success)] border-[var(--border-success)]',
    warning: 'bg-[var(--accent-warning-light)] text-[var(--accent-warning)] border-[var(--border-warning)]',
    danger: 'bg-[var(--accent-danger-light)] text-[var(--accent-danger)] border-[var(--border-danger)]'
  };

  const sizeStyles = {
    sm: 'px-[var(--space-2)] py-[var(--space-0_5)] text-xs',
    md: 'px-[var(--space-2_5)] py-[var(--space-1)] text-sm',
    lg: 'px-[var(--space-3)] py-[var(--space-1_5)] text-base'
  };
  
  // Add tier variants
  variantStyles.tierS = 'bg-gradient-to-r from-yellow-600/20 to-yellow-500/20 text-yellow-400 border border-yellow-500/30';
  variantStyles.tierA = 'bg-gradient-to-r from-blue-600/20 to-blue-500/20 text-blue-400 border border-blue-500/30';
  variantStyles.quant = 'bg-gradient-to-r from-purple-600/20 to-purple-500/20 text-purple-400 border border-purple-500/30';
  variantStyles.india = 'bg-gradient-to-r from-green-600/20 to-green-500/20 text-green-400 border border-green-500/30';

  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

  return (
    <span className={combinedClassName}>
      {children}
    </span>
  );
};

// Helper function to get difficulty variant
Badge.getDifficultyVariant = (difficulty) => {
  const difficultyMap = {
    'EASY': 'easy',
    'MEDIUM': 'medium',
    'HARD': 'hard',
    'Easy': 'easy',
    'Medium': 'medium',
    'Hard': 'hard'
  };
  return difficultyMap[difficulty] || 'default';
};

export default Badge;
