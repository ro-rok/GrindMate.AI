import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuthStore from '../store/authStore';
import Button from '../components/ui/Button';
import { useReducedMotion } from '../hooks/useReducedMotion';

/**
 * Landing page
 * Redirects to dashboard if authenticated, otherwise shows landing content
 */
function Landing() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const features = [
    {
      icon: '🔥',
      title: 'Track Your Streak',
      description: 'Build consistency with daily problem solving and visual progress tracking',
    },
    {
      icon: '🤖',
      title: 'AI Tutor',
      description: 'Get personalized hints and guidance with our intelligent tutoring system',
    },
    {
      icon: '📊',
      title: 'Smart Analytics',
      description: 'Identify weak topics and optimize your study strategy with data-driven insights',
    },
    {
      icon: '🏢',
      title: 'Company-Focused',
      description: 'Practice problems from top tech companies with frequency data',
    },
    {
      icon: '🎯',
      title: 'Pattern Recognition',
      description: 'Master problem-solving patterns with our comprehensive pattern library',
    },
    {
      icon: '📈',
      title: 'Progress Dashboard',
      description: 'Visualize your journey with detailed stats, heatmaps, and difficulty breakdowns',
    },
    {
      icon: '🎲',
      title: 'Smart Random',
      description: 'Get personalized problem recommendations based on your weak areas',
    },
    {
      icon: '⚡',
      title: 'Focus Mode',
      description: 'Distraction-free problem solving with integrated AI assistance',
    },
    {
      icon: '🌙',
      title: 'Dark Mode',
      description: 'Easy on the eyes with a beautiful dark interface designed for long study sessions',
    },
  ];

  return (
    <div className="min-h-screen bg-black-base">
      {/* Hero Section */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl"
        >
          <motion.div
            initial={prefersReducedMotion ? {} : { scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h1 className="text-6xl md:text-7xl font-bold text-text-primary mb-4">
              GrindMate<span className="text-accent-primary">.AI</span>
            </h1>
            <p className="text-xl md:text-2xl text-text-secondary mb-8">
              Your premium LeetCode study companion
            </p>
            <p className="text-base md:text-lg text-text-tertiary mb-12 max-w-2xl mx-auto">
              Master coding interviews with AI-powered guidance, company-specific problems, 
              and intelligent analytics that adapt to your learning style.
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-8"
          >
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/login')}
              className="px-8 py-4 text-lg"
            >
              Get Started →
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate('/companies')}
              className="px-8 py-4 text-lg"
            >
              Browse Companies
            </Button>
          </motion.div>

          <motion.p
            initial={prefersReducedMotion ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-sm text-text-tertiary"
          >
            Free to use. No credit card required.
          </motion.p>
        </motion.div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 py-20">
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
            Everything You Need to Ace Interviews
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Powerful features designed to accelerate your coding interview preparation
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="p-6 bg-black-elevated rounded-lg border border-border-subtle hover:border-accent-primary/50 transition-colors group"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-3">
                {feature.title}
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 rounded-2xl p-12 border border-accent-primary/20"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
            Ready to Level Up Your Interview Prep?
          </h2>
          <p className="text-lg text-text-secondary mb-8">
            Join thousands of developers mastering coding interviews with GrindMate.AI
          </p>
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate('/login')}
            className="px-10 py-4 text-lg"
          >
            Start Learning for Free
          </Button>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border-subtle py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-text-tertiary">
          <p>© 2025 GrindMate.AI - Your coding interview companion</p>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
