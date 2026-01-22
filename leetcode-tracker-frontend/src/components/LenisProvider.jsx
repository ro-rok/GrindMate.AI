import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import { getLenisConfig } from '../utils/motion';

/**
 * LenisProvider - Wraps the app with smooth scroll functionality
 * Automatically disables smooth scroll for users with prefers-reduced-motion
 */
export function LenisProvider({ children }) {
  const lenisRef = useRef(null);

  useEffect(() => {
    // Initialize Lenis with proper configuration
    const lenis = new Lenis({
      ...getLenisConfig(),
      autoResize: true,
      // Don't override wrapper/content - let Lenis use defaults
    });
    lenisRef.current = lenis;

    // Animation frame loop
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

    // Recalculate on window resize
    window.addEventListener('resize', recalculate);

    // Recalculate after a short delay to catch dynamic content
    const timeouts = [
      setTimeout(recalculate, 100),
      setTimeout(recalculate, 500),
      setTimeout(recalculate, 1000),
    ];

    // Watch for DOM mutations that might change scroll height
    const observer = new MutationObserver(recalculate);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    // Cleanup
    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      window.removeEventListener('resize', recalculate);
      observer.disconnect();
      timeouts.forEach(clearTimeout);
    };
  }, []);

  return <>{children}</>;
}
