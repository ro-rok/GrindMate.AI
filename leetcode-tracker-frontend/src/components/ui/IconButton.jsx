import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * IconButton component
 * Compact icon-only button for toolbar actions
 */
const IconButton = forwardRef(({
  children,
  variant = 'ghost',
  size = 'md',
  className = '',
  'aria-label': ariaLabel,
  ...props
}, ref) => {
  const prefersReducedMotion = useReducedMotion();

  const baseStyles = 'inline-flex items-center justify-center rounded-[var(--radius-md)] transition-all duration-[var(--duration-fast)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg-base)] disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles = {
    ghost: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] focus-visible:ring-[var(--accent-primary)]',
    primary: 'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)] focus-visible:ring-[var(--accent-primary)] focus-visible:shadow-[var(--glow-brand)]',
    secondary: 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)] hover:bg-[var(--bg-surface-2)] focus-visible:ring-[var(--accent-primary)]',
    danger: 'text-[var(--accent-danger)] hover:bg-[var(--accent-danger-light)] focus-visible:ring-[var(--accent-danger)]'
  };

  const sizeStyles = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11'
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

  const MotionButton = prefersReducedMotion ? 'button' : motion.button;

  const motionProps = prefersReducedMotion ? {} : {
    whileHover: { scale: 1.05 },
    whileTap: { scale: 0.95 },
    transition: { duration: 0.15 }
  };

  return (
    <MotionButton
      ref={ref}
      className={combinedClassName}
      aria-label={ariaLabel}
      {...motionProps}
      {...props}
    >
      <span className={iconSizes[size]}>
        {children}
      </span>
    </MotionButton>
  );
});

IconButton.displayName = 'IconButton';

export default IconButton;
