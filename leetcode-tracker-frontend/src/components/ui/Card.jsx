import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * Card component with matte and glass variants
 * Premium surface with hover lift and subtle animations
 * 
 * Variants:
 * - matte: Solid background (default)
 * - glass: Glass morphism with backdrop blur
 */
const Card = forwardRef(({
  children,
  variant = 'matte',
  className = '',
  hoverable = true,
  onClick,
  layoutId,
  ...props
}, ref) => {
  const prefersReducedMotion = useReducedMotion();

  // Base styles
  const variantStyles = {
    matte: 'bg-[var(--bg-surface)] border-[var(--border-subtle)]',
    glass: 'bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] border-[var(--glass-border)]'
  };

  const baseStyles = `rounded-[var(--radius-lg)] border shadow-[var(--elevation-1)] ${variantStyles[variant]}`;
  const hoverStyles = hoverable 
    ? 'transition-all duration-[var(--duration-normal)] hover:shadow-[var(--elevation-2)]' 
    : '';
  const hoverBorderStyles = hoverable 
    ? variant === 'glass' 
      ? 'hover:border-[var(--glass-border-hover)]' 
      : 'hover:border-[var(--border-default)]'
    : '';
  const clickableStyles = onClick ? 'cursor-pointer' : '';

  const combinedClassName = `${baseStyles} ${hoverStyles} ${hoverBorderStyles} ${clickableStyles} ${className}`;

  const MotionCard = prefersReducedMotion ? 'div' : motion.div;

  const motionProps = prefersReducedMotion ? {} : {
    whileHover: hoverable ? { 
      y: -2,
      transition: { duration: 0.2, ease: 'easeOut' }
    } : {},
    whileTap: onClick ? { 
      scale: 0.99,
      transition: { duration: 0.1 }
    } : {},
    transition: { duration: 0.2 },
    layoutId: layoutId
  };

  return (
    <MotionCard
      ref={ref}
      className={combinedClassName}
      onClick={onClick}
      {...motionProps}
      {...props}
    >
      {children}
    </MotionCard>
  );
});

Card.displayName = 'Card';

/**
 * CardHeader subcomponent
 * Container for card header content
 */
const CardHeader = forwardRef(({ children, className = '', ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={`p-[var(--space-6)] pb-[var(--space-4)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

CardHeader.displayName = 'CardHeader';

/**
 * CardTitle subcomponent
 * Card title with proper typography
 */
const CardTitle = forwardRef(({ children, className = '', as: Component = 'h3', ...props }, ref) => {
  return (
    <Component
      ref={ref}
      className={`text-lg font-semibold text-[var(--text-primary)] leading-[var(--leading-tight)] ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
});

CardTitle.displayName = 'CardTitle';

/**
 * CardMeta subcomponent
 * Secondary metadata text
 */
const CardMeta = forwardRef(({ children, className = '', ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={`text-sm text-[var(--text-secondary)] mt-[var(--space-1)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

CardMeta.displayName = 'CardMeta';

/**
 * CardContent subcomponent
 * Main card content area
 */
const CardContent = forwardRef(({ children, className = '', ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={`p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

CardContent.displayName = 'CardContent';

// Attach subcomponents
Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Meta = CardMeta;
Card.Content = CardContent;

export default Card;
