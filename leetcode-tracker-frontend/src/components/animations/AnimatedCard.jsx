import { motion } from 'framer-motion';
import { motionVariants, motionTransitions, getTransition } from '../../utils/motion';

/**
 * AnimatedCard - Example component demonstrating Framer Motion integration
 * Shows how to use motion variants and transitions with reduced motion support
 */
export function AnimatedCard({ children, variant = 'fadeInUp', ...props }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={motionVariants[variant]}
      transition={getTransition(motionTransitions.normal)}
      {...props}
    >
      {children}
    </motion.div>
  );
}
