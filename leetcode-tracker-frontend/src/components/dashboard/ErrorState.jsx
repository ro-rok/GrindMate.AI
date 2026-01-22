import { motion } from 'framer-motion';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * ErrorState component
 * Displays error message with retry button
 * Used when API requests fail
 * 
 * Requirements: 4.8
 */
const ErrorState = ({ 
  error = 'Something went wrong',
  onRetry,
  title = 'Unable to Load Analytics'
}) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-8 flex items-center justify-center">
      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full"
      >
        <Card className="p-8 text-center">
          {/* Error icon */}
          <motion.div
            className="text-6xl mb-4"
            animate={
              prefersReducedMotion
                ? {}
                : {
                    rotate: [0, -10, 10, -10, 0],
                  }
            }
            transition={{
              duration: 0.5,
              ease: 'easeInOut',
            }}
          >
            ⚠️
          </motion.div>

          {/* Error title */}
          <h2 className="text-2xl font-bold text-text-primary mb-2">
            {title}
          </h2>

          {/* Error message */}
          <p className="text-text-secondary mb-6">
            {error}
          </p>

          {/* Error details (if available) */}
          {typeof error === 'object' && error.message && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400 font-mono">
                {error.message}
              </p>
            </div>
          )}

          {/* Retry button */}
          {onRetry && (
            <Button
              variant="primary"
              size="lg"
              onClick={onRetry}
              className="w-full"
            >
              Try Again
            </Button>
          )}

          {/* Help text */}
          <p className="text-xs text-text-secondary mt-4">
            If the problem persists, please try refreshing the page or contact support.
          </p>
        </Card>
      </motion.div>
    </div>
  );
};

export default ErrorState;
