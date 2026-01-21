/**
 * Motion utilities for GrindMate.AI
 * Provides animation helpers and reduced motion support
 */

/**
 * Check if user prefers reduced motion
 * @returns {boolean}
 */
export const prefersReducedMotion = () => {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Get animation duration based on reduced motion preference
 * @param {number} normalDuration - Duration in ms for normal motion
 * @param {number} reducedDuration - Duration in ms for reduced motion (default: 0)
 * @returns {number}
 */
export const getAnimationDuration = (normalDuration, reducedDuration = 0) => {
  return prefersReducedMotion() ? reducedDuration : normalDuration;
};

/**
 * Framer Motion variants for common animations
 */
export const motionVariants = {
  // Fade in/out
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },

  // Fade in with slide up
  fadeInUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },

  // Fade in with slide down
  fadeInDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },

  // Scale in/out
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },

  // Slide in from right
  slideInRight: {
    initial: { x: '100%' },
    animate: { x: 0 },
    exit: { x: '100%' },
  },

  // Slide in from left
  slideInLeft: {
    initial: { x: '-100%' },
    animate: { x: 0 },
    exit: { x: '-100%' },
  },
};

/**
 * Framer Motion transition presets
 */
export const motionTransitions = {
  instant: { duration: 0.1 },
  fast: { duration: 0.2, ease: [0, 0, 0.2, 1] },
  normal: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  slow: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
  slower: { duration: 0.6, ease: [0.4, 0, 0.2, 1] },
  bounce: { duration: 0.4, ease: [0.68, -0.55, 0.265, 1.55] },
  elastic: { duration: 0.5, ease: [0.68, -0.6, 0.32, 1.6] },
};

/**
 * Get transition with reduced motion support
 * @param {object} transition - Framer Motion transition object
 * @returns {object}
 */
export const getTransition = (transition) => {
  if (prefersReducedMotion()) {
    return { duration: 0.01 };
  }
  return transition;
};

/**
 * Stagger children animation config
 * @param {number} staggerDelay - Delay between children in seconds (default: 0.05)
 * @returns {object}
 */
export const staggerChildren = (staggerDelay = 0.05) => {
  if (prefersReducedMotion()) {
    return { staggerChildren: 0 };
  }
  return {
    staggerChildren: staggerDelay,
    delayChildren: 0.1,
  };
};

/**
 * GSAP animation config with reduced motion support
 * @param {object} config - GSAP animation config
 * @returns {object}
 */
export const getGSAPConfig = (config) => {
  if (prefersReducedMotion()) {
    return {
      ...config,
      duration: 0.01,
      ease: 'none',
    };
  }
  return config;
};

/**
 * Lenis smooth scroll config
 * @returns {object}
 */
export const getLenisConfig = () => {
  return {
    duration: prefersReducedMotion() ? 0 : 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    direction: 'vertical',
    gestureDirection: 'vertical',
    smooth: !prefersReducedMotion(),
    smoothTouch: false,
    touchMultiplier: 2,
  };
};
