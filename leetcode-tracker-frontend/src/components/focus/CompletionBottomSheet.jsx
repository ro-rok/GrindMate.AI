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
    {
      id: 'solved',
      icon: <FaCheckCircle className="text-2xl text-accent-success" />,
      title: 'Solved',
      description: 'I successfully solved this problem',
      action: onSolved,
      variant: 'success',
    },
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
            <Card className="rounded-t-2xl rounded-b-none border-b-0 p-6 pb-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 id="completion-sheet-title" className="text-2xl font-bold text-text-primary mb-1">
                    How did it go?
                  </h2>
                  {questionTitle && (
                    <p className="text-sm text-text-secondary truncate max-w-md">
                      {questionTitle}
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-text-tertiary hover:text-text-primary transition-colors rounded-lg hover:bg-black-elevated"
                  aria-label="Close"
                >
                  <FaTimes />
                </button>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {options.map((option) => (
                  <motion.button
                    key={option.id}
                    onClick={() => {
                      option.action();
                      onClose();
                    }}
                    className="group text-left p-6 bg-black-elevated border border-border-soft rounded-xl hover:border-accent-primary/50 hover:bg-black-elevated-hover transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-black-base"
                    whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                    whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="mb-3">{option.icon}</div>
                      <h3 className="text-lg font-semibold text-text-primary mb-2">
                        {option.title}
                      </h3>
                      <p className="text-sm text-text-secondary">
                        {option.description}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Keyboard hint */}
              <p className="text-xs text-text-tertiary text-center mt-6">
                Press <kbd className="px-2 py-1 bg-black-elevated rounded text-xs">Enter</kbd> for Solved, <kbd className="px-2 py-1 bg-black-elevated rounded text-xs">Esc</kbd> to close
              </p>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default CompletionBottomSheet;
