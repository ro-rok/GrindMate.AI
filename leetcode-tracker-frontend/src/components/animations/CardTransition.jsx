import { motion } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * CardTransition wrapper for shared element transitions
 * Enables smooth card-to-focus mode transitions using Framer Motion layoutId
 * 
 * Usage:
 * <CardTransition layoutId="question-123">
 *   <QuestionCard />
 * </CardTransition>
 */
const CardTransition = ({
  children,
  layoutId,
  className = '',
  onClick,
  ...props
}) => {
  const prefersReducedMotion = useReducedMotion();

  // If reduced motion is preferred, use a regular div
  if (prefersReducedMotion) {
    return (
      <div className={className} onClick={onClick} {...props}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      layoutId={layoutId}
      className={className}
      onClick={onClick}
      transition={{
        type: 'spring',
        damping: 25,
        stiffness: 300,
        duration: 0.6
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default CardTransition;
