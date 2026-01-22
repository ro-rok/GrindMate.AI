import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuthStore from '../store/authStore';
import Button from '../components/ui/Button';

/**
 * Landing page
 * Redirects to dashboard if authenticated, otherwise shows landing content
 */
function Landing() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-black-base flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center max-w-3xl"
      >
        {/* Hero section */}
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h1 className="text-6xl md:text-7xl font-bold text-text-primary mb-4">
            GrindMate<span className="text-accent-primary">.AI</span>
          </h1>
          <p className="text-xl md:text-2xl text-text-secondary mb-8">
            Your premium LeetCode study companion
          </p>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 text-left"
        >
          <div className="p-6 bg-black-elevated rounded-lg border border-border-subtle">
            <div className="text-3xl mb-3">🔥</div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Track Your Streak
            </h3>
            <p className="text-sm text-text-secondary">
              Build consistency with daily problem solving and visual progress tracking
            </p>
          </div>

          <div className="p-6 bg-black-elevated rounded-lg border border-border-subtle">
            <div className="text-3xl mb-3">🤖</div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              AI Tutor
            </h3>
            <p className="text-sm text-text-secondary">
              Get personalized hints and guidance with our intelligent tutoring system
            </p>
          </div>

          <div className="p-6 bg-black-elevated rounded-lg border border-border-subtle">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Smart Analytics
            </h3>
            <p className="text-sm text-text-secondary">
              Identify weak topics and optimize your study strategy with data
            </p>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate('/login')}
            className="px-8 py-4 text-lg"
          >
            Get Started →
          </Button>
          <p className="mt-4 text-sm text-text-tertiary">
            Free to use. No credit card required.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default Landing;
