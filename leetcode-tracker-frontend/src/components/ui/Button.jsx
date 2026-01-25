import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * Button component with consistent variants, sizes, and focus ring glow
 * Premium button with subtle motion and proper accessibility
 */
const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  onClick,
  type = 'button',
  'aria-label': ariaLabel,
  ...props
}, ref) => {
  const prefersReducedMotion = useReducedMotion();

  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-[var(--duration-fast)] focus:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-50 disabled:cursor-not-allowed relative';

  const variantStyles = {
    primary: 'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] focus-visible:shadow-[var(--glow-brand)]',
    secondary: 'bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] border border-[var(--border-default)] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]',
    ghost: 'text-[var(--text-primary)] hover:bg-[var(--bg-surface)] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]',
    danger: 'bg-[var(--accent-danger)] text-white hover:bg-[var(--accent-danger-hover)] focus-visible:ring-2 focus-visible:ring-[var(--accent-danger)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]',
    success: 'bg-[var(--accent-success)] text-white hover:bg-[var(--accent-success-hover)] focus-visible:ring-2 focus-visible:ring-[var(--accent-success)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]'
  };

  const sizeStyles = {
    sm: 'px-[var(--space-3)] py-[var(--space-1_5)] text-sm rounded-[var(--radius-sm)] gap-[var(--space-1_5)]',
    md: 'px-[var(--space-4)] py-[var(--space-2)] text-base rounded-[var(--radius-md)] gap-[var(--space-2)]',
    lg: 'px-[var(--space-6)] py-[var(--space-3)] text-lg rounded-[var(--radius-lg)] gap-[var(--space-2_5)]'
  };

  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

  const MotionButton = prefersReducedMotion ? 'button' : motion.button;

  const motionProps = prefersReducedMotion ? {} : {
    whileHover: disabled || loading ? {} : { 
      scale: 1.01,
      transition: { duration: 0.15 }
    },
    whileTap: disabled || loading ? {} : { 
      scale: 0.98,
      transition: { duration: 0.1 }
    }
  };

  return (
    <MotionButton
      ref={ref}
      type={type}
      className={combinedClassName}
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-busy={loading}
      aria-disabled={disabled || loading}
      {...motionProps}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
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
      )}
      {children}
    </MotionButton>
  );
});

Button.displayName = 'Button';

export default Button;
