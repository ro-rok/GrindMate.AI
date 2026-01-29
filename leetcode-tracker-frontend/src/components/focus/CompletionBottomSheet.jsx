import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheckCircle, FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * CompletionBottomSheet component
 * Premium bottom sheet for "How did it go?" with Solved/Stuck/Close options
 * Slides up from bottom, doesn't block entire UI
 */
function CompletionBottomSheet({
  isOpen,
  onClose,
  onSolved,
  onStuck,
  questionTitle,
  hideSolved = false,
}) {
  const prefersReducedMotion = useReducedMotion();

  // Handle Esc key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Handle Enter key for quick selection
  useEffect(() => {
    if (!isOpen) return;

    const handleEnter = (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
        // Default to solved if Enter pressed
        onSolved();
      }
    };

    window.addEventListener('keydown', handleEnter);
    return () => window.removeEventListener('keydown', handleEnter);
  }, [isOpen, onSolved]);

  if (!isOpen) return null;

  const options = [
    ...(hideSolved ? [] : [{
      id: 'solved',
      icon: <FaCheckCircle className="text-2xl text-accent-success" />,
      title: 'Solved',
      description: 'I successfully solved this problem',
      action: onSolved,
      variant: 'success',
    }]),
    {
      id: 'stuck',
      icon: <FaExclamationTriangle className="text-2xl text-accent-warning" />,
      title: 'Stuck',
      description: 'I need help - open AI tutor',
      action: onStuck,
      variant: 'warning',
    },
    {
      id: 'close',
      icon: <FaTimes className="text-2xl text-text-tertiary" />,
      title: 'Close',
      description: 'Just close without action',
      action: onClose,
      variant: 'ghost',
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 300,
              duration: prefersReducedMotion ? 0 : 0.4,
            }}
            className="fixed bottom-0 left-0 right-0 z-50 max-w-4xl mx-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="completion-sheet-title"
          >
            <Card variant="glass" className="rounded-t-[var(--radius-xl)] rounded-b-none border-b-0 p-6 pb-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 id="completion-sheet-title" className="text-xl font-semibold text-[var(--text-primary)] mb-1">
                    How did it go?
                  </h2>
                  {questionTitle && (
                    <p className="text-sm text-[var(--text-secondary)] truncate max-w-md">
                      {questionTitle}
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors rounded-[var(--radius-md)] hover:bg-[var(--bg-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                  aria-label="Close"
                >
                  <FaTimes />
                </button>
              </div>

              {/* Options - Compact horizontal layout */}
              <div className="flex flex-col sm:flex-row gap-3">
                {options.map((option, index) => (
                  <motion.button
                    key={option.id}
                    onClick={() => {
                      option.action();
                      onClose();
                    }}
                    className={`
                      group flex-1 text-left p-4 
                      bg-[var(--bg-surface)] border rounded-[var(--radius-lg)]
                      hover:border-[var(--border-brand)] hover:bg-[var(--bg-surface-2)]
                      transition-all duration-[var(--duration-fast)]
                      focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-base)]
                      ${option.variant === 'success' ? 'border-[var(--border-success)]' : ''}
                      ${option.variant === 'warning' ? 'border-[var(--border-warning)]' : ''}
                    `}
                    whileHover={prefersReducedMotion ? {} : { y: -2 }}
                    whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {option.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-[var(--text-primary)] mb-0.5">
                          {option.title}
                        </h3>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {option.description}
                        </p>
                      </div>
                      {index === 0 && (
                        <kbd className="hidden sm:inline-flex px-2 py-1 bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] text-xs text-[var(--text-tertiary)] font-mono">
                          Enter
                        </kbd>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Keyboard hint */}
              <p className="text-xs text-[var(--text-tertiary)] text-center mt-4">
                Press <kbd className="px-2 py-0.5 bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] text-xs font-mono">Enter</kbd> for Solved, <kbd className="px-2 py-0.5 bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] text-xs font-mono">Esc</kbd> to close
              </p>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default CompletionBottomSheet;
