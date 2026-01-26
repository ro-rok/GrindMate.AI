import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { FaRobot } from 'react-icons/fa';
import useAuthStore from '../store/authStore';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Pill from '../components/ui/Pill';
import { useReducedMotion } from '../hooks/useReducedMotion';
import Footer from '../components/layout/Footer';

/**
 * Landing page
 * Premium redesign with hero, proof chips, enhanced features, and premium CTA
 */
function Landing() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const prefersReducedMotion = useReducedMotion();
  const heroRef = useRef(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  // Animated tutor demo state
  const [currentMode, setCurrentMode] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const tutorModes = [
    {
      name: 'Socratic',
      icon: '✨',
      example: 'What data structure would help you track which numbers you\'ve seen? Think about what operations you need...'
    },
    {
      name: 'ELI5',
      icon: '💡',
      example: 'Imagine you\'re at a party and need to find two people whose ages add up to a target. You\'d keep a list of people you\'ve met and their ages, then check if anyone new matches with someone on your list!'
    },
    {
      name: 'Interview',
      icon: '💼',
      example: 'Great start! Now let\'s think about edge cases: What if the array is empty? What if no two numbers sum to the target? Also, consider the time complexity - can we do better than O(n²)?'
    }
  ];

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Parallax effect for hero preview
  useEffect(() => {
    if (prefersReducedMotion) return;

    const handleMouseMove = (e) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        setMousePosition({ x: x - 0.5, y: y - 0.5 });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [prefersReducedMotion]);

  // Animated tutor demo - typewriter effect
  useEffect(() => {
    if (prefersReducedMotion) {
      // Show full text instantly for reduced motion
      setDisplayedText(tutorModes[currentMode].example);
      return;
    }

    const currentExample = tutorModes[currentMode].example;
    setDisplayedText('');
    setIsTyping(true);

    let charIndex = 0;
    const typeInterval = setInterval(() => {
      if (charIndex < currentExample.length) {
        setDisplayedText(currentExample.substring(0, charIndex + 1));
        charIndex++;
      } else {
        setIsTyping(false);
        clearInterval(typeInterval);
        
        // Wait 3 seconds, then clear and move to next mode
        setTimeout(() => {
          setDisplayedText('');
          setTimeout(() => {
            setCurrentMode((prev) => (prev + 1) % tutorModes.length);
          }, 500);
        }, 3000);
      }
    }, 30); // Typing speed

    return () => clearInterval(typeInterval);
  }, [currentMode, prefersReducedMotion]);

  const mainFeatures = [
    {
      icon: '🏢',
      title: 'Company-wise Question Bank',
      description: 'Practice with real interview questions from top tech companies. Filter by company, difficulty, and frequency to target your dream role.',
    },
    {
      icon: '⚡',
      title: 'Focus Mode + Session Tracking',
      description: 'Distraction-free problem solving with integrated timer, notes, and session tracking. Track your progress and build consistency.',
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
    'Session tracking & progress',
    'Focus mode for deep work',
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-base)] relative overflow-hidden">
      {/* Logo Background - Subtle decorative element */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64">
          <img 
            src="/logo-bg.webp" 
            alt="" 
            className="w-full h-full object-contain"
            aria-hidden="true"
          />
        </div>
        <div className="absolute bottom-20 right-10 w-48 h-48">
          <img 
            src="/logo-bg.webp" 
            alt="" 
            className="w-full h-full object-contain rotate-180"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Hero Section - Split Layout */}
      <div className="relative z-10 min-h-screen flex items-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Copy */}
            <motion.div
              initial={prefersReducedMotion ? {} : { opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-6 relative z-10"
            >
              {/* Logo Badge */}
              <motion.div
                initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="inline-flex items-center gap-3 mb-4"
              >
                <img 
                  src="/logo-bg.webp" 
                  alt="GrindMate.AI Logo" 
                  className="w-12 h-12 object-contain"
                />
                <span className="text-lg font-semibold text-[var(--text-primary)]">GrindMate.AI</span>
              </motion.div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-[var(--text-primary)] tracking-tight leading-[var(--leading-tight)]">
                Ace Your Coding Interview with{' '}
                <span className="text-[var(--accent-primary)]">AI-Powered</span> Practice
              </h1>
              <p className="text-lg md:text-xl text-[var(--text-secondary)] leading-[var(--leading-relaxed)] max-w-xl">
                Master company-specific LeetCode problems, get instant AI guidance, and track your progress with intelligent analytics. Built for developers who want to land their dream role.
              </p>
              
              {/* Outcome-driven benefits */}
              <div className="space-y-3 pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-[var(--accent-success-light)] flex items-center justify-center flex-shrink-0">
                    <span className="text-[var(--accent-success)] text-sm">✓</span>
                  </div>
                  <span className="text-[var(--text-primary)]">Land interviews at top tech companies</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-[var(--accent-success-light)] flex items-center justify-center flex-shrink-0">
                    <span className="text-[var(--accent-success)] text-sm">✓</span>
                  </div>
                  <span className="text-[var(--text-primary)]">Solve problems faster with AI hints</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-[var(--accent-success-light)] flex items-center justify-center flex-shrink-0">
                    <span className="text-[var(--accent-success)] text-sm">✓</span>
                  </div>
                  <span className="text-[var(--text-primary)]">Build consistent practice habits</span>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
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
                  onClick={() => navigate('/login')}
                  className="px-8 py-4 text-lg font-semibold"
                >
                  Sign Up Free
                </Button>
              </div>

              {/* Social Proof Strip */}
              <div className="flex items-center gap-6 pt-6 border-t border-[var(--border-subtle)]">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[var(--text-primary)]">10K+</div>
                  <div className="text-xs text-[var(--text-secondary)]">Questions</div>
                </div>
                <div className="w-px h-8 bg-[var(--border-subtle)]" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-[var(--text-primary)]">500+</div>
                  <div className="text-xs text-[var(--text-secondary)]">Companies</div>
                </div>
                <div className="w-px h-8 bg-[var(--border-subtle)]" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-[var(--text-primary)]">100%</div>
                  <div className="text-xs text-[var(--text-secondary)]">Free</div>
                </div>
              </div>
            </motion.div>

            {/* Right: Focus Mode Preview */}
            <motion.div
              ref={heroRef}
              initial={prefersReducedMotion ? {} : { opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
              style={{
                transform: prefersReducedMotion ? 'none' : `perspective(1000px) rotateY(${mousePosition.x * 5}deg) rotateX(${-mousePosition.y * 5}deg)`,
                transition: 'transform 0.1s ease-out'
              }}
            >
              <Card variant="glass" className="p-6 border-[var(--border-brand)]/30 shadow-[var(--elevation-4)]">
                <div className="space-y-4">
                  {/* Mock IDE Header */}
                  <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-subtle)]">
                    <div className="w-2 h-2 rounded-full bg-[var(--accent-danger)]" />
                    <div className="w-2 h-2 rounded-full bg-[var(--accent-warning)]" />
                    <div className="w-2 h-2 rounded-full bg-[var(--accent-success)]" />
                    <span className="ml-4 text-xs text-[var(--text-secondary)] font-mono">Focus Mode</span>
                  </div>
                  
                  {/* Enhanced Mock Question - Two Sum */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-semibold text-[var(--text-primary)]">
                        Two Sum
                      </h3>
                      <Badge variant="easy" size="sm">Easy</Badge>
                    </div>
                    
                    {/* Problem Description */}
                    <div className="text-xs text-[var(--text-secondary)] space-y-2 leading-[var(--leading-relaxed)]">
                      <p className="font-medium text-[var(--text-primary)]">Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.</p>
                      <div className="space-y-1.5 pl-3 border-l-2 border-[var(--border-subtle)]">
                        <p><span className="text-[var(--text-tertiary)]">Example:</span> nums = [2,7,11,15], target = 9</p>
                        <p><span className="text-[var(--text-tertiary)]">Output:</span> [0,1]</p>
                      </div>
                    </div>
                  </div>

                  {/* Mock Code Editor - Enhanced */}
                  <div className="bg-[var(--bg-base)] rounded-[var(--radius-sm)] p-3 border border-[var(--border-subtle)] font-mono text-xs">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--text-tertiary)] w-4">1</span>
                        <span className="text-[var(--text-secondary)]">def twoSum(nums, target):</span>
                      </div>
                      <div className="flex items-center gap-2 pl-6">
                        <span className="text-[var(--text-tertiary)] w-4">2</span>
                        <span className="text-[var(--text-secondary)]">    seen = {`{}`}</span>
                      </div>
                      <div className="flex items-center gap-2 pl-6">
                        <span className="text-[var(--text-tertiary)] w-4">3</span>
                        <span className="text-[var(--accent-primary)]">    for i, num in enumerate(nums):</span>
                      </div>
                      <div className="flex items-center gap-2 pl-12">
                        <span className="text-[var(--text-tertiary)] w-4">4</span>
                        <span className="text-[var(--text-secondary)]">        complement = target - num</span>
                      </div>
                      <div className="flex items-center gap-2 pl-12">
                        <span className="text-[var(--text-tertiary)] w-4">5</span>
                        <span className="text-[var(--text-secondary)]">        if complement in seen:</span>
                      </div>
                    </div>
                  </div>

                  {/* Animated AI Tutor Panel */}
                  <motion.div
                    initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.8 }}
                    className="bg-gradient-to-r from-[var(--accent-primary-light)]/20 to-[var(--accent-secondary)]/10 rounded-[var(--radius-md)] p-4 border border-[var(--border-brand)]/30"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center">
                          <FaRobot className="text-white text-lg" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-[var(--text-primary)]">AI Tutor</span>
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-success)] animate-pulse" />
                            <span className="text-xs text-[var(--accent-success)] font-medium">Ready</span>
                          </div>
                        </div>
                        
                        {/* Animated mode chips */}
                        <div className="flex flex-wrap gap-[var(--space-1_5)] mb-2">
                          {tutorModes.map((mode, index) => (
                            <motion.span
                              key={mode.name}
                              initial={false}
                              animate={{
                                backgroundColor: index === currentMode 
                                  ? 'var(--accent-primary-light)' 
                                  : 'var(--bg-surface-2)',
                                borderColor: index === currentMode 
                                  ? 'var(--border-brand)' 
                                  : 'var(--border-subtle)',
                                scale: index === currentMode ? 1.05 : 1
                              }}
                              transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
                              className="inline-flex items-center gap-[var(--space-1)] px-[var(--space-2)] py-[var(--space-0_5)] text-xs font-medium rounded-full text-[var(--text-secondary)] border"
                            >
                              <span className={index === currentMode ? 'text-[var(--accent-primary)]' : ''}>
                                {mode.icon}
                              </span>
                              {mode.name}
                            </motion.span>
                          ))}
                        </div>
                        
                        {/* Typewriter text */}
                        <AnimatePresence mode="wait">
                          <motion.p
                            key={currentMode}
                            initial={prefersReducedMotion ? {} : { opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                            className="text-xs text-[var(--text-secondary)] leading-[var(--leading-relaxed)] min-h-[3rem]"
                          >
                            {displayedText}
                            {isTyping && !prefersReducedMotion && (
                              <span className="inline-block w-0.5 h-3 bg-[var(--accent-primary)] ml-1 animate-pulse" />
                            )}
                          </motion.p>
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Why it Works Flow */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-20">
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-4 tracking-tight">
            Why It Works
          </h2>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            A proven workflow that gets results
          </p>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-6">
          {[
            { icon: '🏢', title: 'Company', desc: 'Target specific companies' },
            { icon: '⚡', title: 'Focus', desc: 'Deep work sessions' },
            { icon: '🤖', title: 'AI', desc: 'Instant guidance' },
            { icon: '📈', title: 'Progress', desc: 'Track your growth' },
          ].map((step, index) => (
            <motion.div
              key={step.title}
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="text-center"
            >
              <Card variant="glass" className="p-6 relative">
                <div className="text-4xl mb-4">{step.icon}</div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  {step.desc}
                </p>
                {index < 3 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 text-[var(--accent-primary)] text-xl">
                    →
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
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
          <h2 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-4 tracking-tight">
            What You Get
          </h2>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
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
              <Card variant="glass" className="p-8 h-full hover:border-[var(--border-brand)] transition-all duration-[var(--duration-normal)] group">
                <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-[var(--duration-normal)]">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
                  {feature.title}
                </h3>
                <p className="text-base text-[var(--text-secondary)] leading-[var(--leading-relaxed)]">
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
          <Card variant="glass" className="p-10 md:p-16 border-[var(--border-brand)] bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg-base)]">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[var(--text-primary)] mb-6 tracking-tight">
                Ready to Level Up Your Interview Prep?
              </h2>
              <p className="text-lg md:text-xl text-[var(--text-secondary)] mb-8 leading-[var(--leading-relaxed)]">
                Join thousands of developers mastering coding interviews with GrindMate.AI
              </p>
              
              {/* Mini bullets */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 text-left">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-[var(--accent-primary)] mt-1">✓</span>
                    <span className="text-sm text-[var(--text-secondary)]">{benefit}</span>
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
      <Footer />
    </div>
  );
}

export default Landing;
