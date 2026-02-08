import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import { getLenisConfig } from '../utils/motion';

/**
 * LenisProvider - Wraps the app with smooth scroll functionality
 * Automatically disables smooth scroll for users with prefers-reduced-motion
 * Enhanced with better performance and smoother scrolling
 */
export function LenisProvider({ children }) {
  const lenisRef = useRef(null);

  useEffect(() => {
    // Initialize Lenis with enhanced configuration
    const lenis = new Lenis({
      ...getLenisConfig(),
      autoResize: true,
      // Enhanced smooth scrolling parameters
      duration: 1.2, // Slightly longer duration for smoother feel
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Custom easing for smoother deceleration
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0, // Standard wheel sensitivity
      touchMultiplier: 2.0, // Enhanced touch sensitivity
      infinite: false,
    });
    lenisRef.current = lenis;

    // Animation frame loop with RAF
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    const rafId = requestAnimationFrame(raf);

    // Force recalculation after initial render and on DOM changes
    const recalculate = () => {
      if (lenis) {
        lenis.resize();
      }
    };

    // Recalculate on window resize with debounce
    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(recalculate, 150);
    };
    window.addEventListener('resize', handleResize);

    // Recalculate after delays to catch dynamic content
    const timeouts = [
      setTimeout(recalculate, 100),
      setTimeout(recalculate, 500),
      setTimeout(recalculate, 1000),
      setTimeout(recalculate, 2000), // Additional delay for lazy-loaded content
    ];

    // Watch for DOM mutations that might change scroll height
    // Use throttled observer to reduce performance impact
    let mutationTimeout;
    const observer = new MutationObserver(() => {
      clearTimeout(mutationTimeout);
      mutationTimeout = setTimeout(recalculate, 100);
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'], // Only watch relevant attributes
    });

    // Handle route changes - recalculate scroll on navigation
    const handleRouteChange = () => {
      setTimeout(recalculate, 100);
    };
    window.addEventListener('popstate', handleRouteChange);

    // Cleanup
    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('popstate', handleRouteChange);
      observer.disconnect();
      timeouts.forEach(clearTimeout);
      clearTimeout(resizeTimeout);
      clearTimeout(mutationTimeout);
    };
  }, []);

  return <>{children}</>;
}

