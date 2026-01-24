import { useState } from 'react';
import { toast } from 'react-hot-toast';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import api from '../../api';

/**
 * TutorFeedbackModal Component
 * 
 * Collects user feedback on AI tutor sessions with:
 * - Thumbs up/down rating buttons
 * - Optional text feedback field
 * - Submit and dismiss functionality
 * - Dismissal tracking to prevent re-prompting
 * 
 * Requirements: 8.1-8.5
 */
function TutorFeedbackModal({ isOpen, onClose, sessionId, questionTitle }) {
  // State
  const [rating, setRating] = useState(null); // 'positive' | 'negative' | null
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle rating selection
  const handleRatingClick = (selectedRating) => {
    setRating(selectedRating);
  };

  // Handle feedback submission (Subtask 12.2)
  const handleSubmit = async () => {
    if (!rating) {
      toast.error('Please select a rating');
      return;
    }

    setIsSubmitting(true);

    try {
      // Call /api/tutor/feedback endpoint (Requirement 8.3, 8.4)
      const response = await api.post('/tutor/feedback', {
        session_id: sessionId,
        rating: rating,
        feedback_text: feedbackText.trim() || null,
      });

      // Show success message
      toast.success(response.data.message || 'Thank you for your feedback!');

      // Store dismissed session ID locally (Subtask 12.3, Requirement 8.5)
      storeDismissedSession(sessionId);

      // Reset form
      setRating(null);
      setFeedbackText('');

      // Close modal after submission
      onClose();
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      const errorMessage = err.response?.data?.error_message || 'Failed to submit feedback';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle dismissal (Subtask 12.3)
  const handleDismiss = () => {
    // Store dismissed session ID locally (Requirement 8.5)
    storeDismissedSession(sessionId);

    // Reset form
    setRating(null);
    setFeedbackText('');

    // Close modal
    onClose();
  };

  // Store dismissed session ID in localStorage (Subtask 12.3)
  const storeDismissedSession = (sessionId) => {
    try {
      const key = 'tutor-feedback-dismissed';
      const dismissed = JSON.parse(localStorage.getItem(key) || '[]');
      
      // Add session ID if not already present
      if (!dismissed.includes(sessionId)) {
        dismissed.push(sessionId);
        localStorage.setItem(key, JSON.stringify(dismissed));
      }
    } catch (err) {
      console.error('Failed to store dismissed session:', err);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleDismiss}
      title="How was your AI Tutor experience?"
      size="md"
      closeOnOverlayClick={false}
      showCloseButton={false}
    >
      <div className="space-y-6">
        {/* Question context */}
        {questionTitle && (
          <div className="text-sm text-text-secondary">
            <span className="font-medium text-text-primary">Question:</span> {questionTitle}
          </div>
        )}

        {/* Rating buttons - Subtask 12.1 (Requirement 8.1, 8.2) */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-3">
            Was the AI Tutor helpful?
          </label>
          <div className="flex gap-4 justify-center">
            {/* Thumbs Up */}
            <button
              onClick={() => handleRatingClick('positive')}
              disabled={isSubmitting}
              className={`flex flex-col items-center gap-2 p-6 rounded-xl border-2 transition-all ${
                rating === 'positive'
                  ? 'border-accent-success bg-accent-success/20 text-accent-success'
                  : 'border-border-subtle bg-black-base text-text-secondary hover:border-accent-success hover:text-accent-success'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-label="Thumbs up - Helpful"
            >
              <svg
                className="w-12 h-12"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
              </svg>
              <span className="text-sm font-semibold">Helpful</span>
            </button>

            {/* Thumbs Down */}
            <button
              onClick={() => handleRatingClick('negative')}
              disabled={isSubmitting}
              className={`flex flex-col items-center gap-2 p-6 rounded-xl border-2 transition-all ${
                rating === 'negative'
                  ? 'border-accent-danger bg-accent-danger/20 text-accent-danger'
                  : 'border-border-subtle bg-black-base text-text-secondary hover:border-accent-danger hover:text-accent-danger'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-label="Thumbs down - Not helpful"
            >
              <svg
                className="w-12 h-12"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z" />
              </svg>
              <span className="text-sm font-semibold">Not Helpful</span>
            </button>
          </div>
        </div>

        {/* Optional text feedback - Subtask 12.1 (Requirement 8.2) */}
        <div>
          <label
            htmlFor="feedback-text"
            className="block text-sm font-medium text-text-primary mb-2"
          >
            Additional feedback (optional)
          </label>
          <textarea
            id="feedback-text"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            disabled={isSubmitting}
            placeholder="Tell us more about your experience..."
            rows={4}
            maxLength={500}
            className="w-full px-3 py-2 bg-black-base text-text-primary rounded-lg border border-border-subtle focus:border-accent-primary focus:outline-none text-sm resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="text-xs text-text-tertiary mt-1 text-right">
            {feedbackText.length}/500 characters
          </div>
        </div>

        {/* Action buttons - Subtask 12.1 */}
        <div className="flex gap-3 justify-end pt-2">
          <Button
            onClick={handleDismiss}
            variant="secondary"
            size="md"
            disabled={isSubmitting}
          >
            Skip
          </Button>
          <Button
            onClick={handleSubmit}
            variant="primary"
            size="md"
            loading={isSubmitting}
            disabled={!rating || isSubmitting}
          >
            Submit Feedback
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// Helper function to check if session was dismissed (Subtask 12.3)
export function isSessionDismissed(sessionId) {
  try {
    const key = 'tutor-feedback-dismissed';
    const dismissed = JSON.parse(localStorage.getItem(key) || '[]');
    return dismissed.includes(sessionId);
  } catch (err) {
    console.error('Failed to check dismissed session:', err);
    return false;
  }
}

export default TutorFeedbackModal;
