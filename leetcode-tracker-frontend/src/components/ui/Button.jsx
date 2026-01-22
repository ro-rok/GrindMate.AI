import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * Button component with variants and loading states
 * Supports primary, secondary, ghost, and danger variants
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

  const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black-base disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles = {
    primary: 'bg-accent-primary text-white hover:bg-accent-primary-hover focus:ring-accent-primary',
    secondary: 'bg-black-elevated text-text-primary hover:bg-black-elevated-hover border border-border-subtle focus:ring-accent-primary',
    ghost: 'text-text-primary hover:bg-black-elevated focus:ring-accent-primary',
    danger: 'bg-accent-danger text-white hover:bg-red-600 focus:ring-accent-danger',
    success: 'bg-accent-success text-white hover:bg-green-600 focus:ring-accent-success'
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm rounded-md',
    md: 'px-4 py-2 text-base rounded-lg',
    lg: 'px-6 py-3 text-lg rounded-xl'
  };

  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

  const MotionButton = prefersReducedMotion ? 'button' : motion.button;

  const motionProps = prefersReducedMotion ? {} : {
    whileHover: disabled || loading ? {} : { scale: 1.02 },
    whileTap: disabled || loading ? {} : { scale: 0.98 },
    transition: { duration: 0.15 }
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
          className="animate-spin -ml-1 mr-2 h-4 w-4"
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
