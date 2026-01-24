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
  const baseStyles = 'inline-flex items-center font-medium rounded-full';

  const variantStyles = {
    default: 'bg-gray-800 text-gray-300',
    easy: 'bg-green-900/30 text-green-400 border border-green-800',
    medium: 'bg-yellow-900/30 text-yellow-400 border border-yellow-800',
    hard: 'bg-red-900/30 text-red-400 border border-red-800',
    primary: 'bg-accent-primary/20 text-accent-primary border border-accent-primary/30',
    success: 'bg-accent-success/20 text-accent-success border border-accent-success/30',
    warning: 'bg-accent-warning/20 text-accent-warning border border-accent-warning/30',
    danger: 'bg-accent-danger/20 text-accent-danger border border-accent-danger/30'
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
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
