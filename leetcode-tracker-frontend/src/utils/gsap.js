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
 * Create a slide-in animation on scroll
 * @param {string|Element} target - Element selector or element
 * @param {string} direction - Direction: 'left', 'right', 'up', 'down'
 * @param {object} options - Animation options
 */
export const slideInOnScroll = (target, direction = 'up', options = {}) => {
  const directions = {
    left: { x: -50, y: 0 },
    right: { x: 50, y: 0 },
    up: { x: 0, y: 50 },
    down: { x: 0, y: -50 },
  };

  const config = getGSAPConfig({
    ...directions[direction],
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
 * Create a reveal animation (clip-path)
 * @param {string|Element} target - Element selector or element
 * @param {object} options - Animation options
 */
export const revealOnScroll = (target, options = {}) => {
  const config = getGSAPConfig({
    clipPath: 'inset(0 100% 0 0)',
    duration: 0.8,
    ease: 'power2.inOut',
    scrollTrigger: {
      trigger: target,
      start: 'top 80%',
      toggleActions: 'play none none none',
      ...options.scrollTrigger,
    },
    ...options,
  });

  return gsap.from(target, {
    ...config,
    clipPath: 'inset(0 0 0 0)',
  });
};

/**
 * Create a counter animation
 * @param {string|Element} target - Element selector or element
 * @param {number} endValue - End value for counter
 * @param {object} options - Animation options
 */
export const counterAnimation = (target, endValue, options = {}) => {
  const element = typeof target === 'string' ? document.querySelector(target) : target;
  if (!element) return null;

  const config = getGSAPConfig({
    duration: 1.5,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: target,
      start: 'top 80%',
      toggleActions: 'play none none none',
      ...options.scrollTrigger,
    },
    ...options,
  });

  return gsap.to(element, {
    ...config,
    textContent: endValue,
    snap: { textContent: 1 },
    onUpdate: function() {
      element.textContent = Math.ceil(element.textContent);
    },
  });
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
