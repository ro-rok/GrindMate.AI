import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  fadeInOnScroll, 
  staggerFadeInOnScroll, 
  scaleInOnScroll,
  slideInOnScroll,
  revealOnScroll,
  counterAnimation,
  refreshScrollTrigger 
} from '../utils/gsap';
import { motionVariants, motionTransitions, staggerChildren } from '../utils/motion';
import { useReducedMotion } from '../hooks/useReducedMotion';
import StaggerList from '../components/animations/StaggerList';
import Card from '../components/ui/Card';

/**
 * Motion Demo Page
 * Demonstrates all motion system capabilities
 * 
 * This page is for testing and verification purposes
 * Shows: Lenis smooth scroll, GSAP scroll animations, Framer Motion transitions, reduced motion support
 */
function MotionDemo() {
  const prefersReducedMotion = useReducedMotion();
  
  const heroRef = useRef(null);
  const fadeRef = useRef(null);
  const staggerRef = useRef(null);
  const scaleRef = useRef(null);
  const slideLeftRef = useRef(null);
  const slideRightRef = useRef(null);
  const revealRef = useRef(null);
  const counterRef = useRef(null);

  // Initialize GSAP animations
  useEffect(() => {
    if (prefersReducedMotion) return;

    // Hero fade in
    fadeInOnScroll(heroRef.current, { y: 50, duration: 0.8 });

    // Fade in section
    fadeInOnScroll(fadeRef.current);

    // Stagger section
    staggerFadeInOnScroll('.stagger-item', { stagger: 0.1 });

    // Scale section
    scaleInOnScroll(scaleRef.current);

    // Slide sections
    slideInOnScroll(slideLeftRef.current, 'left');
    slideInOnScroll(slideRightRef.current, 'right');

    // Reveal section
    revealOnScroll(revealRef.current);

    // Counter animation
    counterAnimation(counterRef.current, 100);

    // Refresh ScrollTrigger
    refreshScrollTrigger();
  }, [prefersReducedMotion]);

  const items = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    title: `Item ${i + 1}`,
    description: 'This item animates with stagger effect',
  }));

  return (
    <div className="min-h-screen bg-black-base">
      {/* Hero Section */}
      <section ref={heroRef} className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-4xl">
          <h1 className="text-6xl font-bold text-text-primary mb-6">
            Premium Motion System
          </h1>
          <p className="text-xl text-text-secondary mb-8">
            Smooth scrolling with Lenis • Scroll animations with GSAP • Page transitions with Framer Motion
          </p>
          <div className="flex items-center justify-center gap-4">
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${
              prefersReducedMotion 
                ? 'bg-accent-warning/20 text-accent-warning' 
                : 'bg-accent-success/20 text-accent-success'
            }`}>
              {prefersReducedMotion ? '⚡ Reduced Motion Active' : '✨ Full Animations Active'}
            </span>
          </div>
        </div>
      </section>

      {/* Fade In Section */}
      <section ref={fadeRef} className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-2xl p-8">
          <h2 className="text-4xl font-bold text-text-primary mb-4">
            Fade In Animation
          </h2>
          <p className="text-text-secondary text-lg">
            This section fades in as you scroll. Powered by GSAP ScrollTrigger.
          </p>
        </Card>
      </section>

      {/* Stagger Section */}
      <section ref={staggerRef} className="min-h-screen flex items-center justify-center px-4 py-20">
        <div className="max-w-6xl w-full">
          <h2 className="text-4xl font-bold text-text-primary mb-12 text-center">
            Stagger Animation
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <Card key={item.id} className="stagger-item p-6">
                <h3 className="text-xl font-semibold text-text-primary mb-2">
                  {item.title}
                </h3>
                <p className="text-text-secondary">
                  {item.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Scale In Section */}
      <section ref={scaleRef} className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-2xl p-8">
          <h2 className="text-4xl font-bold text-text-primary mb-4">
            Scale In Animation
          </h2>
          <p className="text-text-secondary text-lg">
            This card scales in from 95% to 100% as you scroll.
          </p>
        </Card>
      </section>

      {/* Slide Sections */}
      <section className="min-h-screen flex items-center justify-center px-4 py-20">
        <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card ref={slideLeftRef} className="p-8">
            <h2 className="text-3xl font-bold text-text-primary mb-4">
              Slide From Left
            </h2>
            <p className="text-text-secondary">
              This card slides in from the left side.
            </p>
          </Card>
          <Card ref={slideRightRef} className="p-8">
            <h2 className="text-3xl font-bold text-text-primary mb-4">
              Slide From Right
            </h2>
            <p className="text-text-secondary">
              This card slides in from the right side.
            </p>
          </Card>
        </div>
      </section>

      {/* Reveal Section */}
      <section className="min-h-screen flex items-center justify-center px-4">
        <div ref={revealRef} className="max-w-2xl">
          <Card className="p-8">
            <h2 className="text-4xl font-bold text-text-primary mb-4">
              Reveal Animation
            </h2>
            <p className="text-text-secondary text-lg">
              This section reveals with a clip-path animation.
            </p>
          </Card>
        </div>
      </section>

      {/* Counter Section */}
      <section className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-2xl p-8 text-center">
          <h2 className="text-4xl font-bold text-text-primary mb-8">
            Counter Animation
          </h2>
          <div 
            ref={counterRef}
            className="text-8xl font-bold text-accent-primary mb-4"
          >
            0
          </div>
          <p className="text-text-secondary text-lg">
            This counter animates from 0 to 100.
          </p>
        </Card>
      </section>

      {/* Framer Motion Section */}
      <section className="min-h-screen flex items-center justify-center px-4 py-20">
        <div className="max-w-4xl w-full">
          <motion.div
            initial={prefersReducedMotion ? {} : motionVariants.fadeInUp.initial}
            whileInView={prefersReducedMotion ? {} : motionVariants.fadeInUp.animate}
            viewport={{ once: true }}
            transition={motionTransitions.normal}
          >
            <h2 className="text-4xl font-bold text-text-primary mb-12 text-center">
              Framer Motion Stagger List
            </h2>
          </motion.div>

          <StaggerList className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {items.map((item) => (
              <Card key={item.id} className="p-6">
                <h3 className="text-xl font-semibold text-text-primary mb-2">
                  {item.title}
                </h3>
                <p className="text-text-secondary">
                  Animated with Framer Motion stagger
                </p>
              </Card>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* Hover Effects Section */}
      <section className="min-h-screen flex items-center justify-center px-4 py-20">
        <div className="max-w-4xl w-full">
          <h2 className="text-4xl font-bold text-text-primary mb-12 text-center">
            Interactive Hover Effects
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['Scale', 'Lift', 'Glow'].map((effect, i) => (
              <motion.div
                key={effect}
                whileHover={prefersReducedMotion ? {} : { 
                  scale: i === 0 ? 1.05 : 1,
                  y: i === 1 ? -8 : 0,
                  boxShadow: i === 2 ? '0 0 20px rgba(59, 130, 246, 0.5)' : undefined,
                }}
                transition={{ duration: 0.2 }}
              >
                <Card className="p-8 text-center cursor-pointer">
                  <h3 className="text-2xl font-bold text-text-primary mb-2">
                    {effect}
                  </h3>
                  <p className="text-text-secondary text-sm">
                    Hover to see effect
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final Section */}
      <section className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-2xl">
          <h2 className="text-5xl font-bold text-text-primary mb-6">
            🎉 Motion System Complete
          </h2>
          <p className="text-xl text-text-secondary mb-8">
            All animations are working perfectly with reduced motion support.
          </p>
          <motion.button
            whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
            className="px-8 py-4 bg-accent-primary text-white rounded-lg font-semibold text-lg"
          >
            Scroll to Top
          </motion.button>
        </div>
      </section>
    </div>
  );
}

export default MotionDemo;
