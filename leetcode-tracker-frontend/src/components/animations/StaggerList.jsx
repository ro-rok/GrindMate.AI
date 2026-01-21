import { motion } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * StaggerList for list item animations
 * Animates children with a stagger effect for smooth list reveals
 * 
 * Usage:
 * <StaggerList>
 *   {items.map(item => <ListItem key={item.id} />)}
 * </StaggerList>
 */
const StaggerList = ({
  children,
  staggerDelay = 0.05,
  className = '',
  as: Component = 'div',
  ...props
}) => {
  const prefersReducedMotion = useReducedMotion();

  const containerVariants = prefersReducedMotion ? {} : {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = prefersReducedMotion ? {} : {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        damping: 25,
        stiffness: 300
      }
    }
  };

  const MotionComponent = prefersReducedMotion ? Component : motion[Component];

  return (
    <MotionComponent
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      {...props}
    >
      {Array.isArray(children)
        ? children.map((child, index) => (
            <motion.div key={child.key || index} variants={itemVariants}>
              {child}
            </motion.div>
          ))
        : children}
    </MotionComponent>
  );
};

/**
 * StaggerListItem - Individual item wrapper for manual control
 * Use this when you need more control over individual items
 */
export const StaggerListItem = ({ children, className = '', ...props }) => {
  const prefersReducedMotion = useReducedMotion();

  const itemVariants = prefersReducedMotion ? {} : {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        damping: 25,
        stiffness: 300
      }
    }
  };

  const MotionDiv = prefersReducedMotion ? 'div' : motion.div;

  return (
    <MotionDiv className={className} variants={itemVariants} {...props}>
      {children}
    </MotionDiv>
  );
};

export default StaggerList;
