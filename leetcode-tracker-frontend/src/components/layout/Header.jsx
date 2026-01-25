import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

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
    <header className="sticky top-0 z-40 bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] border-b border-[var(--glass-border)]">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link 
            to={isAuthenticated ? '/dashboard' : '/'}
            className="flex items-center gap-3 text-lg font-semibold text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors group"
          >
            <img 
              src="/favicon-bg.webp" 
              alt="GrindMate.AI Logo" 
              className="w-7 h-7 object-contain group-hover:scale-110 transition-transform"
            />
            <span>GrindMate.AI</span>
          </Link>

          {/* Navigation */}
          {isAuthenticated && (
            <nav className="hidden md:flex items-center gap-6">
              <Link
                to="/dashboard"
                className={`relative px-3 py-2 text-sm font-medium transition-colors ${
                  isActive('/dashboard')
                    ? 'text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Dashboard
                {isActive('/dashboard') && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent-primary)]"
                    layoutId="active-indicator"
                    initial={prefersReducedMotion ? {} : false}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
              <Link
                to="/companies"
                className={`relative px-3 py-2 text-sm font-medium transition-colors ${
                  isActive('/companies')
                    ? 'text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Companies
                {isActive('/companies') && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent-primary)]"
                    layoutId="active-indicator"
                    initial={prefersReducedMotion ? {} : false}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            </nav>
          )}

          {/* User Menu */}
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-[var(--radius-md)] hover:bg-[var(--bg-surface)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                aria-label="User menu"
              >
                <div className="w-7 h-7 rounded-full bg-[var(--accent-primary)] flex items-center justify-center text-white font-semibold text-xs">
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <svg
                  className={`w-3.5 h-3.5 text-[var(--text-secondary)] transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`}
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
                    className="absolute right-0 mt-2 w-56 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-lg)] shadow-[var(--elevation-4)] overflow-hidden"
                    variants={menuVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
                      <p className="text-xs text-[var(--text-secondary)]">Signed in as</p>
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {user?.email}
                      </p>
                    </div>

                    <div className="py-1">
                      <Link
                        to="/profile"
                        className="block px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        Profile Settings
                      </Link>
                    </div>

                    <div className="border-t border-[var(--border-subtle)] py-1">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-[var(--accent-danger)] hover:bg-[var(--bg-surface)] transition-colors"
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
        <nav className="md:hidden border-t border-[var(--border-subtle)] px-6 py-2.5 flex gap-4 overflow-x-auto">
          <Link
            to="/dashboard"
            className={`text-sm font-medium transition-colors whitespace-nowrap ${
              isActive('/dashboard')
                ? 'text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Dashboard
          </Link>
          <Link
            to="/companies"
            className={`text-sm font-medium transition-colors whitespace-nowrap ${
              isActive('/companies')
                ? 'text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Companies
          </Link>
        </nav>
      )}
    </header>
  );
};

export default Header;
