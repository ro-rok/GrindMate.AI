import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { useReducedMotion } from '../hooks/useReducedMotion';

/**
 * 404 Not Found page
 * Shows helpful error message with navigation options
 */
function NotFound() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();

  // Check if it's a company or question ID that wasn't found
  const pathParts = location.pathname.split('/').filter(Boolean);
  const isCompanyRoute = pathParts[0] === 'companies' && pathParts.length > 1;
  const isQuestionRoute = pathParts[0] === 'focus' && pathParts.length > 1;

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center p-4">
      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full"
      >
        <Card className="p-8 text-center">
          <div className="mb-6">
            <h1 className="text-6xl font-bold text-[var(--text-primary)] mb-2">404</h1>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-4">
              {isCompanyRoute 
                ? 'Company Not Found' 
                : isQuestionRoute 
                ? 'Question Not Found'
                : 'Page Not Found'}
            </h2>
            <p className="text-[var(--text-secondary)] mb-2">
              {isCompanyRoute
                ? `The company "${pathParts[1]}" could not be found. It may have been removed or the ID is incorrect.`
                : isQuestionRoute
                ? `The question "${pathParts[1]}" could not be found. It may have been removed or the ID is incorrect.`
                : `The page you're looking for doesn't exist or has been moved.`}
            </p>
            {location.pathname && (
              <p className="text-sm text-[var(--text-tertiary)] mt-2 font-mono">
                {location.pathname}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <Button
              variant="primary"
              onClick={() => navigate('/')}
            >
              Go Home
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate('/companies')}
            >
              Browse Companies
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate(-1)}
            >
              Go Back
            </Button>
          </div>

          <div className="border-t border-[var(--border-subtle)] pt-6 mt-6">
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Popular pages:
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-sm text-[var(--accent-primary)] hover:underline px-3 py-1 rounded-[var(--radius-sm)] hover:bg-[var(--bg-surface)] transition-colors"
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate('/companies')}
                className="text-sm text-[var(--accent-primary)] hover:underline px-3 py-1 rounded-[var(--radius-sm)] hover:bg-[var(--bg-surface)] transition-colors"
              >
                Companies
              </button>
              <button
                onClick={() => navigate('/profile')}
                className="text-sm text-[var(--accent-primary)] hover:underline px-3 py-1 rounded-[var(--radius-sm)] hover:bg-[var(--bg-surface)] transition-colors"
              >
                Profile
              </button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

export default NotFound;
