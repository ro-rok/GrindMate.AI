import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { PageTransition } from '../animations';
import { refreshScrollTrigger } from '../../utils/gsap';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import useAdminShortcut from '../../hooks/useAdminShortcut';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';

/**
 * Layout component with integrated motion system
 * Provides consistent page structure with smooth transitions
 * 
 * Features:
 * - Page transitions with Framer Motion
 * - GSAP ScrollTrigger refresh on route change
 * - Reduced motion support
 * - Responsive sidebar
 */
function Layout({ showSidebar = false, showHeader = true }) {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();

  // Enable admin keyboard shortcut (CTRL+SHIFT+A)
  useAdminShortcut();

  // Refresh ScrollTrigger on route change
  useEffect(() => {
    if (!prefersReducedMotion) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        refreshScrollTrigger();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [location.pathname, prefersReducedMotion]);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col">
      {showHeader && <Header />}
      
      <div className="flex flex-1">
        {showSidebar && <Sidebar />}
        
        <main className="flex-1">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname} mode="fadeScale">
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </main>
      </div>
      <Footer />
    </div>
  );
}

/**
 * Simple layout without sidebar or header
 * Used for landing, login, and other standalone pages
 */
export function SimpleLayout() {
  const location = useLocation();

  // Enable admin keyboard shortcut (CTRL+SHIFT+A)
  useAdminShortcut();

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <AnimatePresence mode="wait">
        <PageTransition key={location.pathname} mode="fadeScale">
          <Outlet />
        </PageTransition>
      </AnimatePresence>
    </div>
  );
}

export default Layout;
