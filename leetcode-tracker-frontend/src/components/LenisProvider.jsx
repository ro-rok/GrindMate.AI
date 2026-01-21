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
    // Initialize Lenis with config
    const lenis = new Lenis(getLenisConfig());
    lenisRef.current = lenis;

    // Animation frame loop
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    // Cleanup
    return () => {
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
