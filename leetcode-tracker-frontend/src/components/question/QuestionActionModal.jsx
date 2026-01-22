import { motion, AnimatePresence } from 'framer-motion';
import Button from '../ui/Button';
import Card from '../ui/Card';

/**
 * Modal that appears when user clicks on a question
 * Asks what they want to do: Solve, Stuck, or just opened it
 */
function QuestionActionModal({ question, isOpen, onClose, onAction }) {
  if (!isOpen || !question) return null;

  const handleAction = (action) => {
    onAction(action);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg"
            >
              <Card className="p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-text-primary mb-2">
                    How did it go?
                  </h2>
                  <p className="text-text-secondary text-sm">
                    {question.title}
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Solved */}
                  <button
                    onClick={() => handleAction('solved')}
                    className="w-full p-4 bg-accent-success/10 hover:bg-accent-success/20 border border-accent-success/30 rounded-lg transition-all text-left group"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">✅</span>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-accent-success mb-1">
                          Solved it!
                        </h3>
                        <p className="text-sm text-text-secondary">
                          Mark as solved and update your streak
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Stuck - Get Help */}
                  <button
                    onClick={() => handleAction('stuck')}
                    className="w-full p-4 bg-accent-warning/10 hover:bg-accent-warning/20 border border-accent-warning/30 rounded-lg transition-all text-left group"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">🤔</span>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-accent-warning mb-1">
                          I'm stuck
                        </h3>
                        <p className="text-sm text-text-secondary">
                          Get hints from AI tutor (doesn't mark as solved)
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Just Opened */}
                  <button
                    onClick={() => handleAction('opened')}
                    className="w-full p-4 bg-border-subtle/10 hover:bg-border-subtle/20 border border-border-subtle rounded-lg transition-all text-left group"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">👀</span>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-text-primary mb-1">
                          Just looking
                        </h3>
                        <p className="text-sm text-text-secondary">
                          Close this dialog (no changes)
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Already Solved - Unsolve */}
                  {question.solved && (
                    <button
                      onClick={() => handleAction('unsolve')}
                      className="w-full p-4 bg-accent-danger/10 hover:bg-accent-danger/20 border border-accent-danger/30 rounded-lg transition-all text-left group"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">↩️</span>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-accent-danger mb-1">
                            Mark as unsolved
                          </h3>
                          <p className="text-sm text-text-secondary">
                            Remove from solved list
                          </p>
                        </div>
                      </div>
                    </button>
                  )}
                </div>

                {/* Close button */}
                <div className="mt-6 pt-4 border-t border-border-subtle">
                  <Button
                    variant="ghost"
                    onClick={onClose}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default QuestionActionModal;
