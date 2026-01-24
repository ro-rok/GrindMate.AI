import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { getCompanyIdentifier } from '../../utils/slugify';

/**
 * Sidebar component for company list (responsive)
 * Displays list of companies with question counts
 * Collapsible on mobile devices
 */
const Sidebar = ({ companies = [], isLoading = false }) => {
  const { id: activeCompanyId } = useParams();
  const prefersReducedMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar on mobile when company is selected
  useEffect(() => {
    if (isMobile && activeCompanyId) {
      setIsOpen(false);
    }
  }, [activeCompanyId, isMobile]);

  const sidebarVariants = prefersReducedMotion ? {} : {
    open: { x: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } },
    closed: { x: '-100%', transition: { type: 'spring', damping: 25, stiffness: 300 } }
  };

  const SidebarContent = () => (
    <div className="h-full flex flex-col bg-black-elevated border-r border-border-subtle">
      {/* Header */}
      <div className="px-4 py-4 border-b border-border-subtle flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Companies</h2>
        {isMobile && (
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-text-secondary hover:text-text-primary transition-colors rounded-lg hover:bg-black-elevated-hover"
            aria-label="Close sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Company List */}
      <div className="flex-1 overflow-y-auto py-2">
        {isLoading ? (
          <div className="px-4 py-8 text-center">
            <div className="inline-block w-8 h-8 border-4 border-accent-primary border-t-transparent rounded-full animate-spin" />
            <p className="mt-2 text-sm text-text-secondary">Loading companies...</p>
          </div>
        ) : companies.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-text-secondary">No companies found</p>
          </div>
        ) : (
          <ul className="space-y-1 px-2">
            {companies.map((company) => {
              const identifier = getCompanyIdentifier(company);
              return (
                <li key={company.id}>
                  <Link
                    to={`/companies/${identifier}`}
                    className={`block px-3 py-2 rounded-lg transition-colors ${
                      activeCompanyId === company.id
                        ? 'bg-accent-primary text-white'
                        : 'text-text-primary hover:bg-black-elevated-hover'
                    }`}
                  >
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{company.name}</span>
                    {company.question_count !== undefined && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        activeCompanyId === company.id
                          ? 'bg-white/20'
                          : 'bg-gray-800'
                      }`}>
                        {company.question_count}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );

  // Desktop: Always visible
  if (!isMobile) {
    return (
      <aside className="w-64 h-full">
        <SidebarContent />
      </aside>
    );
  }

  // Mobile: Overlay with toggle button
  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-40 p-3 bg-accent-primary text-white rounded-full shadow-lg hover:bg-accent-primary-hover transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-black-base"
        aria-label="Open sidebar"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        className="fixed top-0 left-0 z-50 w-64 h-full"
        variants={sidebarVariants}
        initial="closed"
        animate={isOpen ? 'open' : 'closed'}
      >
        <SidebarContent />
      </motion.aside>
    </>
  );
};

export default Sidebar;
