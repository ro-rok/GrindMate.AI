import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * PageTransition for route changes
 * Provides smooth transitions between pages with fade and scale effects
 * 
 * Usage:
 * Wrap your route content:
 * <PageTransition>
 *   <YourPageComponent />
 * </PageTransition>
 */
const PageTransition = ({
  children,
  mode = 'fade',
  className = ''
}) => {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();

  const variants = {
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 }
    },
    fadeScale: {
      initial: { opacity: 0, scale: 0.98 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.98 }
    },
    slideUp: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 }
    },
    slideRight: {
      initial: { opacity: 0, x: -20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: 20 }
    }
  };

  const transitions = {
    fade: { duration: 0.2 },
    fadeScale: { duration: 0.3, ease: 'easeInOut' },
    slideUp: { type: 'spring', damping: 25, stiffness: 300 },
    slideRight: { type: 'spring', damping: 25, stiffness: 300 }
  };

  // If reduced motion is preferred, use instant transitions
  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        className={className}
        variants={variants[mode]}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={transitions[mode]}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * PageTransitionWrapper - Higher-order component for wrapping routes
 * Use this in your router configuration
 * 
 * Usage:
 * <Route path="/dashboard" element={
 *   <PageTransitionWrapper>
 *     <Dashboard />
 *   </PageTransitionWrapper>
 * } />
 */
export const PageTransitionWrapper = ({ children, ...props }) => {
  return (
    <PageTransition {...props}>
      {children}
    </PageTransition>
  );
};

export default PageTransition;
