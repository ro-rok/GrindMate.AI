import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getGSAPConfig, prefersReducedMotion } from './motion';

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

/**
 * Initialize GSAP with global defaults
 */
export const initGSAP = () => {
  // Set global defaults
  gsap.defaults({
    ease: 'power2.out',
    duration: 0.6,
  });

  // Disable ScrollTrigger if user prefers reduced motion
  if (prefersReducedMotion()) {
    ScrollTrigger.config({
      autoRefreshEvents: 'none',
    });
  }
};

/**
 * Create a fade-in animation on scroll
 * @param {string|Element} target - Element selector or element
 * @param {object} options - Animation options
 */
export const fadeInOnScroll = (target, options = {}) => {
  const config = getGSAPConfig({
    opacity: 0,
    y: 30,
    duration: 0.6,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: target,
      start: 'top 80%',
      toggleActions: 'play none none none',
      ...options.scrollTrigger,
    },
    ...options,
  });

  return gsap.from(target, config);
};

/**
 * Create a stagger fade-in animation on scroll
 * @param {string|Element} target - Element selector or element
 * @param {object} options - Animation options
 */
export const staggerFadeInOnScroll = (target, options = {}) => {
  const config = getGSAPConfig({
    opacity: 0,
    y: 30,
    duration: 0.6,
    stagger: 0.05,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: target,
      start: 'top 80%',
      toggleActions: 'play none none none',
      ...options.scrollTrigger,
    },
    ...options,
  });

  return gsap.from(target, config);
};

/**
 * Create a scale-in animation on scroll
 * @param {string|Element} target - Element selector or element
 * @param {object} options - Animation options
 */
export const scaleInOnScroll = (target, options = {}) => {
  const config = getGSAPConfig({
    scale: 0.95,
    opacity: 0,
    duration: 0.6,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: target,
      start: 'top 80%',
      toggleActions: 'play none none none',
      ...options.scrollTrigger,
    },
    ...options,
  });

  return gsap.from(target, config);
};

/**
 * Create a timeline for complex animations
 * @param {object} options - Timeline options
 */
export const createTimeline = (options = {}) => {
  return gsap.timeline(options);
};

/**
 * Refresh all ScrollTrigger instances
 * Call this after DOM changes that affect layout
 */
export const refreshScrollTrigger = () => {
  ScrollTrigger.refresh();
};

/**
 * Kill all ScrollTrigger instances
 * Call this on cleanup
 */
export const killScrollTrigger = () => {
  ScrollTrigger.getAll().forEach(trigger => trigger.kill());
};

// Export GSAP and ScrollTrigger for direct use
export { gsap, ScrollTrigger };
