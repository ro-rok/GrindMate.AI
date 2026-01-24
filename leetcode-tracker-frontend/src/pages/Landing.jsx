import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuthStore from '../store/authStore';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Pill from '../components/ui/Pill';
import { useReducedMotion } from '../hooks/useReducedMotion';

/**
 * Landing page
 * Premium redesign with hero, proof chips, enhanced features, and premium CTA
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

  const mainFeatures = [
    {
      icon: '🏢',
      title: 'Company-wise Question Bank',
      description: 'Practice with real interview questions from top tech companies. Filter by company, difficulty, and frequency to target your dream role.',
    },
    {
      icon: '⚡',
      title: 'Focus Mode + Session Tracking',
      description: 'Distraction-free problem solving with integrated timer, notes, and session analytics. Track your progress and build consistency.',
    },
    {
      icon: '🤖',
      title: 'AI Tutor with Modes + Feedback Loop',
      description: 'Get personalized guidance with Socratic, ELI5, Interview, and Code Review modes. Learn from AI-powered hints and explanations.',
    },
  ];

  const benefits = [
    'Company-specific question banks',
    'AI-powered tutoring system',
    'Progress tracking & analytics',
    'Focus mode for deep work',
  ];

  return (
    <div className="min-h-screen bg-black-base relative overflow-hidden">
      {/* Background watermark */}
      <div 
        className="fixed inset-0 opacity-[0.02] pointer-events-none z-0"
        style={{
          backgroundImage: 'url(/logo-bg.webp)',
          backgroundSize: '800px',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Hero Section */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-5xl"
        >
          {/* Gradient glow behind headline */}
          <div className="absolute inset-0 -z-10 blur-3xl opacity-20">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent-primary rounded-full" />
          </div>

          <motion.div
            initial={prefersReducedMotion ? {} : { scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative"
          >
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold text-text-primary mb-4 tracking-tight">
              GrindMate<span className="text-accent-primary">.AI</span>
            </h1>
            <p className="text-xl md:text-2xl lg:text-3xl text-text-secondary mb-6 font-medium">
              Your premium LeetCode study companion
            </p>
            <p className="text-base md:text-lg text-text-tertiary mb-10 max-w-2xl mx-auto leading-relaxed">
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
              onClick={() => navigate('/companies')}
              className="px-8 py-4 text-lg font-semibold"
            >
              Start Practicing →
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate('/companies')}
              className="px-8 py-4 text-lg font-semibold"
            >
              Browse Companies
            </Button>
          </motion.div>

          {/* Proof Chips */}
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-wrap gap-3 justify-center mb-6"
          >
            <Pill variant="primary" size="md">
              ✓ Company-specific questions
            </Pill>
            <Pill variant="primary" size="md">
              ✓ AI tutor modes
            </Pill>
            <Pill variant="primary" size="md">
              ✓ Focus mode
            </Pill>
          </motion.div>

          <motion.p
            initial={prefersReducedMotion ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="text-sm text-text-tertiary"
          >
            Free to use. No credit card required.
          </motion.p>
        </motion.div>
      </div>

      {/* What You Get Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-20">
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-text-primary mb-4 tracking-tight">
            What You Get
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Everything you need to ace your coding interviews
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {mainFeatures.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="p-8 h-full hover:border-accent-primary/30 transition-all duration-300 group">
                <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-text-primary mb-4">
                  {feature.title}
                </h3>
                <p className="text-base text-text-secondary leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Premium CTA Section */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-20">
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          <Card className="p-10 md:p-16 border-accent-primary/20 bg-gradient-to-br from-black-elevated to-black-base">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary mb-6 tracking-tight">
                Ready to Level Up Your Interview Prep?
              </h2>
              <p className="text-lg md:text-xl text-text-secondary mb-8 leading-relaxed">
                Join thousands of developers mastering coding interviews with GrindMate.AI
              </p>
              
              {/* Mini bullets */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 text-left">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-accent-primary mt-1">✓</span>
                    <span className="text-sm text-text-secondary">{benefit}</span>
                  </div>
                ))}
              </div>
              
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate('/login')}
                className="px-10 py-4 text-lg font-semibold"
              >
                Start Learning for Free
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border-soft py-8 mt-20">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-text-tertiary">
          <p>© 2025 GrindMate.AI - Your coding interview companion</p>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
