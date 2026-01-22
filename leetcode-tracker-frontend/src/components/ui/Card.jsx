import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * Card component with hover effects
 * Provides elevated surface with subtle animations
 */
const Card = forwardRef(({
  children,
  className = '',
  hoverable = true,
  onClick,
  layoutId,
  ...props
}, ref) => {
  const prefersReducedMotion = useReducedMotion();

  const baseStyles = 'bg-black-elevated rounded-lg border border-border-subtle shadow-md';
  const hoverStyles = hoverable ? 'transition-all duration-300 hover:shadow-lg hover:border-border-emphasis' : '';
  const clickableStyles = onClick ? 'cursor-pointer' : '';

  const combinedClassName = `${baseStyles} ${hoverStyles} ${clickableStyles} ${className}`;

  const MotionCard = prefersReducedMotion ? 'div' : motion.div;

  const motionProps = prefersReducedMotion ? {} : {
    whileHover: hoverable && !onClick ? { 
      scale: 1.02,
      boxShadow: '0 0 20px rgba(14, 165, 233, 0.3)'
    } : onClick ? {
      scale: 1.01,
      backgroundColor: 'rgba(26, 26, 26, 1)'
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

export default Card;
