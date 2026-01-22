import { motion } from 'framer-motion';
import { FaSearch, FaBuilding } from 'react-icons/fa';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import Card from '../ui/Card';

/**
 * EmptyState component for no search results
 * Displays a premium empty state with helpful messaging
 * 
 * Requirements: 3.6
 */
const EmptyState = ({ search = '' }) => {
  const prefersReducedMotion = useReducedMotion();

  const MotionDiv = prefersReducedMotion ? 'div' : motion.div;

  const fadeInVariants = prefersReducedMotion ? {} : {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: 'easeOut' }
  };

  return (
    <MotionDiv
      {...fadeInVariants}
      className="flex items-center justify-center min-h-[400px]"
    >
      <Card className="p-12 max-w-md mx-auto text-center">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 rounded-full bg-black-elevated-hover border border-border-subtle flex items-center justify-center">
            {search ? (
              <FaSearch className="text-4xl text-text-tertiary" />
            ) : (
              <FaBuilding className="text-4xl text-text-tertiary" />
            )}
          </div>
        </div>

        {/* Message */}
        <h3 className="text-xl font-semibold text-text-primary mb-2">
          {search ? 'No companies found' : 'No companies available'}
        </h3>
        
        <p className="text-text-secondary mb-6">
          {search ? (
            <>
              We couldn't find any companies matching <span className="text-accent-primary font-medium">"{search}"</span>.
              <br />
              Try adjusting your search terms.
            </>
          ) : (
            'There are no companies available at the moment. Please check back later.'
          )}
        </p>

        {/* Suggestions */}
        {search && (
          <div className="text-left bg-black-elevated-hover rounded-lg p-4 border border-border-subtle">
            <p className="text-sm font-medium text-text-primary mb-2">
              Search tips:
            </p>
            <ul className="text-sm text-text-secondary space-y-1">
              <li>• Check your spelling</li>
              <li>• Try different keywords</li>
              <li>• Use shorter search terms</li>
            </ul>
          </div>
        )}
      </Card>
    </MotionDiv>
  );
};

export default EmptyState;
