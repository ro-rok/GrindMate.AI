import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../../store/authStore';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * Header component with navigation and user menu
 * Displays logo, navigation links, and user dropdown
 */
const Header = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const menuVariants = prefersReducedMotion ? {} : {
    hidden: { opacity: 0, y: -10, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { duration: 0.15 }
    },
    exit: { opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.1 } }
  };

  return (
    <header className="sticky top-0 z-40 bg-black-base/80 backdrop-blur-md border-b border-border-subtle">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link 
            to={isAuthenticated ? '/dashboard' : '/'}
            className="flex items-center gap-2 text-xl font-bold text-text-primary hover:text-accent-primary transition-colors"
          >
            <svg
              className="w-8 h-8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            <span>GrindMate.AI</span>
          </Link>

          {/* Navigation */}
          {isAuthenticated && (
            <nav className="hidden md:flex items-center gap-6">
              <Link
                to="/dashboard"
                className="text-text-secondary hover:text-text-primary transition-colors font-medium"
              >
                Dashboard
              </Link>
              <Link
                to="/companies"
                className="text-text-secondary hover:text-text-primary transition-colors font-medium"
              >
                Companies
              </Link>
              <Link
                to="/analytics"
                className="text-text-secondary hover:text-text-primary transition-colors font-medium"
              >
                Analytics
              </Link>
            </nav>
          )}

          {/* User Menu */}
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-black-elevated transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary"
                aria-label="User menu"
              >
                <div className="w-8 h-8 rounded-full bg-accent-primary flex items-center justify-center text-white font-semibold">
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <svg
                  className={`w-4 h-4 text-text-secondary transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {isUserMenuOpen && (
                  <motion.div
                    className="absolute right-0 mt-2 w-56 bg-black-elevated border border-border-subtle rounded-lg shadow-xl overflow-hidden"
                    variants={menuVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <div className="px-4 py-3 border-b border-border-subtle">
                      <p className="text-sm text-text-secondary">Signed in as</p>
                      <p className="text-sm font-medium text-text-primary truncate">
                        {user?.email}
                      </p>
                    </div>

                    <div className="py-1">
                      <Link
                        to="/profile"
                        className="block px-4 py-2 text-sm text-text-primary hover:bg-black-elevated-hover transition-colors"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        Profile Settings
                      </Link>
                      <Link
                        to="/analytics"
                        className="block px-4 py-2 text-sm text-text-primary hover:bg-black-elevated-hover transition-colors"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        My Progress
                      </Link>
                    </div>

                    <div className="border-t border-border-subtle py-1">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-accent-danger hover:bg-black-elevated-hover transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-text-primary hover:text-accent-primary transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/login?mode=register"
                className="px-4 py-2 text-sm font-medium bg-accent-primary text-white rounded-lg hover:bg-accent-primary-hover transition-colors"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation */}
      {isAuthenticated && (
        <nav className="md:hidden border-t border-border-subtle px-6 py-3 flex gap-4 overflow-x-auto">
          <Link
            to="/dashboard"
            className="text-sm text-text-secondary hover:text-text-primary transition-colors whitespace-nowrap"
          >
            Dashboard
          </Link>
          <Link
            to="/companies"
            className="text-sm text-text-secondary hover:text-text-primary transition-colors whitespace-nowrap"
          >
            Companies
          </Link>
          <Link
            to="/analytics"
            className="text-sm text-text-secondary hover:text-text-primary transition-colors whitespace-nowrap"
          >
            Analytics
          </Link>
        </nav>
      )}
    </header>
  );
};

export default Header;
